import "server-only";

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || "https://n8n.hivecfm.io";
const HIVECFM_WEBAPP_URL =
  process.env.WEBAPP_URL || "https://hivecfm-core.graypond-ce0467a0.westeurope.azurecontainerapps.io";

/**
 * Parameterize a workflow template JSON for a specific tenant.
 * Replaces placeholder tokens with tenant-specific values.
 */
export function parameterizeWorkflow(
  templateJson: Record<string, unknown>,
  organizationId: string,
  credentialId?: string
): Record<string, unknown> {
  const jsonStr = JSON.stringify(templateJson);

  const parameterized = jsonStr
    .replace(/\{\{ORGANIZATION_ID\}\}/g, organizationId)
    .replace(/\{\{WEBHOOK_BASE_URL\}\}/g, N8N_WEBHOOK_BASE_URL)
    .replace(/\{\{HIVECFM_URL\}\}/g, HIVECFM_WEBAPP_URL)
    .replace(/\{\{CREDENTIAL_ID\}\}/g, credentialId || "");

  return JSON.parse(parameterized);
}

/**
 * Default workflow templates.
 * These are used when the database WorkflowTemplate table is empty.
 */
export const defaultWorkflowTemplates = {
  "response-created-handler": {
    name: "Response Created Handler - {{ORGANIZATION_ID}}",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "/webhook/{{ORGANIZATION_ID}}/response-created",
        },
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
      },
      {
        parameters: {
          url: "{{HIVECFM_URL}}/api/v1/management/responses",
          method: "GET",
          headerParameters: {
            parameters: [{ name: "x-api-key", value: "={{$json.apiKey}}" }],
          },
        },
        name: "Get Response Details",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [450, 300],
      },
      {
        parameters: {
          functionCode: `
            const response = $input.first().json;
            // Process the response data
            return [{ json: { processed: true, responseId: response.data?.id } }];
          `,
        },
        name: "Process Response",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [650, 300],
      },
    ],
    connections: {
      Webhook: { main: [[{ node: "Get Response Details", type: "main", index: 0 }]] },
      "Get Response Details": { main: [[{ node: "Process Response", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  },

  "low-csat-alert": {
    name: "Low CSAT Alert - {{ORGANIZATION_ID}}",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "/webhook/{{ORGANIZATION_ID}}/low-csat-alert",
        },
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
      },
      {
        parameters: {
          conditions: {
            number: [{ value1: "={{$json.csatScore}}", operation: "smallerEqual", value2: 2 }],
          },
        },
        name: "Check CSAT Score",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [450, 300],
      },
      {
        parameters: {
          functionCode: `
            const data = $input.first().json;
            return [{ json: { alert: true, score: data.csatScore, responseId: data.responseId, organizationId: '{{ORGANIZATION_ID}}' } }];
          `,
        },
        name: "Generate Alert",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [650, 200],
      },
    ],
    connections: {
      Webhook: { main: [[{ node: "Check CSAT Score", type: "main", index: 0 }]] },
      "Check CSAT Score": { main: [[{ node: "Generate Alert", type: "main", index: 0 }], []] },
    },
    settings: { executionOrder: "v1" },
  },

  "contact-sync": {
    name: "Contact Sync - {{ORGANIZATION_ID}}",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "/webhook/{{ORGANIZATION_ID}}/contact-sync",
        },
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
      },
      {
        parameters: {
          url: "{{HIVECFM_URL}}/api/v1/management/contacts",
          method: "GET",
          headerParameters: {
            parameters: [{ name: "x-api-key", value: "={{$json.apiKey}}" }],
          },
        },
        name: "Fetch Contacts",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [450, 300],
      },
    ],
    connections: {
      Webhook: { main: [[{ node: "Fetch Contacts", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  },
};
