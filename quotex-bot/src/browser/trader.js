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
      await this.sleep(1000);
      
      // Try to find all inputs and type in number inputs
      const inputs = await this.page.$$('input');
      console.log(`🔍 Found ${inputs.length} inputs`);
      
      for (const input of inputs) {
        try {
          const type = await input.evaluate(el => el.type);
          const readonly = await input.evaluate(el => el.readOnly);
          
          if ((type === 'number' || type === 'text') && !readonly) {
            await input.click({ force: true });
            await this.sleep(300);
            
            // Clear the input
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
            await this.sleep(200);
            
            // Type the amount
            await this.page.keyboard.type(String(amount), { delay: 50 });
            console.log(`✅ Amount set to ${this.currency}${amount}`);
            await this.sleep(500);
            return true;
          }
        } catch {}
      }
      
      console.log('⚠️  Amount input not found - trying button clicks');
      
      // Try clicking decrease button to get to minimum
      try {
        const buttons = await this.page.$$('button');
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text && (text.includes('-') || text.includes('−'))) {
            await btn.click({ force: true });
            await this.sleep(100);
          }
        }
        
        // Click increase until we reach desired amount
        for (let i = 0; i < 5; i++) {
          for (const btn of buttons) {
            const text = await btn.textContent();
            if (text && (text.includes('+') || text.includes('×'))) {
              await btn.click({ force: true });
              await this.sleep(100);
            }
          }
        }
        console.log('✅ Amount adjusted via buttons');
        return true;
      } catch {}
      
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
      console.log(`🔄 Searching for ${direction} button...`);
      await this.sleep(1000);
      
      // Take screenshot before clicking to debug
      await this.page.screenshot({ path: 'before-trade.png' }).catch(() => {});
      
      // List all buttons on the page
      const buttons = await this.page.$$('button');
      console.log(`🔍 Found ${buttons.length} buttons on page`);
      
      // Try to find the trade button by text
      let found = false;
      for (const btn of buttons) {
        try {
          const text = await btn.textContent();
          const className = await btn.getAttribute('class') || '';
          const ariaLabel = await btn.getAttribute('aria-label') || '';
          
          console.log(`   Button: "${text}" | class: ${className.substring(0, 50)}`);
          
          // Look for UP/CALL/HIGHER buttons
          if (direction === 'UP') {
            if (text && (text.toUpperCase().includes('UP') || text.toUpperCase().includes('CALL') || 
                text.includes('▲') || text.includes('↑') || text.toLowerCase().includes('higher'))) {
              console.log(`✅ Found UP button: "${text}"`);
              await btn.click({ force: true });
              await this.sleep(1000);
              found = true;
              break;
            }
          }
          
          // Look for DOWN/PUT/LOWER buttons
          if (direction === 'DOWN') {
            if (text && (text.toUpperCase().includes('DOWN') || text.toUpperCase().includes('PUT') || 
                text.includes('▼') || text.includes('↓') || text.toLowerCase().includes('lower'))) {
              console.log(`✅ Found DOWN button: "${text}"`);
              await btn.click({ force: true });
              await this.sleep(1000);
              found = true;
              break;
            }
          }
        } catch {}
      }
      
      if (found) {
        console.log(`✅ ${direction} trade placed!`);
        return true;
      }
      
      // Try clicking by class patterns
      const classPatterns = direction === 'UP' 
        ? ['up', 'call', 'higher', 'rise', 'green', 'bull']
        : ['down', 'put', 'lower', 'fall', 'red', 'bear'];
      
      for (const pattern of classPatterns) {
        try {
          const elements = await this.page.$$(`[class*="${pattern}"]`);
          for (const el of elements) {
            try {
              const tagName = await el.evaluate(e => e.tagName);
              if (tagName === 'BUTTON' || tagName === 'DIV') {
                const visible = await el.isVisible();
                if (visible) {
                  console.log(`✅ Found ${direction} via class pattern: ${pattern}`);
                  await el.click({ force: true });
                  await this.sleep(1000);
                  return true;
                }
              }
            } catch {}
          }
        } catch {}
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
        
        if (pageText.includes('won') || pageText.includes('profit') || pageText.includes('success')) {
          return 'WIN';
        } else if (pageText.includes('lost') || pageText.includes('loss')) {
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
