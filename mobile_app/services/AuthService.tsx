import React, { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'Admin' | 'Member';

interface User {
  id: string;
  name: string;
  role: Role;
  zone: string;
  walletId: string;
}

interface AuthContextType {
  user: User;
  setRole: (role: Role) => void;
  isAdmin: boolean;
}

const mockUser: User = {
  id: 'U-1234',
  name: 'Alex Johnson',
  role: 'Admin',
  zone: 'Brooklyn Heights',
  walletId: '$ilp.interledger-test.dev/6f8390fa',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(mockUser);

  const setRole = (role: Role) => {
    setUser(prev => ({ ...prev, role }));
  };

  const isAdmin = user.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, setRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
