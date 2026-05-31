// Phase 3a: Quick verification of XML Builder
import { buildAltaXML, buildRectificativaXML, buildCancelacionXML } from './src/xml-builder.ts';

// Test Alta
const alta = buildAltaXML({
  issuerNif: 'B12345678',
  invoiceNumber: 'FAC-2025-0001',
  series: 'A',
  issueDate: '2025-01-15',
  operationDate: '2025-01-15',
  importeTotal: 1210.00,
  desgloseIva: [{ taxableBase: 1000.00, taxPercent: 21.00, taxAmount: 210.00 }],
  clientName: 'Cliente Ejemplo',
  clientNif: 'Y1234567X',
});

console.log('=== REGISTRO ALTA ===');
console.log(alta);
console.log();

// Verify
const checks = [
  ['XML declaration', alta.includes('<?xml version="1.0" encoding="UTF-8"?>')],
  ['RegistroAlta root', alta.includes('<RegistroAlta>')],
  ['NIF', alta.includes('<NIF>B12345678</NIF>')],
  ['Invoice number', alta.includes('<NumSerieFactura>FAC-2025-0001</NumSerieFactura>')],
  ['Issue date', alta.includes('<FechaExpedicionFactura>2025-01-15')],
  ['ImporteTotal', alta.includes('<ImporteTotal>1210.00</ImporteTotal>')],
  ['BaseImponible', alta.includes('<BaseImponible>1000.00</BaseImponible>')],
  ['TipoImpositivo', alta.includes('<TipoImpositivo>21.00</TipoImpositivo>')],
  ['CuotaIVA', alta.includes('<CuotaIVA>210.00</CuotaIVA>')],
  ['Contraparte name', alta.includes('<NombreRazon>Cliente Ejemplo</NombreRazon>')],
  ['Contraparte NIF', alta.includes('<NIF>Y1234567X</NIF>')],
];

let pass = 0, fail = 0;
checks.forEach(([name, ok]) => {
  if (ok) { pass++; process.stdout.write('.'); }
  else { fail++; console.error(`\nFAIL: ${name}`); }
});

// Test multiple IVA rates
const multiIva = buildAltaXML({
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
  clientName: 'Client B',
  clientNif: 'Z9876543X',
});
const detalleMatches = multiIva.match(/<DetalleIVA>/g);
if (detalleMatches && detalleMatches.length === 2) { pass++; process.stdout.write('.'); }
else { fail++; console.error('\nFAIL: multi IVA rates'); }

// Test Rectificativa
const rectif = buildRectificativaXML({
  issuerNif: 'B12345678',
  invoiceNumber: 'FAC-2025-0003',
  series: 'A',
  issueDate: '2025-02-01',
  operationDate: '2025-02-01',
  importeTotal: 500.00,
  desgloseIva: [{ taxableBase: 413.22, taxPercent: 21.00, taxAmount: 86.78 }],
  clientName: 'Client',
  clientNif: 'X1234567X',
  originalInvoiceNumber: 'FAC-2025-0001',
  originalIssueDate: '2025-01-15',
});
if (rectif.includes('<RegistroRectificativa>')) { pass++; process.stdout.write('.'); }
else { fail++; console.error('\nFAIL: rectificativa tag'); }
if (rectif.includes('<NumSerieFacturaRectificada>FAC-2025-0001<')) { pass++; process.stdout.write('.'); }
else { fail++; console.error('\nFAIL: rectificativa original ref'); }

// Test Cancelacion
const cancel = buildCancelacionXML({
  issuerNif: 'B12345678',
  invoiceNumber: 'FAC-2025-0001',
  series: 'A',
  issueDate: '2025-01-15',
});
if (cancel.includes('<RegistroCancelacion>')) { pass++; process.stdout.write('.'); }
else { fail++; console.error('\nFAIL: cancelacion tag'); }
if (!cancel.includes('<ImporteTotal>')) { pass++; process.stdout.write('.'); }
else { fail++; console.error('\nFAIL: cancelacion should not have importe'); }

console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
process.exit(fail > 0 ? 1 : 0);