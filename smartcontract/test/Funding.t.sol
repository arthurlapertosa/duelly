// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract FundingTest is BetEscrowTestBase {
    function test_FundingValidPermitsPullExactEscrowAndEmitBet() public {
        uint256 makerBefore = brl1.balanceOf(maker);
        uint256 takerBefore = brl1.balanceOf(taker);
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        uint256 deposit = bet.stake + bet.loserFee;

        assertEq(brl1.balanceOf(address(escrow)), 2 * deposit, "escrow balance");
        assertEq(brl1.balanceOf(maker), makerBefore - deposit, "maker debited");
        assertEq(brl1.balanceOf(taker), takerBefore - deposit, "taker debited");
        assertEq(escrow.nextBetId(), 2, "next bet");
    }

    function test_FundingExpiredPermitFailsWithoutBet() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp - 1);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.SignatureExpired.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
        assertEq(escrow.nextBetId(), 1, "no bet");
        assertEq(brl1.balanceOf(address(escrow)), 0, "no escrow");
    }

    function test_FundingWrongSpenderPermitFails() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        makerPermit.value = deposit + 1;
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidSignature.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_FundingPermitValueTooLowFails() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit =
            signPermit(MAKER_KEY, maker, deposit - 1, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.PermitValueTooLow.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_FundingInsufficientBalanceRevertsAtomically() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        uint256 takerBalance = brl1.balanceOf(taker);
        vm.prank(taker);
        brl1.transfer(other, takerBalance);
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);
        uint256 makerBefore = brl1.balanceOf(maker);

        vm.expectRevert();
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
        assertEq(brl1.balanceOf(maker), makerBefore, "maker rollback");
        assertEq(brl1.balanceOf(address(escrow)), 0, "escrow rollback");
        assertEq(escrow.nextBetId(), 1, "no bet");
    }

    function test_FundingPermitFrontRunFallsBackToExistingAllowance() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);

        brl1.permit(
            maker, address(escrow), makerPermit.value, makerPermit.deadline, makerPermit.v, makerPermit.r, makerPermit.s
        );
        uint256 betId = escrow.acceptBetWithPermits(
            offer,
            acceptance,
            signOffer(offer, MAKER_KEY),
            signAcceptance(acceptance, TAKER_KEY),
            makerPermit,
            takerPermit
        );
        assertEq(betId, 1, "funded after front-run permit");
    }

    function test_FundingInvalidPermitFailsEvenWithStaleAllowance() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit =
            signPermitForSpender(MAKER_KEY, maker, address(0xBAD), deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);

        vm.prank(maker);
        brl1.approve(address(escrow), deposit);

        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidSignature.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
        assertEq(escrow.nextBetId(), 1, "no bet");
        assertEq(brl1.balanceOf(address(escrow)), 0, "no escrow");
    }
}
