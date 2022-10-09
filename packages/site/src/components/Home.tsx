import axios from 'axios';
import { ethers } from 'ethers';
import React, { useState } from 'react';
import { useAsync } from 'react-async-hook';
import QRCode from 'react-qr-code';
import styled from 'styled-components';
import { useAccount, useNetwork, useSigner } from 'wagmi';
import walletAbi from '../abis/Wallet.json';
import { useRequireNetwork } from '../hooks/useRequireNetwork';
import { AccountDetails, WalletInfo } from '../types';
import {
  createWallet,
  getProvider,
  NETWORKS,
  shortenedAddress,
} from '../utils';
import { initWalletConnect, setWcActiveWallet } from '../utils/walletConnect';
import { GenericButton } from './Buttons';
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
  const { address } = useAccount();
  const network = useNetwork();
  const chainId = network.chain?.id;

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
  const [accountDetails, setAccountDetails] = useState<AccountDetails[]>([]);

  const requireNetwork = useRequireNetwork();
  const { data: signer } = useSigner();
  // const provider = useProvider();

  useAsync(async () => {
    if (!address) {
      return;
    }
    const provider = getProvider(1); // Ethereum chain Id
    const [name, avatar] = await Promise.all([
      provider.lookupAddress(address),
      provider.getAvatar(address),
    ]);
    accountDetails.push({
      address,
      name,
      avatar,
    });
    setAccountDetails([...accountDetails]);
  }, [address]);

  function displayName(address: string) {
    return (
      accountDetails.find((acc) => acc.address === address)?.name ?? address
    );
  }

  function updateActiveWallet(wallet: WalletInfo) {
    setWcActiveWallet(wallet);
    setActiveWallet(wallet);
  }

  async function updateAnzenWallets(wallets: WalletInfo[]) {
    setWallets(wallets);
    if (!activeWallet) {
      updateActiveWallet(wallets[0] ?? null);
    }
  }

  async function handleCreateWallet() {
    try {
      if (!address || !chainId) {
        return;
      }
      const newWallet = await createWallet(signer, address, chainId);
      wallets.push(newWallet);
      updateAnzenWallets(wallets);
    } catch (e) {
      console.error(e);
    }
  }

  async function connectWithUri() {
    await initWalletConnect(wcUri, setPendingRequest);
  }

  async function onAcceptRequest() {
    if (!signer) {
      return;
    }
    const { to, value, data, encoded } = pendingRequest.contractInput;

    const response = await axios.post(
      `https://us-central1-faktoro-7469a.cloudfunctions.net/signTransaction`,
      {
        address,
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

    const tx = await signer.sendTransaction({
      from: pendingRequest.from,
      to: pendingRequest.to,
      value: '0x00',
      data: encodedData,
    });

    console.info(`Sent tx with hash ${tx.hash}`);

    pendingRequest.connector.approveRequest({
      id: pendingRequest.id,
      jsonrpc: pendingRequest.jsonrpc,
      result: tx.hash,
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
    if (!address) {
      return;
    }

    try {
      const response = await axios.post(
        `https://us-central1-faktoro-7469a.cloudfunctions.net/checkRegistration`,
        {
          address,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const { registered, wallets } = response.data;
      console.log(response.data);
      updateAnzenWallets(
        (wallets ?? []).map(
          ({
            walletAddress,
            chainId,
          }: {
            walletAddress: string;
            chainId: string;
          }) => ({
            address,
            walletAddress,
            chainId: Number(chainId),
          }),
        ),
      );
      setTfaSetup(registered ? TFASetupState.Done : TFASetupState.NotStarted);
    } catch (error) {
      console.error(error);
    }
  }, [address]);

  async function sign2FASetupMessage() {
    const message = `I want to set up a 2FA-secured wallet on my address ${address}`;
    const signature = await signer?.signMessage(message);
    const response = await axios.post(
      `https://us-central1-faktoro-7469a.cloudfunctions.net/registerUser`,
      {
        address,
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
          address,
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

  console.log(tfaSetup);

  return (
    <>
      <Header accountDetails={accountDetails} />
      <Container>
        {(tfaSetup === TFASetupState.Loading ||
          tfaSetup === TFASetupState.NotStarted) && (
          <>
            <Heading>
              Welcome to <Span>Anzen</Span>
            </Heading>
            <Subtitle>
              Your crypto wallet with 2-Factor Authentication.
            </Subtitle>
          </>
        )}
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
                      {displayName(pendingRequest.from)}
                    </p>
                    <p>
                      <b>Wallet address: </b>
                      {displayName(pendingRequest.to)}
                    </p>
                    {/* <p>
                      <b>Network: </b>
                      {NETWORKS[pendingRequest.chainId]?.name ??
                        pendingRequest.chainId}
                    </p> */}

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
                  </div>
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
                      key={`${wallet.address}-${wallet.walletAddress}`}
                    >
                      <input
                        type="radio"
                        name="active-wallet"
                        checked={
                          activeWallet?.walletAddress ===
                            wallet.walletAddress &&
                          activeWallet.address === wallet.address &&
                          activeWallet.chainId === wallet.chainId
                        }
                        onChange={() => {
                          updateActiveWallet(wallet);
                        }}
                      />
                      <div style={{ marginLeft: 10 }}>
                        <p>
                          <b>Owner: </b>
                          {displayName(wallet.address)}
                        </p>
                        <p>
                          <b>Wallet address: </b>
                          {displayName(wallet.walletAddress)}
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
          {tfaSetup === TFASetupState.NotStarted && (
            <Card
              content={{
                title: 'Two-Factor Authentication Setup',
                description:
                  'Start by signing a message to verify that you own your wallet.',
                button: (
                  <div>
                    <GenericButton
                      title="Sign Message"
                      onClick={sign2FASetupMessage}
                    />
                  </div>
                ),
              }}
              fullWidth
            />
          )}
          {tfaSetup === TFASetupState.ScanningQrCode && qrUri && (
            <Card
              fullWidth
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
                    disabled={!address}
                  />
                ),
              }}
              disabled={false}
              fullWidth={wallets.length === 0}
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
                      disabled={!address}
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
