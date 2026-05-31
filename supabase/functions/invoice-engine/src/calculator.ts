/**
 * FactuTrust — Invoice Calculation Engine
 *
 * Pure functions implementing all invoice math formulas from the
 * Phase 1 architecture specification. No side effects, no I/O.
 *
 * Rounding rule (standard Spanish invoice practice):
 *   All monetary amounts are rounded to 2 decimal places
 *   using "round half up" (Math.round-based).
 *
 * Formulas implemented:
 *   - line_total = qty × unit_price × (1 − discount_pct / 100)
 *   - iva_amount  = line_total × (iva_percent / 100)
 *   - irpf_amount = line_total × (irpf_percent / 100)
 *   - subtotal    = SUM(line_total)
 *   - iva_total   = SUM(iva_amount)
 *   - irpf_total  = SUM(irpf_amount)
 *   - grand_total = subtotal + iva_total − irpf_total
 *   - Tax summary per (tax_type, tax_percent) grouping
 */

import type {
  InvoiceLineInput,
  InvoiceLine,
  InvoiceCalculation,
  TaxSummaryEntry,
} from './types.ts';

// ---------------------------------------------------------------------------
// Precision helpers
// ---------------------------------------------------------------------------

/**
 * Round a monetary value to 2 decimal places using banker's rounding
 * (standard for Spanish invoicing). Supabase/PostgreSQL DECIMAL(12,2)
 * stores at this precision.
 *
 * Edge cases:
 *   - Negative values are also rounded correctly.
 *   - Very small values (< 0.005) round to 0.
 *   - NaN/Infinity inputs are caught upstream by validation.
 */
export function roundMoney(value: number): number {
  // Use exponential notation to avoid floating-point precision issues
  // with values like 1.005. This reliably rounds half-up to 2 decimal places.
  const rounded = Number(Math.round(Number(value + 'e+2')) + 'e-2');
  return rounded;
}

/**
 * Sum an array of numbers and round to 2 decimal places.
 */
export function sumAndRound(values: number[]): number {
  if (values.length === 0) return 0;
  const raw = values.reduce((a, b) => a + b, 0);
  return roundMoney(raw);
}

// ---------------------------------------------------------------------------
// Line item calculations
// ---------------------------------------------------------------------------

/**
 * Calculate the line total before tax for a single invoice line.
 *
 * formula: lineTotal = quantity × unitPrice × (1 − discountPct / 100)
 *
 * @throws {Error} if quantity, unitPrice, or discountPct are negative
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPct: number,
): number {
  if (quantity < 0) {
    throw new Error(`Quantity cannot be negative: ${quantity}`);
  }
  if (unitPrice < 0) {
    throw new Error(`Unit price cannot be negative: ${unitPrice}`);
  }
  if (discountPct < 0 || discountPct > 100) {
    throw new Error(`Discount percentage must be 0–100: ${discountPct}`);
  }

  const raw = quantity * unitPrice * (1 - discountPct / 100);
  return roundMoney(raw);
}

/**
 * Calculate the IVA amount for a line.
 *
 * formula: ivaAmount = lineTotal × (ivaPercent / 100)
 *
 * @throws {Error} if ivaPercent is negative
 */
export function calculateIvaAmount(
  lineTotal: number,
  ivaPercent: number,
): number {
  if (ivaPercent < 0) {
    throw new Error(`IVA percent cannot be negative: ${ivaPercent}`);
  }
  return roundMoney(lineTotal * (ivaPercent / 100));
}

/**
 * Calculate the IRPF retention amount for a line.
 *
 * formula: irpfAmount = lineTotal × (irpfPercent / 100)
 *
 * @throws {Error} if irpfPercent is negative
 */
export function calculateIrpfAmount(
  lineTotal: number,
  irpfPercent: number,
): number {
  if (irpfPercent < 0) {
    throw new Error(`IRPF percent cannot be negative: ${irpfPercent}`);
  }
  return roundMoney(lineTotal * (irpfPercent / 100));
}

/**
 * Compute a single fully-calculated line from raw input.
 */
