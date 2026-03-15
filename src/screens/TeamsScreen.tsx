import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, Modal, Alert, StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, TouchTarget } from '../theme/colors';
import { getTeams, getPlayersByTeam, createTeam, deleteTeam } from '../database/storage';
import type { Team } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TeamsScreen() {
  const navigation = useNavigation<Nav>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const loadData = useCallback(async () => {
    const t = await getTeams();
    setTeams(t);
    const counts: Record<string, number> = {};
    for (const team of t) {
      const players = await getPlayersByTeam(team.id);
      counts[team.id] = players.length;
    }
    setPlayerCounts(counts);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCreate = async () => {
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName.trim());
    setNewTeamName('');
    setShowModal(false);
    loadData();
  };

  const handleDelete = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.name}"? This will also remove all players.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTeam(team.id);
          loadData();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={teams}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No teams yet</Text>
            <Text style={styles.emptySubtext}>Create a team to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.teamCard}
            onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{item.name}</Text>
              <Text style={styles.playerCount}>
                {playerCounts[item.id] || 0} players
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Team</Text>
            <TextInput
              style={styles.input}
              placeholder="Team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowModal(false); setNewTeamName(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.createBtn]}
                onPress={handleCreate}
              >
                <Text style={styles.createBtnText}>Create</Text>
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
  list: { padding: Spacing.lg },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    minHeight: TouchTarget.min,
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary },
  playerCount: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontSize: FontSize.md, color: Colors.textMuted, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.xxl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    fontSize: FontSize.md,
    minHeight: TouchTarget.min,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.button, minHeight: TouchTarget.min, justifyContent: 'center' },
  cancelBtn: { backgroundColor: Colors.card },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '600' },
  createBtn: { backgroundColor: Colors.accentOrange },
  createBtnText: { color: Colors.white, fontWeight: 'bold' },
});
