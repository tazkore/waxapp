-- Quitar staff asignado a las sub-tiendas Cannesh
DELETE FROM public.sub_store_staff
WHERE sub_store_id IN (
  'd4824cc4-8e96-4e94-a74d-cceacc1ba84d',
  '11369317-1af8-45b5-8455-84d80643ae8d'
);

-- Quitar versiones de las sub-tiendas Cannesh (si la tabla existe)
DELETE FROM public.sub_store_versions
WHERE sub_store_id IN (
  'd4824cc4-8e96-4e94-a74d-cceacc1ba84d',
  '11369317-1af8-45b5-8455-84d80643ae8d'
);

-- Desvincular dominios y luego borrarlos
UPDATE public.domains SET sub_store_id = NULL, brand_id = NULL
WHERE sub_store_id IN (
  'd4824cc4-8e96-4e94-a74d-cceacc1ba84d',
  '11369317-1af8-45b5-8455-84d80643ae8d'
)
OR brand_id = 'daef0977-97ca-4098-889f-78334171beb0'
OR hostname = 'cannesh.com';

DELETE FROM public.domains WHERE hostname = 'cannesh.com';

-- Eliminar las sub-tiendas
DELETE FROM public.sub_stores
WHERE id IN (
  'd4824cc4-8e96-4e94-a74d-cceacc1ba84d',
  '11369317-1af8-45b5-8455-84d80643ae8d'
);

-- Eliminar la marca Cannesh.com
DELETE FROM public.brands WHERE id = 'daef0977-97ca-4098-889f-78334171beb0';