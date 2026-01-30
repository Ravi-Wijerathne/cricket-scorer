/**
 * Cricket Scorer - Main Application
 * Progressive Web App for cricket scoring
 */

// Import models
import { Match } from './models/Match.js';
import { Team } from './models/Team.js';
import { Player } from './models/Player.js';
import { Innings } from './models/Innings.js';
import { Over } from './models/Over.js';
import { BallEvent } from './models/BallEvent.js';

// Import engines
import { ScoringEngine } from './engines/ScoringEngine.js';
import { StatsEngine } from './engines/StatsEngine.js';
import { RulesEngine } from './engines/RulesEngine.js';

// Import services
import { StorageService, storageService } from './services/StorageService.js';
import { UndoService, createUndoService } from './services/UndoService.js';

// Import UI components
import { MatchSetup } from './ui/MatchSetup.js';
import { ScoringUI } from './ui/ScoringUI.js';
import { ScorecardUI } from './ui/ScorecardUI.js';

/**
 * Main Application Class
 */
class CricketScorerApp {
  constructor() {
    // Services
    this.storageService = storageService;
    this.undoService = createUndoService(storageService);
    
    // Current match
    this.match = null;
    
    // Engines (initialized with match)
    this.scoringEngine = null;
    this.statsEngine = null;
    this.rulesEngine = null;
    
    // UI Components
    this.matchSetup = new MatchSetup(this);
    this.scoringUI = new ScoringUI(this);
    this.scorecardUI = new ScorecardUI(this);
    
    // Current screen
    this.currentScreen = 'home';
    
    // PWA install prompt
    this.deferredPrompt = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('🏏 Cricket Scorer initializing...');
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup PWA install prompt
    this.setupInstallPrompt();
    
    // Setup offline detection
    this.setupOfflineDetection();
    
    // Wait for storage to be ready
    await this.storageService.ready();
    
    // Load current match if any
    await this.loadCurrentMatch();
    
    // Render initial screen
    this.render();
    
    console.log('✅ Cricket Scorer ready!');
  }

