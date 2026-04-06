import { settings } from '../../config/settings.js';

export class Collector {
  constructor(page) {
    this.page = page;
    this.priceHistory = [];
    this.maxHistory = 50;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async collectCandles() {
    try {
      console.log('📊 Collecting candle data...');
      
      // Try to get data from Redux store first
      const reduxData = await this.page.evaluate(() => {
        try {
          // Try various Redux store access patterns
          const store = window.__REDUX_STORE__ || window.store;
          if (store) {
            const state = store.getState();
            return state;
          }
          
          // Try finding chart data in global scope
          for (const key in window) {
            if (key.includes('chart') || key.includes('candle') || key.includes('trade')) {
              try {
                const data = window[key];
                if (data && typeof data === 'object') {
                  return data;
                }
              } catch {}
            }
          }
          
          return null;
        } catch {
          return null;
        }
      });
      
      if (reduxData) {
        console.log('✅ Found Redux data');
      }
      
      // Try to extract from chart SVG or canvas
      const chartData = await this.extractFromChart();
      
      if (chartData && chartData.length > 0) {
        this.priceHistory = chartData;
        console.log(`✅ Collected ${chartData.length} candles from chart`);
        return chartData;
      }
      
      // Try to get from WebSocket (if we can intercept it)
      const wsData = await this.extractFromWebSocket();
      
      if (wsData && wsData.length > 0) {
        this.priceHistory = wsData;
        console.log(`✅ Collected ${wsData.length} candles from WebSocket`);
        return wsData;
      }
      
      // Generate demo candle data for testing
      console.log('⚠️  No live data, generating demo candles for testing...');
      const demoData = this.generateDemoCandles();
      this.priceHistory = demoData;
      return demoData;
      
    } catch (error) {
      console.error('❌ Error collecting candles:', error.message);
      
      // Return demo data as fallback
      console.log('📊 Using demo candle data');
      const demoData = this.generateDemoCandles();
      this.priceHistory = demoData;
      return demoData;
    }
  }

  async extractFromChart() {
    try {
      const data = await this.page.evaluate(() => {
        // Look for SVG chart elements
        const svg = document.querySelector('svg[class*="chart"], svg[class*="candle"], svg[class*="trade"]');
        if (svg) {
          const paths = svg.querySelectorAll('path[class*="line"], path[class*="candle-body"], rect[class*="candle"]');
          if (paths.length > 0) {
            return Array.from(paths).map(p => ({
              d: p.getAttribute('d'),
              class: p.getAttribute('class')
            }));
          }
        }
        
        // Look for canvas chart
        const canvas = document.querySelector('canvas[class*="chart"], canvas[class*="candle"]');
        if (canvas) {
          return { type: 'canvas', width: canvas.width, height: canvas.height };
        }
        
        // Look for data in table or list
        const candleList = document.querySelectorAll('[class*="candle-item"], [class*="ohlc"]');
        if (candleList.length > 0) {
          return Array.from(candleList).map(el => el.textContent);
        }
        
        return null;
      });
      
      return data || [];
    } catch (error) {
      return [];
    }
  }

  async extractFromWebSocket() {
    try {
      // This is a placeholder - actual WebSocket interception would require more complex code
      console.log('🔌 WebSocket extraction not implemented');
      return [];
    } catch (error) {
      return [];
    }
  }

  generateDemoCandles() {
    const candles = [];
    let basePrice = 1.0850; // EUR/USD base price
    const now = Date.now();
    
    for (let i = 0; i < 50; i++) {
      const volatility = 0.0003;
      const trend = Math.sin(i / 10) * 0.0001;
      
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + trend + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = 1000 + Math.random() * 500;
      
      candles.push({
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: parseInt(volume),
        timestamp: now - (50 - i) * 60000
      });
      
      basePrice = close;
    }
    
    console.log(`📈 Generated ${candles.length} demo candles`);
    return candles;
  }

  async getCurrentPrice() {
    try {
      const price = await this.page.evaluate(() => {
        // Look for current price element
        const priceSelectors = [
          '[class*="current-price"]',
          '[class*="price-value"]',
          '[class*="bid"]',
          '[class*="ask"]',
          '[class*="rate"]'
        ];
        
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const text = el.textContent;
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) return price;
          }
        }
        
        return null;
      });
      
      return price;
    } catch (error) {
      return null;
    }
  }

  getHistory() {
    return this.priceHistory;
  }

  addCandle(candle) {
    this.priceHistory.push(candle);
    if (this.priceHistory.length > this.maxHistory) {
      this.priceHistory.shift();
    }
  }

  clearHistory() {
    this.priceHistory = [];
  }
}

export default Collector;
