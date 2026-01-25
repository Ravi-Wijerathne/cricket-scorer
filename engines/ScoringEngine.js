/**
 * Scoring Engine
 * The heart of the scoring system - processes ball-by-ball events
 */

import { BallEvent, ExtraType, Wicket, Extra } from '../models/BallEvent.js';
import { InningsStatus, InningsEndReason } from '../models/Innings.js';

/**
 * ScoringEngine - Handles all ball-by-ball scoring logic
 */
export class ScoringEngine {
  constructor(match) {
    this.match = match;
  }

  /**
   * Record a ball event
   * This is the main entry point for scoring
   */
  recordBall(ballData) {
    const innings = this.match.getCurrentInnings();
    if (!innings || innings.isComplete()) {
      throw new Error('No active innings to record ball');
    }

    // Get current over
    let currentOver = innings.getCurrentOver();
    if (!currentOver) {
      throw new Error('No current over');
    }

    // Check if current over is complete and we need a new one
    if (currentOver.isComplete()) {
      throw new Error('Over is complete. Start a new over first.');
    }

    // Create ball event
    const ballEvent = new BallEvent({
      batsmanId: innings.strikerId,
      nonStrikerId: innings.nonStrikerId,
      bowlerId: innings.currentBowlerId,
      overNumber: currentOver.overNumber,
      ...ballData
    });

    // Add ball to over
    currentOver.addBall(ballEvent);

    // Update innings totals
    this.updateInningsTotals(innings, ballEvent);

    // Update player stats
    this.updatePlayerStats(ballEvent);

    // Handle wicket
    if (ballEvent.isWicket()) {
      this.handleWicket(innings, ballEvent);
    }

    // Handle strike rotation
    this.handleStrikeRotation(innings, ballEvent, currentOver);

    // Check for innings end conditions
    this.checkInningsEnd(innings);

    // Update match timestamp
    this.match.updatedAt = Date.now();

    return ballEvent;
  }

  /**
   * Record runs off the bat
   */
  recordRuns(runs) {
    return this.recordBall({ runsOffBat: runs });
  }

  /**
   * Record a dot ball
   */
  recordDotBall() {
    return this.recordRuns(0);
  }

  /**
   * Record a wide
   */
  recordWide(additionalRuns = 0) {
    return this.recordBall({
      runsOffBat: 0,
      extras: { type: ExtraType.WIDE, runs: 1 + additionalRuns }
    });
  }

  /**
   * Record a no-ball
   */
  recordNoBall(runsOffBat = 0, additionalRuns = 0) {
    return this.recordBall({
      runsOffBat: runsOffBat,
      extras: { type: ExtraType.NO_BALL, runs: 1 + additionalRuns }
    });
  }

  /**
   * Record byes
   */
  recordByes(runs) {
    return this.recordBall({
      runsOffBat: 0,
      extras: { type: ExtraType.BYE, runs }
    });
  }

  /**
   * Record leg byes
   */
  recordLegByes(runs) {
    return this.recordBall({
      runsOffBat: 0,
      extras: { type: ExtraType.LEG_BYE, runs }
    });
  }

  /**
   * Record a wicket
   */
  recordWicket(wicketData, runsOffBat = 0, extras = null) {
    const innings = this.match.getCurrentInnings();
    
    return this.recordBall({
      runsOffBat,
      extras: extras || { type: ExtraType.NONE, runs: 0 },
      wicket: {
        type: wicketData.type,
        outBatsmanId: wicketData.outBatsmanId || innings.strikerId,
        bowlerId: innings.currentBowlerId,
        fielderId: wicketData.fielderId || null,
        fielder2Id: wicketData.fielder2Id || null
      }
    });
  }

