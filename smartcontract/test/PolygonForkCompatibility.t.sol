// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20PermitToken} from "../contracts/interfaces/IERC20PermitToken.sol";
import {IPolymarketCTF} from "../contracts/interfaces/IPolymarketCTF.sol";

interface VmFork {
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function envOr(string calldata name, bytes32 defaultValue) external view returns (bytes32);
}

interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

contract PolygonForkCompatibilityTest {
    VmFork internal constant vm = VmFork(address(uint160(uint256(keccak256("hevm cheat code")))));

    function test_PolygonForkLiveReadCompatibility() public view {
        if (block.chainid != 137) return;

        address brl1Address = vm.envOr("BRL1_ADDRESS_POLYGON", address(0));
        address ctfAddress = vm.envOr("POLYMARKET_CTF_ADDRESS", address(0));
        bytes32 conditionId = vm.envOr("POLYMARKET_CONDITION_ID", bytes32(0));

        _assert(brl1Address != address(0), "BRL1_ADDRESS_POLYGON missing");
        _assert(ctfAddress != address(0), "POLYMARKET_CTF_ADDRESS missing");
        _assert(conditionId != bytes32(0), "POLYMARKET_CONDITION_ID missing");

        IERC20Metadata brl1Metadata = IERC20Metadata(brl1Address);
        IERC20PermitToken brl1 = IERC20PermitToken(brl1Address);
        IPolymarketCTF ctf = IPolymarketCTF(ctfAddress);

        _assert(bytes(brl1Metadata.symbol()).length > 0, "BRL1 symbol missing");
        _assert(brl1Metadata.decimals() <= 36, "BRL1 decimals unreasonable");
        _assert(brl1.totalSupply() > 0, "BRL1 total supply missing");
        _assert(brl1.DOMAIN_SEPARATOR() != bytes32(0), "BRL1 domain separator missing");

        address wallet = vm.envOr("WALLET_ADDRESS", address(0));
        if (wallet != address(0)) {
            brl1.nonces(wallet);
            brl1.balanceOf(wallet);
        }

        uint256 slotCount = ctf.getOutcomeSlotCount(conditionId);
        _assert(slotCount == 2, "condition is not binary");

        uint256 denominator = ctf.payoutDenominator(conditionId);
        uint256 firstNumerator = ctf.payoutNumerators(conditionId, 0);
        uint256 secondNumerator = ctf.payoutNumerators(conditionId, 1);

        if (denominator == 0) {
            _assert(firstNumerator == 0 && secondNumerator == 0, "unresolved condition has payout numerators");
        } else {
            bool outcomeZeroWins = firstNumerator == denominator && secondNumerator == 0;
            bool outcomeOneWins = secondNumerator == denominator && firstNumerator == 0;
            bool boundedVoidLike = firstNumerator <= denominator && secondNumerator <= denominator;
            _assert(outcomeZeroWins || outcomeOneWins || boundedVoidLike, "unexpected CTF payout shape");
        }
    }

    function _assert(bool condition, string memory message) private pure {
        if (!condition) revert(message);
    }
}
