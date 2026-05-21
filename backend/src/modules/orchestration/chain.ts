import type { AppConfig } from '../../config/env.js';
import type { CanonicalSportsTemplate, PublishableTemplatePayload } from '../templates/domain/types.js';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  hashTypedData,
  http,
  isAddress,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const brl1Abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function nonces(address owner) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)',
]);

export const permitTypes = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export const escrowAbi = parseAbi([
  'error ConditionUnresolved()',
  'function minLoserFee() view returns (uint256)',
  'function calculateLoserFee(uint256 stake,uint16 loserFeeBps) view returns (uint256)',
  'function getTemplate(bytes32 templateHash) view returns ((bool registered,bool active,bytes32 templateHash,bytes32 marketIdHash,bytes32 conditionId,bytes32 questionIdHash,bytes32 rulesHash,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex))',
  'function registerTemplate((bytes32 templateHash,uint16 templateVersion,uint8 providerCode,bytes32 marketIdHash,bytes32 conditionId,bytes32 questionIdHash,uint16 sportCode,uint16 competitionCode,uint16 competitionLevelCode,bytes32 competitionDetailHash,uint16 eventTypeCode,uint16 binaryMarketTypeCode,bytes32 outcomeALabelHash,uint8 outcomeAProviderIndex,bytes32 outcomeBLabelHash,uint8 outcomeBProviderIndex,bytes32 rulesHash,bytes32 rulesSourceHash,uint64 eventStartAt,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint16 feePolicyVersion,bool active) registration)',
  'function acceptBetWithPermits((address maker,address taker,bytes32 templateHash,bytes32 conditionId,uint8 makerOutcomeIndex,uint256 stake,uint256 loserFee,uint256 nonce,uint64 deadline) offer,(address taker,bytes32 offerHash,uint8 takerOutcomeIndex,uint256 nonce,uint64 deadline) acceptance,bytes makerSignature,bytes takerSignature,(uint256 value,uint256 nonce,uint256 deadline,uint8 v,bytes32 r,bytes32 s) makerPermit,(uint256 value,uint256 nonce,uint256 deadline,uint8 v,bytes32 r,bytes32 s) takerPermit) returns (uint256 betId)',
  'function resolveFromPolymarket(uint256 betId)',
  'event TemplateRegistered(bytes32 indexed templateHash,bytes32 indexed conditionId,bytes32 indexed marketIdHash,bytes32 questionIdHash,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,bool active)',
  'event BetFunded(uint256 indexed betId,bytes32 indexed templateHash,bytes32 indexed conditionId,address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee)',
  'event BetSettled(uint256 indexed betId,address indexed winner,address indexed loser,uint8 winningOutcomeIndex,uint256 winnerPayout,uint256 treasuryPayout)',
  'event BetVoided(uint256 indexed betId,uint8 indexed status,uint256 playerARefund,uint256 playerBRefund)',
]);

export const ctfAbi = parseAbi([
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId,uint256 index) view returns (uint256)',
  'function getOutcomeSlotCount(bytes32 conditionId) view returns (uint256)',
  'function setPayout(bytes32 conditionId,uint256 denominator,uint256[] numerators)',
]);

