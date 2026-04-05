import { PrismaClient } from "@prisma/client";

declare global {
  var __dockclaimPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__dockclaimPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__dockclaimPrisma = prisma;
}
