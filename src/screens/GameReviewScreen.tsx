import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import {
  getGame, getTeam, getPlayersByTeam, getGameEvents,
} from '../database/storage';
import { calculateScore, getRunningScore, pct } from '../utils/boxScore';
import { calculateAdvancedStats } from '../utils/stats';
import type { Game, Team, Player, GameEvent, AdvancedStats } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EVENT_LABELS: Record<string, string> = {
  '2pt_made': '2PT Made',
  '2pt_attempt': '2PT Miss',
  '3pt_made': '3PT Made',
  '3pt_attempt': '3PT Miss',
  'ft_made': 'FT Made',
  'ft_attempt': 'FT Miss',
  'offensive_rebound': 'Off Rebound',
  'defensive_rebound': 'Def Rebound',
  'team_rebound': 'Team Rebound',
  'assist': 'Assist',
  'turnover': 'Turnover',
  'steal': 'Steal',
  'block': 'Block',
  'personal_foul': 'Personal Foul',
  'technical_foul': 'Technical Foul',
  'unsportsmanlike_foul': 'Unsportsmanlike',
  'foul_drawn': 'Foul Drawn',
  'substitution_in': 'Sub In',
  'substitution_out': 'Sub Out',
  'timeout': 'Timeout',
  'period_start': 'Period Start',
  'period_end': 'Period End',
};

