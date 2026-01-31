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
