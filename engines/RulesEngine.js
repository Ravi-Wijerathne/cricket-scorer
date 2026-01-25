/**
 * Rules Engine
 * Handles all cricket rules validation and automatic decisions
 */

import { MatchStatus } from '../models/Match.js';
import { InningsStatus, InningsEndReason } from '../models/Innings.js';
import { WicketType, BOWLER_CREDITED_WICKETS } from '../models/BallEvent.js';

export class RulesEngine {
  constructor(match) {
    this.match = match;
  }

  // ============================================
  // INNINGS END CONDITIONS
  // ============================================

  /**
   * Check if innings should end
   * Returns { shouldEnd: boolean, reason: string } or null
   */
  checkInningsEnd(innings) {
    // All out (10 wickets)
    if (innings.wicketsFallen >= 10) {
      return { shouldEnd: true, reason: InningsEndReason.ALL_OUT };
    }

    // Overs complete
    if (innings.oversLimit) {
      const legalBalls = innings.getTotalLegalBalls();
      if (legalBalls >= innings.oversLimit * 6) {
        return { shouldEnd: true, reason: InningsEndReason.OVERS_COMPLETE };
      }
    }

    // Target achieved (2nd innings)
    if (innings.target && innings.totalRuns >= innings.target) {
      return { shouldEnd: true, reason: InningsEndReason.TARGET_ACHIEVED };
    }

    return { shouldEnd: false, reason: null };
  }

  // ============================================
  // BALL VALIDATION
  // ============================================

  /**
   * Check if a ball can be bowled
   */
  canBowlBall(innings) {
    // Check innings status
    if (innings.status !== InningsStatus.IN_PROGRESS) {
      return { valid: false, reason: 'Innings not in progress' };
    }

    // Check if we have batsmen
    if (!innings.strikerId || !innings.nonStrikerId) {
      return { valid: false, reason: 'Need two batsmen at the crease' };
    }

    // Check if we have a bowler
    if (!innings.currentBowlerId) {
      return { valid: false, reason: 'No bowler selected' };
    }

    // Check if over is complete
    const currentOver = innings.getCurrentOver();
    if (currentOver && currentOver.isComplete()) {
      return { valid: false, reason: 'Over complete. Select new bowler.' };
    }

    return { valid: true };
  }

  /**
   * Check if bowler can bowl the next over
   * (Can't bowl consecutive overs)
   */
  canBowlerBowlNextOver(innings, bowlerId) {
    const overs = innings.overs;
    if (overs.length === 0) return true;

    // Get last completed over
    const lastOver = overs[overs.length - 1];
    if (!lastOver.isComplete()) {
      // Current over not complete
      return true;
    }

    // Can't bowl consecutive overs
    return lastOver.bowlerId !== bowlerId;
  }

  /**
   * Get available bowlers for next over
   */
  getAvailableBowlers(innings) {
    const bowlingTeam = this.match.getTeam(innings.bowlingTeamId);
    if (!bowlingTeam) return [];

    const lastBowlerId = innings.getCurrentOver()?.bowlerId;
    
    return bowlingTeam.players.filter(player => {
      // Exclude last over's bowler
      if (player.id === lastBowlerId) return false;
      // Can add more rules (over limits per bowler, etc.)
      return true;
    });
  }

  // ============================================
  // WICKET VALIDATION
  // ============================================

  /**
   * Validate wicket type
   */
  validateWicket(wicketType, ballEvent) {
    const validations = {
      [WicketType.BOWLED]: true,
      [WicketType.CAUGHT]: wicketType === WicketType.CAUGHT,
      [WicketType.CAUGHT_BEHIND]: wicketType === WicketType.CAUGHT_BEHIND,
      [WicketType.CAUGHT_AND_BOWLED]: wicketType === WicketType.CAUGHT_AND_BOWLED,
      [WicketType.LBW]: true,
      [WicketType.STUMPED]: true,
      [WicketType.RUN_OUT]: true,
      [WicketType.HIT_WICKET]: true,
      [WicketType.OBSTRUCTING_FIELD]: true,
      [WicketType.RETIRED_OUT]: true,
      [WicketType.RETIRED_HURT]: true,
      [WicketType.TIMED_OUT]: true,
      [WicketType.HANDLED_BALL]: true
    };

    return validations[wicketType] || false;
  }

