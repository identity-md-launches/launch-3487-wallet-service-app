// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal ERC-20 surface used by the payment contract.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice The IMD swarm's Intake (https://imd.fun/skill/onchain.md). It pulls `amount` of
/// `asset` from the caller and emits the body, which the control plane turns into a job.
interface IIntake {
    struct Callback {
        address target;
        bytes4 selector;
    }

    function request(bytes32 action, bytes calldata body, Callback calldata callback, address asset, uint256 amount)
        external
        returns (bytes32 requestId);
}

/// @title IMD EDGE prediction payments
/// @notice One prediction costs exactly 1 IMD: 0.5 IMD buys a swarm analysis through the Intake
/// (action id "job.open" at version "job-1") and 0.5 IMD goes directly to the creator wallet, in the same transaction.
/// The contract never holds a balance between calls.
contract ImdEdgePayments {
    uint256 public constant PRICE = 1e18;
    uint256 public constant SWARM_SHARE = 5e17;
    uint256 public constant CREATOR_SHARE = 5e17;
    uint256 public constant MAX_BODY = 16 * 1024;
    bytes32 public constant ACTION = "job.open@job-1";

    IERC20 public immutable imd;
    address public immutable creator;

    address public owner;
    address public pendingOwner;
    address public intake;
    bool public paused;

    uint256 private _locked = 1;

    event Predicted(
        address indexed payer, bytes32 indexed matchId, bytes32 indexed requestId, uint8 pick, uint256 swarmPaid, uint256 creatorPaid
    );
    event IntakeChanged(address indexed previousIntake, address indexed newIntake);
    event PausedSet(bool paused);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error NotAContract(address account);
    error IsPaused();
    error BadBody();
    error BadPick();
    error TokenCallFailed();
    error Reentrancy();
    error BalanceLeft();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address imd_, address creator_, address intake_, address owner_) {
        if (imd_ == address(0) || creator_ == address(0) || intake_ == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        if (imd_.code.length == 0) revert NotAContract(imd_);
        if (intake_.code.length == 0) revert NotAContract(intake_);
        imd = IERC20(imd_);
        creator = creator_;
        intake = intake_;
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
        emit IntakeChanged(address(0), intake_);
    }

    /// @notice Pay 1 IMD for a prediction. The caller must have approved this contract for 1 IMD.
    /// @param matchId  keccak256 of the fixture id, for indexing.
    /// @param pick     1 home, 2 draw, 3 away.
    /// @param body     The job body as compact UTF-8 JSON, validated by the Intake's rules.
    function predict(bytes32 matchId, uint8 pick, bytes calldata body) external nonReentrant returns (bytes32 requestId) {
        if (paused) revert IsPaused();
        if (body.length == 0 || body.length > MAX_BODY) revert BadBody();
        if (pick == 0 || pick > 3) revert BadPick();

        uint256 before = imd.balanceOf(address(this));
        _call(address(imd), abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), PRICE)));
        _call(address(imd), abi.encodeCall(IERC20.transfer, (creator, CREATOR_SHARE)));

        address intake_ = intake;
        _call(address(imd), abi.encodeCall(IERC20.approve, (intake_, SWARM_SHARE)));
        requestId = IIntake(intake_).request(
            ACTION, body, IIntake.Callback(address(0), bytes4(0)), address(imd), SWARM_SHARE
        );
        // The Intake pulls exactly the price; anything left over would be stuck, so refuse it.
        if (imd.allowance(address(this), intake_) != 0) {
            _call(address(imd), abi.encodeCall(IERC20.approve, (intake_, 0)));
        }
        if (imd.balanceOf(address(this)) != before) revert BalanceLeft();

        emit Predicted(msg.sender, matchId, requestId, pick, SWARM_SHARE, CREATOR_SHARE);
    }

    /// @notice A new Intake version lands at a new address with the same functions.
    function setIntake(address newIntake) external onlyOwner {
        if (newIntake == address(0)) revert ZeroAddress();
        if (newIntake.code.length == 0) revert NotAContract(newIntake);
        emit IntakeChanged(intake, newIntake);
        intake = newIntake;
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    /// @dev Calls an ERC-20 function and accepts both bool-returning and empty-returning tokens.
    function _call(address token, bytes memory data) private {
        (bool ok, bytes memory ret) = token.call(data);
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TokenCallFailed();
    }
}
