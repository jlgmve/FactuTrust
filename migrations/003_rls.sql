-- 003_rls.sql
-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifactu_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifactu_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifactu_chain ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can see and update only their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (profile_id = auth.uid());

-- Products Services
CREATE POLICY "Users can view their own products_services" ON public.products_services FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own products_services" ON public.products_services FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update their own products_services" ON public.products_services FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete their own products_services" ON public.products_services FOR DELETE USING (profile_id = auth.uid());

-- Invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own invoices" ON public.invoices FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete their own invoices" ON public.invoices FOR DELETE USING (profile_id = auth.uid());

-- Invoice Items (Linked via invoices)
CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.profile_id = auth.uid())
);
CREATE POLICY "Users can insert their own invoice items" ON public.invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.profile_id = auth.uid())
);
CREATE POLICY "Users can update their own invoice items" ON public.invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.profile_id = auth.uid())
);
CREATE POLICY "Users can delete their own invoice items" ON public.invoice_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.profile_id = auth.uid())
);

-- Invoice Taxes (Linked via invoices)
CREATE POLICY "Users can view their own invoice taxes" ON public.invoice_taxes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_taxes.invoice_id AND public.invoices.profile_id = auth.uid())
);
CREATE POLICY "Users can insert their own invoice taxes" ON public.invoice_taxes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_taxes.invoice_id AND public.invoices.profile_id = auth.uid())
);

-- VeriFactu Certificates
CREATE POLICY "Users can view their own certificates" ON public.verifactu_certificates FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own certificates" ON public.verifactu_certificates FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update their own certificates" ON public.verifactu_certificates FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "Users can delete their own certificates" ON public.verifactu_certificates FOR DELETE USING (profile_id = auth.uid());

-- VeriFactu Submissions
CREATE POLICY "Users can view their own submissions" ON public.verifactu_submissions FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own submissions" ON public.verifactu_submissions FOR INSERT WITH CHECK (profile_id = auth.uid());

-- VeriFactu Chain
CREATE POLICY "Users can view their own chain" ON public.verifactu_chain FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can insert their own chain" ON public.verifactu_chain FOR INSERT WITH CHECK (profile_id = auth.uid());
