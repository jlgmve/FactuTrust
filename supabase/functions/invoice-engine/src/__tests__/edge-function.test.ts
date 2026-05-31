/**
 * FactuTrust — Edge Function Handler: Unit Tests
 *
 * Tests cover:
 *   - handleRequest routing for "calculate" and "invoice-number" actions
 *   - Error responses for validation failures
 *   - Error responses for unknown actions
 */

import { handleRequest } from '../edge-function.js';
import type {
  InvoiceEngineSuccessResponse,
  InvoiceCalculation,
  InvoiceNumberResult,
} from '../edge-function.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertSuccess(
  response: unknown,
): asserts response is InvoiceEngineSuccessResponse {
  const r = response as InvoiceEngineSuccessResponse;
  expect(r.success).toBe(true);
}

function getData(response: unknown): InvoiceCalculation | InvoiceNumberResult {
  assertSuccess(response);
  return (response as InvoiceEngineSuccessResponse).data;
}

// ---------------------------------------------------------------------------
// handleRequest
// ---------------------------------------------------------------------------

describe('handleRequest — calculate action', () => {
  it('returns success with computed invoice', () => {
    const response = handleRequest({
      action: 'calculate',
      lines: [
        {
          description: 'Servicio',
          quantity: 1,
          unitPrice: 1000,
          discountPct: 0,
          ivaPercent: 21,
          irpfPercent: 15,
        },
      ],
    });

    const data = getData(response) as InvoiceCalculation;
    expect(data.subtotal).toBe(1000);
    expect(data.ivaTotal).toBe(210);
    expect(data.irpfTotal).toBe(150);
    expect(data.grandTotal).toBe(1060);
    expect(data.lines).toHaveLength(1);
    expect(data.taxSummary).toHaveLength(2); // iva:21 and irpf:15
  });

  it('returns success for multi-line invoice', () => {
    const response = handleRequest({
      action: 'calculate',
      lines: [
        { description: 'Item A', quantity: 2, unitPrice: 50, discountPct: 0, ivaPercent: 21, irpfPercent: 0 },
        { description: 'Item B', quantity: 3, unitPrice: 30, discountPct: 10, ivaPercent: 10, irpfPercent: 0 },
      ],
    });

    const data = getData(response) as InvoiceCalculation;
    // Line A: 2 × 50 = 100, iva = 21
    // Line B: 3 × 30 × 0.9 = 81, iva = 8.10
    // subtotal = 181, ivaTotal = 29.10, grandTotal = 210.10
    expect(data.subtotal).toBe(181);
    expect(data.ivaTotal).toBe(29.10);
    expect(data.grandTotal).toBe(210.10);
  });

  it('returns validation error for empty lines', () => {
    const response = handleRequest({
      action: 'calculate',
      lines: [],
    });

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error).toBe('Validation failed');
      expect(response.details).toBeDefined();
      expect(response.details!.some((d) => d.field === 'lines')).toBe(true);
    }
  });

  it('returns validation error for invalid line', () => {
    const response = handleRequest({
      action: 'calculate',
      lines: [
        {
          description: '',
          quantity: -1,
          unitPrice: 100,
          discountPct: 0,
          ivaPercent: 21,
          irpfPercent: 0,
        },
      ],
    });

    expect(response.success).toBe(false);
  });
});

describe('handleRequest — invoice-number action', () => {
  it('generates next invoice number', () => {
    const response = handleRequest({
      action: 'invoice-number',
      prefix: 'FAC-',
      year: 2025,
      lastInvoiceNo: 42,
    });

    const data = getData(response) as InvoiceNumberResult;
    expect(data.invoiceNumber).toBe('FAC-2025-0043');
    expect(data.nextInvoiceNo).toBe(43);
  });

  it('returns error for invalid prefix', () => {
    const response = handleRequest({
      action: 'invoice-number',
      prefix: '',
      year: 2025,
      lastInvoiceNo: 0,
    });

    expect(response.success).toBe(false);
  });

  it('returns error for invalid year', () => {
    const response = handleRequest({
      action: 'invoice-number',
      prefix: 'FAC-',
      year: 1999,
      lastInvoiceNo: 0,
    });

    expect(response.success).toBe(false);
  });
});

describe('handleRequest — unknown action', () => {
  it('returns error for unrecognized action', () => {
    const response = handleRequest({
      action: 'nonexistent' as any,
    } as any);

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error).toContain('Unknown action');
    }
  });
});