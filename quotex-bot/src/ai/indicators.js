import { RSI, EMA, MACD, BollingerBands } from 'technicalindicators';

export function calculateIndicators(candles) {
  if (!candles || candles.length < 30) {
    return {};
  }

  const closes = candles.map(c => c.close);
  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle.close;

  try {
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const ema9Values = EMA.calculate({ values: closes, period: 9 });
    const ema21Values = EMA.calculate({ values: closes, period: 21 });
    const macdValues = MACD.calculate({
      values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9
    });
    const bbValues = BollingerBands.calculate({
      values: closes, period: 20, stdDev: 2
    });

    const rsi = rsiValues[rsiValues.length - 1] || 50;
    const ema9 = ema9Values[ema9Values.length - 1] || currentPrice;
    const ema21 = ema21Values[ema21Values.length - 1] || currentPrice;
    const macdHist = macdValues[macdValues.length - 1]?.histogram || 0;
    const bb = bbValues[bbValues.length - 1];

    return {
      rsi,
      ema9,
      ema21,
      macd: macdValues[macdValues.length - 1]?.MACD || 0,
      macdSignal: macdValues[macdValues.length - 1]?.signal || 0,
      macdHistogram: macdHist,
      bbUpper: bb?.upper || currentPrice,
      bbLower: bb?.lower || currentPrice,
      bbMiddle: bb?.middle || currentPrice,
      priceNearBBLower: currentPrice <= bb?.lower * 1.001,
      priceNearBBUpper: currentPrice >= bb?.upper * 0.999,
      trend: ema9 > ema21 ? 'UPTREND' : 'DOWNTREND',
      momentum: macdHist > 0 ? 'BULLISH' : 'BEARISH'
    };
  } catch (error) {
    console.log('⚠️  Indicator error:', error.message);
    return {};
  }
}

export default { calculateIndicators };
