import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/auth/AuthShell";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { authErrorMessage, useAuth } from "../store/AuthProvider";
import { useToast } from "../store/ToastProvider";

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/account";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      toast("Welcome back");
      navigate(redirectTo, { replace: true });
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
      toast("Welcome back");
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your email and password to access your orders and addresses."
      footer={
        <>
          New to Temu?{" "}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            Create an account
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

        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" block size="lg" loading={busy} disabled={googleBusy}>
          Sign in
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
