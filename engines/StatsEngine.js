/**
 * Stats Engine
 * Calculates and derives statistics from ball events
 * Stats are ALWAYS calculated, never stored manually
 */

export class StatsEngine {
  constructor(match) {
    this.match = match;
  }

  /**
   * Get batting stats for an innings
   */
  getBattingStats(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return [];

    const battingTeam = this.match.getTeam(innings.battingTeamId);
    if (!battingTeam) return [];

    const stats = [];
    
    // Process batting order
    for (const playerId of innings.battingOrder) {
      const player = battingTeam.getPlayer(playerId);
      if (!player) continue;

      const playerStats = this.calculateBattingStats(player, innings);
      stats.push(playerStats);
    }

    return stats;
  }

  /**
   * Calculate batting stats for a player from ball events
   */
  calculateBattingStats(player, innings) {
    const ballEvents = innings.getAllBallEvents();
    
    let runs = 0;
    let ballsFaced = 0;
    let fours = 0;
    let sixes = 0;
    let dismissal = null;

    for (const ball of ballEvents) {
      if (ball.batsmanId !== player.id) continue;

      // Count runs off bat (not byes/leg byes)
      runs += ball.getBatsmanRuns();
      
      // Ball faced on legal deliveries and no-balls
      if (ball.isLegal() || ball.isNoBall()) {
        ballsFaced++;
      }
      
      // Boundaries
      if (ball.isFour()) fours++;
      if (ball.isSix()) sixes++;
      
      // Dismissal
      if (ball.isWicket() && ball.wicket.outBatsmanId === player.id) {
        dismissal = this.formatDismissal(ball.wicket);
      }
    }

    // Check for run-out of non-striker
    for (const ball of ballEvents) {
      if (ball.isWicket() && 
          ball.wicket.outBatsmanId === player.id && 
          ball.batsmanId !== player.id) {
        dismissal = this.formatDismissal(ball.wicket);
      }
    }

    const strikeRate = ballsFaced > 0 
      ? ((runs / ballsFaced) * 100).toFixed(2) 
      : 0;

    return {
      id: player.id,
      name: player.name,
      runs,
      ballsFaced,
      fours,
      sixes,
      strikeRate,
      isOut: dismissal !== null,
      dismissal,
      isStriker: innings.strikerId === player.id,
      isNonStriker: innings.nonStrikerId === player.id
    };
  }

  /**
   * Format dismissal for display
   */
  formatDismissal(wicket) {
    const bowler = this.match.getPlayer(wicket.bowlerId);
    const fielder = wicket.fielderId ? this.match.getPlayer(wicket.fielderId) : null;
    
    switch (wicket.type) {
      case 'BOWLED':
        return `b ${bowler?.name || 'Unknown'}`;
      case 'CAUGHT':
        return `c ${fielder?.name || 'Unknown'} b ${bowler?.name || 'Unknown'}`;
      case 'CAUGHT_BEHIND':
        return `c †${fielder?.name || 'Unknown'} b ${bowler?.name || 'Unknown'}`;
      case 'CAUGHT_AND_BOWLED':
        return `c & b ${bowler?.name || 'Unknown'}`;
      case 'LBW':
        return `lbw b ${bowler?.name || 'Unknown'}`;
      case 'STUMPED':
        return `st †${fielder?.name || 'Unknown'} b ${bowler?.name || 'Unknown'}`;
      case 'RUN_OUT':
        return fielder ? `run out (${fielder.name})` : 'run out';
      case 'HIT_WICKET':
        return `hit wicket b ${bowler?.name || 'Unknown'}`;
      case 'RETIRED_HURT':
        return 'retired hurt';
      case 'RETIRED_OUT':
        return 'retired out';
      case 'OBSTRUCTING_FIELD':
        return 'obstructing the field';
      case 'TIMED_OUT':
        return 'timed out';
      case 'HANDLED_BALL':
        return 'handled the ball';
      default:
        return 'out';
    }
  }

  /**
   * Get bowling stats for an innings
   */
  getBowlingStats(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return [];

    const bowlingTeam = this.match.getTeam(innings.bowlingTeamId);
    if (!bowlingTeam) return [];

    const stats = [];
    
    // Process bowling order
    for (const playerId of innings.bowlingOrder) {
      const player = bowlingTeam.getPlayer(playerId);
      if (!player) continue;

      const playerStats = this.calculateBowlingStats(player, innings);
      stats.push(playerStats);
    }

    return stats;
  }

