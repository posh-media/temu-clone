import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/auth/AuthShell";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { authErrorMessage, useAuth } from "../store/AuthProvider";
import { useToast } from "../store/ToastProvider";

const MIN_PASSWORD_LENGTH = 6;

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await signUp(form.name, form.email, form.password);
      toast("Account created");
      navigate("/account", { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      toast("Welcome");
      navigate("/account", { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save addresses, track orders and keep your favourites in sync."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-3">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-card bg-deal/10 px-3 py-2.5 text-md text-deal">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Input label="Your name" required autoComplete="name" value={form.name} onChange={set("name")} />
        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={form.password}
          onChange={set("password")}
        />
        <Input
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
        />

        <Button type="submit" block size="lg" loading={busy} disabled={googleBusy}>
          Create account
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-sm text-ink-3">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-4">
        <GoogleAuthButton onClick={() => void google()} loading={googleBusy} disabled={busy} />
      </div>
    </AuthShell>
  );
}
