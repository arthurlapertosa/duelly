// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract TemplateTest is BetEscrowTestBase {
    event TemplateRegistered(
        bytes32 indexed templateHash,
        bytes32 indexed conditionId,
        bytes32 indexed marketIdHash,
        bytes32 questionIdHash,
        uint8 outcomeAProviderIndex,
        uint8 outcomeBProviderIndex,
        uint64 bettingCloseAt,
        uint64 resolutionDeadline,
        uint16 loserFeeBps,
        bool active
    );
    event TemplateDeactivated(bytes32 indexed templateHash);

    function test_TemplateRegistersAndReturnsActiveTemplate() public {
        BetEscrowBRL1.TemplateRegistration memory registration = defaultRegistration();

        vm.expectEmit(true, true, true, true);
        emit TemplateRegistered(
            registration.templateHash,
            registration.conditionId,
            registration.marketIdHash,
            registration.questionIdHash,
            registration.outcomeAProviderIndex,
            registration.outcomeBProviderIndex,
            registration.bettingCloseAt,
            registration.resolutionDeadline,
            registration.loserFeeBps,
            true
        );
        escrow.registerTemplate(registration);

        BetEscrowBRL1.Template memory template = escrow.getTemplate(registration.templateHash);
        assertTrue(template.registered, "registered");
        assertTrue(template.active, "active");
        assertEq(template.conditionId, registration.conditionId, "condition");
        assertEq(template.outcomeAProviderIndex, 0, "outcome a");
        assertEq(template.outcomeBProviderIndex, 1, "outcome b");
    }

    function test_TemplateHashMatchesM1BackendVector() public view {
        BetEscrowBRL1.TemplateRegistration memory registration = BetEscrowBRL1.TemplateRegistration({
            templateHash: 0x12131b9acc0d4dc79798b683fbd9ecb0b12b709e08fc9378d14825e200858973,
            templateVersion: 1,
            providerCode: 1,
            marketIdHash: 0x2ffbd2c7908f2d14f05bce63f84890297b82c40708aac1bd7d1909074387e6b1,
            conditionId: 0x0101010101010101010101010101010101010101010101010101010101010101,
            questionIdHash: 0xd7416a4e6ffba0bba12aa510545230f748dc663fe361224c81b2b0761716cc88,
            sportCode: 1,
            competitionCode: 101,
            competitionLevelCode: 0,
            competitionDetailHash: bytes32(0),
            eventTypeCode: 1,
            binaryMarketTypeCode: 101,
            outcomeALabelHash: 0x90dfb8fa37079daea9a1acb3e423e2351f0ba3fb27cf55bfa41ad2f8c58baea9,
            outcomeAProviderIndex: 0,
            outcomeBLabelHash: 0x7d6119d3ee7f82ee53aac57d4d088f8bbaca5aac3191bb074252c6d760ae4eba,
            outcomeBProviderIndex: 1,
            rulesHash: 0x761e014db2b79369691a73ff03337ccaff85b8a231d2469b3ae16aee54339f71,
            rulesSourceHash: 0xe08bd8b463bd24ce38e9cc9d9f41bc30068b50a9478a4404880fef6928bfd979,
            eventStartAt: 1781200800,
            bettingCloseAt: 1781200800,
            resolutionDeadline: 1782410400,
            loserFeeBps: 250,
            feePolicyVersion: 1,
            active: true
        });

        assertEq(escrow.calculateTemplateHash(registration), registration.templateHash, "M1 vector hash");
    }

    function test_TemplateRejectsHashMismatch() public {
        BetEscrowBRL1.TemplateRegistration memory registration = defaultRegistration();
        registration.templateHash = bytes32(uint256(0xDEAD));

        vm.expectRevert(BetEscrowBRL1.InvalidTemplate.selector);
        escrow.registerTemplate(registration);
    }

    function test_TemplateRejectsDuplicateInactiveAndMismatchedConditionFunding() public {
        BetEscrowBRL1.TemplateRegistration memory registration = registerDefaultTemplate();

        vm.expectRevert(BetEscrowBRL1.TemplateAlreadyRegistered.selector);
        escrow.registerTemplate(registration);

        vm.expectEmit(true, false, false, true);
        emit TemplateDeactivated(registration.templateHash);
        escrow.deactivateTemplate(registration.templateHash);

        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.TemplateInactive.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }

    function test_TemplateRejectsUnregisteredClosedAndInvalidOutcomeIndexes() public {
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(1, 0);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, 2, 1);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);
        bytes memory makerSignature = signOffer(offer, MAKER_KEY);
        bytes memory takerSignature = signAcceptance(acceptance, TAKER_KEY);

        vm.expectRevert(BetEscrowBRL1.TemplateNotRegistered.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);

        BetEscrowBRL1.TemplateRegistration memory registration = defaultRegistration();
        registration.outcomeBProviderIndex = 0;
        registration.templateHash = escrow.calculateTemplateHash(registration);
        vm.expectRevert(BetEscrowBRL1.InvalidOutcomeIndexes.selector);
        escrow.registerTemplate(registration);

        registration = registerDefaultTemplate();
        offer = defaultOffer(3, 0);
        offer.deadline = registration.bettingCloseAt + 2 hours;
        acceptance = defaultAcceptance(offer, 4, 1);
        acceptance.deadline = registration.bettingCloseAt + 2 hours;
        deposit = offer.stake + offer.loserFee;
        makerPermit = signPermit(MAKER_KEY, maker, deposit, registration.bettingCloseAt + 2 hours);
        takerPermit = signPermit(TAKER_KEY, taker, deposit, registration.bettingCloseAt + 2 hours);
        makerSignature = signOffer(offer, MAKER_KEY);
        takerSignature = signAcceptance(acceptance, TAKER_KEY);
        vm.warp(registration.bettingCloseAt + 1);
        vm.expectRevert(BetEscrowBRL1.TemplateClosed.selector);
        escrow.acceptBetWithPermits(offer, acceptance, makerSignature, takerSignature, makerPermit, takerPermit);
    }
}
