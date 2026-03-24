import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { type, config } = body;

  try {
    if (type === "hub") {
      const res = await fetch(`${config.hubUrl}/v1/health-check`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      // Hub may not have /health-check, try root
      if (!res.ok) {
        const res2 = await fetch(`${config.hubUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res2.ok) {
          // Just check if it responds at all
          const res3 = await fetch(config.hubUrl, { signal: AbortSignal.timeout(5000) });
          if (!res3.ok && res3.status !== 404) {
            return Response.json({ ok: false, error: `Hub returned ${res3.status}` });
          }
        }
      }
      return Response.json({ ok: true, message: "HiveCFM Hub is reachable" });
    }

    if (type === "superset") {
      const loginRes = await fetch(`${config.internalUrl || config.publicUrl}/api/v1/security/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.adminUsername,
          password: config.adminPassword,
          provider: "db",
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (loginRes.ok) {
        return Response.json({ ok: true, message: "Superset connection successful" });
      }
      return Response.json({ ok: false, error: `Superset login failed: ${loginRes.status}` });
    }

    if (type === "llm") {
      if (config.provider === "azureOpenAI") {
        const url = `${config.endpointUrl}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": config.apiKey },
          body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return Response.json({ ok: true, message: "Azure OpenAI connection successful" });
        }
        return Response.json({ ok: false, error: `Azure OpenAI returned ${res.status}` });
      } else {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          return Response.json({ ok: true, message: "OpenAI connection successful" });
        }
        return Response.json({ ok: false, error: `OpenAI returned ${res.status}` });
      }
    }

    return Response.json({ ok: false, error: "Unknown integration type" });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message || "Connection test failed" });
  }
};
