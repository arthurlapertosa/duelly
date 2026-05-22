# Template Text Search Filter Evidence

## Screenshots

- `screenshots/frontend-explore-default-mobile.png`: default Explore list.
- `screenshots/frontend-explore-search-match-mobile.png`: text search with matching results.
- `screenshots/frontend-explore-search-empty-mobile.png`: text search with no results.
- `screenshots/frontend-explore-category-search-mobile.png`: Tennis tab combined with text search.

Captured with Playwright at a 393px mobile viewport against `npm --workspace frontend run dev -- --port 5173`.

## QA

- `npm --workspace frontend test`
- `npm --workspace frontend run qa`
- `npm run validate`
- `npm test`
- `npm run qa`

All commands passed locally.

## Frontend Parity

This is a human-requested UX addition to the Explore screen. Existing `.prototype/` structure is otherwise preserved; the search row is the approved deviation to make large template lists findable.
