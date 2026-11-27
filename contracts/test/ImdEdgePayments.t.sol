// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ImdEdgePayments, IIntake} from "../src/ImdEdgePayments.sol";
import {TestBase} from "./Vm.sol";

contract MockIMD {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 v) external {
        balanceOf[to] += v;
    }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    function transfer(address to, uint256 v) external returns (bool) {
        require(balanceOf[msg.sender] >= v, "bal");
        balanceOf[msg.sender] -= v;
        balanceOf[to] += v;
        return true;
    }

    function transferFrom(address f, address to, uint256 v) external returns (bool) {
        require(allowance[f][msg.sender] >= v, "allow");
        require(balanceOf[f] >= v, "bal");
        allowance[f][msg.sender] -= v;
        balanceOf[f] -= v;
        balanceOf[to] += v;
        return true;
    }
}

contract MockIntake {
    address public treasury = address(0x7EA5);
    bytes32 public lastAction;
    bytes public lastBody;
    uint256 public calls;

    function request(bytes32 action, bytes calldata body, IIntake.Callback calldata, address asset, uint256 amount)
        external
        returns (bytes32)
    {
        require(amount >= 5e17, "PriceNotMet");
        MockIMD(asset).transferFrom(msg.sender, treasury, amount);
        lastAction = action;
        lastBody = body;
        calls++;
        return keccak256(abi.encode(calls, body));
    }
}

contract ImdEdgePaymentsTest is TestBase {
    address constant CREATOR = 0x83027AD9d0D5374335086c539dADD1db983441B0;
    address constant USER = address(0xBEEF);
    address constant OWNER = address(0x0A11CE);
    MockIMD imd;
    MockIntake intake;
    ImdEdgePayments pay;
    bytes body = bytes('{"objective":"Analyse a match","skill":"research-report"}');

    function setUp() public {
        imd = new MockIMD();
        intake = new MockIntake();
        pay = new ImdEdgePayments(address(imd), CREATOR, address(intake), OWNER);
        imd.mint(USER, 3e18);
    }

    function testSplitsExactlyOneImd() public {
        vm.startPrank(USER);
        imd.approve(address(pay), 1e18);
        pay.predict(keccak256("match-1"), 1, body);
        vm.stopPrank();
        assertEq(imd.balanceOf(USER), 2e18, "user paid 1 IMD");
        assertEq(imd.balanceOf(CREATOR), 5e17, "creator got 0.5");
        assertEq(imd.balanceOf(intake.treasury()), 5e17, "swarm got 0.5");
        assertEq(imd.balanceOf(address(pay)), 0, "contract holds nothing");
        assertEq(imd.allowance(address(pay), address(intake)), 0, "no allowance left");
        assertTrue(intake.lastAction() == bytes32("job.open@job-1"), "action id");
        assertTrue(keccak256(intake.lastBody()) == keccak256(body), "body forwarded");
    }

    function testRevertsWithoutAllowance() public {
        vm.prank(USER);
        vm.expectRevert(ImdEdgePayments.TokenCallFailed.selector);
        pay.predict(keccak256("m"), 1, body);
    }

    function testRevertsOnEmptyBody() public {
        vm.prank(USER);
        vm.expectRevert(ImdEdgePayments.BadBody.selector);
        pay.predict(keccak256("m"), 1, "");
    }

    function testRevertsOnBadPick() public {
        vm.prank(USER);
        vm.expectRevert(ImdEdgePayments.BadPick.selector);
        pay.predict(keccak256("m"), 4, body);
    }

    function testPause() public {
        vm.prank(OWNER);
        pay.setPaused(true);
        vm.startPrank(USER);
        imd.approve(address(pay), 1e18);
        vm.expectRevert(ImdEdgePayments.IsPaused.selector);
        pay.predict(keccak256("m"), 1, body);
        vm.stopPrank();
    }

    function testOnlyOwnerAdmin() public {
        vm.prank(USER);
        vm.expectRevert(ImdEdgePayments.NotOwner.selector);
        pay.setIntake(address(intake));
        vm.prank(USER);
        vm.expectRevert(ImdEdgePayments.NotOwner.selector);
        pay.setPaused(true);
    }

    function testSetIntakeRejectsEoa() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(ImdEdgePayments.NotAContract.selector, address(0x1234)));
        pay.setIntake(address(0x1234));
    }

    function testTwoStepOwnership() public {
        vm.prank(OWNER);
        pay.transferOwnership(USER);
        assertTrue(pay.owner() == OWNER, "unchanged until accepted");
        vm.prank(address(0xBAD));
        vm.expectRevert(ImdEdgePayments.NotPendingOwner.selector);
        pay.acceptOwnership();
        vm.prank(USER);
        pay.acceptOwnership();
        assertTrue(pay.owner() == USER, "accepted");
    }

    function testConstructorRejectsZero() public {
        vm.expectRevert(ImdEdgePayments.ZeroAddress.selector);
        new ImdEdgePayments(address(imd), address(0), address(intake), OWNER);
    }
}
