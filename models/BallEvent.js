/**
 * BallEvent Model
 * The heart of the scoring system - represents every delivery
 */

// Extra types enum
export const ExtraType = {
  NONE: 'NONE',
  WIDE: 'WD',
  NO_BALL: 'NB',
  BYE: 'B',
  LEG_BYE: 'LB',
  PENALTY: 'PENALTY'
};

// Wicket types enum
export const WicketType = {
  BOWLED: 'BOWLED',
  CAUGHT: 'CAUGHT',
  CAUGHT_BEHIND: 'CAUGHT_BEHIND',
  CAUGHT_AND_BOWLED: 'CAUGHT_AND_BOWLED',
  LBW: 'LBW',
  STUMPED: 'STUMPED',
  RUN_OUT: 'RUN_OUT',
  HIT_WICKET: 'HIT_WICKET',
  OBSTRUCTING_FIELD: 'OBSTRUCTING_FIELD',
  RETIRED_OUT: 'RETIRED_OUT',
  RETIRED_HURT: 'RETIRED_HURT',
  TIMED_OUT: 'TIMED_OUT',
  HANDLED_BALL: 'HANDLED_BALL'
};

// Wickets that credit the bowler
export const BOWLER_CREDITED_WICKETS = [
  WicketType.BOWLED,
  WicketType.CAUGHT,
  WicketType.CAUGHT_BEHIND,
  WicketType.CAUGHT_AND_BOWLED,
  WicketType.LBW,
  WicketType.STUMPED,
  WicketType.HIT_WICKET
];

/**
 * Wicket details class
 */
export class Wicket {
  constructor(data = {}) {
    this.type = data.type || null;
    this.outBatsmanId = data.outBatsmanId || null;
    this.bowlerId = data.bowlerId || null;
    this.fielderId = data.fielderId || null;
    this.fielder2Id = data.fielder2Id || null; // For run-outs with 2 fielders
  }

  /**
   * Check if bowler gets credit for this wicket
   */
  isBowlerCredited() {
    return BOWLER_CREDITED_WICKETS.includes(this.type);
  }

  toJSON() {
    return {
      type: this.type,
      outBatsmanId: this.outBatsmanId,
      bowlerId: this.bowlerId,
      fielderId: this.fielderId,
      fielder2Id: this.fielder2Id
    };
  }

  static fromJSON(data) {
    return data ? new Wicket(data) : null;
  }
}

/**
 * Extra details class
 */
export class Extra {
  constructor(data = {}) {
    this.type = data.type || ExtraType.NONE;
    this.runs = data.runs || 0;
  }

  /**
   * Check if this extra is a legal delivery
   */
  isLegal() {
    return this.type === ExtraType.NONE || 
           this.type === ExtraType.BYE || 
           this.type === ExtraType.LEG_BYE;
  }

  toJSON() {
    return {
      type: this.type,
      runs: this.runs
    };
  }

  static fromJSON(data) {
    return data ? new Extra(data) : new Extra();
  }
}

/**
 * BallEvent class - represents a single delivery
 */
export class BallEvent {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.timestamp = data.timestamp || Date.now();
    
    // Players involved
    this.batsmanId = data.batsmanId || null;
    this.nonStrikerId = data.nonStrikerId || null;
    this.bowlerId = data.bowlerId || null;
    
    // Runs
    this.runsOffBat = data.runsOffBat || 0;
    
    // Extras
    this.extras = data.extras ? Extra.fromJSON(data.extras) : new Extra();
    
    // Wicket (if any)
    this.wicket = data.wicket ? Wicket.fromJSON(data.wicket) : null;
    
    // Over context
    this.overNumber = data.overNumber || 0;
    this.ballInOver = data.ballInOver || 0;
    
    // Commentary (optional)
    this.commentary = data.commentary || '';
  }

  generateId() {
    return 'ball_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if this is a legal delivery
   */
  isLegal() {
    return this.extras.isLegal();
  }

  /**
   * Check if this delivery resulted in a wicket
   */
  isWicket() {
    return this.wicket !== null && this.wicket.type !== null;
  }

  /**
   * Check if this is a wide
   */
  isWide() {
    return this.extras.type === ExtraType.WIDE;
  }

  /**
   * Check if this is a no-ball
   */
  isNoBall() {
    return this.extras.type === ExtraType.NO_BALL;
  }

  /**
   * Check if this is a bye
   */
  isBye() {
    return this.extras.type === ExtraType.BYE;
  }

  /**
   * Check if this is a leg bye
   */
  isLegBye() {
    return this.extras.type === ExtraType.LEG_BYE;
  }

  /**
   * Check if this is a boundary four
   */
  isFour() {
    return this.runsOffBat === 4;
  }

  /**
   * Check if this is a six
   */
  isSix() {
    return this.runsOffBat === 6;
  }

  /**
   * Check if this is a dot ball (no runs scored)
   */
  isDotBall() {
    return this.getTotalRuns() === 0 && !this.isWicket();
  }

  /**
   * Get total runs from this delivery (bat + extras)
   */
  getTotalRuns() {
    return this.runsOffBat + this.extras.runs;
  }

  /**
   * Get runs credited to batsman
   */
  getBatsmanRuns() {
    // Byes and leg byes don't count for batsman
    if (this.isBye() || this.isLegBye()) {
      return 0;
    }
    return this.runsOffBat;
  }

  /**
   * Get runs conceded by bowler
   */
  getBowlerRuns() {
    // Byes and leg byes don't count against bowler
    if (this.isBye() || this.isLegBye()) {
      return 0;
    }
    return this.runsOffBat + this.extras.runs;
  }

  /**
   * Check if strike should rotate
   */
  shouldRotateStrike() {
    const totalRuns = this.getTotalRuns();
    // Odd runs = rotate strike
    return totalRuns % 2 === 1;
  }

  /**
   * Get display string for this ball (e.g., "1", "4", "W", "Wd", "NB")
   */
  getDisplayString() {
    let display = '';
    
    if (this.isWide()) {
      display = 'Wd';
      if (this.extras.runs > 1) {
        display += '+' + (this.extras.runs - 1);
      }
    } else if (this.isNoBall()) {
      display = 'Nb';
      if (this.runsOffBat > 0) {
        display += '+' + this.runsOffBat;
      }
    } else if (this.isWicket()) {
      display = 'W';
    } else if (this.isBye()) {
      display = this.extras.runs + 'B';
    } else if (this.isLegBye()) {
      display = this.extras.runs + 'Lb';
    } else {
      display = this.runsOffBat.toString();
    }
    
    return display;
  }

  /**
   * Get ball number display (e.g., "12.3")
   */
  getBallNumberDisplay() {
    return `${this.overNumber}.${this.ballInOver}`;
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      batsmanId: this.batsmanId,
      nonStrikerId: this.nonStrikerId,
      bowlerId: this.bowlerId,
      runsOffBat: this.runsOffBat,
      extras: this.extras.toJSON(),
      wicket: this.wicket ? this.wicket.toJSON() : null,
      overNumber: this.overNumber,
      ballInOver: this.ballInOver,
      commentary: this.commentary
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new BallEvent(data);
  }
}

export default BallEvent;
