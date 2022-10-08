import { ethers } from 'ethers';
import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap, WalletInfo } from '../types';
import { getProvider, NETWORKS } from './ethers';

export async function getConnectedAccount() {
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });
  // @ts-ignore
  return accounts?.[0] ?? null;
}

export async function watchConnectedAccount(
  updateAccount: (account: string) => void,
) {
  // @ts-ignore
  window.ethereum.on('accountsChanged', (accounts: string[]) => {
    updateAccount(accounts[0]);
  });
}

export async function getChainId(): Promise<string | null> {
  const chainId = await window.ethereum.request({
    method: 'eth_chainId',
  });
  // @ts-ignore
  return chainId ?? null;
}

export async function watchChainId(updateChainId: (chainId: string) => void) {
  // @ts-ignore
  window.ethereum.on('chainChanged', (chainId: string) => {
    updateChainId(chainId);
  });
}

/**
 * Get the installed snaps in MetaMask.
 *
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (): Promise<GetSnapsResponse> => {
  return (await window.ethereum.request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;
};

/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = defaultSnapOrigin,
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_enable',
    params: [
      {
        wallet_snap: {
          [snapId]: {
            ...params,
          },
        },
      },
    ],
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
    );
  } catch (e) {
    console.log('Failed to obtain installed snap', e);
    return undefined;
  }
};

const WALLET_BYTECODE =
  '0x60803461009357601f6104cb38819003918201601f19168301916001600160401b038311848410176100985780849260409485528339810103126100935780610056602061004f610084946100ae565b92016100ae565b600080546001600160a01b039384166001600160a01b03199182161790915560018054929093169116179055565b60405161040890816100c38239f35b600080fd5b634e487b7160e01b600052604160045260246000fd5b51906001600160a01b03821682036100935756fe6080604052600436101561001b575b361561001957600080fd5b005b6000803560e01c9081630565bb6714610082575080631ea0be9f146100795780635d1222aa146100705780638da5cb5b146100675763affed0e00361000e57610062610182565b61000e565b506100626101bf565b50610062610182565b5061006261012a565b346101275760607ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126101275760043573ffffffffffffffffffffffffffffffffffffffff81168103610123576044359067ffffffffffffffff9081831161011f573660238401121561011f57826004013591821161011f57366024838501011161011f57602461011a93019060243590610212565b604051f35b8380fd5b5080fd5b80fd5b503461017d5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261017d57602073ffffffffffffffffffffffffffffffffffffffff60015416604051908152f35b600080fd5b503461017d5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261017d576020600254604051908152f35b503461017d5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261017d57602073ffffffffffffffffffffffffffffffffffffffff60005416604051908152f35b919060009373ffffffffffffffffffffffffffffffffffffffff85541633036102aa5761024661024182610389565b610338565b90808252602082019336828201116102a65791866020838298969488968499378301015251925af13d1561029d573d61028161024182610389565b908152809260203d92013e5b156102955750565b602081519101fd5b6060915061028d565b8680fd5b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600f60248201527f3246413a204f6e6c79206f776e657200000000000000000000000000000000006044820152fd5b507f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f604051930116820182811067ffffffffffffffff82111761037c57604052565b610384610308565b604052565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f60209267ffffffffffffffff81116103c5575b01160190565b6103cd610308565b6103bf56fea2646970667358221220e60878e104ed6981f5508e974bba6b7a6b90d85216812e8769568aefe57b6ab464736f6c634300080d0033';

export async function createWallet(owner: string, chainId: string) {
  const walletAddress = await deployWallet(owner, chainId);
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'faktoro_addWallet',
        owner,
        chainId,
        network: NETWORKS[chainId]?.name,
        walletAddress,
      },
    ],
  });
}

async function deployWallet(owner: string, chainId: string) {
  const encoder = new ethers.utils.AbiCoder();
  const encoded = encoder.encode(['address', 'address'], [owner, owner]);
  // @ts-ignore
  const txHash: string = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: owner,
        value: '0x00',
        data: WALLET_BYTECODE + encoded.slice(2),
      },
    ],
  });
  console.info(`Created wallet in txHash ${txHash}`);
  const provider = getProvider(chainId);

  for (let i = 0; i < 25; i++) {
    const receipt = await provider.getTransactionReceipt(txHash);
    console.info('Wallet creation receipt:', receipt);
    if (receipt !== null) {
      return receipt.contractAddress;
    }
    await sleep(3300);
  }
  return null;
}

export async function fetchWallets(): Promise<WalletInfo[]> {
  const walletsInfo = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: [
      defaultSnapOrigin,
      {
        method: 'faktoro_getWallets',
      },
    ],
  });
  console.log('fetched wallets', walletsInfo);
  return walletsInfo as WalletInfo[];
}

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
