import { settings } from '../config/settings.js';
import Login from './browser/login.js';
import Trader from './browser/trader.js';
import Collector from './data/collector.js';
import { generateSignal } from './ai/signal.js';
import cron from 'node-cron';

const CURRENCY = '₹';

console.log('╔════════════════════════════════════════╗');
console.log('║    AI Quotex Signal Bot v1.0           ║');
console.log('╚════════════════════════════════════════╝\n');

async function main() {
  const bot = {
    isRunning: false,
    trader: null,
    collector: null,
    page: null,
    currentAsset: settings.trading.defaultAsset,
    signalCount: 0,

    async start() {
      console.log(`Asset:      ${this.currentAsset}`);
      console.log(`Currency:  INR (${CURRENCY})`);
      console.log(`Interval:  Every ${settings.trading.interval} minute(s)\n`);
      
      if (!settings.quotex.email || !settings.quotex.password) {
        console.error('❌ ERROR: Email or password not set in .env!\n');
        process.exit(1);
      }

      try {
        await this.initialize();
        await this.runSignalCycle();
      } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
      }
    },

    async initialize() {
      console.log('━'.repeat(45));
      console.log('[1/3] Initializing browser...');
      const login = new Login();
      await login.init();

      console.log('\n[2/3] Logging in to Quotex...');
      await login.login();

      this.page = await login.getPage();
      this.trader = new Trader(this.page);
      this.collector = new Collector(this.page);

      console.log('\n[3/3] Selecting asset...');
      await this.trader.selectAsset(this.currentAsset);
      
      console.log('\n' + '━'.repeat(45));
      console.log('✅ READY! Bot will show signals every 2 minutes.\n');
      console.log('💡 Place your trade manually based on signals.\n');
      console.log('━'.repeat(45) + '\n');
    },

    async runSignalCycle() {
      this.isRunning = true;
      
      const interval = settings.trading.interval;
      console.log(`📅 Signal Interval: Every ${interval} minute(s)\n`);
      
      cron.schedule(`*/${interval} * * * *`, async () => {
        if (this.isRunning) await this.generateSignal();
      });

      await this.generateSignal();
    },

    async generateSignal() {
      this.signalCount++;
      
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`📊 SIGNAL CHECK #${this.signalCount}`);
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);
      console.log('═'.repeat(50));
      
      try {
        console.log('🔍 Collecting price data...');
        const candles = await this.collector.collectCandles();
        
        if (!candles || candles.length < 30) {
          console.log('⚠️  Insufficient data - waiting for more candles...\n');
          return;
        }
        
        const latest = candles[candles.length - 1];
        console.log(`📈 Price: ${latest.close}`);
        console.log(`📊 Candles loaded: ${candles.length}`);

        console.log('\n🤖 Analyzing market...');
        const signal = await generateSignal(candles);
        
        if (!signal) {
          console.log('⚠️  No signal generated\n');
          return;
        }

        const emoji = signal.direction === 'UP' ? '🟢' : signal.direction === 'DOWN' ? '🔴' : '⚪';
        
        console.log('\n' + '┌' + '─'.repeat(48) + '┐');
        console.log('│' + ' '.repeat(15) + '📊 SIGNAL 📊' + ' '.repeat(16) + '│');
        console.log('├' + '─'.repeat(48) + '┤');
        console.log(`│  Direction:   ${emoji} ${signal.direction.padEnd(25)}│`);
        console.log(`│  Confidence:  ${signal.confidence}% ${' '.repeat(Math.max(0, 20 - signal.confidence.toString().length))}│`);
        console.log('├' + '─'.repeat(48) + '┤');
        console.log(`│  Indicators: ${signal.reason.substring(0, 40).padEnd(40)}│`);
        if (signal.reason.length > 40) {
          console.log(`│  ${signal.reason.substring(40).padEnd(46)}│`);
        }
        console.log('└' + '─'.repeat(48) + '┘');
        
        if (signal.direction === 'HOLD') {
          console.log('\n⏸️  WAIT - No clear signal. Do not trade.\n');
        } else {
          console.log(`\n💡 PLACE ${signal.direction} TRADE NOW!`);
          console.log(`💰 Amount: ${CURRENCY}${settings.trading.amount}\n`);
        }
        
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
  };

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping bot...');
    console.log(`📊 Total signals generated: ${bot.signalCount}`);
    bot.isRunning = false;
    process.exit(0);
  });

  await bot.start();
}

main();
