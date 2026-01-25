/**
 * Over Model
 * Container for balls in an over
 */

import { BallEvent } from './BallEvent.js';

export class Over {
  constructor(data = {}) {
    this.overNumber = data.overNumber || 0;
    this.bowlerId = data.bowlerId || null;
    this.balls = [];
    
    // Initialize balls if provided
    if (data.balls && Array.isArray(data.balls)) {
      this.balls = data.balls.map(b => 
        b instanceof BallEvent ? b : BallEvent.fromJSON(b)
      );
    }
  }

  /**
   * Add a ball to this over
   */
  addBall(ballEvent) {
    const ball = ballEvent instanceof BallEvent ? ballEvent : new BallEvent(ballEvent);
    ball.overNumber = this.overNumber;
    ball.ballInOver = this.getLegalBallCount() + 1;
    this.balls.push(ball);
    return ball;
  }

  /**
   * Remove the last ball from this over
   */
  removeLastBall() {
    return this.balls.pop();
  }

  /**
   * Get the last ball
   */
  getLastBall() {
    return this.balls.length > 0 ? this.balls[this.balls.length - 1] : null;
  }

  /**
   * Get count of legal balls in this over
   */
  getLegalBallCount() {
    return this.balls.filter(ball => ball.isLegal()).length;
  }

  /**
   * Get total balls (including extras)
   */
  getTotalBallCount() {
    return this.balls.length;
  }

  /**
   * Check if over is complete (6 legal balls)
   */
  isComplete() {
    return this.getLegalBallCount() >= 6;
  }

  /**
   * Get total runs in this over
   */
  getTotalRuns() {
    return this.balls.reduce((sum, ball) => sum + ball.getTotalRuns(), 0);
  }

  /**
   * Get wickets in this over
   */
  getWickets() {
    return this.balls.filter(ball => ball.isWicket()).length;
  }

  /**
   * Check if this is a maiden over
   */
  isMaiden() {
    if (!this.isComplete()) return false;
    // Maiden = complete over with 0 runs
    return this.getTotalRuns() === 0;
  }

  /**
   * Get dot balls count
   */
  getDotBallCount() {
    return this.balls.filter(ball => ball.isDotBall()).length;
  }

  /**
   * Get boundaries (4s and 6s) count
   */
  getBoundaryCount() {
    return this.balls.filter(ball => ball.isFour() || ball.isSix()).length;
  }

  /**
   * Get extras breakdown
   */
  getExtrasBreakdown() {
    return {
      wides: this.balls.filter(b => b.isWide()).reduce((sum, b) => sum + b.extras.runs, 0),
      noBalls: this.balls.filter(b => b.isNoBall()).reduce((sum, b) => sum + b.extras.runs, 0),
      byes: this.balls.filter(b => b.isBye()).reduce((sum, b) => sum + b.extras.runs, 0),
      legByes: this.balls.filter(b => b.isLegBye()).reduce((sum, b) => sum + b.extras.runs, 0)
    };
  }

  /**
   * Get display string for over summary
   */
  getOverSummary() {
    return this.balls.map(ball => ball.getDisplayString()).join(' ');
  }

  /**
   * Get formatted over number (e.g., "12.3" for incomplete, "13" for complete)
   */
  getFormattedOverNumber() {
    const legalBalls = this.getLegalBallCount();
    if (legalBalls === 6) {
      return (this.overNumber + 1).toString();
    }
    return `${this.overNumber}.${legalBalls}`;
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      overNumber: this.overNumber,
      bowlerId: this.bowlerId,
      balls: this.balls.map(b => b.toJSON())
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new Over(data);
  }
}

export default Over;
