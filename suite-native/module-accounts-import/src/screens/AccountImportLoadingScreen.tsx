import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { TokenAddress, TokenSymbol } from '@suite-common/wallet-types';
import { updateFiatRatesThunk } from '@suite-native/fiat-rates';
import { selectFiatCurrencyCode } from '@suite-native/module-settings';
import {
    AccountsImportStackParamList,
    AccountsImportStackRoutes,
    RootStackParamList,
    Screen,
    StackToTabCompositeScreenProps,
} from '@suite-native/navigation';
import TrezorConnect, { AccountInfo } from '@trezor/connect';

import { AccountImportHeader } from '../components/AccountImportHeader';
import { AccountImportLoader } from '../components/AccountImportLoader';
import { useShowImportError } from '../useShowImportError';

const LOADING_ANIMATION_DURATION = 5000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AccountImportLoadingScreen = ({
    navigation,
    route,
}: StackToTabCompositeScreenProps<
    AccountsImportStackParamList,
    AccountsImportStackRoutes.AccountImportLoading,
    RootStackParamList
>) => {
    const { xpubAddress, networkSymbol } = route.params;
    const dispatch = useDispatch();
    const showImportError = useShowImportError(networkSymbol, navigation);
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [isAnimationFinished, setIsAnimationFinished] = useState(false);
    const fiatCurrency = useSelector(selectFiatCurrencyCode);

    useEffect(() => {
        if (accountInfo && isAnimationFinished)
            navigation.navigate(AccountsImportStackRoutes.AccountImportSummary, {
                accountInfo,
                networkSymbol,
            });
    }, [isAnimationFinished, accountInfo, navigation, networkSymbol]);

    useEffect(() => {
        // loader should disappear after 5 seconds soonest by design.
        const timeout = setTimeout(() => setIsAnimationFinished(true), LOADING_ANIMATION_DURATION);
        return () => clearTimeout(timeout);
    }, [setIsAnimationFinished]);

    const safelyShowImportError: typeof showImportError = useCallback(
        async (message, onRetry) => {
            // Delay displaying the error message to avoid freezing the app on iOS. If an error occurs too quickly during the
            // transition from ScanQRCodeModalScreen, the error modal won't appear, resulting in a frozen app.
            await sleep(1000);
            showImportError(message, onRetry);
        },
        [showImportError],
    );

    useEffect(() => {
        let ignore = false;

        const getAccountInfo = async () => {
            const [fetchedAccountInfo] = await Promise.all([
                TrezorConnect.getAccountInfo({
                    coin: networkSymbol,
                    descriptor: xpubAddress,
                    details: 'tokenBalances',
                }),
                dispatch(
                    // @ts-expect-error Seems there is a problem with global types do dispatch, no idea how to fix it
                    updateFiatRatesThunk({
                        ticker: {
                            symbol: networkSymbol,
                        },
                        rateType: 'current',
                        localCurrency: fiatCurrency,
                    }),
                ),
            ]);

            if (!ignore) {
                if (fetchedAccountInfo?.success) {
                    if (networkSymbol === 'eth') {
                        fetchedAccountInfo.payload.tokens?.forEach(token => {
                            dispatch(
                                // @ts-expect-error Seems there is a problem with global types do dispatch, no idea how to fix it
                                updateFiatRatesThunk({
                                    ticker: {
                                        symbol: token.symbol as TokenSymbol,
                                        mainNetworkSymbol: 'eth',
                                        tokenAddress: token.contract as TokenAddress,
                                    },
                                    rateType: 'current',
                                    localCurrency: fiatCurrency,
                                }),
                            );
                        });
                    }
                    setAccountInfo(fetchedAccountInfo.payload);
                } else {
                    safelyShowImportError(fetchedAccountInfo.payload.error, getAccountInfo);
                }
            }
        };
        try {
            getAccountInfo();
        } catch (error) {
            if (!ignore) {
                safelyShowImportError(error?.message, getAccountInfo);
            }
        }

        return () => {
            ignore = true;
        };
    }, [xpubAddress, networkSymbol, dispatch, safelyShowImportError, fiatCurrency]);

    return (
        <Screen header={<AccountImportHeader activeStep={3} />}>
            <AccountImportLoader />
        </Screen>
    );
};
