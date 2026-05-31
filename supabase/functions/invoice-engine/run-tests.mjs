/**
 * Manual test runner for the invoice calculation engine.
 * Tests all core functions without Jest dependency.
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
} from './src/calculator.ts';

import { generateInvoiceNumber, parseSequence } from './src/invoice-number.ts';

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) {
        passed++;
        process.stdout.write('.');
    } else {
        failed++;
        console.error(`\nFAIL: ${name}`);
    }
}

function assertEqual(actual, expected, name) {
    const ok = actual === expected;
    if (ok) {
        passed++;
        process.stdout.write('.');
    } else {
        failed++;
        console.error(`\nFAIL: ${name} — expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, name) {
    const ok = Math.abs(actual - expected) < 0.001;
    if (ok) {
        passed++;
        process.stdout.write('.');
    } else {
        failed++;
        console.error(`\nFAIL: ${name} — expected ${expected}, got ${actual}`);
    }
}

// ===== roundMoney =====
assertEqual(roundMoney(10.456), 10.46, 'roundMoney rounds up');
assertEqual(roundMoney(10.454), 10.45, 'roundMoney rounds down');
assertEqual(roundMoney(1.005), 1.01, 'roundMoney half up');
assertEqual(roundMoney(100), 100, 'roundMoney integer');
assertEqual(roundMoney(0), 0, 'roundMoney zero');
assertEqual(roundMoney(0.001), 0, 'roundMoney tiny');
assertEqual(roundMoney(0.005), 0.01, 'roundMoney tiny half up');

// ===== sumAndRound =====
assertEqual(sumAndRound([10.111, 20.222]), 30.33, 'sumAndRound');
assertEqual(sumAndRound([]), 0, 'sumAndRound empty');

// ===== calculateLineTotal =====
assertEqual(calculateLineTotal(3, 100, 0), 300, 'lineTotal no discount');
assertEqual(calculateLineTotal(3, 100, 10), 270, 'lineTotal with discount');
assertEqual(calculateLineTotal(2.5, 80, 0), 200, 'lineTotal fractional qty');

// Error cases
try {
    calculateLineTotal(-1, 100, 0);
    console.error('\nFAIL: should throw on negative qty');
    failed++;
} catch (e) { passed++; process.stdout.write('.'); }

try {
    calculateLineTotal(1, -100, 0);
    console.error('\nFAIL: should throw on negative price');
    failed++;
} catch (e) { passed++; process.stdout.write('.'); }

// ===== calculateIvaAmount =====
assertEqual(calculateIvaAmount(300, 21), 63, 'iva 21%');
assertEqual(calculateIvaAmount(200, 10), 20, 'iva 10%');
assertEqual(calculateIvaAmount(100, 4), 4, 'iva 4%');
assertEqual(calculateIvaAmount(500, 0), 0, 'iva exempt');

// ===== calculateIrpfAmount =====
assertEqual(calculateIrpfAmount(1000, 15), 150, 'irpf 15%');
assertEqual(calculateIrpfAmount(1000, 7), 70, 'irpf 7%');
assertEqual(calculateIrpfAmount(500, 0), 0, 'irpf none');

// ===== computeLine =====
const line = computeLine({
    description: 'Consultoría',
    quantity: 10,
    unitPrice: 100,
    discountPct: 10,
    ivaPercent: 21,
    irpfPercent: 15,
});
assertEqual(line.lineTotal, 900, 'computeLine total');
assertEqual(line.ivaAmount, 189, 'computeLine iva');
assertEqual(line.irpfAmount, 135, 'computeLine irpf');

// ===== calculateInvoice =====
const empty = calculateInvoice([]);
assertEqual(empty.subtotal, 0, 'empty invoice subtotal');
assertEqual(empty.grandTotal, 0, 'empty invoice grandTotal');

// Simple invoice
const simple = calculateInvoice([{
    description: 'Web dev',
    quantity: 1,
    unitPrice: 1000,
    discountPct: 0,
    ivaPercent: 21,
    irpfPercent: 0,
}]);
assertEqual(simple.subtotal, 1000, 'simple subtotal');
assertEqual(simple.ivaTotal, 210, 'simple iva');
assertEqual(simple.grandTotal, 1210, 'simple grandTotal');

// Invoice with IRPF
const irpf = calculateInvoice([{
    description: 'Services',
    quantity: 1,
    unitPrice: 2000,
    discountPct: 0,
    ivaPercent: 21,
    irpfPercent: 15,
}]);
assertEqual(irpf.subtotal, 2000, 'irpf subtotal');
assertEqual(irpf.ivaTotal, 420, 'irpf iva');
assertEqual(irpf.irpfTotal, 300, 'irpf irpf');
assertEqual(irpf.grandTotal, 2120, 'irpf grandTotal = 2000+420-300');

// Mixed rates
const mixed = calculateInvoice([
    { description: 'A', quantity: 10, unitPrice: 100, discountPct: 0, ivaPercent: 21, irpfPercent: 0 },
    { description: 'B', quantity: 5, unitPrice: 50, discountPct: 0, ivaPercent: 10, irpfPercent: 0 },
]);
assertEqual(mixed.subtotal, 1250, 'mixed subtotal');
assertEqual(mixed.ivaTotal, 235, 'mixed iva');
assertEqual(mixed.grandTotal, 1485, 'mixed grandTotal');

// ===== Tax Summary =====
const ts = mixed.taxSummary;
assertEqual(ts.length, 2, 'taxSummary 2 groups');
const iva21 = ts.find(t => t.taxPercent === 21);
const iva10 = ts.find(t => t.taxPercent === 10);
assertEqual(iva21.taxableBase, 1000, 'iva21 base');
assertEqual(iva21.taxAmount, 210, 'iva21 amount');
assertEqual(iva10.taxableBase, 500, 'iva10 base');
assertEqual(iva10.taxAmount, 25, 'iva10 amount');

// ===== Invoice Number =====
const num = generateInvoiceNumber({ prefix: 'FAC-', year: 2025, lastInvoiceNo: 0 });
assertEqual(num.invoiceNumber, 'FAC-2025-0001', 'first invoice number');
assertEqual(num.nextInvoiceNo, 1, 'next invoice no');

const num2 = generateInvoiceNumber({ prefix: 'FAC-', year: 2025, lastInvoiceNo: 42 });
assertEqual(num2.invoiceNumber, 'FAC-2025-0043', 'incremented invoice number');

try {
    generateInvoiceNumber({ prefix: '', year: 2025, lastInvoiceNo: 0 });
    console.error('\nFAIL: should throw on empty prefix');
    failed++;
} catch (e) { passed++; process.stdout.write('.'); }

assertEqual(parseSequence('FAC-2025-0001'), 1, 'parseSequence');
assertEqual(parseSequence(''), null, 'parseSequence empty');

// ===== Validation =====
assertEqual(validateLineInput({ description: '', quantity: 1, unitPrice: 100, discountPct: 0, ivaPercent: 21, irpfPercent: 0 }).length, 1, 'validate missing desc');
assertEqual(validateLineInput({ description: 'OK', quantity: -1, unitPrice: 100, discountPct: 0, ivaPercent: 21, irpfPercent: 0 }).length, 1, 'validate neg qty');
assertEqual(validateInvoiceInputs([]).length, 1, 'validate empty inputs');

// ===== Due Date =====
const d = calculateDueDate(new Date('2025-01-01'));
assertEqual(d.getDate(), 31, 'due date +30 days');
assertEqual(d.getMonth(), 0, 'due date same month jan');

const explicit = calculateDueDate(new Date('2025-01-01'), new Date('2025-01-15'));
assertEqual(explicit.getDate(), 15, 'explicit due date');

// ===== Spanish tax scenario =====
const freelance = calculateInvoice([{
    description: 'Desarrollo',
    quantity: 40,
    unitPrice: 125,
    discountPct: 0,
    ivaPercent: 21,
    irpfPercent: 15,
}]);
assertEqual(freelance.subtotal, 5000, 'freelance subtotal');
assertEqual(freelance.ivaTotal, 1050, 'freelance iva');
assertEqual(freelance.irpfTotal, 750, 'freelance irpf');
assertEqual(freelance.grandTotal, 5300, 'freelance grandTotal');

console.log(`\n\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
process.exit(failed > 0 ? 1 : 0);