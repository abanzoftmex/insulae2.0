/*
  Warnings:

  - A unique constraint covering the columns `[condominiumId,legacyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `condominiumId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INDIVIDUAL', 'LEGAL_ENTITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MigrationRunStatus" AS ENUM ('CREATED', 'RUNNING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MigrationValidationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "condominiumId" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'INDIVIDUAL',
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Condominium" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condominium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateArea" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "subzone" TEXT,
    "street" TEXT,
    "useType" TEXT,
    "m2Original" DECIMAL(12,4),
    "m2Apole" DECIMAL(12,4),
    "indiviso" DECIMAL(12,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentAssignment" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "privateAreaId" TEXT NOT NULL,
    "roleName" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ResidentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "privateAreaId" TEXT NOT NULL,
    "tenantName" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT,
    "notes" TEXT,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeGroup" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "chargeType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChargeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaCharge" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "privateAreaId" TEXT NOT NULL,
    "chargeGroupId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AreaCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "privateAreaId" TEXT NOT NULL,
    "chargeGroupId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "LedgerStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "year" INTEGER NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "concept" TEXT NOT NULL,
    "groupName" TEXT,
    "annualAmount" DECIMAL(14,2),

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetMonth" (
    "id" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "BudgetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "title" TEXT NOT NULL,
    "meetingType" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSession" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "MeetingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "privateAreaId" TEXT NOT NULL,
    "attendanceType" TEXT,
    "coefficient" DECIMAL(12,6),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "meetingSessionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "voteType" TEXT,
    "votesFor" INTEGER,
    "votesAgainst" INTEGER,
    "votesAbstain" INTEGER,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "privateAreaId" TEXT,
    "openedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSnapshot" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" "MigrationRunStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyStagingRow" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "legacyTable" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transformedAt" TIMESTAMP(3),
    "loadedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "promotionError" TEXT,

    CONSTRAINT "LegacyStagingRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationIdMap" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "legacyTable" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationIdMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationValidationResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "sourceCount" INTEGER NOT NULL,
    "stagingCount" INTEGER NOT NULL,
    "finalCount" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "severity" "MigrationValidationSeverity" NOT NULL DEFAULT 'INFO',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Condominium_legacyId_key" ON "Condominium"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Condominium_slug_key" ON "Condominium"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "PrivateArea_condominiumId_idx" ON "PrivateArea"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateArea_condominiumId_legacyId_key" ON "PrivateArea"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "ResidentAssignment_condominiumId_idx" ON "ResidentAssignment"("condominiumId");

-- CreateIndex
CREATE INDEX "ResidentAssignment_userId_idx" ON "ResidentAssignment"("userId");

-- CreateIndex
CREATE INDEX "ResidentAssignment_privateAreaId_idx" ON "ResidentAssignment"("privateAreaId");

-- CreateIndex
CREATE INDEX "Rental_condominiumId_idx" ON "Rental"("condominiumId");

-- CreateIndex
CREATE INDEX "Rental_privateAreaId_idx" ON "Rental"("privateAreaId");

-- CreateIndex
CREATE INDEX "ChargeGroup_condominiumId_idx" ON "ChargeGroup"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeGroup_condominiumId_legacyId_key" ON "ChargeGroup"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "AreaCharge_condominiumId_idx" ON "AreaCharge"("condominiumId");

-- CreateIndex
CREATE INDEX "AreaCharge_privateAreaId_idx" ON "AreaCharge"("privateAreaId");

-- CreateIndex
CREATE INDEX "AreaCharge_chargeGroupId_idx" ON "AreaCharge"("chargeGroupId");

-- CreateIndex
CREATE INDEX "Charge_condominiumId_periodYear_periodMonth_idx" ON "Charge"("condominiumId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Charge_privateAreaId_idx" ON "Charge"("privateAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_condominiumId_legacyId_key" ON "Charge"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "Payment_condominiumId_paidAt_idx" ON "Payment"("condominiumId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_condominiumId_legacyId_key" ON "Payment"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_chargeId_idx" ON "PaymentAllocation"("chargeId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "Income_condominiumId_date_idx" ON "Income"("condominiumId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Income_condominiumId_legacyId_key" ON "Income"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "Expense_condominiumId_date_idx" ON "Expense"("condominiumId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_condominiumId_legacyId_key" ON "Expense"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_condominiumId_year_key" ON "Budget"("condominiumId", "year");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "BudgetLine"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMonth_budgetLineId_month_key" ON "BudgetMonth"("budgetLineId", "month");

-- CreateIndex
CREATE INDEX "Meeting_condominiumId_idx" ON "Meeting"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_condominiumId_legacyId_key" ON "Meeting"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "MeetingSession_meetingId_idx" ON "MeetingSession"("meetingId");

-- CreateIndex
CREATE INDEX "Attendance_meetingSessionId_idx" ON "Attendance"("meetingSessionId");

-- CreateIndex
CREATE INDEX "Attendance_privateAreaId_idx" ON "Attendance"("privateAreaId");

-- CreateIndex
CREATE INDEX "Vote_meetingSessionId_idx" ON "Vote"("meetingSessionId");

-- CreateIndex
CREATE INDEX "Notification_condominiumId_idx" ON "Notification"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_condominiumId_legacyId_key" ON "Notification"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "Ticket_condominiumId_idx" ON "Ticket"("condominiumId");

-- CreateIndex
CREATE INDEX "Ticket_privateAreaId_idx" ON "Ticket"("privateAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_condominiumId_legacyId_key" ON "Ticket"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "Project_condominiumId_idx" ON "Project"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_condominiumId_legacyId_key" ON "Project"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_legacyId_key" ON "ProjectDocument"("projectId", "legacyId");

-- CreateIndex
CREATE INDEX "MigrationRun_status_idx" ON "MigrationRun"("status");

-- CreateIndex
CREATE INDEX "MigrationRun_createdAt_idx" ON "MigrationRun"("createdAt");

-- CreateIndex
CREATE INDEX "LegacyStagingRow_runId_legacyTable_idx" ON "LegacyStagingRow"("runId", "legacyTable");

-- CreateIndex
CREATE INDEX "LegacyStagingRow_runId_promotedAt_idx" ON "LegacyStagingRow"("runId", "promotedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyStagingRow_runId_legacyTable_legacyId_key" ON "LegacyStagingRow"("runId", "legacyTable", "legacyId");

-- CreateIndex
CREATE INDEX "MigrationIdMap_runId_targetEntity_idx" ON "MigrationIdMap"("runId", "targetEntity");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationIdMap_runId_legacyTable_legacyId_targetEntity_key" ON "MigrationIdMap"("runId", "legacyTable", "legacyId", "targetEntity");

-- CreateIndex
CREATE INDEX "MigrationValidationResult_runId_layer_idx" ON "MigrationValidationResult"("runId", "layer");

-- CreateIndex
CREATE INDEX "MigrationValidationResult_runId_severity_idx" ON "MigrationValidationResult"("runId", "severity");

-- CreateIndex
CREATE INDEX "User_condominiumId_idx" ON "User"("condominiumId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_condominiumId_legacyId_key" ON "User"("condominiumId", "legacyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateArea" ADD CONSTRAINT "PrivateArea_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAssignment" ADD CONSTRAINT "ResidentAssignment_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAssignment" ADD CONSTRAINT "ResidentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentAssignment" ADD CONSTRAINT "ResidentAssignment_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeGroup" ADD CONSTRAINT "ChargeGroup_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaCharge" ADD CONSTRAINT "AreaCharge_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaCharge" ADD CONSTRAINT "AreaCharge_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaCharge" ADD CONSTRAINT "AreaCharge_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMonth" ADD CONSTRAINT "BudgetMonth_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSession" ADD CONSTRAINT "MeetingSession_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "MeetingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_meetingSessionId_fkey" FOREIGN KEY ("meetingSessionId") REFERENCES "MeetingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_privateAreaId_fkey" FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyStagingRow" ADD CONSTRAINT "LegacyStagingRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationIdMap" ADD CONSTRAINT "MigrationIdMap_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationValidationResult" ADD CONSTRAINT "MigrationValidationResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
