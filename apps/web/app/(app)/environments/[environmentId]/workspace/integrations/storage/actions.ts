"use server";

import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { ZStorageCredential } from "@hivecfm/types/integration/storage";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";

const ZTestStorageConnectionAction = z.object({
  environmentId: ZId,
  credentials: ZStorageCredential,
});

export const testStorageConnectionAction = authenticatedActionClient
  .schema(ZTestStorageConnectionAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
        },
      ],
    });

    const creds = parsedInput.credentials;
    let s3Client: S3Client;

    if (creds.provider === "minio") {
      s3Client = new S3Client({
        endpoint: creds.endpointUrl,
        region: creds.region || "us-east-1",
        forcePathStyle: creds.forcePathStyle ?? true,
        credentials: { accessKeyId: creds.accessKey, secretAccessKey: creds.secretKey },
      });
      await s3Client.send(new HeadBucketCommand({ Bucket: creds.bucketName }));
    } else if (creds.provider === "awsS3") {
      s3Client = new S3Client({
        region: creds.region,
        credentials: { accessKeyId: creds.accessKey, secretAccessKey: creds.secretKey },
      });
      await s3Client.send(new HeadBucketCommand({ Bucket: creds.bucketName }));
    } else if (creds.provider === "azureBlob") {
      s3Client = new S3Client({
        endpoint: `https://${creds.accountName}.blob.core.windows.net`,
        region: "westeurope",
        forcePathStyle: true,
        credentials: { accessKeyId: creds.accountName, secretAccessKey: creds.accountKey },
      });
      await s3Client.send(new HeadBucketCommand({ Bucket: creds.containerName }));
    }

    return { success: true };
  });
