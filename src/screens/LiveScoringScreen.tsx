import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Modal, FlatList,
  StyleSheet, SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import {
  getGame, getTeam, getPlayersByTeam, getGameEvents, createGameEvent, softDeleteEvent, updateGame,
} from '../database/storage';
import {
  calculateScore, getOnCourtPlayers, getPlayerFouls, getTeamFoulsInPeriod, getPlayerLabel,
} from '../utils/boxScore';
import CourtDiagram, { COURT_ZONES } from '../components/CourtDiagram';
import type { Game, Team, Player, GameEvent, CourtZone, EventType } from '../types';
import { TURNOVER_TYPES } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const FOUL_LIMIT = 5;

export default function LiveScoringScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'LiveScoring'>>();
  const { gameId } = route.params;

  const [game, setGame] = useState<Game | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [gameClockMinutes, setGameClockMinutes] = useState(10);
  const [gameClockSeconds, setGameClockSeconds] = useState(0);

  // Modal states
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [showReboundModal, setShowReboundModal] = useState(false);
  const [showStealModal, setShowStealModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [showFTModal, setShowFTModal] = useState(false);
  const [showShooterModal, setShowShooterModal] = useState(false);
  const [showShotResultModal, setShowShotResultModal] = useState(false);
  const [pendingZone, setPendingZone] = useState<CourtZone | null>(null);
  const [pendingShooter, setPendingShooter] = useState<string | null>(null);
  const [fouledOutPlayer, setFouledOutPlayer] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const g = await getGame(gameId);
    if (!g) return;
    setGame(g);
    setGameClockMinutes(g.periodLength);

    const [ht, at] = await Promise.all([getTeam(g.homeTeamId), getTeam(g.awayTeamId)]);
    setHomeTeam(ht || null);
    setAwayTeam(at || null);

    const [hp, ap] = await Promise.all([
      getPlayersByTeam(g.homeTeamId),
      getPlayersByTeam(g.awayTeamId),
    ]);
    setHomePlayers(hp);
    setAwayPlayers(ap);

    const ev = await getGameEvents(gameId);
    setEvents(ev);
  }, [gameId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (!game || !homeTeam || !awayTeam) return null;

  const currentTeamId = activeTeam === 'home' ? game.homeTeamId : game.awayTeamId;
  const opposingTeamId = activeTeam === 'home' ? game.awayTeamId : game.homeTeamId;
  const currentPlayers = activeTeam === 'home' ? homePlayers : awayPlayers;
  const opposingPlayers = activeTeam === 'home' ? awayPlayers : homePlayers;

  const homeScore = calculateScore(events, game.homeTeamId);
  const awayScore = calculateScore(events, game.awayTeamId);
  const homeOnCourt = getOnCourtPlayers(events, game.homeTeamId);
  const awayOnCourt = getOnCourtPlayers(events, game.awayTeamId);
  const onCourtIds = activeTeam === 'home' ? homeOnCourt : awayOnCourt;
  const onCourtPlayers = currentPlayers.filter(p => onCourtIds.includes(p.id));
  const benchPlayers = currentPlayers.filter(p => !onCourtIds.includes(p.id));
  const homeTeamFouls = getTeamFoulsInPeriod(events, game.homeTeamId, game.currentPeriod);
  const awayTeamFouls = getTeamFoulsInPeriod(events, game.awayTeamId, game.currentPeriod);

  const shotEvents = events.filter(e =>
    (e.eventType === '2pt_made' || e.eventType === '2pt_attempt' ||
      e.eventType === '3pt_made' || e.eventType === '3pt_attempt') &&
    e.teamId === currentTeamId && e.courtX != null
  );

  const clockSeconds = gameClockMinutes * 60 + gameClockSeconds;
  const totalPeriods = game.gameFormat === 'quarters' ? 4 : 2;
  const periodLabel = game.currentPeriod > totalPeriods
    ? `OT${game.currentPeriod - totalPeriods}`
    : game.gameFormat === 'quarters' ? `Q${game.currentPeriod}` : `H${game.currentPeriod}`;

  const addEvent = async (
    eventType: EventType,
    playerId?: string,
    extra?: Partial<GameEvent>,
  ) => {
    const ev = await createGameEvent({
      gameId,
      playerId,
      teamId: extra?.teamId || currentTeamId,
      eventType,
      quarter: game.currentPeriod,
      gameClockSeconds: clockSeconds,
      ...extra,
    });
    setEvents(prev => [...prev, ev]);
    return ev;
  };

  const handleUndo = async () => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;
    await softDeleteEvent(lastEvent.id);
    setEvents(prev => prev.slice(0, -1));
  };

  // Zone-first shot flow
  const handleZonePress = (zone: CourtZone) => {
    if (selectedPlayerId) {
      // Player already selected - go straight to shot result
      setPendingZone(zone);
      setPendingShooter(selectedPlayerId);
      setShowShotResultModal(true);
    } else {
      // Need to select shooter first
      setPendingZone(zone);
      setShowShooterModal(true);
    }
  };

  const handleShooterSelected = (playerId: string) => {
    setShowShooterModal(false);
    setPendingShooter(playerId);
    setShowShotResultModal(true);
  };

  const handleShotResult = async (made: boolean) => {
    setShowShotResultModal(false);
    if (!pendingZone || !pendingShooter) return;

    const is3pt = pendingZone.shotValue === 3;
    const eventType: EventType = made
      ? (is3pt ? '3pt_made' : '2pt_made')
      : (is3pt ? '3pt_attempt' : '2pt_attempt');

    await addEvent(eventType, pendingShooter, {
      courtX: pendingZone.centerX / 4, // normalize to 0-100
      courtY: pendingZone.centerY / 3.8, // normalize to 0-100
      shotResult: made ? 'made' : 'missed',
    });

    setPendingZone(null);
    setPendingShooter(null);
    setSelectedPlayerId(null);

    if (made) {
      setShowAssistModal(true);
    } else {
      setShowReboundModal(true);
    }
  };

  // Quick actions
  const handleQuick2 = async () => {
    if (!selectedPlayerId) return;
    await addEvent('2pt_made', selectedPlayerId);
    setSelectedPlayerId(null);
    setShowAssistModal(true);
  };

  const handleQuick3 = async () => {
    if (!selectedPlayerId) return;
    await addEvent('3pt_made', selectedPlayerId);
    setSelectedPlayerId(null);
    setShowAssistModal(true);
  };

  const handleFT = () => {
    if (!selectedPlayerId) return;
    setShowFTModal(true);
  };

  const handleFTResult = async (made: boolean) => {
    setShowFTModal(false);
    if (!selectedPlayerId) return;
    await addEvent(made ? 'ft_made' : 'ft_attempt', selectedPlayerId);
    setSelectedPlayerId(null);
  };

  const handleFoul = () => {
    if (!selectedPlayerId) return;
    setShowFoulModal(true);
  };

  const handleFoulType = async (type: 'personal_foul' | 'technical_foul' | 'unsportsmanlike_foul') => {
    setShowFoulModal(false);
    if (!selectedPlayerId) return;
    await addEvent(type, selectedPlayerId);

    const fouls = getPlayerFouls(events, selectedPlayerId) + 1;
    if (fouls >= FOUL_LIMIT) {
      setFouledOutPlayer(selectedPlayerId);
      const player = currentPlayers.find(p => p.id === selectedPlayerId);
      Alert.alert(
        'Fouled Out!',
        `${player?.name || 'Player'} has ${FOUL_LIMIT} fouls and must be substituted.`,
        [{ text: 'Substitute', onPress: () => { setFouledOutPlayer(selectedPlayerId); setShowSubModal(true); } }],
      );
    }
    setSelectedPlayerId(null);
  };

  const handleTurnover = () => {
    if (!selectedPlayerId) return;
    setShowTurnoverModal(true);
  };

  const handleTurnoverType = async (type: string) => {
    setShowTurnoverModal(false);
    if (!selectedPlayerId) return;
    await addEvent('turnover', selectedPlayerId, { metadata: { turnoverType: type } });
    setSelectedPlayerId(null);
    setShowStealModal(true);
  };

  const handleSteal = async (playerId: string) => {
    setShowStealModal(false);
    await addEvent('steal', playerId, { teamId: opposingTeamId });
  };

  const handleAssist = async (playerId: string) => {
    setShowAssistModal(false);
    await addEvent('assist', playerId);
  };

  const handleRebound = async (playerId: string, isOffensive: boolean, teamId: string) => {
    setShowReboundModal(false);
    await addEvent(
      isOffensive ? 'offensive_rebound' : 'defensive_rebound',
      playerId,
      { teamId },
    );
  };

  const handleTeamRebound = async (teamId: string) => {
    setShowReboundModal(false);
    await addEvent('team_rebound', undefined, { teamId });
  };

  const handleSub = async (outPlayerId: string, inPlayerId: string) => {
    setShowSubModal(false);
    await addEvent('substitution_out', outPlayerId);
    await addEvent('substitution_in', inPlayerId);
    setFouledOutPlayer(null);
    setSelectedPlayerId(null);
  };

  const handleEndPeriod = () => {
    Alert.alert('End Period', `End ${periodLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Period',
        onPress: async () => {
          await addEvent('period_end', undefined, { teamId: game.homeTeamId });
          const nextPeriod = game.currentPeriod + 1;
          const isOvertime = nextPeriod > totalPeriods;

          if (game.currentPeriod >= totalPeriods && homeScore !== awayScore) {
            // Game can end
            Alert.alert('Game Over?', 'End the game or continue to overtime?', [
              {
                text: 'Overtime',
                onPress: async () => {
                  await updateGame(gameId, { currentPeriod: nextPeriod, periodLength: 5 });
                  await addEvent('period_start', undefined, { teamId: game.homeTeamId });
                  setGameClockMinutes(5);
                  loadData();
                },
              },
              {
                text: 'End Game', style: 'destructive',
                onPress: async () => {
                  await updateGame(gameId, { status: 'completed' });
                  navigation.replace('BoxScore', { gameId });
                },
              },
            ]);
          } else {
            await updateGame(gameId, { currentPeriod: nextPeriod, periodLength: isOvertime ? 5 : game.periodLength });
            await addEvent('period_start', undefined, { teamId: game.homeTeamId });
            setGameClockMinutes(isOvertime ? 5 : game.periodLength);
            loadData();
          }
        },
      },
    ]);
  };

  const handleEndGame = () => {
    Alert.alert('End Game', 'Mark this game as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game', style: 'destructive',
        onPress: async () => {
          await updateGame(gameId, { status: 'completed' });
          navigation.replace('BoxScore', { gameId });
        },
      },
    ]);
  };

  const handlePauseResume = async () => {
    const newStatus = game.status === 'paused' ? 'live' : 'paused';
    await updateGame(gameId, { status: newStatus as any });
    setGame(prev => prev ? { ...prev, status: newStatus as any } : prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryNavy} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.periodText}>{periodLabel}</Text>
        <View style={styles.clockContainer}>
          <TouchableOpacity onPress={() => setGameClockMinutes(m => Math.max(0, m - 1))}>
            <Ionicons name="remove" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.clockText}>
            {gameClockMinutes.toString().padStart(2, '0')}:{gameClockSeconds.toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={() => setGameClockMinutes(m => m + 1)}>
            <Ionicons name="add" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.boxScoreLink} onPress={() => navigation.navigate('BoxScore', { gameId })}>
          <Ionicons name="stats-chart" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={styles.scoreTeam}>
          <Text style={styles.scoreTeamName} numberOfLines={1}>{homeTeam.name}</Text>
          <Text style={styles.scoreValue}>{homeScore}</Text>
        </View>
        <Text style={styles.scoreDash}>—</Text>
        <View style={styles.scoreTeam}>
          <Text style={styles.scoreTeamName} numberOfLines={1}>{awayTeam.name}</Text>
          <Text style={styles.scoreValue}>{awayScore}</Text>
        </View>
      </View>

      {/* Team fouls */}
      <View style={styles.foulsRow}>
        <Text style={[styles.foulIndicator, homeTeamFouls >= 5 && styles.bonusFoul]}>
          Fouls: {homeTeamFouls}{homeTeamFouls >= 5 ? ' BONUS' : ''}
        </Text>
        <Text style={[styles.foulIndicator, awayTeamFouls >= 5 && styles.bonusFoul]}>
          Fouls: {awayTeamFouls}{awayTeamFouls >= 5 ? ' BONUS' : ''}
        </Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Team toggle */}
        <View style={styles.teamToggle}>
          <TouchableOpacity
            style={[styles.teamTab, activeTeam === 'home' && styles.teamTabActive]}
            onPress={() => { setActiveTeam('home'); setSelectedPlayerId(null); }}
          >
            <Text style={[styles.teamTabText, activeTeam === 'home' && styles.teamTabTextActive]}>
              {homeTeam.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamTab, activeTeam === 'away' && styles.teamTabActive]}
            onPress={() => { setActiveTeam('away'); setSelectedPlayerId(null); }}
          >
            <Text style={[styles.teamTabText, activeTeam === 'away' && styles.teamTabTextActive]}>
              {awayTeam.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Court */}
        <CourtDiagram
          shots={shotEvents}
          onZonePress={handleZonePress}
          showLabels
        />

        {/* On-court players */}
        <View style={styles.onCourtSection}>
          <Text style={styles.onCourtTitle}>On Court</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onCourtRow}>
            {onCourtPlayers.map(player => {
              const fouls = getPlayerFouls(events, player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.courtPlayerCard,
                    selectedPlayerId === player.id && styles.courtPlayerSelected,
                    fouls >= FOUL_LIMIT && styles.courtPlayerFouledOut,
                  ]}
                  onPress={() => setSelectedPlayerId(
                    selectedPlayerId === player.id ? null : player.id
                  )}
                >
                  <Text style={styles.courtPlayerNumber}>#{player.number}</Text>
                  <Text style={styles.courtPlayerName} numberOfLines={1}>
                    {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                  {fouls > 0 && (
                    <View style={[styles.courtFoulBadge, fouls >= 4 && styles.courtFoulDanger]}>
                      <Text style={styles.courtFoulText}>{fouls}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick actions */}
        {selectedPlayerId && (
          <View style={styles.actionsSection}>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={handleQuick2}>
                <Text style={styles.actionBtnText}>+2</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={handleQuick3}>
                <Text style={styles.actionBtnText}>+3</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={handleFT}>
                <Text style={styles.actionBtnTextDark}>FT</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionWarning]} onPress={handleFoul}>
                <Text style={styles.actionBtnText}>FOUL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={handleTurnover}>
                <Text style={styles.actionBtnText}>TO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={() => setShowSubModal(true)}>
                <Text style={styles.actionBtnTextDark}>SUB</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Game controls */}
        <View style={styles.gameControls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo" size={18} color={Colors.white} />
            <Text style={styles.controlBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handlePauseResume}>
            <Ionicons name={game.status === 'paused' ? 'play' : 'pause'} size={18} color={Colors.white} />
            <Text style={styles.controlBtnText}>{game.status === 'paused' ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.controlBtnOrange]} onPress={handleEndPeriod}>
            <Text style={styles.controlBtnText}>End Period</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.controlBtnDanger]} onPress={handleEndGame}>
            <Text style={styles.controlBtnText}>End Game</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Assist Modal */}
      <Modal visible={showAssistModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Who assisted?</Text>
            <FlatList
              data={onCourtPlayers.filter(p => p.id !== selectedPlayerId && p.id !== pendingShooter)}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleAssist(item.id)}>
                  <Text style={styles.modalItemText}>#{item.number} {item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowAssistModal(false)}>
              <Text style={styles.modalSkipText}>No Assist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rebound/Block Modal */}
      <Modal visible={showReboundModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Rebound / Block</Text>
            <Text style={styles.modalSubtitle}>Offensive Rebound ({activeTeam === 'home' ? homeTeam.name : awayTeam.name})</Text>
            {onCourtPlayers.map(p => (
              <TouchableOpacity key={`oreb-${p.id}`} style={styles.modalItem}
                onPress={() => handleRebound(p.id, true, currentTeamId)}>
                <Text style={styles.modalItemText}>#{p.number} {p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalItem} onPress={() => handleTeamRebound(currentTeamId)}>
              <Text style={styles.modalItemText}>Team Rebound</Text>
            </TouchableOpacity>

            <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>
              Defensive Rebound ({activeTeam === 'home' ? awayTeam.name : homeTeam.name})
            </Text>
            {(activeTeam === 'home' ? awayPlayers : homePlayers)
              .filter(p => (activeTeam === 'home' ? awayOnCourt : homeOnCourt).includes(p.id))
              .map(p => (
                <TouchableOpacity key={`dreb-${p.id}`} style={styles.modalItem}
                  onPress={() => handleRebound(p.id, false, opposingTeamId)}>
                  <Text style={styles.modalItemText}>#{p.number} {p.name}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={styles.modalItem} onPress={() => handleTeamRebound(opposingTeamId)}>
              <Text style={styles.modalItemText}>Team Rebound</Text>
            </TouchableOpacity>

            <Text style={[styles.modalSubtitle, { marginTop: 12 }]}>Block</Text>
            {(activeTeam === 'home' ? awayPlayers : homePlayers)
              .filter(p => (activeTeam === 'home' ? awayOnCourt : homeOnCourt).includes(p.id))
              .map(p => (
                <TouchableOpacity key={`blk-${p.id}`} style={styles.modalItem}
                  onPress={async () => {
                    setShowReboundModal(false);
                    await addEvent('block', p.id, { teamId: opposingTeamId });
                  }}>
                  <Text style={styles.modalItemText}>#{p.number} {p.name} (Block)</Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowReboundModal(false)}>
              <Text style={styles.modalSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Steal Modal */}
      <Modal visible={showStealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Steal by?</Text>
            {(activeTeam === 'home' ? awayPlayers : homePlayers)
              .filter(p => (activeTeam === 'home' ? awayOnCourt : homeOnCourt).includes(p.id))
              .map(p => (
                <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => handleSteal(p.id)}>
                  <Text style={styles.modalItemText}>#{p.number} {p.name}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowStealModal(false)}>
              <Text style={styles.modalSkipText}>No Steal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Substitution Modal */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Substitution</Text>
            <Text style={styles.modalSubtitle}>Select player going OUT</Text>
            {onCourtPlayers.map(p => (
              <TouchableOpacity key={p.id} style={styles.modalItem}
                onPress={() => {
                  // Show bench players to come in
                  Alert.alert('Sub In', `Replace #${p.number} ${p.name}. Select bench player:`,
                    benchPlayers.map(bp => ({
                      text: `#${bp.number} ${bp.name}`,
                      onPress: () => handleSub(p.id, bp.id),
                    })).concat([{ text: 'Cancel', onPress: () => {}, style: 'cancel' } as any])
                  );
                }}>
                <Text style={styles.modalItemText}>#{p.number} {p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowSubModal(false)}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Foul Type Modal */}
      <Modal visible={showFoulModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Foul Type</Text>
            <TouchableOpacity style={styles.modalItem} onPress={() => handleFoulType('personal_foul')}>
              <Text style={styles.modalItemText}>Personal Foul</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={() => handleFoulType('technical_foul')}>
              <Text style={styles.modalItemText}>Technical Foul</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={() => handleFoulType('unsportsmanlike_foul')}>
              <Text style={styles.modalItemText}>Unsportsmanlike Foul</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowFoulModal(false)}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Turnover Type Modal */}
      <Modal visible={showTurnoverModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Turnover Type</Text>
            <FlatList
              data={TURNOVER_TYPES as unknown as string[]}
              keyExtractor={t => t}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleTurnoverType(item)}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowTurnoverModal(false)}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Free Throw Modal */}
      <Modal visible={showFTModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Free Throw</Text>
            <View style={styles.ftRow}>
              <TouchableOpacity style={[styles.ftBtn, styles.ftMade]} onPress={() => handleFTResult(true)}>
                <Text style={styles.ftBtnText}>Made</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ftBtn, styles.ftMissed]} onPress={() => handleFTResult(false)}>
                <Text style={styles.ftBtnText}>Missed</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalSkip} onPress={() => setShowFTModal(false)}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shooter Selection Modal (zone-first flow) */}
      <Modal visible={showShooterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Who shot? ({pendingZone?.label} - {pendingZone?.shotValue}pt)
            </Text>
            {onCourtPlayers.map(p => (
              <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => handleShooterSelected(p.id)}>
                <Text style={styles.modalItemText}>#{p.number} {p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalSkip} onPress={() => { setShowShooterModal(false); setPendingZone(null); }}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shot Result Modal */}
      <Modal visible={showShotResultModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {pendingZone?.shotValue === 3 ? '3-Point Shot' : '2-Point Shot'}
            </Text>
            <View style={styles.ftRow}>
              <TouchableOpacity style={[styles.ftBtn, styles.ftMade]} onPress={() => handleShotResult(true)}>
                <Text style={styles.ftBtnText}>Made</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ftBtn, styles.ftMissed]} onPress={() => handleShotResult(false)}>
                <Text style={styles.ftBtnText}>Missed</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalSkip}
              onPress={() => { setShowShotResultModal(false); setPendingZone(null); setPendingShooter(null); }}>
              <Text style={styles.modalSkipText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primaryNavy },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.primaryNavy,
  },
  backBtn: { padding: 8, minWidth: TouchTarget.min, minHeight: TouchTarget.min, justifyContent: 'center', alignItems: 'center' },
  periodText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
  clockContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  clockText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  boxScoreLink: { padding: 8, minWidth: TouchTarget.min, minHeight: TouchTarget.min, justifyContent: 'center', alignItems: 'center' },
  scoreboard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, backgroundColor: Colors.primaryNavy,
  },
  scoreTeam: { flex: 1, alignItems: 'center' },
  scoreTeamName: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  scoreValue: { color: Colors.white, fontSize: 36, fontWeight: 'bold' },
  scoreDash: { color: 'rgba(255,255,255,0.4)', fontSize: 24, fontWeight: 'bold' },
  foulsRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4, backgroundColor: Colors.primaryNavy,
  },
  foulIndicator: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.xs, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  bonusFoul: { color: '#fca5a5', backgroundColor: 'rgba(239,68,68,0.2)', fontWeight: 'bold' },
  scrollContent: { flex: 1, backgroundColor: Colors.primaryNavy },
  teamToggle: { flexDirection: 'row', marginHorizontal: Spacing.md, marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' },
  teamTab: { flex: 1, paddingVertical: 10, alignItems: 'center', minHeight: TouchTarget.min, justifyContent: 'center' },
  teamTabActive: { backgroundColor: Colors.accentOrange },
  teamTabText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: FontSize.sm },
  teamTabTextActive: { color: Colors.white },
  onCourtSection: { marginTop: 12, paddingHorizontal: Spacing.md },
  onCourtTitle: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6 },
  onCourtRow: { gap: 8 },
  courtPlayerCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12, minWidth: 60, minHeight: TouchTarget.min,
    justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  courtPlayerSelected: { borderColor: Colors.accentOrange, backgroundColor: 'rgba(232,96,44,0.2)' },
  courtPlayerFouledOut: { opacity: 0.3 },
  courtPlayerNumber: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.md },
  courtPlayerName: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs },
  courtFoulBadge: { backgroundColor: Colors.warning, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginTop: 2 },
  courtFoulDanger: { backgroundColor: Colors.error },
  courtFoulText: { color: Colors.white, fontSize: 9, fontWeight: 'bold' },
  actionsSection: { paddingHorizontal: Spacing.md, marginTop: 12, gap: 8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.button, alignItems: 'center',
    justifyContent: 'center', minHeight: TouchTarget.min,
  },
  actionPrimary: { backgroundColor: Colors.accentOrange },
  actionSecondary: { backgroundColor: 'rgba(255,255,255,0.15)' },
  actionWarning: { backgroundColor: '#d97706' },
  actionDanger: { backgroundColor: Colors.error },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.md },
  actionBtnTextDark: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.md },
  gameControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.md, marginTop: 16 },
  controlBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.button, gap: 6,
    minHeight: TouchTarget.min,
  },
  controlBtnOrange: { backgroundColor: Colors.accentOrange },
  controlBtnDanger: { backgroundColor: Colors.error },
  controlBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.xxl, maxHeight: '70%',
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted, marginTop: 8, marginBottom: 4 },
  modalItem: {
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    minHeight: TouchTarget.min, justifyContent: 'center',
  },
  modalItemText: { fontSize: FontSize.md, color: Colors.textPrimary },
  modalSkip: {
    paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: Colors.card,
    borderRadius: BorderRadius.button, minHeight: TouchTarget.min, justifyContent: 'center',
  },
  modalSkipText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textMuted },
  ftRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ftBtn: { flex: 1, paddingVertical: 16, borderRadius: BorderRadius.button, alignItems: 'center', minHeight: TouchTarget.min, justifyContent: 'center' },
  ftMade: { backgroundColor: Colors.successGreen },
  ftMissed: { backgroundColor: Colors.error },
  ftBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
});
