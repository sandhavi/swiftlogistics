"use client";

import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export type UserRole = "admin" | "client" | "driver";

// Allow configuring admin emails via env; fallback to known demo admin
const ADMIN_EMAILS: string[] = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "aadmin@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export async function resolveUser(): Promise<User | null> {
    // Return current user if available, otherwise wait once for auth state
    if (auth.currentUser) return auth.currentUser;
    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
            unsub();
            resolve(u);
        });
    });
}

export async function fetchUserRole(user: User): Promise<UserRole | null> {
    try {
        // Admin by email allowlist takes precedence
        if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return "admin";
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return null;
        const data = snap.data() as { accountType?: string };
        if (!data?.accountType) return null;
        if (data.accountType === "admin") return "admin";
        if (data.accountType === "client") return "client";
        if (data.accountType === "driver") return "driver";
        return null;
    } catch {
        return null;
    }
}

export async function getCurrentUserAndRole(): Promise<{ user: User | null; role: UserRole | null }> {
    const user = await resolveUser();
    if (!user) return { user: null, role: null };
    const role = await fetchUserRole(user);
    return { user, role };
}

export function roleAllowed(role: UserRole | null, allowed: UserRole[]): boolean {
    return !!role && allowed.includes(role);
}
