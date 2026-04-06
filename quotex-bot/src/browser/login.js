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
      
      await this.sleep(2000);
      
      console.log('🔍 Looking for login form...');
      
      // Find and fill email
      const emailInput = await this.page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(settings.quotex.email, { delay: 50 });
      console.log('✅ Email entered');
      
      await this.sleep(500);
      
      // Find and fill password
      const passwordInput = await this.page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(settings.quotex.password, { delay: 50 });
        console.log('✅ Password entered');
      }
      
      await this.sleep(500);
      
      // Click submit button
      const submitBtn = await this.page.$('button[type="submit"]');
      if (submitBtn) {
        console.log('🖱️  Clicking login button...');
        await submitBtn.click();
      } else {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
      }
      
      console.log('⏳ Waiting for login to complete...');
      await this.sleep(5000);
      
      // Check if we're on the login page still
      const currentUrl = this.page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      // Wait for dashboard elements
      try {
        await this.page.waitForSelector('[class*="chart"], [class*="trade"], [class*="asset"]', { timeout: 10000 });
        console.log('✅ Login successful - Dashboard loaded');
      } catch {
        console.log('⚠️  May not be logged in yet, continuing anyway...');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      await this.page.screenshot({ path: 'debug-login.png', fullPage: true });
      console.log('📸 Screenshot saved as debug-login.png');
      throw error;
    }
  }

  async selectDemoAccount() {
    try {
      console.log('🎮 Looking for demo account...');
      
      // Look for demo toggle or button
      const demoSelectors = [
        'button:has-text("Demo")',
        '[class*="demo"]',
        '[class*="balance"] button',
        'text="Demo"'
      ];
      
      for (const sel of demoSelectors) {
        try {
          await this.page.waitForSelector(sel, { timeout: 3000 });
          await this.page.click(sel);
          console.log('✅ Demo account selected');
          await this.sleep(1000);
          return true;
        } catch {}
      }
      
      console.log('⚠️  Demo selector not found, may already be on demo');
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
