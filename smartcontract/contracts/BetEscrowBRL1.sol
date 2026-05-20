// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20PermitToken} from "./interfaces/IERC20PermitToken.sol";
import {IPolymarketCTF} from "./interfaces/IPolymarketCTF.sol";
import {ECDSA} from "./libraries/ECDSA.sol";
import {SafeERC20} from "./libraries/SafeERC20.sol";

contract BetEscrowBRL1 {
    using SafeERC20 for IERC20PermitToken;

    enum BetStatus {
        None,
        Funded,
        Resolved,
        Voided,
        Expired
    }

    struct Template {
        bool registered;
        bool active;
        bytes32 templateHash;
        bytes32 marketIdHash;
        bytes32 conditionId;
        bytes32 questionIdHash;
        bytes32 rulesHash;
        uint64 bettingCloseAt;
        uint64 resolutionDeadline;
        uint16 loserFeeBps;
        uint8 outcomeAProviderIndex;
        uint8 outcomeBProviderIndex;
    }

    struct TemplateRegistration {
        bytes32 templateHash;
        uint16 templateVersion;
        uint8 providerCode;
        bytes32 marketIdHash;
        bytes32 conditionId;
        bytes32 questionIdHash;
        uint16 sportCode;
        uint16 competitionCode;
        uint16 competitionLevelCode;
        bytes32 competitionDetailHash;
        uint16 eventTypeCode;
        uint16 binaryMarketTypeCode;
        bytes32 outcomeALabelHash;
        uint8 outcomeAProviderIndex;
        bytes32 outcomeBLabelHash;
        uint8 outcomeBProviderIndex;
        bytes32 rulesHash;
        bytes32 rulesSourceHash;
        uint64 eventStartAt;
        uint64 bettingCloseAt;
        uint64 resolutionDeadline;
        uint16 loserFeeBps;
        uint16 feePolicyVersion;
        bool active;
    }

    struct Bet {
        address playerA;
        address playerB;
        bytes32 templateHash;
        bytes32 conditionId;
        uint8 playerAOutcomeIndex;
        uint8 playerBOutcomeIndex;
        uint256 stake;
        uint256 loserFee;
        uint64 fundedAt;
        uint64 resolutionDeadline;
        BetStatus status;
    }

    struct BetOffer {
        address maker;
        address taker;
        bytes32 templateHash;
        bytes32 conditionId;
        uint8 makerOutcomeIndex;
        uint256 stake;
        uint256 loserFee;
        uint256 nonce;
        uint64 deadline;
    }

    struct BetAcceptance {
        address taker;
        bytes32 offerHash;
        uint8 takerOutcomeIndex;
        uint256 nonce;
        uint64 deadline;
    }

    struct PermitData {
        uint256 value;
        uint256 nonce;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    bytes32 public constant TEMPLATE_PUBLISHER_ROLE = keccak256("TEMPLATE_PUBLISHER_ROLE");
    bytes32 public constant FEE_OPERATOR_ROLE = keccak256("FEE_OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");

    bytes32 public constant SPORTS_TEMPLATE_V1_TYPEHASH = keccak256(
        "SportsTemplateV1(uint16 templateVersion,uint8 providerCode,bytes32 providerMarketIdHash,bytes32 conditionId,bytes32 questionIdHash,uint16 sportCode,uint16 competitionCode,uint16 competitionLevelCode,bytes32 competitionDetailHash,uint16 eventTypeCode,uint16 binaryMarketTypeCode,bytes32 outcomeALabelHash,uint8 outcomeAProviderIndex,bytes32 outcomeBLabelHash,uint8 outcomeBProviderIndex,bytes32 rulesHash,bytes32 rulesSourceHash,uint64 eventStartAt,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint16 feePolicyVersion)"
    );
    bytes32 public constant BET_OFFER_TYPEHASH = keccak256(
        "BetOffer(address maker,address taker,bytes32 templateHash,bytes32 conditionId,uint8 makerOutcomeIndex,uint256 stake,uint256 loserFee,uint256 nonce,uint64 deadline)"
    );
    bytes32 public constant BET_ACCEPTANCE_TYPEHASH = keccak256(
        "BetAcceptance(address taker,bytes32 offerHash,uint8 takerOutcomeIndex,uint256 nonce,uint64 deadline)"
    );

    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 private constant _NAME_HASH = keccak256("DuellyBetEscrowBRL1");
    bytes32 private constant _VERSION_HASH = keccak256("1");
    uint16 private constant _BPS_DENOMINATOR = 10_000;

    IERC20PermitToken public immutable brl1;
    IPolymarketCTF public immutable polymarketCtf;

    address public owner;
    address public treasury;
    bool public paused;
    uint256 public minStake = 1;
    uint256 public maxStake = type(uint128).max;
    uint16 public maxLoserFeeBps = 1000;
    uint256 public minLoserFee;
    uint256 public nextBetId = 1;

    mapping(bytes32 => Template) private _templates;
    mapping(uint256 => Bet) private _bets;
    mapping(address => mapping(uint256 => bool)) public nonceUsed;
    mapping(bytes32 => bool) public usedOfferHash;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    uint256 private _reentrancyStatus = 1;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RoleUpdated(bytes32 indexed role, address indexed account, bool enabled);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event StakeLimitsUpdated(uint256 minStake, uint256 maxStake);
    event MaxLoserFeeBpsUpdated(uint16 maxLoserFeeBps);
    event MinLoserFeeUpdated(uint256 minLoserFee);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event NonceCancelled(address indexed account, uint256 indexed nonce);
    event TemplateRegistered(
        bytes32 indexed templateHash,
        bytes32 indexed conditionId,
        bytes32 indexed marketIdHash,
        bytes32 questionIdHash,
        uint8 outcomeAProviderIndex,
        uint8 outcomeBProviderIndex,
        uint64 bettingCloseAt,
        uint64 resolutionDeadline,
        uint16 loserFeeBps,
        bool active
    );
    event TemplateDeactivated(bytes32 indexed templateHash);
    event BetFunded(
        uint256 indexed betId,
        bytes32 indexed templateHash,
        bytes32 indexed conditionId,
        address playerA,
        address playerB,
        uint8 playerAOutcomeIndex,
        uint8 playerBOutcomeIndex,
        uint256 stake,
        uint256 loserFee
    );
    event BetSettled(
        uint256 indexed betId,
        address indexed winner,
        address indexed loser,
        uint8 winningOutcomeIndex,
        uint256 winnerPayout,
        uint256 treasuryPayout
    );
    event BetVoided(uint256 indexed betId, BetStatus indexed status, uint256 playerARefund, uint256 playerBRefund);

    error ZeroAddress();
    error Unauthorized();
    error PausedError();
    error ReentrantCall();
    error InvalidStakeLimits();
    error InvalidStake();
    error InvalidLoserFeeBps();
    error InvalidLoserFee();
    error InvalidTemplate();
    error TemplateAlreadyRegistered();
    error TemplateNotRegistered();
    error TemplateInactive();
    error TemplateClosed();
    error InvalidOutcomeIndexes();
    error SignatureExpired();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error OfferAlreadyUsed();
    error OfferHashMismatch();
    error SamePlayer();
    error UnauthorizedTaker();
    error SameOutcome();
    error PermitValueTooLow();
    error PermitOrAllowanceFailed();
    error TransferAmountMismatch();
    error BetNotFunded();
    error BetTerminal();
    error ConditionUnresolved();
    error ConditionResolved();
    error ResolutionDeadlineNotReached();
    error InvalidTreasury();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRole(bytes32 role) {
        if (!_hasRole(role, msg.sender)) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PausedError();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus != 1) revert ReentrantCall();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    constructor(address brl1_, address polymarketCtf_, address treasury_) {
        if (brl1_ == address(0) || polymarketCtf_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }

        brl1 = IERC20PermitToken(brl1_);
        polymarketCtf = IPolymarketCTF(polymarketCtf_);
        owner = msg.sender;
        treasury = treasury_;

        emit OwnershipTransferred(address(0), msg.sender);
        emit TreasuryUpdated(address(0), treasury_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        _revokeOperationalRoles(previousOwner);
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setRole(bytes32 role, address account, bool enabled) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _roles[role][account] = enabled;
        emit RoleUpdated(role, account, enabled);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _hasRole(role, account);
    }

    function setTreasury(address newTreasury) external onlyRole(TREASURY_MANAGER_ROLE) {
        if (newTreasury == address(0)) revert InvalidTreasury();
        address previousTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function setStakeLimits(uint256 newMinStake, uint256 newMaxStake) external onlyRole(FEE_OPERATOR_ROLE) {
        if (newMinStake == 0 || newMaxStake < newMinStake) revert InvalidStakeLimits();
        minStake = newMinStake;
        maxStake = newMaxStake;
        emit StakeLimitsUpdated(newMinStake, newMaxStake);
    }

    function setMaxLoserFeeBps(uint16 newMaxLoserFeeBps) external onlyRole(FEE_OPERATOR_ROLE) {
        if (newMaxLoserFeeBps > _BPS_DENOMINATOR) revert InvalidLoserFeeBps();
        maxLoserFeeBps = newMaxLoserFeeBps;
        emit MaxLoserFeeBpsUpdated(newMaxLoserFeeBps);
    }

    function setMinLoserFee(uint256 newMinLoserFee) external onlyRole(FEE_OPERATOR_ROLE) {
        minLoserFee = newMinLoserFee;
        emit MinLoserFeeUpdated(newMinLoserFee);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function registerTemplate(TemplateRegistration calldata registration) external onlyRole(TEMPLATE_PUBLISHER_ROLE) {
        bytes32 expectedHash = calculateTemplateHash(registration);
        if (
            registration.templateHash == bytes32(0) || registration.conditionId == bytes32(0)
                || registration.templateHash != expectedHash
                || registration.resolutionDeadline <= registration.bettingCloseAt
        ) {
            revert InvalidTemplate();
        }
        if (registration.loserFeeBps > maxLoserFeeBps) revert InvalidLoserFeeBps();
        if (
            registration.outcomeAProviderIndex == registration.outcomeBProviderIndex
                || registration.outcomeAProviderIndex > 1 || registration.outcomeBProviderIndex > 1
        ) {
            revert InvalidOutcomeIndexes();
        }
        if (_templates[registration.templateHash].registered) revert TemplateAlreadyRegistered();

        _templates[registration.templateHash] = Template({
            registered: true,
            active: registration.active,
            templateHash: registration.templateHash,
            marketIdHash: registration.marketIdHash,
            conditionId: registration.conditionId,
            questionIdHash: registration.questionIdHash,
            rulesHash: registration.rulesHash,
            bettingCloseAt: registration.bettingCloseAt,
            resolutionDeadline: registration.resolutionDeadline,
            loserFeeBps: registration.loserFeeBps,
            outcomeAProviderIndex: registration.outcomeAProviderIndex,
            outcomeBProviderIndex: registration.outcomeBProviderIndex
        });

        emit TemplateRegistered(
            registration.templateHash,
            registration.conditionId,
            registration.marketIdHash,
            registration.questionIdHash,
            registration.outcomeAProviderIndex,
            registration.outcomeBProviderIndex,
            registration.bettingCloseAt,
            registration.resolutionDeadline,
            registration.loserFeeBps,
            registration.active
        );
    }

    function deactivateTemplate(bytes32 templateHash) external onlyRole(TEMPLATE_PUBLISHER_ROLE) {
        Template storage template = _templates[templateHash];
        if (!template.registered) revert TemplateNotRegistered();
        template.active = false;
        emit TemplateDeactivated(templateHash);
    }

    function getTemplate(bytes32 templateHash) external view returns (Template memory) {
        return _templates[templateHash];
    }

    function getBet(uint256 betId) external view returns (Bet memory) {
        return _bets[betId];
    }

    function cancelNonce(uint256 nonce) external {
        if (nonceUsed[msg.sender][nonce]) revert NonceAlreadyUsed();
        nonceUsed[msg.sender][nonce] = true;
        emit NonceCancelled(msg.sender, nonce);
    }

    function acceptBetWithPermits(
        BetOffer calldata offer,
        BetAcceptance calldata acceptance,
        bytes calldata makerSignature,
        bytes calldata takerSignature,
        PermitData calldata makerPermit,
        PermitData calldata takerPermit
    ) external nonReentrant whenNotPaused returns (uint256 betId) {
        bytes32 offerHash = hashOffer(offer);
        _validateIntent(offer, acceptance, offerHash, makerSignature, takerSignature);
        Template memory template = _validateTemplateAndTerms(offer, acceptance);

        nonceUsed[offer.maker][offer.nonce] = true;
        nonceUsed[acceptance.taker][acceptance.nonce] = true;
        usedOfferHash[offerHash] = true;

        uint256 deposit = offer.stake + offer.loserFee;
        _permitOrExistingAllowance(offer.maker, makerPermit, deposit);
        _permitOrExistingAllowance(acceptance.taker, takerPermit, deposit);
        _pullExact(offer.maker, deposit);
        _pullExact(acceptance.taker, deposit);

        betId = nextBetId++;
        _bets[betId] = Bet({
            playerA: offer.maker,
            playerB: acceptance.taker,
            templateHash: offer.templateHash,
            conditionId: offer.conditionId,
            playerAOutcomeIndex: offer.makerOutcomeIndex,
            playerBOutcomeIndex: acceptance.takerOutcomeIndex,
            stake: offer.stake,
            loserFee: offer.loserFee,
            fundedAt: uint64(block.timestamp),
            resolutionDeadline: template.resolutionDeadline,
            status: BetStatus.Funded
        });

        emit BetFunded(
            betId,
            offer.templateHash,
            offer.conditionId,
            offer.maker,
            acceptance.taker,
            offer.makerOutcomeIndex,
            acceptance.takerOutcomeIndex,
            offer.stake,
            offer.loserFee
        );
    }

    function resolveFromPolymarket(uint256 betId) external nonReentrant {
        Bet storage bet = _bets[betId];
        if (bet.status != BetStatus.Funded) revert BetNotFunded();

        uint256 denominator = polymarketCtf.payoutDenominator(bet.conditionId);
        if (denominator == 0) revert ConditionUnresolved();

        (bool hasSlotCount, uint256 slotCount) = _tryOutcomeSlotCount(bet.conditionId);
        if (!hasSlotCount || slotCount != 2) {
            _refund(bet, betId, BetStatus.Voided);
            return;
        }

        uint256 playerANumerator = polymarketCtf.payoutNumerators(bet.conditionId, bet.playerAOutcomeIndex);
        uint256 playerBNumerator = polymarketCtf.payoutNumerators(bet.conditionId, bet.playerBOutcomeIndex);

        if (playerANumerator == denominator && playerBNumerator == 0) {
            _settle(bet, betId, bet.playerA, bet.playerB, bet.playerAOutcomeIndex);
        } else if (playerBNumerator == denominator && playerANumerator == 0) {
            _settle(bet, betId, bet.playerB, bet.playerA, bet.playerBOutcomeIndex);
        } else {
            _refund(bet, betId, BetStatus.Voided);
        }
    }

    function expireUnresolvedBet(uint256 betId) external nonReentrant {
        Bet storage bet = _bets[betId];
        if (bet.status != BetStatus.Funded) revert BetNotFunded();
        if (block.timestamp <= bet.resolutionDeadline) revert ResolutionDeadlineNotReached();
        if (polymarketCtf.payoutDenominator(bet.conditionId) != 0) revert ConditionResolved();
        _refund(bet, betId, BetStatus.Expired);
    }

    function calculateLoserFee(uint256 stake, uint16 loserFeeBps) public view returns (uint256) {
        uint256 percentageFee = stake * loserFeeBps / _BPS_DENOMINATOR;
        return percentageFee > minLoserFee ? percentageFee : minLoserFee;
    }

    function calculateTemplateHash(TemplateRegistration calldata registration) public pure returns (bytes32) {
        bytes memory first = abi.encode(
            SPORTS_TEMPLATE_V1_TYPEHASH,
            registration.templateVersion,
            registration.providerCode,
            registration.marketIdHash,
            registration.conditionId,
            registration.questionIdHash,
            registration.sportCode,
            registration.competitionCode
        );
        bytes memory second = abi.encode(
            registration.competitionLevelCode,
            registration.competitionDetailHash,
            registration.eventTypeCode,
            registration.binaryMarketTypeCode,
            registration.outcomeALabelHash,
            registration.outcomeAProviderIndex,
            registration.outcomeBLabelHash,
            registration.outcomeBProviderIndex
        );
        bytes memory third = abi.encode(
            registration.rulesHash,
            registration.rulesSourceHash,
            registration.eventStartAt,
            registration.bettingCloseAt,
            registration.resolutionDeadline,
            registration.loserFeeBps,
            registration.feePolicyVersion
        );
        return keccak256(bytes.concat(first, second, third));
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, block.chainid, address(this)));
    }

    function hashOffer(BetOffer calldata offer) public view returns (bytes32) {
        return _hashTypedData(
            keccak256(
                abi.encode(
                    BET_OFFER_TYPEHASH,
                    offer.maker,
                    offer.taker,
                    offer.templateHash,
                    offer.conditionId,
                    offer.makerOutcomeIndex,
                    offer.stake,
                    offer.loserFee,
                    offer.nonce,
                    offer.deadline
                )
            )
        );
    }

    function hashAcceptance(BetAcceptance calldata acceptance) public view returns (bytes32) {
        return _hashTypedData(
            keccak256(
                abi.encode(
                    BET_ACCEPTANCE_TYPEHASH,
                    acceptance.taker,
                    acceptance.offerHash,
                    acceptance.takerOutcomeIndex,
                    acceptance.nonce,
                    acceptance.deadline
                )
            )
        );
    }

    function _validateIntent(
        BetOffer calldata offer,
        BetAcceptance calldata acceptance,
        bytes32 offerHash,
        bytes calldata makerSignature,
        bytes calldata takerSignature
    ) private view {
        if (offer.deadline < block.timestamp || acceptance.deadline < block.timestamp) {
            revert SignatureExpired();
        }
        if (nonceUsed[offer.maker][offer.nonce] || nonceUsed[acceptance.taker][acceptance.nonce]) {
            revert NonceAlreadyUsed();
        }
        if (usedOfferHash[offerHash]) revert OfferAlreadyUsed();
        if (acceptance.offerHash != offerHash) revert OfferHashMismatch();
        if (offer.maker == address(0) || acceptance.taker == address(0)) revert ZeroAddress();
        if (offer.maker == acceptance.taker) revert SamePlayer();
        if (offer.taker != address(0) && offer.taker != acceptance.taker) revert UnauthorizedTaker();
        if (offer.makerOutcomeIndex == acceptance.takerOutcomeIndex) revert SameOutcome();

        if (ECDSA.recover(offerHash, makerSignature) != offer.maker) revert InvalidSignature();
        if (ECDSA.recover(hashAcceptance(acceptance), takerSignature) != acceptance.taker) revert InvalidSignature();
    }

    function _validateTemplateAndTerms(BetOffer calldata offer, BetAcceptance calldata acceptance)
        private
        view
        returns (Template memory template)
    {
        template = _templates[offer.templateHash];
        if (!template.registered) revert TemplateNotRegistered();
        if (!template.active) revert TemplateInactive();
        if (template.conditionId != offer.conditionId) revert InvalidTemplate();
        if (block.timestamp > template.bettingCloseAt) revert TemplateClosed();
        if (offer.stake < minStake || offer.stake > maxStake) revert InvalidStake();
        if (template.loserFeeBps > maxLoserFeeBps) revert InvalidLoserFeeBps();
        if (calculateLoserFee(offer.stake, template.loserFeeBps) != offer.loserFee) revert InvalidLoserFee();

        bool makerA = offer.makerOutcomeIndex == template.outcomeAProviderIndex;
        bool makerB = offer.makerOutcomeIndex == template.outcomeBProviderIndex;
        bool takerA = acceptance.takerOutcomeIndex == template.outcomeAProviderIndex;
        bool takerB = acceptance.takerOutcomeIndex == template.outcomeBProviderIndex;
        if (!(makerA || makerB) || !(takerA || takerB)) revert InvalidOutcomeIndexes();
    }

    function _permitOrExistingAllowance(address account, PermitData calldata permitData, uint256 amount) private {
        if (permitData.value < amount) revert PermitValueTooLow();
        if (permitData.deadline < block.timestamp) revert SignatureExpired();
        if (_recoverPermitSigner(account, permitData) != account) revert InvalidSignature();

        uint256 currentNonce = brl1.nonces(account);
        if (currentNonce == permitData.nonce) {
            try brl1.permit(
                account, address(this), permitData.value, permitData.deadline, permitData.v, permitData.r, permitData.s
            ) {
            // Permit consumed successfully.
            }
            catch {
                revert PermitOrAllowanceFailed();
            }
        } else if (currentNonce != permitData.nonce + 1) {
            revert PermitOrAllowanceFailed();
        }

        if (brl1.allowance(account, address(this)) < amount) revert PermitOrAllowanceFailed();
    }

    function _recoverPermitSigner(address account, PermitData calldata permitData) private view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                _PERMIT_TYPEHASH, account, address(this), permitData.value, permitData.nonce, permitData.deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", brl1.DOMAIN_SEPARATOR(), structHash));
        return ECDSA.recover(digest, permitData.v, permitData.r, permitData.s);
    }

    function _pullExact(address from, uint256 amount) private {
        uint256 beforeBalance = brl1.balanceOf(address(this));
        brl1.safeTransferFrom(from, address(this), amount);
        uint256 afterBalance = brl1.balanceOf(address(this));
        if (afterBalance != beforeBalance + amount) revert TransferAmountMismatch();
    }

    function _settle(Bet storage bet, uint256 betId, address winner, address loser, uint8 winningOutcomeIndex) private {
        bet.status = BetStatus.Resolved;
        uint256 winnerPayout = (2 * bet.stake) + bet.loserFee;
        uint256 treasuryPayout = bet.loserFee;
        brl1.safeTransfer(winner, winnerPayout);
        brl1.safeTransfer(treasury, treasuryPayout);
        emit BetSettled(betId, winner, loser, winningOutcomeIndex, winnerPayout, treasuryPayout);
    }

    function _refund(Bet storage bet, uint256 betId, BetStatus status) private {
        bet.status = status;
        uint256 refund = bet.stake + bet.loserFee;
        brl1.safeTransfer(bet.playerA, refund);
        brl1.safeTransfer(bet.playerB, refund);
        emit BetVoided(betId, status, refund, refund);
    }

    function _hashTypedData(bytes32 structHash) private view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    function _tryOutcomeSlotCount(bytes32 conditionId) private view returns (bool ok, uint256 count) {
        try polymarketCtf.getOutcomeSlotCount(conditionId) returns (uint256 count_) {
            return (true, count_);
        } catch {
            return (false, 0);
        }
    }

    function _revokeOperationalRoles(address account) private {
        _revokeRoleIfSet(TEMPLATE_PUBLISHER_ROLE, account);
        _revokeRoleIfSet(FEE_OPERATOR_ROLE, account);
        _revokeRoleIfSet(PAUSER_ROLE, account);
        _revokeRoleIfSet(TREASURY_MANAGER_ROLE, account);
    }

    function _revokeRoleIfSet(bytes32 role, address account) private {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleUpdated(role, account, false);
        }
    }

    function _hasRole(bytes32 role, address account) private view returns (bool) {
        return account == owner || _roles[role][account];
    }
}
