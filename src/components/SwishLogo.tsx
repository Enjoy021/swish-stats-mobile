import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize } from '../theme/colors';

interface Props {
  size?: 'small' | 'large';
}

export default function SwishLogo({ size = 'small' }: Props) {
  const iconSize = size === 'large' ? 32 : 20;
  const fontSize = size === 'large' ? FontSize.xxl : FontSize.lg;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="basketball" size={iconSize} color={Colors.accentOrange} />
      <Text style={[styles.text, { fontSize }]}>Swish Stats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
