-- Agrega soporte para leads capturados desde WhatsApp vía Kapso.ai

-- Columna lead_source en clients (nullable para no afectar registros existentes)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT NULL;

-- Hacer email nullable: los leads de WhatsApp pueden no tener email
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;

-- Índice para filtrar leads por canal de entrada
CREATE INDEX IF NOT EXISTS idx_clients_lead_source ON public.clients(lead_source);

-- Índice en phone para el upsert del webhook
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
