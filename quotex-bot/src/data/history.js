import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'trades.json');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, {
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

class History {
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
    } else if (result === 'LOSS') {
      stats.losses++;
      stats.consecutiveLosses++;
      stats.consecutiveWins = 0;
      stats.totalProfit -= Math.abs(profit);
    }
    
    await db.write();
    return stats;
  }

  static async getStats() {
    const stats = db.data.stats;
    
    // Reset stats if it's a new day
    const today = new Date().toDateString();
    const lastTradeDate = db.data.trades.length > 0 
      ? new Date(db.data.trades[db.data.trades.length - 1].timestamp).toDateString()
      : null;
    
    if (lastTradeDate !== today) {
      // New day - reset daily stats
      stats.totalProfit = 0;
      stats.consecutiveLosses = 0;
      stats.consecutiveWins = 0;
    }
    
    return {
      ...stats,
      winRate: stats.totalTrades > 0 
        ? (stats.wins / stats.totalTrades * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  static async getRecentTrades(count = 20) {
    return db.data.trades.slice(-count);
  }
  
  static async resetStats() {
    db.data.stats = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };
    db.data.trades = [];
    await db.write();
    console.log('✅ Stats reset!');
  }
}

export default History;
