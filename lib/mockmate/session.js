// Client-side session helpers for MockMate

/**
 * Get user ID from NextAuth session. Pass the session from useSession().
 * Returns null when unauthenticated — callers should redirect to /login.
 */
export function getUserId(session) {
  if (session?.user?.id) return session.user.id;
  if (session?.user?.email) return session.user.email;
  return null;
}

export function getUserName(session) {
  if (session?.user?.name) return session.user.name;
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mockmate.name") || null;
}

export function getUserImage(session) {
  return session?.user?.image || null;
}

export function setUserName(name) {
  if (typeof window !== "undefined") localStorage.setItem("mockmate.name", name);
}

export async function fetchCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user || null;
  } catch (err) {
    return null;
  }
}

export async function logout() {
  if (typeof window === "undefined") return;
  try {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
  } catch (err) {
    window.location.href = "/login";
  }
}
