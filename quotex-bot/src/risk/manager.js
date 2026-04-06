import { settings } from '../../config/settings.js';
import History from '../data/history.js';

class RiskManager {
  constructor() {
    this.isPaused = false;
    this.pauseUntil = null;
    this.hourlyTrades = [];
  }

  async checkRiskLimits() {
    const stats = await History.getStats();
    const errors = [];

    if (stats.consecutiveLosses >= settings.trading.maxConsecutiveLosses) {
      this.pause(30);
      errors.push(`Paused 30min: ${stats.consecutiveLosses} consecutive losses`);
    }

    if (Math.abs(stats.totalProfit) >= settings.trading.dailyLossLimit) {
      this.pause(1440);
      errors.push(`Daily limit hit: $${Math.abs(stats.totalProfit)}`);
    }

    if (this.isPaused && this.pauseUntil && Date.now() < this.pauseUntil) {
      const remaining = Math.ceil((this.pauseUntil - Date.now()) / 60000);
      errors.push(`Bot paused: ${remaining} min remaining`);
    }

    const tradesThisHour = this.getTradesThisHour();
    if (tradesThisHour >= settings.trading.maxTradesPerHour) {
      errors.push(`Hourly limit: ${tradesThisHour}/${settings.trading.maxTradesPerHour}`);
    }

    return {
      canTrade: errors.length === 0,
      errors
    };
  }

  pause(minutes) {
    this.isPaused = true;
    this.pauseUntil = Date.now() + (minutes * 60000);
    console.log(`⏸️  Bot paused for ${minutes} minutes`);
  }

  resume() {
    this.isPaused = false;
    this.pauseUntil = null;
    console.log('▶️  Bot resumed');
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
    let percent = 1;
    
    if (confidence > 80) percent = 2;
    if (confidence > 90) percent = 3;
    if (balance < 50) percent = 0.5;
    
    const amount = balance * (percent / 100);
    return Math.max(1, Math.min(amount, settings.trading.amount * 3));
  }
}

export default new RiskManager();
