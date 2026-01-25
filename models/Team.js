/**
 * Team Model
 * Represents a cricket team with players and roles
 */

import { Player } from './Player.js';

export class Team {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.shortName = data.shortName || '';
    this.players = [];
    this.captainId = data.captainId || null;
    this.wicketKeeperId = data.wicketKeeperId || null;
    this.color = data.color || '#1a1a2e';

    // Initialize players if provided
    if (data.players && Array.isArray(data.players)) {
      this.players = data.players.map(p => 
        p instanceof Player ? p : Player.fromJSON(p)
      );
    }
  }

  generateId() {
    return 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Add a player to the team
   */
  addPlayer(player) {
    if (this.players.length >= 11) {
      throw new Error('Team already has 11 players');
    }
    
    const playerInstance = player instanceof Player ? player : new Player(player);
    this.players.push(playerInstance);
    return playerInstance;
  }

  /**
   * Remove a player from the team
   */
  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      
      // Clear captain/keeper if removed
      if (this.captainId === playerId) this.captainId = null;
      if (this.wicketKeeperId === playerId) this.wicketKeeperId = null;
    }
  }

  /**
   * Get a player by ID
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Get player by name
   */
  getPlayerByName(name) {
    return this.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Set team captain
   */
  setCaptain(playerId) {
    if (!this.getPlayer(playerId)) {
      throw new Error('Player not found in team');
    }
    this.captainId = playerId;
  }

  /**
   * Set wicket keeper
   */
  setWicketKeeper(playerId) {
    if (!this.getPlayer(playerId)) {
      throw new Error('Player not found in team');
    }
    this.wicketKeeperId = playerId;
  }

  /**
   * Get captain player object
   */
  getCaptain() {
    return this.captainId ? this.getPlayer(this.captainId) : null;
  }

  /**
   * Get wicket keeper player object
   */
  getWicketKeeper() {
    return this.wicketKeeperId ? this.getPlayer(this.wicketKeeperId) : null;
  }

  /**
   * Check if team is complete (has 11 players)
   */
  isComplete() {
    return this.players.length === 11;
  }

  /**
   * Get players count
   */
  getPlayerCount() {
    return this.players.length;
  }

  /**
   * Get all batsmen
   */
  getBatsmen() {
    return this.players.filter(p => p.isBatsman());
  }

  /**
   * Get all bowlers
   */
  getBowlers() {
    return this.players.filter(p => p.isBowler());
  }

  /**
   * Reset all player stats for a new match
   */
  resetAllStats() {
    this.players.forEach(player => player.resetStats());
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      players: this.players.map(p => p.toJSON()),
      captainId: this.captainId,
      wicketKeeperId: this.wicketKeeperId,
      color: this.color
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data) {
    return new Team(data);
  }
}

export default Team;
