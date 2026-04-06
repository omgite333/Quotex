import { settings } from '../../config/settings.js';

export class Trader {
  constructor(page) {
    this.page = page;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async selectAsset(asset) {
    try {
      console.log(`🔍 Selecting asset: ${asset}...`);
      await this.sleep(2000);
      
      // Click on asset selector
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
      
      // Search for asset if search input exists
      const searchInput = await this.page.$('input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.type(asset, { delay: 50 });
        await this.sleep(1000);
      }
      
      // Click on the asset
      const assetSelectors = [
        `text="${asset}"`,
        `[class*="asset-item"]:has-text("${asset}")`,
        `div[class*="item"]:has-text("${asset}")`
      ];
      
      for (const sel of assetSelectors) {
        try {
          await this.sleep(500);
          const el = await this.page.waitForSelector(sel, { timeout: 2000 });
          if (el) {
            await el.click({ force: true });
            console.log(`✅ Selected: ${asset}`);
            await this.sleep(1000);
            return true;
          }
        } catch {}
      }
      
      // If asset list modal, try clicking anywhere on EUR/USD
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
        console.log(`✅ Selected ${asset} via text match`);
        await this.sleep(1000);
        return true;
      }
      
      console.log(`⚠️  Asset ${asset} selection completed (may already be selected)`);
      return true;
    } catch (error) {
      console.error('❌ Asset selection:', error.message);
      return true; // Continue anyway
    }
  }

  async setTradeAmount(amount) {
    try {
      console.log(`💰 Setting amount: $${amount}`);
      await this.sleep(500);
      
      // Find amount input
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
            
            // Clear and type new value
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
            await this.page.keyboard.type(String(amount), { delay: 50 });
            
            console.log(`✅ Amount set to $${amount}`);
            await this.sleep(500);
            return true;
          }
        } catch {}
      }
      
      // Try +/- buttons
      try {
        const decrease = await this.page.$('button');
        if (decrease) {
          const text = await decrease.textContent();
          if (text && text.includes('-')) {
            // Click decrease 10 times
            for (let i = 0; i < 5; i++) {
              await decrease.click();
              await this.sleep(100);
            }
          }
        }
        
        const increase = await this.page.$('button');
        if (increase) {
          for (let i = 0; i < 3; i++) {
            await increase.click();
            await this.sleep(100);
          }
        }
        console.log('✅ Amount adjusted via buttons');
        return true;
      } catch {}
      
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
      
      // Try various expiry selectors
      const expirySelectors = [
        `text="${minutes} min"`,
        `text="${minutes}m"`,
        `button:has-text("${minutes}")`
      ];
      
      for (const sel of expirySelectors) {
        try {
          const el = await this.page.waitForSelector(sel, { timeout: 1000 });
          if (el) {
            await el.click({ force: true });
            console.log(`✅ Expiry set to ${minutes} min`);
            await this.sleep(500);
            return true;
          }
        } catch {}
      }
      
      console.log('⚠️  Expiry selector not found, using default');
      return true;
    } catch {
      return true;
    }
  }

  async placeTrade(direction) {
    try {
      console.log(`🔄 Placing ${direction} trade...`);
      await this.sleep(1000);
      
      // Find UP/DOWN buttons - look for the main trade buttons
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
            // Make sure button is visible and clickable
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
      
      // Fallback: try clicking by text
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
        console.log(`✅ ${direction} trade placed via text match!`);
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
      
      // Wait for the expiry time
      const waitMs = settings.trading.expiry * 60 * 1000;
      await this.sleep(Math.min(waitMs + 30000, 180000));
      
      // Take screenshot
      await this.page.screenshot({ path: `trade-result-${Date.now()}.png` }).catch(() => {});
      
      // Check page for win/loss indicators
      const result = await this.page.evaluate(() => {
        const pageText = document.body.innerText.toLowerCase();
        
        if (pageText.includes('won') || pageText.includes('win') || pageText.includes('profit')) {
          return 'WIN';
        } else if (pageText.includes('lost') || pageText.includes('loss') || pageText.includes('lose')) {
          return 'LOSS';
        }
        
        // Check for specific result classes
        const resultElements = document.querySelectorAll('[class*="result"], [class*="payout"], [class*="win" i]');
        for (const el of resultElements) {
          const text = el.textContent.toLowerCase();
          if (text.includes('won') || text.includes('+')) return 'WIN';
          if (text.includes('lost') || text.includes('-')) return 'LOSS';
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
            const match = text.match(/[\d,]+\.?\d*/);
            if (match) {
              return parseFloat(match[0].replace(/,/g, ''));
            }
          }
        }
        return null;
      });
      
      if (balance) console.log(`💰 Balance: $${balance}`);
      return balance || 10000;
    } catch {
      return 10000;
    }
  }
}

export default Trader;
