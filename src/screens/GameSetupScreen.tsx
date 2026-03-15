import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getTeams, getPlayersByTeam, createGame, createGameEvent } from '../database/storage';
import type { Team, Player } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GameSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeStarters, setHomeStarters] = useState<Set<string>>(new Set());
  const [awayStarters, setAwayStarters] = useState<Set<string>>(new Set());
  const [gameFormat, setGameFormat] = useState<'quarters' | 'halves'>('quarters');
  const [periodLength, setPeriodLength] = useState('10');
  const [venue, setVenue] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    getTeams().then(setTeams);
  }, []);

  useEffect(() => {
    if (homeTeamId) {
      getPlayersByTeam(homeTeamId).then(p => {
        setHomePlayers(p.sort((a, b) => a.number - b.number));
        setHomeStarters(new Set());
      });
    }
  }, [homeTeamId]);

  useEffect(() => {
    if (awayTeamId) {
      getPlayersByTeam(awayTeamId).then(p => {
        setAwayPlayers(p.sort((a, b) => a.number - b.number));
        setAwayStarters(new Set());
      });
    }
  }, [awayTeamId]);

  const toggleStarter = (playerId: string, isHome: boolean) => {
    const [starters, setStarters] = isHome
      ? [homeStarters, setHomeStarters]
      : [awayStarters, setAwayStarters];
    const next = new Set(starters);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else if (next.size < 5) {
      next.add(playerId);
    }
    setStarters(next);
  };

  const isValid = homeTeamId && awayTeamId && homeTeamId !== awayTeamId &&
    homeStarters.size === 5 && awayStarters.size === 5;

  const handleStartGame = async () => {
    if (!isValid) return;
    const game = await createGame({
      homeTeamId,
      awayTeamId,
      status: 'live',
      gameFormat,
      periodLength: parseInt(periodLength, 10) || (gameFormat === 'quarters' ? 10 : 20),
      currentPeriod: 1,
      venue: venue.trim() || undefined,
      gameDate: gameDate || undefined,
    });

    // Create substitution_in events for starters
    for (const playerId of homeStarters) {
      await createGameEvent({
        gameId: game.id,
        playerId,
        teamId: homeTeamId,
        eventType: 'substitution_in',
        quarter: 1,
      });
    }
    for (const playerId of awayStarters) {
      await createGameEvent({
        gameId: game.id,
        playerId,
        teamId: awayTeamId,
        eventType: 'substitution_in',
        quarter: 1,
      });
    }

    // Create period_start event
    await createGameEvent({
      gameId: game.id,
      teamId: homeTeamId,
      eventType: 'period_start',
      quarter: 1,
    });

    navigation.replace('LiveScoring', { gameId: game.id });
  };

  const renderTeamPicker = (selectedId: string, onSelect: (id: string) => void, otherId: string) => (
    <View style={styles.pickerContainer}>
      {teams.filter(t => t.id !== otherId).map(team => (
        <TouchableOpacity
          key={team.id}
          style={[styles.pickerItem, selectedId === team.id && styles.pickerItemActive]}
          onPress={() => onSelect(team.id)}
        >
          <Text style={[styles.pickerText, selectedId === team.id && styles.pickerTextActive]}>
            {team.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlayerSelection = (players: Player[], starters: Set<string>, isHome: boolean) => (
    <View style={styles.playerList}>
      {players.map(player => {
        const selected = starters.has(player.id);
        return (
          <TouchableOpacity
            key={player.id}
            style={[styles.playerItem, selected && styles.playerItemActive]}
            onPress={() => toggleStarter(player.id, isHome)}
          >
            <View style={[styles.checkbox, selected && styles.checkboxActive]}>
              {selected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={styles.playerNumber}>#{player.number}</Text>
            <Text style={styles.playerItemName} numberOfLines={1}>{player.name}</Text>
            <Text style={styles.playerPos}>{player.position}</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.selectionCount}>{starters.size}/5 starters selected</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Home Team */}
      <Text style={styles.sectionTitle}>Home Team</Text>
      {renderTeamPicker(homeTeamId, setHomeTeamId, awayTeamId)}
      {homeTeamId && homePlayers.length > 0 && (
        <>
          <Text style={styles.subTitle}>Starting 5</Text>
          {renderPlayerSelection(homePlayers, homeStarters, true)}
        </>
      )}

      {/* VS Divider */}
      <View style={styles.vsDivider}>
        <View style={styles.vsLine} />
        <Text style={styles.vsText}>VS</Text>
        <View style={styles.vsLine} />
      </View>

      {/* Away Team */}
      <Text style={styles.sectionTitle}>Away Team</Text>
      {renderTeamPicker(awayTeamId, setAwayTeamId, homeTeamId)}
      {awayTeamId && awayPlayers.length > 0 && (
        <>
          <Text style={styles.subTitle}>Starting 5</Text>
          {renderPlayerSelection(awayPlayers, awayStarters, false)}
        </>
      )}

      {/* Game Format */}
      <Text style={styles.sectionTitle}>Game Format</Text>
      <View style={styles.formatRow}>
        <TouchableOpacity
          style={[styles.formatBtn, gameFormat === 'quarters' && styles.formatBtnActive]}
          onPress={() => { setGameFormat('quarters'); setPeriodLength('10'); }}
        >
          <Text style={[styles.formatText, gameFormat === 'quarters' && styles.formatTextActive]}>
            4 Quarters (4x10min)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formatBtn, gameFormat === 'halves' && styles.formatBtnActive]}
          onPress={() => { setGameFormat('halves'); setPeriodLength('20'); }}
        >
          <Text style={[styles.formatText, gameFormat === 'halves' && styles.formatTextActive]}>
            2 Halves (2x20min)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period length */}
      <View style={styles.row}>
        <Text style={styles.label}>Period Length (min)</Text>
        <TextInput
          style={styles.smallInput}
          value={periodLength}
          onChangeText={setPeriodLength}
          keyboardType="number-pad"
        />
      </View>

      {/* Venue */}
      <View style={styles.row}>
        <Text style={styles.label}>Venue</Text>
        <TextInput
          style={styles.textInput}
          value={venue}
          onChangeText={setVenue}
          placeholder="Optional"
        />
      </View>

      {/* Date */}
      <View style={styles.row}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.textInput}
          value={gameDate}
          onChangeText={setGameDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Start Game */}
      <TouchableOpacity
        style={[styles.startButton, !isValid && styles.startButtonDisabled]}
        onPress={handleStartGame}
        disabled={!isValid}
      >
        <Ionicons name="play" size={22} color={Colors.white} />
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>

      {!isValid && (
        <Text style={styles.validationText}>
          Select 2 different teams with 5 starters each
        </Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  subTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pickerItem: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.button,
    backgroundColor: Colors.card, borderWidth: 2, borderColor: 'transparent', minHeight: TouchTarget.min, justifyContent: 'center',
  },
  pickerItemActive: { borderColor: Colors.accentOrange, backgroundColor: '#fff7ed' },
  pickerText: { fontSize: FontSize.md, color: Colors.textPrimary },
  pickerTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  playerList: { gap: 4 },
  playerItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.sm,
    borderRadius: BorderRadius.button, backgroundColor: Colors.card, minHeight: TouchTarget.min,
  },
  playerItemActive: { backgroundColor: '#fff7ed' },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  checkboxActive: { backgroundColor: Colors.accentOrange, borderColor: Colors.accentOrange },
  playerNumber: { fontWeight: 'bold', fontSize: FontSize.sm, color: Colors.primaryNavy, width: 36 },
  playerItemName: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  playerPos: { fontSize: FontSize.sm, color: Colors.textMuted, marginLeft: 8 },
  selectionCount: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  vsDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  vsLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  vsText: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textMuted, paddingHorizontal: 16 },
  formatRow: { flexDirection: 'row', gap: Spacing.sm },
  formatBtn: {
    flex: 1, paddingVertical: 12, borderRadius: BorderRadius.button,
    backgroundColor: Colors.card, alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    minHeight: TouchTarget.min, justifyContent: 'center',
  },
  formatBtnActive: { borderColor: Colors.accentOrange, backgroundColor: '#fff7ed' },
  formatText: { fontSize: FontSize.sm, color: Colors.textMuted },
  formatTextActive: { fontWeight: 'bold', color: Colors.accentOrange },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  label: { fontSize: FontSize.md, color: Colors.textPrimary },
  smallInput: {
    width: 60, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.button,
    padding: 8, textAlign: 'center', fontSize: FontSize.md,
  },
  textInput: {
    flex: 1, marginLeft: 12, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.button, padding: 8, fontSize: FontSize.md,
  },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.successGreen, borderRadius: BorderRadius.button,
    paddingVertical: 16, marginTop: Spacing.xxl, gap: 8, minHeight: TouchTarget.min,
  },
  startButtonDisabled: { backgroundColor: Colors.textMuted, opacity: 0.5 },
  startButtonText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
  validationText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 8 },
});
