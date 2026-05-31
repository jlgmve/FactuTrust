/**
 * FactuTrust — VeriFactu XML Builder: Unit Tests
 */

import { buildAltaXML, buildRectificativaXML, buildCancelacionXML } from '../xml-builder.ts';

describe('buildAltaXML', () => {
  it('generates a valid RegistroAlta XML string', () => {
    const xml = buildAltaXML({
      issuerNif: 'B12345678',
      invoiceNumber: 'FAC-2025-0001',
      series: 'A',
      issueDate: '2025-01-15',
      operationDate: '2025-01-15',
      importeTotal: 1210.00,
      desgloseIva: [
        { taxableBase: 1000.00, taxPercent: 21.00, taxAmount: 210.00 },
      ],
      clientName: 'Client Name',
      clientNif: 'Y1234567X',
    });

    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<RegistroAlta>');
    expect(xml).toContain('<NIF>B12345678</NIF>');
    expect(xml).toContain('<NumSerieFactura>FAC-2025-0001</NumSerieFactura>');
    expect(xml).toContain('<FechaExpedicionFactura>2025-01-15</FechaExpedicionFactura>');
    expect(xml).toContain('<ImporteTotal>1210.00</ImporteTotal>');
    expect(xml).toContain('<BaseImponible>1000.00</BaseImponible>');
    expect(xml).toContain('<TipoImpositivo>21.00</TipoImpositivo>');
    expect(xml).toContain('<CuotaIVA>210.00</CuotaIVA>');
    expect(xml).toContain('<NombreRazon>Client Name</NombreRazon>');
    expect(xml).toContain('<NIF>Y1234567X</NIF>');
  });

  it('handles multiple IVA rates', () => {
    const xml = buildAltaXML({
      issuerNif: 'B12345678',
      invoiceNumber: 'FAC-2025-0002',
      series: 'A',
      issueDate: '2025-01-20',
      operationDate: '2025-01-20',
      importeTotal: 1885.00,
      desgloseIva: [
        { taxableBase: 1000.00, taxPercent: 21.00, taxAmount: 210.00 },
        { taxableBase: 500.00, taxPercent: 10.00, taxAmount: 50.00 },
      ],
      clientName: 'Another Client',
      clientNif: 'Z9876543X',
    });

    expect(xml).toContain('<DetalleIVA>');
    // Should have 2 DetalleIVA blocks
    const matches = xml.match(/<DetalleIVA>/g);
    expect(matches).toHaveLength(2);
  });
});

describe('buildRectificativaXML', () => {
  it('generates a valid RegistroRectificativa XML string', () => {
    const xml = buildRectificativaXML({
      issuerNif: 'B12345678',
      invoiceNumber: 'FAC-2025-0003',
      series: 'A',
      issueDate: '2025-02-01',
      operationDate: '2025-02-01',
      importeTotal: 500.00,
      desgloseIva: [
        { taxableBase: 413.22, taxPercent: 21.00, taxAmount: 86.78 },
      ],
      clientName: 'Client',
      clientNif: 'X1234567X',
      originalInvoiceNumber: 'FAC-2025-0001',
      originalIssueDate: '2025-01-15',
    });

    expect(xml).toContain('<RegistroRectificativa>');
    expect(xml).toContain('<NumSerieFacturaRectificada>FAC-2025-0001</NumSerieFacturaRectificada>');
    expect(xml).toContain('<FechaExpedicionFacturaRectificada>2025-01-15</FechaExpedicionFacturaRectificada>');
  });
});

describe('buildCancelacionXML', () => {
  it('generates a valid RegistroCancelacion XML string', () => {
    const xml = buildCancelacionXML({
      issuerNif: 'B12345678',
      invoiceNumber: 'FAC-2025-0001',
      series: 'A',
      issueDate: '2025-01-15',
    });

    expect(xml).toContain('<RegistroCancelacion>');
    expect(xml).toContain('<NIF>B12345678</NIF>');
    expect(xml).toContain('<NumSerieFactura>FAC-2025-0001</NumSerieFactura>');
    expect(xml).not.toContain('<ImporteTotal>');
    expect(xml).not.toContain('<Contraparte>');
  });
});