import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "contract_manager" | "reviewer" | "vendor";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User;
  setRole: (role: Role) => void;
}

const MOCK_USERS: Record<Role, User> = {
  contract_manager: { id: 1, fullName: "Alice Admin", email: "alice@uni.edu", role: "contract_manager" },
  reviewer: { id: 2, fullName: "Bob Reviewer", email: "bob@uni.edu", role: "reviewer" },
  vendor: { id: 3, fullName: "Charlie Vendor", email: "charlie@vendor.com", role: "vendor" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(MOCK_USERS.contract_manager);

  const setRole = (role: Role) => {
    setUser(MOCK_USERS[role]);
  };

  return (
    <AuthContext.Provider value={{ user, setRole }}>
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
