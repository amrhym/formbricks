# Genesys Cloud Architect Flow Setup for HiveCFM Bot Connector

Step-by-step guide for configuring the Genesys Cloud Architect flow to integrate with the HiveCFM Bot Connector for post-conversation surveys.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Set Up the Bot Connector Integration](#2-set-up-the-bot-connector-integration)
3. [Create the Architect Inbound Message Flow](#3-create-the-architect-inbound-message-flow)
4. [Configure the Call Bot Connector Action](#4-configure-the-call-bot-connector-action)
5. [Handle Bot Intents](#5-handle-bot-intents)
6. [Trigger the Survey Post-Conversation](#6-trigger-the-survey-post-conversation)
7. [Testing & Deployment](#7-testing--deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| Genesys Cloud License | CX 2+ or Digital license |
| BYOT Add-on | "Bring Your Own Technology" must be enabled (contact Genesys Sales) |
| Admin Permissions | `Integrations > Integrations > View` and `Architect > Flow > Edit` |
| HiveCFM API Key | From Organization Settings > API Keys, with write access to the target environment |
| HiveCFM Endpoints | `https://<hivecfm-host>/api/v1/management/bot-connector/turn` (POST) and `.../bots` (GET) |
| Survey ID | The HiveCFM survey ID to execute (starts with `cl...`) |
| Environment ID | The HiveCFM environment ID (starts with `cl...`) |

---

## 2. Set Up the Bot Connector Integration

### 2.1 Install the Integration

1. Go to **Admin > Integrations > Integrations**
2. Search for **"Genesys Bot Connector"** (use v1, not "Digital Bot Connector")
3. Click **Install**

> **Why v1?** HiveCFM uses a synchronous request-response model. The v1 Bot Connector is synchronous (call endpoint, get response). The v2 Digital Bot Connector is asynchronous and more complex than needed.

### 2.2 Configure Properties

1. Open the installed integration
2. **Details** tab: Rename to `HiveCFM Survey Bot Connector`
3. **Configuration** tab > **Properties**:
   - **Bot Connector Handle Utterance URI**: `https://<hivecfm-host>/api/v1/management/bot-connector/turn`
   - **Bot Provider** (optional): `HiveCFM`

### 2.3 Configure Credentials

1. Go to the **Credentials** tab
2. Click **Configure**
3. Click **Add Credential Field**:
   - **Field Name**: `x-api-key`
   - **Value**: Your HiveCFM API key
4. Click **OK**

> The credential field name `x-api-key` is sent as an HTTP header on every request to the bot endpoint. This is how HiveCFM authenticates the requests.

### 2.4 Activate

1. Toggle **Status** from **Inactive** to **Active**
2. Confirm activation

When activated, Genesys calls your bots endpoint (`GET .../bots`) to verify connectivity and fetch the bot list. If this fails, check your URL, API key, and firewall rules.

### 2.5 Firewall / IP Allowlisting

If your HiveCFM server has firewall restrictions, allowlist the Genesys Cloud IP ranges for your region. Find them at: [Genesys Cloud Platform API Endpoints](https://developer.genesys.cloud/platform/api/)

---

## 3. Create the Architect Inbound Message Flow

### 3.1 Create the Flow

1. Go to **Admin > Architect**
2. Click **Flows** > **Inbound Message**
3. Click **+ Add**
4. Configure:
   - **Name**: `HiveCFM Post-Conversation Survey`
   - **Description**: `Post-conversation customer feedback survey via HiveCFM Bot Connector`
   - **Default Language**: Select your primary language (e.g., English - United States)
5. Click **Create Flow**

### 3.2 Flow Structure Overview

The flow is simple — it delegates all survey logic to the HiveCFM bot:

```
[Start]
  │
  ▼
[Call Bot Connector: "HiveCFM Survey Bot"]
  │
  ├── survey_in_progress → [Loop back to Call Bot Connector]
  ├── survey_complete    → [Disconnect]
  ├── survey_opted_out   → [Disconnect]
  ├── survey_error       → [Disconnect]
  └── Failure            → [Disconnect]
```

The bot handles all question presentation, answer parsing, and state management internally.

---

## 4. Configure the Call Bot Connector Action

### 4.1 Add the Action

1. In the Architect flow editor, click the **Starting State**
2. From the toolbox on the left, expand **Bot**
3. Drag **Call Bot Connector** into the task sequence

### 4.2 Configure the Action

| Field | Value |
|---|---|
| **Name** | `Survey Bot` |
| **Bot Integration** | Select `HiveCFM Survey Bot Connector` (your integration from step 2) |
| **Bot Name** | `HiveCFM Survey Bot` (auto-populated from your bots endpoint) |
| **Bot Version** | `1.0` |
| **Bot Input Text** | `Message.Message.Body` (default — this is the customer's message) |
| **Follow-up Response Timeout** | `300` seconds (5 minutes per question) |

### 4.3 Configure Session Variables (inputParameters)

Scroll to the **Session Variables** section. These are sent to the bot as `inputParameters` on the **first turn only**.

Add these name-value pairs:

| Variable Name | Value | Required |
|---|---|---|
| `surveyId` | `"clxxxxxxxxxxxxxxxxxxxxxxxxx"` (your HiveCFM survey ID) | Yes |
| `environmentId` | `"clxxxxxxxxxxxxxxxxxxxxxxxxx"` (your HiveCFM environment ID) | Yes |
| `conversationId` | `Flow.ConversationId` | Recommended |

**How to set values:**
- For `surveyId` and `environmentId`: Click the value field, switch to **Literal** mode, and type the ID string
- For `conversationId`: Click the value field, switch to **Expression** mode, and type `Flow.ConversationId`

> **Important**: These are only sent on the first turn. The bot persists all needed data in `botState` for subsequent turns, so Genesys doesn't need to send them again.

### 4.4 About Follow-up Response Timeout

- The timeout **resets after each bot reply** — each question gets the full 5 minutes
- If a customer doesn't respond within the timeout, the flow takes the **Failure** path with error type `NoInputError`
- Recommended: 300 seconds for surveys (enough time to read and answer, short enough to avoid stale sessions)

---

## 5. Handle Bot Intents

The Call Bot Connector action creates one output path for each intent registered by the bot. Here's how to wire them:

### 5.1 Intent: `survey_in_progress`

**Meaning**: The bot sent the next question. More questions remain.

**Action**: Loop back to the Call Bot Connector action.

How to set up the loop:
1. Click the `survey_in_progress` intent path
2. Add a **Jump to** action that points back to the `Survey Bot` (Call Bot Connector) action
3. This creates a loop — Genesys keeps relaying messages between the customer and bot until a terminal intent is returned

> **Safety mechanism**: If 4 consecutive messages produce the same intent with no change, Genesys automatically breaks the loop and takes the Failure path with `NoMatchError`.

### 5.2 Intent: `survey_complete`

**Meaning**: All questions answered. The bot already sent a "thank you" message.

**Action**:
1. (Optional) Add a **Set Participant Data** action to tag the interaction:
   - Key: `Survey.Status`, Value: `Completed`
2. Add a **Disconnect** action

### 5.3 Intent: `survey_opted_out`

**Meaning**: Customer typed an opt-out keyword (stop, quit, cancel, unsubscribe, etc.)

**Action**:
1. (Optional) Add a **Set Participant Data** action:
   - Key: `Survey.Status`, Value: `OptedOut`
2. Add a **Disconnect** action

### 5.4 Intent: `survey_error`

**Meaning**: Something went wrong (bad config, survey not found, server error).

**Action**:
1. (Optional) Log the error via participant data
2. Add a **Disconnect** action

### 5.5 Failure Path

**Triggered by**: Timeout (`NoInputError`), infinite loop (`NoMatchError`), server error (`InternalServerError`), or feature issues (`FeatureNotEnabledError`).

**Failure outputs available**:
- `errorType` (string): The error category
- `errorMessage` (string): Description text

**Action**:
1. (Optional) Add a **Send Response** action: "Sorry, the survey session has ended. Thank you!"
2. Add a **Disconnect** action

### 5.6 Complete Flow Diagram

```
[Starting State]
  │
  ▼
[Call Bot Connector: "Survey Bot"]
  │
  ├── survey_in_progress ──→ [Jump to: "Survey Bot"] (loop)
  │
  ├── survey_complete ─────→ [Set Participant Data: Survey.Status = Completed]
  │                              │
  │                              ▼
  │                          [Disconnect]
  │
  ├── survey_opted_out ────→ [Set Participant Data: Survey.Status = OptedOut]
  │                              │
  │                              ▼
  │                          [Disconnect]
  │
  ├── survey_error ────────→ [Disconnect]
  │
  └── Failure ─────────────→ [Send Response: "Sorry, session ended."]
                                 │
                                 ▼
                             [Disconnect]
```

---

## 6. Trigger the Survey Post-Conversation

After an agent finishes handling a customer interaction, the survey should start automatically. Here are two approaches:

### Approach A: Set Post-Flow (Recommended)

This is the native Genesys mechanism.

In your **primary inbound message flow** (the one that handles the agent conversation):

1. Before the **Transfer to ACD** action, add a **Set Post-Flow** action
2. Configure it:
   - **Target**: `Agent ('agent')` — triggers when the agent disconnects
   - **Flow**: Select your `HiveCFM Post-Conversation Survey` flow
   - **Invocation Data** (optional): Pass context as JSON

```
Primary Inbound Message Flow:
  [Start]
    │
    ▼
  [Set Post-Flow]
    Target: Agent ('agent')
    Flow: "HiveCFM Post-Conversation Survey"
    │
    ▼
  [Transfer to ACD]
    Queue: "Support"
    │
    ... agent handles the conversation ...
    │
  Agent disconnects / wraps up
    │
    ▼
  [Post-flow triggers automatically]
    "HiveCFM Post-Conversation Survey" starts
    │
    ▼
  [Call Bot Connector] → survey begins
```

**Notes**:
- Post-flow invocation data expires after **10 days** if not triggered
- Use **Clear Post-Flow** action if you need to cancel the post-flow in certain branches
- For message flows, the only supported target is `Agent ('agent')`

### Approach B: Dummy Queue (Workaround)

If Set Post-Flow doesn't work as expected for your messaging setup:

1. Create a queue called `Survey Queue` (no agents assigned)
2. Set the **Inbound Message Flow** for that queue to your `HiveCFM Post-Conversation Survey` flow
3. Instead of the agent disconnecting normally, have them **Transfer to "Survey Queue"**
4. The survey flow starts immediately in the context of the transfer

This is a community-tested workaround when Set Post-Flow has limitations in certain messaging configurations.

---

## 7. Testing & Deployment

### 7.1 Test in Architect

1. Click **Validate** in the flow editor to check for errors
2. Use the **Debug** mode to simulate a conversation
3. Verify all intent paths are connected

### 7.2 Publish the Flow

1. Click **Publish** in the Architect editor
2. The flow is now available for routing

### 7.3 Configure Message Routing

1. Go to **Admin > Routing > Message Routing**
2. Assign your survey flow to the appropriate queue or trigger

### 7.4 End-to-End Test

1. Start a web messaging conversation
2. Get connected to an agent
3. Have the agent disconnect/wrap up
4. Verify the survey starts automatically
5. Answer questions and confirm responses appear in HiveCFM

### 7.5 Verify in HiveCFM

1. Go to HiveCFM > Responses
2. Check that a new response was created with `source: genesys_bot_connector`
3. Verify all answers are recorded correctly

---

## 8. Troubleshooting

### Integration Won't Activate

- **Check the bots endpoint**: Genesys calls `GET /api/v1/management/bot-connector/bots` when activating. Ensure it returns a valid response.
- **Check the API key**: The credential field must be named exactly `x-api-key` with a valid HiveCFM API key.
- **Check firewall**: Allowlist Genesys Cloud IP ranges.

### Bot Returns "Survey not found"

- Verify the `surveyId` session variable matches an existing survey in HiveCFM
- Verify the survey belongs to the correct `environmentId`

### Bot Returns "Unauthorized"

- The API key doesn't have write permission for the specified `environmentId`
- Generate a new API key with correct permissions in Organization Settings

### Customer Messages Not Reaching Bot

- Ensure **Bot Input Text** is set to `Message.Message.Body`
- Check that the flow is published and assigned to the correct routing

### Survey Loops Forever

- Genesys has a built-in safety: after 4 consecutive messages with the same intent, it breaks with `NoMatchError`
- If surveys genuinely have many questions, this is handled correctly — the intent remains `survey_in_progress` but the `botState` changes each turn

### Timeout Before Customer Responds

- Increase **Follow-up Response Timeout** (default 12 hours, recommended 300 seconds for surveys)
- The timeout resets per question, not per session

### Failure Path: InternalServerError

- The bot returned an invalid response format
- Check HiveCFM server logs for errors
- Ensure the response JSON matches the expected schema (botState, replyMessages, intent)

### Failure Path: FeatureNotEnabledError

- The BYOT add-on may not be active
- Contact Genesys support to verify your license includes Bot Connector

---

## Quick Reference: Session Variables

| Variable | Value | Where It Goes |
|---|---|---|
| `surveyId` | `"cl..."` | `inputParameters.surveyId` in first turn |
| `environmentId` | `"cl..."` | `inputParameters.environmentId` in first turn |
| `conversationId` | `Flow.ConversationId` | `inputParameters.conversationId` in first turn |

## Quick Reference: Bot Intents

| Intent | Meaning | Architect Action |
|---|---|---|
| `survey_in_progress` | More questions to ask | Loop back |
| `survey_complete` | All done, thank you sent | Disconnect |
| `survey_opted_out` | Customer said stop/quit | Disconnect |
| `survey_error` | Configuration or server error | Disconnect |
