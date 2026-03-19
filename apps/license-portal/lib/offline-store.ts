import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface OfflineOrgLicense {
  licenseKey: string;
  maxUsers: number;
  maxCompletedResponses: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface OfflineOrg {
  id: string;
  name: string;
  createdAt: string;
  license: OfflineOrgLicense | null;
}

interface OfflineStore {
  orgs: OfflineOrg[];
}

const STORE_PATH = process.env.OFFLINE_STORE_PATH || "/tmp/hivelic-offline-orgs.json";

// In-memory fallback when filesystem is not available
let memoryStore: OfflineStore | null = null;

function readStore(): OfflineStore {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw) as OfflineStore;
    }
  } catch {
    // Fall back to memory store
    if (memoryStore) return memoryStore;
  }
  return { orgs: [] };
}

function writeStore(store: OfflineStore): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Fall back to memory store
    memoryStore = store;
  }
}

export function generateLicenseKey(): string {
  const segment = () => randomBytes(2).toString("hex").toUpperCase();
  return `HCFM-${segment()}-${segment()}-${segment()}-${segment()}`;
}

export function getOfflineOrgs(): OfflineOrg[] {
  const store = readStore();
  return store.orgs;
}

export function getOfflineOrg(id: string): OfflineOrg | null {
  const store = readStore();
  return store.orgs.find((o) => o.id === id) || null;
}

export function addOfflineOrg(name: string): OfflineOrg {
  const store = readStore();
  const org: OfflineOrg = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    license: null,
  };
  store.orgs.push(org);
  writeStore(store);
  return org;
}

export function updateOfflineOrgLicense(
  id: string,
  license: Omit<OfflineOrgLicense, "licenseKey"> & { licenseKey?: string }
): OfflineOrg {
  const store = readStore();
  const org = store.orgs.find((o) => o.id === id);
  if (!org) {
    throw new Error("Offline organization not found");
  }

  org.license = {
    licenseKey: license.licenseKey || org.license?.licenseKey || generateLicenseKey(),
    maxUsers: license.maxUsers,
    maxCompletedResponses: license.maxCompletedResponses,
    addonAiInsights: license.addonAiInsights,
    addonCampaignManagement: license.addonCampaignManagement,
    validFrom: license.validFrom,
    validUntil: license.validUntil,
    isActive: license.isActive,
  };

  writeStore(store);
  return org;
}

export function deleteOfflineOrg(id: string): void {
  const store = readStore();
  store.orgs = store.orgs.filter((o) => o.id !== id);
  writeStore(store);
}
