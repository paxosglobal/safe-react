import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Layout from './components/Layout'
import ConnectDetails from './components/ProviderDetails/ConnectDetails'
import { UserDetails } from './components/ProviderDetails/UserDetails'
import ProviderAccessible from './components/ProviderInfo/ProviderAccessible'
import ProviderDisconnected from './components/ProviderInfo/ProviderDisconnected'
import { currentChainId } from 'src/logic/config/store/selectors'
import {
  availableSelector,
  loadedSelector,
  providerNameSelector,
  userAccountSelector,
  userEnsSelector,
} from 'src/logic/wallets/store/selectors'
import { removeProvider } from 'src/logic/wallets/store/actions'
import onboard from 'src/logic/wallets/onboard'
import { loadLastUsedProvider } from 'src/logic/wallets/store/middlewares/providerWatcher'

const HeaderComponent = (): React.ReactElement => {
  const provider = useSelector(providerNameSelector)
  const chainId = useSelector(currentChainId)
  const userAddress = useSelector(userAccountSelector)
  const ensName = useSelector(userEnsSelector)
  const loaded = useSelector(loadedSelector)
  const available = useSelector(availableSelector)
  const dispatch = useDispatch()

  useEffect(() => {
    const tryToConnectToLastUsedProvider = async () => {
      const lastUsedProvider = loadLastUsedProvider()
      if (lastUsedProvider) {
        await onboard().walletSelect(lastUsedProvider)
      }
    }

    tryToConnectToLastUsedProvider()
  }, [chainId])

  const openDashboard = () => {
    const { wallet } = onboard().getState()
    return wallet.type === 'sdk' && wallet.dashboard
  }

  const onDisconnect = () => {
    dispatch(removeProvider())
  }

  const getProviderInfoBased = () => {
    if (!loaded || !provider) {
      return <ProviderDisconnected />
    }

    return <ProviderAccessible connected={available} provider={provider} userAddress={userAddress} />
  }

  const getProviderDetailsBased = () => {
    if (!loaded) {
      return <ConnectDetails />
    }

    return (
      <UserDetails
        connected={available}
        onDisconnect={onDisconnect}
        openDashboard={openDashboard()}
        provider={provider}
        userAddress={userAddress}
        ensName={ensName}
      />
    )
  }

  const info = getProviderInfoBased()
  const details = getProviderDetailsBased()

  return <Layout providerDetails={details} providerInfo={info} />
}

export default HeaderComponent
