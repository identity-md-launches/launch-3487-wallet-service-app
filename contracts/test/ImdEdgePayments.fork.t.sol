// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ImdEdgePayments, IERC20} from "../src/ImdEdgePayments.sol";
import {TestBase, Vm} from "./Vm.sol";

/// @notice Runs against Ethereum mainnet state: the real IMD token and the real Intake v2.
/// FORK_RPC_URL=https://ethereum-rpc.publicnode.com forge test --match-contract Fork
contract ImdEdgePaymentsForkTest is TestBase {
    address constant IMD = 0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7;
    address constant INTAKE = 0xa43e6F75ee006411F79Ac1C84120606C2330DE82;
    address constant CREATOR = 0x83027AD9d0D5374335086c539dADD1db983441B0;
    address constant USER = address(0xBEEF);

    function _fund(address who, uint256 amount) internal {
        // Find the balance mapping slot of the OFT token by probing, as forge-std's deal does.
        for (uint256 slot = 0; slot < 64; slot++) {
            bytes32 key = keccak256(abi.encode(who, slot));
            bytes32 prev = vm.load(IMD, key);
            vm.store(IMD, key, bytes32(amount));
            if (IERC20(IMD).balanceOf(who) == amount) return;
            vm.store(IMD, key, prev);
        }
        revert("balance slot not found");
    }

    function testForkPaysIntakeAndCreator() public {
        vm.createSelectFork(vm.envOr("FORK_RPC_URL", string("https://ethereum-rpc.publicnode.com")));
        ImdEdgePayments pay = new ImdEdgePayments(IMD, CREATOR, INTAKE, address(this));
        _fund(USER, 2e18);
        uint256 creatorBefore = IERC20(IMD).balanceOf(CREATOR);
        uint256 supplyHolderBefore = IERC20(IMD).balanceOf(USER);

        vm.recordLogs();
        vm.startPrank(USER);
        IERC20(IMD).approve(address(pay), 1e18);
        bytes32 requestId = pay.predict(
            keccak256("fixture"),
            2,
            bytes('{"objective":"Fork test analysis","skill":"research-report"}')
        );
        vm.stopPrank();

        assertTrue(requestId != bytes32(0), "intake returned a request id");
        assertEq(IERC20(IMD).balanceOf(USER), supplyHolderBefore - 1e18, "user paid exactly 1 IMD");
        assertEq(IERC20(IMD).balanceOf(CREATOR), creatorBefore + 5e17, "creator got 0.5 IMD");
        assertEq(IERC20(IMD).balanceOf(address(pay)), 0, "contract holds nothing");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool intakeEmitted;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].emitter == INTAKE) intakeEmitted = true;
        }
        assertTrue(intakeEmitted, "intake emitted its Requested event");
    }
}