  /**
   * Check if wicket requires fielder
   */
  requiresFielder(wicketType) {
    return [
      WicketType.CAUGHT,
      WicketType.CAUGHT_BEHIND,
      WicketType.RUN_OUT,
      WicketType.STUMPED
    ].includes(wicketType);
  }

  /**
   * Check if bowler gets credit for wicket
   */
  isBowlerCredited(wicketType) {
    return BOWLER_CREDITED_WICKETS.includes(wicketType);
  }

  // ============================================
  // EXTRAS VALIDATION
  // ============================================

  /**
   * Check if delivery counts as legal ball
   */
  isLegalDelivery(ballEvent) {
    // Wides and No-balls are not legal
    return !ballEvent.isWide() && !ballEvent.isNoBall();
  }

  /**
   * Get default runs for extras
   */
  getDefaultExtraRuns(extraType) {
    switch (extraType) {
      case 'WIDE':
        return 1; // Wide = 1 run + any additional
      case 'NO_BALL':
        return 1; // No-ball = 1 run + any runs scored
      case 'BYE':
      case 'LEG_BYE':
        return 0; // Byes need runs specified
      case 'PENALTY':
        return 5; // Penalty runs
      default:
        return 0;
    }
  }

  // ============================================
  // STRIKE ROTATION RULES
  // ============================================

  /**
   * Check if strike should rotate
   */
  shouldRotateStrike(ballEvent, isEndOfOver) {
    // End of over always rotates (handled separately)
    if (isEndOfOver) return true;

    // Odd runs = rotate
    const totalRuns = ballEvent.getTotalRuns();
    return totalRuns % 2 === 1;
  }

  /**
   * Determine which batsman is out on run-out
   */
  getRunOutBatsman(innings, crossedAtTimeOfThrow) {
    // If batsmen have crossed, non-striker is out
    // If not crossed, striker is out
    return crossedAtTimeOfThrow ? innings.nonStrikerId : innings.strikerId;
  }

  // ============================================
  // MATCH STATE VALIDATION
  // ============================================

  /**
   * Check if match can start
   */
  canStartMatch() {
    // Need 2 teams
    if (this.match.teams.length !== 2) {
      return { valid: false, reason: 'Need 2 teams' };
    }

    // Need toss
    if (!this.match.toss) {
      return { valid: false, reason: 'Toss not completed' };
    }

    // Teams should have at least 2 players
    for (const team of this.match.teams) {
      if (team.players.length < 2) {
        return { valid: false, reason: `${team.name} needs at least 2 players` };
      }
    }

    return { valid: true };
  }

  /**
   * Check if second innings can start
   */
  canStartSecondInnings() {
    if (this.match.innings.length === 0) {
      return { valid: false, reason: 'First innings not started' };
    }

    const firstInnings = this.match.innings[0];
    if (!firstInnings.isComplete()) {
      return { valid: false, reason: 'First innings not complete' };
    }

    if (this.match.innings.length >= 2) {
      return { valid: false, reason: 'Second innings already exists' };
    }

    return { valid: true };
  }

  /**
   * Check match completion conditions
   */
  checkMatchEnd() {
    // For limited overs
    if (this.match.innings.length < 2) {
      return { shouldEnd: false };
    }

    const secondInnings = this.match.innings[1];
    
    // Target achieved
    if (secondInnings.target && secondInnings.totalRuns >= secondInnings.target) {
      return { shouldEnd: true, reason: 'TARGET_ACHIEVED' };
    }

    // Second innings complete without reaching target
    if (secondInnings.isComplete()) {
      return { shouldEnd: true, reason: 'INNINGS_COMPLETE' };
    }

    return { shouldEnd: false };
  }

