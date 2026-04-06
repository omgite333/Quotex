import { settings } from '../../config/settings.js';

export function validateSignal(signal, stats) {
  const errors = [];
  const warnings = [];

  if (!signal || !signal.direction) {
    return { valid: false, errors: ['Invalid signal format'] };
  }

  if (signal.direction === 'HOLD') {
    return { valid: false, errors: ['Signal is HOLD'] };
  }

  if (signal.confidence < settings.trading.minConfidence) {
    errors.push(`Confidence ${signal.confidence}% below threshold ${settings.trading.minConfidence}%`);
  }

  if (stats.consecutiveLosses >= settings.trading.maxConsecutiveLosses) {
    errors.push(`Max consecutive losses (${stats.consecutiveLosses}) reached`);
  }

  if (stats.totalTrades >= settings.trading.maxTradesPerHour * 4) {
    errors.push('Hourly trade limit reached');
  }

  const dailyLoss = Math.abs(stats.totalProfit);
  if (dailyLoss >= settings.trading.dailyLossLimit) {
    errors.push(`Daily loss limit ($${dailyLoss}) reached`);
  }

  if (signal.confidence >= 85) {
    warnings.push('Very high confidence - verify signal');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confidence: signal.confidence
  };
}

export function calculatePositionSize(balance, riskPercent = 2) {
  const riskAmount = balance * (riskPercent / 100);
  return Math.min(riskAmount, settings.trading.amount);
}

export default { validateSignal, calculatePositionSize };
