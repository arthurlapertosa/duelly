import type { ChainService } from '../chain.js';
import { httpError } from './errors.js';

export class FeeService {
  constructor(private readonly chain: ChainService) {}

  async quote(stake: bigint, loserFeeBps: number) {
    if (stake <= 0n) throw httpError(400, 'INVALID_STAKE');
    if (!Number.isInteger(loserFeeBps) || loserFeeBps < 0 || loserFeeBps > 10_000) throw httpError(400, 'INVALID_LOSER_FEE_BPS');
    const percentFee = stake * BigInt(loserFeeBps) / 10_000n;
    const chainMinimum = await this.chain.minLoserFee();
    const configuredMinimum = this.chain.config.chain.gasEstimateWei * BigInt(this.chain.config.chain.gasMultiplier);
    const gasAnchoredMinimum = chainMinimum > configuredMinimum ? chainMinimum : configuredMinimum;
    const selectedLoserFee = percentFee > gasAnchoredMinimum ? percentFee : gasAnchoredMinimum;
    return {
      stakeRaw: stake.toString(),
      loserFeeBps,
      percentFeeRaw: percentFee.toString(),
      gasAnchoredMinimumRaw: gasAnchoredMinimum.toString(),
      selectedLoserFeeRaw: selectedLoserFee.toString(),
      totalRequiredAmountRaw: (stake + selectedLoserFee).toString(),
      explanation: 'The service fee is selected from the percentage fee and the configured minimum required for settlement.',
    };
  }
}
