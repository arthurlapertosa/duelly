// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";
import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";

contract MocksTest is BetEscrowTestBase {
    function test_MocksSmoke() public {
        assertEq(brl1.balanceOf(maker), 10_000 * TOKEN, "maker mint");

        vm.prank(maker);
        brl1.transfer(taker, 1 * TOKEN);
        assertEq(brl1.balanceOf(taker), 10_001 * TOKEN, "transfer");

        uint256 permitValue = 25 * TOKEN;
        BetEscrowBRL1.PermitData memory permitData =
            signPermit(MAKER_KEY, maker, permitValue, block.timestamp + 1 hours);
        brl1.permit(
            maker, address(escrow), permitData.value, permitData.deadline, permitData.v, permitData.r, permitData.s
        );
        assertEq(brl1.allowance(maker, address(escrow)), permitValue, "permit allowance");
        assertEq(brl1.nonces(maker), 1, "permit nonce");

        setPayout(1, 0, 1);
        assertEq(ctf.payoutDenominator(CONDITION_ID), 1, "ctf denominator");
        assertEq(ctf.payoutNumerators(CONDITION_ID, 0), 1, "ctf outcome 0");
        assertEq(ctf.payoutNumerators(CONDITION_ID, 1), 0, "ctf outcome 1");
        assertEq(ctf.getOutcomeSlotCount(CONDITION_ID), 2, "ctf slot count");
    }
}
