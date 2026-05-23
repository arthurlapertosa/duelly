import type { AppConfig } from '../../config/env.js';
import type { CanonicalSportsTemplate, PublishableTemplatePayload } from '../templates/domain/types.js';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
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
  'error BetNotFunded()',
  'error BetTerminal()',
  'error ConditionResolved()',
  'error ConditionUnresolved()',
  'error InvalidLoserFee()',
  'error InvalidLoserFeeBps()',
  'error InvalidOutcomeIndexes()',
  'error InvalidSignature()',
  'error InvalidStake()',
  'error InvalidStakeLimits()',
  'error InvalidTemplate()',
  'error InvalidTreasury()',
  'error NonceAlreadyUsed()',
  'error OfferAlreadyUsed()',
  'error OfferHashMismatch()',
  'error PausedError()',
  'error PermitOrAllowanceFailed()',
  'error PermitValueTooLow()',
  'error ReentrantCall()',
  'error ResolutionDeadlineNotReached()',
  'error SameOutcome()',
  'error SamePlayer()',
  'error SafeERC20CallFailed()',
  'error SafeERC20OperationFailed()',
  'error SignatureExpired()',
  'error TemplateAlreadyRegistered()',
  'error TemplateClosed()',
  'error TemplateInactive()',
  'error TemplateNotRegistered()',
  'error TransferAmountMismatch()',
  'error Unauthorized()',
  'error UnauthorizedTaker()',
  'error ZeroAddress()',
  'function minLoserFee() view returns (uint256)',
  'function calculateLoserFee(uint256 stake,uint16 loserFeeBps) view returns (uint256)',
  'function getTemplate(bytes32 templateHash) view returns ((bool registered,bool active,bytes32 templateHash,bytes32 marketIdHash,bytes32 conditionId,bytes32 questionIdHash,bytes32 rulesHash,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex))',
  'function getBet(uint256 betId) view returns ((address playerA,address playerB,bytes32 templateHash,bytes32 conditionId,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee,uint64 fundedAt,uint64 resolutionDeadline,uint8 status))',
  'function registerTemplate((bytes32 templateHash,uint16 templateVersion,uint8 providerCode,bytes32 marketIdHash,bytes32 conditionId,bytes32 questionIdHash,uint16 sportCode,uint16 competitionCode,uint16 competitionLevelCode,bytes32 competitionDetailHash,uint16 eventTypeCode,uint16 binaryMarketTypeCode,bytes32 outcomeALabelHash,uint8 outcomeAProviderIndex,bytes32 outcomeBLabelHash,uint8 outcomeBProviderIndex,bytes32 rulesHash,bytes32 rulesSourceHash,uint64 eventStartAt,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,uint16 feePolicyVersion,bool active) registration)',
  'function acceptBetWithPermits((address maker,address taker,bytes32 templateHash,bytes32 conditionId,uint8 makerOutcomeIndex,uint256 stake,uint256 loserFee,uint256 nonce,uint64 deadline) offer,(address taker,bytes32 offerHash,uint8 takerOutcomeIndex,uint256 nonce,uint64 deadline) acceptance,bytes makerSignature,bytes takerSignature,(uint256 value,uint256 nonce,uint256 deadline,uint8 v,bytes32 r,bytes32 s) makerPermit,(uint256 value,uint256 nonce,uint256 deadline,uint8 v,bytes32 r,bytes32 s) takerPermit) returns (uint256 betId)',
  'function resolveFromPolymarket(uint256 betId)',
  'function expireUnresolvedBet(uint256 betId)',
  'event TemplateRegistered(bytes32 indexed templateHash,bytes32 indexed conditionId,bytes32 indexed marketIdHash,bytes32 questionIdHash,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,bool active)',
  'event BetFunded(uint256 indexed betId,bytes32 indexed templateHash,bytes32 indexed conditionId,address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee)',
  'event BetSettled(uint256 indexed betId,address indexed winner,address indexed loser,uint8 winningOutcomeIndex,uint256 winnerPayout,uint256 treasuryPayout)',
  'event BetVoided(uint256 indexed betId,uint8 indexed status,uint256 playerARefund,uint256 playerBRefund)',
]);

