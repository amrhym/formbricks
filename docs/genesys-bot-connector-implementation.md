# Genesys Bot Connector - Implementation Guide

Complete implementation details for the HiveCFM Genesys Bot Connector endpoint, built directly into hivecfm-core as a Next.js API route.

---

## Architecture Overview

The Bot Connector is a **synchronous request-response** API. Genesys Cloud calls our endpoint on every conversation turn (customer message), and we return the next survey question or a completion signal.

```
Customer types in chat widget
        |
        v
Genesys Cloud receives message
        |
        v
Genesys calls POST /api/v1/management/bot-connector/turn
  Headers: { "x-api-key": "<hivecfm-api-key>" }
  Body: { botSessionId, utterance, botState, inputParameters, languageCode }
        |
        v
HiveCFM processes the turn:
  - First turn (empty botState): fetch survey, create response, return first question
  - Subsequent turns: parse answer, save progress, return next question
  - Last answer: mark response finished, return thank you + survey_complete intent
        |
        v
Genesys receives response:
  { botState, replyMessages (with quick replies), intent }
        |
        v
Architect flow routes based on intent:
  - survey_in_progress -> continue loop
  - survey_complete -> disconnect
  - survey_opted_out -> disconnect
  - survey_error -> disconnect gracefully
```

---

## Files Created

### 1. `apps/web/app/api/v1/management/bot-connector/lib/types.ts`

**Purpose:** TypeScript types for the Genesys Bot Connector API contract.

**Contents:**
- `ZBotConnectorRequest` - Zod schema validating the incoming request from Genesys:
  - `botSessionId` (string) - unique session ID
  - `utterance` (string) - customer's message text (empty on first turn)
  - `botState` (string) - serialized state from previous turn (empty on first turn)
  - `inputParameters` (Record<string, string>) - variables from Architect flow
  - `languageCode` (string) - e.g. "en-US"
- `TBotConnectorResponse` - response shape returned to Genesys:
  - `botState` (string) - serialized state for next turn
  - `replyMessages` (array) - messages with Text and QuickReply content
  - `intent` (object) - { name, confidence, slots } for Architect routing
- `TBotSessionState` - internal state serialized into botState between turns:
  - `responseId` - HiveCFM response record ID
  - `surveyId` - survey being executed
  - `environmentId` - HiveCFM environment
  - `currentQuestionIndex` - 0-based progress tracker
  - `questionIds` - ordered list of question IDs to ask
  - `answers` - collected answers keyed by question ID
  - `genesysConversationId` - for tracking/enrichment
- `BOT_INTENTS` - constant intent names:
  - `survey_in_progress` - more questions remain
  - `survey_complete` - all questions answered
  - `survey_opted_out` - customer opted out
  - `survey_error` - error occurred

---

### 2. `apps/web/app/api/v1/management/bot-connector/lib/question-formatter.ts`

**Purpose:** Converts HiveCFM survey questions into Genesys Bot Connector reply messages with quick reply buttons.

**Key Functions:**

#### `formatQuestionAsReply(question, language)`
Transforms a survey question into a `TBotReplyMessage` with appropriate quick reply buttons:

| Question Type | Button Behavior |
|---|---|
| **Rating** | Buttons for each number (1 to range, default 5) |
| **NPS** | Buttons 0-10 |
| **MultipleChoiceSingle** | Button per choice (label as text, choice ID as payload) |
| **MultipleChoiceMulti** | Button per choice |
| **CTA** | "Continue" button + optional dismiss button |
| **Consent** | "Yes" / "No" buttons |
| **OpenText** | No buttons - free text input |
| **Date** | No buttons - free text input |
| **Ranking** | Text instructions to rank by comma-separated order |
| **Address / ContactInfo** | No buttons - free text input |

Unsupported in chat (skipped): `FileUpload`, `PictureSelection`, `Cal`, `Matrix`

#### `parseAnswer(question, utterance, language)`
Normalizes customer input back to HiveCFM response data format:

| Question Type | Parsing Logic |
|---|---|
| **Rating / NPS** | Parses integer from text |
| **MultipleChoiceSingle** | Matches by choice ID (payload), label text, or 1-based index |
| **MultipleChoiceMulti** | Comma-separated, each matched by ID or label |
| **CTA** | "clicked" or "dismissed" |
| **Consent** | "accepted" or "dismissed" |
| **Ranking** | Comma-separated list |
| **OpenText / Date** | Raw text passthrough |

