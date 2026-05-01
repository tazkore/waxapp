import { supabase } from '@/integrations/supabase/client';

export type SettingKey =
  | 'contact'
  | 'whatsapp'
  | 'checkout_options'
  | 'checkout_messages'
  | 'external_codes'
  | 'locale'
  | 'seo_global';

export async function getSetting<T = any>(key: SettingKey, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return fallback;
  return (data.value as T) ?? fallback;
}

export async function setSetting(key: SettingKey, value: any): Promise<{ error: any }> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return { error };
}
