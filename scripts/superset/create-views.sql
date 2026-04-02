CREATE OR REPLACE VIEW v_agent_performance AS  SELECT v.genesys_agent_id,
    v.genesys_agent_name,
    v.genesys_queue_id,
    v.genesys_queue_name,
    v.response_date,
    v.call_direction,
    v.wrap_code,
    v.survey_completed,
    v.handle_time_seconds,
    v.conversation_duration_seconds,
    v.survey_name,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT r.genesys_agent_id,
            r.genesys_agent_name,
            r.genesys_queue_id,
            r.genesys_queue_name,
            date(r.created_at) AS response_date,
            r.genesys_direction AS call_direction,
            r.genesys_wrap_code AS wrap_code,
            r.finished AS survey_completed,
            r.genesys_handle_time AS handle_time_seconds,
            EXTRACT(epoch FROM (r.genesys_conversation_end - r.genesys_conversation_start)) AS conversation_duration_seconds,
            s.name AS survey_name,
            p.name AS project_name,
            o_1.name AS organization_name
           FROM (((("Response" r
             LEFT JOIN "Survey" s ON ((r."surveyId" = s.id)))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
          WHERE (r.genesys_agent_id IS NOT NULL)) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_contact_insights AS  SELECT v.contact_id,
    v.contact_created_at,
    v.contact_updated_at,
    v.environment_id,
    v.project_name,
    v.organization_name,
    v.total_responses,
    v.completed_responses,
    v.first_response_date,
    v.last_response_date,
    v.surveys_participated,
    o.id AS "organizationId"
   FROM (( SELECT c.id AS contact_id,
            c.created_at AS contact_created_at,
            c.updated_at AS contact_updated_at,
            e.id AS environment_id,
            p.name AS project_name,
            o_1.name AS organization_name,
            count(DISTINCT r.id) AS total_responses,
            count(DISTINCT
                CASE
                    WHEN r.finished THEN r.id
                    ELSE NULL::text
                END) AS completed_responses,
            min(r.created_at) AS first_response_date,
            max(r.created_at) AS last_response_date,
            count(DISTINCT r."surveyId") AS surveys_participated
           FROM (((("Contact" c
             LEFT JOIN "Response" r ON ((c.id = r."contactId")))
             LEFT JOIN "Environment" e ON ((c."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
          GROUP BY c.id, c.created_at, c.updated_at, e.id, p.name, o_1.name) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_delivery_status AS  SELECT v.survey_id,
    v.survey_name,
    v.survey_status,
    v.display_count,
    v.total_responses,
    v.completed_responses,
    v.response_rate,
    v.completion_rate,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT s.id AS survey_id,
            s.name AS survey_name,
            s.status AS survey_status,
            COALESCE(d.display_count, (0)::bigint) AS display_count,
            COALESCE(resp.total_responses, (0)::bigint) AS total_responses,
            COALESCE(resp.completed_responses, (0)::bigint) AS completed_responses,
                CASE
                    WHEN (COALESCE(d.display_count, (0)::bigint) > 0) THEN round((((COALESCE(resp.completed_responses, (0)::bigint))::numeric / (d.display_count)::numeric) * (100)::numeric), 1)
                    ELSE (0)::numeric
                END AS response_rate,
                CASE
                    WHEN (COALESCE(resp.total_responses, (0)::bigint) > 0) THEN round((((COALESCE(resp.completed_responses, (0)::bigint))::numeric / (resp.total_responses)::numeric) * (100)::numeric), 1)
                    ELSE (0)::numeric
                END AS completion_rate,
            p.name AS project_name,
            o_1.name AS organization_name
           FROM ((((("Survey" s
             LEFT JOIN ( SELECT "Display"."surveyId",
                    count(*) AS display_count
                   FROM "Display"
                  GROUP BY "Display"."surveyId") d ON ((d."surveyId" = s.id)))
             LEFT JOIN ( SELECT "Response"."surveyId",
                    count(*) AS total_responses,
                    sum(
                        CASE
                            WHEN "Response".finished THEN 1
                            ELSE 0
                        END) AS completed_responses
                   FROM "Response"
                  GROUP BY "Response"."surveyId") resp ON ((resp."surveyId" = s.id)))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
          WHERE ((COALESCE(d.display_count, (0)::bigint) > 0) OR (COALESCE(resp.total_responses, (0)::bigint) > 0))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_demographics AS  SELECT v.response_id,
    v.survey_id,
    v.survey_name,
    v.response_date,
    v.response_day,
    v.is_completed,
    v.language,
    v.survey_delivery_channel,
    v.country,
    v.browser,
    v.operating_system,
    v.device_type,
    v.traffic_source,
    v.duration_seconds,
    v.duration_minutes,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT r.id AS response_id,
            r."surveyId" AS survey_id,
            s.name AS survey_name,
            r.created_at AS response_date,
            (r.created_at)::date AS response_day,
            r.finished AS is_completed,
            r.language,
            r.survey_delivery_channel,
            COALESCE((r.meta ->> 'country'::text), 'Unknown'::text) AS country,
            COALESCE(((r.meta -> 'userAgent'::text) ->> 'browser'::text), 'Unknown'::text) AS browser,
            COALESCE(((r.meta -> 'userAgent'::text) ->> 'os'::text), 'Unknown'::text) AS operating_system,
            COALESCE(((r.meta -> 'userAgent'::text) ->> 'device'::text), 'Unknown'::text) AS device_type,
            COALESCE((r.meta ->> 'source'::text), 'Direct'::text) AS traffic_source,
            EXTRACT(epoch FROM (r.updated_at - r.created_at)) AS duration_seconds,
            round((EXTRACT(epoch FROM (r.updated_at - r.created_at)) / 60.0), 1) AS duration_minutes,
            p.name AS project_name,
            o_1.name AS organization_name
           FROM (((("Response" r
             JOIN "Survey" s ON ((s.id = r."surveyId")))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_nps_responses AS  SELECT v.response_id,
    v.survey_id,
    v.survey_name,
    v.question_id,
    v.question_text,
    v.question_type,
    v.question_range,
    v.response_date,
    v.is_completed,
    v.language,
    v.survey_delivery_channel,
    v.raw_score,
    v.normalized_score,
    v.nps_category,
    v.duration_seconds,
    v.duration_minutes,
    v.country,
    v.browser,
    v.operating_system,
    v.device_type,
    v.traffic_source,
    v.genesys_agent_name,
    v.genesys_queue_name,
    v.delivery_channel,
    v.response_day,
    v.project_name,
    v.organization_name,
    v.environment_id,
    o.id AS "organizationId"
   FROM (( WITH nps_questions AS (
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
                  WHERE (v_csat_questions.question_type = ANY (ARRAY['nps'::text, 'rating'::text]))
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
            ((r.data ->> q.question_id))::numeric AS raw_score,
                CASE
                    WHEN (q.question_type = 'nps'::text) THEN ((r.data ->> q.question_id))::numeric
                    WHEN ((q.question_range IS NOT NULL) AND (q.question_range > 0)) THEN round(((((r.data ->> q.question_id))::numeric / (q.question_range)::numeric) * (10)::numeric), 1)
                    ELSE ((r.data ->> q.question_id))::numeric
                END AS normalized_score,
                CASE
                    WHEN ((q.question_type = 'nps'::text) AND (((r.data ->> q.question_id))::numeric >= (9)::numeric)) THEN 'Promoter'::text
                    WHEN ((q.question_type = 'nps'::text) AND (((r.data ->> q.question_id))::numeric >= (7)::numeric)) THEN 'Passive'::text
                    WHEN (q.question_type = 'nps'::text) THEN 'Detractor'::text
                    WHEN ((q.question_type = 'rating'::text) AND (q.question_range >= 10) AND (((r.data ->> q.question_id))::numeric >= ((q.question_range)::numeric * 0.9))) THEN 'Promoter'::text
                    WHEN ((q.question_type = 'rating'::text) AND (q.question_range >= 10) AND (((r.data ->> q.question_id))::numeric >= ((q.question_range)::numeric * 0.7))) THEN 'Passive'::text
                    WHEN ((q.question_type = 'rating'::text) AND (q.question_range >= 10)) THEN 'Detractor'::text
                    ELSE NULL::text
                END AS nps_category,
            EXTRACT(epoch FROM (r.updated_at - r.created_at)) AS duration_seconds,
            round((EXTRACT(epoch FROM (r.updated_at - r.created_at)) / 60.0), 1) AS duration_minutes,
            (r.meta ->> 'country'::text) AS country,
            ((r.meta -> 'userAgent'::text) ->> 'browser'::text) AS browser,
            ((r.meta -> 'userAgent'::text) ->> 'os'::text) AS operating_system,
            ((r.meta -> 'userAgent'::text) ->> 'device'::text) AS device_type,
            (r.meta ->> 'source'::text) AS traffic_source,
            r.genesys_agent_name,
            r.genesys_queue_name,
            r.survey_delivery_channel AS delivery_channel,
            (r.created_at)::date AS response_day,
            q.project_name,
            q.organization_name,
            q.environment_id
           FROM ("Response" r
             JOIN nps_questions q ON ((q.survey_id = r."surveyId")))
          WHERE ((r.data ? q.question_id) AND (jsonb_typeof((r.data -> q.question_id)) = 'number'::text))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_nps_summary AS  SELECT v.survey_id,
    v.survey_name,
    v.project_name,
    v.organization_name,
    v.total_responses,
    v.promoter_count,
    v.passive_count,
    v.detractor_count,
    v.avg_score,
    v.avg_duration_minutes,
    v.nps_score,
    v.promoter_pct,
    v.passive_pct,
    v.detractor_pct,
    v.first_response,
    v.last_response,
    o.id AS "organizationId"
   FROM (( SELECT v_csat_nps_responses.survey_id,
            v_csat_nps_responses.survey_name,
            v_csat_nps_responses.project_name,
            v_csat_nps_responses.organization_name,
            count(*) AS total_responses,
            sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Promoter'::text) THEN 1
                    ELSE 0
                END) AS promoter_count,
            sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Passive'::text) THEN 1
                    ELSE 0
                END) AS passive_count,
            sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Detractor'::text) THEN 1
                    ELSE 0
                END) AS detractor_count,
            round(avg(v_csat_nps_responses.raw_score), 1) AS avg_score,
            round(avg(v_csat_nps_responses.duration_minutes), 1) AS avg_duration_minutes,
                CASE
                    WHEN (count(*) > 0) THEN round((((sum(
                    CASE
                        WHEN (v_csat_nps_responses.nps_category = 'Promoter'::text) THEN 1.0
                        ELSE (0)::numeric
                    END) / (count(*))::numeric) * (100)::numeric) - ((sum(
                    CASE
                        WHEN (v_csat_nps_responses.nps_category = 'Detractor'::text) THEN 1.0
                        ELSE (0)::numeric
                    END) / (count(*))::numeric) * (100)::numeric)), 1)
                    ELSE (0)::numeric
                END AS nps_score,
            round(((sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Promoter'::text) THEN 1.0
                    ELSE (0)::numeric
                END) / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 1) AS promoter_pct,
            round(((sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Passive'::text) THEN 1.0
                    ELSE (0)::numeric
                END) / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 1) AS passive_pct,
            round(((sum(
                CASE
                    WHEN (v_csat_nps_responses.nps_category = 'Detractor'::text) THEN 1.0
                    ELSE (0)::numeric
                END) / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 1) AS detractor_pct,
            min(v_csat_nps_responses.response_date) AS first_response,
            max(v_csat_nps_responses.response_date) AS last_response
           FROM v_csat_nps_responses
          WHERE (v_csat_nps_responses.nps_category IS NOT NULL)
          GROUP BY v_csat_nps_responses.survey_id, v_csat_nps_responses.survey_name, v_csat_nps_responses.project_name, v_csat_nps_responses.organization_name) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_question_ratings AS  SELECT v.response_id,
    v.survey_id,
    v.survey_name,
    v.question_id,
    v.question_text,
    v.question_type,
    v.question_range,
    v.rating,
    v.satisfaction_level,
    v.response_date,
    v.response_day,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT r.id AS response_id,
            r."surveyId" AS survey_id,
            q.survey_name,
            q.question_id,
            q.question_text,
            q.question_type,
            q.question_range,
            ((r.data ->> q.question_id))::numeric AS rating,
                CASE
                    WHEN ((q.question_range IS NOT NULL) AND (q.question_range > 0)) THEN
                    CASE
                        WHEN (((r.data ->> q.question_id))::numeric >= ((q.question_range)::numeric * 0.8)) THEN 'Satisfied'::text
                        WHEN (((r.data ->> q.question_id))::numeric >= ((q.question_range)::numeric * 0.5)) THEN 'Neutral'::text
                        ELSE 'Dissatisfied'::text
                    END
                    ELSE NULL::text
                END AS satisfaction_level,
            r.created_at AS response_date,
            (r.created_at)::date AS response_day,
            q.project_name,
            q.organization_name
           FROM ("Response" r
             JOIN v_csat_questions q ON ((q.survey_id = r."surveyId")))
          WHERE ((q.question_type = ANY (ARRAY['nps'::text, 'rating'::text])) AND (r.data ? q.question_id) AND (jsonb_typeof((r.data -> q.question_id)) = 'number'::text))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_questions AS  SELECT v.survey_id,
    v.survey_name,
    v.survey_status,
    v.survey_type,
    v.question_id,
    v.question_type,
    v.question_text,
    v.question_range,
    v.question_scale,
    v.project_name,
    v.organization_name,
    v.environment_id,
    o.id AS "organizationId"
   FROM (( SELECT s.id AS survey_id,
            s.name AS survey_name,
            s.status AS survey_status,
            s.type AS survey_type,
            (elem.value ->> 'id'::text) AS question_id,
            (elem.value ->> 'type'::text) AS question_type,
            regexp_replace(((elem.value -> 'headline'::text) ->> 'default'::text), '<[^>]+>'::text, ''::text, 'g'::text) AS question_text,
            COALESCE(((elem.value ->> 'range'::text))::integer,
                CASE
                    WHEN ((elem.value ->> 'type'::text) = 'nps'::text) THEN 10
                    ELSE NULL::integer
                END) AS question_range,
            (elem.value ->> 'scale'::text) AS question_scale,
            p.name AS project_name,
            o_1.name AS organization_name,
            e.id AS environment_id
           FROM ((((("Survey" s
             CROSS JOIN LATERAL unnest(s.blocks) block(block))
             CROSS JOIN LATERAL jsonb_array_elements((block.block -> 'elements'::text)) elem(value))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
          WHERE ((elem.value ->> 'type'::text) = ANY (ARRAY['nps'::text, 'rating'::text, 'openText'::text, 'ranking'::text]))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_text_full AS  SELECT v.response_id,
    v.survey_id,
    v.survey_name,
    v.question_id,
    v.question_text,
    v.response_text,
    v.text_length,
    v.response_date,
    v.response_day,
    v.is_completed,
    v.language,
    v.country,
    v.device_type,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT r.id AS response_id,
            r."surveyId" AS survey_id,
            q.survey_name,
            q.question_id,
            q.question_text,
            (r.data ->> q.question_id) AS response_text,
            length((r.data ->> q.question_id)) AS text_length,
            r.created_at AS response_date,
            (r.created_at)::date AS response_day,
            r.finished AS is_completed,
            r.language,
            COALESCE((r.meta ->> 'country'::text), 'Unknown'::text) AS country,
            COALESCE(((r.meta -> 'userAgent'::text) ->> 'device'::text), 'Unknown'::text) AS device_type,
            q.project_name,
            q.organization_name
           FROM ("Response" r
             JOIN v_csat_questions q ON ((q.survey_id = r."surveyId")))
          WHERE ((q.question_type = 'openText'::text) AND (r.data ? q.question_id) AND (jsonb_typeof((r.data -> q.question_id)) = 'string'::text) AND (length((r.data ->> q.question_id)) > 1))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_csat_text_responses AS  SELECT v.response_id,
    v.survey_id,
    v.survey_name,
    v.question_id,
    v.question_text,
    v.response_text,
    v.word,
    v.word_length,
    v.response_date,
    v.response_day,
    v.is_completed,
    v.language,
    v.country,
    v.device_type,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT r.id AS response_id,
            r."surveyId" AS survey_id,
            q.survey_name,
            q.question_id,
            q.question_text,
            (r.data ->> q.question_id) AS response_text,
            lower(TRIM(BOTH FROM word.word)) AS word,
            length(TRIM(BOTH FROM word.word)) AS word_length,
            r.created_at AS response_date,
            (r.created_at)::date AS response_day,
            r.finished AS is_completed,
            r.language,
            COALESCE((r.meta ->> 'country'::text), 'Unknown'::text) AS country,
            COALESCE(((r.meta -> 'userAgent'::text) ->> 'device'::text), 'Unknown'::text) AS device_type,
            q.project_name,
            q.organization_name
           FROM (("Response" r
             JOIN v_csat_questions q ON ((q.survey_id = r."surveyId")))
             CROSS JOIN LATERAL regexp_split_to_table((r.data ->> q.question_id), '\s+'::text) word(word))
          WHERE ((q.question_type = 'openText'::text) AND (r.data ? q.question_id) AND (jsonb_typeof((r.data -> q.question_id)) = 'string'::text) AND (length((r.data ->> q.question_id)) > 1) AND (length(TRIM(BOTH FROM word.word)) >= 2) AND (lower(TRIM(BOTH FROM word.word)) <> ALL (ARRAY['the'::text, 'a'::text, 'an'::text, 'and'::text, 'or'::text, 'but'::text, 'in'::text, 'on'::text, 'at'::text, 'to'::text, 'for'::text, 'of'::text, 'with'::text, 'by'::text, 'is'::text, 'it'::text, 'was'::text, 'are'::text, 'be'::text, 'has'::text, 'had'::text, 'do'::text, 'did'::text, 'not'::text, 'no'::text, 'yes'::text, 'this'::text, 'that'::text, 'from'::text, 'as'::text, 'so'::text, 'if'::text, 'we'::text, 'my'::text, 'me'::text, 'he'::text, 'she'::text, 'they'::text, 'you'::text, 'i'::text, 'am'::text, 'can'::text, 'will'::text, 'would'::text, 'could'::text, 'should'::text, 'very'::text, 'just'::text, 'also'::text, 'been'::text, 'have'::text, 'were'::text, 'more'::text, 'its'::text, 'than'::text, 'all'::text, 'out'::text, 'up'::text, 'what'::text, 'how'::text, 'when'::text, 'there'::text, 'about'::text])))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_daily_summary AS  SELECT v.date,
    v.survey_name,
    v.survey_status,
    v.total_responses,
    v.completed_responses,
    v.partial_responses,
    v.completion_rate,
    v.avg_completion_time_seconds,
    v.unique_contacts,
    v.unique_agents,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT date(r.created_at) AS date,
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
                    WHEN (NOT r.finished) THEN 1
                    ELSE NULL::integer
                END) AS partial_responses,
            round(((100.0 * (count(
                CASE
                    WHEN r.finished THEN 1
                    ELSE NULL::integer
                END))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS completion_rate,
            round(avg(EXTRACT(epoch FROM (r.updated_at - r.created_at))), 2) AS avg_completion_time_seconds,
            count(DISTINCT r."contactId") AS unique_contacts,
            count(DISTINCT r.genesys_agent_id) AS unique_agents,
            p.name AS project_name,
            o_1.name AS organization_name
           FROM (((("Response" r
             LEFT JOIN "Survey" s ON ((r."surveyId" = s.id)))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
          GROUP BY (date(r.created_at)), s.name, s.status, p.name, o_1.name
          ORDER BY (date(r.created_at)) DESC) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_kpi_dashboard AS  SELECT v.date,
    v.survey_name,
    v.survey_status,
    v.channel_name,
    v.queue_name,
    v.agent_name,
    v.project_name,
    v.organization_name,
    v.nps_responses,
    v.nps_promoters,
    v.nps_passives,
    v.nps_detractors,
    v.nps_score,
    v.nps_avg_rating,
    v.csat_responses,
    v.csat_score,
    v.csat_raw_avg,
    v.csat_satisfied,
    v.csat_dissatisfied,
    v.total_responses,
    v.completed_responses,
    v.unique_agents,
    o.id AS "organizationId"
   FROM (( WITH question_mapping AS (
                 SELECT s.id AS survey_id,
                    s.name AS survey_name,
                    (elem.value ->> 'id'::text) AS question_id,
                    (elem.value ->> 'type'::text) AS question_type,
                    COALESCE(((elem.value ->> 'range'::text))::integer, 10) AS question_range
                   FROM "Survey" s,
                    LATERAL unnest(s.blocks) block(value),
                    LATERAL jsonb_array_elements((block.value -> 'elements'::text)) elem(value)
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
                    o_1.name AS organization_name,
                    qm.question_id,
                    qm.question_type,
                    qm.question_range,
                    (r.data ->> qm.question_id) AS raw_value,
                        CASE
                            WHEN ((r.data ->> qm.question_id) ~ '^[0-9]+$'::text) THEN ((r.data ->> qm.question_id))::numeric
                            ELSE NULL::numeric
                        END AS numeric_value
                   FROM ((((("Response" r
                     JOIN "Survey" s ON ((r."surveyId" = s.id)))
                     LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
                     LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
                     LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
                     JOIN question_mapping qm ON ((qm.survey_id = s.id)))
                  WHERE ((r.data <> '{}'::jsonb) AND ((r.data ->> qm.question_id) IS NOT NULL))
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
                            WHEN ((response_scores.question_type = 'nps'::text) AND (response_scores.numeric_value IS NOT NULL)) THEN
                            CASE
                                WHEN (response_scores.numeric_value >= (9)::numeric) THEN 1
                                WHEN (response_scores.numeric_value >= (7)::numeric) THEN 0
                                ELSE '-1'::integer
                            END
                            ELSE NULL::integer
                        END AS nps_category,
                        CASE
                            WHEN ((response_scores.question_type = 'nps'::text) AND (response_scores.numeric_value IS NOT NULL)) THEN response_scores.numeric_value
                            ELSE NULL::numeric
                        END AS nps_score,
                        CASE
                            WHEN ((response_scores.question_type = 'rating'::text) AND (response_scores.numeric_value IS NOT NULL)) THEN
                            CASE
                                WHEN (response_scores.question_range = 5) THEN response_scores.numeric_value
                                WHEN (response_scores.question_range = 10) THEN (response_scores.numeric_value / 2.0)
                                ELSE response_scores.numeric_value
                            END
                            ELSE NULL::numeric
                        END AS csat_score,
                        CASE
                            WHEN ((response_scores.question_type = 'rating'::text) AND (response_scores.numeric_value IS NOT NULL)) THEN response_scores.numeric_value
                            ELSE NULL::numeric
                        END AS rating_raw
                   FROM response_scores
                )
         SELECT date(scored_data.response_date) AS date,
            scored_data.survey_name,
            scored_data.survey_status,
            scored_data.survey_delivery_channel AS channel_name,
            scored_data.genesys_queue_name AS queue_name,
            scored_data.genesys_agent_name AS agent_name,
            scored_data.project_name,
            scored_data.organization_name,
            count(DISTINCT
                CASE
                    WHEN (scored_data.nps_category IS NOT NULL) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS nps_responses,
            count(DISTINCT
                CASE
                    WHEN (scored_data.nps_category = 1) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS nps_promoters,
            count(DISTINCT
                CASE
                    WHEN (scored_data.nps_category = 0) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS nps_passives,
            count(DISTINCT
                CASE
                    WHEN (scored_data.nps_category = '-1'::integer) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS nps_detractors,
            round(
                CASE
                    WHEN (count(DISTINCT
                    CASE
                        WHEN (scored_data.nps_category IS NOT NULL) THEN scored_data.response_id
                        ELSE NULL::text
                    END) > 0) THEN ((((count(DISTINCT
                    CASE
                        WHEN (scored_data.nps_category = 1) THEN scored_data.response_id
                        ELSE NULL::text
                    END))::numeric - (count(DISTINCT
                    CASE
                        WHEN (scored_data.nps_category = '-1'::integer) THEN scored_data.response_id
                        ELSE NULL::text
                    END))::numeric) / (count(DISTINCT
                    CASE
                        WHEN (scored_data.nps_category IS NOT NULL) THEN scored_data.response_id
                        ELSE NULL::text
                    END))::numeric) * (100)::numeric)
                    ELSE NULL::numeric
                END, 2) AS nps_score,
            round(avg(scored_data.nps_score), 2) AS nps_avg_rating,
            count(DISTINCT
                CASE
                    WHEN (scored_data.csat_score IS NOT NULL) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS csat_responses,
            round(avg(scored_data.csat_score), 2) AS csat_score,
            round(avg(scored_data.rating_raw), 2) AS csat_raw_avg,
            count(DISTINCT
                CASE
                    WHEN (scored_data.csat_score >= (4)::numeric) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS csat_satisfied,
            count(DISTINCT
                CASE
                    WHEN (scored_data.csat_score < (3)::numeric) THEN scored_data.response_id
                    ELSE NULL::text
                END) AS csat_dissatisfied,
            count(DISTINCT scored_data.response_id) AS total_responses,
            count(DISTINCT
                CASE
                    WHEN scored_data.finished THEN scored_data.response_id
                    ELSE NULL::text
                END) AS completed_responses,
            count(DISTINCT scored_data.genesys_agent_id) AS unique_agents
           FROM scored_data
          GROUP BY (date(scored_data.response_date)), scored_data.survey_name, scored_data.survey_status, scored_data.survey_delivery_channel, scored_data.genesys_queue_name, scored_data.genesys_agent_name, scored_data.project_name, scored_data.organization_name
          ORDER BY (date(scored_data.response_date)) DESC) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_raw_data_survey_report AS  SELECT v.response_id,
    v.response_datetime,
    v.response_date,
    v.response_time_formatted,
    v.is_completed,
    v.survey_id,
    v.survey_name,
    v.survey_status,
    v.survey_type,
    v.language_code,
    v.channel_name,
    v.customer_id,
    v.customer_phone,
    v.interaction_id,
    v.agent_code,
    v.agent_name,
    v.queue_id,
    v.queue_name,
    v.call_direction,
    v.wrap_code,
    v.handle_time_seconds,
    v.genesys_conversation_start,
    v.genesys_conversation_end,
    v.question_id,
    v.question_type,
    v.question_headline,
    v.raw_answer,
    v.numeric_answer,
    v.nps_answer,
    v.nps_category,
    v.csat_answer,
    v.csat_raw_answer,
    v.ces_answer,
    v.fcr_answer,
    v.traffic_source,
    v.country,
    v.browser,
    v.operating_system,
    v.device_type,
    v.environment_id,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( WITH question_mapping AS (
                 SELECT s.id AS survey_id,
                    s.name AS survey_name,
                    (elem.value ->> 'id'::text) AS question_id,
                    (elem.value ->> 'type'::text) AS question_type,
                    COALESCE(((elem.value ->> 'range'::text))::integer, 10) AS question_range,
                    COALESCE(((elem.value -> 'headline'::text) ->> 'default'::text), (elem.value ->> 'headline'::text)) AS question_headline
                   FROM "Survey" s,
                    LATERAL unnest(s.blocks) block(value),
                    LATERAL jsonb_array_elements((block.value -> 'elements'::text)) elem(value)
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
                    o_1.name AS organization_name,
                    qm.question_id,
                    qm.question_type,
                    qm.question_range,
                    qm.question_headline,
                    (r.data ->> qm.question_id) AS raw_answer,
                        CASE
                            WHEN ((r.data ->> qm.question_id) ~ '^[0-9]+\.?[0-9]*$'::text) THEN ((r.data ->> qm.question_id))::numeric
                            ELSE NULL::numeric
                        END AS numeric_answer,
                    (r.meta ->> 'source'::text) AS traffic_source,
                    (r.meta ->> 'country'::text) AS country,
                    ((r.meta -> 'userAgent'::text) ->> 'browser'::text) AS browser,
                    ((r.meta -> 'userAgent'::text) ->> 'os'::text) AS operating_system,
                    ((r.meta -> 'userAgent'::text) ->> 'device'::text) AS device_type
                   FROM ((((("Response" r
                     JOIN "Survey" s ON ((r."surveyId" = s.id)))
                     LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
                     LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
                     LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))
                     LEFT JOIN question_mapping qm ON ((qm.survey_id = s.id)))
                  WHERE (r.data <> '{}'::jsonb)
                )
         SELECT response_with_scores.response_id,
            response_with_scores.response_datetime,
            date(response_with_scores.response_datetime) AS response_date,
            to_char(response_with_scores.response_datetime, 'MM/DD/YYYY HH12:MI:SS AM'::text) AS response_time_formatted,
            response_with_scores.is_completed,
            response_with_scores.survey_id,
            response_with_scores.survey_name,
            response_with_scores.survey_status,
            response_with_scores.survey_type,
            response_with_scores.response_language AS language_code,
            response_with_scores.survey_delivery_channel AS channel_name,
            response_with_scores.contact_id AS customer_id,
            response_with_scores.customer_phone,
            response_with_scores.interaction_id,
            response_with_scores.agent_code,
            response_with_scores.agent_name,
            response_with_scores.queue_id,
            response_with_scores.queue_name,
            response_with_scores.call_direction,
            response_with_scores.wrap_code,
            response_with_scores.handle_time_seconds,
            response_with_scores.genesys_conversation_start,
            response_with_scores.genesys_conversation_end,
            response_with_scores.question_id,
            response_with_scores.question_type,
            response_with_scores.question_headline,
            response_with_scores.raw_answer,
            response_with_scores.numeric_answer,
                CASE
                    WHEN ((response_with_scores.question_type = 'nps'::text) AND (response_with_scores.numeric_answer IS NOT NULL)) THEN response_with_scores.numeric_answer
                    ELSE NULL::numeric
                END AS nps_answer,
                CASE
                    WHEN ((response_with_scores.question_type = 'nps'::text) AND (response_with_scores.numeric_answer IS NOT NULL)) THEN
                    CASE
                        WHEN (response_with_scores.numeric_answer >= (9)::numeric) THEN 'Promoter'::text
                        WHEN (response_with_scores.numeric_answer >= (7)::numeric) THEN 'Passive'::text
                        ELSE 'Detractor'::text
                    END
                    ELSE NULL::text
                END AS nps_category,
                CASE
                    WHEN ((response_with_scores.question_type = 'rating'::text) AND (response_with_scores.numeric_answer IS NOT NULL)) THEN
                    CASE
                        WHEN (response_with_scores.question_range = 5) THEN response_with_scores.numeric_answer
                        WHEN (response_with_scores.question_range = 10) THEN round((response_with_scores.numeric_answer / 2.0), 2)
                        ELSE response_with_scores.numeric_answer
                    END
                    ELSE NULL::numeric
                END AS csat_answer,
                CASE
                    WHEN ((response_with_scores.question_type = 'rating'::text) AND (response_with_scores.numeric_answer IS NOT NULL)) THEN response_with_scores.numeric_answer
                    ELSE NULL::numeric
                END AS csat_raw_answer,
                CASE
                    WHEN ((response_with_scores.question_type = 'ces'::text) AND (response_with_scores.numeric_answer IS NOT NULL)) THEN response_with_scores.numeric_answer
                    ELSE NULL::numeric
                END AS ces_answer,
                CASE
                    WHEN (response_with_scores.question_type = ANY (ARRAY['consent'::text, 'boolean'::text])) THEN
                    CASE
                        WHEN (lower(response_with_scores.raw_answer) = ANY (ARRAY['yes'::text, 'true'::text, '1'::text, 'accepted'::text])) THEN 1
                        WHEN (lower(response_with_scores.raw_answer) = ANY (ARRAY['no'::text, 'false'::text, '0'::text, 'dismissed'::text])) THEN 0
                        ELSE NULL::integer
                    END
                    ELSE NULL::integer
                END AS fcr_answer,
            response_with_scores.traffic_source,
            response_with_scores.country,
            response_with_scores.browser,
            response_with_scores.operating_system,
            response_with_scores.device_type,
            response_with_scores.environment_id,
            response_with_scores.project_name,
            response_with_scores.organization_name
           FROM response_with_scores
          WHERE (response_with_scores.raw_answer IS NOT NULL)
          ORDER BY response_with_scores.response_datetime DESC) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_raw_data_survey_report_agg AS  SELECT v.response_id,
    v.response_datetime,
    v.response_date,
    v.response_time_formatted,
    v.survey_id,
    v.survey_name,
    v.survey_status,
    v.survey_type,
    v.channel_name,
    v.language_code,
    v.customer_id,
    v.customer_phone,
    v.interaction_id,
    v.agent_code,
    v.agent_name,
    v.queue_id,
    v.queue_name,
    v.call_direction,
    v.wrap_code,
    v.handle_time_seconds,
    v.conversation_start,
    v.conversation_end,
    v.nps_answer,
    v.nps_category,
    v.csat_answer,
    v.csat_raw_answer,
    v.ces_answer,
    v.fcr_answer,
    v.is_completed,
    v.traffic_source,
    v.country,
    v.browser,
    v.operating_system,
    v.device_type,
    v.environment_id,
    v.project_name,
    v.organization_name,
    v.questions_answered,
    o.id AS "organizationId"
   FROM (( SELECT v_raw_data_survey_report.response_id,
            min(v_raw_data_survey_report.response_datetime) AS response_datetime,
            min(v_raw_data_survey_report.response_date) AS response_date,
            min(v_raw_data_survey_report.response_time_formatted) AS response_time_formatted,
            min(v_raw_data_survey_report.survey_id) AS survey_id,
            min(v_raw_data_survey_report.survey_name) AS survey_name,
            min(v_raw_data_survey_report.survey_status) AS survey_status,
            min(v_raw_data_survey_report.survey_type) AS survey_type,
            min(v_raw_data_survey_report.channel_name) AS channel_name,
            min(v_raw_data_survey_report.language_code) AS language_code,
            min(v_raw_data_survey_report.customer_id) AS customer_id,
            min(v_raw_data_survey_report.customer_phone) AS customer_phone,
            min(v_raw_data_survey_report.interaction_id) AS interaction_id,
            min(v_raw_data_survey_report.agent_code) AS agent_code,
            min(v_raw_data_survey_report.agent_name) AS agent_name,
            min(v_raw_data_survey_report.queue_id) AS queue_id,
            min(v_raw_data_survey_report.queue_name) AS queue_name,
            min(v_raw_data_survey_report.call_direction) AS call_direction,
            min(v_raw_data_survey_report.wrap_code) AS wrap_code,
            min(v_raw_data_survey_report.handle_time_seconds) AS handle_time_seconds,
            min(v_raw_data_survey_report.genesys_conversation_start) AS conversation_start,
            min(v_raw_data_survey_report.genesys_conversation_end) AS conversation_end,
            max(v_raw_data_survey_report.nps_answer) AS nps_answer,
            max(v_raw_data_survey_report.nps_category) AS nps_category,
            round(avg(v_raw_data_survey_report.csat_answer), 2) AS csat_answer,
            round(avg(v_raw_data_survey_report.csat_raw_answer), 2) AS csat_raw_answer,
            max(v_raw_data_survey_report.ces_answer) AS ces_answer,
            max(v_raw_data_survey_report.fcr_answer) AS fcr_answer,
            bool_or(v_raw_data_survey_report.is_completed) AS is_completed,
            min(v_raw_data_survey_report.traffic_source) AS traffic_source,
            min(v_raw_data_survey_report.country) AS country,
            min(v_raw_data_survey_report.browser) AS browser,
            min(v_raw_data_survey_report.operating_system) AS operating_system,
            min(v_raw_data_survey_report.device_type) AS device_type,
            min(v_raw_data_survey_report.environment_id) AS environment_id,
            min(v_raw_data_survey_report.project_name) AS project_name,
            min(v_raw_data_survey_report.organization_name) AS organization_name,
            count(*) AS questions_answered
           FROM v_raw_data_survey_report
          GROUP BY v_raw_data_survey_report.response_id) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
CREATE OR REPLACE VIEW v_survey_analytics AS  SELECT v.survey_id,
    v.survey_name,
    v.survey_status,
    v.survey_type,
    v.survey_created_at,
    v.response_id,
    v.response_date,
    v.is_completed,
    v.response_language,
    v.survey_delivery_channel,
    v.completion_time_seconds,
    v.traffic_source,
    v.country,
    v.browser,
    v.operating_system,
    v.device_type,
    v.environment_id,
    v.project_name,
    v.organization_name,
    o.id AS "organizationId"
   FROM (( SELECT s.id AS survey_id,
            s.name AS survey_name,
            s.status AS survey_status,
            s.type AS survey_type,
            s.created_at AS survey_created_at,
            r.id AS response_id,
            r.created_at AS response_date,
            r.finished AS is_completed,
            r.language AS response_language,
            r.survey_delivery_channel,
            EXTRACT(epoch FROM (r.updated_at - r.created_at)) AS completion_time_seconds,
            (r.meta ->> 'source'::text) AS traffic_source,
            (r.meta ->> 'country'::text) AS country,
            ((r.meta -> 'userAgent'::text) ->> 'browser'::text) AS browser,
            ((r.meta -> 'userAgent'::text) ->> 'os'::text) AS operating_system,
            ((r.meta -> 'userAgent'::text) ->> 'device'::text) AS device_type,
            e.id AS environment_id,
            p.name AS project_name,
            o_1.name AS organization_name
           FROM (((("Survey" s
             LEFT JOIN "Response" r ON ((s.id = r."surveyId")))
             LEFT JOIN "Environment" e ON ((s."environmentId" = e.id)))
             LEFT JOIN "Project" p ON ((e."projectId" = p.id)))
             LEFT JOIN "Organization" o_1 ON ((p."organizationId" = o_1.id)))) v
     LEFT JOIN "Organization" o ON ((o.name = v.organization_name)));
