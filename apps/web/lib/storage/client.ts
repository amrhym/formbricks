import { S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { setStorageConfigOverride } from "@hivecfm/storage";

let initialized = false;
let initTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load MinIO/S3 credentials from the DB integration table and inject them
 * into the storage package via setStorageConfigOverride.
 *
 * Falls back to env vars (S3_ACCESS_KEY, S3_SECRET_KEY, etc.) if no DB
 * integration is configured — existing behaviour is preserved.
 *
 * Safe to call repeatedly; re-reads from DB only after CACHE_TTL expires.
 */
export const initStorageFromDB = async (): Promise<void> => {
  if (initialized && Date.now() - initTime < CACHE_TTL) return;

  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "storage" },
      select: { config: true },
    });

    if (!integration?.config) {
      // No DB integration — clear any previous override so env fallback is used
      setStorageConfigOverride(undefined);
      initialized = true;
      initTime = Date.now();
      return;
    }

    const key = (integration.config as any)?.key;
    if (!key?.provider) {
      setStorageConfigOverride(undefined);
      initialized = true;
      initTime = Date.now();
      return;
    }

    if (key.provider === "minio" || key.provider === "awsS3") {
      const endpoint = key.endpointUrl as string;
      const internalEndpoint = (key.internalEndpointUrl as string | undefined) || endpoint;
      const publicEndpoint = (key.publicEndpointUrl as string | undefined) || endpoint;

      const s3Client = new S3Client({
        endpoint: internalEndpoint,
        forcePathStyle: key.forcePathStyle !== false, // default true for MinIO
        region: (key.region as string | undefined) || "us-east-1",
        credentials: {
          accessKeyId: key.accessKey as string,
          secretAccessKey: key.secretKey as string,
        },
      });

      setStorageConfigOverride({
        client: s3Client,
        bucketName: key.bucketName as string,
        endpointUrl: endpoint,
        internalEndpoint,
        publicEndpointUrl: publicEndpoint,
      });

      logger.debug({ provider: key.provider }, "Storage config loaded from DB integration");
    } else if (key.provider === "azureBlob") {
      // Azure Blob is handled by its own service — just clear S3 override
      setStorageConfigOverride(undefined);
    }
  } catch (error) {
    // DB not available — fall through to env vars
    logger.warn({ error }, "Could not load storage config from DB; using env vars");
    setStorageConfigOverride(undefined);
  }

  initialized = true;
  initTime = Date.now();
};

/** Force next call to initStorageFromDB to re-read from DB (e.g. after saving new credentials). */
export const invalidateStorageCache = (): void => {
  initialized = false;
  initTime = 0;
};
