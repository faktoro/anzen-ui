import axios from 'axios';
import { ethers } from 'ethers';
import React, { useContext, useEffect, useState } from 'react';
import { useAsync } from 'react-async-hook';
import QRCode from 'react-qr-code';
import styled from 'styled-components';
import walletAbi from '../abis/Wallet.json';
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

enum TFASetupState {
  Loading = 'Loading',
  NotStarted = 'NotStarted',
  ScanningQrCode = 'ScanningQrCode',
  Done = 'Done',
}

export const Home = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [wcUri, setWcUri] = useState('');
  const [activeWallet, setActiveWallet] = useState<WalletInfo | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>();
  const [tfaSetup, setTfaSetup] = useState<TFASetupState>(
    TFASetupState.Loading,
  );
  const [qrUri, setQrUri] = useState<string | null>('asd');
  const [setupTfaCode, setSetupTfaCode] = useState('');
  const [verificationTfaCode, setVerificationTfaCode] = useState('');

  useEffect(() => {

  }, [connectedAccount])

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
    await initWalletConnect(wcUri, setPendingRequest);
  }

  async function onAcceptRequest() {
    const { to, value, data, encoded } = pendingRequest.contractInput;

    const response = await axios.post(
      `https://us-central1-faktoro-7469a.cloudfunctions.net/signTransaction`,
      {
        address: connectedAccount,
        twoFactorCode: verificationTfaCode,
        transaction: encoded,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const { v, r, s } = response.data.signature;

    const contractInterface = new ethers.utils.Interface(walletAbi);
    const encodedData = contractInterface.encodeFunctionData(
      'executeWithSignature',
      [to, value, data, { v, r, s }],
    );

    // @ts-ignore
    const txHash: string = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: pendingRequest.from,
          to: pendingRequest.to,
          value: '0x00',
          data: encodedData,
        },
      ],
    });
    console.info(txHash);

    pendingRequest.connector.approveRequest({
      id: pendingRequest.id,
      jsonrpc: pendingRequest.jsonrpc,
      result: txHash,
    });
    setPendingRequest(undefined);
  }

  function onRejectRequest() {
    pendingRequest.connector.rejectRequest({
      id: pendingRequest.id,
      jsonrpc: pendingRequest.jsonrpc,
      error: 'Denied by user',
    });
    setPendingRequest(undefined);
  }

  useAsync(async () => {
    if (!connectedAccount) {
      return;
    }

    try {
      const response = await axios.post(
        `https://us-central1-faktoro-7469a.cloudfunctions.net/checkRegistration`,
        {
          address: connectedAccount,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const { registered } = response.data;
      setTfaSetup(registered ? TFASetupState.Done : TFASetupState.NotStarted);
    } catch (error) {
      console.error(error);
    }
  }, [connectedAccount]);

  async function sign2FASetupMessage() {
    const message = `I want to set up a 2FA-secured wallet on my address ${connectedAccount}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, connectedAccount, ''],
    });

    const response = await axios.post(
      `https://us-central1-faktoro-7469a.cloudfunctions.net/registerUser`,
      {
        address: connectedAccount,
        signature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const { qrUri } = response.data;

    setTfaSetup(TFASetupState.ScanningQrCode);
    setQrUri(qrUri);
  }

  useAsync(async () => {
    if (setupTfaCode.length === 6) {
      const response = await axios.post(
        `https://us-central1-faktoro-7469a.cloudfunctions.net/verifyRegistration`,
        {
          address: connectedAccount,
          twoFactorCode: setupTfaCode,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(response.data);
      setTfaSetup(TFASetupState.Done);
    }
  }, [setupTfaCode]);

  return (
    <>
      <Header connectedAddress={connectedAccount} />
      <Container>
        <Heading>
          Welcome to <Span>Faktoro</Span>
        </Heading>
        <Subtitle>Your crypto wallet with 2-Factor Authentication.</Subtitle>
        {Boolean(pendingRequest) && (
          <Card
            fullWidth
            content={{
              title: 'Pending Request',
              description: 'A dapp requested to send a transaction',
              button: (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <p>
                      <b>Owner: </b>
                      {shortenedAddress(pendingRequest.from)}
                    </p>
                    <p>
                      <b>Wallet address: </b>
                      {shortenedAddress(pendingRequest.to)}
                    </p>
                    {/* <p>
                      <b>Network: </b>
                      {NETWORKS[pendingRequest.chainId]?.name ??
                        pendingRequest.chainId}
                    </p> */}
                  </div>
                  <label>Input a TFA code from your authenticator app</label>
                  <input
                    value={verificationTfaCode}
                    onChange={(e) => setVerificationTfaCode(e.target.value)}
                    style={{
                      marginTop: 8,
                      fontSize: 16,
                      width: 200,
                      height: 30,
                      textAlign: 'center',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      marginTop: 20,
                    }}
                  >
                    <GenericButton
                      title="Accept"
                      disabled={verificationTfaCode.length !== 6}
                      onClick={onAcceptRequest}
                    />
                    <div style={{ width: 30 }} />
                    <GenericButton title="Reject" onClick={onRejectRequest} />
                  </div>
                </>
              ),
            }}
          />
        )}
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
          {tfaSetup === TFASetupState.NotStarted && (
            <Card
              content={{
                title: 'Two-Factor Authentication Setup',
                description: 'Set up 2FA to create your secure wallet.',
                button: (
                  <div>
                    <GenericButton title="Sign" onClick={sign2FASetupMessage} />
                  </div>
                ),
              }}
            />
          )}
          {tfaSetup === TFASetupState.ScanningQrCode && qrUri && (
            <Card
              content={{
                title: 'Two-Factor Authentication Setup',
                description:
                  'Scan this QR code from your authenticator app and input a code below.',
                button: (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <QRCode value={qrUri} />

                    <input
                      value={setupTfaCode}
                      onChange={(e) => setSetupTfaCode(e.target.value)}
                      style={{
                        marginTop: 8,
                        fontSize: 16,
                        width: 200,
                        height: 30,
                        textAlign: 'center',
                      }}
                    />
                  </div>
                ),
              }}
            />
          )}
          {tfaSetup === TFASetupState.Done && (
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
          )}
          {activeWallet && (
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
          )}
        </CardContainer>
      </Container>
    </>
  );
};
