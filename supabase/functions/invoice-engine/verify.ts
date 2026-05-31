// Simple inline test of the invoice calculation engine
import {
    roundMoney,
    calculateLineTotal,
    calculateIvaAmount,
    calculateIrpfAmount,
    computeLine,
    calculateInvoice,
    generateInvoiceNumber,
    parseSequence,
} from '/home/team/shared/supabase/functions/invoice-engine/src/calculator.ts';
import { InvoiceLineInput } from '/home/team/shared/supabase/functions/invoice-engine/src/types.ts';

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } else { process.stdout.write('.'); } }

// Test roundMoney
assert(roundMoney(10.456) === 10.46, 'roundMoney up');
assert(roundMoney(10.454) === 10.45, 'roundMoney down');
assert(roundMoney(0.005) === 0.01, 'roundMoney half up');
assert(roundMoney(0) === 0, 'roundMoney zero');

// Test calculateLineTotal
assert(calculateLineTotal(3, 100, 0) === 300, 'lineTotal no discount');
assert(calculateLineTotal(3, 100, 10) === 270, 'lineTotal with discount');

// Test calculateIvaAmount
assert(calculateIvaAmount(300, 21) === 63, 'iva 21%');
assert(calculateIvaAmount(200, 10) === 20, 'iva 10%');

// Test calculateIrpfAmount
assert(calculateIrpfAmount(1000, 15) === 150, 'irpf 15%');

// Test computeLine
const line = computeLine({ description: 'Test', quantity: 10, unitPrice: 100, discountPct: 10, ivaPercent: 21, irpfPercent: 15 });
assert(line.lineTotal === 900, 'computeLine total');
assert(line.ivaAmount === 189, 'computeLine iva');
assert(line.irpfAmount === 135, 'computeLine irpf');

// Test calculateInvoice (simple)
const r = calculateInvoice([{ description: 'Svc', quantity: 1, unitPrice: 1000, discountPct: 0, ivaPercent: 21, irpfPercent: 0 }]);
assert(r.subtotal === 1000, 'invoice subtotal');
assert(r.ivaTotal === 210, 'invoice iva');
assert(r.grandTotal === 1210, 'invoice grandTotal');

// Test calculateInvoice (with IRPF)
const r2 = calculateInvoice([{ description: 'Svc', quantity: 1, unitPrice: 2000, discountPct: 0, ivaPercent: 21, irpfPercent: 15 }]);
assert(r2.subtotal === 2000, 'irpf subtotal');
assert(r2.ivaTotal === 420, 'irpf iva');
assert(r2.irpfTotal === 300, 'irpf irpf');
assert(r2.grandTotal === 2120, 'irpf grandTotal = 2000+420-300');

// Test tax grouping
assert(r2.taxSummary.length === 2, 'taxSummary 2 groups');
assert(r2.taxSummary[0].taxType === 'iva', 'first tax is iva');
assert(r2.taxSummary[0].taxAmount === 420, 'iva amount in summary');

// Test invoice number
const n = generateInvoiceNumber({ prefix: 'FAC-', year: 2025, lastInvoiceNo: 0 });
assert(n.invoiceNumber === 'FAC-2025-0001', 'first invoice number');
assert(n.nextInvoiceNo === 1, 'next invoice no');

const n2 = generateInvoiceNumber({ prefix: 'FAC-', year: 2025, lastInvoiceNo: 42 });
assert(n2.invoiceNumber === 'FAC-2025-0043', 'incremented invoice number');

assert(parseSequence('FAC-2025-0001') === 1, 'parseSequence');

// Empty invoice
const empty = calculateInvoice([]);
assert(empty.subtotal === 0, 'empty subtotal');
assert(empty.grandTotal === 0, 'empty grandTotal');

console.log('\nAll Phase 2 tests passed! ✅');