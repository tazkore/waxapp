import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [hasRole, setHasRole] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        setHasRole(!!data);
      });
  }, [session]);

  if (session === undefined || (session && hasRole === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;
  if (!hasRole) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Acceso Denegado</p>
        <p className="text-sm text-muted-foreground">No tienes un rol asignado para acceder al panel.</p>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-primary underline">Cerrar sesión</button>
      </div>
    </div>
  );

  return <>{children}</>;
};

export default ProtectedRoute;
