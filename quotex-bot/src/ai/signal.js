import { settings } from '../../config/settings.js';
import { calculateIndicators } from './indicators.js';

export async function generateSignal(candles) {
  if (!candles || candles.length < 20) {
    console.log('⚠️  Insufficient candle data');
    return null;
  }

  const indicators = calculateIndicators(candles);
  const currentCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  return generateLocalSignal(indicators, currentCandle, previousCandle);
}

function generateLocalSignal(indicators, currentCandle, previousCandle) {
  let direction = 'HOLD';
  let confidence = 50;
  const reasons = [];

  // RSI Analysis
  if (indicators.rsi) {
    if (indicators.rsi < 30) {
      direction = 'UP';
      confidence += 15;
      reasons.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 70) {
      direction = 'DOWN';
      confidence += 15;
      reasons.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
    }
  }

  // EMA Crossover Analysis
  if (indicators.ema9 && indicators.ema21) {
    const emaCross = indicators.ema9 - indicators.ema21;
    const prevEmaCross = indicators.ema9 - indicators.ema21; // Simplified
    
    if (indicators.ema9 > indicators.ema21) {
      confidence += 10;
      reasons.push('EMA bullish (9 > 21)');
    } else {
      confidence += 10;
      reasons.push('EMA bearish (9 < 21)');
    }
  }

  // MACD Analysis
  if (indicators.macdHistogram !== undefined) {
    if (indicators.macdHistogram > 0) {
      confidence += 10;
      reasons.push('MACD bullish');
    } else if (indicators.macdHistogram < 0) {
      confidence += 10;
      reasons.push('MACD bearish');
    }
  }

  // Bollinger Bands Analysis
  if (indicators.priceNearBBLower) {
    direction = 'UP';
    confidence += 10;
    reasons.push('Near lower BB');
  } else if (indicators.priceNearBBUpper) {
    direction = 'DOWN';
    confidence += 10;
    reasons.push('Near upper BB');
  }

  // Price momentum (close vs open)
  if (previousCandle && currentCandle) {
    const momentum = (currentCandle.close - currentCandle.open) > 0;
    if (momentum && direction !== 'DOWN') {
      confidence += 5;
      reasons.push('Bullish candle');
    } else if (!momentum && direction !== 'UP') {
      confidence += 5;
      reasons.push('Bearish candle');
    }
  }

  // Trend confirmation
  if (indicators.trend) {
    reasons.push(`${indicators.trend}`);
  }

  // Clamp confidence
  confidence = Math.min(95, Math.max(40, confidence));

  // Final direction with confidence threshold
  const finalDirection = confidence >= settings.trading.minConfidence ? direction : 'HOLD';

  return {
    direction: finalDirection,
    confidence,
    reason: reasons.slice(0, 3).join(' + ')
  };
}

export default { generateSignal };
