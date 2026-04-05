import "server-only";

import { startOfMonth } from "date-fns";

import { getClaimAgingBucket, sumEligibleCandidates } from "@/lib/loads";
import { prisma } from "@/lib/prisma";

export async function getDashboardData(organizationId: string) {
  const [loads, claims, facilities, customers] = await Promise.all([
    prisma.load.findMany({
      where: { organizationId },
      include: {
        candidates: true,
        stops: true,
      },
    }),
    prisma.claim.findMany({
      where: { organizationId },
      include: {
        customer: true,
      },
    }),
    prisma.facility.findMany({
      where: { organizationId },
      include: {
        loads: {
          include: {
            stops: true,
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      include: {
        claims: true,
      },
    }),
  ]);

  const monthStart = startOfMonth(new Date());
  const totalPotentialClaimsThisMonth = loads
    .filter((load) => load.deliveryDate >= monthStart)
    .reduce((total, load) => total + sumEligibleCandidates(load.candidates), 0);
  const totalSentThisMonth = claims
    .filter((claim) => claim.sentAt && claim.sentAt >= monthStart)
    .reduce((total, claim) => total + Number(claim.totalAmount), 0);
  const totalRecoveredThisMonth = claims
    .filter((claim) => claim.paidAt && claim.paidAt >= monthStart)
    .reduce((total, claim) => total + Number(claim.paidAmount), 0);

  const aging = claims.reduce<Record<string, number>>((accumulator, claim) => {
    const bucket = getClaimAgingBucket(claim.sentAt, claim.createdAt);
    accumulator[bucket] = (accumulator[bucket] ?? 0) + 1;
    return accumulator;
  }, {});

  const topFacilitiesByDwell = facilities
    .map((facility) => {
      const dwellMinutes = facility.loads.flatMap((load) => load.stops).reduce((total, stop) => {
        if (!stop.checkInTime || !stop.departureTime) {
          return total;
        }

        return total + Math.max(0, (stop.departureTime.getTime() - stop.checkInTime.getTime()) / 60000);
      }, 0);

      return {
        id: facility.id,
        name: facility.name,
        dwellMinutes,
      };
    })
    .sort((a, b) => b.dwellMinutes - a.dwellMinutes)
    .slice(0, 10);

  const topCustomersByRecoveredAmount = customers
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      recoveredAmount: customer.claims.reduce((total, claim) => total + Number(claim.paidAmount), 0),
    }))
    .sort((a, b) => b.recoveredAmount - a.recoveredAmount)
    .slice(0, 10);

  return {
    totalPotentialClaimsThisMonth,
    totalSentThisMonth,
    totalRecoveredThisMonth,
    aging,
    topFacilitiesByDwell,
    topCustomersByRecoveredAmount,
  };
}

export async function getAppCollections(organizationId: string) {
  const [loads, claims, customers, facilities, rules, templates, invitations] = await Promise.all([
    prisma.load.findMany({
      where: { organizationId },
      include: {
        customer: true,
        facility: true,
        carrier: true,
        candidates: true,
        claim: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.claim.findMany({
      where: { organizationId },
      include: {
        customer: true,
        load: true,
        lineItems: true,
        messages: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId },
      include: { customer: true },
      orderBy: { name: "asc" },
    }),
    prisma.ruleSet.findMany({
      where: { organizationId },
      include: { customer: true, facility: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.csvMappingTemplate.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    loads,
    claims,
    customers,
    facilities,
    rules,
    templates,
    invitations,
  };
}

export async function getLoadDetail(organizationId: string, loadId: string) {
  return prisma.load.findFirstOrThrow({
    where: {
      id: loadId,
      organizationId,
    },
    include: {
      customer: true,
      carrier: true,
      facility: true,
      stops: true,
      documents: {
        include: {
          extractedFields: true,
        },
        orderBy: { createdAt: "desc" },
      },
      candidates: {
        include: {
          ruleSet: true,
          stop: true,
        },
      },
      claim: {
        include: {
          lineItems: true,
          messages: true,
        },
      },
    },
  });
}

export async function getClaimDetail(organizationId: string, claimId: string) {
  return prisma.claim.findFirstOrThrow({
    where: {
      id: claimId,
      organizationId,
    },
    include: {
      organization: true,
      customer: true,
      load: {
        include: {
          documents: true,
          stops: true,
          candidates: true,
        },
      },
      lineItems: true,
      messages: true,
    },
  });
}
