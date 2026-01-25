/**
 * Match Model
 * Top-level container for a cricket match
 */

import { Team } from './Team.js';
import { Innings } from './Innings.js';

// Match types enum
export const MatchType = {
  T20: 'T20',
  ODI: 'ODI',
  TEST: 'TEST',
  T10: 'T10',
  HUNDRED: 'HUNDRED',
  CUSTOM: 'CUSTOM'
};

// Match status enum
export const MatchStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  NO_RESULT: 'NO_RESULT'
};

// Toss decision enum
export const TossDecision = {
  BAT: 'BAT',
  BOWL: 'BOWL'
};

/**
 * Toss details class
 */
export class Toss {
  constructor(data = {}) {
    this.winnerTeamId = data.winnerTeamId || null;
    this.decision = data.decision || null;
  }

  toJSON() {
    return {
      winnerTeamId: this.winnerTeamId,
      decision: this.decision
    };
  }

  static fromJSON(data) {
    return data ? new Toss(data) : null;
  }
}

/**
 * Match result class
 */
export class MatchResult {
  constructor(data = {}) {
    this.winnerTeamId = data.winnerTeamId || null;
    this.resultType = data.resultType || null; // 'runs', 'wickets', 'tie', 'draw', 'no_result'
    this.margin = data.margin || 0;
    this.description = data.description || '';
  }

  toJSON() {
    return {
      winnerTeamId: this.winnerTeamId,
      resultType: this.resultType,
      margin: this.margin,
      description: this.description
    };
  }

  static fromJSON(data) {
    return data ? new MatchResult(data) : null;
  }
}

/**
 * Powerplay configuration
 */
export class PowerplayConfig {
  constructor(data = {}) {
    this.pp1 = data.pp1 || { start: 1, end: 6 };
    this.pp2 = data.pp2 || { start: 7, end: 15 };
    this.pp3 = data.pp3 || { start: 16, end: 20 };
  }

  getCurrentPowerplay(overNumber) {
    if (overNumber >= this.pp1.start && overNumber <= this.pp1.end) return 1;
    if (overNumber >= this.pp2.start && overNumber <= this.pp2.end) return 2;
    if (overNumber >= this.pp3.start && overNumber <= this.pp3.end) return 3;
    return null;
  }

  toJSON() {
    return {
      pp1: { ...this.pp1 },
      pp2: { ...this.pp2 },
      pp3: { ...this.pp3 }
    };
  }

  static fromJSON(data) {
    return data ? new PowerplayConfig(data) : new PowerplayConfig();
  }
}

/**
 * Match class
 */
export class Match {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
    
    // Match metadata
    this.tournamentName = data.tournamentName || '';
    this.matchName = data.matchName || '';
    this.venue = data.venue || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    
    // Match configuration
    this.matchType = data.matchType || MatchType.T20;
    this.oversLimit = data.oversLimit || this.getDefaultOversLimit(data.matchType);
    this.maxInnings = data.maxInnings || 2;
    
    // Teams
    this.teams = [];
    if (data.teams && Array.isArray(data.teams)) {
      this.teams = data.teams.map(t => 
        t instanceof Team ? t : Team.fromJSON(t)
      );
    }
    
    // Toss
    this.toss = data.toss ? Toss.fromJSON(data.toss) : null;
    
    // Officials
    this.umpires = data.umpires || [];
    this.scorers = data.scorers || [];
    this.referee = data.referee || '';
    
    // Innings
    this.innings = [];
    if (data.innings && Array.isArray(data.innings)) {
      this.innings = data.innings.map(i => 
        i instanceof Innings ? i : Innings.fromJSON(i)
      );
    }
    
    // Current state
    this.currentInningsIndex = data.currentInningsIndex || 0;
    this.status = data.status || MatchStatus.NOT_STARTED;
    
    // Result
    this.result = data.result ? MatchResult.fromJSON(data.result) : null;
    
    // Powerplay configuration
    this.powerplayConfig = PowerplayConfig.fromJSON(data.powerplayConfig);
    
