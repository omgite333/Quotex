import logger from '../logs/logger.js';

export class Collector {
  constructor(page) {
    this.page = page;
    this.priceHistory = [];
    this.maxHistory = 50;
  }

  async collectCandles() {
    try {
      const candles = await this.page.evaluate(() => {
        const chartData = window.__REDUX_STORE__?.getState?.()?.chartData;
        if (chartData?.candles) {
          return chartData.candles;
        }
        
        const svgCandles = document.querySelectorAll('[class*="candle"]');
        if (svgCandles.length > 0) {
          return Array.from(svgCandles).map(c => ({
            open: parseFloat(c.getAttribute('data-open')) || 0,
            high: parseFloat(c.getAttribute('data-high')) || 0,
            low: parseFloat(c.getAttribute('data-low')) || 0,
            close: parseFloat(c.getAttribute('data-close')) || 0,
            volume: parseFloat(c.getAttribute('data-volume')) || 0,
            timestamp: parseInt(c.getAttribute('data-time')) || Date.now()
          }));
        }
        
        return null;
      });

      if (candles && candles.length > 0) {
        this.priceHistory = candles.slice(-this.maxHistory);
        logger.info(`Collected ${candles.length} candles`);
        return this.priceHistory;
      }

      logger.warn('No candle data found, attempting WebSocket extraction...');
      return await this.extractFromChart();
    } catch (error) {
      logger.error('Failed to collect candles:', error.message);
      return [];
    }
  }

  async extractFromChart() {
    try {
      const priceData = await this.page.evaluate(() => {
        const svg = document.querySelector('svg[class*="chart"], svg[class*="candle"]');
        if (!svg) return null;
        
        const paths = svg.querySelectorAll('path[class*="line"], path[class*="candle"]');
        return Array.from(paths).map(p => p.getAttribute('d'));
      });

      if (priceData) {
        logger.info('Extracted price data from chart SVG');
      }
      
      return this.priceHistory;
    } catch (error) {
      logger.error('Chart extraction failed:', error.message);
      return [];
    }
  }

  async getCurrentPrice() {
    try {
      const price = await this.page.evaluate(() => {
        const priceEl = document.querySelector('[class*="current-price"], [class*="price-value"]');
        if (priceEl) {
          return parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
        }
        
        const value = window.__REDUX_STORE__?.getState?.()?.currentPrice;
        return value || null;
      });

      return price;
    } catch (error) {
      logger.error('Failed to get current price:', error.message);
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
