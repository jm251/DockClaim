import { createClient } from "@supabase/supabase-js";
import type { Prisma } from "@prisma/client";

import { buildDefaultRuleSet } from "../src/lib/domain/defaults";
import { env } from "../src/lib/env";
import { createOrRefreshClaimForLoad, recalculateLoadCandidates } from "../src/lib/loads";
import { prisma } from "../src/lib/prisma";

const FALLBACK_DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_EMAIL = "demo@dockclaim.dev";

async function ensureDemoAuthUser() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_DEMO_USER_ID;
  }

  try {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: listed } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = listed.users.find((user) => user.email === DEMO_EMAIL);
    if (existing) {
      return existing.id;
    }

    const { data: created } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: "DockClaim123!",
      email_confirm: true,
      user_metadata: {
        fullName: "Demo Owner",
        organizationName: "DockClaim Demo",
      },
    });

    return created.user?.id ?? FALLBACK_DEMO_USER_ID;
  } catch {
    return FALLBACK_DEMO_USER_ID;
  }
}

function hoursAfter(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const demoUserId = await ensureDemoAuthUser();

  const existingOrg = await prisma.organization.findUnique({
    where: { slug: "dockclaim-demo" },
  });

  if (existingOrg) {
    await prisma.organization.delete({
      where: { id: existingOrg.id },
    });
  }

  await prisma.user.deleteMany({
    where: {
      id: demoUserId,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: "DockClaim Demo",
      slug: "dockclaim-demo",
    },
  });

  await prisma.user.create({
    data: {
      id: demoUserId,
      email: DEMO_EMAIL,
      fullName: "Demo Owner",
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: demoUserId,
      role: "OWNER",
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  const customers = await prisma.$transaction([
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "Acme Industrial Logistics",
        billingEmail: "billing@acme-industrial.example",
        status: "ACTIVE",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "Northline Cold Chain",
        billingEmail: "ap@northline-cold.example",
        status: "ACTIVE",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "RiverPort Foods",
        billingEmail: "claims@riverport-foods.example",
        status: "ACTIVE",
      },
    }),
  ]);

  const facilities = await Promise.all([
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[0].id,
        name: "Acme Dallas Crossdock",
        address: "1001 Freight Row",
        city: "Dallas",
        state: "TX",
        timezone: "America/Chicago",
      },
    }),
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[0].id,
        name: "Acme Joliet DC",
        address: "8100 Warehouse Pkwy",
        city: "Joliet",
        state: "IL",
        timezone: "America/Chicago",
      },
    }),
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[1].id,
        name: "Northline Atlanta Cooler",
        address: "6000 Icehouse Rd",
        city: "Atlanta",
        state: "GA",
        timezone: "America/New_York",
      },
    }),
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[1].id,
        name: "Northline Newark Cold Storage",
        address: "77 Port Loop",
        city: "Newark",
        state: "NJ",
        timezone: "America/New_York",
      },
    }),
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[2].id,
        name: "RiverPort Memphis Grocery Hub",
        address: "4900 Produce Lane",
        city: "Memphis",
        state: "TN",
        timezone: "America/Chicago",
      },
    }),
    prisma.facility.create({
      data: {
        organizationId: organization.id,
        customerId: customers[2].id,
        name: "RiverPort Fresno Produce DC",
        address: "222 Orchard Ave",
        city: "Fresno",
        state: "CA",
        timezone: "America/Los_Angeles",
      },
    }),
  ]);

  const carriers = await Promise.all([
    prisma.carrier.create({
      data: {
        organizationId: organization.id,
        name: "BrightLine Transport",
        contactEmail: "dispatch@brightline.example",
      },
    }),
    prisma.carrier.create({
      data: {
        organizationId: organization.id,
        name: "Summit Fleet Services",
        contactEmail: "ops@summitfleet.example",
      },
    }),
  ]);

  const defaultRule = await prisma.ruleSet.create({
    data: buildDefaultRuleSet(organization.id),
  });

  await prisma.ruleSet.create({
    data: {
      organizationId: organization.id,
      customerId: customers[0].id,
      name: "Acme customer rule",
      priority: 5,
      currency: "USD",
      active: true,
      detentionEnabled: true,
      detentionFreeMinutes: 90,
      detentionRatePerHour: 95,
      detentionBillingIncrementMinutes: 30,
      detentionRoundingMode: "UP",
      layoverEnabled: true,
      layoverFlatAmount: 325,
      tonuEnabled: true,
      tonuFlatAmount: 200,
      lumperEnabled: true,
      lumperReimbursementMode: "ACTUAL",
      lumperCapAmount: 250,
      effectiveStartDate: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  await prisma.ruleSet.create({
    data: {
      organizationId: organization.id,
      customerId: customers[0].id,
      facilityId: facilities[0].id,
      name: "Acme Dallas detention override",
      priority: 10,
      currency: "USD",
      active: true,
      detentionEnabled: true,
      detentionFreeMinutes: 60,
      detentionRatePerHour: 110,
      detentionBillingIncrementMinutes: 30,
      detentionRoundingMode: "UP",
      layoverEnabled: true,
      layoverFlatAmount: 350,
      tonuEnabled: true,
      tonuFlatAmount: 225,
      lumperEnabled: true,
      lumperReimbursementMode: "ACTUAL",
      lumperCapAmount: 300,
      effectiveStartDate: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  const loads: Prisma.LoadUncheckedCreateInput[] = [];
  for (let index = 0; index < 30; index += 1) {
    const customer = customers[index % customers.length];
    const facility = facilities[index % facilities.length];
    const carrier = carriers[index % carriers.length];
    const baseDate = new Date(Date.UTC(2026, 2, 1 + index, 13, 0, 0));

    loads.push({
      organizationId: organization.id,
      externalLoadNumber: `DC-${1000 + index}`,
      customerId: customer.id,
      carrierId: carrier.id,
      facilityId: facility.id,
      status: "IMPORTED",
      pickupDate: baseDate,
      deliveryDate: hoursAfter(baseDate, index % 5 === 0 ? 26 : 12),
      commodity: index % 2 === 0 ? "Frozen foods" : "Industrial goods",
      sourceType: "CSV",
      sourceFileName: "dockclaim-sample-loads.csv",
      notes:
        index === 1
          ? "LAYOVER_REASON=Customer pushed appointment to next day"
          : index === 2
            ? "CANCELLATION=true"
            : index === 3
              ? "LUMPER_AMOUNT=184.5\nLUMPER_NOTE=Manual receipt review confirmed."
              : null,
    });
  }

  const createdLoads = await Promise.all(loads.map((load) => prisma.load.create({ data: load })));

  for (let index = 0; index < createdLoads.length; index += 1) {
    const load = createdLoads[index];
    const facility = facilities[index % facilities.length];
    const pickupStart = hoursAfter(load.pickupDate, 0);
    const deliveryStart = hoursAfter(load.pickupDate, index % 5 === 0 ? 24 : 10);
    const detentionHours = index < 12 ? 4 + (index % 3) : 1.25;

    await prisma.stop.createMany({
      data: [
        {
          loadId: load.id,
          type: "PICKUP",
          facilityName: `${facility.name} Pickup`,
          timezone: facility.timezone,
          appointmentStart: pickupStart,
          appointmentEnd: hoursAfter(pickupStart, 1),
        },
        {
          loadId: load.id,
          type: "DELIVERY",
          facilityName: facility.name,
          city: facility.city,
          state: facility.state,
          timezone: facility.timezone,
          appointmentStart: deliveryStart,
          appointmentEnd: hoursAfter(deliveryStart, 1),
          arrivalTime: deliveryStart,
          checkInTime: hoursAfter(deliveryStart, 0.25),
          dockInTime: hoursAfter(deliveryStart, 0.5),
          loadedOutTime: hoursAfter(deliveryStart, detentionHours - 0.25),
          departureTime: hoursAfter(deliveryStart, detentionHours),
        },
      ],
    });
  }

  await prisma.document.createMany({
    data: [
      {
        organizationId: organization.id,
        loadId: createdLoads[0].id,
        fileName: "detention-checkin-screenshot.png",
        fileType: "image/png",
        fileSize: 128000,
        storagePath: "seed/detention-checkin",
        storageUrl: "https://example.com/detention-checkin.png",
        documentType: "CHECKIN_SCREENSHOT",
        uploadedByUserId: demoUserId,
        extractionStatus: "SUCCESS",
        extractionConfidence: 0.94,
        rawExtractionJson: {
          document_type: "CHECKIN_SCREENSHOT",
          referenced_load_number: createdLoads[0].externalLoadNumber,
          customer_name: customers[0].name,
          facility_name: facilities[0].name,
          appointment_time: createdLoads[0].deliveryDate.toISOString(),
          arrival_time: hoursAfter(createdLoads[0].pickupDate, 24).toISOString(),
          check_in_time: hoursAfter(createdLoads[0].pickupDate, 24.25).toISOString(),
          dock_in_time: hoursAfter(createdLoads[0].pickupDate, 24.5).toISOString(),
          loaded_out_time: hoursAfter(createdLoads[0].pickupDate, 27.75).toISOString(),
          departure_time: hoursAfter(createdLoads[0].pickupDate, 28).toISOString(),
          lumper_amount: null,
          currency: "USD",
          cancellation_flag: false,
          layover_reason: null,
          notes: "Driver check-in and gate-out screenshots attached.",
          confidence_score: 0.94,
        },
      },
      {
        organizationId: organization.id,
        loadId: createdLoads[2].id,
        fileName: "tonu-ratecon.pdf",
        fileType: "application/pdf",
        fileSize: 248000,
        storagePath: "seed/tonu-ratecon",
        storageUrl: "https://example.com/tonu-ratecon.pdf",
        documentType: "RATE_CONFIRMATION",
        uploadedByUserId: demoUserId,
        extractionStatus: "MANUAL",
      },
      {
        organizationId: organization.id,
        loadId: createdLoads[3].id,
        fileName: "lumper-receipt.jpg",
        fileType: "image/jpeg",
        fileSize: 98000,
        storagePath: "seed/lumper-receipt",
        storageUrl: "https://example.com/lumper-receipt.jpg",
        documentType: "LUMPER_RECEIPT",
        uploadedByUserId: demoUserId,
        extractionStatus: "SUCCESS",
        extractionConfidence: 0.9,
        rawExtractionJson: {
          document_type: "LUMPER_RECEIPT",
          referenced_load_number: createdLoads[3].externalLoadNumber,
          customer_name: customers[0].name,
          facility_name: facilities[3].name,
          appointment_time: null,
          arrival_time: null,
          check_in_time: null,
          dock_in_time: null,
          loaded_out_time: null,
          departure_time: null,
          lumper_amount: 184.5,
          currency: "USD",
          cancellation_flag: false,
          layover_reason: null,
          notes: "Receipt shows lumper cash payment.",
          confidence_score: 0.9,
        },
      },
      {
        organizationId: organization.id,
        loadId: createdLoads[1].id,
        fileName: "layover-email.png",
        fileType: "image/png",
        fileSize: 72000,
        storagePath: "seed/layover-email",
        storageUrl: "https://example.com/layover-email.png",
        documentType: "EMAIL_SCREENSHOT",
        uploadedByUserId: demoUserId,
        extractionStatus: "SUCCESS",
        extractionConfidence: 0.82,
        rawExtractionJson: {
          document_type: "EMAIL_SCREENSHOT",
          referenced_load_number: createdLoads[1].externalLoadNumber,
          customer_name: customers[1].name,
          facility_name: facilities[1].name,
          appointment_time: hoursAfter(createdLoads[1].pickupDate, 26).toISOString(),
          arrival_time: null,
          check_in_time: null,
          dock_in_time: null,
          loaded_out_time: null,
          departure_time: null,
          lumper_amount: null,
          currency: "USD",
          cancellation_flag: false,
          layover_reason: "Customer pushed appointment to the following morning due to dock congestion.",
          notes: "Operations email from consignee.",
          confidence_score: 0.82,
        },
      },
    ],
  });

  for (const load of createdLoads) {
    await recalculateLoadCandidates(organization.id, load.id);
  }

  const claimLoads = createdLoads.slice(0, 6);
  const claims = [];
  for (const load of claimLoads) {
    const claim = await createOrRefreshClaimForLoad({
      organizationId: organization.id,
      loadId: load.id,
      createdByUserId: demoUserId,
    });
    claims.push(claim);
  }

  await prisma.claim.update({
    where: { id: claims[0].id },
    data: { status: "DRAFT" },
  });
  await prisma.claim.update({
    where: { id: claims[1].id },
    data: { status: "READY_TO_SEND" },
  });
  await prisma.claim.update({
    where: { id: claims[2].id },
    data: { status: "SENT", sentAt: new Date("2026-03-15T16:00:00.000Z") },
  });
  await prisma.claim.update({
    where: { id: claims[3].id },
    data: {
      status: "PARTIAL_PAID",
      sentAt: new Date("2026-03-10T16:00:00.000Z"),
      paidAt: new Date("2026-03-21T16:00:00.000Z"),
      paidAmount: 125,
    },
  });
  await prisma.claim.update({
    where: { id: claims[4].id },
    data: {
      status: "PAID",
      sentAt: new Date("2026-03-08T16:00:00.000Z"),
      paidAt: new Date("2026-03-20T16:00:00.000Z"),
      paidAmount: claims[4].totalAmount,
    },
  });
  await prisma.claim.update({
    where: { id: claims[5].id },
    data: {
      status: "DISPUTED",
      sentAt: new Date("2026-03-12T16:00:00.000Z"),
      disputeReason: "Customer asked for original gate timestamps.",
    },
  });

  await prisma.claimMessage.createMany({
    data: claims.flatMap((claim, index) => [
      {
        claimId: claim.id,
        direction: "INTERNAL",
        subject: "Seeded internal note",
        body: "AR reviewed the evidence package and confirmed the line item math.",
      },
      {
        claimId: claim.id,
        direction: "OUTBOUND",
        subject: `DockClaim seeded draft ${index + 1}`,
        body: "Seeded claim draft body for local testing.",
        sentAt: index > 1 ? new Date("2026-03-15T16:00:00.000Z") : null,
      },
    ]),
  });

  console.log(
    JSON.stringify({
      organizationId: organization.id,
      demoUserId,
      customers: customers.length,
      facilities: facilities.length,
      carriers: carriers.length,
      loads: createdLoads.length,
      claims: claims.length,
      defaultRuleId: defaultRule.id,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
