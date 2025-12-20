import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'accountant' | 'seller';

interface SimpleUser {
  id: string;
  username: string;
  role: UserRole;
  fullName?: string;
}

interface SimpleAuthContextType {
  user: SimpleUser | null;
  userRole: string | null;
  isAdmin: boolean;
  isAccountant: boolean;
  isSeller: boolean;
  isLoading: boolean;
  signOut: () => void;
  setUser: (user: SimpleUser) => void;
  hasSupabaseConfig: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider = ({ children }: SimpleAuthProviderProps) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSupabaseConfig, setHasSupabaseConfig] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('jnk_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('jnk_user');
      }
    }
    
    // Check if Supabase is configured
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_') || supabaseKey.includes('your_')) {
        console.warn('Supabase not configured. Using demo mode.');
        setHasSupabaseConfig(false);
      }
    } catch (error) {
      console.warn('Could not check Supabase config. Using demo mode.');
      setHasSupabaseConfig(false);
    }
    
    setIsLoading(false);
  }, []);

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('jnk_user');
  };

  const setUserData = (userData: SimpleUser) => {
    setUser(userData);
    localStorage.setItem('jnk_user', JSON.stringify(userData));
  };

  const value: SimpleAuthContextType = {
    user,
    userRole: user?.role || null,
    isAdmin: user?.role === 'admin',
    isAccountant: user?.role === 'accountant',
    isSeller: user?.role === 'seller',
    isLoading,
    signOut,
    setUser: setUserData,
    hasSupabaseConfig,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};