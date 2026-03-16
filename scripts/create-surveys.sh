#!/usr/bin/env bash
# =============================================================================
# Al Rajhi Bank - Create Bilingual CX Surveys & Register Webhook
# =============================================================================
# Creates 3 bilingual (AR/EN) surveys via the HiveCFM (Formbricks) Management API:
#   A) NPS (Net Promoter Score)
#   B) CSAT (Customer Satisfaction)
#   C) CES (Customer Effort Score)
# Then registers an n8n webhook for closed-loop feedback routing.
#
# Prerequisites:
#   1. HiveCFM running at HIVECFM_URL
#   2. API key created in HiveCFM Settings → API Keys
#   3. n8n reachable at N8N_WEBHOOK_URL
#
# Usage:
#   export HIVECFM_API_KEY="your-api-key"
#   ./scripts/create-surveys.sh
# =============================================================================

set -euo pipefail

# Configuration
HIVECFM_URL="${HIVECFM_URL:-http://localhost:3000}"
API_BASE="${HIVECFM_URL}/api/v1/management"
API_KEY="${HIVECFM_API_KEY:?Set HIVECFM_API_KEY environment variable}"
N8N_WEBHOOK_URL="${N8N_WEBHOOK_URL:-https://n8n.hivecfm.xcai.io/webhook/survey-response}"

# Helper: authenticated API call
api() {
  local method="$1" endpoint="$2"
  shift 2
  curl -sS -X "$method" \
    "${API_BASE}${endpoint}" \
    -H "x-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "$@"
}

# Helper: generate CUID2-compatible ID (starts with letter, 24 lowercase alphanum chars)
cuid2() {
  local letters="abcdefghijklmnopqrstuvwxyz"
  local alphanum="abcdefghijklmnopqrstuvwxyz0123456789"
  local id="${letters:$((RANDOM % 26)):1}"
  for i in $(seq 1 23); do
    id="${id}${alphanum:$((RANDOM % 36)):1}"
  done
  echo "$id"
}

echo "=== Al Rajhi Bank CX Survey Setup ==="
echo "HiveCFM URL: ${HIVECFM_URL}"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Discover environment ID
# ---------------------------------------------------------------------------
echo "Step 1: Fetching environment info..."

ENV_ID="${HIVECFM_ENV_ID:-}"

if [ -z "$ENV_ID" ]; then
  ME_RESPONSE=$(api GET /me 2>/dev/null || echo '{}')
  ENV_ID=$(echo "$ME_RESPONSE" | jq -r '.data.environmentId // .environmentId // empty')
fi

if [ -z "$ENV_ID" ]; then
  echo "  /me not available, discovering from existing surveys..."
  SURVEY_RESPONSE=$(api GET "/surveys?limit=1")
  ENV_ID=$(echo "$SURVEY_RESPONSE" | jq -r '.data[0].environmentId // empty')
fi

if [ -z "$ENV_ID" ]; then
  echo "ERROR: Could not determine environmentId."
  echo "Set HIVECFM_ENV_ID environment variable and retry."
  exit 1
fi
echo "  Environment ID: ${ENV_ID}"
echo ""

# ---------------------------------------------------------------------------
# Step 2: Create Survey A - NPS (Net Promoter Score)
# ---------------------------------------------------------------------------
echo "Step 2: Creating NPS Survey..."

