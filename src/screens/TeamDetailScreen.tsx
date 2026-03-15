import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, Modal, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import {
  getTeam, getPlayersByTeam, createPlayer, deletePlayer, updateTeam, updatePlayer,
} from '../database/storage';
import type { Player, Position } from '../types';
import { POSITIONS } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TeamDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeamDetail'>>();
  const { teamId } = route.params;

  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [editName, setEditName] = useState('');

  // New player form
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState<Position>('PG');

  const loadData = useCallback(async () => {
    const team = await getTeam(teamId);
    if (team) {
      setTeamName(team.name);
      setEditName(team.name);
    }
    const p = await getPlayersByTeam(teamId);
    setPlayers(p.sort((a, b) => a.number - b.number));
  }, [teamId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  React.useEffect(() => {
    navigation.setOptions({ title: teamName || 'Team' });
  }, [teamName, navigation]);

  const handleAddPlayer = async () => {
    if (!newName.trim() || !newNumber.trim()) return;
    await createPlayer({
      teamId,
      name: newName.trim(),
      number: parseInt(newNumber, 10) || 0,
      position: newPosition,
      isActive: true,
    });
    setNewName('');
    setNewNumber('');
    setNewPosition('PG');
    setShowAddModal(false);
    loadData();
  };

  const handleDeletePlayer = (player: Player) => {
    Alert.alert('Delete Player', `Remove ${player.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deletePlayer(player.id); loadData(); },
      },
    ]);
  };

  const handleSaveTeamName = async () => {
    if (editName.trim()) {
      await updateTeam(teamId, { name: editName.trim() });
      setTeamName(editName.trim());
    }
    setEditingTeamName(false);
  };

  return (
    <View style={styles.container}>
      {/* Team name */}
      <View style={styles.header}>
        {editingTeamName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={handleSaveTeamName}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTeamName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingTeamName(true)} style={styles.teamNameRow}>
            <Text style={styles.teamNameText}>{teamName}</Text>
            <Ionicons name="pencil" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Player list */}
      <FlatList
        data={players}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.rosterTitle}>Roster ({players.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No players yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playerCard}
            onPress={() => navigation.navigate('PlayerProfile', { playerId: item.id })}
            onLongPress={() => handleDeletePlayer(item)}
          >
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>#{item.number}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerPosition}>{item.position}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      {/* Add player FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="person-add" size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* Add player modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player</Text>

            <TextInput
              style={styles.input}
              placeholder="Player name"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <TextInput
              style={[styles.input, { marginTop: Spacing.sm }]}
              placeholder="Jersey number"
              value={newNumber}
              onChangeText={setNewNumber}
              keyboardType="number-pad"
            />

            <Text style={styles.positionLabel}>Position</Text>
            <View style={styles.positionRow}>
              {POSITIONS.map(pos => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.positionBtn, newPosition === pos && styles.positionBtnActive]}
                  onPress={() => setNewPosition(pos)}
                >
                  <Text style={[styles.positionBtnText, newPosition === pos && styles.positionBtnTextActive]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowAddModal(false); setNewName(''); setNewNumber(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.addBtn]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.addBtnText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamNameText: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.textPrimary },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editNameInput: {
    flex: 1, fontSize: FontSize.xl, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.button, padding: Spacing.sm,
  },
  saveBtn: { backgroundColor: Colors.accentOrange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.button },
  saveBtnText: { color: Colors.white, fontWeight: 'bold' },
  list: { padding: Spacing.lg },
  rosterTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  playerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: BorderRadius.card, padding: Spacing.md, marginBottom: Spacing.sm, minHeight: TouchTarget.min,
  },
  numberBadge: {
    backgroundColor: Colors.primaryNavy, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginRight: Spacing.md,
  },
  numberText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.md },
  playerInfo: { flex: 1 },
  playerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  playerPosition: { fontSize: FontSize.sm, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accentOrange, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xxl },
  modalContent: { backgroundColor: Colors.white, borderRadius: BorderRadius.card, padding: Spacing.xxl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.lg },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.button,
    padding: Spacing.md, fontSize: FontSize.md, minHeight: TouchTarget.min,
  },
  positionLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  positionRow: { flexDirection: 'row', gap: Spacing.sm },
  positionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.button, backgroundColor: Colors.card,
    alignItems: 'center', minHeight: TouchTarget.min, justifyContent: 'center',
  },
  positionBtnActive: { backgroundColor: Colors.accentOrange },
  positionBtnText: { fontWeight: '600', color: Colors.textMuted },
  positionBtnTextActive: { color: Colors.white },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.button, minHeight: TouchTarget.min, justifyContent: 'center' },
  cancelBtn: { backgroundColor: Colors.card },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.accentOrange },
  addBtnText: { color: Colors.white, fontWeight: 'bold' },
});