#### `isSupportedInChat(questionType)`
Returns false for question types that cannot work in a text chat: FileUpload, PictureSelection, Cal, Matrix.

---

### 3. `apps/web/app/api/v1/management/bot-connector/turn/route.ts`

**Purpose:** Main API route handler - `POST /api/v1/management/bot-connector/turn`

**Authentication:** Uses the standard `withV1ApiWrapper` which automatically:
- Extracts `x-api-key` header
- Validates API key against database
- Checks environment permissions
- Applies rate limiting
- Sets up audit logging

**Flow:**

#### First Turn (empty botState)

1. Extract `surveyId` and `environmentId` from `inputParameters`
2. Validate API key has `POST` permission for the environment
3. Fetch survey from database via `getSurvey(surveyId)`
4. Filter questions to chat-compatible types
5. Create a HiveCFM response record (`finished: false`, `data: {}`, `meta: { source: "genesys_bot_connector" }`)
6. Send `responseCreated` pipeline event
7. Build `TBotSessionState` with response ID, question IDs, empty answers
8. Format first question as reply message with quick reply buttons
9. Return response with `intent: survey_in_progress`

#### Subsequent Turns

1. Deserialize `TBotSessionState` from `botState`
2. Validate permissions
3. Check for opt-out keywords ("stop", "quit", "cancel", "unsubscribe", "opt out", "optout", "no thanks")
   - If opt-out: return `intent: survey_opted_out`
4. Fetch survey from database (needed for question metadata)
5. Parse the customer's answer using `parseAnswer()`
6. Store answer in session state
7. Advance `currentQuestionIndex`
8. If more questions remain:
   - Save partial progress via `updateResponseWithQuotaEvaluation(responseId, { data, finished: false })`
   - Format next question and return with `intent: survey_in_progress`
9. If all questions answered:
   - Call `completeSurvey()` (see below)

#### Survey Completion

1. Update response: `updateResponseWithQuotaEvaluation(responseId, { data: allAnswers, finished: true })`
2. Send `responseUpdated` and `responseFinished` pipeline events
3. Extract thank you message from survey endings (falls back to default message)
4. Return with `intent: survey_complete`

---

### 4. `apps/web/app/api/v1/management/bot-connector/bots/route.ts`

**Purpose:** `GET /api/v1/management/bot-connector/bots` - Returns the list of available bots.

Genesys may call this to populate the Bot Name dropdown in the integration configuration. Returns a single bot:

```json
{
  "bots": [
    {
      "id": "hivecfm-survey-bot",
      "name": "HiveCFM Survey Bot",
      "description": "Post-conversation customer feedback survey",
      "versions": [
        {
          "version": "1.0",
          "intents": [
            { "name": "survey_in_progress", "description": "Survey is in progress" },
            { "name": "survey_complete", "description": "Survey completed successfully" },
            { "name": "survey_opted_out", "description": "Customer opted out of survey" },
            { "name": "survey_error", "description": "Error occurred during survey" }
          ]
        }
      ]
    }
  ]
}
```

---

## Genesys Cloud Configuration Values

### Step 1: Install the Integration

1. **Admin** > **Integrations** > **Integrations**
2. Search for **"Genesys Bot Connector"**
3. Click **Install**

### Step 2: Configure Properties

| Property | Value |
|---|---|
| **Bot Connector URI** | `https://hivecfm.xcai.io/api/v1/management/bot-connector/turn` |
| **Bot Provider** | `HiveCFM` |
| **Enable Attachments** | Off |

### Step 3: Configure Credentials

1. Click **Credentials** tab > **Configure**
2. Click **Add Credential Field**
3. **Field Name**: `x-api-key`
4. **Value**: Your HiveCFM API key (get from Organization Settings > API Keys)
5. Click **OK**

> **Important:** The API key must have **write** permission for the environment containing the survey.

### Step 4: Activate

1. Toggle **Status** from **Inactive** > **Active**
2. Confirm with **Yes**

---

## Architect Flow Configuration

### "Call Bot Connector" Action Settings

| Field | Value |
|---|---|
| **Bot Integration** | Your installed HiveCFM Bot Connector integration |
| **Bot Name** | HiveCFM Survey Bot |
| **Bot Version** | 1.0 |
| **Bot Input Text** | `Message.Message.Body` |
| **Follow-up Response Timeout** | `300` seconds (5 min) recommended |

