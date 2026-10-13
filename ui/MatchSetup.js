/**
 * Match Setup UI
 * Handles the match creation and setup screens
 */

import { Match, MatchType, TossDecision, Toss } from '../models/Match.js';
import { Team } from '../models/Team.js';
import { Player, PlayerRole } from '../models/Player.js';

export class MatchSetup {
  constructor(app) {
    this.app = app;
    this.currentMatch = null;
    this.currentStep = 1;
    this.totalSteps = 4;
  }

  /**
   * Render the match setup wizard
   */
  render() {
    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="setup-wizard">
        <header class="setup-header">
          <div class="setup-header-top">
            <button class="btn-home" id="homeBtn" title="Go to Home"><i data-lucide="home" style="width: 1.2rem; height: 1.2rem;"></i></button>
            <div class="setup-header-title">
              <h1><i data-lucide="activity" style="vertical-align: middle;"></i> Cricket Scorer</h1>
            </div>
            ${this.app.renderThemeToggle()}
          </div>
          <div class="step-indicator">
            ${this.renderStepIndicator()}
          </div>
        </header>
        
        <main class="setup-content">
          ${this.renderCurrentStep()}
        </main>
        
        <footer class="setup-footer">
          ${this.renderNavigation()}
        </footer>
      </div>
    `;

    this.attachEventListeners();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Render step indicator
   */
  renderStepIndicator() {
    const steps = [
      { num: 1, label: 'Match Info' },
      { num: 2, label: 'Team A' },
      { num: 3, label: 'Team B' },
      { num: 4, label: 'Toss' }
    ];

    return steps.map(step => `
      <div class="step ${step.num === this.currentStep ? 'active' : ''} ${step.num < this.currentStep ? 'completed' : ''}">
        <span class="step-num">${step.num}</span>
        <span class="step-label">${step.label}</span>
      </div>
    `).join('');
  }

  /**
   * Render current step content
   */
  renderCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return this.renderMatchInfoStep();
      case 2:
        return this.renderTeamStep('A');
      case 3:
        return this.renderTeamStep('B');
      case 4:
        return this.renderTossStep();
      default:
        return this.renderMatchInfoStep();
    }
  }

  /**
   * Step 1: Match Information
   */
  renderMatchInfoStep() {
    const match = this.currentMatch || {};
    
    return `
      <div class="step-content match-info-step">
        <h2>Match Details</h2>
        
        <div class="form-group">
          <label for="tournamentName">Tournament/Series Name</label>
          <input type="text" id="tournamentName" value="${match.tournamentName || ''}" 
                 placeholder="e.g., IPL 2026">
        </div>
        
        <div class="form-group">
          <label for="matchName">Match Name</label>
          <input type="text" id="matchName" value="${match.matchName || ''}" 
                 placeholder="e.g., Match 1 - CSK vs MI">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="venue">Venue</label>
            <input type="text" id="venue" value="${match.venue || ''}" 
                   placeholder="e.g., Wankhede Stadium">
          </div>
          
          <div class="form-group">
            <label for="matchDate">Date</label>
            <input type="date" id="matchDate" value="${match.date || new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="matchType">Match Type</label>
            <select id="matchType">
              <option value="T20" ${match.matchType === 'T20' ? 'selected' : ''}>T20</option>
              <option value="ODI" ${match.matchType === 'ODI' ? 'selected' : ''}>ODI</option>
              <option value="T10" ${match.matchType === 'T10' ? 'selected' : ''}>T10</option>
              <option value="CUSTOM" ${match.matchType === 'CUSTOM' ? 'selected' : ''}>Custom</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="oversLimit">Overs per Innings</label>
            <input type="number" id="oversLimit" min="1" max="50" 
                   value="${match.oversLimit || 20}">
          </div>
        </div>
        
        <div class="form-group">
          <label for="umpires">Umpires (comma separated)</label>
          <input type="text" id="umpires" value="${(match.umpires || []).join(', ')}" 
                 placeholder="e.g., S Ravi, Nitin Menon">
        </div>
      </div>
    `;
  }

  /**
   * Step 2 & 3: Team Setup
   */
  renderTeamStep(teamLetter) {
    // Ensure match is initialized
    if (!this.currentMatch) {
      this.currentMatch = new Match();
    }

    const teamIndex = teamLetter === 'A' ? 0 : 1;
    
    // Ensure team exists in the data model (not just for rendering)
    while (this.currentMatch.teams.length <= teamIndex) {
      this.currentMatch.teams.push(new Team());
    }
    
    const team = this.currentMatch.teams[teamIndex];
    const players = team.players || [];

    return `
      <div class="step-content team-step">
        <h2>Team ${teamLetter}</h2>
        
        <div class="form-group">
          <label for="teamName">Team Name</label>
          <input type="text" id="teamName" value="${team.name || ''}" 
                 placeholder="e.g., Chennai Super Kings">
        </div>
        
        <div class="form-group">
          <label for="teamShortName">Short Name (3-4 letters)</label>
          <input type="text" id="teamShortName" maxlength="4" value="${team.shortName || ''}" 
                 placeholder="e.g., CSK">
        </div>
        
        <div class="form-group">
          <label>Team Color</label>
          <input type="color" id="teamColor" value="${team.color || '#1a1a2e'}">
        </div>
        
        <div class="players-section">
          <div class="players-header">
            <h3>Playing XI</h3>
            <span class="player-count">${players.length}/11</span>
          </div>
          
          <div class="add-player-form">
            <input type="text" id="newPlayerName" placeholder="Player name">
            <select id="newPlayerRole">
              <option value="BAT">Batsman</option>
              <option value="BOWL">Bowler</option>
              <option value="AR">All-rounder</option>
              <option value="WK">Wicket Keeper</option>
            </select>
            <button type="button" class="btn btn-add" id="addPlayerBtn">+ Add</button>
          </div>
          
          <ul class="players-list" id="playersList">
            ${this.renderPlayersList(players, team.captainId, team.wicketKeeperId)}
          </ul>
          
          <div class="quick-add">
            <button type="button" class="btn btn-secondary" id="quickAddBtn">
              Quick Add 11 Players
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render players list
   */
  renderPlayersList(players, captainId, wicketKeeperId) {
    if (players.length === 0) {
      return '<li class="empty-state">No players added yet</li>';
    }

    return players.map((player, index) => `
      <li class="player-item" data-player-id="${player.id}">
        <span class="player-num">${index + 1}</span>
        <span class="player-name">${player.name}</span>
        <span class="player-role">${this.getRoleLabel(player.role)}</span>
        <div class="player-badges">
          <button type="button" class="badge-btn ${player.id === captainId ? 'active' : ''}" 
                  data-action="captain" title="Captain">C</button>
          <button type="button" class="badge-btn ${player.id === wicketKeeperId ? 'active' : ''}" 
                  data-action="keeper" title="Wicket Keeper">WK</button>
        </div>
        <button type="button" class="btn-remove" data-action="remove" title="Remove">×</button>
      </li>
    `).join('');
  }

  /**
   * Get role display label
   */
  getRoleLabel(role) {
    const labels = {
      'BAT': 'Bat',
      'BOWL': 'Bowl',
      'AR': 'All',
      'WK': 'WK'
    };
    return labels[role] || role;
  }

  /**
   * Step 4: Toss
   */
  renderTossStep() {
    const teamA = this.currentMatch?.teams[0];
    const teamB = this.currentMatch?.teams[1];
    const toss = this.currentMatch?.toss || {};

    return `
      <div class="step-content toss-step">
        <h2>Toss</h2>
        
        <div class="toss-winner">
          <h3>Who won the toss?</h3>
          <div class="toss-options">
            <label class="toss-option ${toss.winnerTeamId === teamA?.id ? 'selected' : ''}">
              <input type="radio" name="tossWinner" value="${teamA?.id || ''}" 
                     ${toss.winnerTeamId === teamA?.id ? 'checked' : ''}>
              <span class="team-name">${teamA?.name || 'Team A'}</span>
            </label>
            <label class="toss-option ${toss.winnerTeamId === teamB?.id ? 'selected' : ''}">
              <input type="radio" name="tossWinner" value="${teamB?.id || ''}" 
                     ${toss.winnerTeamId === teamB?.id ? 'checked' : ''}>
              <span class="team-name">${teamB?.name || 'Team B'}</span>
            </label>
          </div>
        </div>
        
        <div class="toss-decision ${!toss.winnerTeamId ? 'disabled' : ''}">
          <h3>Elected to...</h3>
          <div class="decision-options">
            <label class="decision-option ${toss.decision === 'BAT' ? 'selected' : ''}">
              <input type="radio" name="tossDecision" value="BAT" 
                     ${toss.decision === 'BAT' ? 'checked' : ''}>
              <span class="decision-icon"><i data-lucide="activity"></i></span>
              <span class="decision-label">Bat First</span>
            </label>
            <label class="decision-option ${toss.decision === 'BOWL' ? 'selected' : ''}">
              <input type="radio" name="tossDecision" value="BOWL" 
                     ${toss.decision === 'BOWL' ? 'checked' : ''}>
              <span class="decision-icon"><i data-lucide="circle"></i></span>
              <span class="decision-label">Bowl First</span>
            </label>
          </div>
        </div>
        
        <div class="toss-summary" id="tossSummary">
          ${this.renderTossSummary()}
        </div>
      </div>
    `;
  }

  /**
   * Render toss summary
   */
  renderTossSummary() {
    const toss = this.currentMatch?.toss;
    if (!toss || !toss.winnerTeamId || !toss.decision) {
      return '';
    }

    const winner = this.currentMatch.teams.find(t => t.id === toss.winnerTeamId);
    const battingFirst = toss.decision === 'BAT' ? winner : 
      this.currentMatch.teams.find(t => t.id !== toss.winnerTeamId);
    const bowlingFirst = this.currentMatch.teams.find(t => t.id !== battingFirst.id);

    return `
      <div class="summary-card">
        <p><strong>${winner?.name}</strong> won the toss and elected to <strong>${toss.decision === 'BAT' ? 'bat' : 'bowl'}</strong></p>
        <div class="match-order">
          <div class="order-item batting">
            <span class="order-label">Batting First</span>
            <span class="order-team">${battingFirst?.name}</span>
          </div>
          <div class="order-item bowling">
            <span class="order-label">Bowling First</span>
            <span class="order-team">${bowlingFirst?.name}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render navigation buttons
   */
  renderNavigation() {
    return `
      <div class="nav-buttons">
        ${this.currentStep > 1 ? `
          <button type="button" class="btn btn-secondary" id="prevBtn">
            <i data-lucide="arrow-left" style="width: 1rem; height: 1rem; margin-right: 4px;"></i> Previous
          </button>
        ` : '<div></div>'}
        
        ${this.currentStep < this.totalSteps ? `
          <button type="button" class="btn btn-primary" id="nextBtn">
            Next <i data-lucide="arrow-right" style="width: 1rem; height: 1rem; margin-left: 4px;"></i>
          </button>
        ` : `
          <button type="button" class="btn btn-success" id="startMatchBtn">
            <i data-lucide="play" style="width: 1rem; height: 1rem; margin-right: 4px;"></i> Start Match
          </button>
        `}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    console.log('Attaching event listeners for step', this.currentStep);
    
    // Home button
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to go back to home? Your progress will be lost.')) {
          this.app.showHome();
        }
      });
    }

    // Theme toggle listeners
    this.app.setupThemeToggleListeners();
    
    // Navigation
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const startMatchBtn = document.getElementById('startMatchBtn');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevStep());
    }
    if (startMatchBtn) {
      startMatchBtn.addEventListener('click', () => this.startMatch());
    }

    // Match type change
    const matchTypeSelect = document.getElementById('matchType');
    if (matchTypeSelect) {
      matchTypeSelect.addEventListener('change', (e) => {
        const oversInput = document.getElementById('oversLimit');
        const defaults = { T20: 20, ODI: 50, T10: 10, CUSTOM: 20 };
        oversInput.value = defaults[e.target.value] || 20;
      });
    }

    // Add player
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    console.log('addPlayerBtn found:', !!addPlayerBtn);
    if (addPlayerBtn) {
      addPlayerBtn.addEventListener('click', () => {
        console.log('Add player button clicked!');
        this.addPlayer();
      });
    }

    // Enter key on player name
    const newPlayerInput = document.getElementById('newPlayerName');
    if (newPlayerInput) {
      newPlayerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addPlayer();
      });
    }

    // Quick add players
    const quickAddBtn = document.getElementById('quickAddBtn');
    console.log('quickAddBtn found:', !!quickAddBtn);
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        console.log('Quick add button clicked!');
        this.quickAddPlayers();
      });
    }

    // Player list actions
    const playersList = document.getElementById('playersList');
    if (playersList) {
      playersList.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const playerItem = e.target.closest('.player-item');
        if (!playerItem) return;

        const playerId = playerItem.dataset.playerId;

        if (action === 'remove') {
          this.removePlayer(playerId);
        } else if (action === 'captain') {
          this.setCaptain(playerId);
        } else if (action === 'keeper') {
          this.setKeeper(playerId);
        }
      });
    }

    // Toss options
    const tossWinnerInputs = document.querySelectorAll('input[name="tossWinner"]');
    tossWinnerInputs.forEach(input => {
      input.addEventListener('change', (e) => this.setTossWinner(e.target.value));
    });

    const tossDecisionInputs = document.querySelectorAll('input[name="tossDecision"]');
    tossDecisionInputs.forEach(input => {
      input.addEventListener('change', (e) => this.setTossDecision(e.target.value));
    });
  }

  /**
   * Save current step data
   */
  saveCurrentStepData() {
    if (!this.currentMatch) {
      this.currentMatch = new Match();
    }

    switch (this.currentStep) {
      case 1:
        this.saveMatchInfo();
        break;
      case 2:
        this.saveTeamData(0);
        break;
      case 3:
        this.saveTeamData(1);
        break;
    }
  }

  /**
   * Save match info from form
   */
  saveMatchInfo() {
    this.currentMatch.tournamentName = document.getElementById('tournamentName')?.value || '';
    this.currentMatch.matchName = document.getElementById('matchName')?.value || '';
    this.currentMatch.venue = document.getElementById('venue')?.value || '';
    this.currentMatch.date = document.getElementById('matchDate')?.value || new Date().toISOString().split('T')[0];
    this.currentMatch.matchType = document.getElementById('matchType')?.value || 'T20';
    this.currentMatch.oversLimit = parseInt(document.getElementById('oversLimit')?.value) || 20;
    
    const umpires = document.getElementById('umpires')?.value || '';
    this.currentMatch.umpires = umpires.split(',').map(u => u.trim()).filter(u => u);
  }

  /**
   * Save team data from form
   */
  saveTeamData(teamIndex) {
    // Ensure match is initialized
    if (!this.currentMatch) {
      this.currentMatch = new Match();
    }

    // Ensure teams array exists
    if (!this.currentMatch.teams) {
      this.currentMatch.teams = [];
    }

    // Ensure teams array has space
    while (this.currentMatch.teams.length <= teamIndex) {
      this.currentMatch.teams.push(new Team());
    }

    const team = this.currentMatch.teams[teamIndex];
    team.name = document.getElementById('teamName')?.value || '';
    team.shortName = document.getElementById('teamShortName')?.value || '';
    team.color = document.getElementById('teamColor')?.value || '#1a1a2e';
  }

  /**
   * Navigate to next step
   */
  nextStep() {
    this.saveCurrentStepData();

    // Validation
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      
      // Pre-initialize teams when entering team steps
      // This ensures the Team object exists before the UI is rendered
      if (!this.currentMatch.teams) this.currentMatch.teams = [];
      
      if (this.currentStep === 2) { // Entering Team A
        while (this.currentMatch.teams.length <= 0) this.currentMatch.teams.push(new Team());
      } else if (this.currentStep === 3) { // Entering Team B
        while (this.currentMatch.teams.length <= 1) this.currentMatch.teams.push(new Team());
      }
      
      this.render();
    }
  }

  /**
   * Navigate to previous step
   */
  prevStep() {
    this.saveCurrentStepData();
    
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  }

  /**
   * Validate current step
   */
  validateCurrentStep() {
    switch (this.currentStep) {
      case 1:
        if (!this.currentMatch.matchName) {
          alert('Please enter a match name');
          return false;
        }
        return true;
      
      case 2:
      case 3:
        const teamIndex = this.currentStep - 2;
        const team = this.currentMatch.teams[teamIndex];
        if (!team || !team.name) {
          alert('Please enter team name');
          return false;
        }
        if (!team.players || team.players.length < 2) {
          alert('Please add at least 2 players');
          return false;
        }
        return true;
      
      case 4:
        if (!this.currentMatch.toss?.winnerTeamId || !this.currentMatch.toss?.decision) {
          alert('Please complete the toss');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Add player to current team
   */
  addPlayer() {
    const nameInput = document.getElementById('newPlayerName');
    const roleSelect = document.getElementById('newPlayerRole');
    
    const name = nameInput?.value.trim();
    const role = roleSelect?.value;

    if (!name) {
      alert('Please enter player name');
      return;
    }

    const teamIndex = this.currentStep - 2;
    
    // Ensure team is properly initialized with form data
    this.saveTeamData(teamIndex);

    // Get the team AGAIN after saveTeamData to ensure we have the latest instance
    const team = this.currentMatch.teams[teamIndex];

    if (!team) {
      console.error('Team not found after initialization');
      return;
    }

    if (team.players.length >= 11) {
      alert('Team already has 11 players');
      return;
    }

    try {
      const player = new Player({ name, role });
      team.addPlayer(player);

      // Clear input and re-render players list only
      if (nameInput) nameInput.value = '';
      this.updatePlayersList();
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Failed to add player');
    }
  }

  /**
   * Update only the players list without full re-render
   */
  updatePlayersList() {
    const teamIndex = this.currentStep - 2;
    const team = this.currentMatch.teams[teamIndex];
    const playersList = document.getElementById('playersList');
    const playerCount = document.querySelector('.player-count');
    
    if (playersList) {
      playersList.innerHTML = this.renderPlayersList(team.players, team.captainId, team.wicketKeeperId);
    }
    if (playerCount) {
      playerCount.textContent = `${team.players.length}/11`;
    }
  }

  /**
   * Remove player from team
   */
  removePlayer(playerId) {
    const teamIndex = this.currentStep - 2;
    const team = this.currentMatch?.teams[teamIndex];
    if (!team) return;
    team.removePlayer(playerId);
    this.updatePlayersList();
  }

  /**
   * Set captain
   */
  setCaptain(playerId) {
    const teamIndex = this.currentStep - 2;
    const team = this.currentMatch?.teams[teamIndex];
    if (!team) return;
    team.captainId = team.captainId === playerId ? null : playerId;
    this.updatePlayersList();
  }

  /**
   * Set wicket keeper
   */
  setKeeper(playerId) {
    const teamIndex = this.currentStep - 2;
    const team = this.currentMatch?.teams[teamIndex];
    if (!team) return;
    team.wicketKeeperId = team.wicketKeeperId === playerId ? null : playerId;
    this.updatePlayersList();
  }

  /**
   * Quick add 11 placeholder players
   */
  quickAddPlayers() {
    const teamIndex = this.currentStep - 2;
    
    // Ensure team is properly initialized with form data
    this.saveTeamData(teamIndex);

    const team = this.currentMatch.teams[teamIndex];
    
    const existingCount = team.players.length;
    for (let i = existingCount + 1; i <= 11; i++) {
      const player = new Player({ 
        name: `Player ${i}`,
        role: i <= 6 ? 'BAT' : (i <= 9 ? 'BOWL' : 'AR')
      });
      team.addPlayer(player);
    }

    this.updatePlayersList();
  }

  /**
   * Set toss winner
   */
  setTossWinner(teamId) {
    if (!this.currentMatch.toss) {
      this.currentMatch.toss = new Toss();
    }
    this.currentMatch.toss.winnerTeamId = teamId;
    this.render();
  }

  /**
   * Set toss decision
   */
  setTossDecision(decision) {
    if (!this.currentMatch.toss) return;
    this.currentMatch.toss.decision = decision;
    this.render();
  }

  /**
   * Start the match
   */
  async startMatch() {
    this.saveCurrentStepData();

    if (!this.validateCurrentStep()) {
      return;
    }

    try {
      // Start match
      this.currentMatch.startMatch();

      // Save to storage
      await this.app.storageService.saveMatch(this.currentMatch);
      await this.app.storageService.setCurrentMatchId(this.currentMatch.id);

      // Initialize scoring engine
      this.app.match = this.currentMatch;
      this.app.initEngines();

      // Navigate to innings setup
      this.app.showInningsSetup();
    } catch (error) {
      console.error('Failed to start match:', error);
      alert('Failed to start match: ' + error.message);
    }
  }

  /**
   * Load existing match for editing
   */
  loadMatch(match) {
    this.currentMatch = match instanceof Match ? match : Match.fromJSON(match);
    this.currentStep = 1;
    this.render();
  }
}

export default MatchSetup;
