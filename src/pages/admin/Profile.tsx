import { useState, type FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { CheckCircle, WarningCircle, UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { logAdminAction } from "@/lib/content";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";
const labelClass = "mb-1.5 block text-xs text-paper-400";

export function AdminProfile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (!user?.email) {
      setError("Sessão inválida — entre novamente.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As duas senhas novas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await logAdminAction("Trocou a própria senha");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch {
      setError("Senha atual incorreta, ou a sessão expirou — tente entrar novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Perfil</h1>
      <p className="mt-1 text-sm text-paper-400">Sua conta de acesso ao painel.</p>

      <div className="mt-6 flex items-center gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-flare-500/10">
          <UserCircle size={20} className="text-flare-400" aria-hidden />
        </div>
        <p className="text-sm text-paper-200">{user?.email ?? "—"}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex max-w-sm flex-col gap-4">
        <p className="text-sm font-semibold text-paper-100">Trocar senha</p>
        <div>
          <label htmlFor="currentPassword" className={labelClass}>
            Senha atual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="newPassword" className={labelClass}>
            Nova senha
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-2 text-sm text-flare-400">
            <WarningCircle size={16} aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Salvando..." : "Atualizar senha"}
          </Button>
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-flare-400">
              <CheckCircle size={16} weight="fill" aria-hidden />
              Senha atualizada
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
