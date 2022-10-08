import React, { useContext, useState } from 'react';
import { useAsync } from 'react-async-hook';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import { WalletInfo } from '../types';
import {
  connectSnap,
  createWallet,
  fetchWallets,
  getChainId,
  getConnectedAccount,
  getSnap,
  NETWORKS,
  shortenedAddress,
  shouldDisplayReconnectButton,
  watchChainId,
  watchConnectedAccount,
} from '../utils';
import { initWalletConnect, setWcActiveWallet } from '../utils/walletConnect';
import {
  ConnectButton,
  GenericButton,
  InstallFlaskButton,
  ReconnectButton,
} from './Buttons';
import { Card } from './Card';
import { Header } from './Header';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

export const Home = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [wcUri, setWcUri] = useState('');
  const [activeWallet, setActiveWallet] = useState<WalletInfo | null>(null);

  function updateActiveWallet(wallet: WalletInfo) {
    setWcActiveWallet(wallet);
    setActiveWallet(wallet);
  }

  useAsync(async () => {
    setConnectedAccount(await getConnectedAccount());
    watchConnectedAccount(setConnectedAccount);
  }, []);

  useAsync(async () => {
    setChainId(await getChainId());
    watchChainId(setChainId);
  }, []);

  async function updateSnapWallets() {
    const fetchedWallets = await fetchWallets();
    setWallets(fetchedWallets);
    if (!activeWallet) {
      updateActiveWallet(fetchedWallets[0] ?? null);
    }
  }
  useAsync(updateSnapWallets, []);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  async function handleCreateWallet() {
    try {
      if (!connectedAccount || !chainId) {
        return;
      }
      await createWallet(connectedAccount, chainId);
      await updateSnapWallets();
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  }

  async function connectWithUri() {
    await initWalletConnect(wcUri);
  }

  return (
    <>
      <Header connectedAddress={connectedAccount} />
      <Container>
        <Heading>
          Welcome to <Span>Faktoro</Span>
        </Heading>
        <Subtitle>Your crypto wallet with 2-Factor Authentication.</Subtitle>
        {wallets.length > 0 && (
          <Card
            fullWidth
            content={{
              title: 'Your Wallets',
              description: 'Chose your active wallet',
              button: (
                <>
                  {wallets.map((wallet) => (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      key={`${wallet.owner}-${wallet.walletAddress}`}
                    >
                      <input
                        type="radio"
                        name="active-wallet"
                        checked={
                          activeWallet?.walletAddress ===
                            wallet.walletAddress &&
                          activeWallet.owner === wallet.owner &&
                          activeWallet.chainId === wallet.chainId
                        }
                        onChange={() => {
                          updateActiveWallet(wallet);
                        }}
                      />
                      <div style={{ marginLeft: 10 }}>
                        <p>
                          <b>Owner: </b>
                          {shortenedAddress(wallet.owner)}
                        </p>
                        <p>
                          <b>Wallet address: </b>
                          {shortenedAddress(wallet.walletAddress)}
                        </p>
                        <p>
                          <b>Network: </b>
                          {NETWORKS[wallet.chainId]?.name ?? wallet.chainId}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ),
            }}
          />
        )}
        <CardContainer>
          {state.error && (
            <ErrorMessage>
              <b>An error happened:</b> {state.error.message}
            </ErrorMessage>
          )}
          {!state.isFlask && (
            <Card
              content={{
                title: 'Install',
                description:
                  'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
                button: <InstallFlaskButton />,
              }}
              fullWidth
            />
          )}
          {!state.installedSnap && (
            <Card
              content={{
                title: 'Connect',
                description: 'Install the snap to use the 2FA-powered wallet.',
                button: (
                  <ConnectButton
                    onClick={handleConnectClick}
                    disabled={!state.isFlask}
                  />
                ),
              }}
              disabled={!state.isFlask}
            />
          )}
          {shouldDisplayReconnectButton(state.installedSnap) && (
            <Card
              content={{
                title: 'Reconnect',
                description:
                  "This is for development only, you shouldn't be seeing this.",
                button: (
                  <ReconnectButton
                    onClick={handleConnectClick}
                    disabled={!state.installedSnap}
                  />
                ),
              }}
              disabled={!state.installedSnap}
            />
          )}
          <Card
            content={{
              title: 'Create a 2FA-powered wallet',
              description: 'Create a wallet',
              button: (
                <GenericButton
                  title="Create Wallet"
                  onClick={handleCreateWallet}
                  disabled={!connectedAccount}
                />
              ),
            }}
            disabled={false}
            fullWidth={false}
          />
          <Card
            content={{
              title: 'WalletConnect',
              description:
                'Paste the Wallect Connect link to connect to a dapp',
              button: (
                <>
                  <input
                    value={wcUri}
                    onChange={(e) => setWcUri(e.target.value)}
                    style={{
                      marginTop: -10,
                      marginBottom: 8,
                    }}
                  />
                  <GenericButton
                    title="Connect"
                    onClick={connectWithUri}
                    disabled={!connectedAccount}
                  />
                </>
              ),
            }}
            disabled={false}
            fullWidth={false}
          />
        </CardContainer>
      </Container>
    </>
  );
};
