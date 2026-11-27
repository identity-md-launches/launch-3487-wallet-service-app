// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ImdEdgePayments} from "../src/ImdEdgePayments.sol";

interface VmScript {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata) external view returns (address);
}

/// OWNER=0x... forge script script/Deploy.s.sol --rpc-url https://eth.drpc.org --account <keystore> --broadcast
contract Deploy {
    VmScript constant vm = VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant IMD = 0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7;
    address constant INTAKE = 0xa43e6F75ee006411F79Ac1C84120606C2330DE82;
    address constant CREATOR = 0x83027AD9d0D5374335086c539dADD1db983441B0;

    function run() external returns (ImdEdgePayments pay) {
        address owner = vm.envAddress("OWNER");
        vm.startBroadcast();
        pay = new ImdEdgePayments(IMD, CREATOR, INTAKE, owner);
        vm.stopBroadcast();
    }
}
