# Ivy Homes API Corrections

Verified against the running service on 2026-09-14. The API is the source of truth.

## Authentication

- Send the API key in the `X-API-Key` header, not as `?api_key=`.
- `POST /auth/login` returns `access_token`, `refresh_token`, and `expires_in` (900 seconds), not `token` with a 24-hour lifetime.
- `POST /auth/refresh` exists and accepts the refresh token.

## Pagination

- Collection endpoints use `offset` and `limit`, not `page`.
- The effective maximum page size is 50.
- Collection envelopes contain `limit`, `offset`, `count`, `total`, `has_more`, and `results`.
- Advance by the returned `count` and stop on `has_more=false`. Do not stop when `offset + count >= total`; the reported totals are stale.
- Full no-filter pulls reached 4,700 listings, 1,900 rentals, and 520 projects, while the API reported totals of 4,422, 1,788, and 489 respectively.

## Routes

- Listing detail is `GET /v1/listings/{id}`. The documented singular `/v1/listing/{id}` returns 404.
- `/v1/listings/{id}/similar` returns 404.
- `/v1/favourites` and `/v1/analytics/summary` return 404, including their tested trailing-slash and American-spelling variants.

## Sorting and data quality

- `order` is ignored for tested listing sorts; `carpet_area` with and without `order=desc` returned the same first five records.
- Listings include `is_live=false` records despite the documentation saying inactive listings are excluded.
- Some listing prices are non-positive.
- Project `price_min` and `price_max` are decimal crore-scale values, not integer rupee amounts as documented.
