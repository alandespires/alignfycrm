
REVOKE EXECUTE ON FUNCTION public.has_commercial_role(uuid, uuid, public.commercial_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_commercial(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_delete_commercial(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_lead_auto_convert() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_commercial_role(uuid, uuid, public.commercial_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_commercial(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_commercial(uuid, uuid) TO authenticated;
