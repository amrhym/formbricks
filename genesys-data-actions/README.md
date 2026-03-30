# Genesys Cloud Data Actions for HiveCFM IVR

Import these Data Actions into your Genesys Cloud organization to integrate HiveCFM voice surveys.

## Data Actions

### 1. HiveCFM_GetSurveyQuestions
Fetch the survey structure (questions, audio URLs, input config) for a given survey.

**Inputs:**
- `HOST` — HiveCFM hostname (e.g., `hivecfm.xcai.io`)
- `ENVIRONMENT_ID` — HiveCFM environment ID
- `SURVEY_ID` — Survey ID
- `API_KEY` — HiveCFM API key (x-Api-Key header)
- `LANGUAGE` — ISO language code (`ar`, `en`, etc.) — determines which language to return questions in

### 2. HiveCFM_GetPromptNames
Get the Genesys Architect prompt names for each question, welcome card, and ending card.

**Inputs:**
- Same as above
- `LANGUAGE` — **Required**. Determines which language-suffixed prompt names to return. Default language prompts have no suffix, non-default languages get `_langCode` suffix.

### 3. HiveCFM_SubmitAnswer
Submit survey responses (answers) collected during the IVR call.

**Inputs:**
- Same base inputs as above
- `CALL_ID` — Unique call identifier from the IVR system
- `CALLER_NUMBER` — Caller's phone number
- `LANGUAGE` — Caller's selected language code
- `ANSWERS_JSON` — JSON string: `{"questionId1": 8, "questionId2": "1"}`
- `FINISHED` — `true` if survey is complete, `false` for partial submissions
- `HIDDEN_FIELDS_JSON` — JSON string: `{"branchName": "Riyadh", "agentId": "A001"}`

## How to Import

1. In Genesys Cloud, go to **Admin > Integrations > Actions**
2. Click **Import**
3. Select the JSON file
4. Configure the integration credentials

## Multi-Language Architect Flow

1. **Language Menu**: Play a prompt asking caller to select language (e.g., "Press 1 for Arabic, Press 2 for English")
2. **Set Language Variable**: Based on DTMF input, set `Flow.language = "ar"` or `Flow.language = "en"`
3. **Call GetSurveyQuestions**: Pass `LANGUAGE` to get questions in the selected language
4. **Call GetPromptNames**: Pass `LANGUAGE` to get language-specific prompt names
5. **Loop Questions**: For each question, play the corresponding Genesys prompt (pre-synced from HiveCFM)
6. **Collect Input**: Based on `inputConfig.inputType`:
   - `numeric` — Collect DTMF digits (min/max from config)
   - `dtmf_choice` — Collect single DTMF digit (map to choice)
   - `speech` — Record caller's voice answer (use `maxDurationSeconds` and `silenceTimeoutSeconds`)
7. **Submit Answers**: Call SubmitAnswer with all collected answers and `LANGUAGE`

## Prompt Naming Convention

- Default language: `hivecfm_{surveyId}_{elementId}` (no suffix)
- Other languages: `hivecfm_{surveyId}_{elementId}_{langCode}` (e.g., `_en`, `_ar`)
- Welcome card: `hivecfm_{surveyId}_welcome` / `hivecfm_{surveyId}_welcome_en`
- Ending card: `hivecfm_{surveyId}_ending` / `hivecfm_{surveyId}_ending_en`
