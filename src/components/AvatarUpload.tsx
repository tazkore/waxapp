import { useRef, useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  role: 'Admin' | 'Cliente';
  onAvatarUpdated?: (url: string) => void;
  sizeClassName?: string;
}

export const AvatarUpload = ({
  userId,
  avatarUrl,
  name,
  role,
  onAvatarUpdated,
  sizeClassName = "w-20 h-20",
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(avatarUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep state in sync with external prop changes
  useEffect(() => {
    setLocalAvatar(avatarUrl ?? null);
  }, [avatarUrl]);

  const handleAvatarClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo inválido', description: 'Solo se aceptan imágenes.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 2 MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update both customer_profiles table and auth user metadata
      if (role === 'Cliente') {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .update({ avatar_url: publicUrl })
          .eq('user_id', userId);
        
        if (profileError) throw profileError;

        const { error: authError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl }
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl }
        });
        if (authError) throw authError;
      }

      setLocalAvatar(publicUrl);
      onAvatarUpdated?.(publicUrl);
      toast({ title: 'Avatar actualizado' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir la imagen';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleAvatarClick}
        className={`${sizeClassName} rounded-full overflow-hidden border-2 border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card relative`}
        aria-label="Cambiar foto de perfil"
        disabled={uploading}
      >
        {localAvatar ? (
          <img
            src={localAvatar}
            alt={name}
            className="w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AvatarUpload;
