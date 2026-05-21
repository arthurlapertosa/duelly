import type { Address } from 'viem';
import { permitTypes, type ChainService, type PermitData } from '../chain.js';
import type { UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { httpError } from './errors.js';
import { stringifyBigints } from './invite-payloads.js';

export class Brl1Service {
  constructor(private readonly repository: OrchestrationRepository, private readonly chain: ChainService) {}

  async balanceForUser(user: UserAccount) {
    const wallet = await this.repository.findActiveWalletByUserId(user.id);
    if (!wallet) throw httpError(404, 'WALLET_NOT_LINKED');
    const balance = await this.readBrl1(wallet.address);
    return {
      wallet: wallet.address,
      token: this.chain.config.chain.brl1Address,
      name: balance.name,
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
    const deadline = BigInt(Math.floor(Date.now() / 1000) + this.chain.config.invites.ttlSeconds);
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
        deadline: deadline.toString(),
      },
      permitPayload: this.permitPayload(data.name, data.wallet, data.spender, required, BigInt(data.permitNonce), deadline),
    };
  }

  async permitPayloadForAddress(owner: Address, value: bigint, deadline: bigint) {
    const data = await this.readBrl1(owner);
    return this.permitPayload(data.name, owner, data.spender, value, data.nonce, deadline);
  }

  async permitPayloadForData(owner: Address, permit: PermitData) {
    const data = await this.readBrl1(owner);
    return this.permitPayload(data.name, owner, data.spender, permit.value, permit.nonce, permit.deadline);
  }

  permitPayload(tokenName: string, owner: Address, spender: Address, value: bigint, nonce: bigint, deadline: bigint) {
    const { brl1Address } = this.chain.requireAddresses();
    return {
      domain: {
        name: tokenName,
        version: '1',
        chainId: this.chain.config.chain.chainId,
        verifyingContract: brl1Address,
      },
      types: permitTypes,
      primaryType: 'Permit',
      message: stringifyBigints({ owner, spender, value, nonce, deadline }),
    };
  }

  private async readBrl1(address: Address) {
    if (!this.chain.publicClient && this.chain.config.nodeEnv === 'test') {
      const { escrowAddress } = this.chain.requireAddresses();
      return {
        name: 'Mock BRL1',
        symbol: 'BRL1',
        decimals: 18,
        balance: 0n,
        nonce: 0n,
        allowance: 0n,
        spender: escrowAddress,
        domainSeparator: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }
    return await this.chain.readBrl1(address);
  }
}
