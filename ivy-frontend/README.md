# Ivy Homes frontend

Next.js 14 App Router frontend for the Ivy Homes assignment.

## Run

```bash
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_IVY_API_KEY in .env.local
npm run dev
```

The API client uses the verified contract: `X-API-Key`, bearer access tokens, refresh tokens, offset pagination, and `has_more` termination. It deliberately does not trust the API's stale `total` field. Listing filters are applied client-side after the complete listings pull so the browser remains correct even if a server filter is ignored.

## Known API gap

The live `/v1/favourites` route returned 404 for GET, POST, and DELETE, including trailing-slash and American-spelling checks. Saved listings are therefore stored client-side in `localStorage`, namespaced by the logged-in user's email. This is an API gap, not an application error.

The live `/v1/analytics/summary` route also returned 404. The Insights screen computes median positive price, locality counts, bedroom counts, live/inactive split, and median price per square foot from the full listings collection instead.

## Notes

The project was built with GitHub Copilot. API corrections are recorded in the repository-level `API_CORRECTIONS.md`.
