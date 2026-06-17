import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const canonicalId = "71481041-54c1-4953-be19-473e1360241c";
  const duplicateId = "7a3f1728-8bfd-4b54-bb38-54aa59642db0";

  try {
    console.log("Starting role merge and cleanup...");

    const canonicalRole = await prisma.role.findUnique({ where: { id: canonicalId } });
    const duplicateRole = await prisma.role.findUnique({ where: { id: duplicateId } });

    if (!canonicalRole) {
      throw new Error(`Canonical role with ID ${canonicalId} not found.`);
    }

    if (!duplicateRole) {
      console.log(`Duplicate role with ID ${duplicateId} not found. Maybe already cleaned up?`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Reassign user roles
      const userRoles = await tx.userRole.findMany({
        where: { roleId: duplicateId },
      });

      console.log(`Found ${userRoles.length} user-role links for duplicate role.`);

      for (const ur of userRoles) {
        // Check if user already has canonical role link
        const existingLink = await tx.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: ur.userId,
              roleId: canonicalId,
            },
          },
        });

        if (existingLink) {
          console.log(`User ${ur.userId} already has canonical role link. Deleting duplicate link.`);
          await tx.userRole.delete({
            where: { id: ur.id },
          });
        } else {
          console.log(`Reassigning user ${ur.userId} from duplicate role to canonical role.`);
          await tx.userRole.update({
            where: { id: ur.id },
            data: { roleId: canonicalId },
          });
        }
      }

      // 2. Clean up trailing space in canonical role name
      console.log(`Renaming canonical role to 'Master' (trimming trailing space)...`);
      await tx.role.update({
        where: { id: canonicalId },
        data: {
          name: "Master",
        },
      });

      // 3. Update initialRole field for any users with "Master " or "Master"
      console.log(`Updating user initialRole references...`);
      const updatedUsers1 = await tx.user.updateMany({
        where: { initialRole: "Master " },
        data: { initialRole: "Master" },
      });
      console.log(`Updated ${updatedUsers1.count} users with initialRole "Master "`);

      // 4. Delete duplicate role permissions
      console.log(`Deleting permissions for duplicate role...`);
      const deletedPerms = await tx.rolePermission.deleteMany({
        where: { roleId: duplicateId },
      });
      console.log(`Deleted ${deletedPerms.count} permission links.`);

      // 5. Delete duplicate role
      console.log(`Deleting duplicate role...`);
      await tx.role.delete({
        where: { id: duplicateId },
      });

      console.log("Merge and cleanup transaction completed successfully!");
    });

  } catch (error) {
    console.error("Error cleaning up roles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
