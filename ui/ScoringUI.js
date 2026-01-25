/**
 * Scoring UI
 * The main ball-by-ball scoring interface
 */

import { ExtraType, WicketType } from '../models/BallEvent.js';

export class ScoringUI {
  constructor(app) {
    this.app = app;
    this.selectedExtra = null;
    this.isWicketMode = false;
    this.wicketType = null;
    this.showingBowlerSelect = false;
  }

  /**
   * Get current match state
   */
  get matchState() {
    return this.app.scoringEngine.getMatchState();
  }

  /**
   * Render the scoring interface
   */
  render() {
    const container = document.getElementById('app');
    const state = this.matchState;

    if (!state) {
      container.innerHTML = '<div class="error">No active innings</div>';
      return;
    }

    container.innerHTML = `
      <div class="scoring-screen">
        ${this.renderHeader(state)}
        ${this.renderScoreDisplay(state)}
        ${this.renderBatsmenDisplay(state)}
        ${this.renderBowlerDisplay(state)}
        ${this.renderThisOver(state)}
        ${this.renderScoringPad()}
        ${this.renderFooter()}
      </div>
      
      ${this.showingBowlerSelect ? this.renderBowlerSelectModal() : ''}
      ${this.isWicketMode ? this.renderWicketModal() : ''}
    `;

    this.attachEventListeners();
  }

  /**
   * Render header with match info
   */
  renderHeader(state) {
    return `
      <header class="scoring-header">
        <div class="match-info">
          <span class="batting-team">${state.battingTeam}</span>
          <span class="innings-num">Innings ${state.inningsNumber}</span>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="undoBtn" title="Undo">↶</button>
          <button class="btn-icon" id="menuBtn" title="Menu">☰</button>
        </div>
      </header>
    `;
  }

  /**
   * Render main score display
   */
  renderScoreDisplay(state) {
    const target = state.target ? `Target: ${state.target}` : '';
    const needed = state.target ? `Need ${state.target - parseInt(state.score)} from ${this.getRemainingBalls(state)} balls` : '';

    return `
      <div class="score-display">
        <div class="main-score">
          <span class="runs">${state.score.split('/')[0]}</span>
          <span class="separator">/</span>
          <span class="wickets">${state.score.split('/')[1]}</span>
        </div>
        <div class="overs">(${state.overs} overs)</div>
        <div class="run-rates">
          <span class="crr">CRR: ${state.runRate}</span>
          ${state.requiredRate ? `<span class="rrr">RRR: ${state.requiredRate}</span>` : ''}
        </div>
        ${target ? `<div class="target-info">${needed}</div>` : ''}
      </div>
    `;
  }

  /**
   * Get remaining balls in innings
   */
  getRemainingBalls(state) {
    const innings = this.app.match.getCurrentInnings();
    if (!innings) return 0;
    const totalBalls = innings.oversLimit * 6;
    const ballsBowled = innings.getTotalLegalBalls();
    return totalBalls - ballsBowled;
  }

