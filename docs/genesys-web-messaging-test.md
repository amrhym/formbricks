# Testing the Bot Connector via Genesys Web Messaging

## Step 1: Create a Web Messaging Deployment

1. Go to **Admin > Message > Messenger Deployments**
2. Click **+ Create Deployment**
3. Configure:
   - **Name**: `HiveCFM Survey Test`
   - **Select your Messenger Configuration** (or create one with defaults)
   - **Architect Flow**: Select your **"HiveCFM Post-Conversation Survey"** inbound message flow
4. Click **Save**
5. Copy the **Deployment Key** — you'll need it for the test page
   dad0a7bc-4120-4266-9652-43e9303392f1

---

## Step 2: Create a Test HTML Page

Create this HTML file locally and open it in a browser:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Genesys Messenger Test</title>
  </head>
  <body>
    <h1>Bot Connector Test Page</h1>
    <p>The Genesys Messenger widget should appear in the bottom-right corner.</p>

    <script type="text/javascript">
      (function (g, e, n, es, ys) {
        g["_genesysJs"] = e;
        g[e] =
          g[e] ||
          function () {
            (g[e].q = g[e].q || []).push(arguments);
          };
        g[e].t = 1 * new Date();
        g[e].c = es;
        ys = document.createElement("script");
        ys.async = 1;
        ys.src = n;
        ys.charset = "utf-8";
        document.head.appendChild(ys);
      })(window, "Genesys", "https://apps.mypurecloud.ie/genesys-bootstrap/genesys.min.js", {
        environment: "prod-euw1",
        deploymentId: "YOUR_DEPLOYMENT_ID",
      });
    </script>
  </body>
</html>
```

Replace:

- `YOUR_DEPLOYMENT_ID` — the deployment key from step 1
- `apps.mypurecloud.ie` — your region's domain (Ireland = `mypurecloud.ie`)
- `prod-euw1` — your Genesys Cloud environment identifier

---

## Step 3: Test the Flow

1. Open the HTML file in your browser
2. Click the **Messenger widget** (chat bubble in the bottom-right corner)
3. Send any message — the bot should respond with the first survey question
4. Answer the questions using the quick reply buttons or by typing
5. Verify the survey completes with a "Thank you" message and intent `survey_complete`

---

## Step 4: Verify in HiveCFM

1. Go to HiveCFM > select your environment > Responses
2. Check that a new response was created with `source: genesys_bot_connector`
3. Verify all answers are recorded correctly

---

## Alternative: Test via Queue Routing (No Web Page Needed)

If you already have messaging queues set up:

1. Go to **Admin > Routing > Message Routing**
2. Find or create an inbound message route
3. Set the **Flow** to your "HiveCFM Post-Conversation Survey" flow
4. Trigger a message to that queue (via an existing web messaging widget, SMS, etc.)
5. The message routes directly to your bot flow without needing an agent

---

## Troubleshooting

| Issue                                      | Fix                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Widget doesn't appear                      | Check deployment ID and region domain in the script                                      |
| Widget appears but no bot response         | Verify the Architect flow is published and assigned to the deployment                    |
| Bot returns "Survey not found"             | Check that `surveyId` in the Architect session variables is correct                      |
| Bot returns "Unauthorized"                 | Check that the API key in the integration credentials has write access                   |
| Bot returns "No chat-compatible questions" | Ensure the survey has Rating, NPS, Multiple Choice, Open Text, or similar question types |