  /**
   * Register service worker for PWA
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('ServiceWorker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('New service worker found');
        });
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    }
  }

  /**
   * Setup PWA install prompt
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Handle install button
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.addEventListener('click', () => this.installApp());
    }

    // Handle dismiss
    const dismissBtn = document.getElementById('dismissInstall');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.hideInstallPrompt());
    }

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('App installed');
      this.hideInstallPrompt();
    });
  }

  /**
   * Show install prompt
   */
  showInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt && this.deferredPrompt) {
      prompt.classList.remove('hidden');
    }
  }

  /**
   * Hide install prompt
   */
  hideInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
      prompt.classList.add('hidden');
    }
  }

  /**
   * Install the app
   */
  async installApp() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
    
    this.deferredPrompt = null;
    this.hideInstallPrompt();
  }

  /**
   * Setup offline detection
   */
  setupOfflineDetection() {
    const indicator = document.getElementById('offlineIndicator');
    
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        indicator?.classList.add('hidden');
      } else {
        indicator?.classList.remove('hidden');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  /**
   * Load current match from storage
   */
  async loadCurrentMatch() {
    try {
      const matchData = await this.storageService.getCurrentMatch();
      if (matchData) {
        this.match = Match.fromJSON(matchData);
        this.initEngines();
        console.log('Loaded match:', this.match.matchName);
      }
    } catch (error) {
      console.error('Failed to load current match:', error);
    }
  }

  /**
   * Initialize engines with current match
   */
  initEngines() {
    if (this.match) {
      this.scoringEngine = new ScoringEngine(this.match);
      this.statsEngine = new StatsEngine(this.match);
      this.rulesEngine = new RulesEngine(this.match);
    }
  }

  /**
   * Main render function
   */
  render() {
    switch (this.currentScreen) {
      case 'home':
        this.renderHome();
        break;
      case 'setup':
        this.matchSetup.render();
        break;
      case 'innings-setup':
        this.renderInningsSetup();
        break;
      case 'scoring':
        this.scoringUI.render();
        break;
      case 'scorecard':
        this.scorecardUI.render();
        break;
      default:
        this.renderHome();
    }
  }

  /**
   * Render home screen
   */
  renderHome() {
    const container = document.getElementById('app');
    
    container.innerHTML = `
      <div class="home-screen">
        <header class="home-header">
          <h1>🏏 Cricket Scorer</h1>
          <p>Professional ball-by-ball scoring</p>
        </header>
        
        <main class="home-content">
          <div class="home-actions">
            <button class="btn btn-primary btn-large" id="newMatchBtn">
              ➕ New Match
            </button>
            
            ${this.match && !this.match.isComplete() ? `
              <button class="btn btn-success btn-large" id="continueMatchBtn">
                ▶️ Continue Match
              </button>
            ` : ''}
          </div>
          
          <div class="recent-matches">
            <h2>Recent Matches</h2>
            <div id="recentMatchesList" class="matches-list">
              Loading...
            </div>
          </div>
        </main>
        
        <footer class="home-footer">
          <p>Version 1.0.0 • Made with ❤️</p>
        </footer>
      </div>
    `;

    // Attach event listeners
    document.getElementById('newMatchBtn')?.addEventListener('click', () => {
      this.showMatchSetup();
    });

    document.getElementById('continueMatchBtn')?.addEventListener('click', () => {
      this.showScoring();
    });

    // Load recent matches
    this.loadRecentMatches();

    // Add home screen styles if not present
    this.addHomeStyles();
  }

  /**
   * Load and display recent matches
   */
  async loadRecentMatches() {
    const container = document.getElementById('recentMatchesList');
    if (!container) return;

    try {
      const matches = await this.storageService.getRecentMatches(5);
      
      if (matches.length === 0) {
        container.innerHTML = '<p class="empty-state">No matches yet</p>';
        return;
      }

      container.innerHTML = matches.map(match => `
        <div class="match-card" data-match-id="${match.id}">
          <div class="match-card-header">
            <span class="match-name">${match.matchName || 'Unnamed Match'}</span>
            <span class="match-status ${match.status.toLowerCase()}">${match.status}</span>
          </div>
          <div class="match-card-body">
            <span class="match-date">${match.date}</span>
            <span class="match-venue">${match.venue || 'No venue'}</span>
          </div>
          <div class="match-card-scores">
            ${match.innings?.[0] ? `
              <span>${match.teams?.[0]?.shortName || 'Team A'}: ${match.innings[0].totalRuns}/${match.innings[0].wicketsFallen}</span>
            ` : ''}
            ${match.innings?.[1] ? `
              <span>${match.teams?.[1]?.shortName || 'Team B'}: ${match.innings[1].totalRuns}/${match.innings[1].wicketsFallen}</span>
            ` : ''}
          </div>
          <button class="btn-delete-match" title="Delete match">🗑️</button>
        </div>
      `).join('');

      // Add click handlers
      container.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
          this.loadMatch(card.dataset.matchId);
        });

        // Add delete button handler
        const deleteBtn = card.querySelector('.btn-delete-match');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteMatch(card.dataset.matchId);
        });
      });
    } catch (error) {
      console.error('Failed to load recent matches:', error);
      container.innerHTML = '<p class="error">Failed to load matches</p>';
    }
  }

  /**
   * Load a specific match
   */
  async loadMatch(matchId) {
    try {
      const matchData = await this.storageService.getMatch(matchId);
      if (matchData) {
        this.match = Match.fromJSON(matchData);
        this.initEngines();
        await this.storageService.setCurrentMatchId(matchId);
        
        if (this.match.isComplete()) {
          this.showScorecard();
        } else {
          this.showScoring();
        }
      }
    } catch (error) {
      console.error('Failed to load match:', error);
      alert('Failed to load match');
    }
  }

  /**
   * Delete a specific match
   */
  async deleteMatch(matchId) {
    if (confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      try {
        await this.storageService.deleteMatch(matchId);
        
        // If deleted match is the current match, clear it
        if (this.match && this.match.id === matchId) {
          this.match = null;
          this.rulesEngine = null;
          this.scoringEngine = null;
          this.statsEngine = null;
          await this.storageService.setCurrentMatchId(null);
        }
        
        // Re-render home to update the UI
        this.renderHome();
      } catch (error) {
        console.error('Failed to delete match:', error);
        alert('Failed to delete match');
      }
    }
  }

  /**
   * Add home screen specific styles
   */
  addHomeStyles() {
    if (document.getElementById('home-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'home-styles';
    styles.textContent = `
      .home-screen {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      
      .home-header {
        padding: var(--spacing-xl);
        text-align: center;
        background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
      }
      
      .home-header h1 {
        font-size: 2rem;
        margin-bottom: var(--spacing-sm);
      }
      
      .home-header p {
        color: var(--text-secondary);
      }
      
      .home-content {
        flex: 1;
        padding: var(--spacing-lg);
      }
      
      .home-actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-xl);
      }
      
      .btn-large {
        padding: var(--spacing-lg);
        font-size: 1.1rem;
      }
      
      .recent-matches h2 {
        font-size: 1rem;
        margin-bottom: var(--spacing-md);
        color: var(--text-secondary);
      }
      
      .matches-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }
      
      .match-card {
        padding: var(--spacing-md);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .match-card:hover {
        background: var(--bg-tertiary);
      }
      
      .match-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xs);
      }
      
      .match-name {
        font-weight: 600;
      }
      
      .match-status {
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        text-transform: uppercase;
      }
      
      .match-status.in_progress {
        background: var(--success);
        color: var(--bg-primary);
      }
      
      .match-status.completed {
        background: var(--info);
        color: white;
      }
      
      .match-status.not_started {
        background: var(--warning);
        color: var(--bg-primary);
      }
      
      .match-card-body {
        display: flex;
        gap: var(--spacing-md);
        font-size: 0.85rem;
        color: var(--text-muted);
      }
      
      .match-card-scores {
        display: flex;
        gap: var(--spacing-md);
        margin-top: var(--spacing-sm);
        font-family: var(--font-mono);
        font-size: 0.9rem;
      }
      
      .btn-delete-match {
        position: absolute;
        bottom: var(--spacing-md);
        right: var(--spacing-md);
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 1rem;
        padding: var(--spacing-xs) var(--spacing-sm);
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s, background 0.2s;
      }
      
      .match-card {
        position: relative;
      }
      
      .match-card:hover .btn-delete-match {
        opacity: 1;
      }
      
      .btn-delete-match:hover {
        transform: scale(1.1);
        background: var(--danger);
        border-color: var(--danger);
      }
      
      .home-footer {
        padding: var(--spacing-md);
        text-align: center;
        color: var(--text-muted);
        font-size: 0.85rem;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Render innings setup screen (select opening batsmen & bowler)
   */
  renderInningsSetup() {
    const container = document.getElementById('app');
    const innings = this.match.getCurrentInnings();
    const battingTeam = this.match.getTeam(innings.battingTeamId);
    const bowlingTeam = this.match.getTeam(innings.bowlingTeamId);

    container.innerHTML = `
      <div class="innings-setup">
        <header class="setup-header">
          <h1>Start Innings ${innings.inningsNumber}</h1>
          <p>${battingTeam?.name} batting</p>
        </header>
        
        <main class="setup-content">
          <div class="player-selection">
            <h3>Select Opening Batsmen</h3>
            <div class="player-select-grid" id="batsmenGrid">
              ${battingTeam?.players.map((player, index) => `
                <label class="player-select-option">
                  <input type="checkbox" name="batsman" value="${player.id}" 
                         ${index < 2 ? 'checked' : ''}>
                  <span class="player-name">${player.name}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="player-selection">
            <h3>Select Opening Bowler</h3>
            <div class="player-select-grid" id="bowlerGrid">
              ${bowlingTeam?.players.map((player, index) => `
                <label class="player-select-option">
                  <input type="radio" name="bowler" value="${player.id}" 
                         ${index === 0 ? 'checked' : ''}>
                  <span class="player-name">${player.name}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </main>
        
        <footer class="setup-footer">
          <button class="btn btn-primary" id="startInningsBtn">
            Start Innings
          </button>
        </footer>
      </div>
    `;

    // Add styles
    this.addInningsSetupStyles();

    // Attach event listeners
    document.getElementById('startInningsBtn')?.addEventListener('click', () => {
      this.startInnings();
    });

    // Limit batsmen selection to 2
    const checkboxes = document.querySelectorAll('input[name="batsman"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = document.querySelectorAll('input[name="batsman"]:checked');
        if (checked.length > 2) {
          cb.checked = false;
        }
      });
    });
  }

  /**
   * Add innings setup styles
   */
  addInningsSetupStyles() {
    if (document.getElementById('innings-setup-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'innings-setup-styles';
    styles.textContent = `
      .innings-setup {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      
      .player-selection {
        margin-bottom: var(--spacing-xl);
      }
      
      .player-selection h3 {
        margin-bottom: var(--spacing-md);
        font-size: 1rem;
      }
      
      .player-select-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
      }
      
      .player-select-option {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .player-select-option:has(input:checked) {
        background: var(--bg-tertiary);
        border: 1px solid var(--primary);
      }
      
      .player-select-option input {
        width: auto;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Start the innings with selected players
   */
  startInnings() {
    const innings = this.match.getCurrentInnings();
    
    // Get selected batsmen
    const selectedBatsmen = Array.from(
      document.querySelectorAll('input[name="batsman"]:checked')
    ).map(cb => cb.value);
    
    if (selectedBatsmen.length !== 2) {
      alert('Please select exactly 2 opening batsmen');
      return;
    }
    
    // Get selected bowler
    const selectedBowler = document.querySelector('input[name="bowler"]:checked')?.value;
    
    if (!selectedBowler) {
      alert('Please select an opening bowler');
      return;
    }
    
    // Start innings
    innings.start(selectedBatsmen[0], selectedBatsmen[1], selectedBowler);
    
    // Set batting positions
    const striker = this.match.getPlayer(selectedBatsmen[0]);
    const nonStriker = this.match.getPlayer(selectedBatsmen[1]);
    if (striker) striker.battingStats.position = 1;
    if (nonStriker) nonStriker.battingStats.position = 2;
    
    // Save match
    this.storageService.saveMatch(this.match);
    
    // Show scoring screen
    this.showScoring();
  }

  // Navigation methods
  showHome() {
    this.currentScreen = 'home';
    this.render();
  }

  showMatchSetup() {
    this.currentScreen = 'setup';
    this.matchSetup = new MatchSetup(this);
    this.render();
  }

  showInningsSetup() {
    this.currentScreen = 'innings-setup';
    this.render();
  }

  showScoring() {
    if (!this.match) {
      this.showHome();
      return;
    }
    this.currentScreen = 'scoring';
    this.render();
  }

  showScorecard() {
    if (!this.match) {
      this.showHome();
      return;
    }
    this.currentScreen = 'scorecard';
    this.render();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new CricketScorerApp();
  window.cricketApp = app; // For debugging
  app.init();
});

export default CricketScorerApp;
