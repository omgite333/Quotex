import { settings } from '../config/settings.js';
import logger from './logs/logger.js';
import Login from './browser/login.js';
import Trader from './browser/trader.js';
import Collector from './data/collector.js';
import History from './data/history.js';
import { generateSignal } from './ai/signal.js';
import { validateSignal } from './ai/validator.js';
import riskManager from './risk/manager.js';
import cron from 'node-cron';

console.log('Starting Quotex Bot...');

class QuotexBot {
  constructor() {
    this.isRunning = false;
    this.trader = null;
    this.collector = null;
    this.page = null;
    this.currentAsset = settings.trading.defaultAsset;
    this.tradeCount = 0;
  }

  async start() {
    console.log('=== AI Quotex Trading Bot Starting ===');
    console.log(`Mode: ${settings.demo.enabled ? 'DEMO' : 'LIVE'}`);
    console.log(`Interval: Every ${settings.trading.interval} minutes`);
    console.log(`AI Provider: ${settings.ai.provider} (indicators only)`);
    console.log(`Email: ${settings.quotex.email ? 'Configured' : 'NOT SET - Check .env file'}`);

    await this.initialize();
    await this.runTradingCycle();
  }

  async initialize() {
    try {
      console.log('\n[1/4] Initializing browser...');
      const login = new Login();
      await login.init();

      console.log('[2/4] Logging in to Quotex...');
      await login.login();

      this.page = await login.getPage();
      
      console.log('[3/4] Setting up trader and collector...');
      this.trader = new Trader(this.page);
      this.collector = new Collector(this.page);

      console.log(`[4/4] Selecting asset: ${this.currentAsset}`);
      await this.trader.selectAsset(this.currentAsset);
      
      console.log('\n✅ Initialization complete!\n');
    } catch (error) {
      console.error('\n❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async runTradingCycle() {
    this.isRunning = true;
    
    const scheduleExpression = `*/${settings.trading.interval} * * * *`;
    
    console.log(`📅 Scheduling trades every ${settings.trading.interval} minute(s)`);
    console.log(`   Cron expression: ${scheduleExpression}`);
    console.log('\n🚀 Bot is running! Press Ctrl+C to stop.\n');
    
    cron.schedule(scheduleExpression, async () => {
      if (!this.isRunning) return;
      await this.tradingStep();
    });

    await this.tradingStep();
  }

  async tradingStep() {
    this.tradeCount++;
    const cycleId = this.tradeCount;
    
    console.log(`\n========== CYCLE #${cycleId} ==========`);
    
    try {
      const { canTrade, errors } = await riskManager.checkRiskLimits();
      
      if (!canTrade) {
        errors.forEach(e => console.warn(`⚠️  ${e}`));
        return;
      }

      console.log('📊 Collecting candle data...');
      const candles = await this.collector.collectCandles();
      
      if (!candles || candles.length < 20) {
        console.log('⚠️  Insufficient data, skipping cycle');
        return;
      }
      
      console.log(`📈 Collected ${candles.length} candles`);

      console.log('🤖 Generating signal...');
      const signal = await generateSignal(candles);
      
      if (!signal) {
        console.log('⚠️  No signal generated');
        return;
      }

      console.log(`\n📊 SIGNAL: ${signal.direction} | Confidence: ${signal.confidence}%`);
      console.log(`📝 Reason: ${signal.reason}`);

      if (signal.direction === 'HOLD') {
        console.log('⏸️  Signal is HOLD, skipping trade');
        return;
      }

      const stats = await History.getStats();
      const validation = validateSignal(signal, stats);

      if (!validation.valid) {
        validation.errors.forEach(e => console.warn(`⚠️  ${e}`));
        return;
      }

      validation.warnings?.forEach(w => console.log(`⚠️  ${w}`));

      const balance = await this.trader.getBalance() || 10000;
      const amount = riskManager.getRecommendedAmount(balance, signal.confidence);

      console.log(`💰 Balance: $${balance} | Trade Amount: $${amount}`);

      console.log(`🔄 Placing ${signal.direction} trade...`);
      await this.trader.setTradeAmount(amount);
      const success = await this.trader.placeTrade(signal.direction);

      if (success) {
        riskManager.recordTrade();
        
        console.log('⏳ Waiting for result...');
        const result = await this.trader.waitForResult(settings.trading.expiry * 60000 + 30000);
        const payout = result === 'WIN' ? amount * 1.85 : 0;

        await History.saveTrade({
          asset: this.currentAsset,
          direction: signal.direction,
          confidence: signal.confidence,
          reason: signal.reason,
          amount,
          expiry: settings.trading.expiry,
          result
        });

        await History.updateStats(result, payout);

        const newStats = await History.getStats();
        console.log(`\n🏁 RESULT: ${result} | Payout: $${payout.toFixed(2)}`);
        console.log(`📈 Stats: Win Rate: ${newStats.winRate} | Total P&L: $${newStats.totalProfit.toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Trading step error:', error.message);
    }
    
    console.log(`=========================================\n`);
  }

  stop() {
    console.log('\n🛑 Stopping bot...');
    this.isRunning = false;
  }
}

const bot = new QuotexBot();

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  bot.stop();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  bot.start().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export default QuotexBot;
