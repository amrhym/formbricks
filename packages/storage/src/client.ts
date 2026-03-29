import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { logger } from "@hivecfm/logger";
import { type Result, type StorageError, StorageErrorCode, err, ok } from "../types/error";
import {
  S3_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_ENDPOINT_URL,
  S3_FORCE_PATH_STYLE,
  S3_INTERNAL_ENDPOINT,
  S3_PUBLIC_ENDPOINT_URL,
  S3_REGION,
  S3_SECRET_KEY,
} from "./constants";

// Runtime config override (set from DB integration)
interface S3ConfigOverride {
  client: S3Client;
  bucketName: string;
  endpointUrl?: string;
  internalEndpoint?: string;
  publicEndpointUrl?: string;
}

let configOverride: S3ConfigOverride | undefined;

// Cached singleton instance of S3Client (env-based fallback)
let cachedS3Client: S3Client | undefined;

/**
 * Override the S3 config at runtime (used to inject credentials from DB integration).
 * Pass undefined to revert to env-based config.
 */
export const setStorageConfigOverride = (override: S3ConfigOverride | undefined): void => {
  configOverride = override;
  cachedS3Client = undefined; // reset env-based cache so it re-initializes if override is cleared
};

/** Returns the active bucket name (override takes priority over env). */
export const getActiveBucketName = (): string | undefined => {
  return configOverride?.bucketName ?? S3_BUCKET_NAME;
};

/** Returns the active public endpoint URL (override takes priority over env). */
export const getActivePublicEndpointUrl = (): string | undefined => {
  return configOverride?.publicEndpointUrl ?? S3_PUBLIC_ENDPOINT_URL;
};

/** Returns the active public-facing S3 endpoint (override takes priority over env). */
export const getActiveEndpointUrl = (): string | undefined => {
  return configOverride?.endpointUrl ?? S3_ENDPOINT_URL;
};

/** Returns the active internal S3 endpoint (override takes priority over env). */
export const getActiveInternalEndpoint = (): string | undefined => {
  return configOverride?.internalEndpoint ?? S3_INTERNAL_ENDPOINT;
};

/**
 * Create an S3 client from environment variables
 * @returns A Result containing the S3 client or an error: S3CredentialsError | UnknownError
 */
export const createS3ClientFromEnv = (): Result<S3Client, StorageError> => {
  try {
    // Only S3_BUCKET_NAME is required - S3_REGION is optional and will default to AWS SDK defaults
    if (!S3_BUCKET_NAME) {
      logger.error("S3 Client: S3_BUCKET_NAME is required");
      return err({
        code: StorageErrorCode.S3CredentialsError,
      });
    }

    // Build S3 client configuration
    // Prefer internal endpoint for server-side operations; fall back to public endpoint
    const s3Config: S3ClientConfig = {
      endpoint: S3_INTERNAL_ENDPOINT || S3_ENDPOINT_URL,
      forcePathStyle: S3_FORCE_PATH_STYLE,
    };

    // Only set region if it's provided, otherwise let AWS SDK use its defaults
    if (S3_REGION) {
      s3Config.region = S3_REGION;
    }

    // Only add credentials if both access key and secret key are provided
    // This allows the AWS SDK to use IAM roles, instance profiles, or other credential providers
    if (S3_ACCESS_KEY && S3_SECRET_KEY) {
      s3Config.credentials = {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      };
    }

    const s3ClientInstance = new S3Client(s3Config);

    return ok(s3ClientInstance);
  } catch (error) {
    logger.error({ error }, "Error creating S3 client from environment variables");
    return err({
      code: StorageErrorCode.Unknown,
    });
  }
};

/**
 * Get a cached singleton S3 client instance. Lazily initializes from env on first successful call.
 * Subsequent calls return the same instance.
 */
export const getCachedS3Client = (): S3Client | undefined => {
  if (!cachedS3Client) {
    const result = createS3ClientFromEnv();
    if (result.ok) {
      cachedS3Client = result.data;
    }
  }
  return cachedS3Client;
};

/**
 * Create an S3 client from an existing client or from environment variables.
 * If a runtime config override is set (from DB integration), uses that first.
 */
export const createS3Client = (s3Client?: S3Client): S3Client | undefined => {
  if (s3Client) {
    return s3Client;
  }
  // Use DB-injected override if available
  if (configOverride) {
    return configOverride.client;
  }
  return getCachedS3Client();
};
