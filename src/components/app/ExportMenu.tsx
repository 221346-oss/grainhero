import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, downloadPdf, type ExportColumn } from "@/lib/csv-pdf-export";

/** Drop this on any table header — CSV + PDF export, reusing one shared implementation. */
export function ExportMenu<T>({
  filename,
  title,
  rows,
  columns,
  size = "sm",
}: {
  filename: string;
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  size?: "sm" | "default";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5 h-8">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => downloadCsv(filename, rows, columns)}>
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadPdf(filename, title, rows, columns)}>
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
