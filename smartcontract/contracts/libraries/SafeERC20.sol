// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20PermitToken} from "../interfaces/IERC20PermitToken.sol";

library SafeERC20 {
    error SafeERC20CallFailed();
    error SafeERC20OperationFailed();

    function safeTransfer(IERC20PermitToken token, address to, uint256 value) internal {
        _callOptionalReturn(address(token), abi.encodeCall(token.transfer, (to, value)));
    }

    function safeTransferFrom(IERC20PermitToken token, address from, address to, uint256 value) internal {
        _callOptionalReturn(address(token), abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    function _callOptionalReturn(address token, bytes memory data) private {
        (bool success, bytes memory returnData) = token.call(data);
        if (!success) revert SafeERC20CallFailed();
        if (returnData.length != 0 && !abi.decode(returnData, (bool))) revert SafeERC20OperationFailed();
    }
}
