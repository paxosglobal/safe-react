import WalletConnectProvider from '@walletconnect/web3-provider'
import { WalletModule } from 'bnc-onboard/dist/src/interfaces'

import { _getChainId, getRpcServiceUrl } from 'src/config'
import { setPairingUri, setPairingState } from 'src/logic/pairing/actions'
import { initialPairingState } from 'src/logic/pairing/reducer'
import { store } from 'src/store'

// TODO: Mobile logo
const walletConnectIcon = `
<svg
height="25"
viewBox="0 0 40 25"
width="40"
xmlns="http://www.w3.org/2000/svg"
>
<path d="m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z"
fill="#3b99fc"/>
</svg>
`

// Modified version of the built in WC module in onboard
// https://github.com/blocknative/onboard/blob/release/1.35.5/src/modules/select/wallets/wallet-connect.ts
export const PAIRING_MODULE_NAME = 'MobileSafe'
const getPairingModule = (): WalletModule => {
  return {
    name: PAIRING_MODULE_NAME,
    svg: walletConnectIcon,
    wallet: async (helpers) => {
      const chainId = _getChainId()

      const provider = new WalletConnectProvider({
        rpc: { [chainId]: getRpcServiceUrl() },
        chainId: parseInt(_getChainId(), 10),
        bridge: 'https://safe-walletconnect.gnosis.io/',
        storageId: 'SAFE__pairingProvider',
        qrcode: false, // Don't show QR modal
      })

      // Not sure if redundant, but just in case
      provider.autoRefreshOnNetworkChange = false

      provider.connector.on('display_uri', (_err, payload) => {
        const uri = payload.params[0]
        store.dispatch(setPairingUri(uri))
      })

      provider.wc.on('connect', () => {
        store.dispatch(setPairingState({ uri: '', isPaired: true }))
      })

      provider.wc.on('disconnect', () => {
        store.dispatch(setPairingState(initialPairingState))
        helpers.resetWalletState({ disconnected: true, walletName: PAIRING_MODULE_NAME })
      })

      provider.enable()

      if (provider.connected) {
        store.dispatch(setPairingState({ uri: provider.wc.uri, isPaired: true }))
      }

      return {
        ...(!provider.connected && { heading: 'Heading', description: 'Description' }),
        provider,
        interface: {
          name: PAIRING_MODULE_NAME,
          // Trigger onboard 'connect' checkName
          connect: () => Promise.resolve(undefined),
          address: {
            onChange: (updater) => {
              provider.send('eth_accounts').then(([account]: string[]) => {
                if (account) {
                  updater(account)
                }
              })
              provider.on('accountsChanged', ([account]: string[]) => updater(account))
            },
          },
          network: {
            onChange: (updater) => {
              provider.send('eth_chainId').then(updater)
              provider.on('chainChanged', updater)
            },
          },
          balance: {
            // FIXME: Seems to cause listener memory leak
            // get: async () => {
            //   const account = provider.wc.accounts[0]
            //   if (!account) {
            //     return null
            //   }
            //   return helpers.getBalance(provider, account)
            // },
          },
          disconnect: () => {
            provider.wc.killSession()
            provider.stop()
          },
        },
      }
    },
    type: 'sdk',
    desktop: true,
    preferred: true,
  }
}

export default getPairingModule
