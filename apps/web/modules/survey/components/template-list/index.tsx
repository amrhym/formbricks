"use client";

import { Project } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { TIntegrationMethod } from "@hivecfm/types/channel";
import { channelTypeToSurveyType } from "@hivecfm/types/channel";
import { ZProjectConfigIndustry } from "@hivecfm/types/project";
import { TSurveyCreateInput, TSurveyType } from "@hivecfm/types/surveys/types";
import { TTemplate, TTemplateFilter, ZTemplateRole } from "@hivecfm/types/templates";
import { templates } from "@/app/lib/templates";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { createSurveyAction, findOrCreateChannelAction } from "./actions";
import { ChannelSelection, ChannelSelector } from "./components/channel-selector";
import { IntegrationMethodSelector } from "./components/integration-method-selector";
import { StartFromScratchTemplate } from "./components/start-from-scratch-template";
import { Template } from "./components/template";
import { TemplateFilters } from "./components/template-filters";

interface TemplateListProps {
  userId: string;
  environmentId: string;
  project: Project;
  templateSearch?: string;
  showFilters?: boolean;
  onTemplateClick?: (template: TTemplate) => void;
  noPreview?: boolean; // single click to create survey
}

// Maps channel selector values to template channel filter values
const channelToTemplateChannels: Record<string, string[]> = {
  web: ["website", "app"],
  mobile: ["app"],
  link: ["link"],
  voice: ["voice"],
  whatsapp: ["whatsapp"],
  sms: ["sms"],
};

export const TemplateList = ({
  userId,
  project,
  environmentId,
  showFilters = true,
  templateSearch,
  onTemplateClick = () => {},
  noPreview,
}: TemplateListProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTemplate, setActiveTemplate] = useState<TTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelSelection>(null);
  const [selectedIntegrationMethod, setSelectedIntegrationMethod] = useState<TIntegrationMethod | null>(null);
  // Filter state: [industry, role] (channel is now separate via ChannelSelector)
  const [selectedFilter, setSelectedFilter] = useState<TTemplateFilter[]>([null, null]);

  const surveyType: TSurveyType = useMemo(() => {
    // Derive survey type from selected channel
    if (selectedChannel) {
      return channelTypeToSurveyType(selectedChannel);
    }
    // Fallback to project config
    if (project.config.channel) {
      if (project.config.channel === "website") {
        return "app";
      }
      return project.config.channel;
    }
    return "link";
  }, [selectedChannel, project.config.channel]);

  const createSurvey = async (activeTemplate: TTemplate) => {
    setLoading(true);

    // For channels that need a channelId (voice, whatsapp, sms), find or create the channel first
    let channelId: string | undefined;
    const channelsNeedingId = ["voice", "whatsapp", "sms"] as const;
    if (
      selectedChannel &&
      channelsNeedingId.includes(selectedChannel as (typeof channelsNeedingId)[number])
    ) {
      const channelResult = await findOrCreateChannelAction({
        environmentId,
        channelType: selectedChannel as "voice" | "whatsapp" | "sms",
      });
      if (channelResult?.data) {
        channelId = channelResult.data;
      } else {
        toast.error("Failed to set up channel");
        setLoading(false);
        return;
      }
    }

    const augmentedTemplate: TSurveyCreateInput = {
      ...activeTemplate.preset,
      type: surveyType,
      createdBy: userId,
      ...(channelId && { channelId }),
    };
    const createSurveyResponse = await createSurveyAction({
      environmentId: environmentId,
      surveyBody: augmentedTemplate,
    });

    if (createSurveyResponse?.data) {
      router.push(`/environments/${environmentId}/surveys/${createSurveyResponse.data.id}/edit`);
    } else {
      const errorMessage = getFormattedErrorMessage(createSurveyResponse);
      toast.error(errorMessage);
    }
  };

  const filteredTemplates = () => {
    return templates(t).filter((template) => {
      if (templateSearch) {
        return template.name.toLowerCase().includes(templateSearch.toLowerCase());
      }

      // Channel filter from ChannelSelector
      let channelMatch = true;
      if (selectedChannel) {
        const matchingChannels = channelToTemplateChannels[selectedChannel] || [];
        channelMatch = template.channels
          ? template.channels.some((ch) => matchingChannels.includes(ch))
          : false;
      }

      // Industry and role filters
      const industryParseResult = ZProjectConfigIndustry.nullable().safeParse(selectedFilter[0]);
      const roleParseResult = ZTemplateRole.nullable().safeParse(selectedFilter[1]);

      if (!industryParseResult.success || !roleParseResult.success) {
        return channelMatch;
      }

      const validatedIndustry = industryParseResult.data;
      const validatedRole = roleParseResult.data;

      const industryMatch = validatedIndustry === null || template.industries?.includes(validatedIndustry);
      const roleMatch = validatedRole === null || template.role === validatedRole;

      return channelMatch && industryMatch && roleMatch;
    });
  };

  // For TemplateFilters, we pass a 3-element array for backward compat but index 0 is unused (channel is separate now)
  const filterForFilters: TTemplateFilter[] = [null, selectedFilter[0], selectedFilter[1]];
  const setFilterForFilters = (newFilter: TTemplateFilter[]) => {
    // Only take industry (index 1) and role (index 2)
    setSelectedFilter([newFilter[1], newFilter[2]]);
  };

  return (
    <main className="relative z-0 flex-1 overflow-y-auto px-6 pt-2 pb-6 focus:outline-none">
      {showFilters && !templateSearch && (
        <>
          <ChannelSelector selectedChannel={selectedChannel} onChannelSelect={setSelectedChannel} />
          <IntegrationMethodSelector
            selectedChannel={selectedChannel}
            selectedMethod={selectedIntegrationMethod}
            onMethodSelect={setSelectedIntegrationMethod}
          />
          <TemplateFilters
            selectedFilter={filterForFilters}
            setSelectedFilter={setFilterForFilters}
            templateSearch={templateSearch}
          />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StartFromScratchTemplate
          activeTemplate={activeTemplate}
          setActiveTemplate={setActiveTemplate}
          onTemplateClick={onTemplateClick}
          project={project}
          createSurvey={createSurvey}
          loading={loading}
          noPreview={noPreview}
        />
        {(process.env.NODE_ENV === "development" ? [...filteredTemplates()] : filteredTemplates()).map(
          (template: TTemplate) => {
            return (
              <Template
                key={template.name}
                template={template}
                activeTemplate={activeTemplate}
                setActiveTemplate={setActiveTemplate}
                onTemplateClick={onTemplateClick}
                project={project}
                createSurvey={createSurvey}
                loading={loading}
                selectedFilter={filterForFilters}
                noPreview={noPreview}
              />
            );
          }
        )}
      </div>
    </main>
  );
};
