// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockBRL1} from "./MockBRL1.sol";

interface IReentryTarget {
    function expireUnresolvedBet(uint256 betId) external;
}

contract MockReentrantBRL1 is MockBRL1 {
    IReentryTarget public reentryTarget;
    bool public attackEnabled;
    bool public reentryBlocked;

    function setReentry(address target, bool enabled) external {
        reentryTarget = IReentryTarget(target);
        attackEnabled = enabled;
        reentryBlocked = false;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (attackEnabled && address(reentryTarget) != address(0)) {
            try reentryTarget.expireUnresolvedBet(1) {
                reentryBlocked = false;
            } catch {
                reentryBlocked = true;
            }
        }
        return super.transferFrom(from, to, value);
    }
}