export function computeLine(input: InvoiceLineInput): InvoiceLine {
  const lineTotal = calculateLineTotal(
    input.quantity,
    input.unitPrice,
    input.discountPct,
  );
  const ivaAmount = calculateIvaAmount(lineTotal, input.ivaPercent);
  const irpfAmount = calculateIrpfAmount(lineTotal, input.irpfPercent);

  return {
    ...input,
    lineTotal,
    ivaAmount,
    irpfAmount,
  };
}

// ---------------------------------------------------------------------------
// Invoice-level aggregation
// ---------------------------------------------------------------------------

/**
 * Calculate the discount amount for a single line.
 *
 * formula: discountAmount = quantity × unitPrice × (discountPct / 100)
 */
export function calculateDiscountAmount(
  quantity: number,
  unitPrice: number,
  discountPct: number,
): number {
  return roundMoney(quantity * unitPrice * (discountPct / 100));
}

/**
 * Compute all invoice totals and tax summaries from an array of line inputs.
 *
 * Steps:
 *   1. Compute each line (lineTotal, ivaAmount, irpfAmount).
 *   2. Aggregate: subtotal, ivaTotal, irpfTotal, discountTotal.
 *   3. Compute grandTotal = subtotal + ivaTotal − irpfTotal.
 *   4. Group tax summary by (tax_type, tax_percent).
 *
 * @throws {Error} if any input line is invalid (propagated from computeLine)
 */
export function calculateInvoice(
  inputs: InvoiceLineInput[],
): InvoiceCalculation {
  if (inputs.length === 0) {
    return {
      lines: [],
      subtotal: 0,
      ivaTotal: 0,
      irpfTotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      taxSummary: [],
    };
  }

  // Step 1: Compute each line
  const lines: InvoiceLine[] = inputs.map(computeLine);

  // Step 2: Aggregate totals
  const subtotal = sumAndRound(lines.map((l) => l.lineTotal));
  const ivaTotal = sumAndRound(lines.map((l) => l.ivaAmount));
  const irpfTotal = sumAndRound(lines.map((l) => l.irpfAmount));
  const discountTotal = sumAndRound(
    inputs.map((l) => calculateDiscountAmount(l.quantity, l.unitPrice, l.discountPct)),
  );

  // Step 3: Grand total
  const grandTotal = roundMoney(subtotal + ivaTotal - irpfTotal);

  // Step 4: Tax summary grouping
  const taxSummary = buildTaxSummary(lines);

  return {
    lines,
    subtotal,
    ivaTotal,
    irpfTotal,
    discountTotal,
    grandTotal,
    taxSummary,
  };
}

// ---------------------------------------------------------------------------
// Tax summary grouping
// ---------------------------------------------------------------------------

/**
 * Build tax summary grouped by unique (tax_type, tax_percent).
 *
 * For each unique (taxType, taxPercent) combination found across lines:
 *   - IVA groups: taxableBase = sum of lineTotal for lines with that ivaPercent
 *                 taxAmount   = sum of ivaAmount for lines with that ivaPercent
 *   - IRPF groups: taxableBase = sum of lineTotal for lines with that irpfPercent
 *                  taxAmount   = sum of irpfAmount for lines with that irpfPercent
 */
