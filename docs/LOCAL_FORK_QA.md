# Local Fork QA

Use this guide when backend and smart-contract behavior must be tested together without sending live Polygon transactions. The QA target is an Anvil fork of Polygon mainnet running locally with chain ID `137`, deployed mock contracts, local Postgres, and real EIP-712/ERC-2612 signatures from test wallets.

## What The Fork Represents

- RPC URL: `http://127.0.0.1:8545`.
- Chain ID: `137`, so contract domains match Polygon-style production configuration.
- Native currency symbol for wallets: `POL`.
- Contracts: `MockBRL1`, `MockPolymarketCTF`, and `BetEscrowBRL1`.
- Backend target: the local fork RPC, not the upstream Polygon RPC.
- Wallet target: the same local RPC if MetaMask visualization is needed.

The fork is local state. Public explorers and public Polygon RPCs will not show these balances, contracts, or transactions.

## Local State Files

The fork uses two local-only inputs:

- `.env` in the base checkout: stores secrets and local database settings.
- `cache/m3-local-fork/deployment.env` in the base checkout: stores public local deployment addresses and block numbers.

Never commit either file, and never copy private keys into evidence. The deployment cache is operational state, not source code.

If working from a task worktree, the cache may not exist in that worktree. Source it from the base checkout:

```bash
BASE_REPO="${BASE_REPO:-$HOME/lyth/duelly}"
WORKTREE="${WORKTREE:-$PWD}"

set -a
source "$BASE_REPO/.env"
source "$BASE_REPO/cache/m3-local-fork/deployment.env"
set +a
```

`deployment.env` must define these public values:

```bash
LOCAL_FORK_RPC_URL=http://127.0.0.1:8545
LOCAL_FORK_CHAIN_ID=137
BRL1_TOKEN_ADDRESS=<mock BRL1 address>
BRL1_ADDRESS_POLYGON=<same mock BRL1 address for compatibility>
POLYMARKET_CTF_ADDRESS=<mock CTF address>
DUELLY_ESCROW_ADDRESS=<escrow address>
DUELLY_DEPLOYMENT_BLOCK=<escrow deployment block or later local fork block>
RELAYER_ADDRESS=<relayer public address>
QA_MAKER_ADDRESS=<maker public address>
QA_TAKER_ADDRESS=<taker public address>
TREASURY_ADDRESS=<treasury public address>
```

## Start The Fork

Start Anvil from the base checkout or the task worktree. Use the mainnet Polygon RPC only as the fork source.

```bash
BASE_REPO="${BASE_REPO:-$HOME/lyth/duelly}"

set -a
source "$BASE_REPO/.env"
set +a

anvil \
  --fork-url "$POLYGON_RPC_URL" \
  --chain-id 137 \
  --host 127.0.0.1 \
  --port 8545
```

Verify the fork before starting the backend:

```bash
curl -sS -X POST "http://127.0.0.1:8545" \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
```

The result should be `0x89`.

## Recreate The Local Deployment

Use this section only when `cache/m3-local-fork/deployment.env` is missing or the fork was restarted without persisted state.

