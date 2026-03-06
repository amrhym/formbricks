"use client";

import {
  CalendarIcon,
  CheckSquareIcon,
  ColumnsIcon,
  DownloadIcon,
  LayoutGridIcon,
  ListIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/modules/ui/components/button";
import type { ViewMode } from "../types";

interface SearchToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExport: () => void;
  onToggleComparison: () => void;
  showComparison: boolean;
  selectedCount: number;
  onExportSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  resultCount: number;
}

const viewModes: Array<{ mode: ViewMode; icon: typeof ListIcon; label: string }> = [
  { mode: "list", icon: ListIcon, label: "List" },
  { mode: "grouped", icon: LayoutGridIcon, label: "Grouped" },
  { mode: "timeline", icon: CalendarIcon, label: "Timeline" },
];

export const SearchToolbar = ({
  viewMode,
  onViewModeChange,
  onExport,
  onToggleComparison,
  showComparison,
  selectedCount,
  onExportSelected,
  onSelectAll,
  onClearSelection,
  resultCount,
}: SearchToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {/* View mode toggle */}
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant={viewMode === mode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange(mode)}
            className={viewMode === mode ? "bg-slate-200" : ""}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}

        <div className="mx-2 h-5 w-px bg-slate-200" />

        {/* Export CSV */}
        <Button variant="ghost" size="sm" onClick={onExport} disabled={resultCount === 0}>
          <DownloadIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>

        {/* Comparison toggle */}
        <Button
          variant={showComparison ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleComparison}
          className={showComparison ? "bg-slate-200" : ""}>
          <ColumnsIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Compare</span>
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">
            <CheckSquareIcon className="mr-1 inline h-3.5 w-3.5" />
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onExportSelected} className="text-xs">
            <DownloadIcon className="h-3.5 w-3.5" />
            Export Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-xs">
            <XIcon className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
