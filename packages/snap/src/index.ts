import {
  OnRpcRequestHandler
} from '@metamask/snap-types';
import { State } from './types';

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns `null` if the request succeeded.
 * @throws If the request method is not valid for this snap.
 * @throws If the `snap_confirm` call failed.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  let state: State = await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
  });

  if (!state) {
    state = {
      accounts: [],
    };
    await wallet.request({
      method: 'snap_manageState',
      params: ['update', state],
    });
  }

  switch (request.method) {
    case 'hello':
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Hello ${origin}`,
            description:
              'This custom confirmation is just for display purposes.',
            textAreaContent:
              'But you can edit the snap source code to make it do something, if you want to!',
          },
        ],
      });

    // case 'faktoro_createWallet':
    //   const { owner } = request as any;
    //   const chainId = await wallet.request({ method: 'eth_chainId' });
    //   console.log({
    //     owner,
    //     chainId,
    //   });
    //   if (!owner) {
    //     return null;
    //   }
    //   // TODO: Create wallet
    //   const shouldCreateWallet = await wallet.request({
    //     method: 'snap_confirm',
    //     params: [
    //       {
    //         prompt: `Create New Wallet`,
    //         description: 'You are going to create a new wallet',
    //         textAreaContent: `The wallet's owner will be ${owner} and it will be deployed on chain ${chainId}`,
    //       },
    //     ],
    //   });
    //   if (shouldCreateWallet) {
    //     const q = await wallet.request({
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           from: owner,
    //           value: '0x00',
    //           data: WALLET_BYTECODE,
    //           chainId,
    //         },
    //       ],
    //     });
    //     console.log(q);
    //     return 'New wallet address';
    //   }
    //   return null;
    case 'faktoro_getWallets':
      return state.accounts;
    case 'faktoro_addWallet':
      const { owner, walletAddress, chainId } = request as any;
      const shouldAddWallet = await wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Faktoro`,
            description: 'Add wallet',
            textAreaContent: `Add new wallet in address ${walletAddress} for owner ${owner} on chainId ${chainId}`,
          },
        ],
      });
      if (shouldAddWallet) {
        state.accounts.push({
          owner,
          walletAddress,
          chainId,
        });
        await wallet.request({
          method: 'snap_manageState',
          params: ['update', state],
        });
        return true;
      }
      return false;
    default:
      throw new Error('Method not found.');
  }
};
