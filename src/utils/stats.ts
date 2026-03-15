import type { GameEvent, Game, Player, AdvancedStats, SeasonStats, PlayerBoxScore } from '../types';
import { calculateBoxScore, calculateScore, getOnCourtPlayers } from './boxScore';

export function calculateAdvancedStats(
  events: GameEvent[],
  homeTeamId: string,
  awayTeamId: string,
  homePlayers: Player[],
  awayPlayers: Player[],
): AdvancedStats {
  const activeEvents = events.filter(e => !e.isDeleted);
  const sorted = [...activeEvents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Points in paint: 2pt made with courtX 17-83, courtY ≤19 or ≥81
  let homePointsInPaint = 0;
  let awayPointsInPaint = 0;
  for (const e of sorted) {
    if (e.eventType === '2pt_made' && e.courtX != null && e.courtY != null) {
      const inPaint = e.courtX >= 17 && e.courtX <= 83 && (e.courtY <= 19 || e.courtY >= 81);
      if (inPaint) {
        if (e.teamId === homeTeamId) homePointsInPaint += 2;
        else if (e.teamId === awayTeamId) awayPointsInPaint += 2;
      }
    }
  }

  // Second chance points: scoring after an offensive rebound
  let homeSecondChancePoints = 0;
  let awaySecondChancePoints = 0;
  let lastOrebTeam: string | null = null;
  for (const e of sorted) {
    if (e.eventType === 'offensive_rebound') {
      lastOrebTeam = e.teamId;
    } else if (
      lastOrebTeam &&
      e.teamId === lastOrebTeam &&
      (e.eventType === '2pt_made' || e.eventType === '3pt_made' || e.eventType === 'ft_made')
    ) {
      const pts = e.eventType === '3pt_made' ? 3 : e.eventType === '2pt_made' ? 2 : 1;
      if (e.teamId === homeTeamId) homeSecondChancePoints += pts;
      else awaySecondChancePoints += pts;
      lastOrebTeam = null;
    } else if (
      e.eventType === '2pt_attempt' || e.eventType === '3pt_attempt' ||
      e.eventType === 'turnover' || e.eventType === 'defensive_rebound'
    ) {
      lastOrebTeam = null;
    }
  }

  // Bench points: points by players NOT in starting 5
  const homeStarters = getOnCourtPlayersAtStart(sorted, homeTeamId);
  const awayStarters = getOnCourtPlayersAtStart(sorted, awayTeamId);
  let homeBenchPoints = 0;
  let awayBenchPoints = 0;
  for (const e of sorted) {
    if (e.eventType === '2pt_made' || e.eventType === '3pt_made' || e.eventType === 'ft_made') {
      const pts = e.eventType === '3pt_made' ? 3 : e.eventType === '2pt_made' ? 2 : 1;
      if (e.teamId === homeTeamId && e.playerId && !homeStarters.has(e.playerId)) {
        homeBenchPoints += pts;
      } else if (e.teamId === awayTeamId && e.playerId && !awayStarters.has(e.playerId)) {
        awayBenchPoints += pts;
      }
    }
  }

  // Lead changes and times tied
  let leadChanges = 0;
  let timesTied = 0;
  let prevLeader: string | null = null;
  let homeScore = 0;
  let awayScore = 0;
  for (const e of sorted) {
    if (e.eventType === '2pt_made') {
      if (e.teamId === homeTeamId) homeScore += 2;
      else awayScore += 2;
    } else if (e.eventType === '3pt_made') {
      if (e.teamId === homeTeamId) homeScore += 3;
      else awayScore += 3;
    } else if (e.eventType === 'ft_made') {
      if (e.teamId === homeTeamId) homeScore += 1;
      else awayScore += 1;
    } else {
      continue;
    }

    if (homeScore === awayScore) {
      timesTied++;
      prevLeader = null;
    } else {
      const leader = homeScore > awayScore ? homeTeamId : awayTeamId;
      if (prevLeader && prevLeader !== leader) leadChanges++;
      prevLeader = leader;
    }
  }

  // Biggest runs
  let homeBiggestRun = 0;
  let awayBiggestRun = 0;
  let currentRunTeam: string | null = null;
  let currentRun = 0;
  for (const e of sorted) {
    let pts = 0;
    if (e.eventType === '2pt_made') pts = 2;
    else if (e.eventType === '3pt_made') pts = 3;
    else if (e.eventType === 'ft_made') pts = 1;
    else continue;

    if (e.teamId === currentRunTeam) {
      currentRun += pts;
    } else {
      currentRunTeam = e.teamId;
      currentRun = pts;
    }

    if (e.teamId === homeTeamId && currentRun > homeBiggestRun) homeBiggestRun = currentRun;
    if (e.teamId === awayTeamId && currentRun > awayBiggestRun) awayBiggestRun = currentRun;
  }

  return {
    homePointsInPaint,
    awayPointsInPaint,
    homeSecondChancePoints,
    awaySecondChancePoints,
    homeBenchPoints,
    awayBenchPoints,
    homeBiggestRun,
    awayBiggestRun,
    leadChanges,
    timesTied,
  };
}

function getOnCourtPlayersAtStart(events: GameEvent[], teamId: string): Set<string> {
  const starters = new Set<string>();
  for (const e of events) {
    if (e.teamId === teamId && e.eventType === 'substitution_in' && e.playerId) {
      starters.add(e.playerId);
      if (starters.size >= 5) break;
    }
  }
  return starters;
}

export function calculateSeasonStats(
  games: Game[],
  teamId: string,
  allEvents: GameEvent[],
  allPlayers: Player[],
  allTeams: { id: string; name: string }[],
): SeasonStats {
  const completedGames = games.filter(
    g => g.status === 'completed' && (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  if (completedGames.length === 0) {
    return { wins: 0, losses: 0, ppg: 0, rpg: 0, apg: 0, fgPct: 0, threePtPct: 0, ftPct: 0, oppPpg: 0 };
  }

  let wins = 0;
  let losses = 0;
  let totalPts = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalFgm = 0;
  let totalFga = 0;
  let total3pm = 0;
  let total3pa = 0;
  let totalFtm = 0;
  let totalFta = 0;
  let totalOppPts = 0;

  for (const game of completedGames) {
    const gameEvents = allEvents.filter(e => e.gameId === game.id && !e.isDeleted);
    const isHome = game.homeTeamId === teamId;
    const oppTeamId = isHome ? game.awayTeamId : game.homeTeamId;

    const teamScore = calculateScore(gameEvents, teamId);
    const oppScore = calculateScore(gameEvents, oppTeamId);

    if (teamScore > oppScore) wins++;
    else losses++;

    totalOppPts += oppScore;

    const teamPlayers = allPlayers.filter(p => p.teamId === teamId);
    const teamName = allTeams.find(t => t.id === teamId)?.name || '';
    const bs = calculateBoxScore(teamId, teamName, teamPlayers, gameEvents);

    totalPts += bs.totals.points;
    totalReb += bs.totals.reb;
    totalAst += bs.totals.ast;
    totalFgm += bs.totals.fgm;
    totalFga += bs.totals.fga;
    total3pm += bs.totals.threePm;
    total3pa += bs.totals.threePa;
    totalFtm += bs.totals.ftm;
    totalFta += bs.totals.fta;
  }

  const n = completedGames.length;
  return {
    wins,
    losses,
    ppg: Math.round((totalPts / n) * 10) / 10,
    rpg: Math.round((totalReb / n) * 10) / 10,
    apg: Math.round((totalAst / n) * 10) / 10,
    fgPct: totalFga > 0 ? Math.round((totalFgm / totalFga) * 1000) / 10 : 0,
    threePtPct: total3pa > 0 ? Math.round((total3pm / total3pa) * 1000) / 10 : 0,
    ftPct: totalFta > 0 ? Math.round((totalFtm / totalFta) * 1000) / 10 : 0,
    oppPpg: Math.round((totalOppPts / n) * 10) / 10,
  };
}

export function calculatePlayerSeasonStats(
  playerId: string,
  games: Game[],
  allEvents: GameEvent[],
  allPlayers: Player[],
  allTeams: { id: string; name: string }[],
): { perGame: any[]; averages: any } {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return { perGame: [], averages: {} };

  const teamId = player.teamId;
  const completedGames = games.filter(
    g => g.status === 'completed' && (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  const perGame: any[] = [];
  let totalPts = 0, totalReb = 0, totalAst = 0, totalStl = 0, totalBlk = 0, totalTo = 0;
  let totalFgm = 0, totalFga = 0, total3pm = 0, total3pa = 0, totalFtm = 0, totalFta = 0;

  for (const game of completedGames) {
    const gameEvents = allEvents.filter(e => e.gameId === game.id && !e.isDeleted);
    const teamPlayers = allPlayers.filter(p => p.teamId === teamId);
    const teamName = allTeams.find(t => t.id === teamId)?.name || '';
    const bs = calculateBoxScore(teamId, teamName, teamPlayers, gameEvents);
    const ps = bs.players.find(p => p.playerId === playerId);
    if (!ps) continue;

    const oppTeamId = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
    const oppName = allTeams.find(t => t.id === oppTeamId)?.name || 'Unknown';

    perGame.push({
      gameId: game.id,
      date: game.gameDate || game.createdAt,
      opponent: oppName,
      isHome: game.homeTeamId === teamId,
      ...ps,
    });

    totalPts += ps.points;
    totalReb += ps.reb;
    totalAst += ps.ast;
    totalStl += ps.stl;
    totalBlk += ps.blk;
    totalTo += ps.to;
    totalFgm += ps.fgm;
    totalFga += ps.fga;
    total3pm += ps.threePm;
    total3pa += ps.threePa;
    totalFtm += ps.ftm;
    totalFta += ps.fta;
  }

  const n = perGame.length || 1;
  const eff = (totalPts + totalReb + totalAst + totalStl + totalBlk - totalTo - (totalFga - totalFgm) - (totalFta - totalFtm)) / n;

  const averages = {
    ppg: Math.round((totalPts / n) * 10) / 10,
    rpg: Math.round((totalReb / n) * 10) / 10,
    apg: Math.round((totalAst / n) * 10) / 10,
    spg: Math.round((totalStl / n) * 10) / 10,
    bpg: Math.round((totalBlk / n) * 10) / 10,
    topg: Math.round((totalTo / n) * 10) / 10,
    fgPct: totalFga > 0 ? Math.round((totalFgm / totalFga) * 1000) / 10 : 0,
    threePtPct: total3pa > 0 ? Math.round((total3pm / total3pa) * 1000) / 10 : 0,
    ftPct: totalFta > 0 ? Math.round((totalFtm / totalFta) * 1000) / 10 : 0,
    eff: Math.round(eff * 10) / 10,
    gamesPlayed: perGame.length,
  };

  return { perGame, averages };
}
