

export interface State {
  accounts: AccountState[]
}

export interface AccountState {
  owner: string
  chainId: string
  walletAddress: string
}