NPS_PAYLOAD=$(jq -n \
  --arg eid "$ENV_ID" \
  --arg end_id "$(cuid2)" \
  --arg l1_id "$(cuid2)" --arg c1_id "$(cuid2)" --arg s1_id "$(cuid2)" --arg a1_id "$(cuid2)" \
  --arg l2_id "$(cuid2)" --arg c2_id "$(cuid2)" --arg s2a_id "$(cuid2)" --arg s2b_id "$(cuid2)" --arg a2_id "$(cuid2)" \
  --arg l3_id "$(cuid2)" --arg c3_id "$(cuid2)" --arg s3_id "$(cuid2)" --arg a3_id "$(cuid2)" \
  --arg l4_id "$(cuid2)" --arg c4_id "$(cuid2)" --arg s4_id "$(cuid2)" --arg a4_id "$(cuid2)" \
  --arg l5_id "$(cuid2)" --arg c5_id "$(cuid2)" --arg s5_id "$(cuid2)" --arg a5_id "$(cuid2)" \
'{
  "name": "Al Rajhi Bank - NPS Survey | استبيان مؤشر صافي الترويج - بنك الراجحي",
  "type": "link",
  "status": "inProgress",
  "environmentId": $eid,
  "welcomeCard": {
    "enabled": true,
    "headline": { "default": "We value your feedback", "ar": "نقدر ملاحظاتك" },
    "buttonLabel": { "default": "Start Survey", "ar": "ابدأ الاستبيان" },
    "timeToFinish": true,
    "showResponseCount": false
  },
  "questions": [
    {
      "id": "nps-score",
      "type": "nps",
      "headline": { "default": "How likely are you to recommend Al Rajhi Bank to a friend or colleague?", "ar": "ما مدى احتمالية أن توصي ببنك الراجحي لصديق أو زميل؟" },
      "required": true,
      "lowerLabel": { "default": "Not likely at all", "ar": "غير محتمل على الإطلاق" },
      "upperLabel": { "default": "Extremely likely", "ar": "محتمل جداً" },
      "isColorCodingEnabled": true,
      "logic": [
        {
          "id": $l1_id,
          "conditions": {
            "id": $c1_id,
            "connector": "and",
            "conditions": [
              {
                "id": $s1_id,
                "leftOperand": { "type": "question", "value": "nps-score" },
                "operator": "isLessThanOrEqual",
                "rightOperand": { "type": "static", "value": 6 }
              }
            ]
          },
          "actions": [
            { "id": $a1_id, "objective": "jumpToQuestion", "target": "nps-detractor-reason" }
          ]
        },
        {
          "id": $l2_id,
          "conditions": {
            "id": $c2_id,
            "connector": "and",
            "conditions": [
              {
                "id": $s2a_id,
                "leftOperand": { "type": "question", "value": "nps-score" },
                "operator": "isGreaterThanOrEqual",
                "rightOperand": { "type": "static", "value": 7 }
              },
              {
                "id": $s2b_id,
                "leftOperand": { "type": "question", "value": "nps-score" },
                "operator": "isLessThanOrEqual",
                "rightOperand": { "type": "static", "value": 8 }
              }
            ]
          },
          "actions": [
            { "id": $a2_id, "objective": "jumpToQuestion", "target": "nps-passive-reason" }
          ]
        },
        {
          "id": $l3_id,
          "conditions": {
            "id": $c3_id,
            "connector": "and",
            "conditions": [
              {
                "id": $s3_id,
                "leftOperand": { "type": "question", "value": "nps-score" },
                "operator": "isGreaterThanOrEqual",
                "rightOperand": { "type": "static", "value": 9 }
              }
            ]
          },
          "actions": [
            { "id": $a3_id, "objective": "jumpToQuestion", "target": "nps-promoter-reason" }
          ]
        }
      ]
    },
    {
      "id": "nps-detractor-reason",
      "type": "openText",
      "headline": { "default": "What was the main reason for your score?", "ar": "ما السبب الرئيسي لتقييمك؟" },
      "required": false,
      "longAnswer": true,
      "inputType": "text",
      "placeholder": { "default": "Please share your thoughts...", "ar": "يرجى مشاركة أفكارك..." },
      "logic": [
        {
          "id": $l4_id,
          "conditions": {
            "id": $c4_id,
            "connector": "and",
            "conditions": [
              { "id": $s4_id, "leftOperand": { "type": "question", "value": "nps-detractor-reason" }, "operator": "isSubmitted" }
            ]
          },
          "actions": [
            { "id": $a4_id, "objective": "jumpToQuestion", "target": "nps-service-type" }
          ]
        }
      ],
      "logicFallback": "nps-service-type"
    },
    {
      "id": "nps-passive-reason",
      "type": "openText",
      "headline": { "default": "What could we do to earn a higher score?", "ar": "ماذا يمكننا فعله للحصول على تقييم أعلى؟" },
      "required": false,
      "longAnswer": true,
      "inputType": "text",
      "placeholder": { "default": "Your suggestions matter to us...", "ar": "اقتراحاتك مهمة لنا..." },
      "logic": [
        {
          "id": $l5_id,
          "conditions": {
            "id": $c5_id,
            "connector": "and",
            "conditions": [
              { "id": $s5_id, "leftOperand": { "type": "question", "value": "nps-passive-reason" }, "operator": "isSubmitted" }
            ]
          },
          "actions": [
            { "id": $a5_id, "objective": "jumpToQuestion", "target": "nps-service-type" }
          ]
        }
      ],
      "logicFallback": "nps-service-type"
    },
    {
      "id": "nps-promoter-reason",
      "type": "openText",
      "headline": { "default": "What do you value most about Al Rajhi Bank?", "ar": "ما الذي تقدره أكثر في بنك الراجحي؟" },
      "required": false,
      "longAnswer": true,
      "inputType": "text",
      "placeholder": { "default": "Tell us what you love...", "ar": "أخبرنا بما يعجبك..." }
    },
    {
      "id": "nps-service-type",
      "type": "multipleChoiceSingle",
      "headline": { "default": "Which service did you use most recently?", "ar": "ما الخدمة التي استخدمتها مؤخراً؟" },
      "required": true,
      "choices": [
        { "id": "branch-visit", "label": { "default": "Branch Visit", "ar": "زيارة الفرع" } },
        { "id": "digital-banking", "label": { "default": "Digital Banking", "ar": "الخدمات المصرفية الرقمية" } },
        { "id": "cards", "label": { "default": "Cards", "ar": "البطاقات" } },
        { "id": "personal-finance", "label": { "default": "Personal Finance", "ar": "التمويل الشخصي" } },
        { "id": "account-services", "label": { "default": "Account Services", "ar": "خدمات الحسابات" } }
      ],
      "shuffleOption": "none"
    }
  ],
  "endings": [
    {
      "id": $end_id,
      "type": "endScreen",
      "headline": { "default": "Thank you for your feedback!", "ar": "شكراً لملاحظاتك!" },
      "subheader": { "default": "Your opinion helps us improve our services.", "ar": "رأيك يساعدنا في تحسين خدماتنا." }
    }
  ],
  "hiddenFields": {
    "enabled": true,
    "fieldIds": ["customerId", "branchCode", "channel"]
  },
  "displayOption": "respondMultiple",
  "showLanguageSwitch": true
}')

