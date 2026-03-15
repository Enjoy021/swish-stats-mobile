export interface Team {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  isActive: boolean;
  createdAt: string;
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  userId: string;
  status: 'setup' | 'live' | 'paused' | 'completed';
  gameFormat: 'quarters' | 'halves';
  periodLength: number;
  currentPeriod: number;
  venue?: string;
  gameDate?: string;
  createdAt: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  playerId?: string;
  teamId: string;
  eventType: EventType;
  quarter: number;
  gameClockSeconds?: number;
  courtX?: number;
  courtY?: number;
  shotResult?: 'made' | 'missed';
  assistPlayerId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  isDeleted: boolean;
}

export type EventType =
  | '2pt_attempt' | '2pt_made' | '3pt_attempt' | '3pt_made'
  | 'ft_attempt' | 'ft_made'
  | 'offensive_rebound' | 'defensive_rebound' | 'team_rebound'
  | 'assist' | 'turnover' | 'steal' | 'block'
  | 'personal_foul' | 'technical_foul' | 'unsportsmanlike_foul' | 'foul_drawn'
  | 'substitution_in' | 'substitution_out'
  | 'timeout' | 'period_start' | 'period_end';

export interface PlayerBoxScore {
  playerId: string;
  playerName: string;
  playerNumber: number;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  plusMinus: number;
}

export interface TeamBoxScore {
  teamId: string;
  teamName: string;
  players: PlayerBoxScore[];
  totals: Omit<PlayerBoxScore, 'playerId' | 'playerName' | 'playerNumber'>;
}

export interface AdvancedStats {
  homePointsInPaint: number;
  awayPointsInPaint: number;
  homeSecondChancePoints: number;
  awaySecondChancePoints: number;
  homeBenchPoints: number;
  awayBenchPoints: number;
  homeBiggestRun: number;
  awayBiggestRun: number;
  leadChanges: number;
  timesTied: number;
}

export interface SeasonStats {
  wins: number;
  losses: number;
  ppg: number;
  rpg: number;
  apg: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
  oppPpg: number;
}

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export const TURNOVER_TYPES = [
  'Bad Pass', 'Travel', 'Ball Handling', 'Shot Clock',
  'Offensive Foul', 'Out of Bounds', '3 Seconds',
  '5 Seconds', '8 Seconds', 'Double Dribble', 'Other',
] as const;

export type TurnoverType = typeof TURNOVER_TYPES[number];

export interface CourtZone {
  id: string;
  label: string;
  points: string;
  shotValue: 2 | 3;
  centerX: number;
  centerY: number;
}
