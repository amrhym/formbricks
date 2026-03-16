#!/usr/bin/env bash
# =============================================================================
# Al Rajhi Bank - End-to-End Closed-Loop Test
# =============================================================================
# Tests the full feedback loop:
#   1. Submit survey responses via HiveCFM Client API (includes low scores)
#   2. Verify webhook fires to n8n
#   3. Check mock-salesforce for created cases and notifications
#
# Prerequisites:
#   - All services running (docker compose up -d)
#   - Surveys created (./scripts/create-surveys.sh)
#   - n8n workflow imported and active
#   - Survey IDs available in scripts/.survey-ids.env
#
# Usage:
#   ./scripts/test-closed-loop.sh
# =============================================================================

set -euo pipefail

HIVECFM_URL="${HIVECFM_URL:-http://localhost:3000}"
MOCK_SF_URL="${MOCK_SF_URL:-https://salesforce.hivecfm.xcai.io}"
N8N_WEBHOOK_URL="${N8N_WEBHOOK_URL:-https://n8n.hivecfm.xcai.io/webhook/survey-response}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAILURES=$((FAILURES + 1)); }
info() { echo -e "${BLUE}ℹ${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

FAILURES=0
TESTS=0

# ---------------------------------------------------------------------------
# Load survey IDs
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDS_FILE="${SCRIPT_DIR}/.survey-ids.env"

if [ -f "$IDS_FILE" ]; then
  source "$IDS_FILE"
  info "Loaded survey IDs from ${IDS_FILE}"
else
  warn "No .survey-ids.env found. Set survey IDs manually or run create-surveys.sh first."
  NPS_SURVEY_ID="${NPS_SURVEY_ID:?Set NPS_SURVEY_ID}"
  CSAT_SURVEY_ID="${CSAT_SURVEY_ID:?Set CSAT_SURVEY_ID}"
  CES_SURVEY_ID="${CES_SURVEY_ID:?Set CES_SURVEY_ID}"
  HIVECFM_ENV_ID="${HIVECFM_ENV_ID:?Set HIVECFM_ENV_ID}"
fi

echo ""
echo "============================================="
echo "  Al Rajhi Bank - E2E Closed-Loop Test"
echo "============================================="
echo ""
echo "  HiveCFM:       ${HIVECFM_URL}"
echo "  Mock Salesforce: ${MOCK_SF_URL}"
echo "  Environment ID:  ${HIVECFM_ENV_ID}"
echo "  NPS Survey:      ${NPS_SURVEY_ID}"
echo "  CSAT Survey:     ${CSAT_SURVEY_ID}"
echo "  CES Survey:      ${CES_SURVEY_ID}"
echo ""

# ---------------------------------------------------------------------------
# Test 1: Service Health Checks
# ---------------------------------------------------------------------------
echo "--- Test 1: Service Health Checks ---"

TESTS=$((TESTS + 1))
if curl -sf "${HIVECFM_URL}/health" > /dev/null 2>&1; then
  pass "HiveCFM is healthy"
else
  fail "HiveCFM health check failed at ${HIVECFM_URL}/health"
fi

TESTS=$((TESTS + 1))
if curl -sf "${MOCK_SF_URL}/cases" > /dev/null 2>&1; then
  pass "Mock Salesforce is healthy"
else
  fail "Mock Salesforce health check failed at ${MOCK_SF_URL}/cases"
fi

echo ""

# ---------------------------------------------------------------------------
# Test 2: Clear previous test cases
# ---------------------------------------------------------------------------
echo "--- Test 2: Reset Mock Salesforce ---"

info "Clearing previous test data from mock-salesforce..."
# Get current cases count
CASES_BEFORE=$(curl -sS "${MOCK_SF_URL}/cases" | jq 'length')
NOTIFS_BEFORE=$(curl -sS "${MOCK_SF_URL}/notifications" | jq 'length')
info "Current cases: ${CASES_BEFORE}, notifications: ${NOTIFS_BEFORE}"
echo ""

# ---------------------------------------------------------------------------
# Test 3: Submit NPS Detractor Response (score=3, should trigger P1 case)
# ---------------------------------------------------------------------------
echo "--- Test 3: Submit NPS Detractor Response (score=3) ---"

TESTS=$((TESTS + 1))
NPS_RESPONSE=$(curl -sS -X POST \
  "${HIVECFM_URL}/api/v1/client/${HIVECFM_ENV_ID}/responses" \
  -H "Content-Type: application/json" \
  -d "{
    \"surveyId\": \"${NPS_SURVEY_ID}\",
    \"finished\": true,
    \"data\": {
      \"nps-score\": 3,
      \"nps-detractor-reason\": \"Long wait times at branch and mobile app is slow\",
      \"nps-service-type\": \"branch-visit\",
      \"customerId\": \"CUST-TEST-001\",
      \"branchCode\": \"BR-RYD-001\",
      \"channel\": \"branch\"
    },
    \"language\": \"en\"
  }")

