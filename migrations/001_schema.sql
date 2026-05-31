-- 001_schema.sql
-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Profile Update Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table
CREATE TABLE public.profiles (
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

-- 3. Clients Table
CREATE TABLE public.clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 4. Products & Services Table
CREATE TABLE public.products_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 5. Invoices Table
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id),
  invoice_number  TEXT NOT NULL,                   -- e.g. FAC-2025-0001
  invoice_type    TEXT DEFAULT 'standard',          -- standard | rectificative | simplified
  series          TEXT DEFAULT 'A',                 -- Invoice series letter
  
  -- Dates
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  operation_date  DATE NOT NULL DEFAULT CURRENT_DATE,  -- Date of accrual
  due_date        DATE,
  
  -- Totals
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
  
  -- VeriFactu fields
  verifactu_hash       TEXT,
  verifactu_prev_hash  TEXT,
  verifactu_signature  TEXT,
  verifactu_qr         TEXT,
  verifactu_status     TEXT DEFAULT 'pending' CHECK (verifactu_status IN ('pending', 'signed', 'submitted', 'acknowledged', 'rejected')),
  verifactu_submitted_at TIMESTAMPTZ,
  verifactu_response   JSONB,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, invoice_number)
);

-- 6. Invoice Items Table
CREATE TABLE public.invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products_services(id),
  
  description     TEXT NOT NULL,
  quantity        DECIMAL(12,4) NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct    DECIMAL(5,2) DEFAULT 0.00,
  
  iva_percent     DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  irpf_percent    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  
  line_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  iva_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  irpf_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Invoice Taxes Table
CREATE TABLE public.invoice_taxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  tax_type        TEXT NOT NULL CHECK (tax_type IN ('iva', 'irpf')),
  tax_percent     DECIMAL(5,2) NOT NULL,
  taxable_base    DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  UNIQUE(invoice_id, tax_type, tax_percent)
);

-- 8. VeriFactu Certificates Table
CREATE TABLE public.verifactu_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  alias           TEXT NOT NULL,
  issuer          TEXT,
  subject         TEXT,
  serial_number   TEXT,
  valid_from      DATE,
  valid_until     DATE,
  
  certificate_url TEXT,
  certificate_password_encrypted TEXT,
  
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, alias)
);

-- 9. VeriFactu Submissions Table
CREATE TABLE public.verifactu_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id),
  
  submission_type TEXT NOT NULL,                   -- 'alta' | 'rectificativa' | 'cancelacion'
  xml_payload     TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  
  response_status TEXT,                            -- 'ok' | 'error' | 'pending'
  response_code   TEXT,
  response_body   JSONB,
  csr             TEXT,                            -- Secure Verification Code from AEAT
  
  retry_count     INTEGER DEFAULT 0,
  last_error      TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. VeriFactu Chain Table
CREATE TABLE public.verifactu_chain (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id),
  invoice_number  TEXT NOT NULL,
  
  prev_chain_id   UUID REFERENCES public.verifactu_chain(id),
  prev_hash       TEXT,
  
  hash_algorithm  TEXT DEFAULT 'SHA-256',
  hash_value      TEXT NOT NULL,
  
  signature_value TEXT,
  signature_algorithm TEXT DEFAULT 'XAdES-EPES',
  
  qr_data         TEXT,
  
  chain_position  INTEGER NOT NULL,
  chain_ref       TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, invoice_id),
  UNIQUE(profile_id, chain_position)
);
