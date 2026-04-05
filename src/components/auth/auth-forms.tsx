"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { startDemoAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loginSchema, signupSchema } from "@/lib/validators";

type LoginValues = z.output<typeof loginSchema>;
type SignupValues = z.output<typeof signupSchema>;

export function LoginForm({ showDemoMode }: { showDemoMode: boolean }) {
  const router = useRouter();
  const form = useForm<z.input<typeof loginSchema>, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast.error("Supabase auth is not configured in this environment.");
      return;
    }

    const { error } = await client.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in.");
    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-fluid-2xl">Sign in</CardTitle>
        <CardDescription>Access your claim queue, evidence timeline, and recovery dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(() => {
              void onSubmit(values);
            });
          })}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>

        {showDemoMode ? (
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={async () => {
              await startDemoAction();
              router.push("/app/dashboard");
              router.refresh();
            }}
          >
            Continue in demo mode
          </Button>
        ) : null}

        <p className="text-fluid-sm text-[var(--muted-foreground)]">
          New to DockClaim?{" "}
          <Link className="font-medium text-[var(--primary)]" href="/signup">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignupForm({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const form = useForm<z.input<typeof signupSchema>, unknown, SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      organizationName: "",
      inviteToken,
    },
  });

  async function onSubmit(values: SignupValues) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast.error("Supabase auth is not configured in this environment.");
      return;
    }

    const confirmationUrl = new URL("/auth/callback", window.location.origin);
    confirmationUrl.searchParams.set("next", "/app/dashboard");

    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: confirmationUrl.toString(),
        data: {
          fullName: values.fullName,
          organizationName: values.organizationName,
          inviteToken: values.inviteToken,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      toast.success("Account created. Check your email to confirm your account.");
      router.push("/login");
      router.refresh();
      return;
    }

    toast.success("Account created.");
    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-fluid-2xl">Create workspace</CardTitle>
        <CardDescription>Set up your brokerage team, import loads, and start recovering missed accessorials.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(() => {
              void onSubmit(values);
            });
          })}
        >
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...form.register("fullName")} />
          </div>
          <div>
            <Label htmlFor="organizationName">Organization</Label>
            <Input id="organizationName" {...form.register("organizationName")} />
          </div>
          <div>
            <Label htmlFor="signupEmail">Email</Label>
            <Input id="signupEmail" type="email" {...form.register("email")} />
          </div>
          <div>
            <Label htmlFor="signupPassword">Password</Label>
            <Input id="signupPassword" type="password" {...form.register("password")} />
          </div>
          <Button className="w-full" type="submit">
            Create DockClaim workspace
          </Button>
        </form>
        <p className="text-fluid-sm text-[var(--muted-foreground)]">
          Already have access?{" "}
          <Link className="font-medium text-[var(--primary)]" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
