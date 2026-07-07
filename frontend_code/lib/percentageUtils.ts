/**
 * Utility functions for consistent percentage formatting across the website
 */

export type PercentagePrecision = 'whole' | 'one' | 'two' | 'three';

/**
 * Formats a percentage value with consistent precision
 * @param value - The percentage value (0-100)
 * @param precision - The number of decimal places ('whole', 'one', 'two', 'three')
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, precision: PercentagePrecision = 'one'): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0%';
  }

  // Auto-detect 0-1 scale (ML metrics) and convert to 0-100
  let pctValue = value;
  if (pctValue > 0 && pctValue <= 1) {
    pctValue = pctValue * 100;
  }

  // Ensure value is between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, pctValue));

  switch (precision) {
    case 'whole':
      return `${Math.round(clampedValue)}%`;
    case 'one':
      return `${clampedValue.toFixed(1)}%`;
    case 'two':
      return `${clampedValue.toFixed(2)}%`;
    case 'three':
      return `${clampedValue.toFixed(3)}%`;
    default:
      return `${clampedValue.toFixed(1)}%`;
  }
}

/**
 * Formats confidence percentages (typically 1 decimal place)
 */
export function formatConfidence(value: number): string {
  return formatPercentage(value, 'one');
}

/**
 * Formats risk percentages (typically whole numbers)
 */
export function formatRisk(value: number): string {
  return formatPercentage(value, 'whole');
}

/**
 * Formats accuracy percentages (typically 1 decimal place)
 */
export function formatAccuracy(value: number): string {
  return formatPercentage(value, 'one');
}

/**
 * Formats precision/recall percentages (typically 1 decimal place)
 */
export function formatPrecision(value: number): string {
  return formatPercentage(value, 'one');
}

/**
 * Formats F1 score percentages (typically 1 decimal place)
 */
export function formatF1Score(value: number): string {
  return formatPercentage(value, 'one');
}

/**
 * Formats environmental data percentages (typically whole numbers)
 */
export function formatEnvironmental(value: number): string {
  return formatPercentage(value, 'whole');
}

/**
 * Formats quality scores (typically whole numbers)
 */
export function formatQuality(value: number): string {
  return formatPercentage(value, 'whole');
}



/**
 * Formats trend percentages (typically 2 decimal places)
 */
export function formatTrend(value: number): string {
  return formatPercentage(value, 'two');
}

/**
 * Formats improvement percentages (typically 2 decimal places)
 */
export function formatImprovement(value: number): string {
  return formatPercentage(value, 'two');
}

/**
 * Smart formatting based on value magnitude
 * - Values < 1: 3 decimal places
 * - Values 1-10: 2 decimal places  
 * - Values 10-100: 1 decimal place
 * - Values > 100: whole number
 */
export function formatSmart(value: number): string {
  if (value < 1) {
    return formatPercentage(value, 'three');
  } else if (value < 10) {
    return formatPercentage(value, 'two');
  } else if (value < 100) {
    return formatPercentage(value, 'one');
  } else {
    return formatPercentage(value, 'whole');
  }
}
