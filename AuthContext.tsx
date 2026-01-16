
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Barber } from './types';
import { supabase } from './src/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Tipo para o usuário logado
export type UserRole = 'admin' | 'barber' | 'receptionist' | 'super_admin';

interface AuthContextType {
  currentUser: Barber | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  role: UserRole;
  barbers: Barber[]; // Still kept for listing staff, but now fetches from DB
  login: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string | 'admin') => void;
  hasPermission: (permission: string) => boolean;
  updateBarber: (barber: Barber) => void;
  addBarber: (barber: Barber) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  isAuthenticated: false,
  role: 'admin',
  barbers: [],
  login: async () => false,
  signUp: async () => false,
  logout: () => { },
  switchUser: () => { },
  hasPermission: () => false,
  updateBarber: () => { },
  addBarber: () => { },
  loading: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<Barber | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    // 3. Fetch all barbers (public info)
    fetchBarbers();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    // console.log('🔍 Fetching profile for:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*, tenants (name, subscription_status)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    }

    if (data) {
      // Adapt DB profile to Barber interface
      const barber: Barber = {
        id: data.id,
        name: data.name || data.email,
        email: data.email,
        role: data.role,
        avatar: data.avatar || 'https://picsum.photos/150/150',
        active: data.active,
        commissionRate: data.commission_rate || 0,
        permissions: data.permissions || [],
        loginEnabled: data.login_enabled,
        tenantId: data.tenant_id,
        // @ts-ignore - Supabase join returns object
        tenantName: data.tenants?.name,
        // @ts-ignore
        subscriptionStatus: data.tenants?.subscription_status
      };
      setCurrentUser(barber);
    } else {
      // FALLBACK: User exists in Auth but not in Profiles. 
      // Recover using Session data to prevent lockout.
      console.warn('No profile found. Using Session fallback.');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.id === userId) {
        const user = session.user;
        const isEmailAdmin = user.email?.includes('admin') || user.email?.includes('barbermaster');

        const fallbackUser: Barber = {
          id: user.id,
          name: user.user_metadata?.name || 'Administrador Temporário',
          email: user.email || '',
          role: isEmailAdmin ? 'admin' : 'barber',
          avatar: 'https://picsum.photos/150/150',
          active: true,
          commissionRate: 0,
          permissions: [],
          loginEnabled: true,
          tenantId: '63f22a97-eb14-4862-93b6-815ca41b83a4', // Valid Tenant ID for Gui Pimenta
        };
        console.log('Using Fallback User:', fallbackUser);
        setCurrentUser(fallbackUser);
      } else {
        console.warn('No session match for fallback.');
        setCurrentUser(null);
      }
    }
  };

  const fetchBarbers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.name || d.email,
        email: d.email,
        role: d.role,
        avatar: d.avatar,
        active: d.active,
        commissionRate: d.commission_rate,
        permissions: d.permissions,
        loginEnabled: d.login_enabled
      }));
      setBarbers(mapped);
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        console.error('Supabase Login Error:', error.message, error);
        return false;
      }

      console.log('Login success:', data);
      return true;
    } catch (err) {
      console.error('Unexpected Login Error:', err);
      return false;
    }
  };

  const signUp = async (email: string, pass: string, name: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name,
        },
      },
    });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
  };

  // Legacy/UI helpers
  // Legacy/UI helpers
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role === 'Administrador' || currentUser?.role === 'super_admin' || currentUser?.email === 'g.pimentat@gmail.com';
  const isAuthenticated = !!session;

  let role: UserRole = 'barber';
  if (currentUser) {
    const dbRole = currentUser.role || '';
    if (dbRole.toLowerCase() === 'admin' || dbRole === 'Administrador') {
      role = 'admin';
    } else if (dbRole === 'super_admin') {
      role = 'super_admin';
    } else if (dbRole === 'receptionist') {
      role = 'receptionist';
    } else {
      role = 'barber';
    }
  }

  // Backup check: email contains admin
  if (currentUser?.email?.includes('admin')) role = 'admin';
  // FORCE SUPER ADMIN for specific user
  if (currentUser?.email === 'g.pimentat@gmail.com') role = 'super_admin';

  const hasPermission = (permission: string) => {
    if (role === 'admin' || role === 'super_admin') return true;
    if (!currentUser || !currentUser.permissions) return false;
    return currentUser.permissions.includes(permission);
  };

  const switchUser = () => { console.warn("Switch user disabled in production"); };
  const updateBarber = () => { fetchBarbers(); }; // Refresh list
  const addBarber = () => { fetchBarbers(); };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin,
      isAuthenticated,
      role,
      barbers,
      login,
      signUp,
      logout,
      switchUser,
      hasPermission,
      updateBarber,
      addBarber,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
