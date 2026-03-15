import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getGame, getTeam, getPlayersByTeam, getGameEvents } from '../database/storage';
import { pct } from '../utils/boxScore';
import CourtDiagram, { COURT_ZONES } from '../components/CourtDiagram';
import type { Game, Team, Player, GameEvent } from '../types';

export default function ShotChartScreen() {
  const route = useRoute<any>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [teamFilter, setTeamFilter] = useState<'all' | 'home' | 'away'>('all');
  const [playerFilter, setPlayerFilter] = useState<string | null>(null);
  const [shotTypeFilter, setShotTypeFilter] = useState<'all' | '2pt' | '3pt'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'made' | 'missed'>('all');
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
    setHomePlayers(hp.sort((a, b) => a.number - b.number));
    setAwayPlayers(ap.sort((a, b) => a.number - b.number));
    setEvents(ev);
    setLoading(false);
  };

  const shotEvents = useMemo(() => {
    return events.filter(e =>
      !e.isDeleted &&
      e.courtX != null &&
      e.courtY != null &&
      (e.eventType === '2pt_made' || e.eventType === '2pt_attempt' ||
       e.eventType === '3pt_made' || e.eventType === '3pt_attempt')
    );
  }, [events]);

  const filteredShots = useMemo(() => {
    let shots = shotEvents;

    if (teamFilter === 'home' && game) {
      shots = shots.filter(e => e.teamId === game.homeTeamId);
    } else if (teamFilter === 'away' && game) {
      shots = shots.filter(e => e.teamId === game.awayTeamId);
    }

    if (playerFilter) {
      shots = shots.filter(e => e.playerId === playerFilter);
    }

    if (shotTypeFilter === '2pt') {
      shots = shots.filter(e => e.eventType === '2pt_made' || e.eventType === '2pt_attempt');
    } else if (shotTypeFilter === '3pt') {
      shots = shots.filter(e => e.eventType === '3pt_made' || e.eventType === '3pt_attempt');
    }

    if (resultFilter === 'made') {
      shots = shots.filter(e => e.eventType === '2pt_made' || e.eventType === '3pt_made');
    } else if (resultFilter === 'missed') {
      shots = shots.filter(e => e.eventType === '2pt_attempt' || e.eventType === '3pt_attempt');
    }

    return shots;
  }, [shotEvents, teamFilter, playerFilter, shotTypeFilter, resultFilter, game]);

  const stats = useMemo(() => {
    const total = filteredShots.length;
    const made = filteredShots.filter(e => e.eventType === '2pt_made' || e.eventType === '3pt_made').length;
    const twoPtAttempts = filteredShots.filter(e => e.eventType === '2pt_made' || e.eventType === '2pt_attempt').length;
    const twoPtMade = filteredShots.filter(e => e.eventType === '2pt_made').length;
    const threePtAttempts = filteredShots.filter(e => e.eventType === '3pt_made' || e.eventType === '3pt_attempt').length;
    const threePtMade = filteredShots.filter(e => e.eventType === '3pt_made').length;

    return { total, made, twoPtAttempts, twoPtMade, threePtAttempts, threePtMade };
  }, [filteredShots]);

  const activePlayers = useMemo(() => {
    if (teamFilter === 'home') return homePlayers;
    if (teamFilter === 'away') return awayPlayers;
    return [...homePlayers, ...awayPlayers];
  }, [teamFilter, homePlayers, awayPlayers]);

  if (loading || !game || !homeTeam || !awayTeam) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accentOrange} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Team filter */}
      <View style={styles.filterRow}>
        {(['all', 'home', 'away'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, teamFilter === f && styles.filterBtnActive]}
            onPress={() => { setTeamFilter(f); setPlayerFilter(null); }}
          >
            <Text style={[styles.filterText, teamFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Both' : f === 'home' ? homeTeam.name : awayTeam.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Player filter */}
      {teamFilter !== 'all' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerFilterRow}>
          <TouchableOpacity
            style={[styles.playerChip, !playerFilter && styles.playerChipActive]}
            onPress={() => setPlayerFilter(null)}
          >
            <Text style={[styles.playerChipText, !playerFilter && styles.playerChipTextActive]}>All</Text>
          </TouchableOpacity>
          {activePlayers.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.playerChip, playerFilter === p.id && styles.playerChipActive]}
              onPress={() => setPlayerFilter(playerFilter === p.id ? null : p.id)}
            >
              <Text style={[styles.playerChipText, playerFilter === p.id && styles.playerChipTextActive]}>
                #{p.number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Shot type / result filters */}
      <View style={styles.filterRow}>
        {(['all', '2pt', '3pt'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, shotTypeFilter === f && styles.filterBtnActive]}
            onPress={() => setShotTypeFilter(f)}
          >
            <Text style={[styles.filterText, shotTypeFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All Shots' : f === '2pt' ? '2-Point' : '3-Point'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'made', 'missed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, resultFilter === f && styles.filterBtnActive]}
            onPress={() => setResultFilter(f)}
          >
            <Text style={[styles.filterText, resultFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All Results' : f === 'made' ? 'Makes' : 'Misses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Court */}
      <View style={styles.courtContainer}>
        <CourtDiagram shots={filteredShots} showLabels />
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.made}/{stats.total}</Text>
          <Text style={styles.statLabel}>FG</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{pct(stats.made, stats.total)}%</Text>
          <Text style={styles.statLabel}>FG%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.twoPtMade}/{stats.twoPtAttempts}</Text>
          <Text style={styles.statLabel}>2PT</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.threePtMade}/{stats.threePtAttempts}</Text>
          <Text style={styles.statLabel}>3PT</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.shotMade }]} />
          <Text style={styles.legendText}>Made</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendX}>X</Text>
          <Text style={styles.legendText}>Missed</Text>
        </View>
      </View>

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
  filterText: { fontSize: FontSize.sm, color: Colors.textMuted },
  filterTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  playerFilterRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  playerChip: {
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
  playerChipActive: { borderColor: Colors.accentOrange, backgroundColor: '#fff7ed' },
  playerChipText: { fontSize: FontSize.sm, color: Colors.textMuted },
  playerChipTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  courtContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendX: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.shotMissed },
  legendText: { fontSize: FontSize.sm, color: Colors.textMuted },
});
