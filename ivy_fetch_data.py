"""
Ivy Homes API data puller.

Run this locally (NOT here — this environment can't reach solve.ivy.homes).

Usage:
    pip install requests
    python ivy_fetch_data.py \
        --api-key IVY26-6AFFD8E5918D \
        --email demo1@ivy.homes \
        --password 0019bcaaae

Pulls every listing, rental and project record your key can see, paging
all the way to the end with NO filters applied (this is the "retrievable"
definition in the assignment). Also runs a handful of one-off probes that
are cheap to check once and easy to forget — useful raw material for the
findings writeup. Everything gets written to ./data/*.json.

Confirmed-by-hand discrepancies baked into this script (see comments):
  - auth: API key goes in an X-API-Key header, NOT ?api_key= query param.
  - auth: login response field is `access_token` (+ `refresh_token`), not `token`.
  - auth: access tokens expire in ~900s (15 min), not 24h, and there IS a
    working /auth/refresh flow, contrary to "no refresh flow" in the docs.
"""

import argparse
import json
import os
import time

import requests


def get(session, base_url, path, params=None, headers=None):
    url = f"{base_url}{path}"
    return session.get(url, params=params, headers=headers, timeout=30)


def api_key_header(api_key):
    return {"X-API-Key": api_key}


class TokenManager:
    """Keeps an access token fresh across a long pull. Logs in once, then
    refreshes via /auth/refresh as needed instead of re-logging in."""

    def __init__(self, session, base_url, api_key, email, password):
        self.session = session
        self.base_url = base_url
        self.api_key = api_key
        self.email = email
        self.password = password
        self.access_token = None
        self.refresh_token = None
        self.expires_at = 0
        self._login()

    def _login(self):
        r = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": self.email, "password": self.password},
            headers=api_key_header(self.api_key),
            timeout=30,
        )
        if r.status_code != 200:
            raise RuntimeError(f"login failed: {r.status_code} {r.text}")
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 900)
        self.expires_at = time.time() + expires_in
        print(f"  logged in, token expires in {expires_in}s")

    def _refresh(self):
        if not self.refresh_token:
            return self._login()
        r = self.session.post(
            f"{self.base_url}/auth/refresh",
            json={"refresh_token": self.refresh_token},
            headers=api_key_header(self.api_key),
            timeout=30,
        )
        if r.status_code != 200:
            print(f"  ! refresh failed ({r.status_code}: {r.text[:200]}), logging in again")
            return self._login()
        data = r.json()
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token", self.refresh_token)
        expires_in = data.get("expires_in", 900)
        self.expires_at = time.time() + expires_in
        print(f"  refreshed token, expires in {expires_in}s")

    def headers(self):
        if time.time() > self.expires_at - 60:  # refresh a minute early
            self._refresh()
        h = api_key_header(self.api_key)
        h["Authorization"] = f"Bearer {self.access_token}"
        return h


def fetch_all(session, base_url, path, tm, extra_params=None, limit=200, sleep=0.05):
    """Fetch a collection using the API's offset-based pagination contract."""
    all_results = []
    offset = 0
    page_log = []
    while True:
        params = {"offset": offset, "limit": limit}
        if extra_params:
            params.update(extra_params)
        r = get(session, base_url, path, params=params, headers=tm.headers())
        if r.status_code != 200:
            print(f"  ! {path} offset {offset} -> {r.status_code}: {r.text[:300]}")
            break
        data = r.json()
        results = data.get("results", [])
        page_log.append(
            {
                "requested_offset": offset,
                "reported_offset": data.get("offset"),
                "reported_limit": data.get("limit"),
                "reported_count": data.get("count"),
                "reported_total": data.get("total"),
                "has_more": data.get("has_more"),
                "records_returned": len(results),
            }
        )
        all_results.extend(results)
        print(
            f"  {path} offset {offset}: got {len(results)} "
            f"(running total {len(all_results)}, server says "
            f"total={data.get('total')}, has_more={data.get('has_more')})"
        )
        if not results or not data.get("has_more"):
            break
        next_offset = data.get("offset", offset) + len(results)
        if next_offset <= offset:
            raise RuntimeError(f"{path} returned a non-advancing offset: {data}")
        offset = next_offset
        time.sleep(sleep)
        if len(page_log) > 5000:
            print("  ! safety valve hit (5000 pages), stopping")
            break
    return all_results, page_log


