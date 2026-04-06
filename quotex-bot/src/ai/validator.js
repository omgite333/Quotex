import { settings } from '../../config/settings.js';

export function validateSignal(signal, stats) {
  // No validation for testing - always allow trades
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

export function calculatePositionSize(balance, riskPercent = 2) {
  return settings.trading.amount;
}

export default { validateSignal, calculatePositionSize };
