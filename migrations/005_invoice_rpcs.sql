-- 005_invoice_rpcs.sql

-- RPC: create_invoice_full
-- Creates an invoice, its items, and its tax summary in a single transaction.
-- Increments the last_invoice_no in the profile.
CREATE OR REPLACE FUNCTION public.create_invoice_full(
  p_client_id UUID,
  p_invoice_type TEXT,
  p_series TEXT,
  p_issue_date DATE,
  p_operation_date DATE,
  p_due_date DATE,
  p_notes TEXT,
  p_terms TEXT,
  p_currency TEXT,
  p_language TEXT,
  p_lines JSONB,
  p_tax_summary JSONB,
  p_subtotal DECIMAL,
  p_iva_total DECIMAL,
  p_irpf_total DECIMAL,
  p_discount_total DECIMAL,
  p_grand_total DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_invoice_id UUID;
  v_profile_id UUID;
  v_invoice_number TEXT;
  v_next_no INTEGER;
  v_prefix TEXT;
  v_year TEXT;
  v_result JSONB;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- 1. Get prefix and next number, increment it
  -- We do this in one step to be atomic for this user's profile
  UPDATE public.profiles 
  SET last_invoice_no = last_invoice_no + 1
  WHERE id = v_profile_id
  RETURNING invoice_prefix, last_invoice_no INTO v_prefix, v_next_no;
  
  v_year := to_char(p_issue_date, 'YYYY');
  v_invoice_number := v_prefix || v_year || '-' || lpad(v_next_no::text, 4, '0');

  -- 2. Insert Invoice Header
  INSERT INTO public.invoices (
    profile_id, client_id, invoice_number, invoice_type, series,
    issue_date, operation_date, due_date,
    subtotal, iva_total, irpf_total, discount_total, grand_total,
    notes, terms, currency, language, status
  ) VALUES (
    v_profile_id, p_client_id, v_invoice_number, p_invoice_type, p_series,
    p_issue_date, p_operation_date, p_due_date,
    p_subtotal, p_iva_total, p_irpf_total, p_discount_total, p_grand_total,
    p_notes, p_terms, p_currency, p_language, 'draft'
  ) RETURNING id INTO v_invoice_id;

  -- 3. Insert Items
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, discount_pct,
    iva_percent, irpf_percent, line_total, iva_amount, irpf_amount, sort_order
  )
  SELECT 
    v_invoice_id, 
    (item->>'product_id')::UUID,
    item->>'description',
    (item->>'quantity')::DECIMAL,
    (item->>'unitPrice')::DECIMAL,
    (item->>'discountPct')::DECIMAL,
    (item->>'ivaPercent')::DECIMAL,
    (item->>'irpfPercent')::DECIMAL,
    (item->>'lineTotal')::DECIMAL,
    (item->>'ivaAmount')::DECIMAL,
    (item->>'irpfAmount')::DECIMAL,
    COALESCE((item->>'sortOrder')::INTEGER, (row_number() over ())::INTEGER)
  FROM jsonb_array_elements(p_lines) AS item;

  -- 4. Insert Taxes
  INSERT INTO public.invoice_taxes (
    invoice_id, tax_type, tax_percent, taxable_base, tax_amount
  )
  SELECT 
    v_invoice_id,
    item->>'taxType',
    (item->>'taxPercent')::DECIMAL,
    (item->>'taxableBase')::DECIMAL,
    (item->>'taxAmount')::DECIMAL
  FROM jsonb_array_elements(p_tax_summary) AS item;

  -- Return the created invoice ID and number
  v_result := jsonb_build_object(
    'id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: update_invoice_full
CREATE OR REPLACE FUNCTION public.update_invoice_full(
  p_invoice_id UUID,
  p_client_id UUID,
  p_invoice_type TEXT,
  p_series TEXT,
  p_issue_date DATE,
  p_operation_date DATE,
  p_due_date DATE,
  p_notes TEXT,
  p_terms TEXT,
  p_currency TEXT,
  p_language TEXT,
  p_status TEXT,
  p_lines JSONB,
  p_tax_summary JSONB,
  p_subtotal DECIMAL,
  p_iva_total DECIMAL,
  p_irpf_total DECIMAL,
  p_discount_total DECIMAL,
  p_grand_total DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  v_profile_id := auth.uid();
  
  -- 1. Update Invoice Header (only if it belongs to the user)
  UPDATE public.invoices SET
    client_id = p_client_id,
    invoice_type = p_invoice_type,
    series = p_series,
    issue_date = p_issue_date,
    operation_date = p_operation_date,
    due_date = p_due_date,
    subtotal = p_subtotal,
    iva_total = p_iva_total,
    irpf_total = p_irpf_total,
    discount_total = p_discount_total,
    grand_total = p_grand_total,
    notes = p_notes,
    terms = p_terms,
    currency = p_currency,
    language = p_language,
    status = p_status,
    updated_at = NOW()
  WHERE id = p_invoice_id AND profile_id = v_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or access denied';
  END IF;

  -- 2. Delete existing items and taxes
  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  DELETE FROM public.invoice_taxes WHERE invoice_id = p_invoice_id;

  -- 3. Insert new Items
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, discount_pct,
    iva_percent, irpf_percent, line_total, iva_amount, irpf_amount, sort_order
  )
  SELECT 
    p_invoice_id, 
    (item->>'product_id')::UUID,
    item->>'description',
    (item->>'quantity')::DECIMAL,
    (item->>'unitPrice')::DECIMAL,
    (item->>'discountPct')::DECIMAL,
    (item->>'ivaPercent')::DECIMAL,
    (item->>'irpfPercent')::DECIMAL,
    (item->>'lineTotal')::DECIMAL,
    (item->>'ivaAmount')::DECIMAL,
    (item->>'irpfAmount')::DECIMAL,
    COALESCE((item->>'sortOrder')::INTEGER, (row_number() over ())::INTEGER)
  FROM jsonb_array_elements(p_lines) AS item;

  -- 4. Insert new Taxes
  INSERT INTO public.invoice_taxes (
    invoice_id, tax_type, tax_percent, taxable_base, tax_amount
  )
  SELECT 
    p_invoice_id,
    item->>'taxType',
    (item->>'taxPercent')::DECIMAL,
    (item->>'taxableBase')::DECIMAL,
    (item->>'taxAmount')::DECIMAL
  FROM jsonb_array_elements(p_tax_summary) AS item;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: get_invoice_full
CREATE OR REPLACE FUNCTION public.get_invoice_full(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_invoice JSONB;
  v_items JSONB;
  v_taxes JSONB;
BEGIN
  SELECT to_jsonb(i) INTO v_invoice 
  FROM public.invoices i 
  WHERE i.id = p_invoice_id AND i.profile_id = auth.uid();

  IF v_invoice IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(to_jsonb(it) ORDER BY it.sort_order, it.created_at) INTO v_items
  FROM public.invoice_items it
  WHERE it.invoice_id = p_invoice_id;

  SELECT jsonb_agg(to_jsonb(tx)) INTO v_taxes
  FROM public.invoice_taxes tx
  WHERE tx.invoice_id = p_invoice_id;

  RETURN v_invoice || jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'taxes', COALESCE(v_taxes, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
