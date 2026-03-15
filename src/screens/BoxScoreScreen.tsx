import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getGame, getTeam, getPlayersByTeam, getGameEvents } from '../database/storage';
import { calculateBoxScore, calculateScore, pct } from '../utils/boxScore';
import { calculateAdvancedStats } from '../utils/stats';
import { generateAndSharePdf } from '../utils/pdfReport';
import StatTable from '../components/StatTable';
import type { Game, Team, Player, GameEvent, TeamBoxScore, AdvancedStats } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function BoxScoreScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<Nav>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homeBox, setHomeBox] = useState<TeamBoxScore | null>(null);
  const [awayBox, setAwayBox] = useState<TeamBoxScore | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const g = await getGame(gameId);
    if (!g) return;
    setGame(g);

    const [ht, at, hp, ap, events] = await Promise.all([
      getTeam(g.homeTeamId),
      getTeam(g.awayTeamId),
      getPlayersByTeam(g.homeTeamId),
      getPlayersByTeam(g.awayTeamId),
      getGameEvents(gameId),
    ]);

    if (!ht || !at) return;
    setHomeTeam(ht);
    setAwayTeam(at);

    const hbs = calculateBoxScore(g.homeTeamId, ht.name, hp, events);
    const abs = calculateBoxScore(g.awayTeamId, at.name, ap, events);
    setHomeBox(hbs);
    setAwayBox(abs);

    const adv = calculateAdvancedStats(events, g.homeTeamId, g.awayTeamId, hp, ap);
    setAdvanced(adv);
    setLoading(false);
  };

  const handleShare = async () => {
    if (!game || !homeTeam || !awayTeam || !homeBox || !awayBox) return;
    try {
      await generateAndSharePdf(game, homeTeam, awayTeam, homeBox, awayBox, advanced || undefined);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  if (loading || !game || !homeTeam || !awayTeam || !homeBox || !awayBox) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accentOrange} />
      </View>
    );
  }

  const homeScore = homeBox.totals.points;
  const awayScore = awayBox.totals.points;
  const activeBox = activeTab === 'home' ? homeBox : awayBox;

  const comparisonRows = [
    { label: 'Points', home: homeBox.totals.points, away: awayBox.totals.points },
    { label: 'FG%', home: pct(homeBox.totals.fgm, homeBox.totals.fga) + '%', away: pct(awayBox.totals.fgm, awayBox.totals.fga) + '%' },
    { label: '3PT%', home: pct(homeBox.totals.threePm, homeBox.totals.threePa) + '%', away: pct(awayBox.totals.threePm, awayBox.totals.threePa) + '%' },
    { label: 'FT%', home: pct(homeBox.totals.ftm, homeBox.totals.fta) + '%', away: pct(awayBox.totals.ftm, awayBox.totals.fta) + '%' },
    { label: 'Rebounds', home: homeBox.totals.reb, away: awayBox.totals.reb },
    { label: 'Assists', home: homeBox.totals.ast, away: awayBox.totals.ast },
    { label: 'Steals', home: homeBox.totals.stl, away: awayBox.totals.stl },
    { label: 'Blocks', home: homeBox.totals.blk, away: awayBox.totals.blk },
    { label: 'Turnovers', home: homeBox.totals.to, away: awayBox.totals.to },
  ];

  if (advanced) {
    comparisonRows.push(
      { label: 'Pts in Paint', home: advanced.homePointsInPaint, away: advanced.awayPointsInPaint },
      { label: '2nd Chance Pts', home: advanced.homeSecondChancePoints, away: advanced.awaySecondChancePoints },
      { label: 'Bench Points', home: advanced.homeBenchPoints, away: advanced.awayBenchPoints },
      { label: 'Biggest Run', home: advanced.homeBiggestRun, away: advanced.awayBiggestRun },
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Score header */}
      <View style={styles.scoreHeader}>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{homeTeam.name}</Text>
          <Text style={styles.score}>{homeScore}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {game.status === 'completed' ? 'FINAL' : game.status.toUpperCase()}
          </Text>
          {game.gameDate && (
            <Text style={styles.dateText}>{game.gameDate}</Text>
          )}
        </View>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{awayTeam.name}</Text>
          <Text style={styles.score}>{awayScore}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ShotChart', { gameId })}
        >
          <Ionicons name="map" size={18} color={Colors.accentOrange} />
          <Text style={styles.actionText}>Shot Chart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('GameReview', { gameId })}
        >
          <Ionicons name="list" size={18} color={Colors.accentOrange} />
          <Text style={styles.actionText}>Play-by-Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color={Colors.accentOrange} />
          <Text style={styles.actionText}>Share PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Team tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'home' && styles.tabActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
            {homeTeam.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'away' && styles.tabActive]}
          onPress={() => setActiveTab('away')}
        >
          <Text style={[styles.tabText, activeTab === 'away' && styles.tabTextActive]}>
            {awayTeam.name}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Box score table */}
      <StatTable boxScore={activeBox} />

      {/* Team Comparison toggle */}
      <TouchableOpacity
        style={styles.comparisonToggle}
        onPress={() => setShowComparison(!showComparison)}
      >
        <Text style={styles.comparisonToggleText}>Team Comparison</Text>
        <Ionicons
          name={showComparison ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.accentOrange}
        />
      </TouchableOpacity>

      {showComparison && (
        <View style={styles.comparisonTable}>
          {/* Header */}
          <View style={styles.compRow}>
            <Text style={[styles.compCell, styles.compLabel, styles.compHeader]}>Stat</Text>
            <Text style={[styles.compCell, styles.compHeader]}>{homeTeam.name}</Text>
            <Text style={[styles.compCell, styles.compHeader]}>{awayTeam.name}</Text>
          </View>
          {comparisonRows.map((row, i) => (
            <View key={row.label} style={[styles.compRow, i % 2 === 0 && styles.compEven]}>
              <Text style={[styles.compCell, styles.compLabel]}>{row.label}</Text>
              <Text style={styles.compCell}>{row.home}</Text>
              <Text style={styles.compCell}>{row.away}</Text>
            </View>
          ))}
          {advanced && (
            <>
              <View style={[styles.compRow, comparisonRows.length % 2 === 0 && styles.compEven]}>
                <Text style={[styles.compCell, styles.compLabel]}>Lead Changes</Text>
                <Text style={[styles.compCell, { flex: 2 }]}>{advanced.leadChanges}</Text>
              </View>
              <View style={[styles.compRow, (comparisonRows.length + 1) % 2 === 0 && styles.compEven]}>
                <Text style={[styles.compCell, styles.compLabel]}>Times Tied</Text>
                <Text style={[styles.compCell, { flex: 2 }]}>{advanced.timesTied}</Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryNavy,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  teamScore: { alignItems: 'center', flex: 1 },
  teamName: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
  score: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: 'bold' },
  statusContainer: { alignItems: 'center', paddingHorizontal: Spacing.md },
  statusText: { color: Colors.accentOrange, fontSize: FontSize.sm, fontWeight: 'bold' },
  dateText: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: TouchTarget.min,
  },
  actionText: { fontSize: FontSize.sm, color: Colors.accentOrange, fontWeight: '600' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border },
  tab: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    minHeight: TouchTarget.min, justifyContent: 'center',
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.accentOrange },
  tabText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.accentOrange },
  comparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    minHeight: TouchTarget.min,
  },
  comparisonToggleText: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.textPrimary },
  comparisonTable: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  compRow: { flexDirection: 'row', paddingVertical: 8 },
  compEven: { backgroundColor: Colors.card },
  compHeader: { fontWeight: 'bold', color: Colors.white, backgroundColor: Colors.primaryNavy, paddingVertical: 8 },
  compCell: { flex: 1, textAlign: 'center', fontSize: FontSize.sm, color: Colors.textPrimary, paddingHorizontal: 4 },
  compLabel: { textAlign: 'left', fontWeight: '600', paddingLeft: 8 },
});
