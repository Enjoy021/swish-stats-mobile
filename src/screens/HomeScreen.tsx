import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getTeams, getGames, getGameEvents } from '../database/storage';
import { calculateScore } from '../utils/boxScore';
import type { Team, Game } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameScores, setGameScores] = useState<Record<string, { home: number; away: number }>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [t, g] = await Promise.all([getTeams(), getGames()]);
    setTeams(t);
    setGames(g.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    const names: Record<string, string> = {};
    for (const team of t) names[team.id] = team.name;
    setTeamNames(names);

    const scores: Record<string, { home: number; away: number }> = {};
    for (const game of g) {
      const events = await getGameEvents(game.id);
      scores[game.id] = {
        home: calculateScore(events, game.homeTeamId),
        away: calculateScore(events, game.awayTeamId),
      };
    }
    setGameScores(scores);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const liveGames = games.filter(g => g.status === 'live' || g.status === 'paused');
  const completedGames = games.filter(g => g.status === 'completed');
  const recentGames = games.slice(0, 5);

  const getStatusBadge = (status: Game['status']) => {
    switch (status) {
      case 'live': return { label: 'LIVE', color: Colors.successGreen };
      case 'paused': return { label: 'PAUSED', color: Colors.accentOrange };
      case 'completed': return { label: 'FINAL', color: Colors.textMuted };
      default: return { label: 'SETUP', color: Colors.textMuted };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Hero section */}
      <View style={styles.hero}>
        <MaterialCommunityIcons name="basketball" size={40} color={Colors.accentOrange} />
        <Text style={styles.heroTitle}>Swish Stats</Text>
        <Text style={styles.heroSubtitle}>FIBA Basketball Statistics</Text>
        <TouchableOpacity
          style={styles.newGameButton}
          onPress={() => navigation.navigate('GameSetup')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={22} color={Colors.white} />
          <Text style={styles.newGameText}>New Game</Text>
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{games.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedGames.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, liveGames.length > 0 && { color: Colors.successGreen }]}>
            {liveGames.length}
          </Text>
          <Text style={styles.statLabel}>Live</Text>
        </View>
      </View>

      {/* My Teams */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Teams</Text>
        {teams.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Teams' } as any)}
          >
            <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Create your first team</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            horizontal
            data={teams}
            keyExtractor={t => t.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.teamCard}
                onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
              >
                <MaterialCommunityIcons name="shield" size={24} color={Colors.accentOrange} />
                <Text style={styles.teamCardName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Recent Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Games</Text>
        {recentGames.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No games yet</Text>
          </View>
        ) : (
          recentGames.map(game => {
            const badge = getStatusBadge(game.status);
            const scores = gameScores[game.id];
            return (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => {
                  if (game.status === 'live' || game.status === 'paused') {
                    navigation.navigate('LiveScoring', { gameId: game.id });
                  } else if (game.status === 'completed') {
                    navigation.navigate('BoxScore', { gameId: game.id });
                  }
                }}
              >
                <View style={styles.gameCardContent}>
                  <View style={styles.gameTeams}>
                    <Text style={styles.gameTeamName} numberOfLines={1}>
                      {teamNames[game.homeTeamId] || 'Home'}
                    </Text>
                    <Text style={styles.gameScore}>
                      {scores ? `${scores.home} — ${scores.away}` : '0 — 0'}
                    </Text>
                    <Text style={styles.gameTeamName} numberOfLines={1}>
                      {teamNames[game.awayTeamId] || 'Away'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.color + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                    <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 32,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: FontSize.title,
    fontWeight: 'bold',
    marginTop: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    marginTop: 4,
    letterSpacing: 1,
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
    marginTop: 20,
    gap: 8,
    minHeight: TouchTarget.min,
  },
  newGameText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: 8,
  },
  teamCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginRight: Spacing.sm,
    alignItems: 'center',
    minWidth: 100,
    minHeight: TouchTarget.min,
  },
  teamCardName: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 6,
  },
  gameCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: TouchTarget.min,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameTeams: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTeamName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  gameScore: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
  },
});
