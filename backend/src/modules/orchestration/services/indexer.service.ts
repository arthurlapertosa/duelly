import { decodeEventLog, getAddress, hexToNumber, parseAbiItem, type Hex } from 'viem';
import { escrowAbi } from '../chain.js';
import type { ChainService } from '../chain.js';
import type { IndexedBet } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { stringifyBigints } from './invite-payloads.js';

const DEFAULT_LOG_RANGE = 9n;
const INDEXER_RESCAN_DEPTH = 9n;

export class IndexerService {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async reindex(toBlock?: bigint) {
    const { escrowAddress } = this.chain.requireAddresses();
    const client = this.chain.requirePublicClient();
    const cursor = await this.repository.findCursor('escrow');
    const end = toBlock ?? await client.getBlockNumber();
    const deploymentBlock = this.chain.config.chain.deploymentBlock;
    let fromBlock = cursor ? subtractFloor(BigInt(cursor.lastBlockNumber), INDEXER_RESCAN_DEPTH, deploymentBlock) : deploymentBlock;
    if (!cursor && fromBlock === 0n && end > DEFAULT_LOG_RANGE) {
      fromBlock = end - DEFAULT_LOG_RANGE;
    }
    if (fromBlock > end) fromBlock = end;
    const events = [
      parseAbiItem('event TemplateRegistered(bytes32 indexed templateHash,bytes32 indexed conditionId,bytes32 indexed marketIdHash,bytes32 questionIdHash,uint8 outcomeAProviderIndex,uint8 outcomeBProviderIndex,uint64 bettingCloseAt,uint64 resolutionDeadline,uint16 loserFeeBps,bool active)'),
      parseAbiItem('event BetFunded(uint256 indexed betId,bytes32 indexed templateHash,bytes32 indexed conditionId,address playerA,address playerB,uint8 playerAOutcomeIndex,uint8 playerBOutcomeIndex,uint256 stake,uint256 loserFee)'),
      parseAbiItem('event BetSettled(uint256 indexed betId,address indexed winner,address indexed loser,uint8 winningOutcomeIndex,uint256 winnerPayout,uint256 treasuryPayout)'),
      parseAbiItem('event BetVoided(uint256 indexed betId,uint8 indexed status,uint256 playerARefund,uint256 playerBRefund)'),
    ];
    const logs = [];
    for (let start = fromBlock; start <= end; start += DEFAULT_LOG_RANGE + 1n) {
      const stop = start + DEFAULT_LOG_RANGE > end ? end : start + DEFAULT_LOG_RANGE;
      logs.push(...await client.getLogs({ address: escrowAddress, events, fromBlock: start, toBlock: stop }));
    }
    for (const log of logs) {
      const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      await this.repository.saveIndexedEvent({
        id: `event-${log.transactionHash}-${log.logIndex}`,
        eventName: decoded.eventName,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber.toString(),
        args: stringifyBigints(decoded.args),
        createdAt: new Date(),
      });
      await this.applyEvent(decoded.eventName, decoded.args as Record<string, unknown>, log.transactionHash, log.blockNumber);
    }
    await this.repository.saveCursor({ id: 'escrow', lastBlockNumber: end.toString(), updatedAt: new Date() });
    return { fromBlock: fromBlock.toString(), toBlock: end.toString(), events: logs.length };
  }

  async applyEvent(eventName: string, args: Record<string, unknown>, transactionHash: Hex, blockNumber: bigint) {
    if (eventName === 'BetFunded') {
      const betId = (args.betId as bigint).toString();
      const invite = await this.repository.findInviteByBetId(betId);
      const bet: IndexedBet = {
        betId,
        inviteId: invite?.id ?? null,
        templateHash: args.templateHash as Hex,
        conditionId: args.conditionId as Hex,
        playerA: getAddress(args.playerA as string),
        playerB: getAddress(args.playerB as string),
        playerAOutcomeIndex: Number(args.playerAOutcomeIndex),
        playerBOutcomeIndex: Number(args.playerBOutcomeIndex),
        stake: (args.stake as bigint).toString(),
        loserFee: (args.loserFee as bigint).toString(),
        status: 'Funded',
        winner: null,
        winnerPayout: null,
        treasuryPayout: null,
        sourceTransactionHash: transactionHash,
        sourceBlockNumber: blockNumber.toString(),
        updatedAt: new Date(),
      };
      await this.repository.saveIndexedBet(bet);
    } else if (eventName === 'BetSettled') {
      const betId = (args.betId as bigint).toString();
      const bet = await this.repository.findIndexedBet(betId);
      if (bet) {
        bet.status = 'Resolved';
        bet.winner = getAddress(args.winner as string);
        bet.winnerPayout = (args.winnerPayout as bigint).toString();
        bet.treasuryPayout = (args.treasuryPayout as bigint).toString();
        bet.sourceTransactionHash = transactionHash;
        bet.sourceBlockNumber = blockNumber.toString();
        bet.updatedAt = new Date();
        await this.repository.saveIndexedBet(bet);
      }
    } else if (eventName === 'BetVoided') {
      const betId = (args.betId as bigint).toString();
      const bet = await this.repository.findIndexedBet(betId);
      if (bet) {
        const status = typeof args.status === 'number' ? args.status : hexToNumber(args.status as Hex);
        bet.status = status === 4 ? 'Expired' : 'Voided';
        bet.sourceTransactionHash = transactionHash;
        bet.sourceBlockNumber = blockNumber.toString();
        bet.updatedAt = new Date();
        await this.repository.saveIndexedBet(bet);
      }
    }
  }
}

function subtractFloor(value: bigint, amount: bigint, floor: bigint): bigint {
  return value > floor + amount ? value - amount : floor;
}