  /**
   * Calculate bowling stats for a player from ball events
   */
  calculateBowlingStats(player, innings) {
    const ballEvents = innings.getAllBallEvents();
    
    let legalBalls = 0;
    let runsConceded = 0;
    let wickets = 0;
    let wides = 0;
    let noBalls = 0;
    let dotBalls = 0;
    let maidens = 0;

    // Calculate per-over stats for maidens
    const overStats = {};

    for (const ball of ballEvents) {
      if (ball.bowlerId !== player.id) continue;

      // Legal balls
      if (ball.isLegal()) {
        legalBalls++;
      }

      // Runs conceded (byes and leg byes don't count)
      runsConceded += ball.getBowlerRuns();

      // Extras
      if (ball.isWide()) wides++;
      if (ball.isNoBall()) noBalls++;

      // Dot balls
      if (ball.isDotBall() && ball.isLegal()) {
        dotBalls++;
      }

      // Wickets (only bowler-credited)
      if (ball.isWicket() && ball.wicket.isBowlerCredited()) {
        wickets++;
      }

      // Track over stats for maiden calculation
      const overKey = ball.overNumber;
      if (!overStats[overKey]) {
        overStats[overKey] = { runs: 0, legalBalls: 0 };
      }
      overStats[overKey].runs += ball.getTotalRuns();
      if (ball.isLegal()) {
        overStats[overKey].legalBalls++;
      }
    }

    // Count maidens (complete overs with 0 runs)
    for (const over of Object.values(overStats)) {
      if (over.legalBalls === 6 && over.runs === 0) {
        maidens++;
      }
    }

    const oversDecimal = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;
    const economy = legalBalls > 0 
      ? (runsConceded / (legalBalls / 6)).toFixed(2) 
      : 0;

    const completeOvers = Math.floor(legalBalls / 6);
    const remainingBalls = legalBalls % 6;
    const oversDisplay = remainingBalls > 0 
      ? `${completeOvers}.${remainingBalls}` 
      : `${completeOvers}`;

    return {
      id: player.id,
      name: player.name,
      overs: oversDisplay,
      maidens,
      runsConceded,
      wickets,
      economy,
      wides,
      noBalls,
      dotBalls,
      isBowling: innings.currentBowlerId === player.id
    };
  }

  /**
   * Get fielding stats for a team in a match
   */
  getFieldingStats(teamId) {
    const team = this.match.getTeam(teamId);
    if (!team) return [];

    const stats = [];

    for (const player of team.players) {
      const playerStats = this.calculateFieldingStats(player);
      stats.push(playerStats);
    }

    return stats.filter(s => s.catches > 0 || s.runOuts > 0 || s.stumpings > 0);
  }

  /**
   * Calculate fielding stats for a player
   */
  calculateFieldingStats(player) {
    let catches = 0;
    let runOuts = 0;
    let stumpings = 0;

    for (const innings of this.match.innings) {
      const ballEvents = innings.getAllBallEvents();
      
      for (const ball of ballEvents) {
        if (!ball.isWicket()) continue;
        
        const wicket = ball.wicket;
        
        if (wicket.fielderId === player.id) {
          switch (wicket.type) {
            case 'CAUGHT':
            case 'CAUGHT_BEHIND':
            case 'CAUGHT_AND_BOWLED':
              catches++;
              break;
            case 'RUN_OUT':
              runOuts++;
              break;
            case 'STUMPED':
              stumpings++;
              break;
          }
        }
        
        // Second fielder for run outs
        if (wicket.fielder2Id === player.id && wicket.type === 'RUN_OUT') {
          runOuts++;
        }
      }
    }

    return {
      id: player.id,
      name: player.name,
      catches,
      runOuts,
      stumpings,
      total: catches + runOuts + stumpings
    };
  }

