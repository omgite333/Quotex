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

  // Log current indicators
  console.log(`📊 RSI: ${indicators.rsi?.toFixed(1) || 'N/A'} | EMA9: ${indicators.ema9?.toFixed(5) || 'N/A'} | EMA21: ${indicators.ema21?.toFixed(5) || 'N/A'}`);
  console.log(`📊 MACD: ${indicators.macdHistogram?.toFixed(5) || 'N/A'} | BB Upper: ${indicators.bbUpper?.toFixed(5) || 'N/A'} | BB Lower: ${indicators.bbLower?.toFixed(5) || 'N/A'}`);

  return generateLocalSignal(indicators, currentCandle, previousCandle);
}

function generateLocalSignal(indicators, currentCandle, previousCandle) {
  let direction = 'HOLD';
  let confidence = 50;
  const reasons = [];
  let upScore = 0;
  let downScore = 0;

  // RSI Analysis
  if (indicators.rsi) {
    if (indicators.rsi < 30) {
      upScore += 3;
      reasons.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 70) {
      downScore += 3;
      reasons.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi < 45) {
      upScore += 1;
      reasons.push('RSI below 45');
    } else if (indicators.rsi > 55) {
      downScore += 1;
      reasons.push('RSI above 55');
    }
  }

  // EMA Analysis
  if (indicators.ema9 && indicators.ema21) {
    if (indicators.ema9 > indicators.ema21) {
      upScore += 2;
      reasons.push('EMA bullish');
    } else {
      downScore += 2;
      reasons.push('EMA bearish');
    }
    
    // Price vs EMA
    if (currentCandle.close > indicators.ema9) {
      upScore += 1;
    } else {
      downScore += 1;
    }
  }

  // MACD Analysis
  if (indicators.macdHistogram !== undefined) {
    if (indicators.macdHistogram > 0) {
      upScore += 2;
      reasons.push('MACD bullish');
    } else if (indicators.macdHistogram < 0) {
      downScore += 2;
      reasons.push('MACD bearish');
    }
  }

  // Bollinger Bands Analysis
  if (indicators.bbLower && indicators.bbUpper && currentCandle.close) {
    const price = currentCandle.close;
    const bbRange = indicators.bbUpper - indicators.bbLower;
    const position = (price - indicators.bbLower) / (bbRange || 1);
    
    if (position < 0.2) {
      upScore += 2;
      reasons.push('Near lower BB');
    } else if (position > 0.8) {
      downScore += 2;
      reasons.push('Near upper BB');
    }
  }

  // Candle momentum
  if (previousCandle && currentCandle) {
    const currentChange = currentCandle.close - currentCandle.open;
    const previousChange = previousCandle.close - previousCandle.open;
    
    if (currentChange > 0) {
      upScore += 1;
    } else {
      downScore += 1;
    }
    
    // Consecutive bullish/bearish
    if (currentChange > 0 && previousChange > 0) {
      upScore += 1;
      reasons.push('Consecutive bullish');
    } else if (currentChange < 0 && previousChange < 0) {
      downScore += 1;
      reasons.push('Consecutive bearish');
    }
  }

  // Trend
  if (indicators.trend) {
    reasons.push(indicators.trend);
  }

  // Determine direction
  if (upScore > downScore) {
    direction = 'UP';
    confidence = 50 + (upScore - downScore) * 8;
  } else if (downScore > upScore) {
    direction = 'DOWN';
    confidence = 50 + (downScore - upScore) * 8;
  }

  // Clamp confidence
  confidence = Math.min(90, Math.max(45, confidence));

  // Check minimum confidence threshold
  if (confidence < settings.trading.minConfidence) {
    direction = 'HOLD';
    reasons.push('Low confidence');
  }

  const finalReason = reasons.slice(0, 3).join(' + ') || 'Mixed signals';

  return {
    direction,
    confidence,
    reason: finalReason
  };
}

export default { generateSignal };
