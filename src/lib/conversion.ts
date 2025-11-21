// src/lib/conversion.ts

/**
 * Convert NGN to USDT using a fixed rate: 1 USDT = 1450 NGN
 * Returns a decimal number (USDT) as Number
 */
export function getUSDTPriceInNGN(amountNGN: number): number {
  if (typeof amountNGN !== "number" || isNaN(amountNGN)) throw new Error("Invalid NGN amount");

  const FIXED_RATE = 1450; // 1 USDT = 1450 NGN
  const usdtAmount = amountNGN / FIXED_RATE;

  // round to 6 decimals for token decimals safety
  return Math.round(usdtAmount * 1e6) / 1e6;
}