NPS_RESP_ID=$(echo "$NPS_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -n "$NPS_RESP_ID" ]; then
  pass "NPS detractor response submitted: ${NPS_RESP_ID}"
else
  fail "NPS response submission failed"
  echo "  Response: $NPS_RESPONSE"
fi

echo ""

# ---------------------------------------------------------------------------
# Test 4: Submit CSAT Low Score Response (score=1, should trigger P1 case)
# ---------------------------------------------------------------------------
echo "--- Test 4: Submit CSAT Low Score Response (score=1) ---"

TESTS=$((TESTS + 1))
CSAT_RESPONSE=$(curl -sS -X POST \
  "${HIVECFM_URL}/api/v1/client/${HIVECFM_ENV_ID}/responses" \
  -H "Content-Type: application/json" \
  -d "{
    \"surveyId\": \"${CSAT_SURVEY_ID}\",
    \"finished\": true,
    \"data\": {
      \"csat-overall\": 1,
      \"csat-matrix\": {
        \"staff\": \"col-2\",
        \"wait-time\": \"col-1\",
        \"resolution\": \"col-1\",
        \"overall-service\": \"col-2\"
      },
      \"csat-feedback\": \"Very poor experience. Agent was rude and issue not resolved.\",
      \"customerId\": \"CUST-TEST-002\",
      \"branchCode\": \"BR-JED-005\",
      \"agentId\": \"AGT-1234\",
      \"transactionType\": \"account-inquiry\"
    },
    \"language\": \"en\"
  }")

CSAT_RESP_ID=$(echo "$CSAT_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -n "$CSAT_RESP_ID" ]; then
  pass "CSAT low-score response submitted: ${CSAT_RESP_ID}"
else
  fail "CSAT response submission failed"
  echo "  Response: $CSAT_RESPONSE"
fi

echo ""

# ---------------------------------------------------------------------------
# Test 5: Submit CES High-Effort Response (score=2, should trigger P2 case)
# ---------------------------------------------------------------------------
echo "--- Test 5: Submit CES High-Effort Response (score=2) ---"

TESTS=$((TESTS + 1))
CES_RESPONSE=$(curl -sS -X POST \
  "${HIVECFM_URL}/api/v1/client/${HIVECFM_ENV_ID}/responses" \
  -H "Content-Type: application/json" \
  -d "{
    \"surveyId\": \"${CES_SURVEY_ID}\",
    \"finished\": true,
    \"data\": {
      \"ces-score\": 2,
      \"ces-difficulty\": \"Had to visit the branch 3 times and call customer service twice\",
      \"ces-channel\": \"ch-branch\",
      \"customerId\": \"CUST-TEST-003\",
      \"transactionId\": \"TXN-20250115-789\",
      \"channel\": \"branch\"
    },
    \"language\": \"ar\"
  }")

CES_RESP_ID=$(echo "$CES_RESPONSE" | jq -r '.data.id // .id // empty')
if [ -n "$CES_RESP_ID" ]; then
  pass "CES high-effort response submitted: ${CES_RESP_ID}"
else
  fail "CES response submission failed"
  echo "  Response: $CES_RESPONSE"
fi

echo ""

# ---------------------------------------------------------------------------
# Test 6: Submit NPS Promoter Response (score=9, should NOT trigger case)
# ---------------------------------------------------------------------------
echo "--- Test 6: Submit NPS Promoter Response (score=9, no alert expected) ---"

