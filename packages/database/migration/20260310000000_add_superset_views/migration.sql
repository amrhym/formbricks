-- CreateViews: Superset analytics views
-- These views are used by Superset dashboards for analytics/reporting.
-- Order matters: base views first, then views that depend on them.

-- 1. Independent views (no view dependencies)

CREATE OR REPLACE VIEW public.v_agent_performance AS
 SELECT r.genesys_agent_id,
    r.genesys_agent_name,
    r.genesys_queue_id,
    r.genesys_queue_name,
    date(r.created_at) AS response_date,
    r.genesys_direction AS call_direction,
    r.genesys_wrap_code AS wrap_code,
    r.finished AS survey_completed,
    r.genesys_handle_time AS handle_time_seconds,
    EXTRACT(epoch FROM r.genesys_conversation_end - r.genesys_conversation_start) AS conversation_duration_seconds,
    s.name AS survey_name,
    p.name AS project_name,
    o.name AS organization_name
   FROM "Response" r
     LEFT JOIN "Survey" s ON r."surveyId" = s.id
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE r.genesys_agent_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_contact_insights AS
 SELECT c.id AS contact_id,
    c.created_at AS contact_created_at,
    c.updated_at AS contact_updated_at,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name,
    count(DISTINCT r.id) AS total_responses,
    count(DISTINCT
        CASE
            WHEN r.finished THEN r.id
            ELSE NULL::text
        END) AS completed_responses,
    min(r.created_at) AS first_response_date,
    max(r.created_at) AS last_response_date,
    count(DISTINCT r."surveyId") AS surveys_participated
   FROM "Contact" c
     LEFT JOIN "Response" r ON c.id = r."contactId"
     LEFT JOIN "Environment" e ON c."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id
  GROUP BY c.id, c.created_at, c.updated_at, e.id, p.name, o.name;

CREATE OR REPLACE VIEW public.v_csat_delivery_status AS
 SELECT s.id AS survey_id,
    s.name AS survey_name,
    s.status AS survey_status,
    COALESCE(d.display_count, 0::bigint) AS display_count,
    COALESCE(resp.total_responses, 0::bigint) AS total_responses,
    COALESCE(resp.completed_responses, 0::bigint) AS completed_responses,
        CASE
            WHEN COALESCE(d.display_count, 0::bigint) > 0 THEN round(COALESCE(resp.completed_responses, 0::bigint)::numeric / d.display_count::numeric * 100::numeric, 1)
            ELSE 0::numeric
        END AS response_rate,
        CASE
            WHEN COALESCE(resp.total_responses, 0::bigint) > 0 THEN round(COALESCE(resp.completed_responses, 0::bigint)::numeric / resp.total_responses::numeric * 100::numeric, 1)
            ELSE 0::numeric
        END AS completion_rate,
    p.name AS project_name,
    o.name AS organization_name
   FROM "Survey" s
     LEFT JOIN ( SELECT "Display"."surveyId",
            count(*) AS display_count
           FROM "Display"
          GROUP BY "Display"."surveyId") d ON d."surveyId" = s.id
     LEFT JOIN ( SELECT "Response"."surveyId",
            count(*) AS total_responses,
            sum(
                CASE
                    WHEN "Response".finished THEN 1
                    ELSE 0
                END) AS completed_responses
           FROM "Response"
          GROUP BY "Response"."surveyId") resp ON resp."surveyId" = s.id
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE COALESCE(d.display_count, 0::bigint) > 0 OR COALESCE(resp.total_responses, 0::bigint) > 0;

CREATE OR REPLACE VIEW public.v_csat_demographics AS
 SELECT r.id AS response_id,
    r."surveyId" AS survey_id,
    s.name AS survey_name,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    r.survey_delivery_channel,
    COALESCE(r.meta ->> 'country'::text, 'Unknown'::text) AS country,
    COALESCE((r.meta -> 'userAgent'::text) ->> 'browser'::text, 'Unknown'::text) AS browser,
    COALESCE((r.meta -> 'userAgent'::text) ->> 'os'::text, 'Unknown'::text) AS operating_system,
    COALESCE((r.meta -> 'userAgent'::text) ->> 'device'::text, 'Unknown'::text) AS device_type,
    COALESCE(r.meta ->> 'source'::text, 'Direct'::text) AS traffic_source,
    EXTRACT(epoch FROM r.updated_at - r.created_at) AS duration_seconds,
    round(EXTRACT(epoch FROM r.updated_at - r.created_at) / 60.0, 1) AS duration_minutes,
    p.name AS project_name,
    o.name AS organization_name
   FROM "Response" r
     JOIN "Survey" s ON s.id = r."surveyId"
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id;

