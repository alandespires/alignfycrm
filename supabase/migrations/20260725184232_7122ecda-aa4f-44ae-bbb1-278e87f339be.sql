CREATE OR REPLACE FUNCTION public.repair_utf8_mojibake(_value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SET search_path TO 'public'
AS $function$
DECLARE
  repaired text;
BEGIN
  IF _value !~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;
  BEGIN
    repaired := convert_from(convert_to(_value, 'WIN1252'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN _value;
  END;
  IF repaired ~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;
  RETURN repaired;
END;
$function$;