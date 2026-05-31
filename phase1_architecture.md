# FactuTrust — Phase 1: Architecture & Database Design

## Stack
- **Frontend:** React Native (Expo) — mobile-first, web-compatible
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Auth:** Supabase Auth (magic link + email OTP)
- **Storage:** Supabase Storage (for PDFs, XML invoices, certificates)
- **Crypto:** Node.js crypto + forge/xmldsig libraries on Edge Functions

---

## Relational Database Schema (PostgreSQL via Supabase)

### 1. profiles
Extends `auth.users` with business info for Spanish autónomos/SMEs.
```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT,
  nif             TEXT UNIQUE,                     -- Spanish tax ID (DNI/NIE/CIF)
  address         TEXT,
  postal_code     TEXT,
  city            TEXT,
  province        TEXT,
  country         TEXT DEFAULT 'ES',
  phone           TEXT,
  email           TEXT,
  bank_account    TEXT,                             -- IBAN for invoice footer
  logo_url        TEXT,
  invoice_prefix  TEXT DEFAULT 'FAC-',             -- e.g. FAC-2025-0001
  last_invoice_no INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',           -- free | pro | gestoria
  verifactu_enabled BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. clients
Customer/contact database for invoicing.
```sql
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  nif             TEXT NOT NULL,                   -- Client's tax ID
  address         TEXT,
  postal_code     TEXT,
  city            TEXT,
  province        TEXT,
  country         TEXT DEFAULT 'ES',
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, nif)
);
```

### 3. products_services
Catalog of billable items.
```sql
CREATE TABLE products_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL CHECK (type IN ('product', 'service')),
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit            TEXT DEFAULT 'unit',            -- hours, units, kg, etc.
  tax_type        TEXT DEFAULT 'iva',             -- iva | irpf | exempt
  iva_percent     DECIMAL(5,2) DEFAULT 21.00,    -- IVA rate (21%, 10%, 4%, 0%)
  irpf_percent    DECIMAL(5,2) DEFAULT 0.00,     -- IRPF retention (7%, 15% for professionals)
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. invoices
Invoice header — one row per invoice.
```sql
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  invoice_number  TEXT NOT NULL,                   -- e.g. FAC-2025-0001
  invoice_type    TEXT DEFAULT 'standard',          -- standard | rectificative | simplified
  series          TEXT DEFAULT 'A',                 -- Invoice series letter
  
  -- Dates
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  operation_date  DATE NOT NULL DEFAULT CURRENT_DATE,  -- Date of accrual
  due_date        DATE,
  
  -- Totals (computed, stored for fast queries)
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva_total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  irpf_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_total  DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Status
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'rectified')),
  paid_at         TIMESTAMPTZ,
  
  -- Metadata
  notes           TEXT,
  terms           TEXT,
  currency        TEXT DEFAULT 'EUR',
  language        TEXT DEFAULT 'es',
  
  -- VeriFactu fields (populated after compliance processing)
  verifactu_hash       TEXT,                       -- SHA-256 hash of this invoice XML
  verifactu_prev_hash  TEXT,                       -- Hash of the previous invoice
  verifactu_signature  TEXT,                       -- XAdES signature value
  verifactu_qr         TEXT,                       -- QR code data URL
  verifactu_status     TEXT DEFAULT 'pending' CHECK (verifactu_status IN ('pending', 'signed', 'submitted', 'acknowledged', 'rejected')),
  verifactu_submitted_at TIMESTAMPTZ,
  verifactu_response   JSONB,                     -- AEAT raw response
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, invoice_number)
);
```

