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
      await this.page.waitForSelector('body', { timeout: 10000 });
      await this.sleep(3000);
      
      try {
        await this.page.waitForSelector('input', { timeout: 10000 });
        console.log('✅ Input elements found on page');
      } catch {
        console.log('⚠️  No input elements found yet');
      }
      
      await this.sleep(2000);
      
      console.log('🔍 Looking for login form...');
      const inputs = await this.page.$$('input');
      console.log(`📝 Found ${inputs.length} input elements`);
      
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="login"]',
        'input[placeholder*="email" i]',
        'input[autocomplete="email"]'
      ];
      
      let emailInput = null;
      for (const sel of emailSelectors) {
        try {
          const el = await this.page.$(sel);
          if (el && await el.isVisible()) {
            emailInput = el;
            console.log(`✅ Found email input: ${sel}`);
            break;
          }
        } catch {}
      }
      
      if (!emailInput) {
        for (const input of inputs) {
          try {
            const type = await input.evaluate(el => el.type);
            if ((type === 'text' || type === 'email') && await input.isVisible()) {
              emailInput = input;
              console.log(`✅ Found input: type=${type}`);
              break;
            }
          } catch {}
        }
      }

      if (!emailInput) {
        console.log('❌ Email input not found');
        await this.page.screenshot({ path: 'debug-login.png', fullPage: true });
        throw new Error('Email input not found');
      }
      
      await emailInput.click({ force: true });
      await this.sleep(500);
      
      console.log('✏️  Entering email...');
      await this.page.keyboard.type(settings.quotex.email, { delay: 100 });
      await this.sleep(1000);
      
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]'];
      
      let passwordInput = null;
      for (const sel of passwordSelectors) {
        try {
          const el = await this.page.$(sel);
          if (el && await el.isVisible()) {
            passwordInput = el;
            console.log('✅ Found password input');
            break;
          }
        } catch {}
      }
      
      if (passwordInput) {
        await passwordInput.click({ force: true });
        await this.sleep(500);
        console.log('✏️  Entering password...');
        await this.page.keyboard.type(settings.quotex.password, { delay: 100 });
        await this.sleep(1000);
        
        const submitSelectors = ['button[type="submit"]', 'button[class*="submit" i]', 'button[class*="login" i]'];
        for (const sel of submitSelectors) {
          try {
            const btn = await this.page.$(sel);
            if (btn && await btn.isVisible()) {
              console.log(`🖱️  Clicking: ${sel}`);
              await btn.click({ force: true });
              await this.sleep(500);
              break;
            }
          } catch {}
        }
      } else {
        await this.page.keyboard.press('Tab');
        await this.sleep(500);
        await this.page.keyboard.type(settings.quotex.password, { delay: 100 });
        await this.sleep(1000);
        await this.page.keyboard.press('Enter');
      }
      
      console.log('⏳ Waiting for login...');
      await this.sleep(8000);
      
      const currentUrl = this.page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('login') || currentUrl.includes('sign')) {
        console.log('⚠️  Still on login page...');
        await this.sleep(5000);
        const btn = await this.page.$('button[type="submit"]');
        if (btn) await btn.click({ force: true });
        await this.sleep(5000);
      }
      
      console.log('✅ Login successful!');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      await this.page.screenshot({ path: 'debug-login.png', fullPage: true }).catch(() => {});
      throw error;
    }
  }

  async selectDemoAccount() {
    try {
      console.log('🎮 Looking for demo account...');
      await this.sleep(3000);
      
      // Try to find and click demo toggle
      const demoPatterns = [
        '[class*="demo"]',
        '[class*="balance"]',
        '[class*="tab"]',
        '[class*="switch"]',
        '[role="button"]'
      ];
      
      for (const pattern of demoPatterns) {
        try {
          const elements = await this.page.$$(pattern);
          for (const el of elements) {
            const text = await el.textContent().catch(() => '');
            const className = await el.getAttribute('class').catch(() => '');
            
            if (text.toLowerCase().includes('demo') || className.toLowerCase().includes('demo')) {
              console.log(`✅ Found demo element: ${className}`);
              await el.click({ force: true });
              await this.sleep(2000);
              console.log('✅ Demo account selected');
              return true;
            }
          }
        } catch {}
      }
      
      // Try clicking on balance area
      try {
        const balanceArea = await this.page.$('[class*="balance"]');
        if (balanceArea) {
          await balanceArea.click({ force: true });
          await this.sleep(1000);
          
          // Look for demo option in dropdown
          const demoOption = await this.page.evaluate(() => {
            const items = document.querySelectorAll('*, [class*="item"], [class*="option"], [class*="row"]');
            for (const item of items) {
              if (item.textContent && item.textContent.toLowerCase().includes('demo')) {
                item.click();
                return true;
              }
            }
            return false;
          });
          
          if (demoOption) {
            console.log('✅ Demo selected via JS');
            await this.sleep(2000);
            return true;
          }
        }
      } catch (e) {
        console.log('⚠️  Balance click failed:', e.message);
      }
      
      console.log('⚠️  Demo not found - may already be on demo');
      return false;
    } catch (error) {
      console.log('⚠️  Demo selection:', error.message);
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
