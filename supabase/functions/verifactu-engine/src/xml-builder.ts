/**
 * FactuTrust — VeriFactu XML Schema Generator
 *
 * Generates VeriFactu-compliant XML strings using xmlbuilder2.
 * Supports:
 *   - RegistroAlta (alta) — standard invoice registration
 *   - RegistroRectificativa (rectification) — corrected invoices
 *   - RegistroCancelacion (cancellation) — void invoices
 *
 * Output matches AEAT S33L/S34L schema specifications.
 */

import { create } from 'xmlbuilder2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VfOperationType = 'alta' | 'rectificativa' | 'cancelacion';

export interface VfTaxDetail {
  taxableBase: number;
  taxPercent: number;
  taxAmount: number;
}

export interface VfAltaParams {
  /** Issuer's Spanish tax ID (NIF/CIF/DNI) */
  issuerNif: string;
  /** Invoice number (e.g. "FAC-2025-0001") */
  invoiceNumber: string;
  /** Invoice series letter */
  series: string;
  /** Issue date (ISO date string "YYYY-MM-DD") */
  issueDate: string;
  /** Operation/accrual date */
  operationDate: string;
  /** Grand total in EUR */
  importeTotal: number;
  /** IVA breakdown — one entry per tax rate */
  desgloseIva: VfTaxDetail[];
  /** Customer/contraparte info */
  clientName: string;
  clientNif: string;
  /** Optional: invoice description */
  description?: string;
}

export interface VfRectificativaParams extends VfAltaParams {
  /** Original invoice number being rectified */
  originalInvoiceNumber: string;
  /** Original invoice issue date */
  originalIssueDate: string;
}

export interface VfCancelacionParams {
  /** Issuer's NIF */
  issuerNif: string;
  /** Invoice number being cancelled */
  invoiceNumber: string;
  /** Invoice series */
  series: string;
  /** Original issue date */
  issueDate: string;
}

// ---------------------------------------------------------------------------
// Number formatter (always 2 decimal places, Spanish locale format)
// ---------------------------------------------------------------------------

/**
 * Format a number for Spanish XML: always 2 decimal places, period as decimal separator.
 * e.g. 1210 → "1210.00", 21 → "21.00"
 */
function fmtMoney(value: number): string {
  return value.toFixed(2);
}

/**
 * Format tax percent: 21 → "21.00", 7 → "7.00"
 */
function fmtPercent(value: number): string {
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------
// XML Builders
// ---------------------------------------------------------------------------

/**
 * Build a complete VeriFactu "RegistroAlta" XML string using xmlbuilder2's
 * object-based approach which handles nesting correctly.
 *
 * @param params - Invoice data and tax breakdown
 * @returns Pretty-printed XML string
 */
export function buildAltaXML(params: VfAltaParams): string {
  // Build the XML via xmlbuilder2's object API
  const detalleIvaList = params.desgloseIva.map((d) => ({
    DetalleIVA: {
      BaseImponible: fmtMoney(d.taxableBase),
      TipoImpositivo: fmtPercent(d.taxPercent),
      CuotaIVA: fmtMoney(d.taxAmount),
    },
  }));

  const desgloseIva =
    detalleIvaList.length === 1
      ? detalleIvaList[0]
      : detalleIvaList;

  const doc = create({
    RegistroAlta: {
      IDVersion: '1.0',
      Cabecera: {
        NIF: params.issuerNif,
        IDFactura: {
          NumSerieFactura: params.invoiceNumber,
          FechaExpedicionFactura: params.issueDate,
        },
      },
      Factura: {
        ImporteTotal: fmtMoney(params.importeTotal),
        DesgloseIVA: desgloseIva,
        Contraparte: {
          NombreRazon: params.clientName,
          NIF: params.clientNif,
        },
      },
    },
  });

  return doc.end({ prettyPrint: true, headless: false });
}

/**
 * Build a VeriFactu "RegistroRectificativa" XML string.
 * Used for corrective invoices referencing the original.
 */
export function buildRectificativaXML(params: VfRectificativaParams): string {
  const detalleIvaList = params.desgloseIva.map((d) => ({
    DetalleIVA: {
      BaseImponible: fmtMoney(d.taxableBase),
      TipoImpositivo: fmtPercent(d.taxPercent),
      CuotaIVA: fmtMoney(d.taxAmount),
    },
  }));

  const desgloseIva =
    detalleIvaList.length === 1
      ? detalleIvaList[0]
      : detalleIvaList;

  const doc = create({
    RegistroRectificativa: {
      IDVersion: '1.0',
      Cabecera: {
        NIF: params.issuerNif,
        IDFactura: {
          NumSerieFactura: params.invoiceNumber,
          FechaExpedicionFactura: params.issueDate,
        },
      },
      FacturaRectificada: {
        NumSerieFacturaRectificada: params.originalInvoiceNumber,
        FechaExpedicionFacturaRectificada: params.originalIssueDate,
      },
      Factura: {
        ImporteTotal: fmtMoney(params.importeTotal),
        DesgloseIVA: desgloseIva,
        Contraparte: {
          NombreRazon: params.clientName,
          NIF: params.clientNif,
        },
      },
    },
  });

  return doc.end({ prettyPrint: true, headless: false });
}

/**
 * Build a VeriFactu "RegistroCancelacion" XML string.
 * Minimal — only identifies the invoice being cancelled.
 */
export function buildCancelacionXML(params: VfCancelacionParams): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('RegistroCancelacion')
      .ele('IDVersion').txt('1.0').up()
      .ele('Cabecera')
        .ele('NIF').txt(params.issuerNif).up()
        .ele('IDFactura')
          .ele('NumSerieFactura').txt(params.invoiceNumber).up()
          .ele('FechaExpedicionFactura').txt(params.issueDate).up()
        .up()
      .up()
    .up();

  return doc.end({ prettyPrint: true, headless: false });
}