CREATE OR REPLACE VIEW public.v_daily_summary AS
 SELECT date(r.created_at) AS date,
    s.name AS survey_name,
    s.status AS survey_status,
    count(*) AS total_responses,
    count(
        CASE
            WHEN r.finished THEN 1
            ELSE NULL::integer
        END) AS completed_responses,
    count(
        CASE
            WHEN NOT r.finished THEN 1
            ELSE NULL::integer
        END) AS partial_responses,
    round(100.0 * count(
        CASE
            WHEN r.finished THEN 1
            ELSE NULL::integer
        END)::numeric / NULLIF(count(*), 0)::numeric, 2) AS completion_rate,
    round(avg(EXTRACT(epoch FROM r.updated_at - r.created_at)), 2) AS avg_completion_time_seconds,
    count(DISTINCT r."contactId") AS unique_contacts,
    count(DISTINCT r.genesys_agent_id) AS unique_agents,
    p.name AS project_name,
    o.name AS organization_name
   FROM "Response" r
     LEFT JOIN "Survey" s ON r."surveyId" = s.id
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id
  GROUP BY (date(r.created_at)), s.name, s.status, p.name, o.name
  ORDER BY (date(r.created_at)) DESC;

CREATE OR REPLACE VIEW public.v_survey_analytics AS
 SELECT s.id AS survey_id,
    s.name AS survey_name,
    s.status AS survey_status,
    s.type AS survey_type,
    s.created_at AS survey_created_at,
    r.id AS response_id,
    r.created_at AS response_date,
    r.finished AS is_completed,
    r.language AS response_language,
    r.survey_delivery_channel,
    EXTRACT(epoch FROM r.updated_at - r.created_at) AS completion_time_seconds,
    r.meta ->> 'source'::text AS traffic_source,
    r.meta ->> 'country'::text AS country,
    (r.meta -> 'userAgent'::text) ->> 'browser'::text AS browser,
    (r.meta -> 'userAgent'::text) ->> 'os'::text AS operating_system,
    (r.meta -> 'userAgent'::text) ->> 'device'::text AS device_type,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
   FROM "Survey" s
     LEFT JOIN "Response" r ON s.id = r."surveyId"
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id;

-- 2. Base view for question extraction (used by several views below)

CREATE OR REPLACE VIEW public.v_csat_questions AS
 SELECT s.id AS survey_id,
    s.name AS survey_name,
    s.status AS survey_status,
    s.type AS survey_type,
    elem.value ->> 'id'::text AS question_id,
    elem.value ->> 'type'::text AS question_type,
    regexp_replace((elem.value -> 'headline'::text) ->> 'default'::text, '<[^>]+>'::text, ''::text, 'g'::text) AS question_text,
    COALESCE((elem.value ->> 'range'::text)::integer,
        CASE
            WHEN (elem.value ->> 'type'::text) = 'nps'::text THEN 10
            ELSE NULL::integer
        END) AS question_range,
    elem.value ->> 'scale'::text AS question_scale,
    p.name AS project_name,
    o.name AS organization_name,
    e.id AS environment_id
   FROM "Survey" s
     CROSS JOIN LATERAL unnest(s.blocks) block(block)
     CROSS JOIN LATERAL jsonb_array_elements(block.block -> 'elements'::text) elem(value)
     LEFT JOIN "Environment" e ON s."environmentId" = e.id
     LEFT JOIN "Project" p ON e."projectId" = p.id
     LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE (elem.value ->> 'type'::text) = ANY (ARRAY['nps'::text, 'rating'::text, 'openText'::text, 'ranking'::text]);

-- 3. Views that depend on v_csat_questions

CREATE OR REPLACE VIEW public.v_csat_nps_responses AS
 WITH nps_questions AS (
         SELECT v_csat_questions.survey_id,
            v_csat_questions.question_id,
            v_csat_questions.question_text,
            v_csat_questions.question_type,
            v_csat_questions.question_range,
            v_csat_questions.question_scale,
            v_csat_questions.survey_name,
            v_csat_questions.project_name,
            v_csat_questions.organization_name,
            v_csat_questions.environment_id
           FROM v_csat_questions
          WHERE v_csat_questions.question_type = ANY (ARRAY['nps'::text, 'rating'::text])
        )
 SELECT r.id AS response_id,
    r."surveyId" AS survey_id,
    q.survey_name,
    q.question_id,
    q.question_text,
    q.question_type,
    q.question_range,
    r.created_at AS response_date,
    r.finished AS is_completed,
    r.language,
    r.survey_delivery_channel,
    (r.data ->> q.question_id)::numeric AS raw_score,
        CASE
            WHEN q.question_type = 'nps'::text THEN (r.data ->> q.question_id)::numeric
            WHEN q.question_range IS NOT NULL AND q.question_range > 0 THEN round(((r.data ->> q.question_id)::numeric) / q.question_range::numeric * 10::numeric, 1)
            ELSE (r.data ->> q.question_id)::numeric
        END AS normalized_score,
        CASE
            WHEN q.question_type = 'nps'::text AND ((r.data ->> q.question_id)::numeric) >= 9::numeric THEN 'Promoter'::text
            WHEN q.question_type = 'nps'::text AND ((r.data ->> q.question_id)::numeric) >= 7::numeric THEN 'Passive'::text
            WHEN q.question_type = 'nps'::text THEN 'Detractor'::text
            WHEN q.question_type = 'rating'::text AND q.question_range >= 10 AND ((r.data ->> q.question_id)::numeric) >= (q.question_range::numeric * 0.9) THEN 'Promoter'::text
            WHEN q.question_type = 'rating'::text AND q.question_range >= 10 AND ((r.data ->> q.question_id)::numeric) >= (q.question_range::numeric * 0.7) THEN 'Passive'::text
            WHEN q.question_type = 'rating'::text AND q.question_range >= 10 THEN 'Detractor'::text
            ELSE NULL::text
        END AS nps_category,
    EXTRACT(epoch FROM r.updated_at - r.created_at) AS duration_seconds,
    round(EXTRACT(epoch FROM r.updated_at - r.created_at) / 60.0, 1) AS duration_minutes,
    r.meta ->> 'country'::text AS country,
    (r.meta -> 'userAgent'::text) ->> 'browser'::text AS browser,
    (r.meta -> 'userAgent'::text) ->> 'os'::text AS operating_system,
    (r.meta -> 'userAgent'::text) ->> 'device'::text AS device_type,
    r.meta ->> 'source'::text AS traffic_source,
    r.genesys_agent_name,
    r.genesys_queue_name,
    r.survey_delivery_channel AS delivery_channel,
    r.created_at::date AS response_day,
    q.project_name,
    q.organization_name,
    q.environment_id
   FROM "Response" r
     JOIN nps_questions q ON q.survey_id = r."surveyId"
  WHERE r.data ? q.question_id AND jsonb_typeof(r.data -> q.question_id) = 'number'::text;

