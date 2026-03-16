-- =============================================================================
-- Al Rajhi Bank - Superset SQL Datasets
-- =============================================================================
-- 9 SQL datasets to power Superset dashboards for NPS, CSAT, CES analytics.
--
-- Database connection (add in Superset → Settings → Database Connections):
--   postgresql://superset_readonly:superset@postgres:5432/hivecfm
--   Display Name: HiveCFM
--
-- Usage:
--   1. Login to Superset at http://localhost:3002
--   2. Add the HiveCFM database connection above
--   3. Go to SQL Lab → Saved Queries (or Datasets → + Dataset → Virtual)
--   4. Create each dataset below as a virtual dataset
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Dataset 1: NPS Responses
-- Dashboard: NPS Overview
-- ---------------------------------------------------------------------------
-- Name: nps_responses
SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    r.created_at AS responded_at,
    r.finished AS is_finished,
    CAST(r.data->>'nps-score' AS INTEGER) AS nps_score,
    CASE
        WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 'Promoter'
        WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 7 THEN 'Passive'
        ELSE 'Detractor'
    END AS nps_category,
    r.data->>'nps-detractor-reason' AS detractor_reason,
    r.data->>'nps-passive-reason' AS passive_reason,
    r.data->>'nps-promoter-reason' AS promoter_reason,
    r.data->>'nps-service-type' AS service_type,
    r.data->>'customerId' AS customer_id,
    r.data->>'branchCode' AS branch_code,
    r.data->>'channel' AS channel,
    r.language AS response_language
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%NPS%'
  AND r.finished = true;


-- ---------------------------------------------------------------------------
-- Dataset 2: NPS Score Trend (Daily)
-- Dashboard: NPS Overview - Line chart
-- ---------------------------------------------------------------------------
-- Name: nps_daily_trend
SELECT
    DATE_TRUNC('day', r.created_at) AS response_date,
    COUNT(*) AS total_responses,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 1 END) AS promoters,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) BETWEEN 7 AND 8 THEN 1 END) AS passives,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) <= 6 THEN 1 END) AS detractors,
    ROUND(
        (COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 1 END)::NUMERIC
         - COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) <= 6 THEN 1 END)::NUMERIC)
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
    ) AS nps_score
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%NPS%'
  AND r.finished = true
GROUP BY DATE_TRUNC('day', r.created_at)
ORDER BY response_date;


-- ---------------------------------------------------------------------------
-- Dataset 3: NPS by Service Type
-- Dashboard: NPS Overview - Bar chart
-- ---------------------------------------------------------------------------
-- Name: nps_by_service
SELECT
    r.data->>'nps-service-type' AS service_type,
    COUNT(*) AS total_responses,
    ROUND(AVG(CAST(r.data->>'nps-score' AS NUMERIC)), 2) AS avg_nps_score,
    ROUND(
        (COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 1 END)::NUMERIC
         - COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) <= 6 THEN 1 END)::NUMERIC)
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
    ) AS nps_score,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 1 END) AS promoters,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) BETWEEN 7 AND 8 THEN 1 END) AS passives,
    COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) <= 6 THEN 1 END) AS detractors
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%NPS%'
  AND r.finished = true
  AND r.data->>'nps-service-type' IS NOT NULL
GROUP BY r.data->>'nps-service-type'
ORDER BY nps_score DESC;


-- ---------------------------------------------------------------------------
-- Dataset 4: CSAT Responses
-- Dashboard: CSAT Overview
-- ---------------------------------------------------------------------------
-- Name: csat_responses
SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    r.created_at AS responded_at,
    r.finished AS is_finished,
    CAST(r.data->>'csat-overall' AS INTEGER) AS csat_score,
    CASE
        WHEN CAST(r.data->>'csat-overall' AS INTEGER) >= 4 THEN 'Satisfied'
        WHEN CAST(r.data->>'csat-overall' AS INTEGER) = 3 THEN 'Neutral'
        ELSE 'Dissatisfied'
    END AS satisfaction_category,
    r.data->'csat-matrix'->>'staff' AS matrix_staff,
    r.data->'csat-matrix'->>'wait-time' AS matrix_wait_time,
    r.data->'csat-matrix'->>'resolution' AS matrix_resolution,
    r.data->'csat-matrix'->>'overall-service' AS matrix_overall_service,
    r.data->>'csat-feedback' AS feedback_text,
    r.data->>'customerId' AS customer_id,
    r.data->>'branchCode' AS branch_code,
    r.data->>'agentId' AS agent_id,
    r.data->>'transactionType' AS transaction_type,
    r.language AS response_language
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true;


-- ---------------------------------------------------------------------------
-- Dataset 5: CSAT Daily Trend
-- Dashboard: CSAT Overview - Line chart
-- ---------------------------------------------------------------------------
-- Name: csat_daily_trend
SELECT
    DATE_TRUNC('day', r.created_at) AS response_date,
    COUNT(*) AS total_responses,
    ROUND(AVG(CAST(r.data->>'csat-overall' AS NUMERIC)), 2) AS avg_csat,
    COUNT(CASE WHEN CAST(r.data->>'csat-overall' AS INTEGER) >= 4 THEN 1 END) AS satisfied,
    COUNT(CASE WHEN CAST(r.data->>'csat-overall' AS INTEGER) = 3 THEN 1 END) AS neutral,
    COUNT(CASE WHEN CAST(r.data->>'csat-overall' AS INTEGER) <= 2 THEN 1 END) AS dissatisfied
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true
GROUP BY DATE_TRUNC('day', r.created_at)
ORDER BY response_date;


