/**
 * FactuTrust — Invoice Engine Types
 *
 * Core domain types for invoice line items, tax summaries,
 * and calculation inputs/outputs.
 *
 * All monetary values are stored as numbers (decimal precision
 * handled by rounding rules defined in the spec).
 */

/** Supported Spanish tax regimes */
export type TaxType = 'iva' | 'irpf' | 'exempt';

/** Known IVA (VAT) rates in Spain */
export type IvaRate = 21 | 10 | 4 | 0;

/** Known IRPF retention rates for professionals */
export type IrpfRate = 15 | 7 | 0;

/** Status of an invoice in its lifecycle */
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'cancelled'
  | 'rectified';

/**
 * Input line item — the raw data a user provides
 * when adding a product/service to an invoice.
 */
export interface InvoiceLineInput {
  /** Free-text description of the line item */
  description: string;
  /** Quantity (supports fractional quantities like 2.5 hours) */
  quantity: number;
  /** Unit price in EUR (excl. tax) */
  unitPrice: number;
  /** Discount percentage applied to the line (e.g. 10 for 10%) */
  discountPct: number;
  /** IVA (VAT) rate for this line (21, 10, 4, 0) */
  ivaPercent: IvaRate;
  /** IRPF retention rate for this line (15, 7, 0) */
  irpfPercent: IrpfRate;
}

/**
 * Computed line item — the result after applying
 * quantity, discount, IVA, and IRPF calculations.
 */
export interface InvoiceLine extends InvoiceLineInput {
  /** Line total after quantity × unit price × (1 − discount/100) */
  lineTotal: number;
  /** IVA amount for this line */
  ivaAmount: number;
  /** IRPF amount for this line */
  irpfAmount: number;
}

/**
 * Tax summary per tax rate combination.
 * One entry per unique (tax_type, tax_percent) pair.
 */
export interface TaxSummaryEntry {
  taxType: TaxType;
  taxPercent: number;
  taxableBase: number;
  taxAmount: number;
}

/**
 * Complete invoice calculation result.
 */
export interface InvoiceCalculation {
  /** Computed line items with all fields */
  lines: InvoiceLine[];
  /** Sum of all line totals before tax */
  subtotal: number;
  /** Total IVA across all lines */
  ivaTotal: number;
  /** Total IRPF across all lines */
  irpfTotal: number;
  /** Discount amount across all lines */
  discountTotal: number;
  /** Final amount payable: subtotal + ivaTotal − irpfTotal */
  grandTotal: number;
  /** Tax summary grouped by (tax_type, tax_percent) */
  taxSummary: TaxSummaryEntry[];
}

/**
 * Input to generate the next invoice number for a profile.
 */
export interface InvoiceNumberInput {
  /** Invoice prefix (e.g. "FAC-") */
  prefix: string;
  /** Year segment (e.g. 2025) */
  year: number;
  /** Last invoice number used (0 if none) */
  lastInvoiceNo: number;
}

/**
 * Result of invoice number generation.
 */
export interface InvoiceNumberResult {
  /** Human-readable invoice number (e.g. "FAC-2025-0001") */
  invoiceNumber: string;
  /** Next numeric sequence value */
  nextInvoiceNo: number;
}