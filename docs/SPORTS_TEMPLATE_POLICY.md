# M1 Sports Template Policy

M1 is sports-first. Collectibles are not part of this milestone.

## Accepted Scope

- Football/Soccer: FIFA World Cup, FIFA Club World Cup or approved world-level competitions, Brasileirão, and Copa Libertadores.
- Tennis: ATP 250, ATP 500, ATP Masters 1000, ATP Finals, and Grand Slams. Individual match winners and binary tournament winner markets are allowed when rules are deterministic.
- UFC: main events only.
- Formula 1: race winners, sprint winners, and explicitly race/sprint-based head-to-head markets.

## Required Market Shape

Accepted templates must be Polymarket-derived, active, non-archived, accepting orders when that field is available, non-negative-risk, binary, and tied to a clear `conditionId`, `questionId`, close time, rules text, and objective official-result semantics.

Markets are rejected if the result depends on odds, prices, implied probabilities, liquidity, trading activity, subjective interpretation, ambiguous cancellation/no-contest handling, or unsupported competitions.

Live Polymarket discovery is disabled by default. Fixture mode is the deterministic QA gate; live discovery must be explicitly enabled in a local/internal environment and does not publish templates automatically.

## Fee Policy

M1 uses template-level `loserFeeBps`, with the backend enforcing a configured valid range. Product settlement later applies:

```text
loserFee = max(stake * loserFeeBps / 10_000, minLoserFee)
```

`minLoserFee` is expected to cover at least 3x estimated gas in later settlement work.

## Hash Policy

`templateHash` is computed with `keccak256(abi.encode(...))` over fixed-size canonical fields. The type hash is computed from the exact case-sensitive ABI type literal. Display text, raw provider payloads, audit metadata, and mutable `active` state are not identity inputs. `active` is stored and published as registry state so templates can be deactivated without changing identity.

Localized display text, including Portuguese `display.ptBR` titles, rule summaries, and outcome labels, is presentation-only. It must not replace provider source text, drive filtering or resolution, alter hash inputs, or appear in on-chain registration calldata.
