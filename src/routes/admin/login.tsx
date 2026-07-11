import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowRight } from "lucide-react";
import { LOGO_URL } from "@/lib/paakashala-menu";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate({ to: "/admin/orders" });
    } catch (err: any) {
      setError("Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-luxe">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-24 w-full max-w-[280px] items-center justify-center rounded-2xl bg-card">
            <img src="/logo-new.png" alt="Paakashala" className="h-full w-full object-contain mix-blend-multiply" />
          </div>
          <h1 className="text-2xl font-bold text-brown-deep mt-2">Admin Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage Paakashala
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-center text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-brown-deep/80">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gmail.com"
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-brown-deep outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-brown-deep/80">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-brown-deep outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brown-gradient px-4 py-3.5 text-sm font-bold text-cream shadow-luxe transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? "Authenticating..." : "Sign In"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