NPS_RESPONSE=$(echo "$NPS_PAYLOAD" | api POST /surveys -d @-)
NPS_ID=$(echo "$NPS_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -z "$NPS_ID" ]; then
  echo "  ERROR creating NPS survey:"
  echo "$NPS_RESPONSE" | jq '.'
  exit 1
fi
echo "  NPS Survey created: ${NPS_ID}"

# ---------------------------------------------------------------------------
# Step 3: Create Survey B - CSAT (Customer Satisfaction)
# ---------------------------------------------------------------------------
echo "Step 3: Creating CSAT Survey..."

CSAT_PAYLOAD=$(jq -n \
  --arg eid "$ENV_ID" \
  --arg end_id "$(cuid2)" \
'{
  "name": "Al Rajhi Bank - CSAT Survey | استبيان رضا العملاء - بنك الراجحي",
  "type": "link",
  "status": "inProgress",
  "environmentId": $eid,
  "questions": [
    {
      "id": "csat-overall",
      "type": "rating",
      "headline": { "default": "How satisfied are you with your recent experience at Al Rajhi Bank?", "ar": "ما مدى رضاك عن تجربتك الأخيرة في بنك الراجحي؟" },
      "required": true,
      "scale": "star",
      "range": 5,
      "lowerLabel": { "default": "Very Dissatisfied", "ar": "غير راضٍ جداً" },
      "upperLabel": { "default": "Very Satisfied", "ar": "راضٍ جداً" },
      "isColorCodingEnabled": true
    },
    {
      "id": "csat-matrix",
      "type": "matrix",
      "headline": { "default": "How would you rate the following?", "ar": "كيف تقيّم التالي؟" },
      "required": true,
      "rows": [
        { "id": "staff", "label": { "default": "Staff friendliness", "ar": "ود الموظفين" } },
        { "id": "wait-time", "label": { "default": "Wait time", "ar": "وقت الانتظار" } },
        { "id": "resolution", "label": { "default": "Problem resolution", "ar": "حل المشكلة" } },
        { "id": "overall-service", "label": { "default": "Overall service", "ar": "الخدمة العامة" } }
      ],
      "columns": [
        { "id": "col-1", "label": { "default": "1 - Poor", "ar": "1 - ضعيف" } },
        { "id": "col-2", "label": { "default": "2 - Fair", "ar": "2 - مقبول" } },
        { "id": "col-3", "label": { "default": "3 - Good", "ar": "3 - جيد" } },
        { "id": "col-4", "label": { "default": "4 - Very Good", "ar": "4 - جيد جداً" } },
        { "id": "col-5", "label": { "default": "5 - Excellent", "ar": "5 - ممتاز" } }
      ],
      "shuffleOption": "none"
    },
    {
      "id": "csat-feedback",
      "type": "openText",
      "headline": { "default": "Please share any additional feedback", "ar": "يرجى مشاركة أي ملاحظات إضافية" },
      "required": false,
      "longAnswer": true,
      "inputType": "text",
      "placeholder": { "default": "Your feedback helps us improve...", "ar": "ملاحظاتك تساعدنا في التحسين..." }
    }
  ],
  "endings": [
    {
      "id": $end_id,
      "type": "endScreen",
      "headline": { "default": "Thank you for your feedback!", "ar": "شكراً لملاحظاتك!" },
      "subheader": { "default": "Your feedback helps us serve you better.", "ar": "ملاحظاتك تساعدنا في خدمتك بشكل أفضل." }
    }
  ],
  "hiddenFields": {
    "enabled": true,
    "fieldIds": ["customerId", "branchCode", "agentId", "transactionType"]
  },
  "displayOption": "respondMultiple",
  "showLanguageSwitch": true
}')

CSAT_RESPONSE=$(echo "$CSAT_PAYLOAD" | api POST /surveys -d @-)
CSAT_ID=$(echo "$CSAT_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -z "$CSAT_ID" ]; then
  echo "  ERROR creating CSAT survey:"
  echo "$CSAT_RESPONSE" | jq '.'
  exit 1
fi
echo "  CSAT Survey created: ${CSAT_ID}"

# ---------------------------------------------------------------------------
# Step 4: Create Survey C - CES (Customer Effort Score)
# ---------------------------------------------------------------------------
echo "Step 4: Creating CES Survey..."

CES_PAYLOAD=$(jq -n \
  --arg eid "$ENV_ID" \
  --arg end_id "$(cuid2)" \
  --arg l1_id "$(cuid2)" --arg c1_id "$(cuid2)" --arg s1_id "$(cuid2)" --arg a1_id "$(cuid2)" \
  --arg l2_id "$(cuid2)" --arg c2_id "$(cuid2)" --arg s2_id "$(cuid2)" --arg a2_id "$(cuid2)" \
'{
  "name": "Al Rajhi Bank - CES Survey | استبيان جهد العميل - بنك الراجحي",
  "type": "link",
  "status": "inProgress",
  "environmentId": $eid,
  "questions": [
    {
      "id": "ces-score",
      "type": "rating",
      "headline": { "default": "Al Rajhi Bank made it easy for me to handle my issue", "ar": "سهّل بنك الراجحي عليّ التعامل مع مشكلتي" },
      "required": true,
      "scale": "number",
      "range": 7,
      "lowerLabel": { "default": "Strongly Disagree", "ar": "أعارض بشدة" },
      "upperLabel": { "default": "Strongly Agree", "ar": "أوافق بشدة" },
      "isColorCodingEnabled": true,
      "logic": [
        {
          "id": $l1_id,
          "conditions": {
            "id": $c1_id,
            "connector": "and",
            "conditions": [
              {
                "id": $s1_id,
                "leftOperand": { "type": "question", "value": "ces-score" },
                "operator": "isLessThanOrEqual",
                "rightOperand": { "type": "static", "value": 3 }
              }
            ]
          },
          "actions": [
            { "id": $a1_id, "objective": "jumpToQuestion", "target": "ces-difficulty" }
          ]
        },
        {
          "id": $l2_id,
          "conditions": {
            "id": $c2_id,
            "connector": "and",
            "conditions": [
              {
                "id": $s2_id,
                "leftOperand": { "type": "question", "value": "ces-score" },
                "operator": "isGreaterThanOrEqual",
                "rightOperand": { "type": "static", "value": 4 }
              }
            ]
          },
          "actions": [
            { "id": $a2_id, "objective": "jumpToQuestion", "target": "ces-channel" }
          ]
        }
      ]
    },
    {
      "id": "ces-difficulty",
      "type": "openText",
      "headline": { "default": "What made the process difficult?", "ar": "ما الذي جعل العملية صعبة؟" },
      "required": false,
      "longAnswer": true,
      "inputType": "text",
      "placeholder": { "default": "Please describe the challenges you faced...", "ar": "يرجى وصف التحديات التي واجهتها..." }
    },
    {
      "id": "ces-channel",
      "type": "multipleChoiceSingle",
      "headline": { "default": "Which channel did you use?", "ar": "أي قناة استخدمت؟" },
      "required": true,
      "choices": [
        { "id": "ch-branch", "label": { "default": "Branch", "ar": "الفرع" } },
        { "id": "ch-mobile", "label": { "default": "Mobile App", "ar": "تطبيق الجوال" } },
        { "id": "ch-online", "label": { "default": "Online Banking", "ar": "الخدمات المصرفية عبر الإنترنت" } },
        { "id": "ch-phone", "label": { "default": "Phone Banking", "ar": "الخدمات المصرفية عبر الهاتف" } },
        { "id": "ch-atm", "label": { "default": "ATM", "ar": "الصراف الآلي" } }
      ],
      "shuffleOption": "none"
    }
  ],
  "endings": [
    {
      "id": $end_id,
      "type": "endScreen",
      "headline": { "default": "Thank you for your feedback!", "ar": "شكراً لملاحظاتك!" },
      "subheader": { "default": "We appreciate your time.", "ar": "نقدر وقتك." }
    }
  ],
  "hiddenFields": {
    "enabled": true,
    "fieldIds": ["customerId", "transactionId", "channel"]
  },
  "displayOption": "respondMultiple",
  "showLanguageSwitch": true
}')

CES_RESPONSE=$(echo "$CES_PAYLOAD" | api POST /surveys -d @-)
CES_ID=$(echo "$CES_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -z "$CES_ID" ]; then
  echo "  ERROR creating CES survey:"
  echo "$CES_RESPONSE" | jq '.'
  exit 1
fi
echo "  CES Survey created: ${CES_ID}"

# ---------------------------------------------------------------------------
# Step 5: Register Webhook to n8n
# ---------------------------------------------------------------------------
echo ""
echo "Step 5: Registering n8n webhook..."

WEBHOOK_PAYLOAD=$(jq -n \
  --arg name "n8n Closed-Loop Handler" \
  --arg url "$N8N_WEBHOOK_URL" \
  --arg eid "$ENV_ID" \
  --arg nps "$NPS_ID" \
  --arg csat "$CSAT_ID" \
  --arg ces "$CES_ID" \
  '{
    name: $name,
    url: $url,
    source: "n8n",
    environmentId: $eid,
    triggers: ["responseFinished"],
    surveyIds: [$nps, $csat, $ces]
  }')

WEBHOOK_RESPONSE=$(echo "$WEBHOOK_PAYLOAD" | curl -sS -X POST \
  "${HIVECFM_URL}/api/v1/webhooks" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @-)

WEBHOOK_ID=$(echo "$WEBHOOK_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -z "$WEBHOOK_ID" ]; then
  echo "  ERROR registering webhook:"
  echo "$WEBHOOK_RESPONSE" | jq '.'
  exit 1
fi
echo "  Webhook registered: ${WEBHOOK_ID}"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================="
echo "  Al Rajhi Bank CX Setup Complete"
echo "============================================="
echo ""
echo "  Environment ID: ${ENV_ID}"
echo ""
echo "  NPS Survey ID:  ${NPS_ID}"
echo "  CSAT Survey ID: ${CSAT_ID}"
echo "  CES Survey ID:  ${CES_ID}"
echo ""
echo "  Webhook ID:     ${WEBHOOK_ID}"
echo "  Webhook URL:    ${N8N_WEBHOOK_URL}"
echo ""
echo "  Survey Links:"
echo "    NPS:  ${HIVECFM_URL}/s/${NPS_ID}"
echo "    CSAT: ${HIVECFM_URL}/s/${CSAT_ID}"
echo "    CES:  ${HIVECFM_URL}/s/${CES_ID}"
echo ""
echo "  Next Steps:"
echo "    1. Enable Arabic language in HiveCFM Settings → Languages"
echo "    2. Import n8n workflow: scripts/n8n-workflow.json"
echo "    3. Configure Superset datasets: scripts/superset-datasets.sql"
echo "    4. Run E2E test: scripts/test-closed-loop.sh"
echo ""

# Save IDs for other scripts
cat > "$(dirname "$0")/.survey-ids.env" <<EOF
# Auto-generated by create-surveys.sh - $(date -u +%Y-%m-%dT%H:%M:%SZ)
HIVECFM_ENV_ID=${ENV_ID}
NPS_SURVEY_ID=${NPS_ID}
CSAT_SURVEY_ID=${CSAT_ID}
CES_SURVEY_ID=${CES_ID}
WEBHOOK_ID=${WEBHOOK_ID}
EOF

echo "  Survey IDs saved to scripts/.survey-ids.env"
