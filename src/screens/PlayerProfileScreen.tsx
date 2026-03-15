import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '../theme/colors';
import { getPlayer, getTeam, getGames, getPlayers, getTeams } from '../database/storage';
import { getAllGameEvents } from '../database/storage';
import { calculatePlayerSeasonStats } from '../utils/stats';
import { pct } from '../utils/boxScore';
import type { Player, Team } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PlayerProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<Nav>();
  const { playerId } = route.params;

  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [averages, setAverages] = useState<any>(null);
  const [gameLog, setGameLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getPlayer(playerId);
    if (!p) return;
    setPlayer(p);

    const t = await getTeam(p.teamId);
    setTeam(t || null);

    const [games, allEvents, allPlayers, allTeams] = await Promise.all([
      getGames(),
      getAllGameEvents(),
      getPlayers(),
      getTeams(),
    ]);

    const { perGame, averages: avg } = calculatePlayerSeasonStats(
      playerId, games, allEvents, allPlayers, allTeams,
    );

    setAverages(avg);
    setGameLog(perGame.sort((a: any, b: any) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    }));
    setLoading(false);
  };

  if (loading || !player) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accentOrange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Player card */}
      <View style={styles.playerCard}>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>#{player.number}</Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerMeta}>
            {player.position} {team ? `• ${team.name}` : ''}
          </Text>
        </View>
      </View>

      {/* Season averages */}
      {averages && averages.gamesPlayed > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            Season Averages ({averages.gamesPlayed} {averages.gamesPlayed === 1 ? 'game' : 'games'})
          </Text>
          <View style={styles.avgGrid}>
            {[
              { label: 'PPG', value: averages.ppg },
              { label: 'RPG', value: averages.rpg },
              { label: 'APG', value: averages.apg },
              { label: 'SPG', value: averages.spg },
              { label: 'BPG', value: averages.bpg },
              { label: 'TOPG', value: averages.topg },
              { label: 'FG%', value: `${averages.fgPct}%` },
              { label: '3PT%', value: `${averages.threePtPct}%` },
              { label: 'FT%', value: `${averages.ftPct}%` },
              { label: 'EFF', value: averages.eff },
            ].map(stat => (
              <View key={stat.label} style={styles.avgItem}>
                <Text style={styles.avgValue}>{stat.value}</Text>
                <Text style={styles.avgLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Game log */}
      <Text style={styles.sectionTitle}>Game Log</Text>
      {gameLog.length === 0 ? (
        <Text style={styles.emptyText}>No completed games yet</Text>
      ) : (
        <View style={styles.gameLogTable}>
          {/* Header */}
          <View style={styles.logHeader}>
            <Text style={[styles.logCell, styles.logDateCell, styles.logHeaderText]}>Date</Text>
            <Text style={[styles.logCell, styles.logOppCell, styles.logHeaderText]}>Opp</Text>
            <Text style={[styles.logCell, styles.logHeaderText]}>PTS</Text>
            <Text style={[styles.logCell, styles.logHeaderText]}>REB</Text>
            <Text style={[styles.logCell, styles.logHeaderText]}>AST</Text>
            <Text style={[styles.logCell, styles.logHeaderText]}>FG</Text>
            <Text style={[styles.logCell, styles.logHeaderText]}>3PT</Text>
          </View>

          {gameLog.map((g: any, i: number) => (
            <View
              key={g.gameId}
              style={[styles.logRow, i % 2 === 0 && styles.logEvenRow]}
            >
              <Text style={[styles.logCell, styles.logDateCell]} numberOfLines={1}>
                {formatDate(g.date)}
              </Text>
              <Text style={[styles.logCell, styles.logOppCell]} numberOfLines={1}>
                {g.isHome ? 'vs' : '@'} {g.opponent}
              </Text>
              <Text style={[styles.logCell, styles.logBold]}>{g.points}</Text>
              <Text style={styles.logCell}>{g.reb}</Text>
              <Text style={styles.logCell}>{g.ast}</Text>
              <Text style={styles.logCell}>{g.fgm}-{g.fga}</Text>
              <Text style={styles.logCell}>{g.threePm}-{g.threePa}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryNavy,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  numberCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: 'bold' },
  playerInfo: { flex: 1 },
  playerName: { color: Colors.white, fontSize: FontSize.xl, fontWeight: 'bold' },
  playerMeta: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  avgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
  },
  avgItem: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  avgValue: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.textPrimary },
  avgLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.md,
    padding: Spacing.xl,
  },
  gameLogTable: { marginHorizontal: Spacing.md },
  logHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  logHeaderText: { color: Colors.white, fontWeight: 'bold' },
  logRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  logEvenRow: { backgroundColor: Colors.card },
  logCell: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  logDateCell: { flex: 1.2, textAlign: 'left', paddingLeft: 8 },
  logOppCell: { flex: 1.8, textAlign: 'left' },
  logBold: { fontWeight: 'bold' },
});
