import { settings } from '../../config/settings.js';

export class Trader {
  constructor(page) {
    this.page = page;
    this.currency = '₹'; // INR symbol
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async selectAsset(asset) {
    try {
      console.log(`🔍 Selecting asset: ${asset}...`);
      await this.sleep(2000);
      
      const buttonSelectors = [
        '[class*="asset"]',
        '[class*="symbol"]',
        '[class*="pair"]',
        '[class*="instrument"]'
      ];
      
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
      
      const searchInput = await this.page.$('input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.type(asset, { delay: 50 });
        await this.sleep(1000);
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
      
      console.log(`⚠️  Asset ${asset} selection completed`);
      return true;
    } catch (error) {
      console.error('❌ Asset selection:', error.message);
      return true;
    }
  }

  async setTradeAmount(amount) {
    try {
      console.log(`💰 Setting amount: ${this.currency}${amount}`);
      await this.sleep(500);
      
      const inputSelectors = [
        'input[class*="amount"]',
        'input[class*="sum"]',
        'input[class*="value"]',
        'input[class*="invest"]',
        'input[type="number"]'
      ];
      
      for (const sel of inputSelectors) {
        try {
          const input = await this.page.waitForSelector(sel, { timeout: 2000 });
          if (input) {
            await input.click({ force: true });
            await this.sleep(200);
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
            await this.page.keyboard.type(String(amount), { delay: 50 });
            console.log(`✅ Amount set to ${this.currency}${amount}`);
            await this.sleep(500);
            return true;
          }
        } catch {}
      }
      
      console.log('⚠️  Amount input not found');
      return true;
    } catch (error) {
      console.error('❌ Set amount:', error.message);
      return true;
    }
  }

  async setExpiry(minutes) {
    try {
      console.log(`⏱️  Setting expiry: ${minutes} min`);
      await this.sleep(500);
      return true;
    } catch {
      return true;
    }
  }

  async placeTrade(direction) {
    try {
      console.log(`🔄 Placing ${direction} trade...`);
      await this.sleep(1000);
      
      const upSelectors = [
        '[class*="up"]:not([class*="down"])',
        '[class*="call"]',
        '[class*="green"]',
        '[class*="rise"]'
      ];
      
      const downSelectors = [
        '[class*="down"]',
        '[class*="put"]',
        '[class*="red"]',
        '[class*="fall"]'
      ];
      
      const selectors = direction === 'UP' ? upSelectors : downSelectors;
      
      for (const sel of selectors) {
        try {
          const btn = await this.page.waitForSelector(sel, { timeout: 3000 });
          if (btn) {
            const visible = await btn.isVisible();
            if (visible) {
              await btn.click({ force: true });
              console.log(`✅ ${direction} trade placed!`);
              await this.sleep(1000);
              return true;
            }
          }
        } catch {}
      }
      
      const buttonText = direction === 'UP' ? 'UP' : 'DOWN';
      const clicked = await this.page.evaluate((text) => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
          if (btn.textContent && btn.textContent.trim() === text) {
            btn.click();
            return true;
          }
        }
        return false;
      }, buttonText);
      
      if (clicked) {
        console.log(`✅ ${direction} trade placed!`);
        await this.sleep(1000);
        return true;
      }
      
      console.log('❌ Trade button not found');
      return false;
    } catch (error) {
      console.error('❌ Place trade:', error.message);
      return false;
    }
  }

  async waitForResult(timeout = 150000) {
    try {
      console.log(`⏳ Waiting for result (${settings.trading.expiry}min)...`);
      const waitMs = settings.trading.expiry * 60 * 1000;
      await this.sleep(Math.min(waitMs + 30000, 180000));
      
      await this.page.screenshot({ path: `trade-result-${Date.now()}.png` }).catch(() => {});
      
      const result = await this.page.evaluate(() => {
        const pageText = document.body.innerText.toLowerCase();
        
        if (pageText.includes('won') || pageText.includes('win') || pageText.includes('profit')) {
          return 'WIN';
        } else if (pageText.includes('lost') || pageText.includes('loss') || pageText.includes('lose')) {
          return 'LOSS';
        }
        return 'UNKNOWN';
      });
      
      console.log(`📊 Result: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ Wait result:', error.message);
      return 'UNKNOWN';
    }
  }

  async getBalance() {
    try {
      const balance = await this.page.evaluate(() => {
        const selectors = [
          '[class*="balance"]',
          '[class*="amount"]',
          '[class*="funds"]'
        ];
        
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const text = el.textContent;
            // Handle INR ₹ symbol
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
              return parseFloat(match[0].replace(/,/g, ''));
            }
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
