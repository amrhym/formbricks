# IVR Integration API

This document describes the HiveCFM IVR Integration API, which allows external IVR (Interactive Voice Response) systems to walk through a survey question-by-question and submit responses.

## Overview

The IVR integration flow:

1. **Fetch survey** — `GET` the survey to receive a linearized list of voice-compatible questions with DTMF input mappings
2. **Play prompts** — For each question, play the audio file (if `audioUrl` is set) or use TTS on the `questionText`
3. **Collect input** — Gather DTMF keypresses according to each question's `inputConfig`
4. **Submit response** — `POST` the collected answers back to HiveCFM

```
IVR System                              HiveCFM API
    |                                        |
    |  GET /ivr/{surveyId}                   |
    |--------------------------------------->|
    |  { survey, questions[] }               |
    |<---------------------------------------|
    |                                        |
    |  GET /ivr/{surveyId}/media/{questionId} |
    |--------------------------------------->|
    |  <audio/wav binary stream>             |
    |<---------------------------------------|
    |                                        |
    |  [Play Q1 audio/TTS, collect DTMF]     |
    |  [Play Q2 audio/TTS, collect DTMF]     |
    |  [Play Q3 audio/TTS, collect DTMF]     |
    |                                        |
    |  POST /ivr/{surveyId}/responses        |
    |  { callId, answers }                   |
    |--------------------------------------->|
    |  { responseId, status }                |
    |<---------------------------------------|
```

## Authentication

The IVR API uses **environment-scoped** access. The `environmentId` is embedded in the URL path. No additional authentication headers are required for client-side endpoints.

**Base URL:** `https://your-instance.com/api/v1/client/{environmentId}/ivr/{surveyId}`

## Endpoints

### GET Survey for IVR

Fetches the survey as a linearized, IVR-ready question list. Only voice-compatible question types are included (NPS, Rating, MultipleChoiceSingle, CTA). Questions are ordered by block sequence, then element sequence within each block.

**Request:**

```
GET /api/v1/client/{environmentId}/ivr/{surveyId}
```

**Response (200):**

```json
{
  "data": {
    "survey": {
      "id": "cm1abc123def456",
      "name": "Customer Satisfaction",
      "totalQuestions": 3,
      "welcomeMessage": "Welcome to our survey",
      "welcomeAudioUrl": null,
      "thankYouMessage": "Thank you for your feedback",
      "thankYouAudioUrl": null,
      "errorMessage": "Invalid input, please try again",
      "inputTimeout": 5,
      "maxRetries": 3,
      "bargeinEnabled": true
    },
    "questions": [
      {
        "questionId": "nps_score",
        "questionIndex": 1,
        "blockId": "cm1block001",
        "blockName": "Satisfaction",
        "questionText": "How likely are you to recommend us to a friend?",
        "subheader": "Press 0 through 10",
        "audioUrl": "https://your-instance.com/api/v1/client/cm1envxyz/ivr/cm1abc123def456/media/nps_score",
        "type": "nps",
        "required": true,
        "inputConfig": {
          "inputType": "numeric",
          "min": 0,
          "max": 10
        }
      },
      {
        "questionId": "service_rating",
        "questionIndex": 2,
        "blockId": "cm1block001",
        "blockName": "Satisfaction",
        "questionText": "How satisfied are you with our service?",
        "subheader": null,
        "audioUrl": null,
        "type": "rating",
        "required": true,
        "inputConfig": {
          "inputType": "numeric",
          "min": 1,
          "max": 5
        }
      },
      {
        "questionId": "department",
        "questionIndex": 3,
        "blockId": "cm1block002",
        "blockName": "Details",
        "questionText": "Which department did you contact?",
        "subheader": null,
        "audioUrl": "https://your-instance.com/api/v1/client/cm1envxyz/ivr/cm1abc123def456/media/department",
        "type": "multipleChoiceSingle",
        "required": false,
        "inputConfig": {
          "inputType": "dtmf_choice",
          "options": [
            { "key": "1", "label": "Sales" },
            { "key": "2", "label": "Support" },
            { "key": "3", "label": "Billing" }
          ]
        }
      }
    ]
  }
}
```

