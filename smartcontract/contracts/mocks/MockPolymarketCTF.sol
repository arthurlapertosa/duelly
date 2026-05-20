// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPolymarketCTF {
    struct Payout {
        uint256 denominator;
        uint256[] numerators;
        bool hasSlotCount;
        uint256 slotCount;
    }

    mapping(bytes32 => Payout) private _payouts;

    function setPayout(bytes32 conditionId, uint256 denominator, uint256[] memory numerators) external {
        Payout storage payout = _payouts[conditionId];
        payout.denominator = denominator;
        payout.numerators = numerators;
        payout.hasSlotCount = true;
        payout.slotCount = numerators.length;
    }

    function setPayoutWithoutSlotCount(bytes32 conditionId, uint256 denominator, uint256[] memory numerators) external {
        Payout storage payout = _payouts[conditionId];
        payout.denominator = denominator;
        payout.numerators = numerators;
        payout.hasSlotCount = false;
        payout.slotCount = 0;
    }

    function setOutcomeSlotCount(bytes32 conditionId, uint256 slotCount) external {
        Payout storage payout = _payouts[conditionId];
        payout.hasSlotCount = true;
        payout.slotCount = slotCount;
    }

    function payoutDenominator(bytes32 conditionId) external view returns (uint256) {
        return _payouts[conditionId].denominator;
    }

    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256) {
        Payout storage payout = _payouts[conditionId];
        if (index >= payout.numerators.length) return 0;
        return payout.numerators[index];
    }

    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint256) {
        Payout storage payout = _payouts[conditionId];
        if (!payout.hasSlotCount) revert("slot count unavailable");
        return payout.slotCount;
    }
}
