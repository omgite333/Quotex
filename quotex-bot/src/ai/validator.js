import logger from '../logs/logger.js';
import { settings } from '../../config/settings.js';

export function validateSignal(signal, stats) {
  const errors = [];
  const warnings = [];

  if (!signal || !signal.direction) {
    return { valid: false, errors: ['Invalid signal format'] };
  }

  if (signal.direction === 'HOLD') {
    return { valid: false, errors: ['Signal is HOLD, no trade'] };
  }

  if (signal.confidence < settings.trading.minConfidence) {
    errors.push(`Confidence ${signal.confidence}% below threshold ${settings.trading.minConfidence}%`);
  }

  if (stats.consecutiveLosses >= settings.trading.maxConsecutiveLosses) {
    errors.push(`Max consecutive losses reached (${stats.consecutiveLosses}), pausing bot`);
  }

  const tradesThisHour = getTradesThisHour();
  if (tradesThisHour >= settings.trading.maxTradesPerHour) {
    errors.push(`Max trades per hour reached (${tradesThisHour}/${settings.trading.maxTradesPerHour})`);
  }

  const dailyLoss = Math.abs(stats.totalProfit);
  if (dailyLoss >= settings.trading.dailyLossLimit) {
    errors.push(`Daily loss limit reached ($${dailyLoss}), stopping for today`);
  }

  if (signal.confidence >= 85) {
    warnings.push('Very high confidence - verify signal is not overfitted');
  }

  if (signal.direction !== getOppositeTrend()) {
    warnings.push('Signal contradicts main trend');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confidence: signal.confidence
  };
}

function getTradesThisHour() {
  return 0;
}

function getOppositeTrend() {
  return null;
}

export function calculatePositionSize(balance, riskPercent = 2) {
  const riskAmount = balance * (riskPercent / 100);
  return Math.min(riskAmount, settings.trading.amount);
}

export default { validateSignal, calculatePositionSize };
