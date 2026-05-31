/**
 * FactuTrust — Invoice Number Generator
 *
 * Generates auto-incrementing, human-readable invoice numbers
 * following the format: {PREFIX}{YEAR}-{SEQUENCE}
 *
 * Examples:
 *   FAC-2025-0001
 *   INV-2025-0042
 *   REC-2025-0100
 *
 * Sequence resets per prefix and per year automatically
 * since the year is embedded in the number format.
 */

import type { InvoiceNumberInput, InvoiceNumberResult } from './types.ts';

/**
 * Default prefix used when none is configured.
 */
export const DEFAULT_PREFIX = 'FAC-';

/**
 * Number of digits in the sequence portion (zero-padded).
 */
export const SEQUENCE_DIGITS = 4;

/**
 * Generate the next invoice number for a given profile.
 *
 * Rules:
 *   - Format: {prefix}{year}-{sequence padded to 4 digits}
 *   - Sequence auto-increments from lastInvoiceNo.
 *   - If lastInvoiceNo is 0 (no prior invoices), starts at 1.
 *   - Sequence resets at year boundary naturally because
 *     the year is part of the format — the caller supplies
 *     the current year and the last number used this year.
 *
 * @throws {Error} if prefix is empty, year is invalid, or
 *         lastInvoiceNo is negative.
 */
export function generateInvoiceNumber(
  input: InvoiceNumberInput,
): InvoiceNumberResult {
  // Validation
  if (!input.prefix || input.prefix.trim().length === 0) {
    throw new Error('Invoice prefix cannot be empty');
  }

  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new Error(
      `Year must be an integer between 2000 and 2100: ${input.year}`,
    );
  }

  if (
    !Number.isInteger(input.lastInvoiceNo) ||
    input.lastInvoiceNo < 0
  ) {
    throw new Error(
      `lastInvoiceNo must be a non-negative integer: ${input.lastInvoiceNo}`,
    );
  }

  const nextNo = input.lastInvoiceNo + 1;

  // Zero-pad the sequence number (e.g. 1 → "0001")
  const paddedSequence = String(nextNo).padStart(SEQUENCE_DIGITS, '0');

  const invoiceNumber = `${input.prefix}${input.year}-${paddedSequence}`;

  return {
    invoiceNumber,
    nextInvoiceNo: nextNo,
  };
}

/**
 * Extract the numeric sequence from an invoice number string.
 * Useful for parsing existing invoice numbers when seeding
 * or migrating data.
 *
 * Example:
 *   parseSequence("FAC-2025-0001") → 1
 *   parseSequence("INV-2024-0042") → 42
 *
 * Returns null if the format doesn't match.
 */
export function parseSequence(invoiceNumber: string): number | null {
  // Match the last group of digits (after the last "-")
  const match = invoiceNumber.match(/-(\d+)$/);
  if (!match) return null;

  const seq = parseInt(match[1], 10);
  return isNaN(seq) ? null : seq;
}