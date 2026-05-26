# Local Anvil State Validation

Command shape: start local Anvil with JSON state persistence, deploy BetEscrowBRL1, then run validate-deployment against the persisted state.

{
  "state": {
    "path": "/tmp/tmp.rsFJHKP2h9/state.json",
    "bestBlockNumber": "1",
    "blockNumber": "1",
    "accountCount": 15,
    "sha256": "848daf41d9fd9c38b22ca84eb387063f1e77ad08c9ef71fa9d811589096218b1"
  },
  "deployment": {
    "key": "chain:137:escrow:0xf56ca1636afdad335be776bc7b4fd7205067fcd3:block:1",
    "chainId": "137",
    "escrowAddress": "0xf56cA1636AfDAD335Be776BC7b4FD7205067fCd3",
    "deploymentBlock": "1",
    "escrowCodeHash": "ad109afcb855a424f7fd8f04439288301cb6a8f8460678b560ad3f09ef43b650"
  }
}