  // ============================================
  // POWERPLAY RULES
  // ============================================

  /**
   * Get current powerplay phase
   */
  getCurrentPowerplay(innings) {
    const currentOver = innings.overs.length;
    return this.match.powerplayConfig.getCurrentPowerplay(currentOver + 1);
  }

  /**
   * Get fielding restrictions for current powerplay
   */
  getFieldingRestrictions(powerplayPhase) {
    switch (powerplayPhase) {
      case 1: // PP1 (Overs 1-6)
        return { maxOutside30YardCircle: 2 };
      case 2: // Middle overs
        return { maxOutside30YardCircle: 4 }; // T20 rule
      case 3: // Death overs
        return { maxOutside30YardCircle: 5 };
      default:
        return { maxOutside30YardCircle: 5 };
    }
  }

  // ============================================
  // OVER LIMIT RULES
  // ============================================

  /**
   * Check bowler over limits
   */
  getBowlerOverLimit() {
    const totalOvers = this.match.oversLimit;
    if (!totalOvers) return null; // Unlimited (Test match)

    // Standard rule: Max 20% of total overs
    return Math.floor(totalOvers / 5);
  }

  /**
   * Check if bowler has reached over limit
   */
  hasBowlerReachedLimit(innings, bowlerId) {
    const limit = this.getBowlerOverLimit();
    if (!limit) return false;

    const bowlerOvers = innings.overs.filter(o => 
      o.bowlerId === bowlerId && o.isComplete()
    ).length;

    return bowlerOvers >= limit;
  }

  // ============================================
  // RESULT CALCULATION
  // ============================================

  /**
   * Calculate match result
   */
  calculateResult() {
    if (this.match.innings.length < 2) return null;

    const innings1 = this.match.innings[0];
    const innings2 = this.match.innings[1];

    const score1 = innings1.totalRuns;
    const score2 = innings2.totalRuns;

    if (score2 > score1) {
      // Team batting second won
      const wicketsRemaining = 10 - innings2.wicketsFallen;
      return {
        winnerId: innings2.battingTeamId,
        margin: wicketsRemaining,
        marginType: 'wickets',
        description: `Won by ${wicketsRemaining} wickets`
      };
    } else if (score1 > score2) {
      // Team batting first won
      const runMargin = score1 - score2;
      return {
        winnerId: innings1.battingTeamId,
        margin: runMargin,
        marginType: 'runs',
        description: `Won by ${runMargin} runs`
      };
    } else {
      // Tie
      return {
        winnerId: null,
        margin: 0,
        marginType: 'tie',
        description: 'Match Tied'
      };
    }
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Get available batsmen for new innings or after wicket
   */
  getAvailableBatsmen(innings) {
    const battingTeam = this.match.getTeam(innings.battingTeamId);
    if (!battingTeam) return [];

    const usedBatsmen = new Set(innings.battingOrder);
    
    return battingTeam.players.filter(player => {
      // Not already batted
      if (usedBatsmen.has(player.id)) return false;
      // Not currently at crease
      if (player.id === innings.strikerId) return false;
      if (player.id === innings.nonStrikerId) return false;
      return true;
    });
  }

  /**
   * Validate ball event before recording
   */
  validateBallEvent(ballData) {
    const errors = [];

    // Check runs are valid
    if (ballData.runsOffBat < 0 || ballData.runsOffBat > 6) {
      errors.push('Invalid runs off bat');
    }

    // Check extras
    if (ballData.extras && ballData.extras.runs < 0) {
      errors.push('Invalid extra runs');
    }

    // Check wicket
    if (ballData.wicket && !ballData.wicket.type) {
      errors.push('Wicket type required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default RulesEngine;