```bash
BASE_REPO="${BASE_REPO:-$HOME/lyth/duelly}"
LOCAL_FORK_RPC_URL="${LOCAL_FORK_RPC_URL:-http://127.0.0.1:8545}"
LOCAL_FORK_CHAIN_ID=137

set -a
source "$BASE_REPO/.env"
set +a

RELAYER_PRIVATE_KEY="${RELAYER_PRIVATE_KEY/#0x/}"
RELAYER_PRIVATE_KEY="0x$RELAYER_PRIVATE_KEY"
QA_MAKER_PRIVATE_KEY="${QA_MAKER_PRIVATE_KEY/#0x/}"
QA_MAKER_PRIVATE_KEY="0x$QA_MAKER_PRIVATE_KEY"
QA_TAKER_PRIVATE_KEY="${QA_TAKER_PRIVATE_KEY/#0x/}"
QA_TAKER_PRIVATE_KEY="0x$QA_TAKER_PRIVATE_KEY"

RELAYER_ADDRESS="$(cast wallet address --private-key "$RELAYER_PRIVATE_KEY")"
QA_MAKER_ADDRESS="$(cast wallet address --private-key "$QA_MAKER_PRIVATE_KEY")"
QA_TAKER_ADDRESS="$(cast wallet address --private-key "$QA_TAKER_PRIVATE_KEY")"

for address in "$RELAYER_ADDRESS" "$QA_MAKER_ADDRESS" "$QA_TAKER_ADDRESS" "$TREASURY_ADDRESS"; do
  cast rpc anvil_setBalance "$address" 0x56BC75E2D63100000 --rpc-url "$LOCAL_FORK_RPC_URL"
done

BRL1_TOKEN_ADDRESS="$(
  forge create smartcontract/contracts/mocks/MockBRL1.sol:MockBRL1 \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --json | jq -r .deployedTo
)"

POLYMARKET_CTF_ADDRESS="$(
  forge create smartcontract/contracts/mocks/MockPolymarketCTF.sol:MockPolymarketCTF \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --json | jq -r .deployedTo
)"

DUELLY_ESCROW_ADDRESS="$(
  forge create smartcontract/contracts/BetEscrowBRL1.sol:BetEscrowBRL1 \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY" \
    --constructor-args "$BRL1_TOKEN_ADDRESS" "$POLYMARKET_CTF_ADDRESS" "$TREASURY_ADDRESS" \
    --json | jq -r .deployedTo
)"

cast send "$DUELLY_ESCROW_ADDRESS" \
  'setRole(bytes32,address,bool)' \
  "$(cast keccak TEMPLATE_PUBLISHER_ROLE)" \
  "$RELAYER_ADDRESS" \
  true \
  --rpc-url "$LOCAL_FORK_RPC_URL" \
  --private-key "$RELAYER_PRIVATE_KEY"

cast send "$DUELLY_ESCROW_ADDRESS" \
  'setRole(bytes32,address,bool)' \
  "$(cast keccak FEE_OPERATOR_ROLE)" \
  "$RELAYER_ADDRESS" \
  true \
  --rpc-url "$LOCAL_FORK_RPC_URL" \
  --private-key "$RELAYER_PRIVATE_KEY"

if [ "${MIN_LOSER_FEE_WEI:-0}" != "0" ]; then
  cast send "$DUELLY_ESCROW_ADDRESS" \
    'setMinLoserFee(uint256)' \
    "$MIN_LOSER_FEE_WEI" \
    --rpc-url "$LOCAL_FORK_RPC_URL" \
    --private-key "$RELAYER_PRIVATE_KEY"
fi

BRL1_QA_AMOUNT=10000000000000000000000
cast send "$BRL1_TOKEN_ADDRESS" 'mint(address,uint256)' "$QA_MAKER_ADDRESS" "$BRL1_QA_AMOUNT" \
  --rpc-url "$LOCAL_FORK_RPC_URL" --private-key "$RELAYER_PRIVATE_KEY"
cast send "$BRL1_TOKEN_ADDRESS" 'mint(address,uint256)' "$QA_TAKER_ADDRESS" "$BRL1_QA_AMOUNT" \
  --rpc-url "$LOCAL_FORK_RPC_URL" --private-key "$RELAYER_PRIVATE_KEY"

DUELLY_DEPLOYMENT_BLOCK="$(cast block-number --rpc-url "$LOCAL_FORK_RPC_URL")"

mkdir -p "$BASE_REPO/cache/m3-local-fork"
cat > "$BASE_REPO/cache/m3-local-fork/deployment.env" <<EOF
LOCAL_FORK_RPC_URL=$LOCAL_FORK_RPC_URL
LOCAL_FORK_CHAIN_ID=$LOCAL_FORK_CHAIN_ID
BRL1_TOKEN_ADDRESS=$BRL1_TOKEN_ADDRESS
BRL1_ADDRESS_POLYGON=$BRL1_TOKEN_ADDRESS
POLYMARKET_CTF_ADDRESS=$POLYMARKET_CTF_ADDRESS
DUELLY_ESCROW_ADDRESS=$DUELLY_ESCROW_ADDRESS
DUELLY_DEPLOYMENT_BLOCK=$DUELLY_DEPLOYMENT_BLOCK
RELAYER_ADDRESS=$RELAYER_ADDRESS
QA_MAKER_ADDRESS=$QA_MAKER_ADDRESS
QA_TAKER_ADDRESS=$QA_TAKER_ADDRESS
TREASURY_ADDRESS=$TREASURY_ADDRESS
EOF
```

## Start The Backend Against The Fork

