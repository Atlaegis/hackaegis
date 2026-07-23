import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  renderMobileCard?: (row: T) => React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  pageSize = 10,
  emptyMessage = "No data found.",
  onRowClick,
  renderMobileCard,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc");
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile: Card view */}
      {renderMobileCard && (
        <div className="md:hidden space-y-3">
          {paged.map((row) => (
            <Card
              key={String(row[keyField])}
              className={onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="py-3 px-4">{renderMobileCard(row)}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Desktop: Table view */}
      <div className={renderMobileCard ? "hidden md:block" : ""}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""} ${col.className ?? ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((row) => (
                <tr
                  key={String(row[keyField])}
                  className={`hover:bg-muted/20 ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
