/**
 * Scorecard UI
 * Displays full scorecard with batting, bowling, and fall of wickets
 */

export class ScorecardUI {
  constructor(app) {
    this.app = app;
    this.activeInnings = 0;
    this.activeTab = 'batting';
  }

  /**
   * Render the scorecard
   */
  render() {
    const container = document.getElementById('app');
    const match = this.app.match;

    if (!match || match.innings.length === 0) {
      container.innerHTML = '<div class="error">No match data available</div>';
      return;
    }

    container.innerHTML = `
      <div class="scorecard-screen">
        ${this.renderHeader()}
        ${this.renderInningsTabs()}
        ${this.renderScoreSummary()}
        ${this.renderContentTabs()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render header
   */
  renderHeader() {
    const match = this.app.match;
    
    return `
      <header class="scorecard-header">
        <div class="header-left">
          <button class="btn-home" id="homeBtn" title="Go to Home">🏠</button>
          <button class="btn-back" id="backBtn">← Back</button>
        </div>
        <div class="match-title">
          <h1>${match.matchName || 'Match Scorecard'}</h1>
          <p class="venue">${match.venue} • ${match.date}</p>
        </div>
        <button class="btn-share" id="shareBtn">📤</button>
      </header>
    `;
  }

  /**
   * Render innings tabs
   */
  renderInningsTabs() {
    const match = this.app.match;
    
    return `
      <div class="innings-tabs">
        ${match.innings.map((innings, index) => {
          const team = match.getTeam(innings.battingTeamId);
          return `
            <button class="innings-tab ${index === this.activeInnings ? 'active' : ''}" 
                    data-innings="${index}">
              ${team?.shortName || team?.name || `Innings ${index + 1}`}
              <span class="innings-score">${innings.getScoreString()}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render score summary
   */
  renderScoreSummary() {
    const innings = this.app.match.innings[this.activeInnings];
    if (!innings) return '';

    const team = this.app.match.getTeam(innings.battingTeamId);
    const extras = innings.extras;

    return `
      <div class="score-summary">
        <div class="team-score">
          <span class="team-name">${team?.name || 'Team'}</span>
          <span class="total-score">${innings.totalRuns}/${innings.wicketsFallen}</span>
          <span class="overs">(${innings.getFormattedOvers()} Ov)</span>
        </div>
        <div class="extras-summary">
          Extras: ${extras.getTotal()} (${extras.getDisplayString()})
        </div>
        <div class="run-rate">
          Run Rate: ${innings.getCurrentRunRate()}
        </div>
      </div>
    `;
  }

  /**
   * Render content tabs (batting/bowling/fow)
   */
  renderContentTabs() {
    const tabs = [
      { id: 'batting', label: 'Batting' },
      { id: 'bowling', label: 'Bowling' },
      { id: 'fow', label: 'Fall of Wickets' },
      { id: 'partnerships', label: 'Partnerships' }
    ];

    return `
      <div class="content-tabs">
        ${tabs.map(tab => `
          <button class="content-tab ${tab.id === this.activeTab ? 'active' : ''}" 
                  data-tab="${tab.id}">
            ${tab.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render active content
   */
  renderContent() {
    switch (this.activeTab) {
      case 'batting':
        return this.renderBattingCard();
      case 'bowling':
        return this.renderBowlingCard();
      case 'fow':
        return this.renderFallOfWickets();
      case 'partnerships':
        return this.renderPartnerships();
      default:
        return this.renderBattingCard();
    }
  }

  /**
   * Render batting scorecard
   */
  renderBattingCard() {
    const stats = this.app.statsEngine.getBattingStats(this.activeInnings);

    return `
      <div class="batting-card">
        <table class="scorecard-table">
          <thead>
            <tr>
              <th class="batsman-col">Batsman</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(bat => `
              <tr class="${bat.isStriker ? 'striker' : ''} ${bat.isNonStriker ? 'non-striker' : ''}">
                <td class="batsman-col">
                  <div class="batsman-name">
                    ${bat.name}
                    ${bat.isStriker ? '<span class="strike-indicator">*</span>' : ''}
                  </div>
                  <div class="dismissal">${bat.dismissal || (bat.isOut ? 'out' : 'not out')}</div>
                </td>
                <td class="runs">${bat.runs}</td>
                <td>${bat.ballsFaced}</td>
                <td>${bat.fours}</td>
                <td>${bat.sixes}</td>
                <td>${bat.strikeRate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${this.renderYetToBat()}
      </div>
    `;
  }

  /**
   * Render yet to bat section
   */
  renderYetToBat() {
    const innings = this.app.match.innings[this.activeInnings];
    const team = this.app.match.getTeam(innings.battingTeamId);
    
    if (!team) return '';

    const battedIds = new Set(innings.battingOrder);
    const yetToBat = team.players.filter(p => !battedIds.has(p.id));

    if (yetToBat.length === 0) return '';

    return `
      <div class="yet-to-bat">
        <span class="label">Yet to bat:</span>
        <span class="players">${yetToBat.map(p => p.name).join(', ')}</span>
      </div>
    `;
  }

  /**
   * Render bowling card
   */
  renderBowlingCard() {
    const stats = this.app.statsEngine.getBowlingStats(this.activeInnings);

    return `
      <div class="bowling-card">
        <table class="scorecard-table">
          <thead>
            <tr>
              <th class="bowler-col">Bowler</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>Econ</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(bowl => `
              <tr class="${bowl.isBowling ? 'current-bowler' : ''}">
                <td class="bowler-col">
                  ${bowl.name}
                  ${bowl.isBowling ? '<span class="bowling-indicator">●</span>' : ''}
                </td>
                <td>${bowl.overs}</td>
                <td>${bowl.maidens}</td>
                <td>${bowl.runsConceded}</td>
                <td class="wickets">${bowl.wickets}</td>
                <td>${bowl.economy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render fall of wickets
   */
  renderFallOfWickets() {
    const fow = this.app.statsEngine.getFallOfWickets(this.activeInnings);

    if (fow.length === 0) {
      return `
        <div class="fow-card empty">
          <p>No wickets fallen yet</p>
        </div>
      `;
    }

    return `
      <div class="fow-card">
        <div class="fow-list">
          ${fow.map(w => `
            <div class="fow-item">
              <span class="fow-score">${w.score}/${w.wicketNumber}</span>
              <span class="fow-batsman">${w.batsmanName}</span>
              <span class="fow-overs">${w.overs} ov</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render partnerships
   */
  renderPartnerships() {
    const partnerships = this.app.statsEngine.getPartnerships(this.activeInnings);

    if (partnerships.length === 0) {
      return `
        <div class="partnerships-card empty">
          <p>No partnerships data</p>
        </div>
      `;
    }

    return `
      <div class="partnerships-card">
        <table class="scorecard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Partnership</th>
              <th>Runs</th>
              <th>Balls</th>
            </tr>
          </thead>
          <tbody>
            ${partnerships.map(p => `
              <tr class="${p.isUnbroken ? 'unbroken' : ''}">
                <td>${p.number}</td>
                <td class="partnership-batsmen">
                  ${p.batsman1Name} & ${p.batsman2Name}
                  ${p.isUnbroken ? '<span class="unbroken-tag">*</span>' : ''}
                </td>
                <td class="partnership-runs">${p.runs}</td>
                <td>${p.balls}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render footer
   */
  renderFooter() {
    const match = this.app.match;
    let resultText = '';

    if (match.result) {
      resultText = match.result.description;
    } else if (match.innings.length === 2) {
      const target = match.innings[1].target;
      const current = match.innings[1].totalRuns;
      const needed = target - current;
      const wicketsLeft = 10 - match.innings[1].wicketsFallen;
      resultText = `${match.getTeam(match.innings[1].battingTeamId)?.name} need ${needed} runs from ${this.getRemainingBalls()} balls with ${wicketsLeft} wickets remaining`;
    }

    return `
      <footer class="scorecard-footer">
        ${resultText ? `<div class="match-result">${resultText}</div>` : ''}
        <div class="footer-actions">
          <button class="btn btn-primary" id="resumeScoringBtn">
            Continue Scoring
          </button>
        </div>
      </footer>
    `;
  }

  /**
   * Get remaining balls
   */
  getRemainingBalls() {
    const innings = this.app.match.innings[1];
    if (!innings) return 0;
    const totalBalls = innings.oversLimit * 6;
    const ballsBowled = innings.getTotalLegalBalls();
    return totalBalls - ballsBowled;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Home button
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => this.app.showHome());
    }

    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.app.showScoring());
    }

    // Innings tabs
    document.querySelectorAll('.innings-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeInnings = parseInt(e.currentTarget.dataset.innings);
        this.render();
      });
    });

    // Content tabs
    document.querySelectorAll('.content-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.dataset.tab;
        this.render();
      });
    });

    // Resume scoring button
    const resumeBtn = document.getElementById('resumeScoringBtn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.app.showScoring());
    }

    // Share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareScorecard());
    }
  }

  /**
   * Share scorecard
   */
  async shareScorecard() {
    const match = this.app.match;
    const innings1 = match.innings[0];
    const innings2 = match.innings[1];
    
    const team1 = match.getTeam(innings1?.battingTeamId);
    const team2 = match.getTeam(innings1?.bowlingTeamId);

    let text = `🏏 ${match.matchName}\n`;
    text += `📍 ${match.venue}\n\n`;
    
    if (innings1) {
      text += `${team1?.name}: ${innings1.getFullScoreString()}\n`;
    }
    if (innings2) {
      text += `${team2?.name}: ${innings2.getFullScoreString()}\n`;
    }
    
    if (match.result) {
      text += `\n🏆 ${match.result.description}`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: match.matchName,
          text: text
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      alert('Scorecard copied to clipboard!');
    }
  }
}

export default ScorecardUI;
