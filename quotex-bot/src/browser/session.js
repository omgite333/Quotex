import logger from '../logs/logger.js';

export class Session {
  constructor(page) {
    this.page = page;
    this.isActive = true;
  }

  async keepAlive() {
    setInterval(async () => {
      if (!this.isActive) return;
      
      try {
        await this.page.reload({ waitUntil: 'networkidle0' });
        logger.debug('Session kept alive');
      } catch (error) {
        logger.error('Session refresh failed:', error.message);
        this.isActive = false;
      }
    }, 300000);
  }

  async checkConnection() {
    try {
      await this.page.goto('https:// quotex.com/api/ping', { timeout: 5000 });
      return true;
    } catch {
      return await this.page.evaluate(() => navigator.onLine);
    }
  }

  stop() {
    this.isActive = false;
  }
}

export default Session;
