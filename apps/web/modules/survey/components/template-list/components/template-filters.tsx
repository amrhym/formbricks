"use client";

import { useTranslation } from "react-i18next";
import { TTemplateFilter } from "@hivecfm/types/templates";
import { cn } from "@/lib/cn";
import { getIndustryMapping, getRoleMapping } from "../lib/utils";

interface TemplateFiltersProps {
  selectedFilter: TTemplateFilter[];
  setSelectedFilter: (filter: TTemplateFilter[]) => void;
  templateSearch?: string;
}

export const TemplateFilters = ({
  selectedFilter,
  setSelectedFilter,
  templateSearch,
}: TemplateFiltersProps) => {
  const { t } = useTranslation();
  const handleFilterSelect = (filterValue: TTemplateFilter, index: number) => {
    const newFilter = [...selectedFilter];
    newFilter[index] = filterValue;
    setSelectedFilter(newFilter);
  };

  // Only show industry (index 1) and role (index 2) filters
  // Channel selection is now handled by the ChannelSelector component
  const filterGroups = [
    {
      index: 1,
      filters: getIndustryMapping(t),
      allLabel: t("environments.surveys.templates.all_industries"),
    },
    { index: 2, filters: getRoleMapping(t), allLabel: t("environments.surveys.templates.all_roles") },
  ];

  return (
    <div className="mb-6 gap-3">
      {filterGroups.map((group) => {
        return (
          <div key={group.index} className="mt-2 flex flex-wrap gap-1 last:border-r-0">
            <button
              type="button"
              onClick={() => handleFilterSelect(null, group.index)}
              disabled={templateSearch && templateSearch.length > 0 ? true : false}
              className={cn(
                selectedFilter[group.index] === null
                  ? "bg-slate-800 font-semibold text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 focus:scale-105 focus:bg-slate-100 focus:ring-0 focus:outline-none",
                "rounded border border-slate-800 px-2 py-1 text-xs transition-all duration-150"
              )}>
              {group.allLabel}
            </button>
            {group.filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterSelect(filter.value, group.index)}
                disabled={templateSearch && templateSearch.length > 0 ? true : false}
                className={cn(
                  selectedFilter[group.index] === filter.value
                    ? "bg-slate-800 font-semibold text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 focus:scale-105 focus:bg-slate-100 focus:ring-0 focus:outline-none",
                  "rounded border border-slate-800 px-2 py-1 text-xs transition-all duration-150"
                )}>
                {filter.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
};
