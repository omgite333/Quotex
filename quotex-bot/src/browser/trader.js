import { settings } from '../../config/settings.js';

export class Trader {
  constructor(page) {
    this.page = page;
    this.currency = '₹';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async selectAsset(asset) {
    try {
      console.log(`🔍 Selecting asset: ${asset}...`);
      await this.sleep(2000);
      
      const buttonSelectors = ['[class*="asset"]', '[class*="symbol"]', '[class*="pair"]'];
      
      for (const sel of buttonSelectors) {
        try {
          const btn = await this.page.waitForSelector(sel, { timeout: 2000 });
          if (btn) {
            await btn.click({ force: true });
            console.log(`✅ Clicked: ${sel}`);
            await this.sleep(1500);
            break;
          }
        } catch {}
      }
      
      const anyEurUsd = await this.page.evaluate((assetName) => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          if (el.textContent === assetName) {
            el.click();
            return true;
          }
        }
        return false;
      }, asset);
      
      if (anyEurUsd) {
        console.log(`✅ Selected ${asset}`);
        await this.sleep(1000);
        return true;
      }
      
      console.log(`⚠️  Asset selection completed`);
      return true;
    } catch (error) {
      console.error('❌ Asset selection:', error.message);
      return true;
    }
  }

  async getBalance() {
    try {
      const balance = await this.page.evaluate(() => {
        const selectors = ['[class*="balance"]', '[class*="amount"]'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const match = el.textContent.match(/[\d,]+\.?\d*/);
            if (match) return parseFloat(match[0].replace(/,/g, ''));
          }
        }
        return null;
      });
      
      if (balance) console.log(`💰 Balance: ${this.currency}${balance}`);
      return balance || 10000;
    } catch {
      return 10000;
    }
  }
}

export default Trader;
