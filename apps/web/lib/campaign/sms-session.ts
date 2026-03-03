/**
 * SMS Campaign Session Store
 *
 * In-memory session store for SMS campaign Q&A flows, keyed by phone number (subscriberId).
 * Follows the same pattern as the bot connector session store in
 * apps/web/app/api/v1/management/bot-connector/turn/route.ts
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TSmsSessionState {
  campaignSendId: string;
  campaignId: string;
  surveyId: string;
  environmentId: string;
  contactId: string;
  subscriberId: string; // phone number
  currentQuestionIndex: number;
  questionIds: string[];
  answers: Record<string, unknown>;
  responseId: string;
}

// ─── In-memory session store (keyed by phone number / subscriberId) ──────────

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

interface SessionEntry {
  state: TSmsSessionState;
  expiresAt: number;
}

const sessionStore = new Map<string, SessionEntry>();

/**
 * Retrieve an SMS session by phone number.
 * Returns null if not found or expired.
 */
export function getSmsSession(phone: string): TSmsSessionState | null {
  const entry = sessionStore.get(phone);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessionStore.delete(phone);
    return null;
  }
  return entry.state;
}

/**
 * Create or update an SMS session for a phone number.
 * Resets the TTL on every write.
 */
export function setSmsSession(phone: string, state: TSmsSessionState): void {
  sessionStore.set(phone, { state, expiresAt: Date.now() + SESSION_TTL_MS });
}

/**
 * Delete an SMS session (e.g. when the survey is completed or abandoned).
 */
export function deleteSmsSession(phone: string): void {
  sessionStore.delete(phone);
}

// ─── Periodic cleanup of expired sessions (every 10 minutes) ─────────────────

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of sessionStore) {
      if (now > entry.expiresAt) sessionStore.delete(key);
    }
  },
  10 * 60 * 1000
);
