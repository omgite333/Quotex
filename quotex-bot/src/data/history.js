import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Low(new JSONFile('data/trades.json'), {
  trades: [],
  stats: {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalProfit: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0
  }
});

await db.read();

export class History {
  static async saveTrade(trade) {
    db.data.trades.push({
      ...trade,
      timestamp: new Date().toISOString()
    });
    await db.write();
  }

  static async updateStats(result, profit) {
    const stats = db.data.stats;
    stats.totalTrades++;
    
    if (result === 'WIN') {
      stats.wins++;
      stats.consecutiveWins++;
      stats.consecutiveLosses = 0;
      stats.totalProfit += profit;
    } else {
      stats.losses++;
      stats.consecutiveLosses++;
      stats.consecutiveWins = 0;
      stats.totalProfit -= Math.abs(profit);
    }
    
    await db.write();
    return stats;
  }

  static async getStats() {
    return {
      ...db.data.stats,
      winRate: db.data.stats.totalTrades > 0 
        ? (db.data.stats.wins / db.data.stats.totalTrades * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  static async getRecentTrades(count = 20) {
    return db.data.trades.slice(-count);
  }

  static async resetDaily() {
    const today = new Date().toDateString();
    const lastTradeDate = db.data.trades.length > 0 
      ? new Date(db.data.trades[db.data.trades.length - 1].timestamp).toDateString()
      : null;
    
    if (lastTradeDate !== today) {
      db.data.dailyProfit = 0;
      db.data.dailyTrades = 0;
      await db.write();
    }
  }
}

export default History;