### POST IVR Response

Submits the collected answers from an IVR call. The `callId` is used as a deduplication key — submitting the same `callId` twice will fail with a duplicate error.

**Request:**

```
POST /api/v1/client/{environmentId}/ivr/{surveyId}/responses
Content-Type: application/json
```

**Body:**

```json
{
  "callId": "call-uuid-abc-123",
  "callerNumber": "+1234567890",
  "answers": {
    "nps_score": 8,
    "service_rating": 4,
    "department": "1"
  },
  "finished": true,
  "language": "en",
  "meta": {
    "source": "ivr",
    "callDuration": 95
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `callId` | string | Yes | Unique call identifier. Used for deduplication. |
| `callerNumber` | string | No | Caller's phone number (E.164 format recommended). |
| `answers` | object | Yes | Map of `questionId` → answer value. |
| `finished` | boolean | Yes | `true` if the caller completed the survey, `false` if abandoned. |
| `language` | string | No | Language code (e.g., `"en"`, `"ar"`). |
| `meta` | object | No | Additional metadata. |
| `meta.source` | string | No | Defaults to `"ivr"` if not provided. |
| `meta.callDuration` | number | No | Call duration in seconds. |

**Response (200):**

```json
{
  "data": {
    "responseId": "cm1resp789xyz",
    "status": "created"
  }
}
```

### GET Audio Prompt (Media Server)

Streams the audio file for a specific question. The `audioUrl` returned in the GET survey response points to this endpoint. No authentication is required — IVR systems can fetch audio directly.

**Request:**

```
GET /api/v1/client/{environmentId}/ivr/{surveyId}/media/{questionId}
```

**Response (200):**

- **Content-Type:** `audio/wav`, `audio/mpeg`, `audio/mp4`, or `audio/ogg` (matches uploaded file)
- **Body:** Raw audio binary stream
- **Cache-Control:** `public, max-age=3600` (1 hour)
- **CORS:** `Access-Control-Allow-Origin: *` (any IVR system can fetch)

**Error responses:**

| Status | When |
|--------|------|
| 404 | Survey, question, or audio file not found |
| 400 | Invalid environment ID |
| 302 | Audio URL is external (redirect to external URL) |

**Usage in IVR flow:**

The `audioUrl` field in each question from the GET survey response is a fully-qualified URL to this endpoint. Your IVR system can use it directly as a media source — for example, in Asterisk/FreeSWITCH `Playback()` commands or MRCP media references.

---

## DTMF Mapping Rules

Each question type maps to a specific DTMF input configuration:

### NPS (Net Promoter Score)

- **Input type:** `numeric`
- **Range:** 0–10
- **Valid DTMF:** `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`
- **Note:** For two-digit input (10), wait for `inputTimeout` after the first digit or use `#` as a terminator

### Rating

- **Input type:** `numeric`
- **Range:** 1–N (where N is the configured range: 3, 4, 5, 6, 7, or 10)
- **Valid DTMF:** Digits from `1` to `N`

### MultipleChoiceSingle

- **Input type:** `dtmf_choice`
- **Options:** Up to 9 choices, mapped to digits `1`–`9`
- **Valid DTMF:** The `key` field in each option
- **Note:** Maximum 9 options (DTMF digits 1–9)

### CTA (Call to Action)

- **Input type:** `dtmf_choice`
- **Options:** Single option `[{ "key": "1", "label": "Continue" }]`
- **Valid DTMF:** `1` to continue

## Audio Prompt Handling

Each question can optionally have an `audioUrl` field pointing to the **IVR media endpoint**. This endpoint acts as a media server — it proxies the audio file from internal storage with proper `Content-Type` headers and CORS, so your IVR system can fetch it directly.

1. **If `audioUrl` is set:** Fetch the URL to get the audio stream and play it as the question prompt
2. **If `audioUrl` is null:** Use TTS (Text-to-Speech) on the `questionText` field

