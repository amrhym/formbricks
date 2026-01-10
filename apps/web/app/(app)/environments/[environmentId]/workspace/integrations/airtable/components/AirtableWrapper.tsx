"use client";

import { useState } from "react";
import { TIntegrationItem } from "@hivecfm/types/integration";
import { TIntegrationAirtable } from "@hivecfm/types/integration/airtable";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { TUserLocale } from "@hivecfm/types/user";
import { ManageIntegration } from "@/app/(app)/environments/[environmentId]/workspace/integrations/airtable/components/ManageIntegration";
import { authorize } from "@/app/(app)/environments/[environmentId]/workspace/integrations/airtable/lib/airtable";
import airtableLogo from "@/images/airtableLogo.svg";
import { ConnectIntegration } from "@/modules/ui/components/connect-integration";

interface AirtableWrapperProps {
  environmentId: string;
  airtableArray: TIntegrationItem[];
  airtableIntegration?: TIntegrationAirtable;
  surveys: TSurvey[];
  isEnabled: boolean;
  webAppUrl: string;
  locale: TUserLocale;
}

export const AirtableWrapper = ({
  environmentId,
  airtableArray,
  airtableIntegration,
  surveys,
  isEnabled,
  webAppUrl,
  locale,
}: AirtableWrapperProps) => {
  const [isConnected, setIsConnected] = useState(
    airtableIntegration ? airtableIntegration.config?.key : false
  );

  const handleAirtableAuthorization = async () => {
    authorize(environmentId, webAppUrl).then((url: string) => {
      if (url) {
        window.location.replace(url);
      }
    });
  };

  return isConnected && airtableIntegration ? (
    <ManageIntegration
      airtableArray={airtableArray}
      environmentId={environmentId}
      airtableIntegration={airtableIntegration}
      setIsConnected={setIsConnected}
      surveys={surveys}
      locale={locale}
    />
  ) : (
    <ConnectIntegration
      isEnabled={isEnabled}
      integrationType={"airtable"}
      handleAuthorization={handleAirtableAuthorization}
      integrationLogoSrc={airtableLogo}
    />
  );
};
