export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
export const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
export const S3_REGION = process.env.S3_REGION;
export const S3_ENDPOINT_URL = process.env.S3_ENDPOINT_URL;
export const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "1";
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
// Public endpoint URL for browser-facing presigned POST URLs.
// When the S3 SDK endpoint is internal (e.g., http://minio:9000), browsers can't reach it.
// This URL is used to rewrite presigned POST URLs so browsers can upload directly.
export const S3_PUBLIC_ENDPOINT_URL = process.env.S3_PUBLIC_ENDPOINT_URL;
// Internal endpoint for server-side S3 SDK operations (HeadObject, GetObject, etc.).
// When set, the S3 client uses this for API calls while S3_ENDPOINT_URL is used for browser-facing URLs.
export const S3_INTERNAL_ENDPOINT = process.env.S3_INTERNAL_ENDPOINT;

// Storage provider: "s3" (default, works with MinIO/AWS S3) or "azureBlob"
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "s3";

// Azure Blob Storage settings (used when STORAGE_PROVIDER=azureBlob)
export const AZURE_BLOB_ACCOUNT_NAME = process.env.AZURE_BLOB_ACCOUNT_NAME || process.env.S3_ACCESS_KEY;
export const AZURE_BLOB_ACCOUNT_KEY = process.env.AZURE_BLOB_ACCOUNT_KEY || process.env.S3_SECRET_KEY;
export const AZURE_BLOB_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || process.env.S3_BUCKET_NAME;
