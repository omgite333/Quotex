import logger from '../logs/logger.js';
import { settings } from '../../config/settings.js';

export class Trader {
  constructor(page) {
    this.page = page;
  }

  async selectAsset(asset) {
    try {
      logger.info(`Selecting asset: ${asset}`);
      
      await this.page.click('.assets-button, [class*="asset"]', { timeout: 5000 }).catch(() => {});
      
      const assetSelector = `text="${asset}"`;
      await this.page.waitForSelector(assetSelector, { timeout: 5000 });
      await this.page.click(assetSelector);
      
      logger.info(`Asset ${asset} selected`);
      return true;
    } catch (error) {
      logger.error(`Failed to select asset ${asset}:`, error.message);
      return false;
    }
  }

  async setTradeAmount(amount) {
    try {
      const input = await this.page.$('input[class*="amount"], input[class*="sum"]');
      if (input) {
        await input.click({ clickCount: 3 });
        await input.type(String(amount));
        logger.info(`Trade amount set to $${amount}`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to set trade amount:', error.message);
      return false;
    }
  }

  async setExpiry(minutes) {
    try {
      const expirySelector = `text="${minutes}min", text="${minutes} m"`;
      await this.page.click(expirySelector, { timeout: 3000 });
      logger.info(`Expiry set to ${minutes} minutes`);
      return true;
    } catch (error) {
      logger.warn('Expiry selector not found, using default');
      return false;
    }
  }

  async placeTrade(direction) {
    const buttonClass = direction === 'UP' 
      ? '.button-up, [class*="up"], [class*="call"]'
      : '.button-down, [class*="down"], [class*="put"]';
    
    try {
      logger.info(`Placing ${direction} trade...`);
      
      if (settings.demo.enabled) {
        await this.page.click('.demo-banner button, button:contains("Demo")', { timeout: 3000 }).catch(() => {});
      }
      
      await this.page.click(buttonClass, { timeout: 5000 });
      
      logger.info(`${direction} trade placed successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to place ${direction} trade:`, error.message);
      return false;
    }
  }

  async waitForResult(timeout = 90000) {
    try {
      logger.info('Waiting for trade result...');
      
      const resultSelector = '[class*="result"], [class*="win"], [class*="lose"], [class*="profit"]';
      
      await this.page.waitForSelector(resultSelector, { timeout });
      
      const pageContent = await this.page.content();
      
      const isWin = pageContent.includes('win') || pageContent.includes('profit') || pageContent.includes('success');
      const result = isWin ? 'WIN' : 'LOSS';
      
      logger.info(`Trade result: ${result}`);
      return result;
    } catch (error) {
      logger.error('Failed to detect trade result:', error.message);
      return 'UNKNOWN';
    }
  }

  async getBalance() {
    try {
      const balanceElement = await this.page.$('[class*="balance"], [class*="amount"]');
      if (balanceElement) {
        const balanceText = await balanceElement.textContent();
        const balance = parseFloat(balanceText.replace(/[^0-9.]/g, ''));
        return balance;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get balance:', error.message);
      return null;
    }
  }
}

export default Trader;