CREATE OR REPLACE VIEW public.v_csat_question_ratings AS
 SELECT r.id AS response_id,
    r."surveyId" AS survey_id,
    q.survey_name,
    q.question_id,
    q.question_text,
    q.question_type,
    q.question_range,
    (r.data ->> q.question_id)::numeric AS rating,
        CASE
            WHEN q.question_range IS NOT NULL AND q.question_range > 0 THEN
            CASE
                WHEN ((r.data ->> q.question_id)::numeric) >= (q.question_range::numeric * 0.8) THEN 'Satisfied'::text
                WHEN ((r.data ->> q.question_id)::numeric) >= (q.question_range::numeric * 0.5) THEN 'Neutral'::text
                ELSE 'Dissatisfied'::text
            END
            ELSE NULL::text
        END AS satisfaction_level,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    q.project_name,
    q.organization_name
   FROM "Response" r
     JOIN v_csat_questions q ON q.survey_id = r."surveyId"
  WHERE (q.question_type = ANY (ARRAY['nps'::text, 'rating'::text])) AND r.data ? q.question_id AND jsonb_typeof(r.data -> q.question_id) = 'number'::text;

CREATE OR REPLACE VIEW public.v_csat_text_full AS
 SELECT r.id AS response_id,
    r."surveyId" AS survey_id,
    q.survey_name,
    q.question_id,
    q.question_text,
    r.data ->> q.question_id AS response_text,
    length(r.data ->> q.question_id) AS text_length,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    COALESCE(r.meta ->> 'country'::text, 'Unknown'::text) AS country,
    COALESCE((r.meta -> 'userAgent'::text) ->> 'device'::text, 'Unknown'::text) AS device_type,
    q.project_name,
    q.organization_name
   FROM "Response" r
     JOIN v_csat_questions q ON q.survey_id = r."surveyId"
  WHERE q.question_type = 'openText'::text AND r.data ? q.question_id AND jsonb_typeof(r.data -> q.question_id) = 'string'::text AND length(r.data ->> q.question_id) > 1;

CREATE OR REPLACE VIEW public.v_csat_text_responses AS
 SELECT r.id AS response_id,
    r."surveyId" AS survey_id,
    q.survey_name,
    q.question_id,
    q.question_text,
    r.data ->> q.question_id AS response_text,
    lower(TRIM(BOTH FROM word.word)) AS word,
    length(TRIM(BOTH FROM word.word)) AS word_length,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    COALESCE(r.meta ->> 'country'::text, 'Unknown'::text) AS country,
    COALESCE((r.meta -> 'userAgent'::text) ->> 'device'::text, 'Unknown'::text) AS device_type,
    q.project_name,
    q.organization_name
   FROM "Response" r
     JOIN v_csat_questions q ON q.survey_id = r."surveyId"
     CROSS JOIN LATERAL regexp_split_to_table(r.data ->> q.question_id, '\s+'::text) word(word)
  WHERE q.question_type = 'openText'::text AND r.data ? q.question_id AND jsonb_typeof(r.data -> q.question_id) = 'string'::text AND length(r.data ->> q.question_id) > 1 AND length(TRIM(BOTH FROM word.word)) >= 2 AND (lower(TRIM(BOTH FROM word.word)) <> ALL (ARRAY['the'::text, 'a'::text, 'an'::text, 'and'::text, 'or'::text, 'but'::text, 'in'::text, 'on'::text, 'at'::text, 'to'::text, 'for'::text, 'of'::text, 'with'::text, 'by'::text, 'is'::text, 'it'::text, 'was'::text, 'are'::text, 'be'::text, 'has'::text, 'had'::text, 'do'::text, 'did'::text, 'not'::text, 'no'::text, 'yes'::text, 'this'::text, 'that'::text, 'from'::text, 'as'::text, 'so'::text, 'if'::text, 'we'::text, 'my'::text, 'me'::text, 'he'::text, 'she'::text, 'they'::text, 'you'::text, 'i'::text, 'am'::text, 'can'::text, 'will'::text, 'would'::text, 'could'::text, 'should'::text, 'very'::text, 'just'::text, 'also'::text, 'been'::text, 'have'::text, 'were'::text, 'more'::text, 'its'::text, 'than'::text, 'all'::text, 'out'::text, 'up'::text, 'what'::text, 'how'::text, 'when'::text, 'there'::text, 'about'::text]));

