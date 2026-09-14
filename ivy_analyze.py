"""
Ivy Homes data analysis — draft answers + candidate anomalies to eyeball.

Run this locally, after ivy_fetch_data.py has populated ./data/.

    pip install pandas
    python ivy_analyze.py --locality indiranagar

This does NOT hand you the ten final answers. It computes the mechanical
ones straight, and for the judgment-call ones (corrupt / fake / duplicate /
mismatched-count) it prints CANDIDATES with the evidence that flagged them,
so you can look at each one and decide whether it's real before it goes in
submission.json. Do not paste the candidate lists straight into your answers
without reading them — that's the part of the assignment that's actually
being graded.
"""

import argparse
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import pandas as pd

IST = timezone(timedelta(hours=5, minutes=30))
REFERENCE_IST = datetime(2026, 9, 10, 0, 0, 0, tzinfo=IST)
WINDOW_START_IST = REFERENCE_IST - timedelta(days=7)


def load(path):
    with open(path) as f:
        return json.load(f)


def parse_ts(s):
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--locality", required=True, help="your assigned locality, e.g. indiranagar")
    args = ap.parse_args()

    listings = load(os.path.join(args.data, "listings.json"))
    rentals = load(os.path.join(args.data, "rentals.json"))
    projects = load(os.path.join(args.data, "projects.json"))

    ldf = pd.DataFrame(listings)
    rdf = pd.DataFrame(rentals)
    pdf = pd.DataFrame(projects)

    print(f"Loaded {len(ldf)} listings, {len(rdf)} rentals, {len(pdf)} projects.")
    print(f"\nListing columns actually present: {sorted(ldf.columns.tolist())}")
    print(f"Rental columns actually present:  {sorted(rdf.columns.tolist())}")
    print(f"Project columns actually present: {sorted(pdf.columns.tolist())}")

    # ---------------------------------------------------------------
    # Q1 total_listing_records
    # ---------------------------------------------------------------
    section("Q1 total_listing_records")
    print(len(ldf))

    # ---------------------------------------------------------------
    # Q3 active_listings (is_live) — NOTE: docs claim /v1/listings only
    # ever returns active listings. If `is_live` exists and is ever
    # False, that's a completeness finding, not just a data point.
    # ---------------------------------------------------------------
    section("Q3 active_listings (is_live)")
    if "is_live" in ldf.columns:
        vc = ldf["is_live"].value_counts(dropna=False)
        print(vc)
        print(f"-> is_live literally missing (NaN) count: {ldf['is_live'].isna().sum()}")
        if (ldf["is_live"] == False).any():  # noqa: E712
            print(
                "!! Docs say this endpoint only returns active listings, "
                "but is_live=False records exist. That's a completeness finding."
            )
    else:
        print("No `is_live` field in the data at all — check the raw listing object.")

    # ---------------------------------------------------------------
    # Q4 corrupt_listing_ids — physically impossible records.
    # These are heuristics. Inspect the flagged rows yourself before
    # trusting any of them.
    # ---------------------------------------------------------------
    section("Q4 corrupt_listing_ids candidates")
    corrupt_masks = {}
    if {"floor", "total_floors"} <= set(ldf.columns):
        corrupt_masks["floor_above_total_floors"] = ldf["floor"] > ldf["total_floors"]
    if {"carpet_area", "super_built_up_area"} <= set(ldf.columns):
        corrupt_masks["carpet_gt_superbuiltup"] = ldf["carpet_area"] > ldf["super_built_up_area"]
    for col in ["carpet_area", "super_built_up_area", "price", "bedroom", "bathroom"]:
        if col in ldf.columns:
            corrupt_masks[f"{col}_non_positive"] = ldf[col] <= 0
    if "latitude" in ldf.columns and "longitude" in ldf.columns:
        # rough Bangalore bounding box; adjust if your city differs
        out_of_bounds = ~ldf["latitude"].between(12.6, 13.3) | ~ldf["longitude"].between(77.3, 77.9)
        corrupt_masks["lat_long_out_of_city"] = out_of_bounds

    flagged = defaultdict(list)
    for name, mask in corrupt_masks.items():
        ids = ldf.loc[mask.fillna(False), "listing_id"].tolist()
        if ids:
            print(f"  {name}: {len(ids)} -> {ids[:10]}{' ...' if len(ids) > 10 else ''}")
            for i in ids:
                flagged[i].append(name)
    print(f"\nTotal distinct listing_ids flagged by >=1 heuristic: {len(flagged)}")
    print("Inspect these individually — 'floor 0' or 'bedroom 1' etc. might be legitimate.")

    # ---------------------------------------------------------------
    # Q5 total_monthly_rent in assigned locality
    # Sum over ALL retrievable rentals (no filter), then filter client
    # side — don't trust the locality query param to have worked.
    # ---------------------------------------------------------------
    section(f"Q5 total_monthly_rent in locality={args.locality}")
    if "locality" in rdf.columns and "price" in rdf.columns:
        norm = rdf["locality"].astype(str).str.strip().str.lower()
        target = args.locality.strip().lower()
        sub = rdf[norm == target]
        print(f"Rentals matching locality (case/space-normalized): {len(sub)}")
        print(f"Sum of price: {sub['price'].sum()}")
        # sanity check: what does the raw locality value set actually look like?
        print(f"\nDistinct locality values seen in rentals (first 30): {sorted(norm.unique())[:30]}")
    else:
        print("Missing locality or price column in rentals data.")

    # ---------------------------------------------------------------
    # Q7 costliest_project
    # ---------------------------------------------------------------
    section("Q7 costliest_project")
    if "price_max" in pdf.columns:
        row = pdf.loc[pdf["price_max"].idxmax()]
        print(f"project_id={row.get('project_id')}, price_max={row.get('price_max')}, name={row.get('apartment_name')}")
    else:
        print("No price_max column found in projects data.")

    # ---------------------------------------------------------------
    # Q8 listings_last_7_days — REFERENCE window, IST
    # ---------------------------------------------------------------
    section("Q8 listings_last_7_days")
    print(f"Window (IST): [{WINDOW_START_IST.isoformat()}, {REFERENCE_IST.isoformat()})")
    if "posted_at" in ldf.columns:
        parsed = ldf["posted_at"].apply(parse_ts)
        # compare in a common timezone
        in_window = parsed.apply(
            lambda dt: dt is not None and WINDOW_START_IST <= dt.astimezone(IST) < REFERENCE_IST
        )
        print(f"Count in window (treating posted_at as truly UTC, per docs): {in_window.sum()}")

        # Sanity check for the classic gotcha: are any posted_at values
        # suspiciously already-IST-but-labeled-Z? e.g. lots of listings
        # timestamped exactly on 30-minute boundaries, or clustering at
        # hours that only make sense if the offset is wrong.
        minutes = parsed.dropna().apply(lambda dt: dt.minute)
        print(f"\nMinute-of-hour distribution of posted_at (look for suspicious clustering):")
        print(minutes.value_counts().sort_index().head(20))
    else:
        print("No posted_at column found.")

    # ---------------------------------------------------------------
    # Q9 fake_listing_ids candidates — repeated contact numbers,
    # duplicated descriptions, etc. Purely heuristic.
    # ---------------------------------------------------------------
    section("Q9 fake_listing_ids candidates")
    if "posted_by_contact" in ldf.columns:
        contact_counts = Counter(ldf["posted_by_contact"].dropna())
        repeated = {k: v for k, v in contact_counts.items() if v > 3}
        print(f"Contacts appearing on >3 listings: {len(repeated)}")
        for k, v in sorted(repeated.items(), key=lambda kv: -kv[1])[:15]:
            ids = ldf.loc[ldf["posted_by_contact"] == k, "listing_id"].tolist()
            print(f"  {k}: {v} listings -> e.g. {ids[:5]}")
    if "description" in ldf.columns:
        desc_counts = Counter(ldf["description"].dropna())
        dup_desc = {k: v for k, v in desc_counts.items() if v > 1}
        print(f"\nExact-duplicate descriptions: {len(dup_desc)} distinct texts reused")
        for k, v in sorted(dup_desc.items(), key=lambda kv: -kv[1])[:5]:
            print(f"  (x{v}) {k[:100]}...")

    # ---------------------------------------------------------------
    # Q2 unique_properties + duplicate-listing candidates
    # Cluster by rounded lat/long + bedroom + carpet_area as a proxy
    # for "same physical unit, listed more than once" (e.g. by
    # different portals/agents).
    # ---------------------------------------------------------------
    section("Q2 unique_properties candidates (dedup heuristics)")
    if {"latitude", "longitude", "bedroom", "carpet_area"} <= set(ldf.columns):
        key = (
            ldf["latitude"].round(4).astype(str)
            + "_"
            + ldf["longitude"].round(4).astype(str)
            + "_"
            + ldf["bedroom"].astype(str)
            + "_"
            + ldf["carpet_area"].astype(str)
        )
        n_groups = key.nunique()
        dup_groups = key.value_counts()
        dup_groups = dup_groups[dup_groups > 1]
        print(f"Rows: {len(ldf)}, distinct (lat/long/bhk/carpet_area) groups: {n_groups}")
        print(f"Groups with >1 listing (candidate duplicates): {len(dup_groups)}")
        if "website" in ldf.columns:
            example_key = dup_groups.index[0] if len(dup_groups) else None
            if example_key:
                rows = ldf[key == example_key][["listing_id", "website", "apartment_name", "price"]]
                print(f"\nExample duplicate group ({example_key}):\n{rows}")
    else:
        print("Missing lat/long/bedroom/carpet_area — can't cluster this way.")

    # ---------------------------------------------------------------
    # Q10 projects_with_wrong_listing_count
    # Compare each project's stated total_listings to an actual count
    # from the full unfiltered listings pull.
    # ---------------------------------------------------------------
    section("Q10 projects_with_wrong_listing_count")
    if "project_id" in ldf.columns and {"project_id", "total_listings"} <= set(pdf.columns):
        actual_counts = ldf["project_id"].value_counts()
        mismatches = []
        for _, prow in pdf.iterrows():
            pid = prow["project_id"]
            stated = prow["total_listings"]
            actual = int(actual_counts.get(pid, 0))
            if stated != actual:
                mismatches.append((pid, stated, actual))
        print(f"Projects with stated != actual count: {len(mismatches)} / {len(pdf)}")
        for pid, stated, actual in mismatches[:15]:
            print(f"  {pid}: stated={stated}, actual={actual}")
    else:
        print("Missing project_id on listings or total_listings on projects.")

    section("Q6 avg_price_per_sqft_2bhk")
    print(
        "Compute this LAST, after you've finalized Q4 (corrupt) and Q9 (fake) "
        "lists — this question explicitly says to exclude them.\n"
        "Formula sketch once you have final exclude_ids:\n"
        "  sub = ldf[(ldf.is_live == True) & (ldf.bedroom == 2) & (~ldf.listing_id.isin(exclude_ids))]\n"
        "  ans = (sub['price'] / sub['carpet_area']).mean().round(2)"
    )

    print("\nDone. Remember: every 'candidate' above needs your eyes on it before it's an answer.")


if __name__ == "__main__":
    main()
