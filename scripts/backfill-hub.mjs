#!/usr/bin/env node
/**
 * One-time backfill script: Push all finished responses to HiveCFM Hub.
 *
 * Usage (from host):
 *   docker exec hivecfm-core node /home/nextjs/scripts/backfill-hub.mjs
 *
 * Or via SSH:
 *   ssh server "docker exec hivecfm-core node /home/nextjs/scripts/backfill-hub.mjs"
 *
 * Requires: HIVECFM_HUB_URL, HIVECFM_HUB_API_KEY, DATABASE_URL env vars
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const HUB_URL = process.env.HIVECFM_HUB_URL;
const HUB_API_KEY = process.env.HIVECFM_HUB_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!HUB_URL || !HUB_API_KEY) {
  console.error("ERROR: HIVECFM_HUB_URL and HIVECFM_HUB_API_KEY must be set");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL must be set");
  process.exit(1);
}

// Question type mapping (matches service.ts)
const TYPE_MAP = {
  openText: "text",
  multipleChoiceSingle: "categorical",
  multipleChoiceMulti: "categorical",
  nps: "nps",
  rating: "rating",
  cta: "boolean",
  consent: "boolean",
  date: "date",
  matrix: "text",
  address: "text",
  ranking: "text",
  contactInfo: "text",
  pictureSelection: "categorical",
  fileUpload: "text",
};

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").trim();
}

function getHeadlineText(headline) {
  if (typeof headline === "string") return stripHtml(headline);
  if (headline && typeof headline === "object") {
    return stripHtml(headline.default || Object.values(headline)[0] || "");
  }
  return "";
}

function extractFieldValue(questionType, answer) {
  if (answer === undefined || answer === null) return {};
  switch (questionType) {
    case "nps":
    case "rating":
      return { value_number: typeof answer === "number" ? answer : Number(answer) };
    case "cta":
    case "consent":
      return { value_boolean: answer === "accepted" || answer === "clicked" || answer === "true" };
    case "multipleChoiceMulti":
    case "ranking":
    case "pictureSelection":
      return { value_text: Array.isArray(answer) ? answer.join(", ") : String(answer) };
    case "matrix":
    case "address":
    case "contactInfo":
      return { value_text: typeof answer === "object" ? JSON.stringify(answer) : String(answer) };
    default:
      return { value_text: String(answer) };
  }
}

async function pushRecord(record) {
  const res = await fetch(`${HUB_URL}/v1/feedback-records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUB_API_KEY}`,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 409 = duplicate, skip silently
    if (res.status === 409) return "duplicate";
    throw new Error(`Hub API ${res.status}: ${body}`);
  }
  return "ok";
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("Fetching finished responses with survey questions...");

  // Get all finished responses with their survey data and organization
  const { rows: responses } = await client.query(`
    SELECT
      r.id as response_id,
      r.data as response_data,
      r.language,
      r.created_at as collected_at,
      s.id as survey_id,
      s.name as survey_name,
      s.blocks as survey_blocks,
      p."organizationId" as organization_id
    FROM "Response" r
    JOIN "Survey" s ON r."surveyId" = s.id
    JOIN "Environment" e ON s."environmentId" = e.id
    JOIN "Project" p ON e."projectId" = p.id
    WHERE r.finished = true
    ORDER BY r.created_at ASC
  `);

  console.log(`Found ${responses.length} finished responses to backfill`);

  let totalPushed = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  for (let i = 0; i < responses.length; i++) {
    const row = responses[i];
    const responseData = typeof row.response_data === "string" ? JSON.parse(row.response_data) : row.response_data;

    // Extract questions from blocks[].elements[]
    // blocks is a PostgreSQL jsonb[] array
    let rawBlocks = row.survey_blocks;
    if (typeof rawBlocks === "string") {
      try { rawBlocks = JSON.parse(rawBlocks); } catch { rawBlocks = []; }
    }
    const blocks = Array.isArray(rawBlocks) ? rawBlocks : [];
    const questions = [];
    for (const block of blocks) {
      const b = typeof block === "string" ? JSON.parse(block) : block;
      if (b && Array.isArray(b.elements)) {
        for (const el of b.elements) {
          questions.push({ id: el.id, type: el.type, headline: el.headline });
        }
      }
    }

    if (!responseData || questions.length === 0) continue;

    const records = [];
    for (const question of questions) {
      const answer = responseData[question.id];
      if (answer === undefined || answer === null) continue;

      const fieldType = TYPE_MAP[question.type];
      if (!fieldType) continue;

      const values = extractFieldValue(question.type, answer);
      if (!values.value_text && values.value_number === undefined && values.value_boolean === undefined) continue;

      records.push({
        tenant_id: row.organization_id,
        submission_id: row.response_id,
        source_type: "survey",
        source_id: row.survey_id,
        source_name: row.survey_name,
        field_id: question.id,
        field_label: getHeadlineText(question.headline),
        field_type: fieldType,
        ...values,
        ...(row.language ? { language: row.language } : {}),
        collected_at: new Date(row.collected_at).toISOString(),
      });
    }

    // Push records in parallel (per response)
    const results = await Promise.allSettled(records.map((r) => pushRecord(r)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value === "duplicate") totalDuplicates++;
        else totalPushed++;
      } else {
        totalErrors++;
        if (totalErrors <= 5) {
          console.error(`  Error: ${result.reason.message}`);
        }
      }
    }

    if ((i + 1) % 50 === 0 || i === responses.length - 1) {
      console.log(`  Progress: ${i + 1}/${responses.length} responses processed (${totalPushed} pushed, ${totalDuplicates} duplicates, ${totalErrors} errors)`);
    }
  }

  await client.end();

  console.log("\n=== Backfill Complete ===");
  console.log(`  Responses processed: ${responses.length}`);
  console.log(`  Records pushed: ${totalPushed}`);
  console.log(`  Duplicates skipped: ${totalDuplicates}`);
  console.log(`  Errors: ${totalErrors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
