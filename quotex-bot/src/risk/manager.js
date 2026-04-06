import { settings } from '../../config/settings.js';
import History from '../data/history.js';

class RiskManager {
  constructor() {
    this.isPaused = false;
    this.pauseUntil = null;
    this.hourlyTrades = [];
  }

  async checkRiskLimits() {
    // No limits for testing
    return {
      canTrade: true,
      errors: []
    };
  }

  recordTrade() {
    this.hourlyTrades.push(Date.now());
    this.cleanupOldTrades();
  }

  cleanupOldTrades() {
    const oneHourAgo = Date.now() - 3600000;
    this.hourlyTrades = this.hourlyTrades.filter(t => t > oneHourAgo);
  }

  getTradesThisHour() {
    this.cleanupOldTrades();
    return this.hourlyTrades.length;
  }

  getRecommendedAmount(balance, confidence) {
    return Math.max(500, settings.trading.amount);
  }
}

export default new RiskManager();