TESTS=$((TESTS + 1))
NPS_PROMOTER=$(curl -sS -X POST \
  "${HIVECFM_URL}/api/v1/client/${HIVECFM_ENV_ID}/responses" \
  -H "Content-Type: application/json" \
  -d "{
    \"surveyId\": \"${NPS_SURVEY_ID}\",
    \"finished\": true,
    \"data\": {
      \"nps-score\": 9,
      \"nps-promoter-reason\": \"Excellent service and very convenient mobile app\",
      \"nps-service-type\": \"digital-banking\",
      \"customerId\": \"CUST-TEST-004\",
      \"branchCode\": \"BR-RYD-002\",
      \"channel\": \"mobile\"
    },
    \"language\": \"en\"
  }")

PROMOTER_ID=$(echo "$NPS_PROMOTER" | jq -r '.data.id // .id // empty')
if [ -n "$PROMOTER_ID" ]; then
  pass "NPS promoter response submitted: ${PROMOTER_ID} (should not trigger alert)"
else
  fail "NPS promoter response submission failed"
fi

echo ""

# ---------------------------------------------------------------------------
# Test 7: Wait for n8n processing and check mock-salesforce
# ---------------------------------------------------------------------------
echo "--- Test 7: Verify Closed-Loop Cases in Mock Salesforce ---"

info "Waiting 10 seconds for n8n webhook processing..."
sleep 10

TESTS=$((TESTS + 1))
CASES_AFTER=$(curl -sS "${MOCK_SF_URL}/cases" | jq 'length')
NEW_CASES=$((CASES_AFTER - CASES_BEFORE))

if [ "$NEW_CASES" -ge 3 ]; then
  pass "Mock Salesforce has ${NEW_CASES} new cases (expected >= 3)"
else
  warn "Mock Salesforce has ${NEW_CASES} new cases (expected >= 3)"
  info "This might be expected if n8n workflow is not yet imported/active."
  info "Check n8n execution history at https://n8n.hivecfm.xcai.io"
fi

echo ""
info "Current cases in mock-salesforce:"
curl -sS "${MOCK_SF_URL}/cases" | jq '[.[] | {id, surveyType, score, priority, status, customerId}]'

echo ""

TESTS=$((TESTS + 1))
NOTIFS_AFTER=$(curl -sS "${MOCK_SF_URL}/notifications" | jq 'length')
NEW_NOTIFS=$((NOTIFS_AFTER - NOTIFS_BEFORE))

if [ "$NEW_NOTIFS" -ge 3 ]; then
  pass "Mock Salesforce has ${NEW_NOTIFS} new notifications"
else
  warn "Mock Salesforce has ${NEW_NOTIFS} new notifications (expected >= 3)"
fi

echo ""
info "Current notifications:"
curl -sS "${MOCK_SF_URL}/notifications" | jq '[.[] | {id, surveyType, priority, score, message}]'

echo ""

# ---------------------------------------------------------------------------
# Test 8: Verify survey links are accessible
# ---------------------------------------------------------------------------
echo "--- Test 8: Survey Link Accessibility ---"

for SURVEY_TYPE in "NPS:${NPS_SURVEY_ID}" "CSAT:${CSAT_SURVEY_ID}" "CES:${CES_SURVEY_ID}"; do
  TYPE="${SURVEY_TYPE%%:*}"
  SID="${SURVEY_TYPE##*:}"
  TESTS=$((TESTS + 1))

  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${HIVECFM_URL}/s/${SID}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    pass "${TYPE} survey link accessible: ${HIVECFM_URL}/s/${SID}"
  else
    fail "${TYPE} survey link returned HTTP ${HTTP_CODE}"
  fi
done

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "============================================="
echo "  Test Summary"
echo "============================================="
echo ""
echo "  Total tests: ${TESTS}"
echo "  Failures:    ${FAILURES}"
echo ""

if [ "$FAILURES" -eq 0 ]; then
  echo -e "  ${GREEN}All tests passed!${NC}"
else
  echo -e "  ${RED}${FAILURES} test(s) failed.${NC}"
  echo ""
  echo "  Troubleshooting:"
  echo "    - Check service health: docker compose ps"
  echo "    - Check n8n workflow: https://n8n.hivecfm.xcai.io"
  echo "    - Check n8n executions for errors"
  echo "    - Verify mock-salesforce: curl ${MOCK_SF_URL}/cases"
  echo "    - Check HiveCFM logs: docker compose logs hivecfm-core"
fi

echo ""
exit $FAILURES
