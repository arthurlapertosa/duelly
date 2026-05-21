import type { ChainService } from '../chain.js';
import type { UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { httpError } from './errors.js';

export class Brl1Service {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async balanceForUser(user: UserAccount) {
    const wallet = await this.repository.findActiveWalletByUserId(user.id);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    const balance = await this.chain.readBrl1(wallet.address);
    return {
      wallet: wallet.address,
      token: this.chain.config.chain.brl1Address,
      symbol: balance.symbol,
      decimals: balance.decimals,
      balanceRaw: balance.balance.toString(),
      allowanceRaw: balance.allowance.toString(),
      permitNonce: balance.nonce.toString(),
      spender: balance.spender,
      domainSeparator: balance.domainSeparator,
    };
  }

  async readiness(user: UserAccount, stake: bigint, loserFee: bigint) {
    const data = await this.balanceForUser(user);
    const required = stake + loserFee;
    const available = BigInt(data.balanceRaw);
    return {
      ...data,
      stakeRaw: stake.toString(),
      loserFeeRaw: loserFee.toString(),
      requiredAmountRaw: required.toString(),
      availableAmountRaw: available.toString(),
      missingAmountRaw: available >= required ? '0' : (required - available).toString(),
      canAttemptBet: available >= required,
      permit: {
        owner: data.wallet,
        spender: data.spender,
        valueRaw: required.toString(),
        nonce: data.permitNonce,
      },
    };
  }
}
