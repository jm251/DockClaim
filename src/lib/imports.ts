import "server-only";

import { prisma } from "@/lib/prisma";
import { recalculateLoadCandidates } from "@/lib/loads";
import { slugify } from "@/lib/utils";

function parseMaybeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

async function getOrCreateCustomer(organizationId: string, name: string) {
  const trimmed = name.trim();
  const existing = await prisma.customer.findFirst({
    where: { organizationId, name: trimmed },
  });

  if (existing) {
    return existing;
  }

  return prisma.customer.create({
    data: {
      organizationId,
      name: trimmed,
      status: "ACTIVE",
    },
  });
}

async function getOrCreateCarrier(organizationId: string, name?: string | null) {
  if (!name?.trim()) {
    return null;
  }

  const trimmed = name.trim();
  const existing = await prisma.carrier.findFirst({
    where: { organizationId, name: trimmed },
  });

  if (existing) {
    return existing;
  }

  return prisma.carrier.create({
    data: {
      organizationId,
      name: trimmed,
    },
  });
}

async function getOrCreateFacility(organizationId: string, customerId: string, name?: string | null) {
  if (!name?.trim()) {
    return null;
  }

  const trimmed = name.trim();
  const existing = await prisma.facility.findFirst({
    where: {
      organizationId,
      customerId,
      name: trimmed,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.facility.create({
    data: {
      organizationId,
      customerId,
      name: trimmed,
      timezone: "America/Chicago",
      notes: "Created from CSV import.",
    },
  });
}

function getMappedValue(
  row: Record<string, string | null | undefined>,
  mapping: Record<string, string>,
  field: string,
) {
  const source = mapping[field];
  if (!source) {
    return null;
  }

  return row[source] ?? null;
}

export async function commitCsvImport(input: {
  organizationId: string;
  fileName: string;
  mapping: Record<string, string>;
  rows: Array<Record<string, string | null | undefined>>;
  saveTemplate?: boolean;
  templateName?: string;
}) {
  const job = await prisma.csvImportJob.create({
    data: {
      organizationId: input.organizationId,
      fileName: input.fileName,
      rowCount: input.rows.length,
      status: "processing",
      summaryJson: {
        mapping: input.mapping,
      },
    },
  });

  let imported = 0;

  for (const row of input.rows) {
    const externalLoadNumber = getMappedValue(row, input.mapping, "externalLoadNumber");
    const customerName = getMappedValue(row, input.mapping, "customerName");
    const pickupDate = getMappedValue(row, input.mapping, "pickupDate");
    const deliveryDate = getMappedValue(row, input.mapping, "deliveryDate");

    if (!externalLoadNumber || !customerName || !pickupDate || !deliveryDate) {
      continue;
    }

    const customer = await getOrCreateCustomer(input.organizationId, customerName);
    const carrier = await getOrCreateCarrier(input.organizationId, getMappedValue(row, input.mapping, "carrierName"));
    const facility = await getOrCreateFacility(
      input.organizationId,
      customer.id,
      getMappedValue(row, input.mapping, "facilityName"),
    );

    const combinedNotes = [
      getMappedValue(row, input.mapping, "notes"),
      getMappedValue(row, input.mapping, "lumperAmount")
        ? `LUMPER_AMOUNT=${getMappedValue(row, input.mapping, "lumperAmount")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const load = await prisma.load.upsert({
      where: {
        organizationId_externalLoadNumber: {
          organizationId: input.organizationId,
          externalLoadNumber,
        },
      },
      update: {
        customerId: customer.id,
        carrierId: carrier?.id,
        facilityId: facility?.id,
        status: "IMPORTED",
        pickupDate: parseMaybeDate(pickupDate) ?? new Date(),
        deliveryDate: parseMaybeDate(deliveryDate) ?? new Date(),
        sourceType: "CSV",
        sourceFileName: input.fileName,
        notes: combinedNotes,
      },
      create: {
        organizationId: input.organizationId,
        externalLoadNumber,
        customerId: customer.id,
        carrierId: carrier?.id,
        facilityId: facility?.id,
        status: "IMPORTED",
        pickupDate: parseMaybeDate(pickupDate) ?? new Date(),
        deliveryDate: parseMaybeDate(deliveryDate) ?? new Date(),
        sourceType: "CSV",
        sourceFileName: input.fileName,
        commodity: "General freight",
        notes: combinedNotes,
      },
    });

    await prisma.stop.deleteMany({
      where: { loadId: load.id },
    });

    await prisma.stop.createMany({
      data: [
        {
          loadId: load.id,
          type: "PICKUP",
          facilityName: `${facility?.name ?? "Origin"} Pickup`,
          timezone: facility?.timezone ?? "America/Chicago",
          appointmentStart: parseMaybeDate(getMappedValue(row, input.mapping, "pickupAppointmentStart")),
          appointmentEnd: parseMaybeDate(getMappedValue(row, input.mapping, "pickupAppointmentEnd")),
        },
        {
          loadId: load.id,
          type: "DELIVERY",
          facilityName: facility?.name ?? "Delivery Facility",
          city: facility?.city ?? undefined,
          state: facility?.state ?? undefined,
          timezone: facility?.timezone ?? "America/Chicago",
          appointmentStart: parseMaybeDate(getMappedValue(row, input.mapping, "deliveryAppointmentStart")),
          appointmentEnd: parseMaybeDate(getMappedValue(row, input.mapping, "deliveryAppointmentEnd")),
          arrivalTime: parseMaybeDate(getMappedValue(row, input.mapping, "arrivalTime")),
          checkInTime: parseMaybeDate(getMappedValue(row, input.mapping, "checkInTime")),
          dockInTime: parseMaybeDate(getMappedValue(row, input.mapping, "dockInTime")),
          loadedOutTime: parseMaybeDate(getMappedValue(row, input.mapping, "loadedOutTime")),
          departureTime: parseMaybeDate(getMappedValue(row, input.mapping, "departureTime")),
        },
      ],
    });

    await recalculateLoadCandidates(input.organizationId, load.id);
    imported += 1;
  }

  if (input.saveTemplate && input.templateName) {
    await prisma.csvMappingTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: input.organizationId,
          name: input.templateName,
        },
      },
      update: {
        mappingJson: input.mapping,
      },
      create: {
        organizationId: input.organizationId,
        name: input.templateName,
        mappingJson: input.mapping,
      },
    });
  }

  await prisma.csvImportJob.update({
    where: { id: job.id },
    data: {
      status: "completed",
      summaryJson: {
        imported,
        skipped: input.rows.length - imported,
        mapping: input.mapping,
        slug: slugify(input.fileName),
      },
    },
  });

  return {
    jobId: job.id,
    imported,
    skipped: input.rows.length - imported,
  };
}
