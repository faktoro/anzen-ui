import WalletConnect from '@walletconnect/client';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import { WalletInfo } from '../types';
import { normalizeChainId } from './format';

window.Buffer = window.Buffer || Buffer;

let activeOwner = '';
let activeAccount = '';
let activeChainId = 0;

export function setWcActiveWallet(wallet: WalletInfo) {
  activeOwner = wallet.owner;
  activeAccount = wallet.walletAddress;
  activeChainId = normalizeChainId(wallet.chainId);
}

const connectors: WalletConnect[] = [];

export async function initWalletConnect(
  uri: string,
  setPendingRequest: (req: any) => void,
) {
  try {
    console.log('q', uri);
    const connector = new WalletConnect({ uri });
    console.log('connected', connector.connected);

    if (!connector.connected) {
      await connector.createSession();
    }

    subscribeToEvents(connector, setPendingRequest);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function subscribeToEvents(
  connector: WalletConnect,
  setPendingRequest: (req: any) => void,
) {
  connector.on('session_request', (error, payload) => {
    console.log('EVENT', 'session_request');

    if (error) {
      throw error;
    }
    console.log('SESSION_REQUEST', payload.params);
    const { peerMeta } = payload.params[0];

    const sessionData = {
      chainId: activeChainId,
      accounts: [activeAccount],
    };
    connector.approveSession(sessionData);
    console.log('Session approved', connector.session);
  });

  connector.on('session_update', (error) => {
    console.log('EVENT', 'session_update');

    if (error) {
      throw error;
    }
  });

  connector.on('call_request', async (error, payload) => {
    // tslint:disable-next-line
    console.log('EVENT', 'call_request', payload);

    if (error) {
      throw error;
    }

    if (payload.method === 'eth_sendTransaction') {
      const { to, data, value: rawValue, from } = payload.params[0];
      const value = rawValue ?? '0x0';

      const encoded = ethers.utils.solidityPack(
        ['address', 'uint256', 'bytes'],
        [to, value, data],
      );

      setPendingRequest({
        connector,
        contractInput: {
          to,
          value,
          data,
          encoded,
        },
        from: activeOwner,
        to: from, // from is the SCW
        chainId: connector.chainId,
        id: payload.id,
        jsonrpc: payload.jsonrpc,
      });
    }
  });

  connector.on('connect', (error, payload) => {
    console.log('EVENT', 'connect');

    if (error) {
      throw error;
    }
  });

  connector.on('disconnect', (error, payload) => {
    console.log('EVENT', 'disconnect');

    if (error) {
      throw error;
    }
  });

  // if (connector.connected) {
  //   const { chainId, accounts } = connector;
  //   const index = 0;
  //   const address = accounts[index];
  //   getAppControllers().wallet.update(index, chainId);
  //   this.setState({
  //     connected: true,
  //     address,
  //     chainId,
  //   });
  // }
}
