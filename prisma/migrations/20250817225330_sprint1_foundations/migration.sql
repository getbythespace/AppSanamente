-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "public"."SessionNote" ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "editableUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PatientAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,

    CONSTRAINT "PatientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClinicalEntry" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."RoleType" NOT NULL,
    "invitedById" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanLimit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assistantsMax" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientAssignment_organizationId_idx" ON "public"."PatientAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "PatientAssignment_patientId_idx" ON "public"."PatientAssignment"("patientId");

-- CreateIndex
CREATE INDEX "PatientAssignment_psychologistId_idx" ON "public"."PatientAssignment"("psychologistId");

-- CreateIndex
CREATE INDEX "PatientAssignment_status_idx" ON "public"."PatientAssignment"("status");

-- CreateIndex
CREATE INDEX "ClinicalEntry_assignmentId_idx" ON "public"."ClinicalEntry"("assignmentId");

-- CreateIndex
CREATE INDEX "ClinicalEntry_authorId_createdAt_idx" ON "public"."ClinicalEntry"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "public"."Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_role_status_idx" ON "public"."Invitation"("organizationId", "role", "status");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "public"."Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimit_organizationId_key" ON "public"."PlanLimit"("organizationId");

-- CreateIndex
CREATE INDEX "SessionNote_assignmentId_idx" ON "public"."SessionNote"("assignmentId");

-- CreateIndex
CREATE INDEX "SessionNote_patientId_date_idx" ON "public"."SessionNote"("patientId", "date");

-- CreateIndex
CREATE INDEX "SessionNote_psychologistId_date_idx" ON "public"."SessionNote"("psychologistId", "date");

-- AddForeignKey
ALTER TABLE "public"."SessionNote" ADD CONSTRAINT "SessionNote_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."PatientAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientAssignment" ADD CONSTRAINT "PatientAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientAssignment" ADD CONSTRAINT "PatientAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientAssignment" ADD CONSTRAINT "PatientAssignment_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."PatientAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanLimit" ADD CONSTRAINT "PlanLimit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
