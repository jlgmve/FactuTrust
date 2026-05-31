-- 004_triggers.sql
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_products_services_updated_at BEFORE UPDATE ON public.products_services FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
