import { ethers } from 'ethers';

export const ETHEREUM_CHAIN_ID = 1;
export const POLYGON_CHAIN_ID = 137;
export const OPTIMISM_CHAIN_ID = 10;
export const ARBITRUM_CHAIN_ID = 42161;
export const CELO_CHAIN_ID = 42220;
export const AVALANCHE_CHAIN_ID = 43114;
export const GOERLI_CHAIN_ID = 5;
export const GNOSIS_CHAIN_ID = 100;

type NetworkDetails = {
  chainId: number;
  name: string;
  nativeToken: string;
  rpc: string;
  logo: string;
}

export const NETWORKS: {
  [chainId: number]: NetworkDetails;
} = {
  [CELO_CHAIN_ID]: {
    name: 'Celo',
    chainId: CELO_CHAIN_ID,
    nativeToken: 'CELO',
    rpc: 'https://forno.celo.org',
    logo: 'https://raw.githubusercontent.com/valora-inc/address-metadata/main/assets/tokens/CELO.png',
  },
  [POLYGON_CHAIN_ID]: {
    name: 'Polygon',
    chainId: POLYGON_CHAIN_ID,
    rpc: 'https://polygon-rpc.com',
    nativeToken: 'MATIC',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Fpolygon.webp?alt=media&token=b9ebed3f-5744-4434-b78e-dce6cf066add',
  },
  [ETHEREUM_CHAIN_ID]: {
    name: 'Ethereum',
    chainId: ETHEREUM_CHAIN_ID,
    rpc: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    nativeToken: 'ETH',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Fethereum.webp?alt=media&token=08724cb9-a1b4-4315-aa72-a75a1f744975',
  },
  [ARBITRUM_CHAIN_ID]: {
    name: 'Arbitrum',
    chainId: ARBITRUM_CHAIN_ID,
    rpc: 'https://rpc.ankr.com/arbitrum',
    nativeToken: 'ETH',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Farbitrum.webp?alt=media&token=adc210fb-9bd3-420a-98aa-14f9955ced5d',
  },
  [OPTIMISM_CHAIN_ID]: {
    name: 'Optimism',
    chainId: OPTIMISM_CHAIN_ID,
    rpc: 'https://rpc.ankr.com/optimism',
    nativeToken: 'ETH',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Foptimism.webp?alt=media&token=2656aa9c-e41b-4a8e-a922-363db766b95f',
  },
  [AVALANCHE_CHAIN_ID]: {
    name: 'Avalanche',
    chainId: AVALANCHE_CHAIN_ID,
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    nativeToken: 'AVAX',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Favax.webp?alt=media&token=4b6d9fb2-abb8-4cc9-9afa-e3c7aec97492',
  },
  [GOERLI_CHAIN_ID]: {
    name: 'Goerli',
    chainId: GOERLI_CHAIN_ID,
    rpc: 'https://goerli.infura.io/v3/946aa7017b65442d8d865c2a59bec77f',
    nativeToken: 'GoETH',
    logo: 'https://firebasestorage.googleapis.com/v0/b/celo-tracker-c537a.appspot.com/o/logos%2Fnetworks%2Fethereum.webp?alt=media&token=08724cb9-a1b4-4315-aa72-a75a1f744975',
  },
  [GNOSIS_CHAIN_ID]: {
    name: 'Gnosis',
    chainId: GNOSIS_CHAIN_ID,
    rpc: 'https://rpc.gnosischain.com/',
    nativeToken: 'XDAI',
    logo: '',
  },
};

export function getProvider(chainId: number) {
  return new ethers.providers.JsonRpcProvider(NETWORKS[chainId]?.rpc);
}