  /**
   * Update innings totals from ball event
   */
  updateInningsTotals(innings, ballEvent) {
    // Add total runs
    innings.totalRuns += ballEvent.getTotalRuns();

    // Update extras
    const extra = ballEvent.extras;
    switch (extra.type) {
      case ExtraType.WIDE:
        innings.extras.wides += extra.runs;
        break;
      case ExtraType.NO_BALL:
        innings.extras.noBalls += extra.runs;
        break;
      case ExtraType.BYE:
        innings.extras.byes += extra.runs;
        break;
      case ExtraType.LEG_BYE:
        innings.extras.legByes += extra.runs;
        break;
      case ExtraType.PENALTY:
        innings.extras.penalty += extra.runs;
        break;
    }
  }

  /**
   * Update player stats from ball event
   */
  updatePlayerStats(ballEvent) {
    // Update batsman stats
    const batsman = this.match.getPlayer(ballEvent.batsmanId);
    if (batsman) {
      batsman.battingStats.runs += ballEvent.getBatsmanRuns();
      
      // Ball faced only on legal deliveries (and no-balls)
      if (ballEvent.isLegal() || ballEvent.isNoBall()) {
        batsman.battingStats.ballsFaced++;
      }
      
      if (ballEvent.isFour()) batsman.battingStats.fours++;
      if (ballEvent.isSix()) batsman.battingStats.sixes++;
      
      // Update strike rate
      batsman.battingStats.strikeRate = batsman.calculateStrikeRate();
    }

    // Update bowler stats
    const bowler = this.match.getPlayer(ballEvent.bowlerId);
    if (bowler) {
      // Legal ball counts
      if (ballEvent.isLegal()) {
        bowler.bowlingStats.ballsBowled++;
      }
      
      // Runs conceded (byes and leg byes don't count)
      bowler.bowlingStats.runsConceded += ballEvent.getBowlerRuns();
      
      // Extras
      if (ballEvent.isWide()) bowler.bowlingStats.wides++;
      if (ballEvent.isNoBall()) bowler.bowlingStats.noBalls++;
      
      // Dot balls
      if (ballEvent.isDotBall() && ballEvent.isLegal()) {
        bowler.bowlingStats.dotBalls++;
      }
      
      // Update overs and economy
      bowler.bowlingStats.overs = Math.floor(bowler.bowlingStats.ballsBowled / 6);
      bowler.bowlingStats.economy = bowler.calculateEconomy();
    }
  }

  /**
   * Handle wicket effects
   */
  handleWicket(innings, ballEvent) {
    const wicket = ballEvent.wicket;
    
    // Record fall of wicket
    const outBatsman = this.match.getPlayer(wicket.outBatsmanId);
    if (outBatsman) {
      outBatsman.battingStats.isOut = true;
      outBatsman.battingStats.dismissal = {
        type: wicket.type,
        bowlerId: wicket.bowlerId,
        fielderId: wicket.fielderId
      };
      
      innings.recordFallOfWicket(wicket.outBatsmanId, outBatsman.name);
    }

    // Credit bowler if applicable
    if (wicket.isBowlerCredited()) {
      const bowler = this.match.getPlayer(wicket.bowlerId);
      if (bowler) {
        bowler.bowlingStats.wickets++;
      }
    }

    // Credit fielder
    if (wicket.fielderId) {
      const fielder = this.match.getPlayer(wicket.fielderId);
      if (fielder) {
        switch (wicket.type) {
          case 'CAUGHT':
          case 'CAUGHT_BEHIND':
            fielder.fieldingStats.catches++;
            break;
          case 'RUN_OUT':
            fielder.fieldingStats.runOuts++;
            break;
          case 'STUMPED':
            fielder.fieldingStats.stumpings++;
            break;
        }
      }
    }
  }

  /**
   * Handle strike rotation
   */
  handleStrikeRotation(innings, ballEvent, currentOver) {
    // Rotate strike based on runs
    if (ballEvent.shouldRotateStrike()) {
      innings.swapStrike();
    }
  }

