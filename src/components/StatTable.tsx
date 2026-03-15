import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme/colors';
import type { PlayerBoxScore, TeamBoxScore } from '../types';
import { pct } from '../utils/boxScore';

interface Props {
  boxScore: TeamBoxScore;
}

const COLUMNS = [
  { key: 'player', label: 'Player', width: 130, align: 'left' as const },
  { key: 'pts', label: 'PTS', width: 40 },
  { key: 'fg', label: 'FG', width: 50 },
  { key: 'fgPct', label: 'FG%', width: 50 },
  { key: '3pt', label: '3PT', width: 50 },
  { key: '3pPct', label: '3P%', width: 50 },
  { key: 'ft', label: 'FT', width: 50 },
  { key: 'ftPct', label: 'FT%', width: 50 },
  { key: 'reb', label: 'REB', width: 40 },
  { key: 'ast', label: 'AST', width: 40 },
  { key: 'stl', label: 'STL', width: 40 },
  { key: 'blk', label: 'BLK', width: 40 },
  { key: 'to', label: 'TO', width: 35 },
  { key: 'pf', label: 'PF', width: 35 },
];

export default function StatTable({ boxScore }: Props) {
  const renderPlayerRow = (p: PlayerBoxScore, index: number) => (
    <View key={p.playerId} style={[styles.row, index % 2 === 0 && styles.evenRow]}>
      <Text style={[styles.cell, styles.playerCell]} numberOfLines={1}>
        #{p.playerNumber} {p.playerName}
      </Text>
      <Text style={[styles.cell, styles.ptsCell]}>{p.points}</Text>
      <Text style={styles.cell}>{p.fgm}-{p.fga}</Text>
      <Text style={styles.cell}>{pct(p.fgm, p.fga)}</Text>
      <Text style={styles.cell}>{p.threePm}-{p.threePa}</Text>
      <Text style={styles.cell}>{pct(p.threePm, p.threePa)}</Text>
      <Text style={styles.cell}>{p.ftm}-{p.fta}</Text>
      <Text style={styles.cell}>{pct(p.ftm, p.fta)}</Text>
      <Text style={styles.cell}>{p.reb}</Text>
      <Text style={styles.cell}>{p.ast}</Text>
      <Text style={styles.cell}>{p.stl}</Text>
      <Text style={styles.cell}>{p.blk}</Text>
      <Text style={styles.cell}>{p.to}</Text>
      <Text style={styles.cell}>{p.pf}</Text>
    </View>
  );

  const t = boxScore.totals;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.headerRow}>
          {COLUMNS.map(col => (
            <Text
              key={col.key}
              style={[
                styles.headerCell,
                col.key === 'player' && styles.playerCell,
                col.key === 'pts' && styles.ptsCell,
              ]}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {/* Player rows */}
        {boxScore.players.map(renderPlayerRow)}

        {/* Totals */}
        <View style={styles.totalsRow}>
          <Text style={[styles.cell, styles.playerCell, styles.totalsText]}>TOTALS</Text>
          <Text style={[styles.cell, styles.ptsCell, styles.totalsText]}>{t.points}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.fgm}-{t.fga}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{pct(t.fgm, t.fga)}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.threePm}-{t.threePa}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{pct(t.threePm, t.threePa)}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.ftm}-{t.fta}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{pct(t.ftm, t.fta)}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.reb}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.ast}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.stl}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.blk}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.to}</Text>
          <Text style={[styles.cell, styles.totalsText]}>{t.pf}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 700,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryNavy,
    paddingVertical: 8,
  },
  headerCell: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  evenRow: {
    backgroundColor: Colors.card,
  },
  cell: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    width: 45,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  playerCell: {
    width: 130,
    textAlign: 'left',
    paddingLeft: 8,
  },
  ptsCell: {
    fontWeight: 'bold',
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
  },
  totalsText: {
    fontWeight: 'bold',
  },
});
