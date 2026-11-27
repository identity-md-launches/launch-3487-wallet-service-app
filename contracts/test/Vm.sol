// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @dev The few Foundry cheatcodes these tests use, so no forge-std submodule is needed.
interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function expectRevert(bytes calldata) external;
    function createSelectFork(string calldata) external returns (uint256);
    function envOr(string calldata, string calldata) external view returns (string memory);
    function load(address, bytes32) external view returns (bytes32);
    function store(address, bytes32, bytes32) external;
    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);

    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }
}

abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory why) internal pure {
        require(a == b, why);
    }

    function assertTrue(bool c, string memory why) internal pure {
        require(c, why);
    }
}
