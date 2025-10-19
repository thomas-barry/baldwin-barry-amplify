import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string | null;
  isLoading: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isAdmin: false,
  username: null,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType>({
  ...initialAuthState,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  checkUser: async () => {
    throw new Error('AuthContext not initialized');
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  const checkUser = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      // Extract user groups to check if user is an admin
      const groups = session.tokens?.accessToken.payload['cognito:groups'] as string[] | undefined;
      const isAdmin = groups ? groups.includes('admin') : false;

      setAuthState({
        isAuthenticated: true,
        isAdmin,
        username: currentUser.username,
        isLoading: false,
        error: null,
      });
    } catch {
      // Not authenticated
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        username: null,
        isLoading: false,
        error: null,
      });
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkUser();
  }, []);

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await signIn({ username, password });
      await checkUser();
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Login failed'),
      }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      await signOut();
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        username: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Logout failed'),
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        checkUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
