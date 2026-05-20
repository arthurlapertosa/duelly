// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {BetEscrowTestBase} from "./BetEscrowTestBase.sol";

contract ConfigTest is BetEscrowTestBase {
    event StakeLimitsUpdated(uint256 minStake, uint256 maxStake);
    event MinLoserFeeUpdated(uint256 minLoserFee);
    event MaxLoserFeeBpsUpdated(uint16 maxLoserFeeBps);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event RoleUpdated(bytes32 indexed role, address indexed account, bool enabled);

    function test_ConfigInitialDefaults() public {
        assertEq(address(escrow.brl1()), address(brl1), "brl1");
        assertEq(address(escrow.polymarketCtf()), address(ctf), "ctf");
        assertEq(escrow.treasury(), treasury, "treasury");
        assertEq(escrow.minStake(), 1, "min stake");
        assertEq(escrow.maxStake(), type(uint128).max, "max stake");
        assertEq(escrow.maxLoserFeeBps(), 1000, "max fee bps");
        assertEq(escrow.minLoserFee(), 0, "min loser fee");
        assertFalse(escrow.paused(), "not paused");
        assertEq(escrow.nextBetId(), 1, "next bet id");
    }

    function test_ConfigConstructorRejectsZeroAddresses() public {
        vm.expectRevert(BetEscrowBRL1.ZeroAddress.selector);
        new BetEscrowBRL1(address(0), address(ctf), treasury);

        vm.expectRevert(BetEscrowBRL1.ZeroAddress.selector);
        new BetEscrowBRL1(address(brl1), address(0), treasury);

        vm.expectRevert(BetEscrowBRL1.ZeroAddress.selector);
        new BetEscrowBRL1(address(brl1), address(ctf), address(0));
    }

    function test_ConfigSettersAreRoleControlledAndEmit() public {
        address newTreasury = address(0xBEEF);
        vm.expectEmit(true, true, false, true);
        emit TreasuryUpdated(treasury, newTreasury);
        escrow.setTreasury(newTreasury);
        assertEq(escrow.treasury(), newTreasury, "treasury updated");

        vm.expectEmit(false, false, false, true);
        emit StakeLimitsUpdated(10, 1000);
        escrow.setStakeLimits(10, 1000);
        assertEq(escrow.minStake(), 10, "min updated");
        assertEq(escrow.maxStake(), 1000, "max updated");

        vm.expectEmit(false, false, false, true);
        emit MinLoserFeeUpdated(3 * TOKEN);
        escrow.setMinLoserFee(3 * TOKEN);
        assertEq(escrow.minLoserFee(), 3 * TOKEN, "min fee updated");

        vm.expectEmit(false, false, false, true);
        emit MaxLoserFeeBpsUpdated(900);
        escrow.setMaxLoserFeeBps(900);
        assertEq(escrow.maxLoserFeeBps(), 900, "max bps updated");
    }

    function test_ConfigOnlyOwnerCanSetRoles() public {
        bytes32 role = escrow.TEMPLATE_PUBLISHER_ROLE();
        vm.prank(other);
        vm.expectRevert(BetEscrowBRL1.Unauthorized.selector);
        escrow.setRole(role, other, true);

        vm.expectEmit(true, true, false, true);
        emit RoleUpdated(role, other, true);
        escrow.setRole(role, other, true);
        assertTrue(escrow.hasRole(role, other), "role granted");
    }

    function test_ConfigOwnershipTransferRemovesOldOwnerOperationalAccess() public {
        address newOwner = address(0xB055);
        escrow.setRole(escrow.PAUSER_ROLE(), address(this), true);
        assertTrue(escrow.hasRole(escrow.PAUSER_ROLE(), address(this)), "old owner has role");

        escrow.transferOwnership(newOwner);

        assertEq(escrow.owner(), newOwner, "owner transferred");
        assertFalse(escrow.hasRole(escrow.PAUSER_ROLE(), address(this)), "old owner role cleared");

        vm.expectRevert(BetEscrowBRL1.Unauthorized.selector);
        escrow.pause();

        vm.prank(newOwner);
        escrow.pause();
        assertTrue(escrow.paused(), "new owner has implicit roles");
    }

    function test_ConfigRoleProtectedSettersRejectUnauthorized() public {
        vm.prank(other);
        vm.expectRevert(BetEscrowBRL1.Unauthorized.selector);
        escrow.setMinLoserFee(1);

        vm.prank(other);
        vm.expectRevert(BetEscrowBRL1.Unauthorized.selector);
        escrow.pause();
    }

    function test_ConfigInvalidLimitsFail() public {
        vm.expectRevert(BetEscrowBRL1.InvalidStakeLimits.selector);
        escrow.setStakeLimits(0, 100);

        vm.expectRevert(BetEscrowBRL1.InvalidStakeLimits.selector);
        escrow.setStakeLimits(101, 100);

        vm.expectRevert(BetEscrowBRL1.InvalidLoserFeeBps.selector);
        escrow.setMaxLoserFeeBps(10_001);
    }
}
