import { useNetwork, useSwitchNetwork } from 'wagmi'

export function useRequireNetwork() {
  const { chain } = useNetwork()
  const { switchNetworkAsync } = useSwitchNetwork()

  return async (chainId: number) => {
    if (chain?.id !== chainId) {
      await switchNetworkAsync?.(chainId)
    }
  }
}
