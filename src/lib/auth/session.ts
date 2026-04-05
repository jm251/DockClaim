import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { buildDefaultRuleSet } from "@/lib/domain/defaults";
import { env, featureFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const DEMO_SESSION_COOKIE = "dockclaim-demo-user";

async function findUniqueSlug(base: string) {
  const candidate = slugify(base) || "dockclaim";
  let slug = candidate;
  let index = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${candidate}-${index}`;
    index += 1;
  }

  return slug;
}

async function bootstrapNewUser(authUser: SupabaseUser) {
  const fullName =
    (authUser.user_metadata.fullName as string | undefined) ||
    (authUser.user_metadata.full_name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    "DockClaim User";
  const inviteToken = authUser.user_metadata.inviteToken as string | undefined;

  if (inviteToken) {
    const invitation = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      include: { organization: { include: { subscription: true } } },
    });

    if (invitation && invitation.status === "PENDING" && invitation.expiresAt > new Date()) {
      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: authUser.id,
            email: authUser.email ?? `${authUser.id}@unknown.local`,
            fullName,
          },
        });

        await tx.membership.create({
          data: {
            organizationId: invitation.organizationId,
            userId: createdUser.id,
            role: invitation.role,
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        return createdUser;
      });

      return prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  subscription: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }
  }

  const organizationName =
    (authUser.user_metadata.organizationName as string | undefined) || `${fullName} Freight Team`;
  const slug = await findUniqueSlug(organizationName);

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
      },
    });

    await tx.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? `${authUser.id}@unknown.local`,
        fullName,
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
  });

  return prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              subscription: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function getSupabaseBackedContext() {
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

  let user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              subscription: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

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
}

async function getDemoContext() {
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
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              subscription: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
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
}

export async function getCurrentAppContext() {
  const demoContext = await getDemoContext();
  if (demoContext) {
    return demoContext;
  }

  return getSupabaseBackedContext();
}

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
