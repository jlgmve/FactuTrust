/**
 * FactuTrust — Invoice Calculation Engine: Unit Tests
 *
 * Tests cover:
 *   - roundMoney precision behavior
 *   - calculateLineTotal, calculateIvaAmount, calculateIrpfAmount
 *   - computeLine full line computation
 *   - calculateInvoice aggregation and grand total
 *   - buildTaxSummary grouping
 *   - calculateDueDate
 *   - validateLineInput and validateInvoiceInputs
 *   - Edge cases: empty, zero values, negative values, discounts
 *   - Spanish tax scenarios: general regime, reduced, exempt, IRPF retentions
 */

import {
  roundMoney,
  sumAndRound,
  calculateLineTotal,
  calculateIvaAmount,
  calculateIrpfAmount,
  computeLine,
  calculateInvoice,
  buildTaxSummary,
  calculateDiscountAmount,
  calculateDueDate,
  validateLineInput,
  validateInvoiceInputs,
} from '../calculator.ts';

import type { InvoiceLine } from '../types.ts';

// ---------------------------------------------------------------------------
// roundMoney
// ---------------------------------------------------------------------------

describe('roundMoney', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundMoney(10.456)).toBe(10.46);
    expect(roundMoney(10.454)).toBe(10.45);
  });

  it('rounds half up', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.015)).toBe(1.02);
  });

  it('handles integers', () => {
    expect(roundMoney(100)).toBe(100);
  });

  it('handles zero', () => {
    expect(roundMoney(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(roundMoney(-10.456)).toBe(-10.46);
    expect(roundMoney(-10.454)).toBe(-10.45);
  });

  it('rounds very small values to 0', () => {
    expect(roundMoney(0.001)).toBe(0);
    expect(roundMoney(0.004)).toBe(0);
    expect(roundMoney(0.005)).toBe(0.01);
  });
});

// ---------------------------------------------------------------------------
// sumAndRound
// ---------------------------------------------------------------------------

describe('sumAndRound', () => {
  it('sums and rounds an array', () => {
    expect(sumAndRound([10.111, 20.222])).toBe(30.33);
  });

  it('returns 0 for empty array', () => {
    expect(sumAndRound([])).toBe(0);
  });

  it('handles single value', () => {
    expect(sumAndRound([42.456])).toBe(42.46);
  });
});

// ---------------------------------------------------------------------------
// calculateLineTotal
// ---------------------------------------------------------------------------

describe('calculateLineTotal', () => {
  it('calculates line total without discount', () => {
    // 3 units × €100 × (1 - 0/100) = €300
    expect(calculateLineTotal(3, 100, 0)).toBe(300);
  });

  it('applies discount correctly', () => {
    // 3 units × €100 × (1 - 10/100) = €270
    expect(calculateLineTotal(3, 100, 10)).toBe(270);
  });

  it('handles fractional quantities', () => {
    // 2.5 hours × €80 × (1 - 0/100) = €200
    expect(calculateLineTotal(2.5, 80, 0)).toBe(200);
  });

  it('handles 100% discount', () => {
    expect(calculateLineTotal(5, 100, 100)).toBe(0);
  });

  it('rounds the result', () => {
    // 3 × 10.33 × (1 - 1/100) = 30.6801 → 30.68
    expect(calculateLineTotal(3, 10.33, 1)).toBe(30.68);
  });

  it('throws on negative quantity', () => {
    expect(() => calculateLineTotal(-1, 100, 0)).toThrow('Quantity cannot be negative');
  });

  it('throws on negative unit price', () => {
    expect(() => calculateLineTotal(1, -100, 0)).toThrow('Unit price cannot be negative');
  });

  it('throws on discount > 100', () => {
    expect(() => calculateLineTotal(1, 100, 101)).toThrow('Discount percentage must be 0–100');
  });

  it('throws on negative discount', () => {
    expect(() => calculateLineTotal(1, 100, -5)).toThrow('Discount percentage must be 0–100');
  });
});

// ---------------------------------------------------------------------------
// calculateIvaAmount
// ---------------------------------------------------------------------------

describe('calculateIvaAmount', () => {
  it('calculates 21% IVA', () => {
    // €300 × 21% = €63
    expect(calculateIvaAmount(300, 21)).toBe(63);
  });

  it('calculates 10% IVA', () => {
    expect(calculateIvaAmount(200, 10)).toBe(20);
  });

  it('calculates 4% IVA', () => {
    expect(calculateIvaAmount(100, 4)).toBe(4);
  });

  it('returns 0 for exempt (0% IVA)', () => {
    expect(calculateIvaAmount(500, 0)).toBe(0);
  });

  it('rounds the result', () => {
    // €33.33 × 21% = 6.9993 → 7.00
    expect(calculateIvaAmount(33.33, 21)).toBe(7.0);
  });

  it('throws on negative percent', () => {
    expect(() => calculateIvaAmount(100, -5)).toThrow('IVA percent cannot be negative');
  });
});

