/**
 * FactuTrust — Supabase Edge Function: invoice-engine
 *
 * A Supabase Edge Function that accepts invoice line item inputs
 * and returns fully computed invoice totals, tax summaries, and
 * invoice number generation.
 *
 * Endpoints (POST):
 *   /invoice-engine/calculate    → Calculate invoice totals from line items
 *   /invoice-engine/invoice-number → Generate next invoice number
 *
 * Request/Response format: JSON
 *
 * This handler is designed for Supabase's Deno runtime but is written
 * as a standard module so the core logic can be reused outside Edge
 * Functions (e.g., in client-side preview calculations).
 *
 * Usage:
 *   POST /functions/v1/invoice-engine
 *   Body: { action: "calculate", lines: [...] }
 */

import { calculateInvoice, validateInvoiceInputs } from './calculator.ts';
import { generateInvoiceNumber } from './invoice-number.ts';
import type { InvoiceLineInput, InvoiceCalculation, InvoiceNumberInput, InvoiceNumberResult } from './types.ts';

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export type InvoiceEngineAction =
  | 'calculate'
  | 'invoice-number';

export interface CalculateRequest {
  action: 'calculate';
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    ivaPercent: number;
    irpfPercent: number;
  }>;
}

export interface InvoiceNumberRequest {
  action: 'invoice-number';
  prefix: string;
  year: number;
  lastInvoiceNo: number;
}

export type InvoiceEngineRequest = CalculateRequest | InvoiceNumberRequest;

export interface InvoiceEngineSuccessResponse {
  success: true;
  data: InvoiceCalculation | InvoiceNumberResult;
}

export interface InvoiceEngineErrorResponse {
  success: false;
  error: string;
  details?: Array<{ field: string; message: string }>;
}

export type InvoiceEngineResponse =
  | InvoiceEngineSuccessResponse
  | InvoiceEngineErrorResponse;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * Handle a "calculate" request — compute invoice totals from line items.
 */
function handleCalculate(req: CalculateRequest): InvoiceEngineResponse {
  // Validate inputs
  const validationErrors = validateInvoiceInputs(req.lines as Partial<InvoiceLineInput>[]);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: 'Validation failed',
      details: validationErrors,
    };
  }

  // Perform calculation
  const result: InvoiceCalculation = calculateInvoice(
    req.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      ivaPercent: l.ivaPercent as 0 | 4 | 10 | 21,
      irpfPercent: l.irpfPercent as 0 | 7 | 15,
    })),
  );

  return {
    success: true,
    data: result,
  };
}

/**
 * Handle an "invoice-number" request — generate the next invoice number.
 */
function handleInvoiceNumber(
  req: InvoiceNumberRequest,
): InvoiceEngineResponse {
  try {
    const input: InvoiceNumberInput = {
      prefix: req.prefix,
      year: req.year,
      lastInvoiceNo: req.lastInvoiceNo,
    };

    const result: InvoiceNumberResult = generateInvoiceNumber(input);

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error generating invoice number',
    };
  }
}

// ---------------------------------------------------------------------------
// Main request router
// ---------------------------------------------------------------------------

/**
 * Main handler for the Edge Function.
 * Routes requests by action type.
 */
export function handleRequest(
  req: InvoiceEngineRequest,
): InvoiceEngineResponse {
  switch (req.action) {
    case 'calculate':
      return handleCalculate(req);
    case 'invoice-number':
      return handleInvoiceNumber(req);
    default:
      return {
        success: false,
        error: `Unknown action: ${(req as any).action}. Supported actions: "calculate", "invoice-number"`,
      };
  }
}

/**
 * Supabase Edge Functions default export (Deno).
 *
 * This is the entry point called by the Supabase runtime.
 * For local testing / non-Deno environments, import handleRequest directly.
 */
export default async function (req: Request): Promise<Response> {
  // CORS headers for Supabase Edge Functions
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Method ${req.method} not allowed. Use POST.`,
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const body: InvoiceEngineRequest = await req.json() as InvoiceEngineRequest;
    const result = handleRequest(body);

    const status = result.success ? 200 : 400;

    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}