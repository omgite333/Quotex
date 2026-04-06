import puppeteer from 'puppeteer';
import { settings } from '../../config/settings.js';
import logger from '../logs/logger.js';

export class Login {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    logger.info('Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await this.page.setUserAgent(userAgent);
    
    return this;
  }

  async login() {
    try {
      logger.info('Navigating to Quotex login page...');
      await this.page.goto(settings.quotex.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      
      logger.info('Entering credentials...');
      await this.page.type('input[type="email"], input[name="email"]', settings.quotex.email, { delay: 50 });
      await this.page.type('input[type="password"], input[name="password"]', settings.quotex.password, { delay: 50 });
      
      await this.page.click('button[type="submit"], button:contains("Sign in")');
      
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      logger.info('Login successful!');
      return true;
    } catch (error) {
      logger.error('Login failed:', error.message);
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
