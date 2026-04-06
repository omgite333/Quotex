import puppeteer from 'puppeteer-core';
import { settings } from '../../config/settings.js';
import fs from 'fs';
import path from 'path';

export class Login {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async init() {
    console.log('🔍 Initializing browser...');
    
    let executablePath = process.env.CHROME_PATH;

    if (!executablePath || !fs.existsSync(executablePath)) {
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
      ];
      
      for (const p of possiblePaths) {
        if (p && fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }
    }

    if (!executablePath || !fs.existsSync(executablePath)) {
      console.error('❌ Chrome not found!');
      throw new Error('Chrome executable not found');
    }

    console.log(`✅ Found Chrome at: ${executablePath}`);

    this.browser = await puppeteer.launch({
      headless: false,
      executablePath,
      args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1400, height: 900 });
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await this.page.setUserAgent(userAgent);
    
    console.log('✅ Browser initialized successfully');
    return this;
  }

  async login() {
    try {
      console.log('🌐 Navigating to Quotex login page...');
      await this.page.goto(settings.quotex.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      console.log('⏳ Waiting for page to fully load...');
      await this.sleep(8000);
      
      console.log('🔍 Waiting for login form components...');
      
      // Wait for body to be ready
      await this.page.waitForSelector('body', { timeout: 10000 });
      await this.sleep(3000);
      
      // Wait for at least one input element to appear
      try {
        await this.page.waitForSelector('input', { timeout: 10000 });
        console.log('✅ Input elements found on page');
      } catch {
        console.log('⚠️  No input elements found yet');
      }
      
      await this.sleep(2000);
      
      console.log('🔍 Looking for login form...');
      
      // List all inputs for debugging
      const inputs = await this.page.$$('input');
      console.log(`📝 Found ${inputs.length} input elements`);
      
      // Try different email selector strategies
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="login"]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="mail" i]',
        'input[autocomplete="email"]',
        'input[class*="email" i]',
        'input:first-of-type'
      ];
      
      let emailInput = null;
      for (const sel of emailSelectors) {
        try {
          const el = await this.page.$(sel);
          if (el) {
            const visible = await el.isVisible();
            if (visible) {
              emailInput = el;
              console.log(`✅ Found email input: ${sel}`);
              break;
            }
          }
        } catch {}
      }
      
      if (!emailInput) {
        // Try any visible text input
        for (const input of inputs) {
          try {
            const type = await input.evaluate(el => el.type);
            const visible = await input.isVisible();
            if ((type === 'text' || type === 'email' || type === '') && visible) {
              emailInput = input;
              console.log(`✅ Found input: type=${type || 'text'}`);
              break;
            }
          } catch {}
        }
      }

      if (!emailInput) {
        console.log('❌ Email input not found. Taking screenshot...');
        await this.page.screenshot({ path: 'debug-login.png', fullPage: true });
        throw new Error('Email input not found on page');
      }
      
      // Focus the input
      await emailInput.click({ force: true });
      await this.sleep(500);
      
      console.log('✏️  Entering email...');
      await this.page.keyboard.type(settings.quotex.email, { delay: 100 });
      await this.sleep(1000);
      
      // Find password input
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id*="password" i]',
        'input[class*="password" i]'
      ];
      
      let passwordInput = null;
      for (const sel of passwordSelectors) {
        try {
          const el = await this.page.$(sel);
          if (el) {
            const visible = await el.isVisible();
            if (visible) {
              passwordInput = el;
              console.log('✅ Found password input');
              break;
            }
          }
        } catch {}
      }
      
      if (passwordInput) {
        await passwordInput.click({ force: true });
        await this.sleep(500);
        
        console.log('✏️  Entering password...');
        await this.page.keyboard.type(settings.quotex.password, { delay: 100 });
        await this.sleep(1000);
        
        // Try clicking submit button
        const submitSelectors = [
          'button[type="submit"]',
          'button[class*="submit" i]',
          'button[class*="login" i]',
          'button[class*="sign" i]',
          'button:has-text("Sign In")',
          'button:has-text("Log In")',
          'button:has-text("Login")',
          'button:has-text("Continue")',
          'button:has-text("Next")'
        ];
        
        for (const sel of submitSelectors) {
          try {
            const btn = await this.page.$(sel);
            if (btn) {
              const visible = await btn.isVisible();
              if (visible) {
                console.log(`🖱️  Clicking: ${sel}`);
                await btn.click({ force: true });
                await this.sleep(500);
                break;
              }
            }
          } catch {}
        }
      } else {
        // Try pressing Enter/Tab to move to password
        console.log('⌨️  Pressing Tab to move to password field...');
        await this.page.keyboard.press('Tab');
        await this.sleep(500);
        console.log('✏️  Entering password...');
        await this.page.keyboard.type(settings.quotex.password, { delay: 100 });
        await this.sleep(1000);
        
        // Press Enter to submit
        console.log('⌨️  Pressing Enter to login...');
        await this.page.keyboard.press('Enter');
      }
      
      console.log('⏳ Waiting for login to process...');
      await this.sleep(8000);
      
      const currentUrl = this.page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      // Check if we're still on login page
      if (currentUrl.includes('login') || currentUrl.includes('sign')) {
        console.log('⚠️  Still on login page, waiting more...');
        await this.sleep(5000);
        
        // Try clicking any visible submit button
        const anyButton = await this.page.$('button[type="submit"]');
        if (anyButton) {
          await anyButton.click({ force: true });
          await this.sleep(5000);
        }
      }
      
      const finalUrl = this.page.url();
      console.log(`🌐 Final URL: ${finalUrl}`);
      
      if (!finalUrl.includes('login') && !finalUrl.includes('sign')) {
        console.log('✅ Login successful!');
      } else {
        console.log('⚠️  May need manual login verification');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      await this.page.screenshot({ path: 'debug-login.png', fullPage: true }).catch(() => {});
      throw error;
    }
  }

  async selectDemoAccount() {
    try {
      console.log('🎮 Looking for demo account selector...');
      await this.sleep(3000);
      
      // Look for demo button or toggle
      const demoSelectors = [
        'text="Demo"',
        'text="DEMO"',
        'button:has-text("Demo")',
        '[class*="demo-btn"]',
        '[class*="demo-btn" i]',
        '[class*="balance-tab"]'
      ];
      
      for (const sel of demoSelectors) {
        try {
          const el = await this.page.$(sel);
          if (el) {
            const visible = await el.isVisible();
            if (visible) {
              await el.click({ force: true });
              console.log('✅ Demo account selected');
              await this.sleep(2000);
              return true;
            }
          }
        } catch {}
      }
      
      console.log('⚠️  Demo selector not found');
      return false;
    } catch (error) {
      console.log('⚠️  Demo selection skipped:', error.message);
      return false;
    }
  }

  async getPage() {
    return this.page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default Login;
