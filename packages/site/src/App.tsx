import {
  Chain,
  connectorsForWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import styled, { ThemeProvider } from 'styled-components';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { publicProvider } from 'wagmi/providers/public';
import { Home } from './components';
import { dark, GlobalStyle } from './config/theme';
import { NETWORKS } from './utils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  max-width: 100vw;
`;

const { chains, provider } = configureChains(
  Object.values(NETWORKS).map(
    (network): Chain => ({
      id: network.chainId,
      name: network.name,
      network: network.name.toLowerCase(),
      iconUrl: network.logo,
      rpcUrls: {
        default: network.rpc,
      },
      nativeCurrency: {
        name: network.nativeToken,
        symbol: network.nativeToken,
        decimals: 18,
      },
      testnet: false,
    }),
  ),
  [
    jsonRpcProvider({
      rpc: (chain) => {
        return { http: chain.rpcUrls.default };
      },
    }),
    publicProvider(),
  ],
);

const connectors = connectorsForWallets([
  {
    groupName: 'Wallets',
    wallets: [
      metaMaskWallet({ chains }),
      walletConnectWallet({ chains }),
      coinbaseWallet({ appName: 'Anzen', chains }),
    ],
  },
]);

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

function App() {
  return (
    <ThemeProvider theme={dark}>
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider
          chains={chains}
          appInfo={{
            appName: 'Anzen',
          }}
        >
          <GlobalStyle />
          <Wrapper>
            <Home />
          </Wrapper>
        </RainbowKitProvider>
      </WagmiConfig>
    </ThemeProvider>
  );
}

export default App;
