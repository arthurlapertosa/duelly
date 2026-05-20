// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetEscrowBRL1} from "../contracts/BetEscrowBRL1.sol";
import {MockBRL1} from "../contracts/mocks/MockBRL1.sol";
import {MockPolymarketCTF} from "../contracts/mocks/MockPolymarketCTF.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function warp(uint256 timestamp) external;
    function expectRevert(bytes4 selector) external;
    function expectRevert() external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
}

abstract contract BetEscrowTestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant MAKER_KEY = 0xA11CE;
    uint256 internal constant TAKER_KEY = 0xB0B;
    uint256 internal constant OTHER_KEY = 0xCAFE;
    uint256 internal constant TOKEN = 1e18;
    bytes32 internal constant CONDITION_ID = 0x0101010101010101010101010101010101010101010101010101010101010101;

    address internal maker;
    address internal taker;
    address internal other;
    address internal treasury = address(0xA0A0);

    MockBRL1 internal brl1;
    MockPolymarketCTF internal ctf;
    BetEscrowBRL1 internal escrow;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        maker = vm.addr(MAKER_KEY);
        taker = vm.addr(TAKER_KEY);
        other = vm.addr(OTHER_KEY);

        brl1 = new MockBRL1();
        ctf = new MockPolymarketCTF();
        escrow = new BetEscrowBRL1(address(brl1), address(ctf), treasury);

        brl1.mint(maker, 10_000 * TOKEN);
        brl1.mint(taker, 10_000 * TOKEN);
        brl1.mint(other, 10_000 * TOKEN);
    }

    function defaultRegistration() internal view returns (BetEscrowBRL1.TemplateRegistration memory registration) {
        registration = BetEscrowBRL1.TemplateRegistration({
            templateHash: bytes32(0),
            templateVersion: 1,
            providerCode: 1,
            marketIdHash: bytes32(uint256(0x11)),
            conditionId: CONDITION_ID,
            questionIdHash: bytes32(uint256(0x22)),
            sportCode: 1,
            competitionCode: 101,
            competitionLevelCode: 0,
            competitionDetailHash: bytes32(0),
            eventTypeCode: 1,
            binaryMarketTypeCode: 101,
            outcomeALabelHash: bytes32(uint256(0x33)),
            outcomeAProviderIndex: 0,
            outcomeBLabelHash: bytes32(uint256(0x44)),
            outcomeBProviderIndex: 1,
            rulesHash: bytes32(uint256(0x55)),
            rulesSourceHash: bytes32(uint256(0x66)),
            eventStartAt: uint64(block.timestamp + 1 days),
            bettingCloseAt: uint64(block.timestamp + 2 days),
            resolutionDeadline: uint64(block.timestamp + 16 days),
            loserFeeBps: 250,
            feePolicyVersion: 1,
            active: true
        });
        registration.templateHash = escrow.calculateTemplateHash(registration);
    }

    function registerDefaultTemplate() internal returns (BetEscrowBRL1.TemplateRegistration memory registration) {
        registration = defaultRegistration();
        escrow.registerTemplate(registration);
    }

    function defaultOffer(uint256 nonce, uint8 makerOutcome)
        internal
        view
        returns (BetEscrowBRL1.BetOffer memory offer)
    {
        BetEscrowBRL1.TemplateRegistration memory registration = defaultRegistration();
        uint256 stake = 100 * TOKEN;
        offer = BetEscrowBRL1.BetOffer({
            maker: maker,
            taker: taker,
            templateHash: registration.templateHash,
            conditionId: registration.conditionId,
            makerOutcomeIndex: makerOutcome,
            stake: stake,
            loserFee: escrow.calculateLoserFee(stake, registration.loserFeeBps),
            nonce: nonce,
            deadline: uint64(block.timestamp + 1 hours)
        });
    }

    function defaultAcceptance(BetEscrowBRL1.BetOffer memory offer, uint256 nonce, uint8 takerOutcome)
        internal
        view
        returns (BetEscrowBRL1.BetAcceptance memory acceptance)
    {
        acceptance = BetEscrowBRL1.BetAcceptance({
            taker: taker,
            offerHash: escrow.hashOffer(offer),
            takerOutcomeIndex: takerOutcome,
            nonce: nonce,
            deadline: uint64(block.timestamp + 1 hours)
        });
    }

    function signOffer(BetEscrowBRL1.BetOffer memory offer, uint256 key) internal returns (bytes memory) {
        return signDigest(key, escrow.hashOffer(offer));
    }

    function signAcceptance(BetEscrowBRL1.BetAcceptance memory acceptance, uint256 key)
        internal
        returns (bytes memory)
    {
        return signDigest(key, escrow.hashAcceptance(acceptance));
    }

    function signDigest(uint256 key, bytes32 digest) internal returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function signPermit(uint256 key, address owner, uint256 value, uint256 deadline)
        internal
        returns (BetEscrowBRL1.PermitData memory permitData)
    {
        bytes32 digest = permitDigest(owner, address(escrow), value, brl1.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        permitData =
            BetEscrowBRL1.PermitData({value: value, nonce: brl1.nonces(owner), deadline: deadline, v: v, r: r, s: s});
    }

    function signPermitForSpender(uint256 key, address owner, address spender, uint256 value, uint256 deadline)
        internal
        returns (BetEscrowBRL1.PermitData memory permitData)
    {
        bytes32 digest = permitDigest(owner, spender, value, brl1.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        permitData =
            BetEscrowBRL1.PermitData({value: value, nonce: brl1.nonces(owner), deadline: deadline, v: v, r: r, s: s});
    }

    function permitDigest(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                brl1.DOMAIN_SEPARATOR(),
                keccak256(abi.encode(brl1.PERMIT_TYPEHASH(), owner, spender, value, nonce, deadline))
            )
        );
    }

    function fundDefaultBet() internal returns (uint256 betId) {
        registerDefaultTemplate();
        return fundBet(1, 2, 0, 1);
    }

    function fundBet(uint256 offerNonce, uint256 acceptanceNonce, uint8 makerOutcome, uint8 takerOutcome)
        internal
        returns (uint256 betId)
    {
        BetEscrowBRL1.BetOffer memory offer = defaultOffer(offerNonce, makerOutcome);
        BetEscrowBRL1.BetAcceptance memory acceptance = defaultAcceptance(offer, acceptanceNonce, takerOutcome);
        uint256 deposit = offer.stake + offer.loserFee;
        BetEscrowBRL1.PermitData memory makerPermit = signPermit(MAKER_KEY, maker, deposit, block.timestamp + 1 hours);
        BetEscrowBRL1.PermitData memory takerPermit = signPermit(TAKER_KEY, taker, deposit, block.timestamp + 1 hours);

        betId = escrow.acceptBetWithPermits(
            offer,
            acceptance,
            signOffer(offer, MAKER_KEY),
            signAcceptance(acceptance, TAKER_KEY),
            makerPermit,
            takerPermit
        );
    }

    function setPayout(uint256 a, uint256 b, uint256 denominator) internal {
        uint256[] memory numerators = new uint256[](2);
        numerators[0] = a;
        numerators[1] = b;
        ctf.setPayout(CONDITION_ID, denominator, numerators);
    }

    function assertTrue(bool value, string memory message) internal pure {
        if (!value) revert(message);
    }

    function assertFalse(bool value, string memory message) internal pure {
        if (value) revert(message);
    }

    function assertEq(uint256 actual, uint256 expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }

    function assertEq(address actual, address expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }

    function assertEq(bytes32 actual, bytes32 expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }
}
