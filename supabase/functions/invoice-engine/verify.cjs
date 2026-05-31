const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read and transpile the calculator module on the fly
const projectDir = '/home/team/shared/supabase/functions/invoice-engine';

// Run via tsx to verify
const result = execSync(`cd "${projectDir}" && npx --yes tsx -e "
import { calculateInvoice, generateInvoiceNumber, calculateLineTotal, roundMoney } from './src/calculator.ts';
import { parseSequence } from './src/invoice-number.ts';

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; process.stdout.write('.'); } else { fail++; console.error('\\nFAIL:', msg); } }

assert(roundMoney(10.456) === 10.46, 'roundMoney');
assert(calculateLineTotal(3, 100, 10) === 270, 'lineTotal');

const r = calculateInvoice([{description:'Svc', quantity:1, unitPrice:1000, discountPct:0, ivaPercent:21, irpfPercent:0}]);
assert(r.subtotal === 1000, 'subtotal');
assert(r.ivaTotal === 210, 'iva');
assert(r.grandTotal === 1210, 'grandTotal');

const r2 = calculateInvoice([{description:'Svc', quantity:1, unitPrice:2000, discountPct:0, ivaPercent:21, irpfPercent:15}]);
assert(r2.subtotal === 2000, 'irpf_subtotal');
assert(r2.ivaTotal === 420, 'irpf_iva');
assert(r2.irpfTotal === 300, 'irpf_irpf');
assert(r2.grandTotal === 2120, 'irpf_grand');

const n = generateInvoiceNumber({prefix:'FAC-', year:2025, lastInvoiceNo:0});
assert(n.invoiceNumber === 'FAC-2025-0001', 'invnum');

assert(parseSequence('FAC-2025-0001') === 1, 'parseSeq');

const empty = calculateInvoice([]);
assert(empty.subtotal === 0, 'empty');
assert(empty.grandTotal === 0, 'empty_grand');

console.log('\\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
" 2>&1`, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
console.log(result);