export const ctfAbi = parseAbi([
  'function getConditionId(address oracle,bytes32 questionId,uint256 outcomeSlotCount) pure returns (bytes32)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId,uint256 index) view returns (uint256)',
  'function getOutcomeSlotCount(bytes32 conditionId) view returns (uint256)',
  'function prepareCondition(address oracle,bytes32 questionId,uint256 outcomeSlotCount)',
  'function reportPayouts(bytes32 questionId,uint256[] payouts)',
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

export interface CtfPayoutState {
  conditionId: Hex;
  outcomeSlotCount: number;
  denominator: bigint;
  numerators: bigint[];
}

export interface MirrorCtfPayoutInput {
  oracleAddress: Address;
  questionId: Hex;
  conditionId: Hex;
  outcomeSlotCount: number;
  numerators: bigint[];
}

export interface MirrorCtfPayoutResult {
  status: 'already-resolved' | 'mirrored';
  transactionHash: Hex | null;
  prepareTransactionHash: Hex | null;
  blockNumber: string | null;
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

  deploymentKey(): string {
    const { escrowAddress } = this.requireAddresses();
    return [
      `chain:${this.config.chain.chainId}`,
      `escrow:${escrowAddress.toLowerCase()}`,
      `block:${this.config.chain.deploymentBlock.toString()}`,
    ].join(':');
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

  async readEscrowBet(betId: string | bigint) {
    const client = this.requirePublicClient();
    const { escrowAddress } = this.requireAddresses();
    const bet = await client.readContract({
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'getBet',
      args: [BigInt(betId)],
    }) as {
      playerA: Address;
      playerB: Address;
      templateHash: Hex;
      conditionId: Hex;
      playerAOutcomeIndex: number;
      playerBOutcomeIndex: number;
      stake: bigint;
      loserFee: bigint;
      fundedAt: bigint;
      resolutionDeadline: bigint;
      status: number;
    };
    return bet;
  }

  async readPayoutDenominator(conditionId: Hex, options: { rpcUrl?: string } = {}): Promise<bigint> {
    const { polymarketCtfAddress } = this.requireAddresses();
    const client = options.rpcUrl
      ? createPublicClient({ transport: http(options.rpcUrl) })
      : this.requirePublicClient();
    return await client.readContract({
      address: polymarketCtfAddress,
      abi: ctfAbi,
      functionName: 'payoutDenominator',
      args: [conditionId],
    });
  }

  async readChainId(options: { rpcUrl?: string } = {}): Promise<number> {
    const client = options.rpcUrl
      ? createPublicClient({ transport: http(options.rpcUrl) })
      : this.requirePublicClient();
    return await client.getChainId();
  }

  async readCtfPayoutState(
    conditionId: Hex,
    options: { rpcUrl?: string; fallbackOutcomeSlotCount?: number } = {},
  ): Promise<CtfPayoutState> {
    const { polymarketCtfAddress } = this.requireAddresses();
    const client = options.rpcUrl
      ? createPublicClient({ transport: http(options.rpcUrl) })
      : this.requirePublicClient();
    const denominator = await client.readContract({
      address: polymarketCtfAddress,
      abi: ctfAbi,
      functionName: 'payoutDenominator',
      args: [conditionId],
    });
    let outcomeSlotCountRaw: bigint;
    try {
      outcomeSlotCountRaw = await client.readContract({
        address: polymarketCtfAddress,
        abi: ctfAbi,
        functionName: 'getOutcomeSlotCount',
        args: [conditionId],
      });
    } catch (error) {
      if (options.fallbackOutcomeSlotCount === undefined) throw error;
      outcomeSlotCountRaw = BigInt(options.fallbackOutcomeSlotCount);
    }
    if (outcomeSlotCountRaw > 256n) throw new Error('CTF outcome slot count is too large');
    const outcomeSlotCount = Number(outcomeSlotCountRaw);
    const numerators = await Promise.all(
      Array.from({ length: outcomeSlotCount }, (_, index) => client.readContract({
        address: polymarketCtfAddress,
        abi: ctfAbi,
        functionName: 'payoutNumerators',
        args: [conditionId, BigInt(index)],
      })),
    );
    return {
      conditionId,
      outcomeSlotCount,
      denominator,
      numerators,
    };
  }

  async readCtfConditionId(oracleAddress: Address, questionId: Hex, outcomeSlotCount: number): Promise<Hex> {
    const client = this.requirePublicClient();
    const { polymarketCtfAddress } = this.requireAddresses();
    return await client.readContract({
      address: polymarketCtfAddress,
      abi: ctfAbi,
      functionName: 'getConditionId',
      args: [oracleAddress, questionId, BigInt(outcomeSlotCount)],
    });
  }

  async mirrorCtfPayout(input: MirrorCtfPayoutInput): Promise<MirrorCtfPayoutResult> {
    await this.assertAnvilRpc();
    const { polymarketCtfAddress } = this.requireAddresses();
    const expectedConditionId = await this.readCtfConditionId(
      input.oracleAddress,
      input.questionId,
      input.outcomeSlotCount,
    );
    if (expectedConditionId.toLowerCase() !== input.conditionId.toLowerCase()) {
      throw new Error('CTF condition id does not match oracle, question id, and slot count');
    }

    if (input.numerators.length !== input.outcomeSlotCount) {
      throw new Error('CTF payout numerator count does not match outcome slot count');
    }

    const localState = await this.readCtfPayoutState(input.conditionId, {
      fallbackOutcomeSlotCount: 0,
    });
    if (localState.denominator > 0n) {
      return {
        status: 'already-resolved',
        transactionHash: null,
        prepareTransactionHash: null,
        blockNumber: null,
      };
    }

    let prepareTransactionHash: Hex | null = null;
    if (localState.outcomeSlotCount === 0) {
      prepareTransactionHash = await this.writePrepareCondition(
        input.oracleAddress,
        input.questionId,
        input.outcomeSlotCount,
      );
      await this.wait(prepareTransactionHash);
    }

    await this.anvilRpc('anvil_impersonateAccount', [input.oracleAddress]);
    try {
      await this.anvilRpc('anvil_setBalance', [input.oracleAddress, '0x56BC75E2D63100000']);
      const data = encodeFunctionData({
        abi: ctfAbi,
        functionName: 'reportPayouts',
        args: [input.questionId, input.numerators],
      });
      const transactionHash = await this.anvilRpc<Hex>('eth_sendTransaction', [{
        from: input.oracleAddress,
        to: polymarketCtfAddress,
        data,
      }]);
      const receipt = await this.wait(transactionHash);
      return {
        status: 'mirrored',
        transactionHash,
        prepareTransactionHash,
        blockNumber: receipt.blockNumber.toString(),
      };
    } finally {
      await this.anvilRpc('anvil_stopImpersonatingAccount', [input.oracleAddress]).catch(() => undefined);
    }
  }

  async assertAnvilRpc(): Promise<void> {
    await this.anvilRpc('anvil_nodeInfo', []);
  }

  async writePrepareCondition(oracleAddress: Address, questionId: Hex, outcomeSlotCount: number): Promise<Hex> {
    await this.assertAnvilRpc();
    const { polymarketCtfAddress } = this.requireAddresses();
    const { walletClient, account } = this.requireWalletClient();
    return await walletClient.writeContract({
      account,
      address: polymarketCtfAddress,
      abi: ctfAbi,
      functionName: 'prepareCondition',
      args: [oracleAddress, questionId, BigInt(outcomeSlotCount)],
      chain: null,
    });
  }

  async writeResolveFromPolymarket(betId: string | bigint) {
    const { escrowAddress } = this.requireAddresses();
    const { walletClient, account } = this.requireWalletClient();
    return await walletClient.writeContract({
      account,
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'resolveFromPolymarket',
      args: [BigInt(betId)],
      chain: null,
    });
  }

  async writeExpireUnresolvedBet(betId: string | bigint) {
    const { escrowAddress } = this.requireAddresses();
    const { walletClient, account } = this.requireWalletClient();
    return await walletClient.writeContract({
      account,
      address: escrowAddress,
      abi: escrowAbi,
      functionName: 'expireUnresolvedBet',
      args: [BigInt(betId)],
      chain: null,
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

  async receipt(hash: Hex) {
    try {
      return await this.requirePublicClient().getTransactionReceipt({ hash });
    } catch {
      return undefined;
    }
  }

  decodeEscrowLog(log: { topics: Hex[]; data: Hex }) {
    return decodeEventLog({ abi: escrowAbi, topics: log.topics as [Hex, ...Hex[]], data: log.data });
  }

  private async anvilRpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const rpcUrl = this.config.chain.rpcUrl;
    if (!rpcUrl) throw new Error('Chain RPC is not configured');
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });
    if (!response.ok) throw new Error(`Fork RPC HTTP ${response.status}`);
    const body = await response.json() as { result?: T; error?: { message?: string } };
    if (body.error) throw new Error(`Fork RPC ${method} failed: ${body.error.message ?? 'unknown error'}`);
    return body.result as T;
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
