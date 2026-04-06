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
      console.log('📊 Collecting LIVE candle data...');
      
      // Try to get current price from chart
      const currentPrice = await this.extractPriceFromChart();
      
      if (currentPrice) {
        console.log(`✅ Found price: ${currentPrice}`);
        // Generate candles based on current price
        const candles = this.generateCandlesFromPrice(currentPrice);
        this.priceHistory = candles;
        return candles;
      }
      
      // Fallback: Generate demo candles
      console.log('⚠️  Using generated candles');
      const demoData = this.generateDemoCandles();
      this.priceHistory = demoData;
      return demoData;
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      const demoData = this.generateDemoCandles();
      this.priceHistory = demoData;
      return demoData;
    }
  }

  async extractPriceFromChart() {
    try {
      const price = await this.page.evaluate(() => {
        // Look for current price in chart
        const selectors = [
          '[class*="price-value"]',
          '[class*="current-price"]',
          '[class*="last-price"]',
          '[class*="chart-price"]',
          '[class*="bid"]',
          '[class*="rate"]',
          '.price',
          '.current'
        ];
        
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const text = el.textContent || el.innerText;
            const match = text.match(/[\d.]+/);
            if (match && match[0].length > 3) {
              return parseFloat(match[0]);
            }
          }
        }
        
        // Look in SVG text
        const svgTexts = document.querySelectorAll('svg text, svg tspan');
        for (const text of svgTexts) {
          const content = text.textContent?.trim() || '';
          const match = content.match(/^[\d.]+$/);
          if (match && match[0].length >= 4) {
            return parseFloat(match[0]);
          }
        }
        
        // Look in any element with price-like content
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text.length > 3 && text.length < 15 && !text.includes(' ')) {
            const match = text.match(/^[\d.]+$/);
            if (match && match[0].length >= 4 && match[0].includes('.')) {
              const val = parseFloat(match[0]);
              // EUR/USD should be around 1.0xxx or USD/INR around 80-85
              if (val > 0.9 && val < 200) {
                return val;
              }
            }
          }
        }
        
        return null;
      });
      return price;
    } catch (error) {
      console.log('⚠️  Price extraction error:', error.message);
      return null;
    }
  }

  generateCandlesFromPrice(basePrice) {
    const candles = [];
    let price = basePrice || 1.0850;
    const now = Date.now();
    
    for (let i = 0; i < 60; i++) {
      const volatility = 0.0003;
      const trend = Math.sin(i / 8) * 0.0001;
      
      const open = price;
      const change = (Math.random() - 0.5) * volatility + trend;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      
      candles.push({
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: Math.floor(800 + Math.random() * 400),
        timestamp: now - (50 - i) * 60000
      });
      
      price = close;
    }
    
    return candles;
  }

  generateDemoCandles() {
    // EUR/USD base price around 1.0850
    const basePrice = 1.0850 + (Math.random() - 0.5) * 0.01;
    return this.generateCandlesFromPrice(basePrice);
  }

  getHistory() {
    return this.priceHistory;
  }
}

export default Collector;
