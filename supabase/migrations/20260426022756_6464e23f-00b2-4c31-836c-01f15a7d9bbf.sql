
-- Trigger function: on order confirmation, decrement stock, update client loyalty, create staff task
CREATE OR REPLACE FUNCTION public.on_order_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_qty int;
  v_points int;
  v_client_id uuid;
BEGIN
  -- Only act when status transitions away from draft/pending into a real state, or on insert with non-draft
  IF (TG_OP = 'INSERT' AND NEW.status NOT IN ('draft','cancelled'))
     OR (TG_OP = 'UPDATE' AND OLD.status IN ('draft','pending') AND NEW.status NOT IN ('draft','pending','cancelled')) THEN

    -- 1. Decrement stock per item
    IF NEW.items IS NOT NULL THEN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        v_qty := COALESCE((item->>'qty')::int, (item->>'quantity')::int, 1);

        -- Try variant first
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
          -- Fallback: match product by id, sku, or name
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

    -- 3. Create staff task to fulfill order
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_order_confirmed_insert ON public.orders;
CREATE TRIGGER trg_on_order_confirmed_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_confirmed();

DROP TRIGGER IF EXISTS trg_on_order_confirmed_update ON public.orders;
CREATE TRIGGER trg_on_order_confirmed_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_confirmed();

-- Also wire the existing welcome coupon function to fire on customer_profiles insert
DROP TRIGGER IF EXISTS trg_create_welcome_coupon ON public.customer_profiles;
CREATE TRIGGER trg_create_welcome_coupon
AFTER INSERT ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.create_welcome_coupon();
