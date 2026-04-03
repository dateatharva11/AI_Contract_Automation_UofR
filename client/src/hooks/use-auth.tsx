import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "contract_manager" | "reviewer" | "vendor";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  username?: string;
}

interface AuthContextType {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
}

const DEFAULT_USER: AuthUser = {
  id: 1,
  fullName: "Alice Admin",
  email: "alice@uni.edu",
  role: "contract_manager",
  username: "admin1",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(DEFAULT_USER);


  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
