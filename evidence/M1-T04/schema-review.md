# Schema Review

`templateHash` uses `keccak256(abi.encode(...))` with a case-sensitive ABI type hash and fixed-size canonical values:

- template and fee policy versions;
- provider, sport, competition, event type, and binary market type numeric codes;
- provider market ID hash, condition ID, question ID hash, rules hash, and rules source hash;
- outcome labels hashed separately plus provider outcome indexes;
- event start, betting close, resolution deadline, and loser fee bps.

Mutable `active` state is persisted and published, but intentionally excluded from `templateHash` so registry deactivation does not change template identity.
