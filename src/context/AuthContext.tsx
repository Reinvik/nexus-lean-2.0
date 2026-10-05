import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { NexusUser, Profile, Company, UserRole } from '../types';

interface AuthContextType {
  user: NexusUser | null;
  profile: Profile | null;
  loading: boolean;
  companies: Company[];
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  globalFilterCompanyId: string | null;
  setGlobalFilterCompanyId: (companyId: string | null) => void;
  activeSchema: string;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  companies: [],
  activeCompanyId: null,
  setActiveCompanyId: () => {},
  globalFilterCompanyId: null,
  setGlobalFilterCompanyId: () => {},
  activeSchema: 'public',
  refreshData: async () => {},
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<NexusUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load companies for multi-tenant users
  const loadCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (!error && data) {
        setCompanies(data);
      }
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }, []);

  // Fetch user profile and map into NexusUser
  const fetchUserProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error);
      }

      const role: UserRole = prof?.role || 'user';
      const isNexusOwner = role === 'NexusOwner';
      const isGlobalAdmin = role === 'platform_admin' || role === 'superadmin' || isNexusOwner;
      const isCompanyAdmin = role === 'superuser' || isGlobalAdmin;

      const companyId = prof?.company_id || null;
      const allowedModules = prof?.allowed_modules || ['5s', 'audits', 'quick_wins', 'a3', 'vsm'];

      const nexusUser: NexusUser = {
        id: userId,
        email: email || prof?.email || '',
        name: prof?.full_name || email?.split('@')[0] || 'Usuario',
        fullName: prof?.full_name || email?.split('@')[0] || 'Usuario',
        role,
        companyId,
        company_id: companyId,
        isNexusOwner,
        isGlobalAdmin,
        isCompanyAdmin,
        canAccessAdmin: isCompanyAdmin,
        isAuthorized: prof?.is_authorized !== false,
        hasAiAccess: prof?.has_ai_access !== false,
        allowedModules,
        databaseSchema: prof?.database_schema || 'public',
        avatarUrl: prof?.avatar_url || null,
      };

      setProfile(prof || null);
      setUser(nexusUser);
      setActiveCompanyId(companyId);

      if (isGlobalAdmin) {
        await loadCompanies();
      }
    } catch (err) {
      console.error('Error setting up user profile:', err);
    }
  }, [loadCompanies]);

  const refreshData = useCallback(async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, user.email);
    }
    await loadCompanies();
  }, [user?.id, user?.email, fetchUserProfile, loadCompanies]);

  const setGlobalFilterCompanyId = (companyId: string | null) => {
    setActiveCompanyId(companyId);
  };

  const activeSchema = profile?.database_schema || 'public';

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email || '').finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setProfile(null);
        setActiveCompanyId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: error.message };
      }
      if (data.user) {
        await fetchUserProfile(data.user.id, data.user.email || '');
        return { success: true };
      }
      return { success: false, message: 'Usuario no encontrado' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error inesperado al iniciar sesión' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setActiveCompanyId(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        companies,
        activeCompanyId,
        setActiveCompanyId,
        globalFilterCompanyId: activeCompanyId,
        setGlobalFilterCompanyId,
        activeSchema,
        refreshData,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
