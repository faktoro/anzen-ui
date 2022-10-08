import WalletConnect from '@walletconnect/client';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import walletAbi from '../abis/Wallet.json';
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

export async function initWalletConnect(uri: string) {
  try {
    console.log('q', uri);
    const connector = new WalletConnect({ uri });
    console.log('connected', connector.connected);

    if (!connector.connected) {
      await connector.createSession();
    }

    subscribeToEvents(connector);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function subscribeToEvents(connector: WalletConnect) {
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
    console.log('EVENT', 'call_request', 'method', payload.method);
    console.log('EVENT', 'call_request', 'params', payload.params);

    if (error) {
      throw error;
    }

    if (payload.method === 'eth_sendTransaction') {
      const { to, data, value, from } = payload.params[0];

      const contractInterface = new ethers.utils.Interface(walletAbi);
      const encodedData = contractInterface.encodeFunctionData('exec', [
        to,
        value,
        data,
      ]);

      // @ts-ignore
      const txHash: string = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: activeOwner,
            to: activeAccount,
            value: '0x00',
            data: encodedData,
          },
        ],
      });
      console.log(txHash);
    }

    // TODO
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