def safe_json(r):
    try:
        return r.json()
    except Exception:
        return {"_raw": r.text[:500]}


def probe(session, base_url, api_key, tm):
    headers = api_key_header(api_key)
    auth_headers = tm.headers()
    probes = {}

    r = get(session, base_url, "/health")
    probes["health"] = {"status": r.status_code, "body": safe_json(r)}

    # Confirm the docs' query-param claim is wrong and record the real 401 body
    r = get(session, base_url, "/v1/listings", params={"api_key": api_key, "page": 1, "limit": 1})
    probes["listings_apikey_as_query_param"] = {"status": r.status_code, "body": safe_json(r)}

    r = get(session, base_url, "/v1/favourites", headers=auth_headers)
    probes["favourites_empty_check"] = {"status": r.status_code, "body": safe_json(r)}

    r = get(session, base_url, "/v1/analytics/summary", headers=headers)
    probes["analytics_summary"] = {"status": r.status_code, "body": safe_json(r)}

    # Documented max limit is 200 - see what actually happens above it
    r = get(session, base_url, "/v1/listings", headers=auth_headers, params={"offset": 0, "limit": 500})
    body = safe_json(r)
    probes["listings_limit_500"] = {
        "status": r.status_code,
        "reported_limit": body.get("limit") if isinstance(body, dict) else None,
        "reported_count": body.get("count") if isinstance(body, dict) else None,
        "records_returned": len(body.get("results", [])) if isinstance(body, dict) else None,
    }

    # Ask for a page past the end
    r = get(session, base_url, "/v1/listings", headers=auth_headers, params={"offset": 999999, "limit": 20})
    probes["listings_page_past_end"] = {"status": r.status_code, "body": safe_json(r)}

    # No API key at all
    r = get(session, base_url, "/v1/listings", params={"page": 1, "limit": 5})
    probes["listings_no_api_key"] = {"status": r.status_code, "body": safe_json(r)}

    # No auth token but valid api key
    r = get(session, base_url, "/v1/favourites", headers=api_key_header(api_key))
    probes["favourites_no_token"] = {"status": r.status_code, "body": safe_json(r)}

    return probes


def dump(out, name, obj):
    with open(os.path.join(out, name), "w") as f:
        json.dump(obj, f, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-key", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--base-url", default="https://solve.ivy.homes")
    ap.add_argument("--out", default="data")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    session = requests.Session()

    print("Logging in...")
    tm = TokenManager(session, args.base_url, args.api_key, args.email, args.password)
    print("Got token.\n")

    print("Fetching /v1/listings (no filters)...")
    listings, listings_pagelog = fetch_all(session, args.base_url, "/v1/listings", tm)

    print("\nFetching /v1/rentals (no filters)...")
    rentals, rentals_pagelog = fetch_all(session, args.base_url, "/v1/rentals", tm)

    print("\nFetching /v1/projects (no filters)...")
    projects, projects_pagelog = fetch_all(session, args.base_url, "/v1/projects", tm)

    print("\nRunning one-off probes...")
    probes = probe(session, args.base_url, args.api_key, tm)

    dump(args.out, "listings.json", listings)
    dump(args.out, "listings_pagelog.json", listings_pagelog)
    dump(args.out, "rentals.json", rentals)
    dump(args.out, "rentals_pagelog.json", rentals_pagelog)
    dump(args.out, "projects.json", projects)
    dump(args.out, "projects_pagelog.json", projects_pagelog)
    dump(args.out, "probes.json", probes)

    print(
        f"\nDone. {len(listings)} listings, {len(rentals)} rentals, "
        f"{len(projects)} projects saved to ./{args.out}/"
    )
    print("Next: run ivy_analyze.py against this data.")


if __name__ == "__main__":
    main()