  /**
   * Get partnerships for an innings
   */
  getPartnerships(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return [];

    const partnerships = [];
    let currentPartnership = null;
    let partnershipNumber = 1;
    let lastWicketScore = 0;

    const ballEvents = innings.getAllBallEvents();
    let striker = null;
    let nonStriker = null;

    for (const ball of ballEvents) {
      // Track current batsmen
      if (!striker || !nonStriker) {
        striker = ball.batsmanId;
        nonStriker = ball.nonStrikerId;
        currentPartnership = {
          number: partnershipNumber,
          batsman1Id: striker,
          batsman2Id: nonStriker,
          runs: 0,
          balls: 0,
          startScore: lastWicketScore
        };
      }

      // Add runs to partnership
      currentPartnership.runs += ball.getTotalRuns();
      if (ball.isLegal() || ball.isNoBall()) {
        currentPartnership.balls++;
      }

      // Handle wicket
      if (ball.isWicket()) {
        currentPartnership.endScore = innings.totalRuns;
        
        // Get batsman names
        const bat1 = this.match.getPlayer(currentPartnership.batsman1Id);
        const bat2 = this.match.getPlayer(currentPartnership.batsman2Id);
        currentPartnership.batsman1Name = bat1?.name || 'Unknown';
        currentPartnership.batsman2Name = bat2?.name || 'Unknown';
        
        partnerships.push({ ...currentPartnership });
        
        lastWicketScore = innings.totalRuns;
        partnershipNumber++;
        
        // Reset for new partnership
        striker = null;
        nonStriker = null;
        currentPartnership = null;
      }
    }

    // Add current unbroken partnership
    if (currentPartnership && currentPartnership.runs > 0) {
      const bat1 = this.match.getPlayer(currentPartnership.batsman1Id);
      const bat2 = this.match.getPlayer(currentPartnership.batsman2Id);
      currentPartnership.batsman1Name = bat1?.name || 'Unknown';
      currentPartnership.batsman2Name = bat2?.name || 'Unknown';
      currentPartnership.isUnbroken = true;
      partnerships.push(currentPartnership);
    }

    return partnerships;
  }

  /**
   * Get fall of wickets summary
   */
  getFallOfWickets(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return [];

    return innings.fallOfWickets.map(fow => ({
      wicketNumber: fow.wicketNumber,
      score: fow.score,
      overs: fow.overs,
      batsmanName: fow.batsmanName,
      display: `${fow.score}/${fow.wicketNumber} (${fow.batsmanName}, ${fow.overs})`
    }));
  }

  /**
   * Get extras breakdown for an innings
   */
  getExtrasBreakdown(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return null;

    return {
      wides: innings.extras.wides,
      noBalls: innings.extras.noBalls,
      byes: innings.extras.byes,
      legByes: innings.extras.legByes,
      penalty: innings.extras.penalty,
      total: innings.extras.getTotal(),
      display: innings.extras.getDisplayString()
    };
  }

  /**
   * Get run rate progression (by over)
   */
  getRunRateProgression(inningsIndex = null) {
    const innings = inningsIndex !== null 
      ? this.match.innings[inningsIndex]
      : this.match.getCurrentInnings();
    
    if (!innings) return [];

    const progression = [];
    let cumulativeRuns = 0;

    for (let i = 0; i < innings.overs.length; i++) {
      const over = innings.overs[i];
      cumulativeRuns += over.getTotalRuns();
      
      const oversCompleted = i + (over.isComplete() ? 1 : over.getLegalBallCount() / 6);
      const runRate = oversCompleted > 0 ? (cumulativeRuns / oversCompleted).toFixed(2) : 0;
      
      progression.push({
        overNumber: i + 1,
        runsInOver: over.getTotalRuns(),
        cumulativeRuns,
        runRate,
        wicketsInOver: over.getWickets()
      });
    }

    return progression;
  }

  /**
   * Get match statistics summary
   */
  getMatchStats() {
    const stats = {
      totalRuns: 0,
      totalWickets: 0,
      totalBalls: 0,
      totalFours: 0,
      totalSixes: 0,
      totalExtras: 0,
      highestScore: { runs: 0, player: null },
      bestBowling: { wickets: 0, runs: 999, player: null }
    };

    for (const innings of this.match.innings) {
      stats.totalRuns += innings.totalRuns;
      stats.totalWickets += innings.wicketsFallen;
      stats.totalBalls += innings.getTotalLegalBalls();
      stats.totalExtras += innings.extras.getTotal();

      // Get batting stats
      const battingStats = this.getBattingStats(this.match.innings.indexOf(innings));
      for (const bat of battingStats) {
        stats.totalFours += bat.fours;
        stats.totalSixes += bat.sixes;
        
        if (bat.runs > stats.highestScore.runs) {
          stats.highestScore = { runs: bat.runs, player: bat.name };
        }
      }

      // Get bowling stats
      const bowlingStats = this.getBowlingStats(this.match.innings.indexOf(innings));
      for (const bowl of bowlingStats) {
        if (bowl.wickets > stats.bestBowling.wickets ||
            (bowl.wickets === stats.bestBowling.wickets && 
             bowl.runsConceded < stats.bestBowling.runs)) {
          stats.bestBowling = { 
            wickets: bowl.wickets, 
            runs: bowl.runsConceded, 
            player: bowl.name 
          };
        }
      }
    }

    return stats;
  }
}

export default StatsEngine;
