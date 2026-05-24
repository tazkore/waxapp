import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  lead_source: string | null;
}

export interface BroadcastResult {
  ok: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

export async function getWhatsAppLeads(page = 0, pageSize = 20): Promise<{ data: WhatsAppLead[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Los leads de WhatsApp van a customer_profiles (no a clients que es tabla de afiliados)
  const { data, error, count } = await supabase
    .from('customer_profiles')
    .select('id, name, phone, email, created_at, lead_source', { count: 'exact' })
    .eq('lead_source', 'WhatsApp')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { data: (data ?? []) as WhatsAppLead[], count: count ?? 0 };
}

export async function getAllClientPhones(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('phone')
    .not('phone', 'is', null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => c.phone as string).filter(Boolean);
}

export async function getWhatsAppClientPhones(): Promise<string[]> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('phone')
    .eq('lead_source', 'WhatsApp')
    .not('phone', 'is', null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => c.phone as string).filter(Boolean);
}

export async function getAbandonedCartPhones(): Promise<string[]> {
  // abandoned_carts tiene email — cruzamos con clients para obtener phones
  const { data: carts, error: cartErr } = await supabase
    .from('abandoned_carts')
    .select('email')
    .eq('recovered', false);

  if (cartErr) throw new Error(cartErr.message);
  const emails = [...new Set((carts ?? []).map((c) => c.email).filter(Boolean))];
  if (!emails.length) return [];

  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('phone')
    .in('email', emails)
    .not('phone', 'is', null);

  if (clientErr) throw new Error(clientErr.message);
  return [...new Set((clients ?? []).map((c) => c.phone as string).filter(Boolean))];
}

export async function sendWhatsAppBroadcast(
  phones: string[],
  message: string
): Promise<BroadcastResult> {
  const { data, error } = await supabase.functions.invoke('kapso-send', {
    body: { phones, message },
  });

  if (error) throw new Error(error.message);
  return data as BroadcastResult;
}