    // DLS (Duckworth-Lewis-Stern) - for rain affected matches
    this.dlsApplied = data.dlsApplied || false;
    this.dlsTarget = data.dlsTarget || null;
  }

  generateId() {
    return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get default overs limit for match type
   */
  getDefaultOversLimit(matchType) {
    switch (matchType) {
      case MatchType.T10: return 10;
      case MatchType.T20: return 20;
      case MatchType.ODI: return 50;
      case MatchType.HUNDRED: return 100; // balls, but treated differently
      case MatchType.TEST: return null; // Unlimited
      default: return 20;
    }
  }

  /**
   * Add a team to the match
   */
  addTeam(team) {
    if (this.teams.length >= 2) {
      throw new Error('Match already has 2 teams');
    }
    const teamInstance = team instanceof Team ? team : new Team(team);
    this.teams.push(teamInstance);
    return teamInstance;
  }

  /**
   * Get team by ID
   */
  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId);
  }

  /**
   * Get team A (first team)
   */
  getTeamA() {
    return this.teams[0] || null;
  }

  /**
   * Get team B (second team)
   */
  getTeamB() {
    return this.teams[1] || null;
  }

  /**
   * Set toss result
   */
  setToss(winnerTeamId, decision) {
    this.toss = new Toss({ winnerTeamId, decision });
  }

  /**
   * Get batting first team
   */
  getBattingFirstTeam() {
    if (!this.toss) return null;
    
    if (this.toss.decision === TossDecision.BAT) {
      return this.getTeam(this.toss.winnerTeamId);
    } else {
      // Toss winner chose to bowl, so other team bats
      return this.teams.find(t => t.id !== this.toss.winnerTeamId);
    }
  }

  /**
   * Get bowling first team
   */
  getBowlingFirstTeam() {
    if (!this.toss) return null;
    
    if (this.toss.decision === TossDecision.BOWL) {
      return this.getTeam(this.toss.winnerTeamId);
    } else {
      return this.teams.find(t => t.id !== this.toss.winnerTeamId);
    }
  }

  /**
   * Start the match
   */
  startMatch() {
    if (this.teams.length !== 2) {
      throw new Error('Match requires 2 teams');
    }
    if (!this.toss) {
      throw new Error('Toss must be completed before match starts');
    }
    
    this.status = MatchStatus.IN_PROGRESS;
    
    // Create first innings
    const battingTeam = this.getBattingFirstTeam();
    const bowlingTeam = this.getBowlingFirstTeam();
    
    const firstInnings = new Innings({
      inningsNumber: 1,
      battingTeamId: battingTeam.id,
      bowlingTeamId: bowlingTeam.id,
      oversLimit: this.oversLimit
    });
    
    this.innings.push(firstInnings);
    this.currentInningsIndex = 0;
    this.updatedAt = Date.now();
    
    return firstInnings;
  }

  /**
   * Get current innings
   */
  getCurrentInnings() {
    if (this.innings.length === 0) return null;
    return this.innings[this.currentInningsIndex];
  }

  /**
   * Start second innings
   */
  startSecondInnings() {
    const firstInnings = this.innings[0];
    if (!firstInnings || !firstInnings.isComplete()) {
      throw new Error('First innings must be complete');
    }
    
    const secondInnings = new Innings({
      inningsNumber: 2,
      battingTeamId: firstInnings.bowlingTeamId,
      bowlingTeamId: firstInnings.battingTeamId,
      oversLimit: this.oversLimit,
      target: firstInnings.totalRuns + 1
    });
    
    this.innings.push(secondInnings);
    this.currentInningsIndex = 1;
    this.updatedAt = Date.now();
    
    return secondInnings;
  }

  /**
   * Check if match is complete
   */
  isComplete() {
    return this.status === MatchStatus.COMPLETED || 
           this.status === MatchStatus.ABANDONED ||
           this.status === MatchStatus.NO_RESULT;
  }

  /**
   * Calculate and set match result
   */
  calculateResult() {
    if (this.innings.length < 2) return null;
    
    const innings1 = this.innings[0];
    const innings2 = this.innings[1];
    
    const score1 = innings1.totalRuns;
    const score2 = innings2.totalRuns;
    
    let result = new MatchResult();
    
    if (score2 > score1) {
      // Batting second team won
      result.winnerTeamId = innings2.battingTeamId;
      result.resultType = 'wickets';
      result.margin = 10 - innings2.wicketsFallen;
      result.description = `${this.getTeam(result.winnerTeamId).name} won by ${result.margin} wickets`;
    } else if (score1 > score2) {
      // Batting first team won
      result.winnerTeamId = innings1.battingTeamId;
      result.resultType = 'runs';
      result.margin = score1 - score2;
      result.description = `${this.getTeam(result.winnerTeamId).name} won by ${result.margin} runs`;
    } else {
      // Tie
      result.resultType = 'tie';
      result.description = 'Match tied';
    }
    
    this.result = result;
    this.status = MatchStatus.COMPLETED;
    this.updatedAt = Date.now();
    
    return result;
  }

  /**
   * Get match summary
   */
  getSummary() {
    return {
      matchName: this.matchName,
      venue: this.venue,
      date: this.date,
      status: this.status,
      teamA: this.getTeamA()?.name,
      teamB: this.getTeamB()?.name,
      innings1Score: this.innings[0]?.getFullScoreString() || '-',
      innings2Score: this.innings[1]?.getFullScoreString() || '-',
      result: this.result?.description || 'In Progress'
    };
  }

  /**
   * Get player from any team by ID
   */
  getPlayer(playerId) {
    for (const team of this.teams) {
      const player = team.getPlayer(playerId);
      if (player) return player;
    }
    return null;
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tournamentName: this.tournamentName,
      matchName: this.matchName,
      venue: this.venue,
      date: this.date,
      matchType: this.matchType,
      oversLimit: this.oversLimit,
      maxInnings: this.maxInnings,
      teams: this.teams.map(t => t.toJSON()),
      toss: this.toss ? this.toss.toJSON() : null,
      umpires: [...this.umpires],
      scorers: [...this.scorers],
      referee: this.referee,
      innings: this.innings.map(i => i.toJSON()),
      currentInningsIndex: this.currentInningsIndex,
      status: this.status,
      result: this.result ? this.result.toJSON() : null,
      powerplayConfig: this.powerplayConfig.toJSON(),
      dlsApplied: this.dlsApplied,
      dlsTarget: this.dlsTarget
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new Match(data);
  }
}

export default Match;
