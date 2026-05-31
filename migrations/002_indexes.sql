-- 002_indexes.sql
CREATE INDEX idx_invoices_profile_id ON public.invoices(profile_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_taxes_invoice_id ON public.invoice_taxes(invoice_id);
CREATE INDEX idx_verifactu_chain_profile_id ON public.verifactu_chain(profile_id);
CREATE INDEX idx_verifactu_submissions_invoice_id ON public.verifactu_submissions(invoice_id);
CREATE INDEX idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX idx_products_services_profile_id ON public.products_services(profile_id);
