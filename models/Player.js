/**
 * Player Model
 * Represents a cricket player with their role and statistics
 */

// Player roles enum
export const PlayerRole = {
  BATSMAN: 'BAT',
  BOWLER: 'BOWL',
  ALL_ROUNDER: 'AR',
  WICKET_KEEPER: 'WK'
};

// Batting stats template
export const createBattingStats = () => ({
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  strikeRate: 0,
  isOut: false,
  dismissal: null,
  position: null
});

// Bowling stats template
export const createBowlingStats = () => ({
  overs: 0,
  ballsBowled: 0,
  maidens: 0,
  runsConceded: 0,
  wickets: 0,
  economy: 0,
  wides: 0,
  noBalls: 0,
  dotBalls: 0
});

// Fielding stats template
export const createFieldingStats = () => ({
  catches: 0,
  runOuts: 0,
  stumpings: 0,
  drops: 0
});

/**
 * Player class
 */
export class Player {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.role = data.role || PlayerRole.BATSMAN;
    this.jerseyNumber = data.jerseyNumber || null;
    
    // Match-specific stats (reset each match)
    this.battingStats = data.battingStats || createBattingStats();
    this.bowlingStats = data.bowlingStats || createBowlingStats();
    this.fieldingStats = data.fieldingStats || createFieldingStats();
  }

  generateId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Reset all stats for a new match
   */
  resetStats() {
    this.battingStats = createBattingStats();
    this.bowlingStats = createBowlingStats();
    this.fieldingStats = createFieldingStats();
  }

  /**
   * Calculate strike rate
   */
  calculateStrikeRate() {
    if (this.battingStats.ballsFaced === 0) return 0;
    return ((this.battingStats.runs / this.battingStats.ballsFaced) * 100).toFixed(2);
  }

  /**
   * Calculate bowling economy
   */
  calculateEconomy() {
    const overs = this.bowlingStats.ballsBowled / 6;
    if (overs === 0) return 0;
    return (this.bowlingStats.runsConceded / overs).toFixed(2);
  }

  /**
   * Get formatted overs bowled (e.g., "4.3")
   */
  getFormattedOvers() {
    const completeOvers = Math.floor(this.bowlingStats.ballsBowled / 6);
    const remainingBalls = this.bowlingStats.ballsBowled % 6;
    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : `${completeOvers}`;
  }

  /**
   * Check if player is a batsman type
   */
  isBatsman() {
    return this.role === PlayerRole.BATSMAN || this.role === PlayerRole.ALL_ROUNDER;
  }

  /**
   * Check if player is a bowler type
   */
  isBowler() {
    return this.role === PlayerRole.BOWLER || this.role === PlayerRole.ALL_ROUNDER;
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      jerseyNumber: this.jerseyNumber,
      battingStats: { ...this.battingStats },
      bowlingStats: { ...this.bowlingStats },
      fieldingStats: { ...this.fieldingStats }
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new Player(data);
  }
}

export default Player;
