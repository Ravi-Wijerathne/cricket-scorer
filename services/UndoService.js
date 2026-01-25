/**
 * Undo Service
 * Handles undo/redo operations for ball events
 * 
 * Strategy: Store BallEvents as immutable
 * Undo = remove last BallEvent and recalculate
 */

import { Match } from '../models/Match.js';
import { ScoringEngine } from '../engines/ScoringEngine.js';

export class UndoService {
  constructor(storageService) {
    this.storageService = storageService;
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = 50;
  }

  /**
   * Save state before an action
   */
  saveState(match) {
    // Clone the match state
    const state = JSON.stringify(match.toJSON());
    
    this.undoStack.push(state);
    
    // Clear redo stack when new action is performed
    this.redoStack = [];
    
    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo last action
   * Returns the previous match state or null if nothing to undo
   */
  undo(currentMatch) {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Save current state to redo stack
    this.redoStack.push(JSON.stringify(currentMatch.toJSON()));

    // Get previous state
    const previousState = this.undoStack.pop();
    return Match.fromJSON(JSON.parse(previousState));
  }

  /**
   * Redo last undone action
   * Returns the next match state or null if nothing to redo
   */
  redo(currentMatch) {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack
    this.undoStack.push(JSON.stringify(currentMatch.toJSON()));

    // Get next state
    const nextState = this.redoStack.pop();
    return Match.fromJSON(JSON.parse(nextState));
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get number of available undos
   */
  getUndoCount() {
    return this.undoStack.length;
  }

  /**
   * Get number of available redos
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * Clear all undo/redo history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Undo last ball from innings
   * This is a more granular undo that only removes the last ball
   */
  undoLastBall(match) {
    const innings = match.getCurrentInnings();
    if (!innings) return null;

    const currentOver = innings.getCurrentOver();
    if (!currentOver || currentOver.balls.length === 0) {
      // Try previous over
      if (innings.overs.length > 1) {
        // Remove current empty over and go back to previous
        innings.overs.pop();
        const prevOver = innings.getCurrentOver();
        if (prevOver && prevOver.balls.length > 0) {
          return this.removeBallAndRecalculate(match, innings, prevOver);
        }
      }
      return null;
    }

    return this.removeBallAndRecalculate(match, innings, currentOver);
  }

  /**
   * Remove last ball and recalculate all stats
   */
  removeBallAndRecalculate(match, innings, over) {
    // Get the ball being removed
    const removedBall = over.removeLastBall();
    if (!removedBall) return null;

    // Recalculate innings from scratch
    this.recalculateInnings(match, innings);

    return {
      match,
      removedBall
    };
  }

  /**
   * Recalculate all innings stats from ball events
   * This is the reliable way to maintain consistency
   */
  recalculateInnings(match, innings) {
    // Reset innings totals
    innings.totalRuns = 0;
    innings.wicketsFallen = 0;
    innings.extras = {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0,
      getTotal() {
        return this.wides + this.noBalls + this.byes + this.legByes + this.penalty;
      },
      getDisplayString() {
        const parts = [];
        if (this.wides > 0) parts.push(`W ${this.wides}`);
        if (this.noBalls > 0) parts.push(`Nb ${this.noBalls}`);
        if (this.byes > 0) parts.push(`B ${this.byes}`);
        if (this.legByes > 0) parts.push(`Lb ${this.legByes}`);
        if (this.penalty > 0) parts.push(`P ${this.penalty}`);
        return parts.join(', ') || '0';
      }
    };
    innings.fallOfWickets = [];

    // Reset player stats
    const battingTeam = match.getTeam(innings.battingTeamId);
    const bowlingTeam = match.getTeam(innings.bowlingTeamId);

    if (battingTeam) {
      battingTeam.players.forEach(player => {
        player.battingStats = {
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
          dismissal: null,
          position: null
        };
      });
    }

    if (bowlingTeam) {
      bowlingTeam.players.forEach(player => {
        player.bowlingStats = {
          overs: 0,
          ballsBowled: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          economy: 0,
          wides: 0,
          noBalls: 0,
          dotBalls: 0
        };
        player.fieldingStats = {
          catches: 0,
          runOuts: 0,
          stumpings: 0,
          drops: 0
        };
      });
    }

    // Replay all ball events
    const allBalls = innings.getAllBallEvents();
    
    for (const ball of allBalls) {
      // Update innings totals
      innings.totalRuns += ball.getTotalRuns();

      // Update extras
      switch (ball.extras.type) {
        case 'WD':
          innings.extras.wides += ball.extras.runs;
          break;
        case 'NB':
          innings.extras.noBalls += ball.extras.runs;
          break;
        case 'B':
          innings.extras.byes += ball.extras.runs;
          break;
        case 'LB':
          innings.extras.legByes += ball.extras.runs;
          break;
        case 'PENALTY':
          innings.extras.penalty += ball.extras.runs;
          break;
      }

      // Update batsman stats
      const batsman = match.getPlayer(ball.batsmanId);
      if (batsman) {
        batsman.battingStats.runs += ball.getBatsmanRuns();
        if (ball.isLegal() || ball.isNoBall()) {
          batsman.battingStats.ballsFaced++;
        }
        if (ball.isFour()) batsman.battingStats.fours++;
        if (ball.isSix()) batsman.battingStats.sixes++;
        batsman.battingStats.strikeRate = batsman.calculateStrikeRate();
      }

      // Update bowler stats
      const bowler = match.getPlayer(ball.bowlerId);
      if (bowler) {
        if (ball.isLegal()) {
          bowler.bowlingStats.ballsBowled++;
        }
        bowler.bowlingStats.runsConceded += ball.getBowlerRuns();
        if (ball.isWide()) bowler.bowlingStats.wides++;
        if (ball.isNoBall()) bowler.bowlingStats.noBalls++;
        if (ball.isDotBall() && ball.isLegal()) {
          bowler.bowlingStats.dotBalls++;
        }
        bowler.bowlingStats.overs = Math.floor(bowler.bowlingStats.ballsBowled / 6);
        bowler.bowlingStats.economy = bowler.calculateEconomy();
      }

      // Handle wicket
      if (ball.isWicket()) {
        innings.wicketsFallen++;
        
        const outBatsman = match.getPlayer(ball.wicket.outBatsmanId);
        if (outBatsman) {
          outBatsman.battingStats.isOut = true;
          outBatsman.battingStats.dismissal = {
            type: ball.wicket.type,
            bowlerId: ball.wicket.bowlerId,
            fielderId: ball.wicket.fielderId
          };
        }

        // Credit bowler
        if (ball.wicket.isBowlerCredited && ball.wicket.isBowlerCredited()) {
          const wicketBowler = match.getPlayer(ball.wicket.bowlerId);
          if (wicketBowler) {
            wicketBowler.bowlingStats.wickets++;
          }
        }

        // Credit fielder
        if (ball.wicket.fielderId) {
          const fielder = match.getPlayer(ball.wicket.fielderId);
          if (fielder) {
            switch (ball.wicket.type) {
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

        // Record fall of wicket
        innings.fallOfWickets.push({
          wicketNumber: innings.wicketsFallen,
          score: innings.totalRuns,
          overs: innings.getFormattedOvers(),
          batsmanId: ball.wicket.outBatsmanId,
          batsmanName: outBatsman?.name || 'Unknown'
        });
      }
    }

    // Recalculate maidens
    for (const over of innings.overs) {
      if (over.isMaiden()) {
        const bowler = match.getPlayer(over.bowlerId);
        if (bowler) {
          bowler.bowlingStats.maidens++;
        }
      }
    }

    // Restore current batsmen (from last ball or maintain current)
    const lastBall = allBalls[allBalls.length - 1];
    if (lastBall) {
      // Determine strike based on runs and over completion
      innings.strikerId = lastBall.batsmanId;
      innings.nonStrikerId = lastBall.nonStrikerId;
      
      // Check if strike should be swapped
      if (lastBall.shouldRotateStrike()) {
        const temp = innings.strikerId;
        innings.strikerId = innings.nonStrikerId;
        innings.nonStrikerId = temp;
      }
    }

    return innings;
  }

  /**
   * Edit a specific ball event
   */
  editBall(match, ballId, newBallData) {
    // Save state for undo
    this.saveState(match);

    const innings = match.getCurrentInnings();
    if (!innings) return null;

    // Find and replace the ball
    for (const over of innings.overs) {
      const ballIndex = over.balls.findIndex(b => b.id === ballId);
      if (ballIndex !== -1) {
        // Update ball data while keeping the ID
        const oldBall = over.balls[ballIndex];
        over.balls[ballIndex] = {
          ...oldBall,
          ...newBallData,
          id: ballId
        };
        
        // Recalculate from this point
        this.recalculateInnings(match, innings);
        return match;
      }
    }

    return null;
  }

  /**
   * Get ball history for editing
   */
  getBallHistory(innings, count = 10) {
    const allBalls = innings.getAllBallEvents();
    return allBalls.slice(-count).reverse();
  }

  /**
   * Save match state periodically (auto-save)
   */
  async autoSave(match) {
    if (this.storageService) {
      await this.storageService.saveMatch(match);
    }
  }
}

// Factory function to create with storage service
export function createUndoService(storageService) {
  return new UndoService(storageService);
}

export default UndoService;
