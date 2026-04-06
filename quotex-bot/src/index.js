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

class QuotexBot {
  constructor() {
    this.isRunning = false;
    this.trader = null;
    this.collector = null;
    this.currentAsset = settings.trading.defaultAsset;
    this.tradeCount = 0;
  }

  async start() {
    logger.info('=== AI Quotex Trading Bot Starting ===');
    logger.info(`Mode: ${settings.demo.enabled ? 'DEMO' : 'LIVE'}`);
    logger.info(`Interval: Every ${settings.trading.interval} minutes`);
    logger.info(`AI Provider: ${settings.ai.provider} (indicators only)`);

    await this.initialize();
    await this.runTradingCycle();
  }

  async initialize() {
    try {
      const login = new Login();
      await login.init();
      await login.login();

      this.page = await login.getPage();
      
      this.trader = new Trader(this.page);
      this.collector = new Collector(this.page);

      await this.trader.selectAsset(this.currentAsset);
      
      logger.info('Initialization complete');
    } catch (error) {
      logger.error('Initialization failed:', error.message);
      throw error;
    }
  }

  async runTradingCycle() {
    this.isRunning = true;
    
    const scheduleExpression = `*/${settings.trading.interval} * * * *`;
    
    logger.info(`Scheduling trades every ${settings.trading.interval} minute(s) (cron: ${scheduleExpression})`);
    
    cron.schedule(scheduleExpression, async () => {
      if (!this.isRunning) return;
      await this.tradingStep();
    });

    await this.tradingStep();
  }

  async tradingStep() {
    this.tradeCount++;
    const cycleId = this.tradeCount;
    
    logger.info(`\n========== CYCLE #${cycleId} ==========`);
    
    try {
      const { canTrade, errors } = await riskManager.checkRiskLimits();
      
      if (!canTrade) {
        errors.forEach(e => logger.warn(e));
        return;
      }

      const candles = await this.collector.collectCandles();
      
      if (!candles || candles.length < 20) {
        logger.warn('Insufficient data, skipping cycle');
        return;
      }

      const signal = await generateSignal(candles);
      
      if (!signal) {
        logger.warn('No signal generated');
        return;
      }

      logger.info(`📊 SIGNAL: ${signal.direction} | Confidence: ${signal.confidence}%`);
      logger.info(`📝 Reason: ${signal.reason}`);

      if (signal.direction === 'HOLD') {
        logger.info('⏸️  Signal is HOLD, skipping trade');
        return;
      }

      const stats = await History.getStats();
      const validation = validateSignal(signal, stats);

      if (!validation.valid) {
        validation.errors.forEach(e => logger.warn(e));
        return;
      }

      validation.warnings?.forEach(w => logger.info(`⚠️  ${w}`));

      const balance = await this.trader.getBalance() || 10000;
      const amount = riskManager.getRecommendedAmount(balance, signal.confidence);

      logger.info(`💰 Balance: $${balance} | Trade Amount: $${amount}`);

      await this.trader.setTradeAmount(amount);
      const success = await this.trader.placeTrade(signal.direction);

      if (success) {
        riskManager.recordTrade();
        
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
        logger.info(`\n🏁 RESULT: ${result} | Payout: $${payout.toFixed(2)}`);
        logger.info(`📈 Stats: Win Rate: ${newStats.winRate} | Total P&L: $${newStats.totalProfit.toFixed(2)}`);
        logger.info(`=========================================\n`);
      }
    } catch (error) {
      logger.error('Trading step error:', error.message);
    }
  }

  stop() {
    logger.info('Stopping bot...');
    this.isRunning = false;
  }
}

const bot = new QuotexBot();

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  bot.stop();
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  bot.start().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

export default QuotexBot;
