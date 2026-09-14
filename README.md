# Ivy Homes Assignment

## Run locally

The data-analysis scripts use Python 3 and `pandas`:

```bash
pip install pandas requests
python3 ivy_analyze.py --locality indiranagar
```

The frontend is in `ivy-frontend` and uses Next.js 14, TypeScript, and Tailwind:

```bash
cd ivy-frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_IVY_API_KEY to the issued key in .env.local.
npm run dev
```

Open `http://localhost:3000`. The frontend API client sends the key in `X-API-Key`, logs in with the real access-token response, refreshes before expiry, and uses offset pagination until `has_more` is false.

## How I tested the documentation

I treated the running API as authoritative and pulled the complete unfiltered collections before analyzing records. The first page sweep exposed that the documented `page` parameter is accepted but ignored: page 1 and page 2 returned the same records. Raw envelopes showed `offset`, `limit`, `count`, `total`, `has_more`, and `results`, with an effective limit of 50. I changed the collector to advance by the actual returned count and to stop only on `has_more=false`.

The API's `total` field is stale. The corrected pull retrieved 4,700 unique listings, 1,900 unique rentals, and 520 unique projects, while the API reported totals of 4,422, 1,788, and 489. Those mismatches are recorded in `submission.json` and `API_CORRECTIONS.md`.

Authentication was also tested from raw responses. The key belongs in `X-API-Key`, not the query string. Login returns `access_token`, `refresh_token`, and a 900-second expiry, and the refresh endpoint works. The documented singular listing path is wrong: `/v1/listings/{id}` works while `/v1/listing/{id}` returns 404.

I directly tested the documented similar-listings, favourites, and analytics routes. Favourites returned 404 for GET, POST, and DELETE, including `/v1/favorites`, trailing slashes, and authenticated requests. Analytics also returned 404. The frontend therefore implements saved listings per user in localStorage and computes insights from the full listings pull instead of pretending those unavailable routes work.

## What turned out fine

Several plausible concerns did not survive testing:

- The corrected 4,700 listings have 4,700 unique `listing_id` values.
- Rounded `(latitude, longitude, bedroom, carpet_area)` clustering produced 4,700 groups and zero groups containing multiple listing IDs.
- Locality, bedroom, price, and furnishing filters changed server result counts in direct probes; the frontend still applies them client-side to protect the user experience.
- The health endpoint worked and returned an explicit `+05:30` server-time offset.
- Pagination advanced through distinct records once offset was used; the repeats came from the original client using the ignored `page` parameter.

## Record investigations

For the answer fields, `active_listings` uses `is_live=true`. Project `total_listings` is documented as currently available, so Q10 compares it with only live listings; that gives 127 mismatches, versus 392 when inactive records are incorrectly included.

The corrupt-listing list uses the small union of four reproduced impossible-value checks: floor above total floors, carpet area above super built-up area, non-positive price, and out-of-city coordinates. The fake-listing list uses the narrow owner-only tail: the three owner contacts appearing on seven listings each, for 21 IDs. Agent repetition was not treated as fraud because agents commonly represent multiple properties. Q6 excludes those 32 corrupt candidates and 21 fake candidates.

Project prices are decimal crore-scale values, so the costliest project's `price_max_inr` is converted from `99.8` crore to `998000000` rupees.

## With two more days

I would add authenticated browser-level tests for login persistence and refresh, improve the detail and browse loading/error states, and inspect every candidate corrupt/fake record manually before submission. I would also deploy the frontend, replace the localStorage saved-list limitation if the API team provides a working favourites route, and add a small reproducible evidence report for each answer.

GitHub Copilot was used during the investigation and implementation.
