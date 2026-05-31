// CommonJS verification for Phase 3a XML Builder
// Tests xmlbuilder2 directly

async function main() {
  // Dynamically import the ESM xmlbuilder2
  const { create } = await import('xmlbuilder2');

  // Test 1: Build Alta XML
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('RegistroAlta')
      .ele('IDVersion').txt('1.0').up()
      .ele('Cabecera')
        .ele('NIF').txt('B12345678').up()
        .ele('IDFactura')
          .ele('NumSerieFactura').txt('FAC-2025-0001').up()
          .ele('FechaExpedicionFactura').txt('2025-01-15').up()
        .up()
      .up()
      .ele('Factura')
        .ele('ImporteTotal').txt('1210.00').up()
        .ele('DesgloseIVA')
          .ele('DetalleIVA')
            .ele('BaseImponible').txt('1000.00').up()
            .ele('TipoImpositivo').txt('21.00').up()
            .ele('CuotaIVA').txt('210.00').up()
          .up()
        .up()
      .up()
      .ele('Contraparte')
        .ele('NombreRazon').txt('Client Name').up()
        .ele('NIF').txt('Y1234567X').up()
      .up()
    .up();

  const xml = doc.end({ prettyPrint: true });

  const checks = [
    ['XML declaration', xml.includes('<?xml')],
    ['RegistroAlta', xml.includes('<RegistroAlta>')],
    ['NIF', xml.includes('B12345678')],
    ['Invoice number', xml.includes('FAC-2025-0001')],
    ['Issue date', xml.includes('2025-01-15')],
    ['ImporteTotal', xml.includes('1210.00')],
    ['BaseImponible', xml.includes('1000.00')],
    ['TipoImpositivo', xml.includes('21.00')],
    ['CuotaIVA', xml.includes('210.00')],
    ['NombreRazon', xml.includes('Client Name')],
    ['Contraparte NIF', xml.includes('Y1234567X')],
  ];

  let pass = 0, fail = 0;
  checks.forEach(([name, ok]) => {
    if (ok) { pass++; process.stdout.write('.'); }
    else { fail++; console.error('\nFAIL: ' + name); }
  });

  // Test 2: Multiple IVA rates
  const doc2 = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('RegistroAlta')
      .ele('IDVersion').txt('1.0').up()
      .ele('Cabecera')
        .ele('NIF').txt('B12345678').up()
        .ele('IDFactura')
          .ele('NumSerieFactura').txt('FAC-2025-0002').up()
          .ele('FechaExpedicionFactura').txt('2025-01-20').up()
        .up()
      .up()
      .ele('Factura')
        .ele('ImporteTotal').txt('1885.00').up()
        .ele('DesgloseIVA')
          .ele('DetalleIVA')
            .ele('BaseImponible').txt('1000.00').up()
            .ele('TipoImpositivo').txt('21.00').up()
            .ele('CuotaIVA').txt('210.00').up()
          .up()
          .ele('DetalleIVA')
            .ele('BaseImponible').txt('500.00').up()
            .ele('TipoImpositivo').txt('10.00').up()
            .ele('CuotaIVA').txt('50.00').up()
          .up()
        .up()
      .up()
      .ele('Contraparte')
        .ele('NombreRazon').txt('Client B').up()
        .ele('NIF').txt('Z9876543X').up()
      .up()
    .up();
  const xml2 = doc2.end({ prettyPrint: true });
  const detalleCount = (xml2.match(/<DetalleIVA>/g) || []).length;
  if (detalleCount === 2) { pass++; process.stdout.write('.'); }
  else { fail++; console.error('\nFAIL: Expected 2 DetalleIVA, got ' + detalleCount); }

  // Test 3: Rectificativa
  const doc3 = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('RegistroRectificativa')
      .ele('IDVersion').txt('1.0').up()
      .ele('Cabecera')
        .ele('NIF').txt('B12345678').up()
        .ele('IDFactura')
          .ele('NumSerieFactura').txt('FAC-2025-0003').up()
          .ele('FechaExpedicionFactura').txt('2025-02-01').up()
        .up()
      .up()
      .ele('FacturaRectificada')
        .ele('NumSerieFacturaRectificada').txt('FAC-2025-0001').up()
        .ele('FechaExpedicionFacturaRectificada').txt('2025-01-15').up()
      .up()
      .ele('Factura')
        .ele('ImporteTotal').txt('500.00').up()
        .ele('DesgloseIVA')
          .ele('DetalleIVA')
            .ele('BaseImponible').txt('413.22').up()
            .ele('TipoImpositivo').txt('21.00').up()
            .ele('CuotaIVA').txt('86.78').up()
          .up()
        .up()
      .up()
      .ele('Contraparte')
        .ele('NombreRazon').txt('Client').up()
        .ele('NIF').txt('X1234567X').up()
      .up()
    .up();
  const xml3 = doc3.end({ prettyPrint: true });
  if (xml3.includes('<RegistroRectificativa>')) { pass++; process.stdout.write('.'); }
  else { fail++; console.error('\nFAIL: rectificativa'); }
  if (xml3.includes('FAC-2025-0001')) { pass++; process.stdout.write('.'); }
  else { fail++; console.error('\nFAIL: rectificativa ref'); }

  // Test 4: Cancelacion
  const doc4 = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('RegistroCancelacion')
      .ele('IDVersion').txt('1.0').up()
      .ele('Cabecera')
        .ele('NIF').txt('B12345678').up()
        .ele('IDFactura')
          .ele('NumSerieFactura').txt('FAC-2025-0001').up()
          .ele('FechaExpedicionFactura').txt('2025-01-15').up()
        .up()
      .up()
    .up();
  const xml4 = doc4.end({ prettyPrint: true });
  if (xml4.includes('<RegistroCancelacion>')) { pass++; process.stdout.write('.'); }
  else { fail++; console.error('\nFAIL: cancelacion'); }
  if (!xml4.includes('<ImporteTotal>')) { pass++; process.stdout.write('.'); }
  else { fail++; console.error('\nFAIL: cancelacion should not have importe'); }

  console.log(`\n\nResults: ${pass} passed, ${fail} failed out of ${pass + fail} tests`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});