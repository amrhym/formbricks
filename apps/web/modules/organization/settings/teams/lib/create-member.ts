import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@hivecfm/database";
import { DatabaseError, InvalidInputError, ValidationError } from "@hivecfm/types/errors";
import { TOrganizationRole } from "@hivecfm/types/memberships";
import { hashPassword } from "@/lib/auth";
import { getMembershipByUserIdOrganizationId } from "@/lib/membership/service";
import { getAccessFlags } from "@/lib/membership/utils";

interface CreateMemberDirectlyInput {
  organizationId: string;
  name: string;
  email: string;
  password: string;
  role: TOrganizationRole;
  teamIds: string[];
}

export const createMemberDirectly = async ({
  organizationId,
  name,
  email,
  password,
  role,
  teamIds,
}: CreateMemberDirectlyInput): Promise<string> => {
  try {
    const teamIdsSet = new Set(teamIds);
    if (teamIdsSet.size !== teamIds.length) {
      throw new ValidationError("teamIds must be unique");
    }

    if (teamIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          organizationId,
        },
      });

      if (teams.length !== teamIds.length) {
        throw new ValidationError("Invalid teamIds");
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const existingMembership = await getMembershipByUserIdOrganizationId(existingUser.id, organizationId);

      if (existingMembership) {
        throw new InvalidInputError("User is already a member of this organization");
      }

      // User exists but isn't in this org — add membership
      await prisma.membership.create({
        data: {
          userId: existingUser.id,
          organizationId,
          accepted: true,
          role,
        },
      });

      await createTeamAssignments(existingUser.id, role, teamIds);

      return existingUser.id;
    }

    // Create new user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        identityProvider: "email",
        emailVerified: new Date(),
      },
      select: {
        id: true,
      },
    });

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        accepted: true,
        role,
      },
    });

    await createTeamAssignments(user.id, role, teamIds);

    return user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

const createTeamAssignments = async (
  userId: string,
  role: TOrganizationRole,
  teamIds: string[]
): Promise<void> => {
  const { isOwner, isManager } = getAccessFlags(role);
  const isOwnerOrManager = isOwner || isManager;

  for (const teamId of teamIds) {
    await prisma.teamUser.create({
      data: {
        teamId,
        userId,
        role: isOwnerOrManager ? "admin" : "contributor",
      },
    });
  }
};
