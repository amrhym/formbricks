import { TFunction } from "i18next";
import { TIntegrationType } from "@hivecfm/types/integration";

export const getIntegrationDetails = (integrationType: TIntegrationType, t: TFunction) => {
  switch (integrationType) {
    case "googleSheets":
      return {
        text: t("environments.integrations.google_sheets.google_sheets_integration_description"),
        docsLink: "/docs/integrations/google-sheets",
        connectButtonLabel: t("environments.integrations.google_sheets.connect_with_google_sheets"),
        notConfiguredText: t(
          "environments.integrations.google_sheets.google_sheet_integration_is_not_configured"
        ),
      };
    case "airtable":
      return {
        text: t("environments.integrations.airtable.airtable_integration_description"),
        docsLink: "/docs/integrations/airtable",
        connectButtonLabel: t("environments.integrations.airtable.connect_with_airtable"),
        notConfiguredText: t("environments.integrations.airtable.airtable_integration_is_not_configured"),
      };
    case "notion":
      return {
        text: t("environments.integrations.notion.notion_integration_description"),
        docsLink: "/docs/integrations/notion",
        connectButtonLabel: t("environments.integrations.notion.connect_with_notion"),
        notConfiguredText: t("environments.integrations.notion.notion_integration_is_not_configured"),
      };
    case "slack":
      return {
        text: t("environments.integrations.slack.slack_integration_description"),
        docsLink: "/docs/integrations/slack",
        connectButtonLabel: t("environments.integrations.slack.connect_with_slack"),
        notConfiguredText: t("environments.integrations.slack.slack_integration_is_not_configured"),
      };
  }
};