  /**
   * Check if innings should end
   */
  checkInningsEnd(innings) {
    // All out
    if (innings.wicketsFallen >= 10) {
      innings.end(InningsEndReason.ALL_OUT);
      return true;
    }

    // Overs complete
    if (innings.oversLimit) {
      const legalBalls = innings.getTotalLegalBalls();
      if (legalBalls >= innings.oversLimit * 6) {
        innings.end(InningsEndReason.OVERS_COMPLETE);
        return true;
      }
    }

    // Target achieved (2nd innings)
    if (innings.target && innings.totalRuns >= innings.target) {
      innings.end(InningsEndReason.TARGET_ACHIEVED);
      // Calculate match result
      this.match.calculateResult();
      return true;
    }

    return false;
  }

  /**
   * Start a new over
   */
  startNewOver(bowlerId) {
    const innings = this.match.getCurrentInnings();
    if (!innings) {
      throw new Error('No active innings');
    }

    const currentOver = innings.getCurrentOver();
    if (currentOver && !currentOver.isComplete()) {
      throw new Error('Current over is not complete');
    }

    // Check for maiden
    if (currentOver && currentOver.isMaiden()) {
      const bowler = this.match.getPlayer(currentOver.bowlerId);
      if (bowler) {
        bowler.bowlingStats.maidens++;
      }
    }

    return innings.startNewOver(bowlerId);
  }

  /**
   * Set new batsman after wicket
   */
  setNewBatsman(newBatsmanId, replaceStriker = true) {
    const innings = this.match.getCurrentInnings();
    if (!innings) {
      throw new Error('No active innings');
    }

    innings.newBatsman(newBatsmanId, replaceStriker);
    
    // Reset batting position for new batsman
    const newBatsman = this.match.getPlayer(newBatsmanId);
    if (newBatsman) {
      newBatsman.battingStats.position = innings.battingOrder.length;
    }
  }

  /**
   * Get current match state for UI
   */
  getMatchState() {
    const innings = this.match.getCurrentInnings();
    if (!innings) return null;

    const striker = this.match.getPlayer(innings.strikerId);
    const nonStriker = this.match.getPlayer(innings.nonStrikerId);
    const bowler = this.match.getPlayer(innings.currentBowlerId);
    const currentOver = innings.getCurrentOver();

    return {
      score: innings.getScoreString(),
      overs: innings.getFormattedOvers(),
      runRate: innings.getCurrentRunRate(),
      requiredRate: innings.getRequiredRunRate(),
      target: innings.target,
      
      striker: striker ? {
        id: striker.id,
        name: striker.name,
        runs: striker.battingStats.runs,
        balls: striker.battingStats.ballsFaced,
        fours: striker.battingStats.fours,
        sixes: striker.battingStats.sixes,
        strikeRate: striker.battingStats.strikeRate
      } : null,
      
      nonStriker: nonStriker ? {
        id: nonStriker.id,
        name: nonStriker.name,
        runs: nonStriker.battingStats.runs,
        balls: nonStriker.battingStats.ballsFaced,
        fours: nonStriker.battingStats.fours,
        sixes: nonStriker.battingStats.sixes,
        strikeRate: nonStriker.battingStats.strikeRate
      } : null,
      
      bowler: bowler ? {
        id: bowler.id,
        name: bowler.name,
        overs: bowler.getFormattedOvers(),
        maidens: bowler.bowlingStats.maidens,
        runs: bowler.bowlingStats.runsConceded,
        wickets: bowler.bowlingStats.wickets,
        economy: bowler.bowlingStats.economy
      } : null,
      
      thisOver: currentOver ? currentOver.getOverSummary() : '',
      lastBall: currentOver?.getLastBall()?.getDisplayString() || '-',
      
      battingTeam: this.match.getTeam(innings.battingTeamId)?.name,
      bowlingTeam: this.match.getTeam(innings.bowlingTeamId)?.name,
      
      inningsNumber: innings.inningsNumber,
      isComplete: innings.isComplete()
    };
  }
}

export default ScoringEngine;
