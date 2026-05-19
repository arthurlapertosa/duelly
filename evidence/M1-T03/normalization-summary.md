# Normalization Summary

The M1 adapter supports fixture mode and live public Gamma mode behind the same service interface. HTTP live mode is disabled by default and requires `POLYMARKET_LIVE_DISCOVERY_ENABLED=true`.

Normalized fields include provider, provider event/market IDs, slug, question, condition ID, question ID, binary outcomes with provider indexes, status flags, negative-risk flag, close time, rules text/source, sport, competition, event type, binary market type, participants, and raw provider payload hash. Live classification uses conservative text heuristics for the approved sports scope and defaults ambiguous result-source semantics to rejected.

The adapter does not mark candidates as accepted. Acceptance is handled only by the filter service.
