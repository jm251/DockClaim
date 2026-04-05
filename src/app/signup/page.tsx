import { SignupForm } from "@/components/auth/auth-forms";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ inviteToken?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
      <SignupForm inviteToken={params?.inviteToken} />
    </div>
  );
}
