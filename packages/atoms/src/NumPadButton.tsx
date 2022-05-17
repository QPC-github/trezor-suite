import React, { useCallback } from 'react';
import { TouchableHighlight } from 'react-native';

import { Text } from './Text';
import { useNativeStyles, NativeStyleObject, prepareNativeStyle } from '@trezor/styles';

export interface NumPadButtonProps {
    value: number;
    onPress: (value: number) => void;
    style?: NativeStyleObject;
}

const BUTTON_SIZE = 48;

export const numPadButtonStyle = prepareNativeStyle(utils => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: utils.borders.radii.round,
}));

export const numPadButtonTextStyle = prepareNativeStyle(utils => ({
    ...utils.typography.titleMedium,
    lineHeight: BUTTON_SIZE,
    color: utils.colors.gray700,
    textAlign: 'center',
    textAlignVertical: 'center',
}));

export const NumPadButton = ({ value, onPress, style, ...props }: NumPadButtonProps) => {
    const { applyStyle, utils } = useNativeStyles();

    const handlePress = useCallback(() => onPress(value), [onPress, value]);

    return (
        <TouchableHighlight
            style={[applyStyle(numPadButtonStyle), style]}
            onPress={handlePress}
            underlayColor={utils.colors.gray200}
            {...props}
        >
            <Text style={applyStyle(numPadButtonTextStyle)}>{value}</Text>
        </TouchableHighlight>
    );
};