export function buildTaxSummary(lines: InvoiceLine[]): TaxSummaryEntry[] {
  const map = new Map<string, TaxSummaryEntry>();

  for (const line of lines) {
    // IVA entry
    if (line.ivaPercent > 0) {
      const ivaKey = `iva:${line.ivaPercent}`;
      const existingIva = map.get(ivaKey);
      if (existingIva) {
        existingIva.taxableBase = roundMoney(existingIva.taxableBase + line.lineTotal);
        existingIva.taxAmount = roundMoney(existingIva.taxAmount + line.ivaAmount);
      } else {
        map.set(ivaKey, {
          taxType: 'iva',
          taxPercent: line.ivaPercent,
          taxableBase: roundMoney(line.lineTotal),
          taxAmount: roundMoney(line.ivaAmount),
        });
      }
    }

    // IRPF entry
    if (line.irpfPercent > 0) {
      const irpfKey = `irpf:${line.irpfPercent}`;
      const existingIrpf = map.get(irpfKey);
      if (existingIrpf) {
        existingIrpf.taxableBase = roundMoney(existingIrpf.taxableBase + line.lineTotal);
        existingIrpf.taxAmount = roundMoney(existingIrpf.taxAmount + line.irpfAmount);
      } else {
        map.set(irpfKey, {
          taxType: 'irpf',
          taxPercent: line.irpfPercent,
          taxableBase: roundMoney(line.lineTotal),
          taxAmount: roundMoney(line.irpfAmount),
        });
      }
    }

    // Exempt items (ivaPercent === 0 and irpfPercent === 0):
    // We do not create a tax summary entry for exempt lines,
    // though the subtotal and grand total reflect them.
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Due date calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the default due date (net 30 days from issue date).
 *
 * Returns a Date object. If an explicit dueDate is provided, returns that.
 *
 * formula: dueDate = issueDate + 30 days (if no explicit due date)
 */
export function calculateDueDate(
  issueDate: Date,
  explicitDueDate?: Date | null,
): Date {
  if (explicitDueDate) {
    return new Date(explicitDueDate);
  }

  const due = new Date(issueDate);
  due.setDate(due.getDate() + 30);
  return due;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a single InvoiceLineInput.
 * Returns an array of ValidationError objects (empty = valid).
 */
export function validateLineInput(
  input: Partial<InvoiceLineInput>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.description || input.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (input.quantity === undefined || input.quantity === null) {
    errors.push({ field: 'quantity', message: 'Quantity is required' });
  } else if (typeof input.quantity !== 'number' || isNaN(input.quantity)) {
    errors.push({ field: 'quantity', message: 'Quantity must be a number' });
  } else if (input.quantity < 0) {
    errors.push({ field: 'quantity', message: 'Quantity cannot be negative' });
  }

  if (input.unitPrice === undefined || input.unitPrice === null) {
    errors.push({ field: 'unitPrice', message: 'Unit price is required' });
  } else if (typeof input.unitPrice !== 'number' || isNaN(input.unitPrice)) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be a number' });
  } else if (input.unitPrice < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price cannot be negative' });
  }

  if (input.discountPct === undefined || input.discountPct === null) {
    errors.push({ field: 'discountPct', message: 'Discount percentage is required' });
  } else if (typeof input.discountPct !== 'number' || isNaN(input.discountPct)) {
    errors.push({
      field: 'discountPct',
      message: 'Discount percentage must be a number',
    });
  } else if (input.discountPct < 0 || input.discountPct > 100) {
    errors.push({
      field: 'discountPct',
      message: 'Discount percentage must be between 0 and 100',
    });
  }

  if (input.ivaPercent === undefined || input.ivaPercent === null) {
    errors.push({ field: 'ivaPercent', message: 'IVA percent is required' });
  } else if (typeof input.ivaPercent !== 'number' || isNaN(input.ivaPercent)) {
    errors.push({ field: 'ivaPercent', message: 'IVA percent must be a number' });
  } else if (input.ivaPercent < 0) {
    errors.push({ field: 'ivaPercent', message: 'IVA percent cannot be negative' });
  } else if (![0, 4, 10, 21].includes(input.ivaPercent)) {
    errors.push({
      field: 'ivaPercent',
      message: `Invalid IVA rate: ${input.ivaPercent}. Must be 0, 4, 10, or 21`,
    });
  }

  if (input.irpfPercent === undefined || input.irpfPercent === null) {
    errors.push({ field: 'irpfPercent', message: 'IRPF percent is required' });
  } else if (typeof input.irpfPercent !== 'number' || isNaN(input.irpfPercent)) {
    errors.push({ field: 'irpfPercent', message: 'IRPF percent must be a number' });
  } else if (input.irpfPercent < 0) {
    errors.push({ field: 'irpfPercent', message: 'IRPF percent cannot be negative' });
  } else if (![0, 7, 15].includes(input.irpfPercent)) {
    errors.push({
      field: 'irpfPercent',
      message: `Invalid IRPF rate: ${input.irpfPercent}. Must be 0, 7, or 15`,
    });
  }

  return errors;
}

/**
 * Validate all line inputs for an invoice.
 * Returns a flat array of all validation errors.
 */
export function validateInvoiceInputs(
  inputs: Partial<InvoiceLineInput>[],
): ValidationError[] {
  if (inputs.length === 0) {
    return [{ field: 'lines', message: 'At least one line item is required' }];
  }

  return inputs.flatMap((input, index) =>
    validateLineInput(input).map((err) => ({
      ...err,
      field: `lines[${index}].${err.field}`,
    })),
  );
}