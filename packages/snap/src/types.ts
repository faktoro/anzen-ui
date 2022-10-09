export interface State {
  accounts: AccountState[];
}

export interface AccountState {
  owner: string;
  chainId: number;
  walletAddress: string;
}