### Session Variables (inputParameters)

These **must** be passed from the Architect flow. Configure them in the "Call Bot Connector" action:

| Variable Name | Value | Required |
|---|---|---|
| `surveyId` | The HiveCFM survey ID to execute | **Yes** |
| `environmentId` | The HiveCFM environment ID | **Yes** |
| `conversationId` | `Flow.ConversationId` (Genesys conversation ID) | Recommended |
| `agentId` | `Flow.AgentId` or participant data | Optional |
| `queueName` | `Flow.QueueName` or queue data | Optional |
| `customerId` | Customer identifier if available | Optional |

### Intent Paths

Configure these intent paths in the "Call Bot Connector" action:

| Intent | When It Fires | Architect Action |
|---|---|---|
| `survey_in_progress` | Survey has more questions | Loop back (continue conversation) |
| `survey_complete` | All questions answered | Disconnect + optional thank you |
| `survey_opted_out` | Customer said "stop"/"quit"/etc. | Disconnect |
| `survey_error` | Error (bad config, survey not found) | Disconnect gracefully |
| **Failure** | Timeout / network error | Disconnect |

### Example Architect Flow

```
Inbound Message Flow
  > Agent handles conversation
  > Agent wraps up / disconnects
  > "Call Bot Connector" action
      Bot Integration: HiveCFM Bot Connector
      Bot Input Text: Message.Message.Body
      Session Variables:
        - surveyId = "clxxxxxxxxxxxxxxxxxxxxxxxxx"
        - environmentId = "clxxxxxxxxxxxxxxxxxxxxxxxxx"
        - conversationId = Flow.ConversationId
      Follow-up Response Timeout: 300 seconds

      Intent Paths:
        > survey_in_progress -> Loop (continue)
        > survey_complete -> Disconnect
        > survey_opted_out -> Disconnect
        > survey_error -> Disconnect

      Failure Path:
        > Disconnect
```

---

## API Contract Details

### Request (from Genesys to HiveCFM)

```
POST https://hivecfm.xcai.io/api/v1/management/bot-connector/turn
Headers:
  x-api-key: <your-hivecfm-api-key>
  Content-Type: application/json
```

**First Turn Body:**
```json
{
  "botSessionId": "uuid-from-genesys",
  "utterance": "",
  "botState": "",
  "inputParameters": {
    "surveyId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "environmentId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "conversationId": "genesys-conv-id",
    "agentId": "agent-123",
    "queueName": "Support"
  },
  "languageCode": "en-US"
}
```

**Subsequent Turn Body:**
```json
{
  "botSessionId": "uuid-from-genesys",
  "utterance": "5",
  "botState": "{\"responseId\":\"...\",\"surveyId\":\"...\",\"environmentId\":\"...\",\"currentQuestionIndex\":0,\"questionIds\":[\"q1\",\"q2\"],\"answers\":{}}",
  "inputParameters": {},
  "languageCode": "en-US"
}
```

### Response (from HiveCFM to Genesys)

**Question with Quick Replies:**
```json
{
  "botState": "{...serialized session state...}",
  "replyMessages": [
    {
      "type": "Structured",
      "content": [
        {
          "contentType": "Text",
          "text": "How would you rate your experience?"
        },
        {
          "contentType": "QuickReply",
          "quickReply": { "text": "1", "payload": "1", "action": "Message" }
        },
        {
          "contentType": "QuickReply",
          "quickReply": { "text": "2", "payload": "2", "action": "Message" }
        },
        {
          "contentType": "QuickReply",
          "quickReply": { "text": "3", "payload": "3", "action": "Message" }
        },
        {
          "contentType": "QuickReply",
          "quickReply": { "text": "4", "payload": "4", "action": "Message" }
        },
        {
          "contentType": "QuickReply",
          "quickReply": { "text": "5", "payload": "5", "action": "Message" }
        }
      ]
    }
  ],
  "intent": {
    "name": "survey_in_progress",
    "confidence": 1.0,
    "slots": {}
  }
}
```

**Survey Completion:**
```json
{
  "botState": "{...final state...}",
  "replyMessages": [
    {
      "type": "Structured",
      "content": [
        {
          "contentType": "Text",
          "text": "Thank you for your feedback! Your responses have been recorded."
        }
      ]
    }
  ],
  "intent": {
    "name": "survey_complete",
    "confidence": 1.0,
    "slots": {}
  }
}
```

