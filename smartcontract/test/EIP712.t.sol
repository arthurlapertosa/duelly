// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract EIP712Test is BetEscrowTestBase {
    function test_EIP712ValidSignaturesFundBet() public {
        uint256 betId = fundDefaultBet();
        BetEscrowBRL1.Bet memory bet = escrow.getBet(betId);
        assertEq(bet.playerA, maker, "maker");
        assertEq(bet.playerB, taker, "taker");
        assertEq(uint256(bet.status), uint256(BetEscrowBRL1.BetStatus.Funded), "funded");
    }

    function test_EIP712WrongMakerSignerFails() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory wrongMakerSignature = signOffer(offer, OTHER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidSignature.selector);
        escrow.acceptBetWithPermits(offer, acceptance, wrongMakerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_EIP712ExpiredOfferFails() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        offer.deadline = uint64(block.timestamp - 1);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.SignatureExpired.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_EIP712ReusedOfferHashAndNonceFail() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);

        brl1.mint(maker, deposit);
        brl1.mint(taker, deposit);
        makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);

        vm.expectRevert(BetEscrowBRL1.NonceAlreadyUsed.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_EIP712CancelledNonceFails() public {
        registerDefaultTemplate();
        vm.prank(maker);
        escrow.cancelNonce(9);

        BetEscrowBRL1.BetOffer memory offer = defaultOffer(9, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.NonceAlreadyUsed.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_EIP712TamperedStakeInvalidatesSignature() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        offer.stake += 1;
        acceptance.offerHash = escrow.hashOffer(offer);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidSignature.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_EIP712UnauthorizedTakerAndSameOutcomeFail() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        offer.taker = other;
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.UnauthorizedTaker.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);

        offer = defaultOffer(3, 0);
        acceptance = defaultAcceptance(offer, 4, 0);
        deposit = offer.stake + offer.loserFee;
        makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        makerSignature = signOffer(offer, MAKER_KEY);
        takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.SameOutcome.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }
}
