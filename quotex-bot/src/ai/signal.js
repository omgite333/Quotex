import { settings } from '../../config/settings.js';
import logger from '../logs/logger.js';
import { calculateIndicators } from './indicators.js';

export async function generateSignal(candles) {
  if (!candles || candles.length < 20) {
    logger.warn('Insufficient candle data for signal generation');
    return null;
  }

  const indicators = calculateIndicators(candles);
  const currentCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  if (settings.ai.provider === 'ollama') {
    return await generateOllamaSignal(candles, indicators, currentCandle);
  } else if (settings.ai.provider === 'groq') {
    return await generateGroqSignal(candles, indicators, currentCandle);
  } else {
    return generateLocalSignal(indicators, currentCandle);
  }
}

async function generateOllamaSignal(candles, indicators, currentCandle) {
  const prompt = buildPrompt(candles, indicators);

  try {
    const response = await fetch(`${settings.ai.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ai.model || 'llama3.2',
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    const data = await response.json();
    return parseSignalResponse(data.response);
  } catch (error) {
    logger.error('Ollama error:', error.message);
    return generateLocalSignal(indicators, currentCandle);
  }
}

async function generateGroqSignal(candles, indicators, currentCandle) {
  const prompt = buildPrompt(candles, indicators);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.ai.groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    return parseSignalResponse(data.choices?.[0]?.message?.content);
  } catch (error) {
    logger.error('Groq error:', error.message);
    return generateLocalSignal(indicators, currentCandle);
  }
}

function generateLocalSignal(indicators, currentCandle) {
  let direction = 'HOLD';
  let confidence = 50;
  let reasons = [];

  if (indicators.rsi) {
    if (indicators.rsi < 30) {
      direction = 'UP';
      confidence += 20;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > 70) {
      direction = 'DOWN';
      confidence += 20;
      reasons.push('RSI overbought');
    }
  }

  if (indicators.ema9 && indicators.ema21) {
    if (indicators.ema9 > indicators.ema21) {
      if (direction === 'DOWN') {
        confidence -= 10;
      } else {
        direction = 'UP';
        confidence += 15;
      }
      reasons.push('EMA bullish crossover');
    } else {
      if (direction === 'UP') {
        confidence -= 10;
      } else {
        direction = 'DOWN';
        confidence += 15;
      }
      reasons.push('EMA bearish crossover');
    }
  }

  if (indicators.macdHistogram > 0) {
    direction = direction === 'DOWN' ? 'HOLD' : 'UP';
    confidence += 10;
    reasons.push('MACD positive');
  } else if (indicators.macdHistogram < 0) {
    direction = direction === 'UP' ? 'HOLD' : 'DOWN';
    confidence += 10;
    reasons.push('MACD negative');
  }

  if (indicators.priceNearBBLower) {
    direction = 'UP';
    confidence += 15;
    reasons.push('Price near lower BB');
  } else if (indicators.priceNearBBUpper) {
    direction = 'DOWN';
    confidence += 15;
    reasons.push('Price near upper BB');
  }

  confidence = Math.min(95, Math.max(40, confidence));

  return {
    direction: confidence >= 55 ? direction : 'HOLD',
    confidence,
    reason: reasons.length > 0 ? reasons.join(' + ') : 'Insufficient indicators'
  };
}

function buildPrompt(candles, indicators) {
  const recentCandles = candles.slice(-5).map(c => ({
    o: c.open?.toFixed(5),
    h: c.high?.toFixed(5),
    l: c.low?.toFixed(5),
    c: c.close?.toFixed(5)
  }));

  return `You are a binary options trading signal generator for EUR/USD.
Analyze this data and predict if the next 1-minute candle will go UP or DOWN.

Recent candles:
${JSON.stringify(recentCandles, null, 2)}

Indicators:
- RSI(14): ${indicators.rsi?.toFixed(2) || 'N/A'}
- EMA(9): ${indicators.ema9?.toFixed(5) || 'N/A'}
- EMA(21): ${indicators.ema21?.toFixed(5) || 'N/A'}
- MACD Histogram: ${indicators.macdHistogram?.toFixed(5) || 'N/A'}

Respond ONLY in JSON format:
{"direction": "UP" or "DOWN", "confidence": 0-100, "reason": "brief explanation"}`;
}

function parseSignalResponse(text) {
  try {
    const match = text?.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        direction: parsed.direction?.toUpperCase() || 'HOLD',
        confidence: Math.min(95, Math.max(40, parseInt(parsed.confidence) || 50)),
        reason: parsed.reason || 'AI generated signal'
      };
    }
  } catch (error) {
    logger.error('Parse error:', error.message);
  }
  return null;
}

export default { generateSignal };