-- ---------------------------------------------------------------------------
-- Dataset 6: CSAT Matrix Breakdown (Unpivoted)
-- Dashboard: CSAT Overview - Grouped bar chart
-- ---------------------------------------------------------------------------
-- Name: csat_matrix_breakdown
SELECT
    'Staff Friendliness' AS dimension,
    r.data->'csat-matrix'->>'staff' AS rating,
    COUNT(*) AS response_count
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true
  AND r.data->'csat-matrix'->>'staff' IS NOT NULL
GROUP BY r.data->'csat-matrix'->>'staff'

UNION ALL

SELECT
    'Wait Time' AS dimension,
    r.data->'csat-matrix'->>'wait-time' AS rating,
    COUNT(*) AS response_count
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true
  AND r.data->'csat-matrix'->>'wait-time' IS NOT NULL
GROUP BY r.data->'csat-matrix'->>'wait-time'

UNION ALL

SELECT
    'Problem Resolution' AS dimension,
    r.data->'csat-matrix'->>'resolution' AS rating,
    COUNT(*) AS response_count
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true
  AND r.data->'csat-matrix'->>'resolution' IS NOT NULL
GROUP BY r.data->'csat-matrix'->>'resolution'

UNION ALL

SELECT
    'Overall Service' AS dimension,
    r.data->'csat-matrix'->>'overall-service' AS rating,
    COUNT(*) AS response_count
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%'
  AND r.finished = true
  AND r.data->'csat-matrix'->>'overall-service' IS NOT NULL
GROUP BY r.data->'csat-matrix'->>'overall-service'

ORDER BY dimension, rating;


-- ---------------------------------------------------------------------------
-- Dataset 7: CES Responses
-- Dashboard: CES Overview
-- ---------------------------------------------------------------------------
-- Name: ces_responses
SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    r.created_at AS responded_at,
    r.finished AS is_finished,
    CAST(r.data->>'ces-score' AS INTEGER) AS ces_score,
    CASE
        WHEN CAST(r.data->>'ces-score' AS INTEGER) >= 5 THEN 'Low Effort'
        WHEN CAST(r.data->>'ces-score' AS INTEGER) = 4 THEN 'Moderate Effort'
        ELSE 'High Effort'
    END AS effort_category,
    r.data->>'ces-difficulty' AS difficulty_reason,
    r.data->>'ces-channel' AS channel_used,
    r.data->>'customerId' AS customer_id,
    r.data->>'transactionId' AS transaction_id,
    r.data->>'channel' AS channel,
    r.language AS response_language
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CES%'
  AND r.finished = true;


-- ---------------------------------------------------------------------------
-- Dataset 8: CES by Channel
-- Dashboard: CES Overview - Bar chart
-- ---------------------------------------------------------------------------
-- Name: ces_by_channel
SELECT
    r.data->>'ces-channel' AS channel_used,
    COUNT(*) AS total_responses,
    ROUND(AVG(CAST(r.data->>'ces-score' AS NUMERIC)), 2) AS avg_ces,
    COUNT(CASE WHEN CAST(r.data->>'ces-score' AS INTEGER) >= 5 THEN 1 END) AS low_effort,
    COUNT(CASE WHEN CAST(r.data->>'ces-score' AS INTEGER) = 4 THEN 1 END) AS moderate_effort,
    COUNT(CASE WHEN CAST(r.data->>'ces-score' AS INTEGER) <= 3 THEN 1 END) AS high_effort
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CES%'
  AND r.finished = true
  AND r.data->>'ces-channel' IS NOT NULL
GROUP BY r.data->>'ces-channel'
ORDER BY avg_ces DESC;


-- ---------------------------------------------------------------------------
-- Dataset 9: Executive Summary (Cross-Survey KPIs)
-- Dashboard: Executive Summary
-- ---------------------------------------------------------------------------
-- Name: executive_summary
SELECT
    'NPS' AS metric_type,
    COUNT(*) AS total_responses,
    ROUND(
        (COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) >= 9 THEN 1 END)::NUMERIC
         - COUNT(CASE WHEN CAST(r.data->>'nps-score' AS INTEGER) <= 6 THEN 1 END)::NUMERIC)
        / NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
    ) AS kpi_score,
    DATE_TRUNC('day', MIN(r.created_at)) AS first_response,
    DATE_TRUNC('day', MAX(r.created_at)) AS last_response
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%NPS%' AND r.finished = true

UNION ALL

SELECT
    'CSAT' AS metric_type,
    COUNT(*) AS total_responses,
    ROUND(AVG(CAST(r.data->>'csat-overall' AS NUMERIC)), 2) AS kpi_score,
    DATE_TRUNC('day', MIN(r.created_at)) AS first_response,
    DATE_TRUNC('day', MAX(r.created_at)) AS last_response
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CSAT%' AND r.finished = true

UNION ALL

SELECT
    'CES' AS metric_type,
    COUNT(*) AS total_responses,
    ROUND(AVG(CAST(r.data->>'ces-score' AS NUMERIC)), 2) AS kpi_score,
    DATE_TRUNC('day', MIN(r.created_at)) AS first_response,
    DATE_TRUNC('day', MAX(r.created_at)) AS last_response
FROM "Response" r
INNER JOIN "Survey" s ON r."surveyId" = s.id
WHERE s.name LIKE '%CES%' AND r.finished = true

ORDER BY metric_type;
