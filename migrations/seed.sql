-- seed.sql

-- NOTE: This seed assumes a user with ID '00000000-0000-0000-0000-000000000000' exists in auth.users.
-- In a real Supabase environment, you would use an actual user ID.

-- Insert a dummy user profile
INSERT INTO public.profiles (id, company_name, nif, address, postal_code, city, province, phone, email, bank_account, subscription_tier)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Acme Spain S.L.', 'B12345678', 'Calle Mayor 1', '28001', 'Madrid', 'Madrid', '+34 912345678', 'info@acme.es', 'ES12 3456 7890 1234 5678 9012', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Insert Clients
INSERT INTO public.clients (profile_id, company_name, nif, address, postal_code, city, province, email)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Client One', 'A11111111', 'Calle Falsa 123', '08001', 'Barcelona', 'Barcelona', 'client1@example.com'),
('00000000-0000-0000-0000-000000000000', 'Freelancer Bob', '12345678Z', 'Avenida Libertad 5', '41001', 'Sevilla', 'Sevilla', 'bob@example.com')
ON CONFLICT (profile_id, nif) DO NOTHING;

-- Insert Products/Services
INSERT INTO public.products_services (profile_id, name, description, type, unit_price, unit, iva_percent)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Consulting Hour', 'Expert business consulting', 'service', 100.00, 'hour', 21.00),
('00000000-0000-0000-0000-000000000000', 'Web Design Pack', 'Full website redesign', 'service', 1500.00, 'unit', 21.00),
('00000000-0000-0000-0000-000000000000', 'Laptop Stand', 'Ergonomic aluminum stand', 'product', 45.00, 'unit', 21.00);

-- Insert a Draft Invoice
INSERT INTO public.invoices (id, profile_id, client_id, invoice_number, subtotal, iva_total, grand_total, status)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', (SELECT id FROM public.clients WHERE nif = 'A11111111' LIMIT 1), 'FAC-2025-0001', 1100.00, 231.00, 1331.00, 'draft')
ON CONFLICT (profile_id, invoice_number) DO NOTHING;

INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, line_total, iva_amount)
VALUES 
('11111111-1111-1111-1111-111111111111', (SELECT id FROM public.products_services WHERE name = 'Consulting Hour' LIMIT 1), 'Consulting Hour', 1, 100.00, 100.00, 21.00),
('11111111-1111-1111-1111-111111111111', (SELECT id FROM public.products_services WHERE name = 'Web Design Pack' LIMIT 1), 'Web Design Pack', 1, 1000.00, 1000.00, 210.00);

INSERT INTO public.invoice_taxes (invoice_id, tax_type, tax_percent, taxable_base, tax_amount)
VALUES 
('11111111-1111-1111-1111-111111111111', 'iva', 21.00, 1100.00, 231.00)
ON CONFLICT (invoice_id, tax_type, tax_percent) DO NOTHING;
