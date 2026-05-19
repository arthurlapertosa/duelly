// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract SettlementTest is BetEscrowTestBase {
    function test_SettlementPlayerAWinsPaysWinnerAndTreasury() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        uint256 makerBefore = brl1.balanceOf(maker);
        uint256 treasuryBefore = brl1.balanceOf(treasury);

        setPayout(1, 0, 1);
        escrow.resolveFromPolymarket(betId);

        uint256 winnerPayout = (2 * bet.stake) + bet.loserFee;
        assertEq(brl1.balanceOf(maker), makerBefore + winnerPayout, "maker payout");
        assertEq(brl1.balanceOf(taker), 10_000 * TOKEN - (bet.stake + bet.loserFee), "taker no payout");
        assertEq(brl1.balanceOf(treasury), treasuryBefore + bet.loserFee, "treasury payout");
        assertEq(brl1.balanceOf(address(escrow)), 0, "escrow empty");
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Resolved), "resolved");
    }

    function test_SettlementPlayerBWinsPaysWinnerAndTreasury() public {
        registerDefaultTemplate();
        uint256 betId = fundBet(1, 2, 1, 0);
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        uint256 takerBefore = brl1.balanceOf(taker);

        setPayout(1, 0, 1);
        escrow.resolveFromPolymarket(betId);

        uint256 winnerPayout = (2 * bet.stake) + bet.loserFee;
        assertEq(brl1.balanceOf(taker), takerBefore + winnerPayout, "taker payout");
        assertEq(brl1.balanceOf(treasury), bet.loserFee, "treasury payout");
        assertEq(brl1.balanceOf(address(escrow)), 0, "escrow empty");
    }

    function test_SettlementVoidRefundsBothPlayersAndTreasuryZero() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        uint256 makerBefore = brl1.balanceOf(maker);
        uint256 takerBefore = brl1.balanceOf(taker);

        setPayout(1, 1, 1);
        escrow.resolveFromPolymarket(betId);

        uint256 refund = bet.stake + bet.loserFee;
        assertEq(brl1.balanceOf(maker), makerBefore + refund, "maker refund");
        assertEq(brl1.balanceOf(taker), takerBefore + refund, "taker refund");
        assertEq(brl1.balanceOf(treasury), 0, "treasury zero");
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Voided), "voided");
    }

    function test_SettlementDoubleSettlementFails() public {
        uint256 betId = fundDefaultBet();
        setPayout(1, 0, 1);
        escrow.resolveFromPolymarket(betId);

        vm.expectRevert(BetEscrowBRL1.BetNotFunded.selector);
        escrow.resolveFromPolymarket(betId);
    }
}
