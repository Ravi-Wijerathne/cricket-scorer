/**
 * Storage Service
 * Handles all localStorage and IndexedDB operations
 * Provides persistence for offline-first PWA
 */

const DB_NAME = 'CricketScorerDB';
const DB_VERSION = 1;
const STORES = {
  MATCHES: 'matches',
  SETTINGS: 'settings',
  TEMPLATES: 'templates'
};

export class StorageService {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = this.initDatabase();
  }

  /**
   * Initialize IndexedDB
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database');
        // Fallback to localStorage
        this.useFallback = true;
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        console.log('Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Matches store
        if (!db.objectStoreNames.contains(STORES.MATCHES)) {
          const matchStore = db.createObjectStore(STORES.MATCHES, { keyPath: 'id' });
          matchStore.createIndex('date', 'date', { unique: false });
          matchStore.createIndex('status', 'status', { unique: false });
          matchStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Templates store (for team/player templates)
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
          templateStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * Wait for database to be ready
   */
  async ready() {
    await this.initPromise;
  }

  // ============================================
  // MATCH OPERATIONS
  // ============================================

  /**
   * Save a match
   */
  async saveMatch(match) {
    await this.ready();

    const matchData = typeof match.toJSON === 'function' ? match.toJSON() : match;
    matchData.updatedAt = Date.now();

    if (this.useFallback) {
      return this.saveToLocalStorage('match_' + matchData.id, matchData);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MATCHES], 'readwrite');
      const store = transaction.objectStore(STORES.MATCHES);
      const request = store.put(matchData);

      request.onsuccess = () => resolve(matchData);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a match by ID
   */
  async getMatch(matchId) {
    await this.ready();

    if (this.useFallback) {
      return this.getFromLocalStorage('match_' + matchId);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MATCHES], 'readonly');
      const store = transaction.objectStore(STORES.MATCHES);
      const request = store.get(matchId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all matches
   */
  async getAllMatches() {
    await this.ready();

    if (this.useFallback) {
      return this.getAllFromLocalStorage('match_');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MATCHES], 'readonly');
      const store = transaction.objectStore(STORES.MATCHES);
      const request = store.getAll();

      request.onsuccess = () => {
        const matches = request.result || [];
        // Sort by updatedAt descending
        matches.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(matches);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get recent matches
   */
  async getRecentMatches(limit = 10) {
    const matches = await this.getAllMatches();
    return matches.slice(0, limit);
  }

  /**
   * Get matches by status
   */
  async getMatchesByStatus(status) {
    await this.ready();

    if (this.useFallback) {
      const matches = await this.getAllMatches();
      return matches.filter(m => m.status === status);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MATCHES], 'readonly');
      const store = transaction.objectStore(STORES.MATCHES);
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a match
   */
  async deleteMatch(matchId) {
    await this.ready();

    if (this.useFallback) {
      localStorage.removeItem('match_' + matchId);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MATCHES], 'readwrite');
      const store = transaction.objectStore(STORES.MATCHES);
      const request = store.delete(matchId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  /**
   * Save a setting
   */
  async saveSetting(key, value) {
    await this.ready();

    if (this.useFallback) {
      return this.saveToLocalStorage('setting_' + key, { key, value });
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a setting
   */
  async getSetting(key, defaultValue = null) {
    await this.ready();

    if (this.useFallback) {
      const data = this.getFromLocalStorage('setting_' + key);
      return data?.value ?? defaultValue;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.value ?? defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    await this.ready();

    if (this.useFallback) {
      const settings = this.getAllFromLocalStorage('setting_');
      return settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const settings = results.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        resolve(settings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================

  /**
   * Save a template (team or player)
   */
  async saveTemplate(template) {
    await this.ready();

    if (!template.id) {
      template.id = 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    if (this.useFallback) {
      return this.saveToLocalStorage('template_' + template.id, template);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TEMPLATES], 'readwrite');
      const store = transaction.objectStore(STORES.TEMPLATES);
      const request = store.put(template);

      request.onsuccess = () => resolve(template);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(type) {
    await this.ready();

    if (this.useFallback) {
      const templates = this.getAllFromLocalStorage('template_');
      return templates.filter(t => t.type === type);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TEMPLATES], 'readonly');
      const store = transaction.objectStore(STORES.TEMPLATES);
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId) {
    await this.ready();

    if (this.useFallback) {
      localStorage.removeItem('template_' + templateId);
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TEMPLATES], 'readwrite');
      const store = transaction.objectStore(STORES.TEMPLATES);
      const request = store.delete(templateId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // CURRENT MATCH (Quick Access)
  // ============================================

  /**
   * Set current active match ID
   */
  async setCurrentMatchId(matchId) {
    return this.saveSetting('currentMatchId', matchId);
  }

  /**
   * Get current active match ID
   */
  async getCurrentMatchId() {
    return this.getSetting('currentMatchId');
  }

  /**
   * Get current active match
   */
  async getCurrentMatch() {
    const matchId = await this.getCurrentMatchId();
    if (!matchId) return null;
    return this.getMatch(matchId);
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  /**
   * Export all data as JSON
   */
  async exportAllData() {
    const matches = await this.getAllMatches();
    const settings = await this.getAllSettings();
    const teamTemplates = await this.getTemplatesByType('team');
    const playerTemplates = await this.getTemplatesByType('player');

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      matches,
      settings,
      templates: {
        teams: teamTemplates,
        players: playerTemplates
      }
    };
  }

  /**
   * Import data from JSON
   */
  async importData(data) {
    if (!data.version) {
      throw new Error('Invalid import data');
    }

    // Import matches
    if (data.matches && Array.isArray(data.matches)) {
      for (const match of data.matches) {
        await this.saveMatch(match);
      }
    }

    // Import settings
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await this.saveSetting(key, value);
      }
    }

    // Import templates
    if (data.templates) {
      if (data.templates.teams) {
        for (const template of data.templates.teams) {
          await this.saveTemplate({ ...template, type: 'team' });
        }
      }
      if (data.templates.players) {
        for (const template of data.templates.players) {
          await this.saveTemplate({ ...template, type: 'player' });
        }
      }
    }

    return true;
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    await this.ready();

    if (this.useFallback) {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith('match_') || k.startsWith('setting_') || k.startsWith('template_')
      );
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    }

    const transaction = this.db.transaction(
      [STORES.MATCHES, STORES.SETTINGS, STORES.TEMPLATES], 
      'readwrite'
    );

    await Promise.all([
      new Promise((resolve) => {
        transaction.objectStore(STORES.MATCHES).clear().onsuccess = resolve;
      }),
      new Promise((resolve) => {
        transaction.objectStore(STORES.SETTINGS).clear().onsuccess = resolve;
      }),
      new Promise((resolve) => {
        transaction.objectStore(STORES.TEMPLATES).clear().onsuccess = resolve;
      })
    ]);

    return true;
  }

  // ============================================
  // LOCALSTORAGE FALLBACK
  // ============================================

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch (e) {
      console.error('LocalStorage save failed:', e);
      return null;
    }
  }

  getFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('LocalStorage get failed:', e);
      return null;
    }
  }

  getAllFromLocalStorage(prefix) {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        const item = this.getFromLocalStorage(key);
        if (item) items.push(item);
      }
    }
    return items;
  }
}

// Singleton instance
export const storageService = new StorageService();
export default StorageService;
