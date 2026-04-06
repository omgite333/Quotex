import dotenv from 'dotenv';
dotenv.config();

export const settings = {
  quotex: {
    email: process.env.QUOTEX_EMAIL || '',
    password: process.env.QUOTEX_PASSWORD || '',
    url: 'https://quotex.com/en/login'
  },
  trading: {
    amount: parseFloat(process.env.TRADE_AMOUNT) || 1,
    expiry: parseInt(process.env.TRADE_EXPIRY) || 2,
    interval: parseInt(process.env.INTERVAL) || 2,
    minConfidence: parseInt(process.env.MIN_CONFIDENCE) || 55,
    maxTradesPerHour: parseInt(process.env.MAX_TRADES_PER_HOUR) || 5,
    maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES) || 3,
    dailyLossLimit: parseFloat(process.env.DAILY_LOSS_LIMIT) || 10,
    defaultAsset: process.env.DEFAULT_ASSET || 'EUR/USD'
  },
  ai: {
    provider: 'local',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.AI_MODEL || 'llama3.2',
    groqApiKey: process.env.GROQ_API_KEY || ''
  },
  demo: {
    enabled: true
  }
};
