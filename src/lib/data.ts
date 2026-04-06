import "server-only";

import { startOfMonth } from "date-fns";

import { getClaimAgingBucket, sumEligibleCandidates } from "@/lib/loads";
import { prisma } from "@/lib/prisma";

export async function getDashboardData(organizationId: string) {
  const [loads, claims, facilities, customers] = await Promise.all([
    prisma.load.findMany({
      where: { organizationId },
      select: {
        deliveryDate: true,
        candidates: {
          select: {
            eligibilityStatus: true,
            calculatedAmount: true,
          },
        },
      },
    }),
    prisma.claim.findMany({
      where: { organizationId },
      select: {
        totalAmount: true,
        paidAmount: true,
        sentAt: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    prisma.facility.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        loads: {
          select: {
            stops: {
              select: {
                checkInTime: true,
                departureTime: true,
              },
            },
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        claims: {
          select: {
            paidAmount: true,
          },
        },
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

export async function getLoadsList(organizationId: string) {
  return prisma.load.findMany({
    where: { organizationId },
    select: {
      id: true,
      externalLoadNumber: true,
      status: true,
      customer: {
        select: {
          name: true,
          billingEmail: true,
        },
      },
      facility: {
        select: {
          name: true,
        },
      },
      candidates: {
        select: {
          eligibilityStatus: true,
          calculatedAmount: true,
        },
      },
      claim: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getClaimsList(organizationId: string) {
  return prisma.claim.findMany({
    where: { organizationId },
    select: {
      id: true,
      claimNumber: true,
      status: true,
      totalAmount: true,
      customer: {
        select: {
          name: true,
          billingEmail: true,
        },
      },
      load: {
        select: {
          externalLoadNumber: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCustomersList(organizationId: string) {
  return prisma.customer.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      billingEmail: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getFacilitiesList(organizationId: string) {
  const [facilities, customers] = await Promise.all([
    prisma.facility.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        timezone: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    facilities,
    customers,
  };
}

export async function getRulesPageData(organizationId: string) {
  const [rules, customers, facilities] = await Promise.all([
    prisma.ruleSet.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        active: true,
        detentionFreeMinutes: true,
        detentionRatePerHour: true,
        layoverFlatAmount: true,
        tonuFlatAmount: true,
        customer: {
          select: {
            name: true,
          },
        },
        facility: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.customer.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.facility.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    rules,
    customers,
    facilities,
  };
}

export async function getImportsPageData(organizationId: string) {
  return prisma.csvMappingTemplate.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      mappingJson: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSettingsPageData(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLoadDetail(organizationId: string, loadId: string) {
  return prisma.load.findFirstOrThrow({
    where: {
      id: loadId,
      organizationId,
    },
    select: {
      id: true,
      externalLoadNumber: true,
      pickupDate: true,
      deliveryDate: true,
      customer: {
        select: {
          name: true,
        },
      },
      carrier: {
        select: {
          name: true,
        },
      },
      facility: {
        select: {
          name: true,
        },
      },
      stops: {
        select: {
          id: true,
          type: true,
          facilityName: true,
          timezone: true,
          appointmentStart: true,
          checkInTime: true,
          departureTime: true,
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          storageUrl: true,
          documentType: true,
          extractionStatus: true,
          extractionConfidence: true,
          rawExtractionJson: true,
          reviewedExtractionJson: true,
        },
        orderBy: { createdAt: "desc" },
      },
      candidates: {
        select: {
          id: true,
          type: true,
          eligibilityStatus: true,
          calculatedAmount: true,
          explanation: true,
          evidenceSummary: true,
        },
        orderBy: { createdAt: "desc" },
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
    select: {
      id: true,
      claimNumber: true,
      status: true,
      totalAmount: true,
      customer: {
        select: {
          name: true,
          billingEmail: true,
        },
      },
      load: {
        select: {
          externalLoadNumber: true,
          documents: {
            select: {
              id: true,
              fileName: true,
              extractionStatus: true,
              documentType: true,
            },
            orderBy: { createdAt: "desc" },
          },
          stops: {
            select: {
              id: true,
              type: true,
              facilityName: true,
              timezone: true,
              checkInTime: true,
              departureTime: true,
            },
            orderBy: [{ type: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      lineItems: {
        select: {
          id: true,
          accessorialType: true,
          amount: true,
          description: true,
        },
      },
      messages: {
        select: {
          id: true,
          direction: true,
          subject: true,
          body: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
