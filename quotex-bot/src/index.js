import { settings } from '../config/settings.js';
import Login from './browser/login.js';
import Trader from './browser/trader.js';
import Collector from './data/collector.js';
import History from './data/history.js';
import { generateSignal } from './ai/signal.js';
import { validateSignal } from './ai/validator.js';
import riskManager from './risk/manager.js';
import cron from 'node-cron';

console.log('========================================');
console.log('   AI Quotex Trading Bot v1.0');
console.log('========================================\n');

async function main() {
  const bot = {
    isRunning: false,
    trader: null,
    collector: null,
    page: null,
    currentAsset: settings.trading.defaultAsset,
    tradeCount: 0,

    async start() {
      console.log(`Mode: ${settings.demo.enabled ? 'DEMO' : 'LIVE'}`);
      console.log(`Interval: Every ${settings.trading.interval} minutes`);
      console.log(`Email: ${settings.quotex.email || 'NOT SET'}`);
      
      if (!settings.quotex.email || !settings.quotex.password) {
        console.error('\n❌ ERROR: Email or password not set!');
        console.log('Please create a .env file with your credentials.\n');
        process.exit(1);
      }

      try {
        await this.initialize();
        await this.runTradingCycle();
      } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
      }
    },

    async initialize() {
      console.log('\n[1/3] Initializing browser...');
      const login = new Login();
      await login.init();

      console.log('[2/3] Logging in...');
      await login.login();

      this.page = await login.getPage();
      this.trader = new Trader(this.page);
      this.collector = new Collector(this.page);

      console.log('[3/3] Selecting asset...');
      await this.trader.selectAsset(this.currentAsset);
      
      console.log('\n✅ Ready!\n');
    },

    async runTradingCycle() {
      this.isRunning = true;
      
      const interval = settings.trading.interval;
      console.log(`📅 Scheduling trades every ${interval} minute(s)`);
      console.log('🚀 Bot is running! Press Ctrl+C to stop.\n');
      
      cron.schedule(`*/${interval} * * * *`, async () => {
        if (this.isRunning) await this.tradingStep();
      });

      await this.tradingStep();
    },

    async tradingStep() {
      this.tradeCount++;
      console.log(`\n========== CYCLE #${this.tradeCount} ==========`);
      
      try {
        const { canTrade, errors } = await riskManager.checkRiskLimits();
        if (!canTrade) {
          errors.forEach(e => console.warn(`⚠️  ${e}`));
          return;
        }

        console.log('📊 Collecting data...');
        const candles = await this.collector.collectCandles();
        
        if (!candles || candles.length < 20) {
          console.log('⚠️  Insufficient data');
          return;
        }

        console.log('🤖 Generating signal...');
        const signal = await generateSignal(candles);
        
        if (!signal) {
          console.log('⚠️  No signal');
          return;
        }

        console.log(`\n📊 SIGNAL: ${signal.direction} | Confidence: ${signal.confidence}%`);
        console.log(`📝 ${signal.reason}`);

        if (signal.direction === 'HOLD') {
          console.log('⏸️  Skipping (HOLD)');
          return;
        }

        const stats = await History.getStats();
        const validation = validateSignal(signal, stats);

        if (!validation.valid) {
          validation.errors.forEach(e => console.warn(`⚠️  ${e}`));
          return;
        }

        const balance = await this.trader.getBalance() || 10000;
        const amount = riskManager.getRecommendedAmount(balance, signal.confidence);

        console.log(`💰 Balance: $${balance} | Amount: $${amount}`);
        console.log(`🔄 Placing ${signal.direction} trade...`);

        await this.trader.setTradeAmount(amount);
        const success = await this.trader.placeTrade(signal.direction);

        if (success) {
          riskManager.recordTrade();
          
          console.log('⏳ Waiting for result...');
          const result = await this.trader.waitForResult(settings.trading.expiry * 60000 + 30000);
          const payout = result === 'WIN' ? amount * 1.85 : 0;

          await History.saveTrade({ asset: this.currentAsset, direction: signal.direction, confidence: signal.confidence, reason: signal.reason, amount, expiry: settings.trading.expiry, result });
          await History.updateStats(result, payout);

          const newStats = await History.getStats();
          console.log(`\n🏁 RESULT: ${result} | Payout: $${payout.toFixed(2)}`);
          console.log(`📈 Win Rate: ${newStats.winRate} | P&L: $${newStats.totalProfit.toFixed(2)}`);
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
      console.log('=========================================\n');
    }
  };

  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping...');
    bot.isRunning = false;
    process.exit(0);
  });

  await bot.start();
}

main();
