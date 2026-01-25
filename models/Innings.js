/**
 * Innings Model
 * Represents one innings in a match
 */

import { Over } from './Over.js';

// Innings status enum
export const InningsStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DECLARED: 'DECLARED'
};

// End of innings reasons
export const InningsEndReason = {
  ALL_OUT: 'ALL_OUT',
  OVERS_COMPLETE: 'OVERS_COMPLETE',
  TARGET_ACHIEVED: 'TARGET_ACHIEVED',
  DECLARED: 'DECLARED',
  ABANDONED: 'ABANDONED'
};

/**
 * Fall of Wicket record
 */
export class FallOfWicket {
  constructor(data = {}) {
    this.wicketNumber = data.wicketNumber || 0;
    this.score = data.score || 0;
    this.overs = data.overs || '0.0';
    this.batsmanId = data.batsmanId || null;
    this.batsmanName = data.batsmanName || '';
  }

  toJSON() {
    return {
      wicketNumber: this.wicketNumber,
      score: this.score,
      overs: this.overs,
      batsmanId: this.batsmanId,
      batsmanName: this.batsmanName
    };
  }

  static fromJSON(data) {
    return new FallOfWicket(data);
  }
}

/**
 * Extras totals
 */
export class ExtrasTotal {
  constructor(data = {}) {
    this.wides = data.wides || 0;
    this.noBalls = data.noBalls || 0;
    this.byes = data.byes || 0;
    this.legByes = data.legByes || 0;
    this.penalty = data.penalty || 0;
  }

  getTotal() {
    return this.wides + this.noBalls + this.byes + this.legByes + this.penalty;
  }

  getDisplayString() {
    const parts = [];
    if (this.wides > 0) parts.push(`W ${this.wides}`);
    if (this.noBalls > 0) parts.push(`Nb ${this.noBalls}`);
    if (this.byes > 0) parts.push(`B ${this.byes}`);
    if (this.legByes > 0) parts.push(`Lb ${this.legByes}`);
    if (this.penalty > 0) parts.push(`P ${this.penalty}`);
    return parts.join(', ') || '0';
  }

  toJSON() {
    return {
      wides: this.wides,
      noBalls: this.noBalls,
      byes: this.byes,
      legByes: this.legByes,
      penalty: this.penalty
    };
  }

  static fromJSON(data) {
    return new ExtrasTotal(data);
  }
}

/**
 * Innings class
 */
export class Innings {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.inningsNumber = data.inningsNumber || 1;
    
    // Teams
    this.battingTeamId = data.battingTeamId || null;
    this.bowlingTeamId = data.bowlingTeamId || null;
    
    // Overs configuration
    this.oversLimit = data.oversLimit || 20;
    
    // Overs data
    this.overs = [];
    if (data.overs && Array.isArray(data.overs)) {
      this.overs = data.overs.map(o => 
        o instanceof Over ? o : Over.fromJSON(o)
      );
    }
    
    // Current state
    this.currentOverIndex = data.currentOverIndex || 0;
    this.strikerId = data.strikerId || null;
    this.nonStrikerId = data.nonStrikerId || null;
    this.currentBowlerId = data.currentBowlerId || null;
    
    // Totals (calculated from ball events)
    this.totalRuns = data.totalRuns || 0;
    this.wicketsFallen = data.wicketsFallen || 0;
    this.extras = data.extras ? ExtrasTotal.fromJSON(data.extras) : new ExtrasTotal();
    
    // Fall of wickets
    this.fallOfWickets = [];
    if (data.fallOfWickets && Array.isArray(data.fallOfWickets)) {
      this.fallOfWickets = data.fallOfWickets.map(f => FallOfWicket.fromJSON(f));
    }
    
    // Target (for 2nd innings)
    this.target = data.target || null;
    
    // Status
    this.status = data.status || InningsStatus.NOT_STARTED;
    this.endReason = data.endReason || null;
    
    // Batting order
    this.battingOrder = data.battingOrder || [];
    
