import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getGames, getTeams, getGameEvents } from '../database/storage';
import { calculateScore } from '../utils/boxScore';
import type { Game, Team } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GamesScreen() {
  const navigation = useNavigation<Nav>();
  const [games, setGames] = useState<Game[]>([]);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [g, t] = await Promise.all([getGames(), getTeams()]);
    const sorted = g.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setGames(sorted);

    const names: Record<string, string> = {};
    for (const team of t) names[team.id] = team.name;
    setTeamNames(names);

    const sc: Record<string, { home: number; away: number }> = {};
    for (const game of sorted) {
      const events = await getGameEvents(game.id);
      sc[game.id] = {
        home: calculateScore(events, game.homeTeamId),
        away: calculateScore(events, game.awayTeamId),
      };
    }
    setScores(sc);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusStyle = (status: Game['status']) => {
    switch (status) {
      case 'live': return { label: 'LIVE', bg: Colors.successGreen + '22', color: Colors.successGreen };
      case 'paused': return { label: 'PAUSED', bg: Colors.accentOrange + '22', color: Colors.accentOrange };
      case 'completed': return { label: 'FINAL', bg: Colors.textMuted + '22', color: Colors.textMuted };
      default: return { label: 'SETUP', bg: Colors.textMuted + '22', color: Colors.textMuted };
    }
  };

  const handlePress = (game: Game) => {
    if (game.status === 'live' || game.status === 'paused') {
      navigation.navigate('LiveScoring', { gameId: game.id });
    } else if (game.status === 'completed') {
      navigation.navigate('BoxScore', { gameId: game.id });
    } else if (game.status === 'setup') {
      navigation.navigate('LiveScoring', { gameId: game.id });
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={games}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Games</Text>
            <Text style={styles.emptyText}>Start a new game from the Home screen</Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = getStatusStyle(item.status);
          const sc = scores[item.id];
          const date = item.gameDate
            ? new Date(item.gameDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
            : new Date(item.createdAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
          return (
            <TouchableOpacity style={styles.gameCard} onPress={() => handlePress(item)}>
              <View style={styles.gameHeader}>
                <Text style={styles.gameDate}>{date}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  {item.status === 'live' && <View style={[styles.dot, { backgroundColor: s.color }]} />}
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <View style={styles.matchup}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {teamNames[item.homeTeamId] || 'Home'}
                </Text>
                <Text style={styles.score}>
                  {sc ? `${sc.home} — ${sc.away}` : '0 — 0'}
                </Text>
                <Text style={styles.teamName} numberOfLines={1}>
                  {teamNames[item.awayTeamId] || 'Away'}
                </Text>
              </View>
              {item.venue && <Text style={styles.venue}>{item.venue}</Text>}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('GameSetup')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg },
  gameCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.card,
    padding: Spacing.lg, marginBottom: Spacing.sm,
  },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gameDate: { fontSize: FontSize.sm, color: Colors.textMuted },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: 'bold' },
  matchup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  score: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textPrimary, marginHorizontal: 12 },
  venue: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: 4 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accentOrange, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
});
