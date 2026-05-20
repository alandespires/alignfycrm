DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notifications','leads','deals','tasks','activities','tickets','proposals','companies','contacts'] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END;
  END LOOP;
END $$;