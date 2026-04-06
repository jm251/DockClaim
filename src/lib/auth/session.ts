import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { buildDefaultRuleSet } from "@/lib/domain/defaults";
import { env, featureFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const DEMO_SESSION_COOKIE = "dockclaim-demo-user";

const appContextUserInclude = {
  memberships: {
    include: {
      organization: {
        include: {
          subscription: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.UserInclude;

type SlugLookupClient = Pick<typeof prisma, "organization"> | Pick<Prisma.TransactionClient, "organization">;

async function findUniqueSlug(base: string, client: SlugLookupClient = prisma) {
  const candidate = slugify(base) || "dockclaim";
  let slug = candidate;
  let index = 1;

  while (await client.organization.findUnique({ where: { slug } })) {
    slug = `${candidate}-${index}`;
    index += 1;
  }

  return slug;
}

async function loadAppContextUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: appContextUserInclude,
  });
}

async function acquireBootstrapLock(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`select pg_advisory_xact_lock(hashtext(${userId}))`;
}

async function bootstrapNewUser(authUser: SupabaseUser) {
  const fullName =
    (authUser.user_metadata.fullName as string | undefined) ||
    (authUser.user_metadata.full_name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    "DockClaim User";
  const inviteToken = authUser.user_metadata.inviteToken as string | undefined;
  const organizationName =
    (authUser.user_metadata.organizationName as string | undefined) || `${fullName} Freight Team`;
  const email = authUser.email ?? `${authUser.id}@unknown.local`;

  return prisma.$transaction(async (tx) => {
    await acquireBootstrapLock(tx, authUser.id);

    let user = await tx.user.findUnique({
      where: { id: authUser.id },
      include: appContextUserInclude,
    });

    if (user?.memberships.length) {
      return user;
    }

    if (!user) {
      user = await tx.user.create({
        data: {
          id: authUser.id,
          email,
          fullName,
        },
        include: appContextUserInclude,
      });
    }

    if (inviteToken) {
      const invitation = await tx.invitation.findUnique({
        where: { token: inviteToken },
      });

      if (invitation && invitation.status === "PENDING" && invitation.expiresAt > new Date()) {
        const membership = await tx.membership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: authUser.id,
            },
          },
        });

        if (!membership) {
          await tx.membership.create({
            data: {
              organizationId: invitation.organizationId,
              userId: authUser.id,
              role: invitation.role,
            },
          });
        }

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: authUser.id },
          include: appContextUserInclude,
        });
      }
    }

    const slug = await findUniqueSlug(organizationName, tx);
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: authUser.id,
        role: "OWNER",
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    });

    await tx.ruleSet.create({
      data: buildDefaultRuleSet(organization.id),
    });

    return tx.user.findUniqueOrThrow({
      where: { id: authUser.id },
      include: appContextUserInclude,
    });
  });
}

const getSupabaseBackedContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  let user = await loadAppContextUser(authUser.id);

  if (!user) {
    user = await bootstrapNewUser(authUser);
  }

  const membership = user.memberships[0];
  if (!membership) {
    return null;
  }

  return {
    authMode: "supabase" as const,
    user,
    membership,
    organization: membership.organization,
    subscription: membership.organization.subscription,
  };
});

const getDemoContext = cache(async () => {
  if (!featureFlags.isDemoMode) {
    return null;
  }

  const cookieStore = await cookies();
  const demoUserId = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (!demoUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: demoUserId },
    include: appContextUserInclude,
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  return {
    authMode: "demo" as const,
    user,
    membership: user.memberships[0],
    organization: user.memberships[0].organization,
    subscription: user.memberships[0].organization.subscription,
  };
});

export const getCurrentAppContext = cache(async () => {
  const demoContext = await getDemoContext();
  if (demoContext) {
    return demoContext;
  }

  return getSupabaseBackedContext();
});

export async function requireAppContext() {
  const context = await getCurrentAppContext();
  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireRole(roles: Array<"OWNER" | "OPS" | "BILLING" | "VIEWER">) {
  const context = await requireAppContext();
  if (!roles.includes(context.membership.role)) {
    redirect("/app/dashboard");
  }

  return context;
}

export async function startDemoSession() {
  if (!featureFlags.isDemoMode) {
    throw new Error("Demo mode is disabled.");
  }

  const demoMembership = await prisma.membership.findFirst({
    where: {
      role: "OWNER",
      organization: {
        slug: "dockclaim-demo",
      },
    },
  });

  if (!demoMembership) {
    throw new Error("Demo organization has not been seeded.");
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, demoMembership.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
}
