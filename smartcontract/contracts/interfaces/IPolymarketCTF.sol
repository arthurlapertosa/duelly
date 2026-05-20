// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPolymarketCTF {
    function payoutDenominator(bytes32 conditionId) external view returns (uint256);
    function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256);
    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint256);
}
