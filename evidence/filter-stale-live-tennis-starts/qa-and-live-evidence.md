# QA And Live Evidence

Task: keep bets open until provider event-end close time, and block funding after CTF resolution.

## Live Gamma Probe

Command: local backend discovery/filter code against `https://gamma-api.polymarket.com`, `sport=tennis`, `maxResults=100`, `minBettingCloseBufferSeconds=0`.

Probe time: `2026-05-22T19:06:54.498Z`.

Summary:

- Tennis candidates: `1284`
- Tennis accepted: `106`
- Tennis rejected: `1178`
- Started-but-still-open accepted direct winners: `11`
- Accepted started direct-winner examples:
  - `2296734` `Roland Garros, Qualification ATP: Dalibor Svrcina vs Federico Agustin Gomez`
    - `eventStartAt=2026-05-20T08:00:00.000Z`
    - `bettingCloseAt=2026-05-27T08:00:00.000Z`
  - `2289424` `Geneva Open: Cameron Norrie vs Mariano Navone`
    - `eventStartAt=2026-05-20T09:05:00.000Z`
    - `bettingCloseAt=2026-05-27T08:00:00.000Z`

UFC probe time: `2026-05-22T19:07:10.293Z`.

- UFC candidates: `700`
- UFC accepted: `3`
- UFC rejected: `697`
- Accepted headline example: `2217661` `UFC Fight Night: Song Yadong vs. Deiveson Figueiredo (Bantamweight, Main Card)`, `bettingCloseAt=2026-05-31T03:59:59.000Z`.

## Manual Exploratory QA

Documented exploratory path for a deployed branch or local fork:

- Open Explore and confirm started-but-unresolved Tennis/UFC templates still appear while provider `endDate` is future.
- Create an invite and confirm offer/permit deadlines match the template `bettingCloseAt`.
- Complete taker acceptance before resolution and confirm funding succeeds.
- Set a mocked/local CTF payout denominator nonzero before taker authorization and confirm funding is blocked with `CONDITION_RESOLVED`.

Execution status in this worktree:

- Live API-style discovery probes were executed with local backend code.
- Contract-level resolved-condition behavior was executed through Forge test `test_TemplateRejectsResolvedConditionFunding`.
- Full browser/manual fork flow was not executed here because this branch was not deployed to staging and no local fork/browser session was running.

## QA Commands

- `npm --workspace backend run test:unit` passed: `46` tests, `0` failures.
- `npm --workspace smartcontract test` passed: node smoke plus Forge `50` tests.
- `npm --workspace backend run qa` passed: typecheck plus backend tests, `49` tests, `46` passed, `3` skipped DB integration tests.
- `npm run validate` passed.
- `npm test` passed:
  - root tests passed: `41`
  - frontend tests passed: `13`
  - backend tests passed: `49` total, `46` passed, `3` skipped DB integration tests
  - smartcontract tests passed: node smoke plus Forge `50` tests
- `npm run qa` passed: root harness, workspace tests, backend tests, smartcontract tests, ending with `[qa] ok`.

## Frontend Note

Frontend behavior changed only for the new `CONDITION_RESOLVED` localized error message. Template cards still display `bettingCloseAt` from the backend, which now remains the provider event-end close time with a default zero close buffer.
