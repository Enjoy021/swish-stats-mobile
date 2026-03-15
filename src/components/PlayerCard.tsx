import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import type { Player } from '../types';

interface Props {
  player: Player;
  fouls?: number;
  isSelected?: boolean;
  isOnCourt?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export default function PlayerCard({ player, fouls = 0, isSelected, isOnCourt, onPress, compact }: Props) {
  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          isSelected && styles.compactSelected,
          fouls >= 5 && styles.fouledOut,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.compactNumber, isSelected && styles.selectedText]}>
          #{player.number}
        </Text>
        <Text style={[styles.compactInitials, isSelected && styles.selectedText]} numberOfLines={1}>
          {initials}
        </Text>
        {fouls > 0 && (
          <View style={[styles.foulBadge, fouls >= 4 && styles.foulBadgeDanger]}>
            <Text style={styles.foulText}>{fouls}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.numberBadge}>
        <Text style={styles.number}>#{player.number}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.position}>{player.position}</Text>
      </View>
      {fouls > 0 && (
        <View style={[styles.foulBadge, fouls >= 4 && styles.foulBadgeDanger]}>
          <Text style={styles.foulText}>{fouls}F</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    minHeight: TouchTarget.min,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: Colors.accentOrange,
    backgroundColor: '#fff7ed',
  },
  numberBadge: {
    backgroundColor: Colors.primaryNavy,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: Spacing.sm,
  },
  number: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: FontSize.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  position: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  foulBadge: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  foulBadgeDanger: {
    backgroundColor: Colors.error,
  },
  foulText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: FontSize.xs,
  },
  compactCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 6,
    minWidth: 56,
    minHeight: TouchTarget.min,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactSelected: {
    borderColor: Colors.accentOrange,
    backgroundColor: 'rgba(232,96,44,0.2)',
  },
  compactNumber: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: FontSize.sm,
  },
  compactInitials: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs,
  },
  selectedText: {
    color: Colors.white,
  },
  fouledOut: {
    opacity: 0.4,
  },
});
