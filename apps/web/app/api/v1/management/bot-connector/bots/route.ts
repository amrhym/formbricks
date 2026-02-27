import { TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";

/**
 * GET /api/v1/management/bot-connector/bots
 *
 * Returns the list of available bots for Genesys Bot Connector.
 * Genesys calls this to populate the Bot Name dropdown in the integration config.
 */
export const GET = withV1ApiWrapper({
  handler: async ({
    authentication: _authentication,
  }: {
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    return {
      response: Response.json({
        bots: [
          {
            id: "hivecfm-survey-bot",
            name: "HiveCFM Survey Bot",
            description: "Post-conversation customer feedback survey",
            versions: [
              {
                version: "1.0",
                intents: [
                  { name: "survey_in_progress", description: "Survey is in progress" },
                  { name: "survey_complete", description: "Survey completed successfully" },
                  { name: "survey_opted_out", description: "Customer opted out of survey" },
                  { name: "survey_error", description: "Error occurred during survey" },
                ],
              },
            ],
          },
        ],
      }),
    };
  },
});
