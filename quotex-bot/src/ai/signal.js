import { calculateIndicators } from './indicators.js';

export async function generateSignal(candles) {
  if (!candles || candles.length < 30) {
    return null;
  }

  const indicators = calculateIndicators(candles);
  const currentCandle = candles[candles.length - 1];

  return analyzeSignal(indicators, currentCandle, candles);
}

function analyzeSignal(indicators, currentCandle, candles) {
  let upScore = 0;
  let downScore = 0;
  const reasons = [];

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
      reasons.push(`RSI neutral-low (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 55) {
      downScore += 1;
      reasons.push(`RSI neutral-high (${indicators.rsi.toFixed(1)})`);
    }
  }

  // EMA Analysis
  if (indicators.ema9 && indicators.ema21) {
    if (indicators.ema9 > indicators.ema21) {
      upScore += 2;
      reasons.push('EMA bullish crossover');
    } else {
      downScore += 2;
      reasons.push('EMA bearish crossover');
    }
    
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
      reasons.push('Near lower BB (oversold)');
    } else if (position > 0.8) {
      downScore += 2;
      reasons.push('Near upper BB (overbought)');
    }
  }

  // Candle momentum
  const currentChange = currentCandle.close - currentCandle.open;
  if (currentChange > 0) {
    upScore += 1;
  } else {
    downScore += 1;
  }

  // Previous candle
  if (candles.length >= 2) {
    const prevChange = candles[candles.length - 2].close - candles[candles.length - 2].open;
    if (currentChange > 0 && prevChange > 0) {
      upScore += 1;
      reasons.push('Consecutive bullish');
    } else if (currentChange < 0 && prevChange < 0) {
      downScore += 1;
      reasons.push('Consecutive bearish');
    }
  }

  // Determine direction
  let direction = 'HOLD';
  let confidence = 50;
  
  if (upScore > downScore) {
    direction = 'UP';
    confidence = 50 + (upScore - downScore) * 8;
  } else if (downScore > upScore) {
    direction = 'DOWN';
    confidence = 50 + (downScore - upScore) * 8;
  }

  confidence = Math.min(90, Math.max(45, confidence));

  // Ensure direction for testing
  if (direction === 'HOLD') {
    direction = upScore >= downScore ? 'UP' : 'DOWN';
  }

  return {
    direction,
    confidence,
    reasons: reasons.slice(0, 4)
  };
}

export default { generateSignal };
