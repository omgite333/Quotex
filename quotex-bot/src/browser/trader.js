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
      
      // Click on asset selector button
      const assetButtonSelectors = [
        '[class*="asset-btn"]',
        '[class*="symbol"]',
        '[class*="pair"]',
        'button[class*="asset"]',
        '[role="button"][class*="asset"]'
      ];
      
      for (const sel of assetButtonSelectors) {
        try {
          const btn = await this.page.$(sel);
          if (btn) {
            await btn.click();
            console.log(`✅ Clicked asset button: ${sel}`);
            break;
          }
        } catch {}
      }
      
      await this.sleep(1000);
      
      // Search for the asset if search input exists
      const searchInput = await this.page.$('input[placeholder*="search" i], input[placeholder*="Currency" i]');
      if (searchInput) {
        await searchInput.type(asset, { delay: 50 });
        await this.sleep(500);
      }
      
      // Click on the asset in the list
      const assetItemSelectors = [
        `text="${asset}"`,
        `[class*="asset-item"]:has-text("${asset}")`,
        `[class*="currency"]:has-text("${asset}")`
      ];
      
      for (const sel of assetItemSelectors) {
        try {
          await this.page.waitForSelector(sel, { timeout: 3000 });
          await this.page.click(sel);
          console.log(`✅ Selected ${asset}`);
          await this.sleep(1000);
          return true;
        } catch {}
      }
      
      console.log(`⚠️  Asset ${asset} selector not found`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to select asset:`, error.message);
      return false;
    }
  }

  async setTradeAmount(amount) {
    try {
      console.log(`💰 Setting trade amount: $${amount}`);
      
      // Find amount input
      const amountInputSelectors = [
        'input[class*="amount"]',
        'input[class*="sum"]',
        'input[class*="value"]',
        'input[placeholder*="amount" i]',
        'input[placeholder*="sum" i]'
      ];
      
      for (const sel of amountInputSelectors) {
        const input = await this.page.$(sel);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(String(amount), { delay: 50 });
          console.log(`✅ Amount set to $${amount}`);
          await this.sleep(500);
          return true;
        }
      }
      
      // Try clicking +/- buttons
      const decreaseBtn = await this.page.$('button:has-text("-"), [class*="decrease"]');
      const increaseBtn = await this.page.$('button:has-text("+"), [class*="increase"]');
      
      if (decreaseBtn) {
        // Clear by clicking decrease multiple times
        for (let i = 0; i < 10; i++) {
          await decreaseBtn.click();
          await this.sleep(100);
        }
      }
      
      if (increaseBtn) {
        await increaseBtn.click();
        console.log(`✅ Amount adjusted using +/- buttons`);
        await this.sleep(500);
        return true;
      }
      
      console.log('⚠️  Amount input not found');
      return false;
    } catch (error) {
      console.error('❌ Failed to set amount:', error.message);
      return false;
    }
  }

  async setExpiry(minutes) {
    try {
      console.log(`⏱️  Setting expiry: ${minutes} minute(s)`);
      
      const expirySelectors = [
        `text="${minutes} min"`,
        `text="${minutes}m"`,
        `[class*="expiry"]:has-text("${minutes}")`,
        `button:has-text("${minutes} min")`
      ];
      
      for (const sel of expirySelectors) {
        try {
          await this.page.waitForSelector(sel, { timeout: 2000 });
          await this.page.click(sel);
          console.log(`✅ Expiry set to ${minutes} min`);
          await this.sleep(500);
          return true;
        } catch {}
      }
      
      console.log('⚠️  Expiry selector not found, using default');
      return false;
    } catch (error) {
      console.log('⚠️  Expiry setting skipped:', error.message);
      return false;
    }
  }

  async placeTrade(direction) {
    try {
      console.log(`🔄 Placing ${direction} trade...`);
      
      await this.sleep(1000);
      
      // Find UP/DOWN buttons
      const upSelectors = [
        '[class*="up"]:not([class*="down"])',
        '[class*="call"]',
        '[class*="rise"]',
        'button:has-text("UP")',
        'button:has-text("▲")',
        'button:has-text("Up")'
      ];
      
      const downSelectors = [
        '[class*="down"]',
        '[class*="put"]',
        '[class*="fall"]',
        'button:has-text("DOWN")',
        'button:has-text("▼")',
        'button:has-text("Down")'
      ];
      
      const selectors = direction === 'UP' ? upSelectors : downSelectors;
      
      for (const sel of selectors) {
        try {
          const btn = await this.page.waitForSelector(sel, { timeout: 3000 });
          await btn.click();
          console.log(`✅ ${direction} trade placed!`);
          await this.sleep(1000);
          return true;
        } catch {}
      }
      
      console.log(`❌ ${direction} button not found`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to place trade:`, error.message);
      return false;
    }
  }

  async waitForResult(timeout = 150000) {
    try {
      console.log('⏳ Waiting for trade result...');
      
      const startTime = Date.now();
      const expiryMs = settings.trading.expiry * 60 * 1000;
      const waitTime = Math.min(timeout, expiryMs + 30000);
      
      await this.sleep(waitTime);
      
      // Check for result
      const resultSelectors = [
        '[class*="result"]',
        '[class*="win" i]',
        '[class*="lose" i]',
        '[class*="profit" i]',
        '[class*="payout" i]'
      ];
      
      for (const sel of resultSelectors) {
        try {
          await this.page.waitForSelector(sel, { timeout: 5000 });
          const resultEl = await this.page.$(sel);
          if (resultEl) {
            const text = await resultEl.textContent();
            console.log(`📊 Result element found: ${text}`);
          }
        } catch {}
      }
      
      // Take screenshot to verify
      await this.page.screenshot({ path: `trade-result-${Date.now()}.png`, fullPage: false });
      
      // Check page content for win/loss
      const content = await this.page.content();
      
      if (content.includes('win') || content.includes('profit') || content.includes('success')) {
        console.log('✅ Result: WIN');
        return 'WIN';
      } else if (content.includes('lose') || content.includes('loss')) {
        console.log('❌ Result: LOSS');
        return 'LOSS';
      }
      
      console.log('⚠️  Result: UNKNOWN (timeout or no result detected)');
      return 'UNKNOWN';
    } catch (error) {
      console.error('❌ Error waiting for result:', error.message);
      return 'UNKNOWN';
    }
  }

  async getBalance() {
    try {
      const balanceSelectors = [
        '[class*="balance-value"]',
        '[class*="balance"] span',
        '[class*="amount"]:not([class*="trade"])',
        'span[class*="balance"]'
      ];
      
      for (const sel of balanceSelectors) {
        const el = await this.page.$(sel);
        if (el) {
          const text = await el.textContent();
          const balance = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (!isNaN(balance)) {
            console.log(`💰 Balance: $${balance}`);
            return balance;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default Trader;
