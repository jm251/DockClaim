import Link from "next/link";

import { acceptInvitationAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });
  const context = await getCurrentAppContext();

  if (!invitation) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
        <Card>
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>This invite link is invalid or has already been revoked.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Join {invitation.organization.name}</CardTitle>
          <CardDescription>
            DockClaim invite for {invitation.email} as {invitation.role.replace("_", " ")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {context ? (
            <form action={acceptInvitationAction.bind(null, token)}>
              <Button type="submit">Accept invitation</Button>
            </form>
          ) : (
            <div className="flex gap-3">
              <Link href={`/login?inviteToken=${token}`}>
                <Button variant="outline">Sign in</Button>
              </Link>
              <Link href={`/signup?inviteToken=${token}`}>
                <Button>Create account and join</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
