import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LockKey, WarningCircle } from "@phosphor-icons/react";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { logAdminAction } from "@/lib/content";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-3 text-sm text-paper-50 placeholder:text-paper-600 transition-colors focus:border-flare-500 focus:outline-none";

export function AdminLogin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/admin" replace />;
  }

  if (!isFirebaseConfigured || !firebaseAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-sm rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-8 text-center">
          <WarningCircle size={28} className="mx-auto text-flare-400" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-paper-300">
            O login administrativo ainda não está configurado neste ambiente.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth!, email, password);
      void logAdminAction("Login no painel administrativo");
      navigate("/admin", { replace: true });
    } catch {
      setError("E-mail ou senha inválidos.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-flare-500/10">
            <LockKey size={22} className="text-flare-400" aria-hidden />
          </div>
          <h1 className="mt-5 font-display text-2xl text-paper-50">Painel administrativo</h1>
          <p className="mt-2 text-sm text-paper-400">Acesso restrito à equipe Ronald Filmmaker.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-9 flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-paper-400">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-paper-400">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <Link
          to="/"
          className="mt-8 block text-center text-sm text-paper-600 transition-colors hover:text-flare-400"
        >
          Voltar para o site
        </Link>
      </div>
    </div>
  );
}