export const betOfferTypes = {
  BetOffer: [
    { name: 'maker', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'templateHash', type: 'bytes32' },
    { name: 'conditionId', type: 'bytes32' },
    { name: 'makerOutcomeIndex', type: 'uint8' },
    { name: 'stake', type: 'uint256' },
    { name: 'loserFee', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const;

export const betAcceptanceTypes = {
  BetAcceptance: [
    { name: 'taker', type: 'address' },
    { name: 'offerHash', type: 'bytes32' },
    { name: 'takerOutcomeIndex', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const;

export interface BetOfferMessage {
  maker: Address;
  taker: Address;
  templateHash: Hex;
  conditionId: Hex;
  makerOutcomeIndex: number;
  stake: bigint;
  loserFee: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface BetAcceptanceMessage {
  taker: Address;
  offerHash: Hex;
  takerOutcomeIndex: number;
  nonce: bigint;
  deadline: bigint;
}

export interface PermitData {
  value: bigint;
  nonce: bigint;
  deadline: bigint;
  v: number;
  r: Hex;
  s: Hex;
}

export interface PermitMessage {
  owner: Address;
  spender: Address;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}

export class ChainService {
  readonly publicClient;
  readonly walletClient;
  readonly relayerAccount;

  constructor(readonly config: AppConfig) {
    if (!config.chain.rpcUrl) return;
    this.publicClient = createPublicClient({
      transport: http(config.chain.rpcUrl),
    });
    if (config.chain.relayerPrivateKey) {
      this.relayerAccount = privateKeyToAccount(config.chain.relayerPrivateKey);
      this.walletClient = createWalletClient({
        account: this.relayerAccount,
        transport: http(config.chain.rpcUrl),
      });
    }
  }

  requirePublicClient() {
    if (!this.publicClient) throw new Error('Chain RPC is not configured');
    return this.publicClient;
  }

  requireWalletClient() {
    if (!this.walletClient || !this.relayerAccount) throw new Error('Relayer private key is not configured');
    return { walletClient: this.walletClient, account: this.relayerAccount };
  }

  requireAddresses() {
    const { brl1Address, escrowAddress, polymarketCtfAddress } = this.config.chain;
    if (!brl1Address || !escrowAddress || !polymarketCtfAddress) {
      throw new Error('BRL1, escrow, and CTF addresses must be configured');
    }
    return { brl1Address, escrowAddress, polymarketCtfAddress };
  }

  domain() {
    const { escrowAddress } = this.requireAddresses();
    return {
      name: 'DuellyBetEscrowBRL1',
      version: '1',
      chainId: this.config.chain.chainId,
      verifyingContract: escrowAddress,
    } as const;
  }

  hashOffer(message: BetOfferMessage): Hex {
    return hashTypedData({
      domain: this.domain(),
      types: betOfferTypes,
      primaryType: 'BetOffer',
      message,
    });
  }

  hashAcceptance(message: BetAcceptanceMessage): Hex {
    return hashTypedData({
      domain: this.domain(),
      types: betAcceptanceTypes,
      primaryType: 'BetAcceptance',
      message,
    });
  }

  normalizeAddress(value: string): Address {
    if (!isAddress(value)) throw new Error('Invalid EVM address');
    return getAddress(value);
  }

  async readBrl1(address: Address, spender?: Address) {
    const client = this.requirePublicClient();
    const { brl1Address, escrowAddress } = this.requireAddresses();
    const spenderAddress = spender ?? escrowAddress;
    const [name, symbol, decimals, balance, nonce, allowance, domainSeparator] = await Promise.all([
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'name' }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'symbol' }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'decimals' }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'balanceOf', args: [address] }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'nonces', args: [address] }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'allowance', args: [address, spenderAddress] }),
      client.readContract({ address: brl1Address, abi: brl1Abi, functionName: 'DOMAIN_SEPARATOR' }),
    ]);
    return { name, symbol, decimals, balance, nonce, allowance, spender: spenderAddress, domainSeparator };
  }

  async minLoserFee(): Promise<bigint> {
    if (!this.config.chain.escrowAddress || !this.publicClient) return this.config.chain.minLoserFeeWei;
    try {
      return await this.publicClient.readContract({
        address: this.config.chain.escrowAddress,
        abi: escrowAbi,
        functionName: 'minLoserFee',
      });
    } catch {
      return this.config.chain.minLoserFeeWei;
    }
  }

  async readTemplate(templateHash: Hex) {
    const client = this.requirePublicClient();
    const { escrowAddress } = this.requireAddresses();
    return await client.readContract({
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'getTemplate',
      args: [templateHash],
    });
  }

  async writeRegisterTemplate(template: CanonicalSportsTemplate | PublishableTemplatePayload) {
    const { escrowAddress } = this.requireAddresses();
    const { walletClient, account } = this.requireWalletClient();
    const registration = templateToRegistration(template);
    return await walletClient.writeContract({
      account,
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'registerTemplate',
      args: [registration],
      chain: null,
    });
  }

  async wait(hash: Hex) {
    return await this.requirePublicClient().waitForTransactionReceipt({ hash });
  }

  decodeEscrowLog(log: { topics: Hex[]; data: Hex }) {
    return decodeEventLog({ abi: escrowAbi, topics: log.topics as [Hex, ...Hex[]], data: log.data });
  }
}

export function templateToRegistration(template: CanonicalSportsTemplate | PublishableTemplatePayload) {
  const args = 'onChain' in template ? template.onChain.args : {
    templateHash: template.templateHash,
    templateVersion: template.templateVersion,
    providerCode: template.providerCode,
    marketIdHash: template.providerMarketIdHash,
    conditionId: template.conditionId,
    questionIdHash: template.questionIdHash,
    sportCode: template.sportCode,
    competitionCode: template.competitionCode,
    competitionLevelCode: template.competitionLevelCode,
    competitionDetailHash: template.competitionDetailHash,
    eventTypeCode: template.eventTypeCode,
    binaryMarketTypeCode: template.binaryMarketTypeCode,
    outcomeALabelHash: template.outcomeALabelHash,
    outcomeAProviderIndex: template.outcomeA.providerOutcomeIndex,
    outcomeBLabelHash: template.outcomeBLabelHash,
    outcomeBProviderIndex: template.outcomeB.providerOutcomeIndex,
    rulesHash: template.rulesHash,
    rulesSourceHash: template.rulesSourceHash,
    eventStartAt: template.eventStartAt,
    bettingCloseAt: template.bettingCloseAt,
    resolutionDeadline: template.resolutionDeadline,
    loserFeeBps: template.loserFeeBps,
    feePolicyVersion: template.feePolicyVersion,
    active: template.active,
  };

  return {
    templateHash: args.templateHash as Hex,
    templateVersion: args.templateVersion,
    providerCode: args.providerCode,
    marketIdHash: args.marketIdHash as Hex,
    conditionId: args.conditionId as Hex,
    questionIdHash: args.questionIdHash as Hex,
    sportCode: args.sportCode,
    competitionCode: args.competitionCode,
    competitionLevelCode: args.competitionLevelCode,
    competitionDetailHash: args.competitionDetailHash as Hex,
    eventTypeCode: args.eventTypeCode,
    binaryMarketTypeCode: args.binaryMarketTypeCode,
    outcomeALabelHash: args.outcomeALabelHash as Hex,
    outcomeAProviderIndex: args.outcomeAProviderIndex,
    outcomeBLabelHash: args.outcomeBLabelHash as Hex,
    outcomeBProviderIndex: args.outcomeBProviderIndex,
    rulesHash: args.rulesHash as Hex,
    rulesSourceHash: args.rulesSourceHash as Hex,
    eventStartAt: BigInt(args.eventStartAt),
    bettingCloseAt: BigInt(args.bettingCloseAt),
    resolutionDeadline: BigInt(args.resolutionDeadline),
    loserFeeBps: args.loserFeeBps,
    feePolicyVersion: args.feePolicyVersion,
    active: args.active,
  };
}