-- 4. View that depends on v_csat_nps_responses

CREATE OR REPLACE VIEW public.v_csat_nps_summary AS
 SELECT survey_id,
    survey_name,
    project_name,
    organization_name,
    count(*) AS total_responses,
    sum(
        CASE
            WHEN nps_category = 'Promoter'::text THEN 1
            ELSE 0
        END) AS promoter_count,
    sum(
        CASE
            WHEN nps_category = 'Passive'::text THEN 1
            ELSE 0
        END) AS passive_count,
    sum(
        CASE
            WHEN nps_category = 'Detractor'::text THEN 1
            ELSE 0
        END) AS detractor_count,
    round(avg(raw_score), 1) AS avg_score,
    round(avg(duration_minutes), 1) AS avg_duration_minutes,
        CASE
            WHEN count(*) > 0 THEN round(sum(
            CASE
                WHEN nps_category = 'Promoter'::text THEN 1.0
                ELSE 0::numeric
            END) / count(*)::numeric * 100::numeric - sum(
            CASE
                WHEN nps_category = 'Detractor'::text THEN 1.0
                ELSE 0::numeric
            END) / count(*)::numeric * 100::numeric, 1)
            ELSE 0::numeric
        END AS nps_score,
    round(sum(
        CASE
            WHEN nps_category = 'Promoter'::text THEN 1.0
            ELSE 0::numeric
        END) / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS promoter_pct,
    round(sum(
        CASE
            WHEN nps_category = 'Passive'::text THEN 1.0
            ELSE 0::numeric
        END) / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS passive_pct,
    round(sum(
        CASE
            WHEN nps_category = 'Detractor'::text THEN 1.0
            ELSE 0::numeric
        END) / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS detractor_pct,
    min(response_date) AS first_response,
    max(response_date) AS last_response
   FROM v_csat_nps_responses
  WHERE nps_category IS NOT NULL
  GROUP BY survey_id, survey_name, project_name, organization_name;

-- 5. KPI dashboard (self-contained, no view dependencies)

CREATE OR REPLACE VIEW public.v_kpi_dashboard AS
 WITH question_mapping AS (
         SELECT s.id AS survey_id,
            s.name AS survey_name,
            elem.value ->> 'id'::text AS question_id,
            elem.value ->> 'type'::text AS question_type,
            COALESCE((elem.value ->> 'range'::text)::integer, 10) AS question_range
           FROM "Survey" s,
            LATERAL unnest(s.blocks) block(value),
            LATERAL jsonb_array_elements(block.value -> 'elements'::text) elem(value)
        ), response_scores AS (
         SELECT r.id AS response_id,
            r.created_at AS response_date,
            r.finished,
            r."surveyId",
            r.survey_delivery_channel,
            r.genesys_queue_name,
            r.genesys_agent_name,
            r.genesys_agent_id,
            s.name AS survey_name,
            s.status AS survey_status,
            e.id AS environment_id,
            p.name AS project_name,
            o.name AS organization_name,
            qm.question_id,
            qm.question_type,
            qm.question_range,
            r.data ->> qm.question_id AS raw_value,
                CASE
                    WHEN (r.data ->> qm.question_id) ~ '^[0-9]+$'::text THEN (r.data ->> qm.question_id)::numeric
                    ELSE NULL::numeric
                END AS numeric_value
           FROM "Response" r
             JOIN "Survey" s ON r."surveyId" = s.id
             LEFT JOIN "Environment" e ON s."environmentId" = e.id
             LEFT JOIN "Project" p ON e."projectId" = p.id
             LEFT JOIN "Organization" o ON p."organizationId" = o.id
             JOIN question_mapping qm ON qm.survey_id = s.id
          WHERE r.data <> '{}'::jsonb AND (r.data ->> qm.question_id) IS NOT NULL
        ), scored_data AS (
         SELECT response_scores.response_id,
            response_scores.response_date,
            response_scores.finished,
            response_scores."surveyId",
            response_scores.survey_delivery_channel,
            response_scores.genesys_queue_name,
            response_scores.genesys_agent_name,
            response_scores.genesys_agent_id,
            response_scores.survey_name,
            response_scores.survey_status,
            response_scores.environment_id,
            response_scores.project_name,
            response_scores.organization_name,
            response_scores.question_id,
            response_scores.question_type,
            response_scores.question_range,
            response_scores.raw_value,
            response_scores.numeric_value,
                CASE
                    WHEN response_scores.question_type = 'nps'::text AND response_scores.numeric_value IS NOT NULL THEN
                    CASE
                        WHEN response_scores.numeric_value >= 9::numeric THEN 1
                        WHEN response_scores.numeric_value >= 7::numeric THEN 0
                        ELSE '-1'::integer
                    END
                    ELSE NULL::integer
                END AS nps_category,
                CASE
                    WHEN response_scores.question_type = 'nps'::text AND response_scores.numeric_value IS NOT NULL THEN response_scores.numeric_value
                    ELSE NULL::numeric
                END AS nps_score,
                CASE
                    WHEN response_scores.question_type = 'rating'::text AND response_scores.numeric_value IS NOT NULL THEN
                    CASE
                        WHEN response_scores.question_range = 5 THEN response_scores.numeric_value
                        WHEN response_scores.question_range = 10 THEN response_scores.numeric_value / 2.0
                        ELSE response_scores.numeric_value
                    END
                    ELSE NULL::numeric
                END AS csat_score,
                CASE
                    WHEN response_scores.question_type = 'rating'::text AND response_scores.numeric_value IS NOT NULL THEN response_scores.numeric_value
                    ELSE NULL::numeric
                END AS rating_raw
           FROM response_scores
        )
 SELECT date(response_date) AS date,
    survey_name,
    survey_status,
    survey_delivery_channel AS channel_name,
    genesys_queue_name AS queue_name,
    genesys_agent_name AS agent_name,
    project_name,
    organization_name,
    count(DISTINCT
        CASE
            WHEN nps_category IS NOT NULL THEN response_id
            ELSE NULL::text
        END) AS nps_responses,
    count(DISTINCT
        CASE
            WHEN nps_category = 1 THEN response_id
            ELSE NULL::text
        END) AS nps_promoters,
    count(DISTINCT
        CASE
            WHEN nps_category = 0 THEN response_id
            ELSE NULL::text
        END) AS nps_passives,
    count(DISTINCT
        CASE
            WHEN nps_category = '-1'::integer THEN response_id
            ELSE NULL::text
        END) AS nps_detractors,
    round(
        CASE
            WHEN count(DISTINCT
            CASE
                WHEN nps_category IS NOT NULL THEN response_id
                ELSE NULL::text
            END) > 0 THEN (count(DISTINCT
            CASE
                WHEN nps_category = 1 THEN response_id
                ELSE NULL::text
            END)::numeric - count(DISTINCT
            CASE
                WHEN nps_category = '-1'::integer THEN response_id
                ELSE NULL::text
            END)::numeric) / count(DISTINCT
            CASE
                WHEN nps_category IS NOT NULL THEN response_id
                ELSE NULL::text
            END)::numeric * 100::numeric
            ELSE NULL::numeric
        END, 2) AS nps_score,
    round(avg(nps_score), 2) AS nps_avg_rating,
    count(DISTINCT
        CASE
            WHEN csat_score IS NOT NULL THEN response_id
            ELSE NULL::text
        END) AS csat_responses,
    round(avg(csat_score), 2) AS csat_score,
    round(avg(rating_raw), 2) AS csat_raw_avg,
    count(DISTINCT
        CASE
            WHEN csat_score >= 4::numeric THEN response_id
            ELSE NULL::text
        END) AS csat_satisfied,
    count(DISTINCT
        CASE
            WHEN csat_score < 3::numeric THEN response_id
            ELSE NULL::text
        END) AS csat_dissatisfied,
    count(DISTINCT response_id) AS total_responses,
    count(DISTINCT
        CASE
            WHEN finished THEN response_id
            ELSE NULL::text
        END) AS completed_responses,
    count(DISTINCT genesys_agent_id) AS unique_agents
   FROM scored_data
  GROUP BY (date(response_date)), survey_name, survey_status, survey_delivery_channel, genesys_queue_name, genesys_agent_name, project_name, organization_name
  ORDER BY (date(response_date)) DESC;

-- 6. Raw data report (self-contained, no view dependencies)

CREATE OR REPLACE VIEW public.v_raw_data_survey_report AS
 WITH question_mapping AS (
         SELECT s.id AS survey_id,
            s.name AS survey_name,
            elem.value ->> 'id'::text AS question_id,
            elem.value ->> 'type'::text AS question_type,
            COALESCE((elem.value ->> 'range'::text)::integer, 10) AS question_range,
            COALESCE((elem.value -> 'headline'::text) ->> 'default'::text, elem.value ->> 'headline'::text) AS question_headline
           FROM "Survey" s,
            LATERAL unnest(s.blocks) block(value),
            LATERAL jsonb_array_elements(block.value -> 'elements'::text) elem(value)
        ), response_with_scores AS (
         SELECT r.id AS response_id,
            r.created_at AS response_datetime,
            r.updated_at,
            r.finished AS is_completed,
            r."surveyId" AS survey_id,
            r."contactId" AS contact_id,
            r.language AS response_language,
            r.survey_delivery_channel,
            r.survey_delivered_at,
            r.data AS response_data,
            r.meta AS response_meta,
            r.genesys_conversation_id AS interaction_id,
            r.genesys_agent_id AS agent_code,
            r.genesys_agent_name AS agent_name,
            r.genesys_queue_id AS queue_id,
            r.genesys_queue_name AS queue_name,
            r.genesys_handle_time AS handle_time_seconds,
            r.genesys_wrap_code AS wrap_code,
            r.genesys_direction AS call_direction,
            r.genesys_ani AS customer_phone,
            r.genesys_dnis AS dnis,
            r.genesys_conversation_start,
            r.genesys_conversation_end,
            s.name AS survey_name,
            s.status AS survey_status,
            s.type AS survey_type,
            e.id AS environment_id,
            p.name AS project_name,
            o.name AS organization_name,
            qm.question_id,
            qm.question_type,
            qm.question_range,
            qm.question_headline,
            r.data ->> qm.question_id AS raw_answer,
                CASE
                    WHEN (r.data ->> qm.question_id) ~ '^[0-9]+\.?[0-9]*$'::text THEN (r.data ->> qm.question_id)::numeric
                    ELSE NULL::numeric
                END AS numeric_answer,
            r.meta ->> 'source'::text AS traffic_source,
            r.meta ->> 'country'::text AS country,
            (r.meta -> 'userAgent'::text) ->> 'browser'::text AS browser,
            (r.meta -> 'userAgent'::text) ->> 'os'::text AS operating_system,
            (r.meta -> 'userAgent'::text) ->> 'device'::text AS device_type
           FROM "Response" r
             JOIN "Survey" s ON r."surveyId" = s.id
             LEFT JOIN "Environment" e ON s."environmentId" = e.id
             LEFT JOIN "Project" p ON e."projectId" = p.id
             LEFT JOIN "Organization" o ON p."organizationId" = o.id
             LEFT JOIN question_mapping qm ON qm.survey_id = s.id
          WHERE r.data <> '{}'::jsonb
        )
 SELECT response_id,
    response_datetime,
    date(response_datetime) AS response_date,
    to_char(response_datetime, 'MM/DD/YYYY HH12:MI:SS AM'::text) AS response_time_formatted,
    is_completed,
    survey_id,
    survey_name,
    survey_status,
    survey_type,
    response_language AS language_code,
    survey_delivery_channel AS channel_name,
    contact_id AS customer_id,
    customer_phone,
    interaction_id,
    agent_code,
    agent_name,
    queue_id,
    queue_name,
    call_direction,
    wrap_code,
    handle_time_seconds,
    genesys_conversation_start,
    genesys_conversation_end,
    question_id,
    question_type,
    question_headline,
    raw_answer,
    numeric_answer,
        CASE
            WHEN question_type = 'nps'::text AND numeric_answer IS NOT NULL THEN numeric_answer
            ELSE NULL::numeric
        END AS nps_answer,
        CASE
            WHEN question_type = 'nps'::text AND numeric_answer IS NOT NULL THEN
            CASE
                WHEN numeric_answer >= 9::numeric THEN 'Promoter'::text
                WHEN numeric_answer >= 7::numeric THEN 'Passive'::text
                ELSE 'Detractor'::text
            END
            ELSE NULL::text
        END AS nps_category,
        CASE
            WHEN question_type = 'rating'::text AND numeric_answer IS NOT NULL THEN
            CASE
                WHEN question_range = 5 THEN numeric_answer
                WHEN question_range = 10 THEN round(numeric_answer / 2.0, 2)
                ELSE numeric_answer
            END
            ELSE NULL::numeric
        END AS csat_answer,
        CASE
            WHEN question_type = 'rating'::text AND numeric_answer IS NOT NULL THEN numeric_answer
            ELSE NULL::numeric
        END AS csat_raw_answer,
        CASE
            WHEN question_type = 'ces'::text AND numeric_answer IS NOT NULL THEN numeric_answer
            ELSE NULL::numeric
        END AS ces_answer,
        CASE
            WHEN question_type = ANY (ARRAY['consent'::text, 'boolean'::text]) THEN
            CASE
                WHEN lower(raw_answer) = ANY (ARRAY['yes'::text, 'true'::text, '1'::text, 'accepted'::text]) THEN 1
                WHEN lower(raw_answer) = ANY (ARRAY['no'::text, 'false'::text, '0'::text, 'dismissed'::text]) THEN 0
                ELSE NULL::integer
            END
            ELSE NULL::integer
        END AS fcr_answer,
    traffic_source,
    country,
    browser,
    operating_system,
    device_type,
    environment_id,
    project_name,
    organization_name
   FROM response_with_scores
  WHERE raw_answer IS NOT NULL
  ORDER BY response_datetime DESC;

-- 7. Aggregated report (depends on v_raw_data_survey_report)

CREATE OR REPLACE VIEW public.v_raw_data_survey_report_agg AS
 SELECT response_id,
    min(response_datetime) AS response_datetime,
    min(response_date) AS response_date,
    min(response_time_formatted) AS response_time_formatted,
    min(survey_id) AS survey_id,
    min(survey_name) AS survey_name,
    min(survey_status) AS survey_status,
    min(survey_type) AS survey_type,
    min(channel_name) AS channel_name,
    min(language_code) AS language_code,
    min(customer_id) AS customer_id,
    min(customer_phone) AS customer_phone,
    min(interaction_id) AS interaction_id,
    min(agent_code) AS agent_code,
    min(agent_name) AS agent_name,
    min(queue_id) AS queue_id,
    min(queue_name) AS queue_name,
    min(call_direction) AS call_direction,
    min(wrap_code) AS wrap_code,
    min(handle_time_seconds) AS handle_time_seconds,
    min(genesys_conversation_start) AS conversation_start,
    min(genesys_conversation_end) AS conversation_end,
    max(nps_answer) AS nps_answer,
    max(nps_category) AS nps_category,
    round(avg(csat_answer), 2) AS csat_answer,
    round(avg(csat_raw_answer), 2) AS csat_raw_answer,
    max(ces_answer) AS ces_answer,
    max(fcr_answer) AS fcr_answer,
    bool_or(is_completed) AS is_completed,
    min(traffic_source) AS traffic_source,
    min(country) AS country,
    min(browser) AS browser,
    min(operating_system) AS operating_system,
    min(device_type) AS device_type,
    min(environment_id) AS environment_id,
    min(project_name) AS project_name,
    min(organization_name) AS organization_name,
    count(*) AS questions_answered
   FROM v_raw_data_survey_report
  GROUP BY response_id;

-- =====================================================================
-- 8. Additional Feedback Analytics views (Dashboard 32: HiveCFM Hub)
-- These views support the "HiveCFM Hub - Feedback Analytics" dashboard.
-- Added 2026-03-12.
-- =====================================================================

-- v_nps_score: Aggregated NPS score by survey
CREATE OR REPLACE VIEW public.v_nps_score AS
 SELECT
    s.id AS survey_id,
    s.name AS survey_name,
    s.status AS survey_status,
    p.name AS project_name,
    o.name AS organization_name,
    e.id AS environment_id,
    count(*) FILTER (WHERE (r.data ->> q.question_id)::int >= 9) AS promoter_count,
    count(*) FILTER (WHERE (r.data ->> q.question_id)::int BETWEEN 7 AND 8) AS passive_count,
    count(*) FILTER (WHERE (r.data ->> q.question_id)::int <= 6) AS detractor_count,
    count(*) AS total_responses,
    CASE WHEN count(*) > 0 THEN
      round(
        (count(*) FILTER (WHERE (r.data ->> q.question_id)::int >= 9)::numeric
         - count(*) FILTER (WHERE (r.data ->> q.question_id)::int <= 6)::numeric)
        / count(*)::numeric * 100, 1
      )
    ELSE 0 END AS nps_score,
    round(avg((r.data ->> q.question_id)::numeric), 2) AS avg_score
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE (q.value ->> 'type') = 'nps'
    AND r.data ? (q.value ->> 'id')
    AND jsonb_typeof(r.data -> (q.value ->> 'id')) = 'number'
  GROUP BY s.id, s.name, s.status, p.name, o.name, e.id, q.value ->> 'id';

-- v_nps_analysis: Individual NPS responses with category classification
CREATE OR REPLACE VIEW public.v_nps_analysis AS
 SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    s.name AS survey_name,
    (q.value ->> 'id') AS question_id,
    (r.data ->> (q.value ->> 'id'))::int AS score,
    CASE
      WHEN (r.data ->> (q.value ->> 'id'))::int >= 9 THEN 'Promoter'
      WHEN (r.data ->> (q.value ->> 'id'))::int >= 7 THEN 'Passive'
      ELSE 'Detractor'
    END AS nps_category,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    r.survey_delivery_channel,
    r.genesys_agent_name,
    r.genesys_queue_name,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE (q.value ->> 'type') = 'nps'
    AND r.data ? (q.value ->> 'id')
    AND jsonb_typeof(r.data -> (q.value ->> 'id')) = 'number';

-- feedback_records: Denormalized view of survey responses, one row per question per response
CREATE OR REPLACE VIEW public.feedback_records AS
 SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    s.name AS survey_name,
    s.type AS survey_type,
    s.status AS survey_status,
    (q.value ->> 'id') AS question_id,
    (q.value ->> 'type') AS question_type,
    regexp_replace((q.value -> 'headline' ->> 'default'), '<[^>]+>', '', 'g') AS question_text,
    r.data ->> (q.value ->> 'id') AS answer,
    CASE
      WHEN jsonb_typeof(r.data -> (q.value ->> 'id')) = 'number'
      THEN (r.data ->> (q.value ->> 'id'))::numeric
      ELSE NULL
    END AS numeric_answer,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    r.survey_delivery_channel,
    r."contactId" AS contact_id,
    r.genesys_agent_name,
    r.genesys_queue_name,
    r.genesys_conversation_id,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE r.data ? (q.value ->> 'id')
    AND (r.data ->> (q.value ->> 'id')) IS NOT NULL;

-- v_categorical_analysis: Responses to categorical questions with counts
CREATE OR REPLACE VIEW public.v_categorical_analysis AS
 SELECT
    s.id AS survey_id,
    s.name AS survey_name,
    (q.value ->> 'id') AS question_id,
    (q.value ->> 'type') AS question_type,
    regexp_replace((q.value -> 'headline' ->> 'default'), '<[^>]+>', '', 'g') AS question_text,
    r.data ->> (q.value ->> 'id') AS answer_value,
    count(*) AS response_count,
    r.survey_delivery_channel,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE (q.value ->> 'type') IN ('multipleChoiceSingle', 'multipleChoiceMulti', 'consent', 'boolean')
    AND r.data ? (q.value ->> 'id')
    AND (r.data ->> (q.value ->> 'id')) IS NOT NULL
  GROUP BY s.id, s.name, q.value ->> 'id', q.value ->> 'type',
           q.value -> 'headline' ->> 'default', r.data ->> (q.value ->> 'id'),
           r.survey_delivery_channel, e.id, p.name, o.name;

-- v_daily_responses: Daily response volume by survey and field type
CREATE OR REPLACE VIEW public.v_daily_responses AS
 SELECT
    r.created_at::date AS response_date,
    s.id AS survey_id,
    s.name AS survey_name,
    s.type AS survey_type,
    (q.value ->> 'type') AS question_type,
    count(*) AS response_count,
    count(*) FILTER (WHERE r.finished) AS completed_count,
    r.survey_delivery_channel,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE r.data ? (q.value ->> 'id')
  GROUP BY r.created_at::date, s.id, s.name, s.type, q.value ->> 'type',
           r.survey_delivery_channel, e.id, p.name, o.name;

-- v_survey_summary: Survey-level statistics
CREATE OR REPLACE VIEW public.v_survey_summary AS
 SELECT
    s.id AS survey_id,
    s.name AS survey_name,
    s.type AS survey_type,
    s.status AS survey_status,
    s.created_at AS survey_created_at,
    s.updated_at AS survey_updated_at,
    count(DISTINCT r.id) AS total_responses,
    count(DISTINCT r.id) FILTER (WHERE r.finished) AS completed_responses,
    CASE WHEN count(DISTINCT r.id) > 0
      THEN round(count(DISTINCT r.id) FILTER (WHERE r.finished)::numeric / count(DISTINCT r.id)::numeric * 100, 1)
      ELSE 0
    END AS completion_rate,
    min(r.created_at) AS first_response_at,
    max(r.created_at) AS last_response_at,
    count(DISTINCT r."contactId") AS unique_contacts,
    count(DISTINCT r.genesys_agent_id) AS unique_agents,
    count(DISTINCT r.survey_delivery_channel) AS channel_count,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Survey" s
  LEFT JOIN "Response" r ON s.id = r."surveyId"
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  GROUP BY s.id, s.name, s.type, s.status, s.created_at, s.updated_at,
           e.id, p.name, o.name;

-- v_text_feedback: Open text responses
CREATE OR REPLACE VIEW public.v_text_feedback AS
 SELECT
    r.id AS response_id,
    r."surveyId" AS survey_id,
    s.name AS survey_name,
    (q.value ->> 'id') AS question_id,
    regexp_replace((q.value -> 'headline' ->> 'default'), '<[^>]+>', '', 'g') AS question_text,
    r.data ->> (q.value ->> 'id') AS feedback_text,
    length(r.data ->> (q.value ->> 'id')) AS text_length,
    r.created_at AS response_date,
    r.created_at::date AS response_day,
    r.finished AS is_completed,
    r.language,
    r.survey_delivery_channel,
    r."contactId" AS contact_id,
    r.genesys_agent_name,
    r.genesys_queue_name,
    e.id AS environment_id,
    p.name AS project_name,
    o.name AS organization_name
  FROM "Response" r
  JOIN "Survey" s ON r."surveyId" = s.id
  CROSS JOIN LATERAL unnest(s.blocks) blk(block)
  CROSS JOIN LATERAL jsonb_array_elements(blk.block -> 'elements') q(value)
  LEFT JOIN "Environment" e ON s."environmentId" = e.id
  LEFT JOIN "Project" p ON e."projectId" = p.id
  LEFT JOIN "Organization" o ON p."organizationId" = o.id
  WHERE (q.value ->> 'type') = 'openText'
    AND r.data ? (q.value ->> 'id')
    AND jsonb_typeof(r.data -> (q.value ->> 'id')) = 'string'
    AND length(r.data ->> (q.value ->> 'id')) > 0;
