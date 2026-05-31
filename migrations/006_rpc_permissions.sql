-- 006_rpc_permissions.sql
GRANT EXECUTE ON FUNCTION public.create_invoice_full TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_full TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_full TO authenticated;
