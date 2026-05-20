// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract FeeTest is BetEscrowTestBase {
    function test_FeeUsesPercentageWhenAboveMinimum() public {
        escrow.setMinLoserFee(1 * TOKEN);
        assertEq(escrow.calculateLoserFee(100 * TOKEN, 250), 25 * TOKEN / 10, "2.5 percent");
    }

    function test_FeeUsesGasAnchoredMinimumWhenAbovePercentage() public {
        escrow.setMinLoserFee(3 * TOKEN);
        assertEq(escrow.calculateLoserFee(10 * TOKEN, 250), 3 * TOKEN, "minimum fee");
    }

    function test_FeeRejectsIncorrectSignedLoserFee() public {
        registerDefaultTemplate();
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        offer.loserFee += 1;
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.InvalidLoserFee.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_FeeMaxLoserFeeBpsIsEnforcedAtRegistration() public {
        escrow.setMaxLoserFeeBps(100);
        BetEscrowBRL1.TemplateRegistration memory registration = defaultRegistration();
        registration.loserFeeBps = 250;
        registration.templateHash = escrow.calculateTemplateHash(registration);

        vm.expectRevert(BetEscrowBRL1.InvalidLoserFeeBps.selector);
        escrow.registerTemplate(registration);
    }
}
