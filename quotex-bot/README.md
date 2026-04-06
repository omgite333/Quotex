# AI-Powered Quotex Trading Bot

## Setup

```bash
cd quotex-bot
npm install
cp .env.example .env
```

Edit `.env`:
```
QUOTEX_EMAIL=your_email
QUOTEX_PASSWORD=your_password
ANTHROPIC_API_KEY=your_anthropic_key
```

## Run

```bash
npm start
```

## Files

```
quotex-bot/
├── src/
│   ├── browser/
│   │   ├── login.js      # Puppeteer login
│   │   ├── trader.js     # Trade execution
│   │   └── session.js     # Keep alive
│   ├── data/
│   │   ├── collector.js  # Price data scraper
│   │   └── history.js    # Trade history DB
│   ├── ai/
│   │   ├── signal.js     # Claude API signals
│   │   ├── indicators.js # RSI, EMA, MACD, BB
│   │   └── validator.js  # Signal validation
│   ├── risk/
│   │   └── manager.js    # Risk management
│   └── index.js          # Main entry
├── config/settings.js
└── .env
```

## Testing Phases

1. **Week 1**: Observation mode - bot logs signals, you trade manually
2. **Week 2**: Paper trading - bot places demo trades automatically
3. **Week 3**: Optimize based on results
4. **Week 4**: Decision on real trading

## ⚠️ Disclaimer

Use demo account only. Real-money automated trading carries significant financial risk.
