import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const KEY = "mr.session";

type Me = NonNullable<typeof api.auth.me._returnType>;

type Session = {
  token: string;
  /** undefined while loading, null when signed out. */
  me: Me | null | undefined;
  signIn: (token: string, expiresAt: number) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

function readStored(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "";
    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number };
    return expiresAt > Date.now() ? token : "";
  } catch {
    return "";
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readStored);
  const me = useQuery(api.auth.me, token ? { token } : "skip");
  const logout = useMutation(api.auth.logout);

  // The server says the session is gone (expired, revoked, suspended) — drop it.
  useEffect(() => {
    if (token && me === null) {
      localStorage.removeItem(KEY);
      setToken("");
    }
  }, [token, me]);

  const signIn = useCallback((t: string, expiresAt: number) => {
    localStorage.setItem(KEY, JSON.stringify({ token: t, expiresAt }));
    setToken(t);
  }, []);

  const signOut = useCallback(async () => {
    const t = token;
    localStorage.removeItem(KEY);
    setToken("");
    if (t) await logout({ token: t }).catch(() => {});
  }, [token, logout]);

  return (
    <Ctx.Provider value={{ token, me: token ? me : null, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

/** For pages behind sign-in: the token and the user, both guaranteed. */
export function useAuthed() {
  const { token, me } = useSession();
  if (!me) throw new Error("useAuthed on a signed-out page");
  return { token, me };
}
