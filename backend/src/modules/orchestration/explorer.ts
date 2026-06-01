import type { Address, Hex } from 'viem';

export interface TransactionReceiptLink {
  transactionHash: Hex;
  blockNumber: string | null;
  url: string;
}

export interface ContractReceiptLink {
  address: Address;
  url: string;
}

export interface BetReceiptLinks {
  funding: TransactionReceiptLink | null;
  settlement: TransactionReceiptLink | null;
  contract: ContractReceiptLink | null;
}

export const emptyBetReceiptLinks = (): BetReceiptLinks => ({
  funding: null,
  settlement: null,
  contract: null,
});

export function transactionReceiptLink(baseUrl: string, transactionHash: Hex, blockNumber: string | null): TransactionReceiptLink {
  return {
    transactionHash,
    blockNumber,
    url: `${baseUrl}/tx/${transactionHash}`,
  };
}

export function contractReceiptLink(baseUrl: string, address: Address): ContractReceiptLink {
  return {
    address,
    url: `${baseUrl}/address/${address}`,
  };
}
