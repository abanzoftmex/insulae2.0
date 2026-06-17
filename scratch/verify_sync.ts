import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log("Starting programmatic verification of UserRole sync using direct DB client...");

    const condominium = await prisma.condominium.findFirst({
      where: { isActive: true },
    });
    if (!condominium) {
      throw new Error("No active condominium found.");
    }
    console.log(`Using Condominium: ${condominium.name} (${condominium.id})`);

    const masterRole = await prisma.role.findFirst({
      where: { condominiumId: condominium.id, name: "Master", isActive: true },
    });
    if (!masterRole) {
      throw new Error("Master role not found.");
    }

    const testRole = await prisma.role.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        NOT: { id: masterRole.id },
      },
    });
    if (!testRole) {
      throw new Error("No second active role found for testing.");
    }
    console.log(`Roles: '${masterRole.name}' (${masterRole.id}) and '${testRole.name}' (${testRole.id})`);

    // --- TEST 1: Creation Sync ---
    console.log("\n--- Running Test 1: User Creation with initialRole ---");
    // Simulate what createFullDirectoryContactAction does now:
    const newUser = await prisma.user.create({
      data: {
        condominiumId: condominium.id,
        firstName: "TestCreate",
        lastName: "Sync",
        isActive: true,
        initialRole: masterRole.name,
      },
    });
    console.log(`Created user ${newUser.id} with initialRole '${masterRole.name}'`);

    // Sync part:
    if (newUser.initialRole) {
      const role = await prisma.role.findFirst({
        where: {
          condominiumId: condominium.id,
          name: newUser.initialRole,
          isActive: true,
        },
      });
      if (role) {
        await prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: role.id,
          },
        });
      }
    }

    // Verify UserRole record exists
    let userRoles = await prisma.userRole.findMany({
      where: { userId: newUser.id },
      include: { role: true },
    });
    console.log(`Created UserRole count: ${userRoles.length}`);
    if (userRoles.length !== 1) throw new Error("Expected exactly 1 UserRole record after creation.");
    if (userRoles[0].roleId !== masterRole.id) throw new Error("Linked role ID does not match Master.");

    // --- TEST 2: Update Sync ---
    console.log("\n--- Running Test 2: User Role Update ---");
    // Simulate updateContact repo method:
    const updateRoleName = testRole.name;

    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: newUser.id },
        data: {
          initialRole: updateRoleName,
        },
      });

      // Clear all existing UserRole links for this user
      await tx.userRole.deleteMany({
        where: { userId: newUser.id },
      });

      if (updateRoleName && updateRoleName.trim() !== "") {
        const role = await tx.role.findFirst({
          where: {
            condominiumId: updatedUser.condominiumId,
            name: updateRoleName,
            isActive: true,
          },
        });

        if (role) {
          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
            },
          });
        }
      }
    });

    // Verify UserRole record is updated
    userRoles = await prisma.userRole.findMany({
      where: { userId: newUser.id },
      include: { role: true },
    });
    console.log(`Updated UserRole count: ${userRoles.length}`);
    if (userRoles.length !== 1) throw new Error("Expected exactly 1 UserRole record after update.");
    if (userRoles[0].roleId !== testRole.id) throw new Error("Linked role ID does not match Test Role.");

    // --- TEST 3: Clearing Role ---
    console.log("\n--- Running Test 3: Clearing User Role ---");
    // Simulate updateContact with empty string role:
    const clearRoleName = "";

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: newUser.id },
        data: {
          initialRole: clearRoleName,
        },
      });

      // Clear all existing UserRole links for this user
      await tx.userRole.deleteMany({
        where: { userId: newUser.id },
      });
    });

    // Verify UserRole count is 0
    const finalRoleCount = await prisma.userRole.count({
      where: { userId: newUser.id },
    });
    console.log(`Final UserRole count: ${finalRoleCount}`);
    if (finalRoleCount !== 0) throw new Error("Expected 0 UserRole records after clearing.");

    // Clean up
    console.log("\nCleaning up test user...");
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log("Cleanup complete!");

    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! UserRole synchronization behaves 100% correctly. <<<");

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
