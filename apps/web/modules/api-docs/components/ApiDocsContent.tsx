"use client";

import { BookOpenIcon, ChevronDownIcon, ChevronRightIcon, CodeIcon, KeyIcon, ServerIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  requestBody?: string;
  responseExample?: string;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-purple-100 text-purple-700",
};

const ApiEndpointCard = ({ endpoint }: { endpoint: ApiEndpoint }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50">
        <div className="flex items-center gap-3">
          <span className={cn("rounded px-2 py-1 text-xs font-semibold", methodColors[endpoint.method])}>
            {endpoint.method}
          </span>
          <code className="text-sm text-slate-700">{endpoint.path}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{endpoint.description}</span>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-slate-200 p-4">
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-slate-700">Parameters</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 pr-4 text-left font-medium text-slate-600">Name</th>
                      <th className="py-2 pr-4 text-left font-medium text-slate-600">Type</th>
                      <th className="py-2 pr-4 text-left font-medium text-slate-600">Required</th>
                      <th className="py-2 text-left font-medium text-slate-600">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.parameters.map((param) => (
                      <tr key={param.name} className="border-b border-slate-100">
                        <td className="py-2 pr-4">
                          <code className="text-slate-700">{param.name}</code>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{param.type}</td>
                        <td className="py-2 pr-4">
                          {param.required ? (
                            <span className="text-red-500">Yes</span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-2 text-slate-500">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {endpoint.requestBody && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-slate-700">Request Body</h4>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
                {endpoint.requestBody}
              </pre>
            </div>
          )}
          {endpoint.responseExample && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">Response Example</h4>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
                {endpoint.responseExample}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ApiSectionComponent = ({ section }: { section: ApiSection }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-3 flex w-full items-center gap-2 text-left">
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-slate-400" />
        )}
        <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
      </button>
      {isExpanded && (
        <>
          <p className="mb-4 text-sm text-slate-600">{section.description}</p>
          <div className="space-y-3">
            {section.endpoints.map((endpoint, idx) => (
              <ApiEndpointCard key={idx} endpoint={endpoint} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// API Documentation Data
const clientApiSections: ApiSection[] = [
  {
    title: "Responses",
    description: "Create and update survey responses from the client side.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/client/{environmentId}/responses",
        description: "Create a new response",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
        ],
        requestBody: `{
  "surveyId": "survey_abc123",
  "finished": false,
  "data": {
    "question1": "answer1",
    "rating": 5
  },
  "language": "en"
}`,
        responseExample: `{
  "id": "response_xyz789",
  "surveyId": "survey_abc123",
  "finished": false,
  "data": { ... },
  "createdAt": "2024-01-15T10:30:00Z"
}`,
      },
      {
        method: "PUT",
        path: "/api/v1/client/{environmentId}/responses/{responseId}",
        description: "Update an existing response",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
          { name: "responseId", type: "string", required: true, description: "Response ID" },
        ],
      },
    ],
  },
  {
    title: "Contacts",
    description: "Manage contact attributes and state.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/client/{environmentId}/contacts/attributes",
        description: "Update contact attributes",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/client/{environmentId}/contacts/state",
        description: "Get contact state",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
        ],
      },
    ],
  },
  {
    title: "Display",
    description: "Track survey displays.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/client/{environmentId}/displays",
        description: "Create a display record",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
        ],
      },
    ],
  },
  {
    title: "Environment",
    description: "Get environment configuration and state.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/client/{environmentId}/environment",
        description: "Get environment state",
        parameters: [
          { name: "environmentId", type: "string", required: true, description: "Environment ID" },
        ],
      },
    ],
  },
];

