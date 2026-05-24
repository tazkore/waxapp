-- 1) Add idempotency marker
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_processed_at timestamptz;

-- Backfill: any order already past pending/draft/cancelled is considered processed
UPDATE public.orders
SET fulfillment_processed_at = COALESCE(updated_at, created_at)
WHERE fulfillment_processed_at IS NULL
  AND status NOT IN ('draft','pending','cancelled');

-- 2) Rewrite the function: idempotent + only fires on confirmed state
CREATE OR REPLACE FUNCTION public.on_order_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_qty int;
  v_points int;
  v_client_id uuid;
  v_confirmed_states text[] := ARRAY['paid','processing','confirmed','in_transit','shipped','delivered','completed'];
  v_should_run boolean := false;
BEGIN
  -- Decide whether to run fulfillment for THIS row event
  IF TG_OP = 'INSERT' THEN
    -- Only run on insert if order is created already in a confirmed state (admin-created paid order, etc.)
    IF NEW.status = ANY(v_confirmed_states) AND NEW.fulfillment_processed_at IS NULL THEN
      v_should_run := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Run when transitioning from a non-confirmed state into a confirmed one, and not yet processed
    IF NEW.fulfillment_processed_at IS NULL
       AND NEW.status = ANY(v_confirmed_states)
       AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status IS NULL)
       AND COALESCE(OLD.status,'') <> ALL(v_confirmed_states) THEN
      v_should_run := true;
    END IF;
  END IF;

  IF NOT v_should_run THEN
    RETURN NEW;
  END IF;

  -- 1. Decrement stock per item
  IF NEW.items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      v_qty := COALESCE((item->>'qty')::int, (item->>'quantity')::int, 1);

      v_variant_id := NULL;
      IF item ? 'variant_id' AND (item->>'variant_id') <> '' THEN
        BEGIN
          v_variant_id := (item->>'variant_id')::uuid;
        EXCEPTION WHEN others THEN v_variant_id := NULL;
        END;
      END IF;

      IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = GREATEST(0, stock - v_qty)
        WHERE id = v_variant_id;
      ELSE
        v_product_id := NULL;
        IF item ? 'product_id' AND (item->>'product_id') <> '' THEN
          BEGIN v_product_id := (item->>'product_id')::uuid;
          EXCEPTION WHEN others THEN v_product_id := NULL; END;
        END IF;

        IF v_product_id IS NULL AND item ? 'sku' THEN
          SELECT id INTO v_product_id FROM public.products WHERE sku = item->>'sku' LIMIT 1;
        END IF;

        IF v_product_id IS NULL AND item ? 'title' THEN
          SELECT id INTO v_product_id FROM public.products WHERE name = item->>'title' LIMIT 1;
        END IF;

        IF v_product_id IS NOT NULL THEN
          UPDATE public.products
          SET stock = GREATEST(0, stock - v_qty)
          WHERE id = v_product_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 2. Update or create client + loyalty points (1 pt per $10 MXN)
  v_points := FLOOR(NEW.total / 10);

  SELECT id INTO v_client_id FROM public.clients WHERE email = NEW.customer_email LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (name, email, total_spent, last_order_date, loyalty_points)
    VALUES (NEW.customer_name, NEW.customer_email, NEW.total, NEW.created_at, v_points);
  ELSE
    UPDATE public.clients
    SET total_spent = total_spent + NEW.total,
        last_order_date = NEW.created_at,
        loyalty_points = loyalty_points + v_points,
        membership_tier = CASE
          WHEN (total_spent + NEW.total) >= 50000 THEN 'Platinum'
          WHEN (total_spent + NEW.total) >= 20000 THEN 'Gold'
          WHEN (total_spent + NEW.total) >= 5000 THEN 'Silver'
          ELSE 'Bronze'
        END
    WHERE id = v_client_id;
  END IF;

  -- 3. Create staff task to fulfill order (only if not already exists for this order)
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_tasks WHERE order_id = NEW.id::text
  ) THEN
    INSERT INTO public.staff_tasks (title, description, status, priority, order_id, checklist)
    VALUES (
      'Preparar pedido ' || NEW.order_number,
      'Cliente: ' || NEW.customer_name || E'\nTotal: $' || NEW.total::text || E'\nDirección: ' || COALESCE(NEW.shipping_address, 'N/A'),
      'pendiente',
      'normal',
      NEW.id::text,
      '[{"label":"Verificar inventario","done":false},{"label":"Empacar productos","done":false},{"label":"Generar guía","done":false},{"label":"Entregar a paquetería","done":false}]'::jsonb
    );
  END IF;

  -- 4. Mark as processed so it never runs twice
  NEW.fulfillment_processed_at := now();

  RETURN NEW;
END;
$function$;

-- 3) Clean up duplicate staff tasks for any past order (keep oldest)
DELETE FROM public.staff_tasks t
WHERE t.id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at ASC) AS rn
    FROM public.staff_tasks
    WHERE order_id IS NOT NULL
  ) x
  WHERE x.rn > 1
);

-- 4) Recreate triggers as BEFORE triggers to prevent recursive update issues
DROP TRIGGER IF EXISTS trg_on_order_confirmed_insert ON public.orders;
CREATE TRIGGER trg_on_order_confirmed_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_confirmed();

DROP TRIGGER IF EXISTS trg_on_order_confirmed_update ON public.orders;
CREATE TRIGGER trg_on_order_confirmed_update
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_confirmed();
