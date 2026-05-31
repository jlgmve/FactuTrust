/**
 * FactuTrust — Invoice Number Generator: Unit Tests
 *
 * Tests cover:
 *   - Standard invoice number generation
 *   - Padding behavior
 *   - Sequence incrementing
 *   - Edge cases: first invoice, year boundaries
 *   - Validation: empty prefix, invalid year, negative lastInvoiceNo
 *   - parseSequence utility
 */

import { generateInvoiceNumber, parseSequence } from '../invoice-number.ts';

// ---------------------------------------------------------------------------
// generateInvoiceNumber
// ---------------------------------------------------------------------------

describe('generateInvoiceNumber', () => {
  it('generates first invoice number of the year', () => {
    const result = generateInvoiceNumber({
      prefix: 'FAC-',
      year: 2025,
      lastInvoiceNo: 0,
    });

    expect(result.invoiceNumber).toBe('FAC-2025-0001');
    expect(result.nextInvoiceNo).toBe(1);
  });

  it('auto-increments sequence', () => {
    const result = generateInvoiceNumber({
      prefix: 'FAC-',
      year: 2025,
      lastInvoiceNo: 42,
    });

    expect(result.invoiceNumber).toBe('FAC-2025-0043');
    expect(result.nextInvoiceNo).toBe(43);
  });

  it('handles high sequence numbers', () => {
    const result = generateInvoiceNumber({
      prefix: 'INV-',
      year: 2024,
      lastInvoiceNo: 999,
    });

    expect(result.invoiceNumber).toBe('INV-2024-1000');
    expect(result.nextInvoiceNo).toBe(1000);
  });

  it('works with custom prefix', () => {
    const result = generateInvoiceNumber({
      prefix: 'REC-',
      year: 2025,
      lastInvoiceNo: 0,
    });

    expect(result.invoiceNumber).toBe('REC-2025-0001');
  });

  it('handles prefix without trailing dash', () => {
    const result = generateInvoiceNumber({
      prefix: 'F',
      year: 2025,
      lastInvoiceNo: 5,
    });

    expect(result.invoiceNumber).toBe('F2025-0006');
  });

  it('handles year transition', () => {
    // Last invoice of 2024 is 0150
    const result2024 = generateInvoiceNumber({
      prefix: 'FAC-',
      year: 2024,
      lastInvoiceNo: 150,
    });
    expect(result2024.invoiceNumber).toBe('FAC-2024-0151');
    expect(result2024.nextInvoiceNo).toBe(151);

    // First invoice of 2025 starts fresh (different year)
    const result2025 = generateInvoiceNumber({
      prefix: 'FAC-',
      year: 2025,
      lastInvoiceNo: 0,
    });
    expect(result2025.invoiceNumber).toBe('FAC-2025-0001');
    expect(result2025.nextInvoiceNo).toBe(1);
  });

  // ---------- Validation ----------

  it('throws on empty prefix', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: '',
        year: 2025,
        lastInvoiceNo: 0,
      }),
    ).toThrow('Invoice prefix cannot be empty');
  });

  it('throws on prefix with only whitespace', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: '   ',
        year: 2025,
        lastInvoiceNo: 0,
      }),
    ).toThrow('Invoice prefix cannot be empty');
  });

  it('throws on year < 2000', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: 'FAC-',
        year: 1999,
        lastInvoiceNo: 0,
      }),
    ).toThrow('Year must be an integer between 2000 and 2100');
  });

  it('throws on year > 2100', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: 'FAC-',
        year: 2101,
        lastInvoiceNo: 0,
      }),
    ).toThrow('Year must be an integer between 2000 and 2100');
  });

  it('throws on non-integer year', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: 'FAC-',
        year: 2025.5,
        lastInvoiceNo: 0,
      }),
    ).toThrow('Year must be an integer between 2000 and 2100');
  });

  it('throws on negative lastInvoiceNo', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: 'FAC-',
        year: 2025,
        lastInvoiceNo: -1,
      }),
    ).toThrow('lastInvoiceNo must be a non-negative integer');
  });

  it('throws on non-integer lastInvoiceNo', () => {
    expect(() =>
      generateInvoiceNumber({
        prefix: 'FAC-',
        year: 2025,
        lastInvoiceNo: 1.5,
      }),
    ).toThrow('lastInvoiceNo must be a non-negative integer');
  });
});

// ---------------------------------------------------------------------------
// parseSequence
// ---------------------------------------------------------------------------

describe('parseSequence', () => {
  it('extracts sequence number from valid invoice number', () => {
    expect(parseSequence('FAC-2025-0001')).toBe(1);
    expect(parseSequence('INV-2024-0042')).toBe(42);
    expect(parseSequence('REC-2023-0100')).toBe(100);
  });

  it('returns null for malformed strings', () => {
    expect(parseSequence('')).toBeNull();
    expect(parseSequence('FAC-')).toBeNull();
    expect(parseSequence('FAC-2025-')).toBeNull();
    expect(parseSequence('no-numbers')).toBeNull();
  });

  it('handles non-standard formatting', () => {
    expect(parseSequence('F2025-001')).toBe(1);
    expect(parseSequence('X-9999')).toBe(9999);
  });
});