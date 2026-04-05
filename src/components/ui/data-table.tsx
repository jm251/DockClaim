"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Filter rows...",
}: {
  columns: Array<ColumnDef<TData>>;
  data: TData[];
  searchPlaceholder?: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    columns,
    data,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: useMemo(
      () => (row, columnId, filterValue: string) =>
        String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase()),
      [],
    ),
  });

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Input placeholder={searchPlaceholder} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-panel">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="py-10 text-center text-[var(--muted-foreground)]" colSpan={columns.length}>
                    No rows match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