  /**
   * Render batsmen at crease
   */
  renderBatsmenDisplay(state) {
    return `
      <div class="batsmen-display">
        <div class="batsman striker">
          <div class="batsman-indicator">*</div>
          <div class="batsman-info">
            <span class="batsman-name">${state.striker?.name || '-'}</span>
            <span class="batsman-score">
              ${state.striker?.runs || 0} (${state.striker?.balls || 0})
            </span>
          </div>
          <div class="batsman-extras">
            <span class="fours">${state.striker?.fours || 0}×4</span>
            <span class="sixes">${state.striker?.sixes || 0}×6</span>
          </div>
        </div>
        
        <div class="batsman non-striker">
          <div class="batsman-indicator"></div>
          <div class="batsman-info">
            <span class="batsman-name">${state.nonStriker?.name || '-'}</span>
            <span class="batsman-score">
              ${state.nonStriker?.runs || 0} (${state.nonStriker?.balls || 0})
            </span>
          </div>
          <div class="batsman-extras">
            <span class="fours">${state.nonStriker?.fours || 0}×4</span>
            <span class="sixes">${state.nonStriker?.sixes || 0}×6</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render current bowler
   */
  renderBowlerDisplay(state) {
    return `
      <div class="bowler-display">
        <div class="bowler-info">
          <span class="bowler-name">${state.bowler?.name || '-'}</span>
          <span class="bowler-figures">
            ${state.bowler?.overs || '0'}-${state.bowler?.maidens || 0}-${state.bowler?.runs || 0}-${state.bowler?.wickets || 0}
          </span>
        </div>
        <span class="economy">Econ: ${state.bowler?.economy || '0.00'}</span>
      </div>
    `;
  }

  /**
   * Render this over summary
   */
  renderThisOver(state) {
    return `
      <div class="this-over">
        <span class="over-label">This Over:</span>
        <div class="over-balls">
          ${state.thisOver || '-'}
        </div>
      </div>
    `;
  }

  /**
   * Render main scoring pad
   */
  renderScoringPad() {
    const extraActive = this.selectedExtra ? `active-${this.selectedExtra}` : '';

    return `
      <div class="scoring-pad ${extraActive}">
        <!-- Runs buttons -->
        <div class="runs-grid">
          ${[0, 1, 2, 3, 4, 5, 6].map(runs => `
            <button class="btn-runs ${runs === 4 || runs === 6 ? 'boundary' : ''}" 
                    data-runs="${runs}">
              ${runs}
            </button>
          `).join('')}
        </div>
        
        <!-- Extras row -->
        <div class="extras-row">
          <button class="btn-extra ${this.selectedExtra === 'WD' ? 'active' : ''}" 
                  data-extra="WD">Wide</button>
          <button class="btn-extra ${this.selectedExtra === 'NB' ? 'active' : ''}" 
                  data-extra="NB">No Ball</button>
          <button class="btn-extra ${this.selectedExtra === 'B' ? 'active' : ''}" 
                  data-extra="B">Bye</button>
          <button class="btn-extra ${this.selectedExtra === 'LB' ? 'active' : ''}" 
                  data-extra="LB">Leg Bye</button>
        </div>
        
        <!-- Wicket button -->
        <div class="wicket-row">
          <button class="btn-wicket ${this.isWicketMode ? 'active' : ''}" 
                  id="wicketBtn">
            🔴 WICKET
          </button>
        </div>
        
        <!-- Quick actions -->
        <div class="quick-actions">
          <button class="btn-action" id="swapStrikeBtn">⇄ Swap Strike</button>
          <button class="btn-action" id="retireBtn">Retire Hurt</button>
        </div>
      </div>
    `;
  }

  /**
   * Render footer with navigation
   */
  renderFooter() {
    return `
      <footer class="scoring-footer">
        <button class="btn-nav" id="scorecardBtn">📊 Scorecard</button>
        <button class="btn-nav" id="statsBtn">📈 Stats</button>
        <button class="btn-nav" id="endInningsBtn">End Innings</button>
      </footer>
    `;
  }

  /**
   * Render bowler selection modal
   */
  renderBowlerSelectModal() {
    const innings = this.app.match.getCurrentInnings();
    const bowlingTeam = this.app.match.getTeam(innings.bowlingTeamId);
    const lastBowlerId = innings.getCurrentOver()?.bowlerId;

    const availableBowlers = bowlingTeam.players.filter(p => p.id !== lastBowlerId);

    return `
      <div class="modal-overlay">
        <div class="modal bowler-select-modal">
          <h3>Select New Bowler</h3>
          <ul class="bowler-list">
            ${availableBowlers.map(bowler => `
              <li class="bowler-option" data-bowler-id="${bowler.id}">
                <span class="bowler-name">${bowler.name}</span>
                <span class="bowler-overs">${bowler.getFormattedOvers()} ov</span>
              </li>
            `).join('')}
          </ul>
          <button class="btn btn-secondary" id="cancelBowlerSelect">Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Render wicket modal
   */
  renderWicketModal() {
    const innings = this.app.match.getCurrentInnings();
    const battingTeam = this.app.match.getTeam(innings.battingTeamId);
    const bowlingTeam = this.app.match.getTeam(innings.bowlingTeamId);
    
    const striker = this.app.match.getPlayer(innings.strikerId);
    const nonStriker = this.app.match.getPlayer(innings.nonStrikerId);

    const wicketTypes = [
      { type: 'BOWLED', label: 'Bowled', icon: '🎯' },
      { type: 'CAUGHT', label: 'Caught', icon: '🧤' },
      { type: 'LBW', label: 'LBW', icon: '🦵' },
      { type: 'RUN_OUT', label: 'Run Out', icon: '🏃' },
      { type: 'STUMPED', label: 'Stumped', icon: '🏏' },
      { type: 'HIT_WICKET', label: 'Hit Wicket', icon: '💥' },
      { type: 'CAUGHT_AND_BOWLED', label: 'C & B', icon: '🎯' }
    ];

    const needsFielder = ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(this.wicketType);
    const isRunOut = this.wicketType === 'RUN_OUT';

    return `
      <div class="modal-overlay">
        <div class="modal wicket-modal">
          <h3>🔴 Wicket</h3>
          
          <div class="wicket-types">
            ${wicketTypes.map(w => `
              <button class="wicket-type-btn ${this.wicketType === w.type ? 'active' : ''}"
                      data-wicket-type="${w.type}">
                <span class="wicket-icon">${w.icon}</span>
                <span class="wicket-label">${w.label}</span>
              </button>
            `).join('')}
          </div>
          
          ${isRunOut ? `
            <div class="out-batsman-select">
              <h4>Who is out?</h4>
              <div class="batsman-options">
                <label>
                  <input type="radio" name="outBatsman" value="${striker?.id}" checked>
                  ${striker?.name} (Striker)
                </label>
                <label>
                  <input type="radio" name="outBatsman" value="${nonStriker?.id}">
                  ${nonStriker?.name} (Non-Striker)
                </label>
              </div>
            </div>
          ` : ''}
          
          ${needsFielder ? `
            <div class="fielder-select">
              <h4>Fielder</h4>
              <select id="fielderSelect">
                <option value="">Select fielder...</option>
                ${bowlingTeam.players.map(p => `
                  <option value="${p.id}">${p.name}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          
          <div class="wicket-runs">
            <h4>Runs scored before wicket</h4>
            <div class="runs-mini-grid">
              ${[0, 1, 2, 3].map(r => `
                <button class="btn-mini-runs" data-wicket-runs="${r}">${r}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancelWicket">Cancel</button>
            <button class="btn btn-danger" id="confirmWicket" ${!this.wicketType ? 'disabled' : ''}>
              Confirm Wicket
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Run buttons
    document.querySelectorAll('.btn-runs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const runs = parseInt(e.target.dataset.runs);
        this.recordRuns(runs);
      });
    });

    // Extra buttons
    document.querySelectorAll('.btn-extra').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const extra = e.target.dataset.extra;
        this.toggleExtra(extra);
      });
    });

    // Wicket button
    const wicketBtn = document.getElementById('wicketBtn');
    if (wicketBtn) {
      wicketBtn.addEventListener('click', () => {
        this.isWicketMode = true;
        this.render();
      });
    }

    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }

    // Swap strike button
    const swapStrikeBtn = document.getElementById('swapStrikeBtn');
    if (swapStrikeBtn) {
      swapStrikeBtn.addEventListener('click', () => this.swapStrike());
    }

    // Scorecard button
    const scorecardBtn = document.getElementById('scorecardBtn');
    if (scorecardBtn) {
      scorecardBtn.addEventListener('click', () => this.app.showScorecard());
    }

    // End innings button
    const endInningsBtn = document.getElementById('endInningsBtn');
    if (endInningsBtn) {
      endInningsBtn.addEventListener('click', () => this.endInnings());
    }

    // Wicket modal events
    if (this.isWicketMode) {
      this.attachWicketModalListeners();
    }

    // Bowler select modal events
    if (this.showingBowlerSelect) {
      this.attachBowlerSelectListeners();
    }
  }

  /**
   * Attach wicket modal listeners
   */
  attachWicketModalListeners() {
    // Wicket type buttons
    document.querySelectorAll('.wicket-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.wicketType = e.currentTarget.dataset.wicketType;
        this.render();
      });
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancelWicket');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.isWicketMode = false;
        this.wicketType = null;
        this.render();
      });
    }

    // Confirm button
    const confirmBtn = document.getElementById('confirmWicket');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmWicket());
    }

    // Mini runs buttons
    document.querySelectorAll('.btn-mini-runs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-mini-runs').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  /**
   * Attach bowler select listeners
   */
  attachBowlerSelectListeners() {
    document.querySelectorAll('.bowler-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const bowlerId = e.currentTarget.dataset.bowlerId;
        this.selectBowler(bowlerId);
      });
    });

    const cancelBtn = document.getElementById('cancelBowlerSelect');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.showingBowlerSelect = false;
        this.render();
      });
    }
  }

  /**
   * Record runs
   */
  recordRuns(runs) {
    try {
      // Save state for undo
      this.app.undoService.saveState(this.app.match);

      if (this.selectedExtra) {
        // Record with extra
        this.recordWithExtra(runs);
      } else {
        // Normal runs
        this.app.scoringEngine.recordRuns(runs);
      }

      // Check if over complete
      this.checkOverComplete();

      // Reset and re-render
      this.selectedExtra = null;
      this.render();

      // Auto-save
      this.app.undoService.autoSave(this.app.match);
    } catch (error) {
      console.error('Failed to record runs:', error);
      alert(error.message);
    }
  }

  /**
   * Record runs with extra
   */
  recordWithExtra(runs) {
    switch (this.selectedExtra) {
      case 'WD':
        this.app.scoringEngine.recordWide(runs);
        break;
      case 'NB':
        this.app.scoringEngine.recordNoBall(runs);
        break;
      case 'B':
        this.app.scoringEngine.recordByes(runs);
        break;
      case 'LB':
        this.app.scoringEngine.recordLegByes(runs);
        break;
    }
  }

  /**
   * Toggle extra selection
   */
  toggleExtra(extra) {
    this.selectedExtra = this.selectedExtra === extra ? null : extra;
    this.render();
  }

  /**
   * Check if over is complete and prompt for new bowler
   */
  checkOverComplete() {
    const innings = this.app.match.getCurrentInnings();
    const currentOver = innings.getCurrentOver();
    
    if (currentOver && currentOver.isComplete()) {
      // Check if innings is complete
      if (!innings.isComplete()) {
        this.showingBowlerSelect = true;
      }
    }
  }

  /**
   * Select new bowler
   */
  selectBowler(bowlerId) {
    try {
      this.app.scoringEngine.startNewOver(bowlerId);
      this.showingBowlerSelect = false;
      this.render();
    } catch (error) {
      console.error('Failed to start new over:', error);
      alert(error.message);
    }
  }

  /**
   * Confirm wicket
   */
  confirmWicket() {
    try {
      // Save state for undo
      this.app.undoService.saveState(this.app.match);

      const innings = this.app.match.getCurrentInnings();
      
      // Get out batsman (for run out, could be non-striker)
      let outBatsmanId = innings.strikerId;
      if (this.wicketType === 'RUN_OUT') {
        const selected = document.querySelector('input[name="outBatsman"]:checked');
        if (selected) {
          outBatsmanId = selected.value;
        }
      }

      // Get fielder if applicable
      let fielderId = null;
      const fielderSelect = document.getElementById('fielderSelect');
      if (fielderSelect && fielderSelect.value) {
        fielderId = fielderSelect.value;
      }

      // Get runs before wicket
      const activeRunsBtn = document.querySelector('.btn-mini-runs.active');
      const runsBeforeWicket = activeRunsBtn ? parseInt(activeRunsBtn.dataset.wicketRuns) : 0;

      // Record wicket
      this.app.scoringEngine.recordWicket({
        type: this.wicketType,
        outBatsmanId,
        fielderId
      }, runsBeforeWicket);

      // Close modal
      this.isWicketMode = false;
      this.wicketType = null;

      // Check if new batsman needed
      if (innings.wicketsFallen < 10 && !innings.isComplete()) {
        this.showNewBatsmanDialog();
      } else {
        this.checkOverComplete();
        this.render();
      }

      // Auto-save
      this.app.undoService.autoSave(this.app.match);
    } catch (error) {
      console.error('Failed to record wicket:', error);
      alert(error.message);
    }
  }

  /**
   * Show new batsman dialog
   */
  showNewBatsmanDialog() {
    const innings = this.app.match.getCurrentInnings();
    const battingTeam = this.app.match.getTeam(innings.battingTeamId);
    
    // Get available batsmen (not yet batted)
    const battedIds = new Set(innings.battingOrder);
    const availableBatsmen = battingTeam.players.filter(p => !battedIds.has(p.id));

    if (availableBatsmen.length === 0) {
      this.render();
      return;
    }

    // Simple prompt for now (can be enhanced to modal)
    const batsmanOptions = availableBatsmen.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
    const choice = prompt(`Select new batsman:\n${batsmanOptions}\n\nEnter number:`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < availableBatsmen.length) {
        this.app.scoringEngine.setNewBatsman(availableBatsmen[index].id);
      }
    }

    this.checkOverComplete();
    this.render();
  }

  /**
   * Swap strike manually
   */
  swapStrike() {
    const innings = this.app.match.getCurrentInnings();
    if (innings) {
      innings.swapStrike();
      this.render();
    }
  }

  /**
   * Undo last ball
   */
  undo() {
    const result = this.app.undoService.undo(this.app.match);
    if (result) {
      this.app.match = result;
      this.app.scoringEngine.match = result;
      this.render();
    } else {
      alert('Nothing to undo');
    }
  }

  /**
   * End innings manually
   */
  endInnings() {
    if (!confirm('Are you sure you want to end this innings?')) {
      return;
    }

    const innings = this.app.match.getCurrentInnings();
    innings.end('DECLARED');

    // Check if match should end or start second innings
    if (this.app.match.innings.length === 1) {
      // Start second innings
      if (confirm('Start second innings?')) {
        this.app.match.startSecondInnings();
        this.app.showInningsSetup();
      }
    } else {
      // Match complete
      this.app.match.calculateResult();
      this.app.showScorecard();
    }
  }
}

export default ScoringUI;