const managementApiSections: ApiSection[] = [
  {
    title: "Responses",
    description: "Full CRUD operations for managing survey responses.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/responses",
        description: "Get all responses",
        parameters: [
          { name: "surveyId", type: "string", required: true, description: "Filter by survey ID" },
          { name: "limit", type: "number", required: false, description: "Max results (1-100, default: 10)" },
          { name: "skip", type: "number", required: false, description: "Skip N results (default: 0)" },
          { name: "startDate", type: "string", required: false, description: "Filter by start date" },
          { name: "endDate", type: "string", required: false, description: "Filter by end date" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "response_abc123",
      "surveyId": "survey_xyz",
      "finished": true,
      "data": {
        "question1": "Very satisfied",
        "npsScore": 9
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/v1/management/responses/{id}",
        description: "Get a single response",
        parameters: [{ name: "id", type: "string", required: true, description: "Response ID" }],
      },
      {
        method: "POST",
        path: "/api/v1/management/responses",
        description: "Create a response",
        requestBody: `{
  "environmentId": "env_abc123",
  "surveyId": "survey_xyz",
  "finished": true,
  "data": {
    "question1": "answer",
    "rating": 5
  }
}`,
      },
      {
        method: "PUT",
        path: "/api/v1/management/responses/{id}",
        description: "Update a response",
        parameters: [{ name: "id", type: "string", required: true, description: "Response ID" }],
      },
      {
        method: "DELETE",
        path: "/api/v1/management/responses/{id}",
        description: "Delete a response",
        parameters: [{ name: "id", type: "string", required: true, description: "Response ID" }],
      },
    ],
  },
  {
    title: "Surveys",
    description: "Manage surveys programmatically.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/surveys",
        description: "Get all surveys",
        parameters: [
          { name: "limit", type: "number", required: false, description: "Max results" },
          { name: "skip", type: "number", required: false, description: "Skip N results" },
        ],
      },
      {
        method: "GET",
        path: "/api/v1/management/surveys/{id}",
        description: "Get a single survey",
        parameters: [{ name: "id", type: "string", required: true, description: "Survey ID" }],
      },
      {
        method: "POST",
        path: "/api/v1/management/surveys",
        description: "Create a survey",
      },
      {
        method: "PUT",
        path: "/api/v1/management/surveys/{id}",
        description: "Update a survey",
        parameters: [{ name: "id", type: "string", required: true, description: "Survey ID" }],
      },
      {
        method: "DELETE",
        path: "/api/v1/management/surveys/{id}",
        description: "Delete a survey",
        parameters: [{ name: "id", type: "string", required: true, description: "Survey ID" }],
      },
    ],
  },
  {
    title: "Contacts",
    description: "Manage contacts and their attributes.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/contacts",
        description: "Get all contacts",
      },
      {
        method: "POST",
        path: "/api/v1/management/contacts",
        description: "Create a contact",
      },
      {
        method: "POST",
        path: "/api/v1/management/contacts/bulk",
        description: "Bulk upload contacts",
      },
      {
        method: "DELETE",
        path: "/api/v1/management/contacts/{id}",
        description: "Delete a contact",
        parameters: [{ name: "id", type: "string", required: true, description: "Contact ID" }],
      },
    ],
  },
  {
    title: "Webhooks",
    description: "Configure webhooks for real-time notifications.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/webhooks",
        description: "Get all webhooks",
      },
      {
        method: "GET",
        path: "/api/v1/management/webhooks/{id}",
        description: "Get a webhook",
        parameters: [{ name: "id", type: "string", required: true, description: "Webhook ID" }],
      },
      {
        method: "POST",
        path: "/api/v1/management/webhooks",
        description: "Create a webhook",
        requestBody: `{
  "url": "https://your-server.com/webhook",
  "triggers": ["responseCreated", "responseUpdated"],
  "surveyIds": ["survey_abc123"]
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/management/webhooks/{id}",
        description: "Delete a webhook",
        parameters: [{ name: "id", type: "string", required: true, description: "Webhook ID" }],
      },
    ],
  },
  {
    title: "Contact Attribute Keys",
    description: "Manage custom attribute keys for contacts.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/contact-attribute-keys",
        description: "Get all attribute keys",
      },
      {
        method: "POST",
        path: "/api/v1/management/contact-attribute-keys",
        description: "Create an attribute key",
      },
      {
        method: "PUT",
        path: "/api/v1/management/contact-attribute-keys/{id}",
        description: "Update an attribute key",
        parameters: [{ name: "id", type: "string", required: true, description: "Attribute key ID" }],
      },
      {
        method: "DELETE",
        path: "/api/v1/management/contact-attribute-keys/{id}",
        description: "Delete an attribute key",
        parameters: [{ name: "id", type: "string", required: true, description: "Attribute key ID" }],
      },
    ],
  },
];

const organizationApiSections: ApiSection[] = [
  {
    title: "Me",
    description: "Get information about the authenticated user.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/management/me",
        description: "Get current user info",
        responseExample: `{
  "id": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}`,
      },
    ],
  },
  {
    title: "Health",
    description: "API health check endpoints.",
    endpoints: [
      {
        method: "GET",
        path: "/api/health",
        description: "Health check",
        responseExample: `{
  "status": "ok"
}`,
      },
    ],
  },
];

export function ApiDocsContent() {
  const [activeTab, setActiveTab] = useState<"client" | "management" | "organization">("client");

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
            <BookOpenIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">API Reference</h2>
            <p className="text-sm text-slate-500">Version 2.0 (Beta)</p>
          </div>
        </div>
        <p className="text-slate-600">
          HiveCFM offers two types of APIs: the <strong>Public Client API</strong> for client-side
          interactions and the <strong>Management API</strong> for backend management tasks. Each API serves
          different purposes and has different authentication requirements.
        </p>
      </section>

      {/* Authentication */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <KeyIcon className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Authentication</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-2 font-medium text-slate-700">Client API</h3>
            <p className="mb-3 text-sm text-slate-600">
              The Client API uses your Environment ID for authentication. No API key required.
            </p>
            <pre className="rounded-lg bg-slate-900 p-3 text-sm text-slate-100">
              {`// Environment ID in URL path
GET /api/v1/client/{environmentId}/...`}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-2 font-medium text-slate-700">Management API</h3>
            <p className="mb-3 text-sm text-slate-600">
              The Management API requires an API key passed in the header.
            </p>
            <pre className="rounded-lg bg-slate-900 p-3 text-sm text-slate-100">
              {`// API Key in header
x-api-key: your_api_key_here`}
            </pre>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-2 font-medium text-amber-800">Generating an API Key</h4>
          <ol className="list-inside list-decimal space-y-1 text-sm text-amber-700">
            <li>Navigate to Organization Settings → API Keys</li>
            <li>Click "Add API Key" and provide a descriptive label</li>
            <li>Configure project and environment access permissions</li>
            <li>Copy and securely store your API key (shown only once)</li>
          </ol>
        </div>
      </section>

      {/* Base URL */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <ServerIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Base URL</h2>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
          https://app.hivecfm.xcai.io/api
        </pre>
        <p className="mt-2 text-sm text-slate-500">All API endpoints are relative to this base URL.</p>
      </section>

      {/* API Sections */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <CodeIcon className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">API Endpoints</h2>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("client")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "client"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            )}>
            Client API
          </button>
          <button
            onClick={() => setActiveTab("management")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "management"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            )}>
            Management API
          </button>
          <button
            onClick={() => setActiveTab("organization")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "organization"
                ? "border-b-2 border-indigo-500 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            )}>
            Organization & Health
          </button>
        </div>

        {/* Content */}
        {activeTab === "client" && (
          <div>
            <p className="mb-4 text-sm text-slate-600">
              The Public Client API is designed for client-side interactions and doesn't require an API key.
              Use your Environment ID for authentication.
            </p>
            {clientApiSections.map((section, idx) => (
              <ApiSectionComponent key={idx} section={section} />
            ))}
          </div>
        )}

        {activeTab === "management" && (
          <div>
            <p className="mb-4 text-sm text-slate-600">
              The Management API provides full access to all data and settings. Requires an API key for
              authentication.
            </p>
            {managementApiSections.map((section, idx) => (
              <ApiSectionComponent key={idx} section={section} />
            ))}
          </div>
        )}

        {activeTab === "organization" && (
          <div>
            <p className="mb-4 text-sm text-slate-600">Organization-level endpoints and health checks.</p>
            {organizationApiSections.map((section, idx) => (
              <ApiSectionComponent key={idx} section={section} />
            ))}
          </div>
        )}
      </section>

      {/* Rate Limiting */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Rate Limiting</h2>
        <p className="mb-4 text-slate-600">
          API requests are rate limited to ensure fair usage. Current limits:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4 text-left font-medium text-slate-600">API Type</th>
                <th className="py-2 pr-4 text-left font-medium text-slate-600">Rate Limit</th>
                <th className="py-2 text-left font-medium text-slate-600">Window</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-700">Client API</td>
                <td className="py-2 pr-4 text-slate-500">1000 requests</td>
                <td className="py-2 text-slate-500">per minute</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-700">Management API</td>
                <td className="py-2 pr-4 text-slate-500">100 requests</td>
                <td className="py-2 text-slate-500">per minute</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Codes */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Error Codes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4 text-left font-medium text-slate-600">Code</th>
                <th className="py-2 text-left font-medium text-slate-600">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">400</code>
                </td>
                <td className="py-2 text-slate-500">Bad Request - Invalid parameters</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">401</code>
                </td>
                <td className="py-2 text-slate-500">Unauthorized - Invalid or missing API key</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">403</code>
                </td>
                <td className="py-2 text-slate-500">Forbidden - Insufficient permissions</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">404</code>
                </td>
                <td className="py-2 text-slate-500">Not Found - Resource doesn't exist</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">429</code>
                </td>
                <td className="py-2 text-slate-500">Too Many Requests - Rate limit exceeded</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">500</code>
                </td>
                <td className="py-2 text-slate-500">Internal Server Error</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
