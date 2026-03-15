import type { GameEvent, Player, PlayerBoxScore, TeamBoxScore } from '../types';

export function calculateBoxScore(
  teamId: string,
  teamName: string,
  players: Player[],
  events: GameEvent[],
): TeamBoxScore {
  const teamEvents = events.filter(e => e.teamId === teamId && !e.isDeleted);
  const allEvents = events.filter(e => !e.isDeleted);

  const playerStats: Record<string, PlayerBoxScore> = {};

  for (const player of players) {
    playerStats[player.id] = {
      playerId: player.id,
      playerName: player.name,
      playerNumber: player.number,
      minutes: 0,
      points: 0,
      fgm: 0,
      fga: 0,
      threePm: 0,
      threePa: 0,
      ftm: 0,
      fta: 0,
      oreb: 0,
      dreb: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      to: 0,
      pf: 0,
      plusMinus: 0,
    };
  }

  for (const event of teamEvents) {
    const pid = event.playerId;
    if (!pid || !playerStats[pid]) continue;
    const ps = playerStats[pid];

    switch (event.eventType) {
      case '2pt_made':
        ps.points += 2;
        ps.fgm += 1;
        ps.fga += 1;
        break;
      case '2pt_attempt':
        ps.fga += 1;
        break;
      case '3pt_made':
        ps.points += 3;
        ps.fgm += 1;
        ps.fga += 1;
        ps.threePm += 1;
        ps.threePa += 1;
        break;
      case '3pt_attempt':
        ps.fga += 1;
        ps.threePa += 1;
        break;
      case 'ft_made':
        ps.points += 1;
        ps.ftm += 1;
        ps.fta += 1;
        break;
      case 'ft_attempt':
        ps.fta += 1;
        break;
      case 'offensive_rebound':
        ps.oreb += 1;
        ps.reb += 1;
        break;
      case 'defensive_rebound':
        ps.dreb += 1;
        ps.reb += 1;
        break;
      case 'assist':
        ps.ast += 1;
        break;
      case 'steal':
        ps.stl += 1;
        break;
      case 'block':
        ps.blk += 1;
        break;
      case 'turnover':
        ps.to += 1;
        break;
      case 'personal_foul':
      case 'technical_foul':
      case 'unsportsmanlike_foul':
        ps.pf += 1;
        break;
    }
  }

  // Handle assists recorded via assistPlayerId on shot events
  for (const event of teamEvents) {
    if (event.assistPlayerId && playerStats[event.assistPlayerId]) {
      playerStats[event.assistPlayerId].ast += 1;
    }
  }

  // Steals/blocks from opposing team events
  for (const event of allEvents) {
    if (event.teamId !== teamId && !event.isDeleted) {
      // Check for blocks/steals attributed to this team's players
      // These are already handled in teamEvents above
    }
  }

  const playerList = Object.values(playerStats).sort((a, b) => b.points - a.points);

  const totals: TeamBoxScore['totals'] = {
    minutes: 0,
    points: 0,
    fgm: 0, fga: 0,
    threePm: 0, threePa: 0,
    ftm: 0, fta: 0,
    oreb: 0, dreb: 0, reb: 0,
    ast: 0, stl: 0, blk: 0,
    to: 0, pf: 0,
    plusMinus: 0,
  };

  for (const ps of playerList) {
    totals.minutes += ps.minutes;
    totals.points += ps.points;
    totals.fgm += ps.fgm;
    totals.fga += ps.fga;
    totals.threePm += ps.threePm;
    totals.threePa += ps.threePa;
    totals.ftm += ps.ftm;
    totals.fta += ps.fta;
    totals.oreb += ps.oreb;
    totals.dreb += ps.dreb;
    totals.reb += ps.reb;
    totals.ast += ps.ast;
    totals.stl += ps.stl;
    totals.blk += ps.blk;
    totals.to += ps.to;
    totals.pf += ps.pf;
  }

  return { teamId, teamName, players: playerList, totals };
}

export function calculateScore(events: GameEvent[], teamId: string): number {
  let score = 0;
  for (const e of events) {
    if (e.teamId !== teamId || e.isDeleted) continue;
    if (e.eventType === '2pt_made') score += 2;
    else if (e.eventType === '3pt_made') score += 3;
    else if (e.eventType === 'ft_made') score += 1;
  }
  return score;
}

export function getOnCourtPlayers(events: GameEvent[], teamId: string): string[] {
  const onCourt = new Set<string>();
  const sortedEvents = [...events]
    .filter(e => !e.isDeleted && e.teamId === teamId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const e of sortedEvents) {
    if (e.eventType === 'substitution_in' && e.playerId) {
      onCourt.add(e.playerId);
    } else if (e.eventType === 'substitution_out' && e.playerId) {
      onCourt.delete(e.playerId);
    }
  }
  return Array.from(onCourt);
}

export function getPlayerFouls(events: GameEvent[], playerId: string): number {
  return events.filter(
    e => !e.isDeleted &&
      e.playerId === playerId &&
      (e.eventType === 'personal_foul' ||
        e.eventType === 'technical_foul' ||
        e.eventType === 'unsportsmanlike_foul')
  ).length;
}

export function getTeamFoulsInPeriod(events: GameEvent[], teamId: string, period: number): number {
  return events.filter(
    e => !e.isDeleted &&
      e.teamId === teamId &&
      e.quarter === period &&
      (e.eventType === 'personal_foul' ||
        e.eventType === 'technical_foul' ||
        e.eventType === 'unsportsmanlike_foul')
  ).length;
}

export function getRunningScore(events: GameEvent[], upToIndex: number, teamId: string): number {
  let score = 0;
  for (let i = 0; i <= upToIndex; i++) {
    const e = events[i];
    if (e.isDeleted || e.teamId !== teamId) continue;
    if (e.eventType === '2pt_made') score += 2;
    else if (e.eventType === '3pt_made') score += 3;
    else if (e.eventType === 'ft_made') score += 1;
  }
  return score;
}

export function pct(made: number, attempted: number): string {
  if (attempted === 0) return '0.0';
  return ((made / attempted) * 100).toFixed(1);
}

export function getPlayerLabel(player: { name: string; number: number }): string {
  const parts = player.name.split(' ');
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const first = parts[0]?.[0] || '';
  return `#${player.number} ${first}. ${last}`;
}
