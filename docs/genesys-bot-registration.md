# Genesys Bot Connector - Bot Registration

## How to Register the Bot

Bots must be registered via the Genesys Platform API. Use the **Developer Tools API Explorer** in Genesys Cloud.

### Steps

1. Go to **Admin > Developer Tools > API Explorer**
2. Search for: `PUT /api/v2/integrations/botconnector/{integrationId}/bots`
3. Copy your **integration ID** from the browser URL when viewing your "hivecfm" integration
4. Paste one of the JSON bodies below
5. Click **Send** — expect a **204 No Content** response (success)
6. Go to Architect — **"HiveCFM Survey Bot"** should now appear in the Bot Name dropdown

---

## Option 1: Without Slots (Try First)

```json
{
  "chatBots": [
    {
      "id": "hivecfm-survey-bot",
      "name": "HiveCFM Survey Bot",
      "versions": [
        {
          "version": "1.0",
          "supportedLanguages": ["en-us"],
          "intents": [
            { "name": "survey_in_progress" },
            { "name": "survey_complete" },
            { "name": "survey_opted_out" },
            { "name": "survey_error" }
          ]
        }
      ]
    }
  ]
}
```

---

## Option 2: With Slots (If Option 1 Fails)

```json
{
  "chatBots": [
    {
      "id": "hivecfm-survey-bot",
      "name": "HiveCFM Survey Bot",
      "versions": [
        {
          "version": "1.0",
          "supportedLanguages": ["en-us"],
          "intents": [
            {
              "name": "survey_in_progress",
              "slots": {
                "status": { "name": "status", "type": "string" }
              }
            },
            {
              "name": "survey_complete",
              "slots": {
                "status": { "name": "status", "type": "string" }
              }
            },
            {
              "name": "survey_opted_out",
              "slots": {
                "status": { "name": "status", "type": "string" }
              }
            },
            {
              "name": "survey_error",
              "slots": {
                "status": { "name": "status", "type": "string" }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Intent Reference

| Intent | When Returned | Architect Action |
|---|---|---|
| `survey_in_progress` | More questions remain | Loop back to Call Bot Connector |
| `survey_complete` | All questions answered | Disconnect |
| `survey_opted_out` | Customer said stop/quit | Disconnect |
| `survey_error` | Config or server error | Disconnect |
