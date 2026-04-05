import { LoginForm } from "@/components/auth/auth-forms";
import { featureFlags } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
      <LoginForm showDemoMode={featureFlags.isDemoMode} />
    </div>
  );
}
