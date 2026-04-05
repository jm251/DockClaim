import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { getCurrentAppContext } from "@/lib/auth/session";
import { getClaimDetail } from "@/lib/data";
import { ClaimPdfDocument } from "@/lib/pdf/claim-pdf";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const context = await getCurrentAppContext();
  if (!context) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const claim = await getClaimDetail(context.organization.id, id);
  const pdfElement = ClaimPdfDocument({
    claim: {
      claimNumber: claim.claimNumber,
      customerName: claim.customer.name,
      loadNumber: claim.load.externalLoadNumber,
      facilityName: claim.load.documents[0]?.fileName ?? claim.customer.name,
      totalAmount: formatCurrency(Number(claim.totalAmount)),
      lineItems: claim.lineItems.map((lineItem) => ({
        type: lineItem.accessorialType,
        amount: formatCurrency(Number(lineItem.amount)),
        description: lineItem.description,
      })),
      timeline: [
        ...claim.load.stops.map((stop) => ({
          label: `${stop.type} ${stop.facilityName}`,
          detail: `Check in ${formatDateTime(stop.checkInTime)} / Departure ${formatDateTime(stop.departureTime)}`,
        })),
        ...claim.messages.map((message) => ({
          label: `${message.direction} message`,
          detail: message.subject,
        })),
      ],
      documents: claim.load.documents.map((document) => ({
        name: document.fileName,
        type: document.documentType ?? "OTHER",
      })),
    },
  });
  const stream = await renderToStream(pdfElement);

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${claim.claimNumber}.pdf"`,
    },
  });
}