Run this from the task worktree.

```bash
BASE_REPO="${BASE_REPO:-$HOME/lyth/duelly}"

set -a
source "$BASE_REPO/.env"
source "$BASE_REPO/cache/m3-local-fork/deployment.env"
set +a

export CHAIN_ENABLED=true
export CHAIN_RPC_URL="$LOCAL_FORK_RPC_URL"
export CHAIN_ID="$LOCAL_FORK_CHAIN_ID"
export AUTH_MOCK_ENABLED=false
export NODE_ENV=development

npm --workspace @duelly/backend run db:migration:run
npm --workspace @duelly/backend run dev
```

The default API URL is `http://127.0.0.1:3000`.

## QA Wallets And Users

For local QA, use two normal backend users and link each to one external wallet:

- Maker user: `local-maker@example.test`.
- Taker user: `local-taker@example.test`.
- Password for local QA: `local-password-123`.
- Maker wallet: `QA_MAKER_ADDRESS`.
- Taker wallet: `QA_TAKER_ADDRESS`.

Register or log in through the API, then link each wallet with the challenge flow:

```bash
API="${API:-http://127.0.0.1:3000}"

curl -sS -X POST "$API/auth/register" \
  -H 'content-type: application/json' \
  -d '{"email":"local-maker@example.test","password":"local-password-123"}'

MAKER_TOKEN="$(
  curl -sS -X POST "$API/auth/login" \
    -H 'content-type: application/json' \
    -d '{"email":"local-maker@example.test","password":"local-password-123"}' | jq -r .token
)"

CHALLENGE_JSON="$(
  curl -sS -X POST "$API/wallets/challenges" \
    -H "authorization: Bearer $MAKER_TOKEN" \
    -H 'content-type: application/json' \
    -d "{\"address\":\"$QA_MAKER_ADDRESS\"}"
)"
CHALLENGE_ID="$(jq -r .id <<<"$CHALLENGE_JSON")"
CHALLENGE_MESSAGE="$(jq -r .message <<<"$CHALLENGE_JSON")"

MAKER_SIGNATURE="$(cast wallet sign --private-key "$QA_MAKER_PRIVATE_KEY" "$CHALLENGE_MESSAGE")"

curl -sS -X POST "$API/wallets/link" \
  -H "authorization: Bearer $MAKER_TOKEN" \
  -H 'content-type: application/json' \
  -d "{\"challengeId\":\"$CHALLENGE_ID\",\"signature\":\"$MAKER_SIGNATURE\"}"
```

Repeat the same process for the taker. If the API returns `WALLET_ALREADY_LINKED`, use the user that already owns that wallet instead of inserting duplicate wallet rows.

## End-To-End Smoke Flow

The local fork flow should prove that the backend is not deciding the winner:

1. Log in as maker and taker.
2. Fetch the fixture template, for example `GET /templates/fixture-f1-sprint-winner?mode=fixture`.
3. Publish it with `POST /templates/fixture-f1-sprint-winner/publish-chain?mode=fixture`.
4. Quote loser fee with `POST /fees/loser-fee`.
5. Create a draft invite with `POST /invites`; the response includes `offerPayload` and `makerPermitPayload`.
6. Sign both maker payloads and store them with `POST /invites/:inviteId/maker-authorizations`. Only after this step is the invite shareable.
7. Fetch the shareable invite with `GET /invites/:inviteId`.
8. Accept the invite with `POST /invites/:inviteId/accept`; the response includes `acceptancePayload` and `takerPermitPayload`.
9. Sign both taker payloads and submit them with `POST /invites/:inviteId/taker-authorizations`; this triggers the backend relayer and writes `acceptBetWithPermits` to escrow.
10. If needed after a transient relayer failure, retry stored-authorizations funding with `POST /relayer/fund` and body `{"inviteId":"..."}`.
11. Run `POST /internal/indexer/reindex`.
12. On a fresh condition, run `POST /internal/resolution/run` before mock payout and expect a pending resolution attempt with `ConditionUnresolved`.
13. Set mock CTF payout, run `POST /internal/resolution/run` again, then reindex. On a reused fork where the condition already has payout, resolution may succeed immediately and the explicit mock payout step can be skipped.
14. Read `GET /bets/:betId`; expect `Resolved` or `Voided` from escrow events, never from backend-local result logic.

Use this helper for EIP-712 payload signatures returned by the backend:

