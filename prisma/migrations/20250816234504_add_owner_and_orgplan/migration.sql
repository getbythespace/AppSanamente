-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('SOLO', 'TEAM', 'TRIAL');

-- AlterEnum
ALTER TYPE "RoleType" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" "OrgPlan" NOT NULL DEFAULT 'TEAM';

-- CreateIndex
CREATE INDEX "Organization_plan_idx" ON "Organization"("plan");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
