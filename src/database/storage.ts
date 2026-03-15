import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { Team, Player, Game, GameEvent } from '../types';

const KEYS = {
  teams: 'swish_teams',
  players: 'swish_players',
  games: 'swish_games',
  events: 'swish_events',
};

async function getAll<T>(key: string): Promise<T[]> {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

async function setAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// Teams
export async function getTeams(): Promise<Team[]> {
  return getAll<Team>(KEYS.teams);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  const teams = await getTeams();
  return teams.find(t => t.id === id);
}

export async function createTeam(name: string): Promise<Team> {
  const teams = await getTeams();
  const team: Team = {
    id: uuidv4(),
    name,
    userId: 'default-user',
    createdAt: new Date().toISOString(),
  };
  teams.push(team);
  await setAll(KEYS.teams, teams);
  return team;
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
  const teams = await getTeams();
  const idx = teams.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  teams[idx] = { ...teams[idx], ...updates };
  await setAll(KEYS.teams, teams);
  return teams[idx];
}

export async function deleteTeam(id: string): Promise<void> {
  const teams = await getTeams();
  await setAll(KEYS.teams, teams.filter(t => t.id !== id));
  // Also delete associated players
  const players = await getPlayers();
  await setAll(KEYS.players, players.filter(p => p.teamId !== id));
}

// Players
export async function getPlayers(): Promise<Player[]> {
  return getAll<Player>(KEYS.players);
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const players = await getPlayers();
  return players.filter(p => p.teamId === teamId);
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  const players = await getPlayers();
  return players.find(p => p.id === id);
}

export async function createPlayer(data: Omit<Player, 'id' | 'createdAt'>): Promise<Player> {
  const players = await getPlayers();
  const player: Player = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  players.push(player);
  await setAll(KEYS.players, players);
  return player;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
  const players = await getPlayers();
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  players[idx] = { ...players[idx], ...updates };
  await setAll(KEYS.players, players);
  return players[idx];
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  await setAll(KEYS.players, players.filter(p => p.id !== id));
}

// Games
export async function getGames(): Promise<Game[]> {
  return getAll<Game>(KEYS.games);
}

export async function getGame(id: string): Promise<Game | undefined> {
  const games = await getGames();
  return games.find(g => g.id === id);
}

export async function createGame(data: Omit<Game, 'id' | 'createdAt' | 'userId'>): Promise<Game> {
  const games = await getGames();
  const game: Game = {
    ...data,
    id: uuidv4(),
    userId: 'default-user',
    createdAt: new Date().toISOString(),
  };
  games.push(game);
  await setAll(KEYS.games, games);
  return game;
}

export async function updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
  const games = await getGames();
  const idx = games.findIndex(g => g.id === id);
  if (idx === -1) return undefined;
  games[idx] = { ...games[idx], ...updates };
  await setAll(KEYS.games, games);
  return games[idx];
}

export async function deleteGame(id: string): Promise<void> {
  const games = await getGames();
  await setAll(KEYS.games, games.filter(g => g.id !== id));
  // Also delete associated events
  const events = await getGameEvents(id);
  if (events.length > 0) {
    const allEvents = await getAll<GameEvent>(KEYS.events);
    await setAll(KEYS.events, allEvents.filter(e => e.gameId !== id));
  }
}

// Game Events
export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const events = await getAll<GameEvent>(KEYS.events);
  return events.filter(e => e.gameId === gameId && !e.isDeleted);
}

export async function getAllGameEvents(): Promise<GameEvent[]> {
  return getAll<GameEvent>(KEYS.events);
}

export async function createGameEvent(data: Omit<GameEvent, 'id' | 'createdAt' | 'isDeleted'>): Promise<GameEvent> {
  const events = await getAll<GameEvent>(KEYS.events);
  const event: GameEvent = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    isDeleted: false,
  };
  events.push(event);
  await setAll(KEYS.events, events);
  return event;
}

export async function softDeleteEvent(id: string): Promise<void> {
  const events = await getAll<GameEvent>(KEYS.events);
  const idx = events.findIndex(e => e.id === id);
  if (idx !== -1) {
    events[idx].isDeleted = true;
    await setAll(KEYS.events, events);
  }
}

export async function getLastEvent(gameId: string): Promise<GameEvent | undefined> {
  const events = await getGameEvents(gameId);
  return events.length > 0 ? events[events.length - 1] : undefined;
}

export async function getGamesByTeam(teamId: string): Promise<Game[]> {
  const games = await getGames();
  return games.filter(g => g.homeTeamId === teamId || g.awayTeamId === teamId);
}
