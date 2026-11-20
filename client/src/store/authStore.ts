import { create } from "zustand";
import { api } from "../lib/api";

export type Role = "buyer" | "agent" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  loading: boolean; // true until the first /me check finishes
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "buyer" | "agent";
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init: async () => {
    try {
      const { user } = await api<{ user: User }>("/api/auth/me");
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const { user } = await api<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    set({ user });
  },
  register: async (data) => {
    const { user } = await api<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    set({ user });
  },
  logout: async () => {
    await api("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));
