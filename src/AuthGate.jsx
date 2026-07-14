import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const C = { ink: "#14171F", paper: "#F6F2E9", gold: "#C89B3C", line: "#E1DACB", danger: "#B5483F" };

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{ background: C.paper, fontFamily: "'Inter', sans-serif" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: "#fff", border: `1px solid ${C.line}` }}
      >
        <div className="text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: C.gold }}>
          Prime Rides
        </div>
        <div className="text-xl font-semibold mb-5" style={{ color: C.ink }}>
          Staff Sign In
        </div>

        <label className="block text-xs font-medium mb-1" style={{ color: C.ink }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg px-3 py-2 mb-3 text-sm outline-none"
          style={{ border: `1px solid ${C.line}` }}
        />

        <label className="block text-xs font-medium mb-1" style={{ color: C.ink }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-3 py-2 mb-4 text-sm outline-none"
          style={{ border: `1px solid ${C.line}` }}
        />

        {error && (
          <div className="text-xs mb-3" style={{ color: C.danger }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2 text-sm font-semibold"
          style={{ background: C.gold, color: "#fff" }}
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>

        <div className="text-[11px] mt-4" style={{ color: "#7C8087" }}>
          Staff accounts are created in the Supabase dashboard under Authentication → Users.
          There's no public sign-up — only people you add can log in.
        </div>
      </form>
    </div>
  );
}

function isPublicMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("public") === "1") return true;
    if (window.location.hash && window.location.hash.includes("public")) return true;
  } catch (e) {
    return false;
  }
  return false;
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    if (isPublicMode()) {
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (isPublicMode()) {
    return children;
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper }}>
        <div style={{ color: C.gold }}>Loading…</div>
      </div>
    );
  }

  if (!session) return <LoginForm />;

  return children;
}
