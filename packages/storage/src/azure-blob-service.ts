import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { logger } from "@hivecfm/logger";
import { type Result, type StorageError, StorageErrorCode, err, ok } from "../types/error";
import { AZURE_BLOB_ACCOUNT_KEY, AZURE_BLOB_ACCOUNT_NAME, AZURE_BLOB_CONTAINER_NAME } from "./constants";

let cachedContainerClient: ContainerClient | undefined;

const getContainerClient = (): ContainerClient | undefined => {
  if (cachedContainerClient) return cachedContainerClient;

  if (!AZURE_BLOB_ACCOUNT_NAME || !AZURE_BLOB_ACCOUNT_KEY || !AZURE_BLOB_CONTAINER_NAME) {
    logger.error("Azure Blob Storage: account name, key, and container name are required");
    return undefined;
  }

  const credential = new StorageSharedKeyCredential(AZURE_BLOB_ACCOUNT_NAME, AZURE_BLOB_ACCOUNT_KEY);
  const blobServiceClient = new BlobServiceClient(
    `https://${AZURE_BLOB_ACCOUNT_NAME}.blob.core.windows.net`,
    credential
  );
  cachedContainerClient = blobServiceClient.getContainerClient(AZURE_BLOB_CONTAINER_NAME);
  return cachedContainerClient;
};

/**
 * Generate a SAS URL for uploading a blob to Azure Blob Storage.
 * Returns a signedUrl (SAS URL for PUT) and empty presignedFields
 * since Azure Blob uses PUT with SAS token, not POST with form fields.
 */
export const getAzureBlobSignedUploadUrl = async (
  fileName: string,
  contentType: string,
  filePath: string,
  _maxSize: number = 1024 * 1024 * 10
): Promise<
  Result<
    {
      signedUrl: string;
      presignedFields: Record<string, string>;
      uploadMethod: "PUT";
    },
    StorageError
  >
> => {
  try {
    const containerClient = getContainerClient();
    if (!containerClient) {
      return err({ code: StorageErrorCode.S3ClientError });
    }

    if (!AZURE_BLOB_ACCOUNT_NAME || !AZURE_BLOB_ACCOUNT_KEY || !AZURE_BLOB_CONTAINER_NAME) {
      return err({ code: StorageErrorCode.S3CredentialsError });
    }

    const blobName = `${filePath}/${fileName}`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const credential = new StorageSharedKeyCredential(AZURE_BLOB_ACCOUNT_NAME, AZURE_BLOB_ACCOUNT_KEY);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 5);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: AZURE_BLOB_CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        startsOn: new Date(),
        expiresOn,
        contentType,
      },
      credential
    ).toString();

    return ok({
      signedUrl: `${blobClient.url}?${sasToken}`,
      presignedFields: { "Content-Type": contentType },
      uploadMethod: "PUT" as const,
    });
  } catch (error) {
    logger.error({ error }, "Failed to get Azure Blob signed upload URL");
    return err({ code: StorageErrorCode.Unknown });
  }
};

/**
 * Generate a SAS URL for downloading a blob from Azure Blob Storage.
 */
export const getAzureBlobSignedDownloadUrl = async (
  fileKey: string
): Promise<Result<string, StorageError>> => {
  try {
    const containerClient = getContainerClient();
    if (!containerClient) {
      return err({ code: StorageErrorCode.S3ClientError });
    }

    if (!AZURE_BLOB_ACCOUNT_NAME || !AZURE_BLOB_ACCOUNT_KEY || !AZURE_BLOB_CONTAINER_NAME) {
      return err({ code: StorageErrorCode.S3CredentialsError });
    }

    const blobClient = containerClient.getBlobClient(fileKey);

    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return err({ code: StorageErrorCode.FileNotFoundError });
    }

    const credential = new StorageSharedKeyCredential(AZURE_BLOB_ACCOUNT_NAME, AZURE_BLOB_ACCOUNT_KEY);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + 30);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: AZURE_BLOB_CONTAINER_NAME,
        blobName: fileKey,
        permissions: BlobSASPermissions.parse("r"), // read only
        startsOn: new Date(),
        expiresOn,
      },
      credential
    ).toString();

    return ok(`${blobClient.url}?${sasToken}`);
  } catch (error) {
    logger.error({ error }, "Failed to get Azure Blob signed download URL");
    return err({ code: StorageErrorCode.Unknown });
  }
};

/**
 * Delete a blob from Azure Blob Storage.
 */
export const deleteAzureBlob = async (fileKey: string): Promise<Result<void, StorageError>> => {
  try {
    const containerClient = getContainerClient();
    if (!containerClient) {
      return err({ code: StorageErrorCode.S3ClientError });
    }

    const blobClient = containerClient.getBlobClient(fileKey);
    await blobClient.deleteIfExists();
    return ok(undefined);
  } catch (error) {
    logger.error({ error }, "Failed to delete Azure blob");
    return err({ code: StorageErrorCode.Unknown });
  }
};

/**
 * Delete all blobs by prefix from Azure Blob Storage.
 */
export const deleteAzureBlobsByPrefix = async (prefix: string): Promise<Result<void, StorageError>> => {
  try {
    const containerClient = getContainerClient();
    if (!containerClient) {
      return err({ code: StorageErrorCode.S3ClientError });
    }

    const normalizedPrefix = prefix.trim();
    if (!normalizedPrefix || normalizedPrefix === "/") {
      logger.error({ prefix }, "Refusing to delete blobs with an empty or root prefix");
      return err({ code: StorageErrorCode.InvalidInput });
    }

    const blobs = containerClient.listBlobsFlat({ prefix: normalizedPrefix });
    const deletePromises: Promise<unknown>[] = [];

    for await (const blob of blobs) {
      deletePromises.push(containerClient.deleteBlob(blob.name));
    }

    await Promise.allSettled(deletePromises);
    return ok(undefined);
  } catch (error) {
    logger.error({ error }, "Failed to delete Azure blobs by prefix");
    return err({ code: StorageErrorCode.Unknown });
  }
};
