import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import {
  type TChannel,
  type TChannelCreateInput,
  type TChannelUpdateInput,
  ZChannelCreateInput,
  ZChannelUpdateInput,
  getDefaultChannelConfig,
} from "@hivecfm/types/channel";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError, InvalidInputError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { validateInputs } from "../utils/validate";

const selectChannel = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  type: true,
  description: true,
  environmentId: true,
  config: true,
} satisfies Prisma.ChannelSelect;

export const getChannel = reactCache(async (channelId: string): Promise<TChannel> => {
  validateInputs([channelId, ZId]);

  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: selectChannel,
    });

    if (!channel) {
      throw new ResourceNotFoundError("Channel", channelId);
    }

    return channel as TChannel;
  } catch (error) {
    if (error instanceof ResourceNotFoundError) throw error;
    throw new DatabaseError(`Database error when fetching channel ${channelId}`);
  }
});

export const getChannelsByEnvironmentId = reactCache(async (environmentId: string): Promise<TChannel[]> => {
  validateInputs([environmentId, ZId]);

  try {
    const channels = await prisma.channel.findMany({
      where: { environmentId },
      select: selectChannel,
      orderBy: { createdAt: "asc" },
    });

    return channels as TChannel[];
  } catch (error) {
    throw new DatabaseError(`Database error when fetching channels for environment ${environmentId}`);
  }
});

export const createChannel = async (
  environmentId: string,
  channelInput: TChannelCreateInput
): Promise<TChannel> => {
  validateInputs([environmentId, ZId], [channelInput, ZChannelCreateInput]);

  // Apply default config if not provided
  const config = channelInput.config ?? getDefaultChannelConfig(channelInput.type);

  // Validate config type matches channel type
  if (channelInput.config && channelInput.config.type !== channelInput.type) {
    throw new InvalidInputError("Channel config type must match channel type");
  }

  try {
    const channel = await prisma.channel.create({
      data: {
        name: channelInput.name,
        type: channelInput.type,
        description: channelInput.description ?? null,
        environmentId,
        config: config as unknown as Prisma.InputJsonValue,
      },
      select: selectChannel,
    });

    return channel as TChannel;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new InvalidInputError(
          `A channel with the name "${channelInput.name}" already exists in this environment`
        );
      }
    }
    logger.error(error, "Error creating channel");
    throw new DatabaseError(`Database error when creating channel`);
  }
};

export const updateChannel = async (
  channelId: string,
  channelInput: TChannelUpdateInput
): Promise<TChannel> => {
  validateInputs([channelId, ZId], [channelInput, ZChannelUpdateInput]);

  try {
    const existingChannel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { type: true },
    });

    if (!existingChannel) {
      throw new ResourceNotFoundError("Channel", channelId);
    }

    // Validate config type matches channel type if config is being updated
    if (channelInput.config && channelInput.config.type !== existingChannel.type) {
      throw new InvalidInputError("Channel config type must match channel type");
    }

    const data: Prisma.ChannelUpdateInput = {};
    if (channelInput.name !== undefined) data.name = channelInput.name;
    if (channelInput.description !== undefined) data.description = channelInput.description;
    if (channelInput.config !== undefined) {
      data.config = channelInput.config as unknown as Prisma.InputJsonValue;
    }

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data,
      select: selectChannel,
    });

    return channel as TChannel;
  } catch (error) {
    if (error instanceof ResourceNotFoundError || error instanceof InvalidInputError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new InvalidInputError("A channel with this name already exists in this environment");
      }
    }
    logger.error(error, "Error updating channel");
    throw new DatabaseError(`Database error when updating channel ${channelId}`);
  }
};

export const deleteChannel = async (channelId: string): Promise<TChannel> => {
  validateInputs([channelId, ZId]);

  try {
    // Check if channel has surveys
    const surveyCount = await prisma.survey.count({
      where: { channelId },
    });

    if (surveyCount > 0) {
      throw new InvalidInputError(
        `Cannot delete channel: ${surveyCount} survey(s) are still assigned to it. Reassign or delete them first.`
      );
    }

    const channel = await prisma.channel.delete({
      where: { id: channelId },
      select: selectChannel,
    });

    return channel as TChannel;
  } catch (error) {
    if (error instanceof InvalidInputError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("Channel", channelId);
      }
    }
    logger.error(error, "Error deleting channel");
    throw new DatabaseError(`Database error when deleting channel ${channelId}`);
  }
};

/**
 * Ensure default channels exist for an environment.
 * Called during environment setup or migration.
 */
export const ensureDefaultChannels = async (environmentId: string): Promise<void> => {
  validateInputs([environmentId, ZId]);

  const existingChannels = await prisma.channel.findMany({
    where: { environmentId },
    select: { type: true },
  });

  const existingTypes = new Set(existingChannels.map((c) => c.type));

  const defaults: Array<{ name: string; type: "web" | "link" }> = [
    { name: "Default Web", type: "web" },
    { name: "Default Link", type: "link" },
  ];

  for (const def of defaults) {
    if (!existingTypes.has(def.type)) {
      await createChannel(environmentId, {
        name: def.name,
        type: def.type,
      });
    }
  }
};