// ---------------------------------------------------------------------------
// calculateIrpfAmount
// ---------------------------------------------------------------------------

describe('calculateIrpfAmount', () => {
  it('calculates 15% IRPF', () => {
    // €1000 × 15% = €150
    expect(calculateIrpfAmount(1000, 15)).toBe(150);
  });

  it('calculates 7% IRPF', () => {
    expect(calculateIrpfAmount(1000, 7)).toBe(70);
  });

  it('returns 0 for 0% IRPF', () => {
    expect(calculateIrpfAmount(500, 0)).toBe(0);
  });

  it('rounds the result', () => {
    expect(calculateIrpfAmount(33.33, 15)).toBe(5.0); // 4.9995 → 5.00
  });

  it('throws on negative percent', () => {
    expect(() => calculateIrpfAmount(100, -5)).toThrow('IRPF percent cannot be negative');
  });
});

// ---------------------------------------------------------------------------
// computeLine
// ---------------------------------------------------------------------------

describe('computeLine', () => {
  it('computes a full line correctly', () => {
    const result = computeLine({
      description: 'Consultoría',
      quantity: 10,
      unitPrice: 100,
      discountPct: 10,
      ivaPercent: 21,
      irpfPercent: 15,
    });

    // lineTotal = 10 × 100 × 0.9 = 900
    expect(result.lineTotal).toBe(900);
    // ivaAmount = 900 × 21% = 189
    expect(result.ivaAmount).toBe(189);
    // irpfAmount = 900 × 15% = 135
    expect(result.irpfAmount).toBe(135);
    expect(result.description).toBe('Consultoría');
    expect(result.quantity).toBe(10);
    expect(result.unitPrice).toBe(100);
    expect(result.discountPct).toBe(10);
    expect(result.ivaPercent).toBe(21);
    expect(result.irpfPercent).toBe(15);
  });

  it('computes a line with zero discount', () => {
    const result = computeLine({
      description: 'Servicio',
      quantity: 5,
      unitPrice: 50,
      discountPct: 0,
      ivaPercent: 10,
      irpfPercent: 0,
    });

    expect(result.lineTotal).toBe(250);
    expect(result.ivaAmount).toBe(25);
    expect(result.irpfAmount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateDiscountAmount
// ---------------------------------------------------------------------------

describe('calculateDiscountAmount', () => {
  it('calculates discount amount', () => {
    // 10 × €100 × (10/100) = €100
    expect(calculateDiscountAmount(10, 100, 10)).toBe(100);
  });

  it('returns 0 when no discount', () => {
    expect(calculateDiscountAmount(5, 100, 0)).toBe(0);
  });

  it('full discount: 5 × 100 × 100% = 500', () => {
    expect(calculateDiscountAmount(5, 100, 100)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// calculateInvoice — full invoice scenarios
// ---------------------------------------------------------------------------

describe('calculateInvoice', () => {
  it('returns zero values for empty inputs', () => {
    const result = calculateInvoice([]);
    expect(result.subtotal).toBe(0);
    expect(result.ivaTotal).toBe(0);
    expect(result.irpfTotal).toBe(0);
    expect(result.discountTotal).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.lines).toEqual([]);
    expect(result.taxSummary).toEqual([]);
  });

  it('calculates a simple single-line invoice (21% IVA, no IRPF)', () => {
    const result = calculateInvoice([
      {
        description: 'Web development',
        quantity: 1,
        unitPrice: 1000,
        discountPct: 0,
        ivaPercent: 21,
        irpfPercent: 0,
      },
    ]);

    expect(result.subtotal).toBe(1000);
    expect(result.ivaTotal).toBe(210);
    expect(result.irpfTotal).toBe(0);
    expect(result.discountTotal).toBe(0);
    expect(result.grandTotal).toBe(1210);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineTotal).toBe(1000);
    expect(result.lines[0].ivaAmount).toBe(210);
  });

  it('calculates invoice with multiple lines and mixed rates', () => {
    const result = calculateInvoice([
      // Line 1: General 21% IVA
      { description: 'Consulting', quantity: 10, unitPrice: 100, discountPct: 0, ivaPercent: 21, irpfPercent: 0 },
      // Line 2: Reduced 10% IVA
      { description: 'Transport', quantity: 5, unitPrice: 50, discountPct: 0, ivaPercent: 10, irpfPercent: 0 },
      // Line 3: Exempt 0% IVA
      { description: 'Education', quantity: 2, unitPrice: 200, discountPct: 0, ivaPercent: 0, irpfPercent: 0 },
    ]);

    // Line 1: 10 × 100 = 1000, IVA = 210
    // Line 2: 5 × 50 = 250, IVA = 25
    // Line 3: 2 × 200 = 400, IVA = 0
    // subtotal = 1000 + 250 + 400 = 1650
    // ivaTotal = 210 + 25 + 0 = 235
    // grandTotal = 1650 + 235 - 0 = 1885
    expect(result.subtotal).toBe(1650);
    expect(result.ivaTotal).toBe(235);
    expect(result.irpfTotal).toBe(0);
    expect(result.grandTotal).toBe(1885);

    expect(result.lines).toHaveLength(3);
  });

  it('calculates invoice with IRPF retention', () => {
    const result = calculateInvoice([
      {
        description: 'Professional services',
        quantity: 1,
        unitPrice: 2000,
        discountPct: 0,
        ivaPercent: 21,
        irpfPercent: 15,
      },
    ]);

    // lineTotal = 2000
    // ivaAmount = 2000 × 21% = 420
    // irpfAmount = 2000 × 15% = 300
    // subtotal = 2000
    // ivaTotal = 420
    // irpfTotal = 300
    // grandTotal = 2000 + 420 - 300 = 2120
    expect(result.subtotal).toBe(2000);
    expect(result.ivaTotal).toBe(420);
    expect(result.irpfTotal).toBe(300);
    expect(result.grandTotal).toBe(2120);
  });

  it('calculates invoice with discounts', () => {
    const result = calculateInvoice([
      {
        description: 'Bulk order',
        quantity: 100,
        unitPrice: 10,
        discountPct: 15,
        ivaPercent: 21,
        irpfPercent: 0,
      },
    ]);

    // lineTotal = 100 × 10 × 0.85 = 850
    // ivaAmount = 850 × 21% = 178.50
    // subtotal = 850
    // discountTotal = 100 × 10 × 15% = 150
    // grandTotal = 850 + 178.50 = 1028.50
    expect(result.subtotal).toBe(850);
    expect(result.ivaTotal).toBe(178.50);
    expect(result.discountTotal).toBe(150);
    expect(result.grandTotal).toBe(1028.50);
  });

  it('handles mixed IRPF rates in multi-line invoice', () => {
    const result = calculateInvoice([
      { description: 'Dev 1', quantity: 1, unitPrice: 3000, discountPct: 0, ivaPercent: 21, irpfPercent: 15 },
      { description: 'Dev 2', quantity: 1, unitPrice: 2000, discountPct: 0, ivaPercent: 21, irpfPercent: 7 },
    ]);

    // Line 1: lineTotal=3000, iva=630, irpf=450
    // Line 2: lineTotal=2000, iva=420, irpf=140
    // subtotal = 5000, ivaTotal = 1050, irpfTotal = 590
    // grandTotal = 5000 + 1050 - 590 = 5460
    expect(result.subtotal).toBe(5000);
    expect(result.ivaTotal).toBe(1050);
    expect(result.irpfTotal).toBe(590);
    expect(result.grandTotal).toBe(5460);
  });
});

// ---------------------------------------------------------------------------
// buildTaxSummary
// ---------------------------------------------------------------------------

describe('buildTaxSummary', () => {
  it('groups IVA by rate', () => {
    const lines: InvoiceLine[] = [
      {
        description: 'Line 1', quantity: 1, unitPrice: 1000, discountPct: 0,
        ivaPercent: 21, irpfPercent: 0,
        lineTotal: 1000, ivaAmount: 210, irpfAmount: 0,
      },
      {
        description: 'Line 2', quantity: 1, unitPrice: 500, discountPct: 0,
        ivaPercent: 10, irpfPercent: 0,
        lineTotal: 500, ivaAmount: 50, irpfAmount: 0,
      },
      {
        description: 'Line 3', quantity: 1, unitPrice: 2000, discountPct: 0,
        ivaPercent: 21, irpfPercent: 0,
        lineTotal: 2000, ivaAmount: 420, irpfAmount: 0,
      },
    ];

    const summary = buildTaxSummary(lines);

    // Should have 2 entries: one for 21%, one for 10%
    expect(summary).toHaveLength(2);

    const iva21 = summary.find((s) => s.taxPercent === 21);
    const iva10 = summary.find((s) => s.taxPercent === 10);

    expect(iva21).toBeDefined();
    expect(iva21!.taxType).toBe('iva');
    expect(iva21!.taxableBase).toBe(3000); // 1000 + 2000
    expect(iva21!.taxAmount).toBe(630); // 210 + 420

    expect(iva10).toBeDefined();
    expect(iva10!.taxType).toBe('iva');
    expect(iva10!.taxableBase).toBe(500);
    expect(iva10!.taxAmount).toBe(50);
  });

  it('groups IRPF by rate', () => {
    const lines: InvoiceLine[] = [
      {
        description: 'Line 1', quantity: 1, unitPrice: 1000, discountPct: 0,
        ivaPercent: 21, irpfPercent: 15,
        lineTotal: 1000, ivaAmount: 210, irpfAmount: 150,
      },
      {
        description: 'Line 2', quantity: 1, unitPrice: 2000, discountPct: 0,
        ivaPercent: 21, irpfPercent: 7,
        lineTotal: 2000, ivaAmount: 420, irpfAmount: 140,
      },
    ];

    const summary = buildTaxSummary(lines);

    const irpf15 = summary.find((s) => s.taxType === 'irpf' && s.taxPercent === 15);
    const irpf7 = summary.find((s) => s.taxType === 'irpf' && s.taxPercent === 7);

    expect(irpf15).toBeDefined();
    expect(irpf15!.taxableBase).toBe(1000);
    expect(irpf15!.taxAmount).toBe(150);

    expect(irpf7).toBeDefined();
    expect(irpf7!.taxableBase).toBe(2000);
    expect(irpf7!.taxAmount).toBe(140);
  });

  it('returns empty for all exempt lines', () => {
    const lines: InvoiceLine[] = [
      {
        description: 'Exempt', quantity: 1, unitPrice: 100, discountPct: 0,
        ivaPercent: 0, irpfPercent: 0,
        lineTotal: 100, ivaAmount: 0, irpfAmount: 0,
      },
    ];

    expect(buildTaxSummary(lines)).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(buildTaxSummary([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateDueDate
// ---------------------------------------------------------------------------

describe('calculateDueDate', () => {
  it('returns explicit due date when provided', () => {
    const issueDate = new Date('2025-01-01');
    const explicitDue = new Date('2025-01-15');
    const result = calculateDueDate(issueDate, explicitDue);
    expect(result).toEqual(explicitDue);
  });

  it('defaults to 30 days from issue date', () => {
    const issueDate = new Date('2025-01-01');
    const result = calculateDueDate(issueDate);
    expect(result.getDate()).toBe(31); // Jan 1 + 30 = Jan 31
    expect(result.getMonth()).toBe(0); // January (0-indexed)
  });

  it('handles month boundaries', () => {
    const issueDate = new Date('2025-02-01');
    const result = calculateDueDate(issueDate);
    // Feb 1 + 30 = Mar 3 (Feb has 28 days in 2025)
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(3);
  });

  it('returns same date when issue + explicit are the same', () => {
    const issueDate = new Date('2025-06-15');
    const sameDate = new Date('2025-06-15');
    const result = calculateDueDate(issueDate, sameDate);
    expect(result).toEqual(sameDate);
  });
});

// ---------------------------------------------------------------------------
// validateLineInput
// ---------------------------------------------------------------------------

describe('validateLineInput', () => {
  it('returns no errors for valid input', () => {
    const errors = validateLineInput({
      description: 'Servicio',
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaPercent: 21,
      irpfPercent: 0,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects missing description', () => {
    const errors = validateLineInput({
      description: '',
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaPercent: 21,
      irpfPercent: 0,
    });
    expect(errors.some((e) => e.field === 'description')).toBe(true);
  });

  it('rejects negative quantity', () => {
    const errors = validateLineInput({
      description: 'Item',
      quantity: -1,
      unitPrice: 100,
      discountPct: 0,
      ivaPercent: 21,
      irpfPercent: 0,
    });
    expect(errors.some((e) => e.field === 'quantity')).toBe(true);
  });

  it('rejects invalid IVA rate', () => {
    const errors = validateLineInput({
      description: 'Item',
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaPercent: 15 as any, // Not a valid Spanish rate
      irpfPercent: 0,
    });
    expect(errors.some((e) => e.field === 'ivaPercent')).toBe(true);
  });

  it('rejects invalid IRPF rate', () => {
    const errors = validateLineInput({
      description: 'Item',
      quantity: 1,
      unitPrice: 100,
      discountPct: 0,
      ivaPercent: 21,
      irpfPercent: 10 as any, // Not a valid IRPF rate
    });
    expect(errors.some((e) => e.field === 'irpfPercent')).toBe(true);
  });

  it('rejects discount > 100', () => {
    const errors = validateLineInput({
      description: 'Item',
      quantity: 1,
      unitPrice: 100,
      discountPct: 110,
      ivaPercent: 21,
      irpfPercent: 0,
    });
    expect(errors.some((e) => e.field === 'discountPct')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateInvoiceInputs
// ---------------------------------------------------------------------------

describe('validateInvoiceInputs', () => {
  it('rejects empty array', () => {
    const errors = validateInvoiceInputs([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('lines');
  });

  it('prefixes field names with index for multiple lines', () => {
    const errors = validateInvoiceInputs([
      {
        description: 'Good',
        quantity: 1,
        unitPrice: 100,
        discountPct: 0,
        ivaPercent: 21,
        irpfPercent: 0,
      },
      {
        description: '',
        quantity: -1,
        unitPrice: 100,
        discountPct: 0,
        ivaPercent: 21,
        irpfPercent: 0,
      },
    ]);

    expect(errors.some((e) => e.field === 'lines[1].description')).toBe(true);
    expect(errors.some((e) => e.field === 'lines[1].quantity')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: Spanish tax scenario — autónomo with IRPF retention
// ---------------------------------------------------------------------------

describe('Spanish tax scenario — autónomo invoice', () => {
  it('calculates a typical freelance invoice correctly', () => {
    // A freelance developer invoices €5,000 for development work
    // 21% IVA, 15% IRPF retention (professional services)
    const result = calculateInvoice([
      {
        description: 'Desarrollo de aplicación web',
        quantity: 40,
        unitPrice: 125, // €125/hour, 40 hours
        discountPct: 0,
        ivaPercent: 21,
        irpfPercent: 15,
      },
    ]);

    // lineTotal = 40 × 125 = 5000
    // ivaAmount = 5000 × 21% = 1050
    // irpfAmount = 5000 × 15% = 750
    // subtotal = 5000
    // grandTotal = 5000 + 1050 - 750 = 5300
    expect(result.subtotal).toBe(5000);
    expect(result.ivaTotal).toBe(1050);
    expect(result.irpfTotal).toBe(750);
    expect(result.grandTotal).toBe(5300);

    // Tax summary checks
    expect(result.taxSummary).toHaveLength(2);
    const iva21 = result.taxSummary.find((t) => t.taxType === 'iva');
    const irpf15 = result.taxSummary.find((t) => t.taxType === 'irpf');
    expect(iva21!.taxableBase).toBe(5000);
    expect(iva21!.taxAmount).toBe(1050);
    expect(irpf15!.taxableBase).toBe(5000);
    expect(irpf15!.taxAmount).toBe(750);
  });

  it('calculates invoice with mixed IVA rates (21% + 10%)', () => {
    // A consultant sells services (21% IVA) and books (10% IVA)
    const result = calculateInvoice([
      { description: 'Consultoría', quantity: 20, unitPrice: 80, discountPct: 0, ivaPercent: 21, irpfPercent: 15 },
      { description: 'Manual técnico', quantity: 50, unitPrice: 15, discountPct: 0, ivaPercent: 10, irpfPercent: 0 },
    ]);

    // Line 1: 20 × 80 = 1600, iva = 336, irpf = 240
    // Line 2: 50 × 15 = 750, iva = 75, irpf = 0
    // subtotal = 2350, ivaTotal = 411, irpfTotal = 240
    // grandTotal = 2350 + 411 - 240 = 2521

    expect(result.subtotal).toBe(2350);
    expect(result.ivaTotal).toBe(411);
    expect(result.irpfTotal).toBe(240);
    expect(result.grandTotal).toBe(2521);

    // Tax summary: 3 entries (iva:21, iva:10, irpf:15)
    expect(result.taxSummary).toHaveLength(3);
  });

  it('calculates invoice with discount', () => {
    // Volume discount scenario
    const result = calculateInvoice([
      { description: 'Servicio premium', quantity: 10, unitPrice: 200, discountPct: 5, ivaPercent: 21, irpfPercent: 0 },
    ]);

    // lineTotal = 10 × 200 × 0.95 = 1900
    // ivaAmount = 1900 × 21% = 399
    // subtotal = 1900, discountTotal = 100
    // grandTotal = 1900 + 399 = 2299

    expect(result.subtotal).toBe(1900);
    expect(result.ivaTotal).toBe(399);
    expect(result.discountTotal).toBe(100);
    expect(result.grandTotal).toBe(2299);
  });
});