// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {MockReentrantBRL1} from "../contracts/mocks/MockReentrantBRL1.sol";
import {MockPolymarketCTF} from "../contracts/mocks/MockPolymarketCTF.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract SecurityTest is BetEscrowTestBase {
    function test_SecurityPauseBlocksNewFundingButAllowsResolution() public {
        uint256 betId = fundDefaultBet();
        escrow.pause();

        BetEscrowBRL1.BetOffer memory offer = defaultOffer(3, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 4, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.PausedError.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);

        setPayout(1, 0, 1);
        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Resolved), "resolved paused");
    }

    function test_SecurityExpiryRefundsAfterDeadlineOnly() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);

        vm.expectRevert(BetEscrowBRL1.ResolutionDeadlineNotReached.selector);
        escrow.expireUnresolvedBet(betId);

        vm.warp(bet.resolutionDeadline + 1);
        escrow.expireUnresolvedBet(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Expired), "expired");
        assertEq(brl1.balanceOf(address(escrow)), 0, "refunded");
    }

    function test_SecurityExpiryFailsWhenCtfResolutionIsAvailable() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        setPayout(1, 0, 1);
        vm.warp(bet.resolutionDeadline + 1);

        vm.expectRevert(BetEscrowBRL1.ConditionResolved.selector);
        escrow.expireUnresolvedBet(betId);

        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Resolved), "resolved");
    }

    function test_SecurityRefundWorksWhilePaused() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        escrow.pause();
        vm.warp(bet.resolutionDeadline + 1);
        escrow.expireUnresolvedBet(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Expired), "expired paused");
    }

    function test_SecurityMinMaxStakeEnforced() public {
        escrow.setStakeLimits(50 * TOKEN, 60 * TOKEN);
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidStake.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_SecurityReentrantTokenCannotEnterEscrow() public {
        MockReentrantBRL1 attackToken = new MockReentrantBRL1();
        MockPolymarketCTF attackCtf = new MockPolymarketCTF();
        BetEscrowBRL1 attackEscrow = new BetEscrowBRL1(address(attackToken), address(attackCtf), treasury);
        attackToken.mint(maker, 10_000 * TOKEN);
        attackToken.mint(taker, 10_000 * TOKEN);
        attackToken.setReentry(address(attackEscrow), true);

        brl1 = attackToken;
        ctf = attackCtf;
        escrow = attackEscrow;
        registerDefaultTemplate();
        fundBet(1, 2, 0, 1);

        assertTrue(attackToken.reentryBlocked(), "reentry blocked");
    }
}
