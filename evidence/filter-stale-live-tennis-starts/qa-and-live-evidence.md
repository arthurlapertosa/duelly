# QA And Live Evidence

Task: filter stale live tennis starts without depending on Polymarket trading availability.

## Live Gamma Probe

Command: local backend discovery/filter code against `https://gamma-api.polymarket.com`, `sport=tennis`, `maxResults=100`.

Probe time: `2026-05-22T18:39:52.673Z`.

Summary:

- Candidates: `1284`
- Accepted: `96`
- Rejected: `1188`
- Accepted ATP500 example:
  - `2325780`
  - `Hamburg European Open: Alex de Minaur vs Tommy Paul`
  - `competition=ATP_500`
  - `eventStartAt=2026-05-22T15:30:00.000Z`
- Stale direct winners now reject with `EVENT_START_STALE`, even when Gamma still reports them active:
  - `2296734` `Roland Garros, Qualification ATP: Dalibor Svrcina vs Federico Agustin Gomez`
  - `start=2026-05-20T08:00:00Z`
  - `closed=true`, `acceptingOrders=false`
- Completed-match and prop markets remain rejected as `DISALLOWED_TENNIS_MARKET_TYPE`.

Observed Gamma limitation:

- Official ATP schedule has Geneva active on May 22, 2026, including `C. Ruud vs M. Navone` and `L. Tien vs A. Bublik`.
- Gamma feed/search did not expose those current Geneva semifinal direct-winner markets during the probe.
- Gamma did expose older Geneva direct winners, which are now rejected by `EVENT_START_STALE`.

## QA Commands

- `npm --workspace backend run test:unit` passed: `46` tests, `0` failures.
- `npm --workspace backend run qa` passed: typecheck plus backend tests, `49` tests, `0` failures, `3` skipped DB integration tests.
- `npm run validate` passed.
- `npm test` passed:
  - root tests passed: `41`
  - frontend tests passed: `13`
  - backend tests passed: `49` total, `46` passed, `3` skipped DB integration tests
  - smartcontract tests passed: node smoke plus Forge `48` tests
- `npm run qa` passed.

## Frontend Note

Frontend was not changed. Explore tab behavior should update after backend deployment because `/templates?mode=live&sport=tennis` will receive accepted Hamburg ATP500 templates and stale started matches will be filtered out.
