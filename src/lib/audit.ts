import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  organizationId: string;
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadataJson?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadataJson: (input.metadataJson ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
