"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/domain/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";

type LoadRow = {
  id: string;
  externalLoadNumber: string;
  customer: string;
  facility: string;
  status: string;
  potential: number;
  claimStatus: string;
};

type ClaimRow = {
  id: string;
  claimNumber: string;
  customer: string;
  loadNumber: string;
  status: string;
  totalAmount: number;
};

type CustomerRow = {
  id: string;
  name: string;
  billingEmail: string;
  status: string;
};

type FacilityRow = {
  id: string;
  name: string;
  customer: string;
  timezone: string;
};

const loadColumns: Array<ColumnDef<LoadRow>> = [
  {
    accessorKey: "externalLoadNumber",
    header: "Load",
    cell: ({ row }) => (
      <Link className="font-operational font-semibold text-[var(--secondary)]" href={`/app/loads/${row.original.id}`}>
        {row.original.externalLoadNumber}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "facility", header: "Facility" },
  {
    accessorKey: "status",
    header: "Load status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    accessorKey: "claimStatus",
    header: "Claim",
    cell: ({ row }) => <StatusBadge value={row.original.claimStatus} />,
  },
  {
    accessorKey: "potential",
    header: () => <div className="text-right">Potential</div>,
    cell: ({ row }) => <div className="font-operational text-right">{formatCurrency(row.original.potential)}</div>,
  },
];

const claimColumns: Array<ColumnDef<ClaimRow>> = [
  {
    accessorKey: "claimNumber",
    header: "Claim",
    cell: ({ row }) => (
      <Link className="font-operational font-semibold text-[var(--secondary)]" href={`/app/claims/${row.original.id}`}>
        {row.original.claimNumber}
      </Link>
    ),
  },
  { accessorKey: "customer", header: "Customer" },
  {
    accessorKey: "loadNumber",
    header: "Load",
    cell: ({ row }) => <span className="font-operational">{row.original.loadNumber}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="font-operational text-right">{formatCurrency(row.original.totalAmount)}</div>,
  },
];

const customerColumns: Array<ColumnDef<CustomerRow>> = [
  { accessorKey: "name", header: "Customer" },
  { accessorKey: "billingEmail", header: "Billing email" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
];

const facilityColumns: Array<ColumnDef<FacilityRow>> = [
  { accessorKey: "name", header: "Facility" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "timezone", header: "Timezone" },
];

export function LoadsTable({ rows }: { rows: LoadRow[] }) {
  return <DataTable columns={loadColumns} data={rows} searchPlaceholder="Search loads, customers, or facilities..." />;
}

export function ClaimsTable({ rows }: { rows: ClaimRow[] }) {
  return <DataTable columns={claimColumns} data={rows} searchPlaceholder="Search claim number, customer, or load..." />;
}

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  return <DataTable columns={customerColumns} data={rows} searchPlaceholder="Search customers..." />;
}

export function FacilitiesTable({ rows }: { rows: FacilityRow[] }) {
  return <DataTable columns={facilityColumns} data={rows} searchPlaceholder="Search facilities..." />;
}