```bash
sign_typed_payload() {
  local private_key="$1"
  local payload_json="$2"

  PAYLOAD_JSON="$payload_json" PRIVATE_KEY="$private_key" node --input-type=module <<'NODE'
import { privateKeyToAccount } from 'viem/accounts';

const payload = JSON.parse(process.env.PAYLOAD_JSON);
const account = privateKeyToAccount(process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`);
const uintFields = new Set(['stake', 'loserFee', 'nonce', 'deadline']);
for (const [key, value] of Object.entries(payload.message)) {
  if (uintFields.has(key)) payload.message[key] = BigInt(value);
}
console.log(await account.signTypedData(payload));
NODE
}
```

Use this helper for converting an ERC-2612 permit signature into the `makerPermit` or `takerPermit` object expected by the backend:

```bash
sign_brl1_permit() {
  local private_key="$1"
  local owner="$2"
  local spender="$3"
  local value="$4"
  local nonce="$5"
  local deadline="$6"

  PRIVATE_KEY="$private_key" OWNER="$owner" SPENDER="$spender" VALUE="$value" NONCE="$nonce" DEADLINE="$deadline" node --input-type=module <<'NODE'
import { parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`);
const signature = await account.signTypedData({
  domain: {
    name: 'Mock BRL1',
    version: '1',
    chainId: Number(process.env.LOCAL_FORK_CHAIN_ID ?? 137),
    verifyingContract: process.env.BRL1_TOKEN_ADDRESS,
  },
  types: {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit',
  message: {
    owner: process.env.OWNER,
    spender: process.env.SPENDER,
    value: BigInt(process.env.VALUE),
    nonce: BigInt(process.env.NONCE),
    deadline: BigInt(process.env.DEADLINE),
  },
});
const parsed = parseSignature(signature);
console.log(JSON.stringify({
  value: process.env.VALUE,
  nonce: process.env.NONCE,
  deadline: process.env.DEADLINE,
  v: Number(parsed.v),
  r: parsed.r,
  s: parsed.s,
}));
NODE
}
```

The frontend path should use the backend-provided permit payload directly. The object submitted to the backend must include the same `value`, `nonce`, and `deadline` from the payload plus parsed `v`, `r`, and `s`.

## MetaMask Visualization

MetaMask is optional for QA evidence, but it is useful for seeing local balances move.

1. Add a custom network with RPC URL `http://127.0.0.1:8545`, chain ID `137`, and currency symbol `POL`.
2. Import the maker and taker accounts from their private keys.
3. Import the token at `BRL1_TOKEN_ADDRESS`.
4. Use symbol `BRL1` and decimals `18`.

If MetaMask shows stale token metadata, remove the imported token and import it again after the fork and backend are running.

## Expected Contract Behavior

- `registerTemplate` emits `TemplateRegistered`.
- `acceptBetWithPermits` verifies maker/taker typed-data signatures, consumes ERC-2612 permits, pulls `stake + loserFee` from both wallets, and emits `BetFunded`.
- `resolveFromPolymarket` reads `MockPolymarketCTF` payout data. It returns pending while the denominator is zero.
- When the mock payout is `[1,0]` with denominator `1`, the maker wins if the maker selected provider outcome index `0`.
- Settlement emits `BetSettled`; ambiguous payout data emits `BetVoided`.
- The backend indexer reads escrow events and exposes bet state; it does not determine the winner.

## Troubleshooting

- `MISSING_INVITEID`: the funding JSON body is malformed. Build the JSON with explicit keys such as `{inviteId:$inviteId,...}`.
- `WALLET_ALREADY_LINKED`: the wallet is already linked to another local user. Reuse that user or reset local DB state.
- `INVALID_SIGNATURE`: convert stringified EIP-712 integer fields to `BigInt` before signing typed data.
- `SignatureExpired`, `INVITE_EXPIRED`, or `TEMPLATE_CLOSED`: check fork time, `INVITE_TTL_SECONDS`, and the template `bettingCloseAt`.
- Final bet still reads `Funded` after resolution: run `POST /internal/indexer/reindex` again. The indexer deliberately rescans recent blocks, so a second reindex can pick up the latest settlement event after local fork timing changes.
- MetaMask shows a wrong BRL1 amount: verify that the imported token uses decimals `18`, then remove and reimport the token if the field was cached.
