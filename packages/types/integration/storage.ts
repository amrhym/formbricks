import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZStorageProvider = z.enum(["minio", "azureBlob", "awsS3"]);
export type TStorageProvider = z.infer<typeof ZStorageProvider>;

export const ZStorageMinioCredential = z.object({
  provider: z.literal("minio"),
  endpointUrl: z.string().url(),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  bucketName: z.string().min(1),
  region: z.string().optional(),
  forcePathStyle: z.boolean().default(true),
});

export const ZStorageAzureBlobCredential = z.object({
  provider: z.literal("azureBlob"),
  accountName: z.string().min(1),
  accountKey: z.string().min(1),
  containerName: z.string().min(1),
});

export const ZStorageAwsS3Credential = z.object({
  provider: z.literal("awsS3"),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  bucketName: z.string().min(1),
  region: z.string().min(1),
});

export const ZStorageCredential = z.discriminatedUnion("provider", [
  ZStorageMinioCredential,
  ZStorageAzureBlobCredential,
  ZStorageAwsS3Credential,
]);
export type TStorageCredential = z.infer<typeof ZStorageCredential>;

export const ZIntegrationStorageConfig = z.object({
  key: ZStorageCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationStorageConfig = z.infer<typeof ZIntegrationStorageConfig>;

export const ZIntegrationStorage = ZIntegrationBase.extend({
  type: z.literal("storage"),
  config: ZIntegrationStorageConfig,
});
export type TIntegrationStorage = z.infer<typeof ZIntegrationStorage>;

export const ZIntegrationStorageInput = z.object({
  type: z.literal("storage"),
  config: ZIntegrationStorageConfig,
});
export type TIntegrationStorageInput = z.infer<typeof ZIntegrationStorageInput>;