export default function GameReviewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<Nav>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [teamFilter, setTeamFilter] = useState<'all' | 'home' | 'away'>('all');
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'scoring' | 'fouls' | 'turnovers'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const g = await getGame(gameId);
    if (!g) return;
    setGame(g);

    const [ht, at, hp, ap, ev] = await Promise.all([
      getTeam(g.homeTeamId),
      getTeam(g.awayTeamId),
      getPlayersByTeam(g.homeTeamId),
      getPlayersByTeam(g.awayTeamId),
      getGameEvents(gameId),
    ]);

    setHomeTeam(ht || null);
    setAwayTeam(at || null);
    setHomePlayers(hp);
    setAwayPlayers(ap);
    setEvents(ev);

    if (ht && at) {
      const adv = calculateAdvancedStats(ev, g.homeTeamId, g.awayTeamId, hp, ap);
      setAdvanced(adv);
    }
    setLoading(false);
  };

  const allPlayers = useMemo(() => {
    const map: Record<string, Player> = {};
    for (const p of [...homePlayers, ...awayPlayers]) {
      map[p.id] = p;
    }
    return map;
  }, [homePlayers, awayPlayers]);

  const periods = useMemo(() => {
    const set = new Set<number>();
    for (const e of events) set.add(e.quarter);
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filteredEvents = useMemo(() => {
    let ev = events.filter(e => !e.isDeleted);

    if (teamFilter === 'home' && game) {
      ev = ev.filter(e => e.teamId === game.homeTeamId);
    } else if (teamFilter === 'away' && game) {
      ev = ev.filter(e => e.teamId === game.awayTeamId);
    }

    if (periodFilter !== null) {
      ev = ev.filter(e => e.quarter === periodFilter);
    }

    if (typeFilter === 'scoring') {
      ev = ev.filter(e =>
        e.eventType === '2pt_made' || e.eventType === '3pt_made' ||
        e.eventType === 'ft_made' || e.eventType === '2pt_attempt' ||
        e.eventType === '3pt_attempt' || e.eventType === 'ft_attempt'
      );
    } else if (typeFilter === 'fouls') {
      ev = ev.filter(e =>
        e.eventType === 'personal_foul' || e.eventType === 'technical_foul' ||
        e.eventType === 'unsportsmanlike_foul' || e.eventType === 'foul_drawn'
      );
    } else if (typeFilter === 'turnovers') {
      ev = ev.filter(e =>
        e.eventType === 'turnover' || e.eventType === 'steal'
      );
    }

    return ev.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [events, teamFilter, periodFilter, typeFilter, game]);

  const getEventColor = (e: GameEvent): string => {
    if (e.eventType.includes('made')) return Colors.successGreen;
    if (e.eventType.includes('attempt') || e.eventType.includes('miss')) return Colors.shotMissed;
    if (e.eventType.includes('foul')) return Colors.warning;
    if (e.eventType === 'turnover') return Colors.error;
    if (e.eventType === 'steal' || e.eventType === 'block') return Colors.accentOrange;
    return Colors.textMuted;
  };

  const getPeriodLabel = (period: number): string => {
    if (!game) return `P${period}`;
    const maxRegular = game.gameFormat === 'quarters' ? 4 : 2;
    if (period <= maxRegular) {
      return game.gameFormat === 'quarters' ? `Q${period}` : `H${period}`;
    }
    return `OT${period - maxRegular}`;
  };

  if (loading || !game || !homeTeam || !awayTeam) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accentOrange} />
      </View>
    );
  }

  const renderEvent = (event: GameEvent, index: number) => {
    const player = event.playerId ? allPlayers[event.playerId] : null;
    const isHome = event.teamId === game.homeTeamId;
    const teamName = isHome ? homeTeam.name : awayTeam.name;

    // Calculate running score at this event
    const allActive = events.filter(e => !e.isDeleted).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const eventIdx = allActive.findIndex(e => e.id === event.id);
    const hScore = eventIdx >= 0 ? getRunningScore(allActive, eventIdx, game.homeTeamId) : 0;
    const aScore = eventIdx >= 0 ? getRunningScore(allActive, eventIdx, game.awayTeamId) : 0;

    return (
      <View key={event.id} style={[styles.eventRow, index % 2 === 0 && styles.eventEvenRow]}>
        <View style={styles.eventScoreCol}>
          <Text style={styles.eventScoreText}>{hScore}-{aScore}</Text>
        </View>
        <View style={[styles.eventDot, { backgroundColor: getEventColor(event) }]} />
        <View style={styles.eventContent}>
          <Text style={styles.eventLabel}>
            {EVENT_LABELS[event.eventType] || event.eventType}
          </Text>
          {player && (
            <Text style={styles.eventPlayer}>#{player.number} {player.name}</Text>
          )}
          <Text style={styles.eventMeta}>
            {getPeriodLabel(event.quarter)} • {teamName}
            {event.metadata?.turnoverType ? ` • ${event.metadata.turnoverType}` : ''}
            {event.metadata?.foulType ? ` • ${event.metadata.foulType}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'home', 'away'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, teamFilter === f && styles.filterBtnActive]}
            onPress={() => setTeamFilter(f)}
          >
            <Text style={[styles.filterText, teamFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Both' : f === 'home' ? homeTeam.name : awayTeam.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodFilterRow}>
        <TouchableOpacity
          style={[styles.periodChip, periodFilter === null && styles.periodChipActive]}
          onPress={() => setPeriodFilter(null)}
        >
          <Text style={[styles.periodChipText, periodFilter === null && styles.periodChipTextActive]}>All</Text>
        </TouchableOpacity>
        {periods.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, periodFilter === p && styles.periodChipActive]}
            onPress={() => setPeriodFilter(periodFilter === p ? null : p)}
          >
            <Text style={[styles.periodChipText, periodFilter === p && styles.periodChipTextActive]}>
              {getPeriodLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'scoring', 'fouls', 'turnovers'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, typeFilter === f && styles.filterBtnActive]}
            onPress={() => setTypeFilter(f)}
          >
            <Text style={[styles.filterText, typeFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Event count */}
      <Text style={styles.countText}>{filteredEvents.length} events</Text>

      {/* Play-by-play */}
      {filteredEvents.map((e, i) => renderEvent(e, i))}

      {/* Advanced stats */}
      {advanced && (
        <>
          <Text style={styles.sectionTitle}>Advanced Stats</Text>
          <View style={styles.advancedTable}>
            <View style={styles.advRow}>
              <Text style={[styles.advCell, styles.advLabel, styles.advHeader]}>Stat</Text>
              <Text style={[styles.advCell, styles.advHeader]}>{homeTeam.name}</Text>
              <Text style={[styles.advCell, styles.advHeader]}>{awayTeam.name}</Text>
            </View>
            {[
              { label: 'Pts in Paint', h: advanced.homePointsInPaint, a: advanced.awayPointsInPaint },
              { label: '2nd Chance Pts', h: advanced.homeSecondChancePoints, a: advanced.awaySecondChancePoints },
              { label: 'Bench Points', h: advanced.homeBenchPoints, a: advanced.awayBenchPoints },
              { label: 'Biggest Run', h: advanced.homeBiggestRun, a: advanced.awayBiggestRun },
            ].map((row, i) => (
              <View key={row.label} style={[styles.advRow, i % 2 === 0 && styles.advEvenRow]}>
                <Text style={[styles.advCell, styles.advLabel]}>{row.label}</Text>
                <Text style={styles.advCell}>{row.h}</Text>
                <Text style={styles.advCell}>{row.a}</Text>
              </View>
            ))}
            <View style={[styles.advRow, styles.advEvenRow]}>
              <Text style={[styles.advCell, styles.advLabel]}>Lead Changes</Text>
              <Text style={[styles.advCell, { flex: 2 }]}>{advanced.leadChanges}</Text>
            </View>
            <View style={styles.advRow}>
              <Text style={[styles.advCell, styles.advLabel]}>Times Tied</Text>
              <Text style={[styles.advCell, { flex: 2 }]}>{advanced.timesTied}</Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  filterBtnActive: { borderColor: Colors.accentOrange, backgroundColor: '#fff7ed' },
  filterText: { fontSize: FontSize.xs, color: Colors.textMuted },
  filterTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  periodFilterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 36,
    justifyContent: 'center',
  },
  periodChipActive: { borderColor: Colors.accentOrange, backgroundColor: '#fff7ed' },
  periodChipText: { fontSize: FontSize.sm, color: Colors.textMuted },
  periodChipTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  countText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  eventEvenRow: { backgroundColor: Colors.card },
  eventScoreCol: { width: 44, alignItems: 'center' },
  eventScoreText: { fontSize: FontSize.xs, fontWeight: 'bold', color: Colors.primaryNavy },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventContent: { flex: 1 },
  eventLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  eventPlayer: { fontSize: FontSize.sm, color: Colors.textPrimary },
  eventMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  advancedTable: { marginHorizontal: Spacing.md, marginBottom: Spacing.lg },
  advRow: { flexDirection: 'row', paddingVertical: 8 },
  advEvenRow: { backgroundColor: Colors.card },
  advHeader: {
    fontWeight: 'bold',
    color: Colors.white,
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 8,
  },
  advCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingHorizontal: 4,
  },
  advLabel: { textAlign: 'left', fontWeight: '600', paddingLeft: 8 },
});
