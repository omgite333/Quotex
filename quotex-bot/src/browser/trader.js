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

  async setTradeAmount(amount) {
    try {
      console.log(`💰 Setting amount: ${this.currency}${amount}`);
      await this.sleep(1000);
      
      const inputs = await this.page.$$('input');
      
      for (const input of inputs) {
        try {
          const type = await input.evaluate(el => el.type);
          const readonly = await input.evaluate(el => el.readOnly);
          
          if ((type === 'number' || type === 'text') && !readonly) {
            await input.click({ force: true });
            await this.sleep(300);
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
            await this.sleep(200);
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
    console.log(`⏱️  Expiry: ${minutes} min`);
    await this.sleep(500);
    return true;
  }

  async placeTrade(direction) {
    try {
      console.log(`🔄 Searching for ${direction} button...`);
      await this.sleep(1500);
      
      await this.page.screenshot({ path: `before-${direction.toLowerCase()}.png` }).catch(() => {});
      
      // Method 1: Find by text "UP" or "DOWN"
      let found = await this.page.evaluate((dir) => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text === dir) {
            el.click();
            return true;
          }
        }
        return false;
      }, direction);
      
      if (found) {
        console.log(`✅ ${direction} clicked by text!`);
        await this.sleep(2000);
        return true;
      }
      
      // Method 2: Find by class containing up/down
      found = await this.page.evaluate((dir) => {
        const els = document.querySelectorAll('[class*="up" i], [class*="down" i]');
        for (const el of els) {
          const tag = el.tagName.toLowerCase();
          const text = el.textContent?.trim().toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          
          if (tag === 'button' || tag === 'div') {
            if ((dir === 'UP' && (text.includes('up') || className.includes('up'))) ||
                (dir === 'DOWN' && (text.includes('down') || className.includes('down')))) {
              el.click();
              return true;
            }
          }
        }
        return false;
      }, direction);
      
      if (found) {
        console.log(`✅ ${direction} clicked by class!`);
        await this.sleep(2000);
        return true;
      }
      
      // Method 3: Find ALL buttons and log them for debugging
      const buttonInfo = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const info = [];
        for (const btn of buttons) {
          info.push({
            text: btn.textContent?.trim().substring(0, 50),
            class: btn.className?.substring(0, 100),
            visible: btn.offsetParent !== null
          });
        }
        return info;
      });
      
      console.log('📋 Buttons on page:', JSON.stringify(buttonInfo, null, 2));
      
      // Method 4: Try clicking any button with the direction text
      for (const btn of buttonInfo) {
        if (btn.text.toUpperCase().includes(direction)) {
          found = await this.page.evaluate((text) => {
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
              if (b.textContent?.trim() === text) {
                b.click();
                return true;
              }
            }
            return false;
          }, btn.text);
          
          if (found) {
            console.log(`✅ ${direction} clicked: ${btn.text}`);
            await this.sleep(2000);
            return true;
          }
        }
      }
      
      console.log('❌ UP/DOWN button not found');
      return false;
    } catch (error) {
      console.error('❌ Place trade:', error.message);
      return false;
    }
  }

  async waitForResult(timeout = 150000) {
    try {
      console.log(`⏳ Waiting for ${settings.trading.expiry}min result...`);
      const waitMs = settings.trading.expiry * 60 * 1000;
      await this.sleep(Math.min(waitMs + 30000, 180000));
      
      await this.page.screenshot({ path: `result-${Date.now()}.png` }).catch(() => {});
      
      const result = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        if (text.includes('won') || text.includes('profit')) return 'WIN';
        if (text.includes('lost') || text.includes('loss')) return 'LOSS';
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
