/**
 * FactuTrust — Invoice Calculation Engine
 *
 * Main entry point. Re-exports all public types and functions.
 *
 * Usage (Edge Function):
 *   import { calculateInvoice } from './calculator.js';
 *   const result = calculateInvoice(inputs);
 */

export * from './types.js';
export * from './calculator.js';
export * from './invoice-number.js';