**Opt-Out:**
```json
{
  "botState": "{...state...}",
  "replyMessages": [
    {
      "type": "Structured",
      "content": [
        {
          "contentType": "Text",
          "text": "No problem! You've been opted out. You won't receive further survey messages."
        }
      ]
    }
  ],
  "intent": {
    "name": "survey_opted_out",
    "confidence": 1.0,
    "slots": {}
  }
}
```

---

## End-to-End Flow

```
1. Customer chats with agent via Genesys Web Messaging
                |
2. Agent resolves issue and wraps up / disconnects
                |
3. Architect flow detects agent disconnect
                |
4. "Call Bot Connector" action fires
   Passes: surveyId, environmentId, conversationId
                |
5. Genesys calls: POST /api/v1/management/bot-connector/turn
   Body: { botSessionId, utterance: "", botState: "", inputParameters: {...} }
                |
6. HiveCFM:
   - Fetches survey from database
   - Creates response record (finished: false)
   - Returns first question + quick reply buttons
                |
7. Customer sees question in chat widget
   Taps a quick reply button (e.g., "5")
                |
8. Genesys calls the endpoint again with the answer
   Body: { utterance: "5", botState: "{...prev state...}" }
                |
9. HiveCFM:
   - Parses answer, saves partial progress
   - Advances to next question
   - Returns next question (or completion)
                |
10. Repeat steps 7-9 for each question
                |
11. Last answer received:
    - HiveCFM marks response as finished
    - Sends responseFinished pipeline event
    - Returns intent: "survey_complete"
                |
12. Architect receives "survey_complete" intent
    Takes the survey_complete path -> Disconnect
                |
13. Survey response appears in HiveCFM dashboard
```

---

## Opt-Out Keywords

The following keywords trigger an immediate opt-out (case-insensitive):

- `stop`
- `quit`
- `cancel`
- `unsubscribe`
- `opt out`
- `optout`
- `no thanks`

When detected, the bot returns `intent: survey_opted_out` and Architect should disconnect the conversation.

---

## Error Handling

| Error | HTTP Status | Intent | Cause |
|---|---|---|---|
| Missing surveyId | 400 | `survey_error` | `surveyId` not in inputParameters |
| Missing environmentId | 400 | `survey_error` | `environmentId` not in inputParameters |
| Survey not found | 404 | `survey_error` | Invalid survey ID |
| Unauthorized | 401 | N/A | Invalid or missing API key |
| No chat questions | 400 | `survey_error` | Survey has only unsupported question types |
| Invalid botState | 400 | `survey_error` | Corrupted session state |
| Internal error | 500 | `survey_error` | Unexpected server error |

---

## Data Flow in HiveCFM

1. **Response created** on first turn with `finished: false` and `meta.source: "genesys_bot_connector"`
2. **Response updated** after each answer with partial `data` (question ID -> answer value)
3. **Response finalized** on last answer with `finished: true` and all answers in `data`
4. Pipeline events fired: `responseCreated`, `responseUpdated`, `responseFinished`
5. Response appears in HiveCFM dashboard under the survey's responses tab
6. All standard features work: quotas, follow-ups, webhooks, integrations

---

## Prerequisites Checklist

| # | Requirement | Owner | Status |
|---|---|---|---|
| 1 | Genesys Cloud CX 2+ or Digital license | Genesys Account | |
| 2 | BYOT add-on enabled | Genesys Sales | |
| 3 | HTTPS endpoint with valid SSL (hivecfm.xcai.io) | DevOps | |
| 4 | HiveCFM API key created with write permission | HiveCFM Admin | |
| 5 | Survey created and published in HiveCFM | HiveCFM Admin | |
| 6 | Bot Connector integration installed in Genesys | Genesys Admin | |
| 7 | Credentials configured (x-api-key) | Genesys Admin | |
| 8 | Architect message flow created | Genesys Admin | |
| 9 | Session variables mapped (surveyId, environmentId) | Genesys Admin | |
| 10 | Intent paths configured | Genesys Admin | |
| 11 | Chat channel deployed (Web Messaging) | Genesys Admin | |
| 12 | End-to-end test completed | QA | |
