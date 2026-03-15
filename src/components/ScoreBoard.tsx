import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../theme/colors';

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  period: string;
  status?: string;
  compact?: boolean;
}

export default function ScoreBoard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  period,
  status,
  compact,
}: Props) {
  const homeAnim = useRef(new Animated.Value(1)).current;
  const awayAnim = useRef(new Animated.Value(1)).current;
  const prevHomeScore = useRef(homeScore);
  const prevAwayScore = useRef(awayScore);

  useEffect(() => {
    if (homeScore !== prevHomeScore.current) {
      Animated.sequence([
        Animated.timing(homeAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(homeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      prevHomeScore.current = homeScore;
    }
  }, [homeScore]);

  useEffect(() => {
    if (awayScore !== prevAwayScore.current) {
      Animated.sequence([
        Animated.timing(awayAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(awayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      prevAwayScore.current = awayScore;
    }
  }, [awayScore]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTeam} numberOfLines={1}>{homeTeamName}</Text>
        <View style={styles.compactScores}>
          <Animated.Text style={[styles.compactScore, { transform: [{ scale: homeAnim }] }]}>
            {homeScore}
          </Animated.Text>
          <Text style={styles.compactDash}>—</Text>
          <Animated.Text style={[styles.compactScore, { transform: [{ scale: awayAnim }] }]}>
            {awayScore}
          </Animated.Text>
        </View>
        <Text style={styles.compactTeam} numberOfLines={1}>{awayTeamName}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.teamSection}>
        <Text style={styles.teamName} numberOfLines={1}>{homeTeamName}</Text>
        <Animated.Text style={[styles.score, { transform: [{ scale: homeAnim }] }]}>
          {homeScore}
        </Animated.Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.dash}>—</Text>
        <Text style={styles.period}>{period}</Text>
        {status && <Text style={styles.status}>{status}</Text>}
      </View>
      <View style={styles.teamSection}>
        <Text style={styles.teamName} numberOfLines={1}>{awayTeamName}</Text>
        <Animated.Text style={[styles.score, { transform: [{ scale: awayAnim }] }]}>
          {awayScore}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  score: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dash: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 28,
    fontWeight: 'bold',
  },
  period: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  status: {
    color: Colors.successGreen,
    fontSize: FontSize.xs,
    fontWeight: 'bold',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  compactTeam: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  compactScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactScore: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  compactDash: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
