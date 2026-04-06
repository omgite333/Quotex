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
      console.log('Please either:');
      console.log('1. Install Chrome browser');
      console.log('2. Set CHROME_PATH in .env file');
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
      await this.page.goto(settings.quotex.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      await this.sleep(3000);
      
      console.log('🔍 Looking for login form...');
      
      const selectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="mail" i]'
      ];
      
      let emailInput = null;
      for (const sel of selectors) {
        emailInput = await this.page.$(sel);
        if (emailInput) {
          console.log(`✅ Found email input: ${sel}`);
          break;
        }
      }

      if (!emailInput) {
        console.log('⚠️  Email input not found. Taking screenshot...');
        await this.page.screenshot({ path: 'debug-login.png', fullPage: true });
        throw new Error('Email input not found on page');
      }
      
      console.log('✏️  Entering email...');
      await emailInput.type(settings.quotex.email, { delay: 100 });
      await this.sleep(500);
      
      const passwordInput = await this.page.$('input[type="password"]');
      if (passwordInput) {
        console.log('✏️  Entering password...');
        await passwordInput.type(settings.quotex.password, { delay: 100 });
        await this.sleep(500);
        
        const submitBtn = await this.page.$('button[type="submit"]');
        if (submitBtn) {
          console.log('🖱️  Clicking submit button...');
          await submitBtn.click();
        }
      }
      
      console.log('⏳ Waiting for login...');
      await this.sleep(5000);
      
      console.log('✅ Login completed');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      try {
        await this.page.screenshot({ path: 'debug-error.png', fullPage: true });
      } catch {}
      throw error;
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
