import puppeteer from 'puppeteer-core';
import { settings } from '../../config/settings.js';
import logger from '../logs/logger.js';

export class Login {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    logger.info('Initializing browser...');
    
    const executablePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ];

    let executablePath = executablePaths.find(p => {
      try {
        require('fs').accessSync(p);
        return true;
      } catch { return false; }
    });

    if (!executablePath) {
      logger.error('Chrome not found. Please install Chrome or set CHROME_PATH');
      throw new Error('Chrome executable not found');
    }

    logger.info(`Using Chrome at: ${executablePath}`);

    this.browser = await puppeteer.launch({
      headless: false,
      executablePath,
      args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1400, height: 900 });
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await this.page.setUserAgent(userAgent);
    
    logger.info('Browser initialized');
    return this;
  }

  async login() {
    try {
      logger.info('Navigating to Quotex login page...');
      await this.page.goto(settings.quotex.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      await this.page.waitForTimeout(2000);
      
      const emailSelector = await this.page.$('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="mail" i]');
      const passwordSelector = await this.page.$('input[type="password"], input[name="password"]');
      
      if (emailSelector && passwordSelector) {
        logger.info('Found login form, entering credentials...');
        await emailSelector.type(settings.quotex.email, { delay: 50 });
        await this.page.waitForTimeout(500);
        await passwordSelector.type(settings.quotex.password, { delay: 50 });
        await this.page.waitForTimeout(500);
        
        const submitBtn = await this.page.$('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")');
        if (submitBtn) {
          await submitBtn.click();
        }
        
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        logger.info('Login submitted!');
      } else {
        logger.warn('Login form not found - page may have changed');
        await this.page.screenshot({ path: 'debug-login.png' });
      }
      
      return true;
    } catch (error) {
      logger.error('Login failed:', error.message);
      await this.page.screenshot({ path: 'debug-error.png' }).catch(() => {});
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

export default new Login();
