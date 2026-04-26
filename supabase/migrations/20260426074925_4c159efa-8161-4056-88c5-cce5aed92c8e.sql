-- Audit table for payment transactions
CREATE TABLE public.payment_transaction_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL,
  changed_by uuid,
  changed_by_email text,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_type text NOT NULL DEFAULT 'update',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pta_transaction ON public.payment_transaction_audit(transaction_id, created_at DESC);

ALTER TABLE public.payment_transaction_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/mod view audit"
  ON public.payment_transaction_audit FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "System insert audit"
  ON public.payment_transaction_audit FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_payment_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  EXCEPTION WHEN others THEN v_email := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_transaction_audit
      (transaction_id, changed_by, changed_by_email, field_name, old_value, new_value, change_type)
    VALUES
      (NEW.id, v_uid, v_email, 'created', NULL, NEW.status, 'create');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.payment_transaction_audit
        (transaction_id, changed_by, changed_by_email, field_name, old_value, new_value, change_type, notes)
      VALUES (NEW.id, v_uid, v_email, 'status', OLD.status, NEW.status, 'update', NEW.notes);
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      INSERT INTO public.payment_transaction_audit
        (transaction_id, changed_by, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, v_uid, v_email, 'amount', OLD.amount::text, NEW.amount::text, 'update');
    END IF;
    IF NEW.net_amount IS DISTINCT FROM OLD.net_amount THEN
      INSERT INTO public.payment_transaction_audit
        (transaction_id, changed_by, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, v_uid, v_email, 'net_amount', OLD.net_amount::text, NEW.net_amount::text, 'update');
    END IF;
    IF NEW.fee_amount IS DISTINCT FROM OLD.fee_amount THEN
      INSERT INTO public.payment_transaction_audit
        (transaction_id, changed_by, changed_by_email, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, v_uid, v_email, 'fee_amount', OLD.fee_amount::text, NEW.fee_amount::text, 'update');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_transaction_audit
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_payment_transaction_changes();