### 5. invoice_items
Line items for each invoice.
```sql
CREATE TABLE invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products_services(id),
  
  description     TEXT NOT NULL,
  quantity        DECIMAL(12,4) NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct    DECIMAL(5,2) DEFAULT 0.00,      -- e.g. 10.00 for 10%
  
  -- Tax breakdown per line
  iva_percent     DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  irpf_percent    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  
  -- Computed (stored)
  line_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  irpf_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. invoice_taxes
Tax summary per invoice (one row per tax rate combination).
```sql
CREATE TABLE invoice_taxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  tax_type        TEXT NOT NULL CHECK (tax_type IN ('iva', 'irpf')),
  tax_percent     DECIMAL(5,2) NOT NULL,
  taxable_base    DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  UNIQUE(invoice_id, tax_type, tax_percent)
);
```

### 7. verifactu_certificates
Digital certificate storage (.p12/.pfx files).
```sql
CREATE TABLE verifactu_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  alias           TEXT NOT NULL,
  issuer          TEXT,
  subject         TEXT,
  serial_number   TEXT,
  valid_from      DATE,
  valid_until     DATE,
  
  -- Encrypted at rest / stored in Supabase Storage
  certificate_url TEXT,                            -- Path in Supabase Storage
  certificate_password_encrypted TEXT,             -- Encrypted with user's key
  
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, alias)
);
```

### 8. verifactu_submissions
AEAT submission audit log.
```sql
CREATE TABLE verifactu_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  
  submission_type TEXT NOT NULL,                   -- 'alta' | 'rectificativa' | 'cancelacion'
  xml_payload     TEXT,                            -- The full signed XML
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  
  -- AEAT response
  response_status TEXT,                            -- 'ok' | 'error' | 'pending'
  response_code   TEXT,                            -- AEAT error/success code
  response_body   JSONB,                           -- Full response
  csr             TEXT,                            -- Secure Verification Code from AEAT
  
  retry_count     INTEGER DEFAULT 0,
  last_error      TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 9. verifactu_chain
Inalterable invoice hash chain.
```sql
CREATE TABLE verifactu_chain (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  invoice_number  TEXT NOT NULL,
  
  -- Previous link
  prev_chain_id   UUID REFERENCES verifactu_chain(id),
  prev_hash       TEXT,
  
  -- Current hash
  hash_algorithm  TEXT DEFAULT 'SHA-256',
  hash_value      TEXT NOT NULL,
  
  -- Chaining signature
  signature_value TEXT,
  signature_algorithm TEXT DEFAULT 'XAdES-EPES',
  
  -- QR
  qr_data         TEXT,
  
  chain_position  INTEGER NOT NULL,
  chain_ref       TEXT,                            -- Reference to the initial chain entry
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, invoice_id),
  UNIQUE(profile_id, chain_position)
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_invoices_profile_id ON invoices(profile_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_taxes_invoice_id ON invoice_taxes(invoice_id);
CREATE INDEX idx_verifactu_chain_profile_id ON verifactu_chain(profile_id);
CREATE INDEX idx_verifactu_submissions_invoice_id ON verifactu_submissions(invoice_id);
CREATE INDEX idx_clients_profile_id ON clients(profile_id);
CREATE INDEX idx_products_services_profile_id ON products_services(profile_id);
```

---

## Core Invoice Calculation Formulas

All calculations are performed server-side (Supabase Edge Function / TypeScript).

### Line Item Total (before per-line discount)
```
line_total = quantity * unit_price * (1 - discount_pct / 100)
```

### IVA Amount per Line
```
iva_amount = line_total * (iva_percent / 100)
```

### IRPF Amount per Line
```
irpf_amount = line_total * (irpf_percent / 100)
```

### Invoice Subtotal (sum of all line totals before taxes)
```
subtotal = SUM(line_total for all items)
```

### Total IVA (sum of all IVA amounts)
```
iva_total = SUM(iva_amount for all items)
```

### Total IRPF (sum of all IRPF retentions)
```
irpf_total = SUM(irpf_amount for all items)
```

### Grand Total (final amount payable)
```
grand_total = subtotal + iva_total - irpf_total
```

### Tax Summary Grouping (for invoice_taxes table)
```
For each unique (tax_type, tax_percent) combination:
  taxable_base = SUM(line_total WHERE iva_percent = X)
  tax_amount   = SUM(iva_amount WHERE iva_percent = X)
```

### Due Date (default: net 30 days from issue)
```
// If no explicit due_date set:
due_date = issue_date + 30 days
```

---

## Row Level Security (RLS) — Supabase Policies

All tables are protected by RLS. Users can only access their own data:

```sql
-- Example for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (profile_id = auth.uid());
```

Same pattern applies across all tables.