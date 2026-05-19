# Sports Policy Review

Fixture decisions are encoded in `backend/fixtures/polymarket/sports/markets.json` and covered by `backend/test/unit/template-filter.test.ts`.

Accepted examples:

- Football/Soccer: FIFA World Cup, Brasileirão, Copa Libertadores binary winner fixtures.
- Tennis: ATP 250 match winner and Grand Slam tournament winner fixtures.
- UFC: main event fight winner fixture.
- Formula 1: race winner and sprint winner fixtures.

Rejected examples include:

- football 3-way match result and spread;
- tennis total games and non-ATP-250+ tournament;
- UFC undercard and method-of-victory;
- F1 qualifying and fastest lap;
- missing `conditionId`, missing `questionId`, missing rules, non-binary outcomes, negative risk, inactive/closed/archived/not-accepting-orders, near expiry, ambiguous resolution, odds/probability result, unsupported sport, unsupported competition, and invalid loser fee.
