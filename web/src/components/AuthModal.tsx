import { useState, useEffect } from "react";
import { useAuthState, useAuthActions } from "../hooks/useAuth";
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle } from "lucide-react";

type Mode = "signin" | "signup";

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

export function AuthModal({ open, onClose, initialMode = "signin" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const { error } = useAuthState();
  const { login, register, clearError } = useAuthActions();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setConfirm("");
      clearError();
    }
  }, [open, initialMode, clearError]);

  if (!open) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirm("");
    clearError();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && password !== confirm) return;

    setBusy(true);
    try {
      if (mode === "signin") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      resetForm();
      onClose();
    } catch {
      // error is already surfaced by context
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] sm:max-h-[90vh] w-full sm:max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-dark px-5 py-4">
          <div>
            <h2 className="font-serif text-xl text-ink">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-xs text-ink-faint mt-0.5">
              {mode === "signin"
                ? "Sign in to sync your taste profile across devices."
                : "Join taste.node to save your rankings."}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="rounded-full p-1 text-ink-faint hover:bg-cream hover:text-ink-muted transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
              <Mail size={13} /> Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2.5 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
              <Lock size={13} /> Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2.5 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <label htmlFor="auth-confirm" className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                <Lock size={13} /> Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-cream-dark bg-cream px-3 py-2.5 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (mode === "signup" && password !== confirm)}
            className="btn-primary w-full gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mode === "signin" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <div className="flex items-center justify-center gap-1 text-xs text-ink-faint">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-medium text-sienna-600 hover:text-sienna-700 transition">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("signin")} className="font-medium text-sienna-600 hover:text-sienna-700 transition">
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl bg-cream px-3 py-2.5 text-[11px] text-ink-faint leading-relaxed">
            <strong className="text-ink-muted">Session-only for now.</strong>{" "}
            Your profile is saved locally. Sign in to prepare for cloud sync once the backend is live.
          </div>
        </form>
      </div>
    </div>
  );
}
