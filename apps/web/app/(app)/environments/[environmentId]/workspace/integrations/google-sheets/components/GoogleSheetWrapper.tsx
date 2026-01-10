"use client";

import { useState } from "react";
import { TEnvironment } from "@hivecfm/types/environment";
import {
  TIntegrationGoogleSheets,
  TIntegrationGoogleSheetsConfigData,
} from "@hivecfm/types/integration/google-sheet";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { TUserLocale } from "@hivecfm/types/user";
import { ManageIntegration } from "@/app/(app)/environments/[environmentId]/workspace/integrations/google-sheets/components/ManageIntegration";
import { authorize } from "@/app/(app)/environments/[environmentId]/workspace/integrations/google-sheets/lib/google";
import googleSheetLogo from "@/images/googleSheetsLogo.png";
import { ConnectIntegration } from "@/modules/ui/components/connect-integration";
import { AddIntegrationModal } from "./AddIntegrationModal";

interface GoogleSheetWrapperProps {
  isEnabled: boolean;
  environment: TEnvironment;
  surveys: TSurvey[];
  googleSheetIntegration?: TIntegrationGoogleSheets;
  webAppUrl: string;
  locale: TUserLocale;
}

export const GoogleSheetWrapper = ({
  isEnabled,
  environment,
  surveys,
  googleSheetIntegration,
  webAppUrl,
  locale,
}: GoogleSheetWrapperProps) => {
  const [isConnected, setIsConnected] = useState(
    googleSheetIntegration ? googleSheetIntegration.config?.key : false
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedIntegration, setSelectedIntegration] = useState<
    (TIntegrationGoogleSheetsConfigData & { index: number }) | null
  >(null);

  const handleGoogleAuthorization = async () => {
    authorize(environment.id, webAppUrl).then((url: string) => {
      if (url) {
        window.location.replace(url);
      }
    });
  };

  return (
    <>
      {isConnected && googleSheetIntegration ? (
        <>
          <AddIntegrationModal
            environmentId={environment.id}
            surveys={surveys}
            open={isModalOpen}
            setOpen={setIsModalOpen}
            googleSheetIntegration={googleSheetIntegration}
            selectedIntegration={selectedIntegration}
          />
          <ManageIntegration
            googleSheetIntegration={googleSheetIntegration}
            setOpenAddIntegrationModal={setIsModalOpen}
            setIsConnected={setIsConnected}
            setSelectedIntegration={setSelectedIntegration}
            locale={locale}
          />
        </>
      ) : (
        <ConnectIntegration
          isEnabled={isEnabled}
          integrationType={"googleSheets"}
          handleAuthorization={handleGoogleAuthorization}
          integrationLogoSrc={googleSheetLogo}
        />
      )}
    </>
  );
};
