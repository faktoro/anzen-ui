import { ethers } from 'ethers';

export const NETWORKS: {
  [chainId: string]:
    | {
        name: string;
        rpc: string;
      }
    | undefined;
} = {
  '0x5': {
    name: 'Goerli',
    rpc: 'https://goerli.infura.io/v3/946aa7017b65442d8d865c2a59bec77f',
  },
  '0x89': {
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
  },
};

export function getProvider(chainId: string) {
  return new ethers.providers.JsonRpcProvider(NETWORKS[chainId]?.rpc);
}
