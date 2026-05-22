// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract ResolutionTest is BetEscrowTestBase {
    function test_ResolutionDenominatorZeroRevertsUnresolved() public {
        uint256 betId = fundDefaultBet();

        vm.expectRevert(BetEscrowBRL1.ConditionUnresolved.selector);
        escrow.resolveFromPolymarket(betId);
    }

    function test_ResolutionStrictOutcomeZeroWins() public {
        uint256 betId = fundDefaultBet();
        setPayout(1, 0, 1);
        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Resolved), "resolved");
        assertEq(brl1.balanceOf(treasury), escrow.getBet(betId).loserFee, "treasury paid");
    }

    function test_ResolutionStrictOutcomeOneWins() public {
        uint256 betId = fundDefaultBet();
        setPayout(0, 1, 1);
        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Resolved), "resolved");
        assertEq(brl1.balanceOf(treasury), escrow.getBet(betId).loserFee, "treasury paid");
    }

    function test_ResolutionEqualPayoutVoids() public {
        uint256 betId = fundDefaultBet();
        setPayout(1, 1, 1);
        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Voided), "equal void");
    }

    function test_ResolutionPartialBothNonZeroVoids() public {
        uint256 betId = fundDefaultBet();
        setPayout(2, 1, 3);
        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Voided), "partial void");
    }

    function test_ResolutionInvalidSlotCountVoids() public {
        uint256 betId = fundDefaultBet();
        uint256[] memory numerators = new uint256[](3);
        numerators[0] = 1;
        numerators[1] = 0;
        numerators[2] = 0;
        ctf.setPayout(CONDITION_ID, 1, numerators);
        ctf.setOutcomeSlotCount(CONDITION_ID, 3);

        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Voided), "extra slot void");
    }

    function test_ResolutionVoidsWhenSlotCountCallUnavailable() public {
        uint256 betId = fundDefaultBet();
        uint256[] memory numerators = new uint256[](2);
        numerators[0] = 1;
        numerators[1] = 0;
        ctf.setPayoutWithoutSlotCount(CONDITION_ID, 1, numerators);

        escrow.resolveFromPolymarket(betId);
        assertEq(uint256(escrow.getBet(betId).status), uint256(BetEscrowBRL1.BetStatus.Voided), "voided");
    }
}
