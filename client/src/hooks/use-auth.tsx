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
  contract_manager: { id: 1, fullName: "Dr. Eleanor Vance", email: "admin@university.edu", role: "contract_manager" },
  reviewer: { id: 2, fullName: "Prof. Arthur Pendelton", email: "reviewer@university.edu", role: "reviewer" },
  vendor: { id: 3, fullName: "Acme Supplies Rep", email: "contact@acme.com", role: "vendor" },
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