    // Bowling order
    this.bowlingOrder = data.bowlingOrder || [];
  }

  generateId() {
    return 'innings_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Start the innings
   */
  start(strikerId, nonStrikerId, bowlerId) {
    this.status = InningsStatus.IN_PROGRESS;
    this.strikerId = strikerId;
    this.nonStrikerId = nonStrikerId;
    this.currentBowlerId = bowlerId;
    
    // Add to batting order
    if (!this.battingOrder.includes(strikerId)) {
      this.battingOrder.push(strikerId);
    }
    if (!this.battingOrder.includes(nonStrikerId)) {
      this.battingOrder.push(nonStrikerId);
    }
    
    // Add to bowling order
    if (!this.bowlingOrder.includes(bowlerId)) {
      this.bowlingOrder.push(bowlerId);
    }
    
    // Create first over
    this.overs.push(new Over({ overNumber: 0, bowlerId }));
  }

  /**
   * Get current over
   */
  getCurrentOver() {
    if (this.overs.length === 0) {
      return null;
    }
    return this.overs[this.overs.length - 1];
  }

  /**
   * Get total legal balls bowled
   */
  getTotalLegalBalls() {
    return this.overs.reduce((sum, over) => sum + over.getLegalBallCount(), 0);
  }

  /**
   * Get formatted overs (e.g., "12.3")
   */
  getFormattedOvers() {
    const totalBalls = this.getTotalLegalBalls();
    const completeOvers = Math.floor(totalBalls / 6);
    const remainingBalls = totalBalls % 6;
    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : `${completeOvers}`;
  }

  /**
   * Get all ball events in this innings
   */
  getAllBallEvents() {
    return this.overs.flatMap(over => over.balls);
  }

  /**
   * Get current run rate
   */
  getCurrentRunRate() {
    const overs = this.getTotalLegalBalls() / 6;
    if (overs === 0) return 0;
    return (this.totalRuns / overs).toFixed(2);
  }

  /**
   * Get required run rate (for 2nd innings)
   */
  getRequiredRunRate() {
    if (!this.target) return null;
    
    const runsNeeded = this.target - this.totalRuns;
    const ballsRemaining = (this.oversLimit * 6) - this.getTotalLegalBalls();
    const oversRemaining = ballsRemaining / 6;
    
    if (oversRemaining <= 0) return null;
    return (runsNeeded / oversRemaining).toFixed(2);
  }

  /**
   * Get projected score
   */
  getProjectedScore() {
    const crr = parseFloat(this.getCurrentRunRate());
    return Math.round(crr * this.oversLimit);
  }

  /**
   * Check if innings is complete
   */
  isComplete() {
    return this.status === InningsStatus.COMPLETED || 
           this.status === InningsStatus.DECLARED;
  }

  /**
   * End the innings
   */
  end(reason) {
    this.status = InningsStatus.COMPLETED;
    this.endReason = reason;
  }

  /**
   * Swap striker and non-striker
   */
  swapStrike() {
    const temp = this.strikerId;
    this.strikerId = this.nonStrikerId;
    this.nonStrikerId = temp;
  }

  /**
   * Start a new over
   */
  startNewOver(bowlerId) {
    const newOverNumber = this.overs.length;
    const newOver = new Over({ 
      overNumber: newOverNumber, 
      bowlerId 
    });
    this.overs.push(newOver);
    this.currentBowlerId = bowlerId;
    
    // Add to bowling order if new
    if (!this.bowlingOrder.includes(bowlerId)) {
      this.bowlingOrder.push(bowlerId);
    }
    
    // Swap strike at end of over
    this.swapStrike();
    
    return newOver;
  }

  /**
   * Record fall of wicket
   */
  recordFallOfWicket(batsmanId, batsmanName) {
    this.wicketsFallen++;
    
    const fow = new FallOfWicket({
      wicketNumber: this.wicketsFallen,
      score: this.totalRuns,
      overs: this.getFormattedOvers(),
      batsmanId,
      batsmanName
    });
    
    this.fallOfWickets.push(fow);
    return fow;
  }

  /**
   * Bring in new batsman
   */
  newBatsman(newBatsmanId, replaceStriker = true) {
    if (replaceStriker) {
      this.strikerId = newBatsmanId;
    } else {
      this.nonStrikerId = newBatsmanId;
    }
    
    // Add to batting order
    if (!this.battingOrder.includes(newBatsmanId)) {
      this.battingOrder.push(newBatsmanId);
    }
  }

  /**
   * Get score string (e.g., "145/3")
   */
  getScoreString() {
    return `${this.totalRuns}/${this.wicketsFallen}`;
  }

  /**
   * Get full score string (e.g., "145/3 (15.2)")
   */
  getFullScoreString() {
    return `${this.getScoreString()} (${this.getFormattedOvers()})`;
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      inningsNumber: this.inningsNumber,
      battingTeamId: this.battingTeamId,
      bowlingTeamId: this.bowlingTeamId,
      oversLimit: this.oversLimit,
      overs: this.overs.map(o => o.toJSON()),
      currentOverIndex: this.currentOverIndex,
      strikerId: this.strikerId,
      nonStrikerId: this.nonStrikerId,
      currentBowlerId: this.currentBowlerId,
      totalRuns: this.totalRuns,
      wicketsFallen: this.wicketsFallen,
      extras: this.extras.toJSON(),
      fallOfWickets: this.fallOfWickets.map(f => f.toJSON()),
      target: this.target,
      status: this.status,
      endReason: this.endReason,
      battingOrder: [...this.battingOrder],
      bowlingOrder: [...this.bowlingOrder]
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new Innings(data);
  }
}

export default Innings;