The `audioUrl` is a fully-qualified URL like:
```
https://your-instance.com/api/v1/client/{envId}/ivr/{surveyId}/media/{questionId}
```

For the welcome and thank-you messages, the same pattern applies with `welcomeAudioUrl` / `thankYouAudioUrl` falling back to `welcomeMessage` / `thankYouMessage`.

### Uploading Audio Files

Audio files are uploaded via the standard HiveCFM storage API using presigned URLs. Supported formats: WAV, MP3, M4A, OGG.

1. Upload the audio file via the storage upload endpoint (presigned URL flow)
2. Set the resulting storage URL as the `audioUrl` on the survey element
3. The IVR GET endpoint automatically converts storage URLs to media endpoint URLs that stream the audio with proper headers

## Error Handling

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | — | Success |
| 400 | `bad_request` | Invalid input (missing fields, wrong format, survey mismatch) |
| 404 | `not_found` | Survey not found |
| 429 | `too_many_requests` | Rate limit exceeded |
| 500 | `internal_server_error` | Server error |

### Error Response Format

```json
{
  "code": "bad_request",
  "message": "Fields are missing or incorrectly formatted",
  "details": {
    "fieldName": "Error description"
  }
}
```

## Retry Logic & Idempotency

- The `callId` field acts as a **deduplication key** (`singleUseId` internally). Submitting the same `callId` twice will result in a duplicate error.
- For network failures on the `POST` response endpoint, it is safe to retry with the same `callId` — the system will reject duplicates.
- For the `GET` survey endpoint, responses are cacheable. Use `Cache-Control` headers for short-term caching (10 minutes by default).

## Sample IVR Flow (Pseudocode)

```
function handleInboundCall(callId, callerNumber, environmentId, surveyId):
    // 1. Fetch survey
    surveyData = HTTP_GET("/api/v1/client/{environmentId}/ivr/{surveyId}")
    survey = surveyData.data.survey
    questions = surveyData.data.questions

    // 2. Play welcome message
    if survey.welcomeAudioUrl:
        playAudio(survey.welcomeAudioUrl)
    elif survey.welcomeMessage:
        playTTS(survey.welcomeMessage)

    // 3. Iterate questions
    answers = {}
    for question in questions:
        retries = 0

        while retries < survey.maxRetries:
            // Play question prompt
            if question.audioUrl:
                playAudio(question.audioUrl)
            else:
                playTTS(question.questionText)
                if question.subheader:
                    playTTS(question.subheader)

            // Collect DTMF input
            input = collectDTMF(
                timeout = survey.inputTimeout,
                bargein = survey.bargeinEnabled
            )

            // Validate input
            if validateInput(input, question.inputConfig):
                answers[question.questionId] = parseAnswer(input, question.inputConfig)
                break
            else:
                retries++
                playTTS(survey.errorMessage)

        if retries >= survey.maxRetries and question.required:
            // Handle max retries exceeded for required question
            break

    // 4. Submit response
    finished = (len(answers) == len(questions))
    HTTP_POST("/api/v1/client/{environmentId}/ivr/{surveyId}/responses", {
        callId: callId,
        callerNumber: callerNumber,
        answers: answers,
        finished: finished,
        language: "en",
        meta: { source: "ivr", callDuration: getCallDuration() }
    })

    // 5. Play thank you
    if survey.thankYouAudioUrl:
        playAudio(survey.thankYouAudioUrl)
    elif survey.thankYouMessage:
        playTTS(survey.thankYouMessage)

    hangup()


function validateInput(input, inputConfig):
    if inputConfig.inputType == "numeric":
        num = parseInt(input)
        return num >= inputConfig.min and num <= inputConfig.max

    if inputConfig.inputType == "dtmf_choice":
        validKeys = [opt.key for opt in inputConfig.options]
        return input in validKeys

    return false


function parseAnswer(input, inputConfig):
    if inputConfig.inputType == "numeric":
        return parseInt(input)
    return input  // Return DTMF key as string for choice-based inputs
```
