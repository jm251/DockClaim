-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'OPS', 'BILLING', 'VIEWER');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('IMPORTED', 'INCOMPLETE', 'READY', 'IN_REVIEW', 'CLAIMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CSV', 'MANUAL', 'API_FUTURE');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOL', 'POD', 'LUMPER_RECEIPT', 'RATE_CONFIRMATION', 'EMAIL_SCREENSHOT', 'CHECKIN_SCREENSHOT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'NEEDS_REVIEW', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccessorialType" AS ENUM ('DETENTION', 'LAYOVER', 'TONU', 'LUMPER');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'MISSING_EVIDENCE', 'NOT_ELIGIBLE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENT', 'PARTIAL_PAID', 'PAID', 'DISPUTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ClaimMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INACTIVE', 'UNCONFIGURED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DetentionRoundingMode" AS ENUM ('UP', 'NEAREST', 'DOWN');

-- CreateEnum
CREATE TYPE "LumperReimbursementMode" AS ENUM ('ACTUAL', 'CAPPED_ACTUAL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingEmail" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "timezone" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "facilityId" TEXT,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "detentionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "detentionFreeMinutes" INTEGER NOT NULL DEFAULT 120,
    "detentionRatePerHour" DECIMAL(10,2) NOT NULL DEFAULT 75.0,
    "detentionBillingIncrementMinutes" INTEGER NOT NULL DEFAULT 60,
    "detentionRoundingMode" "DetentionRoundingMode" NOT NULL DEFAULT 'UP',
    "detentionCapAmount" DECIMAL(10,2),
    "layoverEnabled" BOOLEAN NOT NULL DEFAULT true,
    "layoverFlatAmount" DECIMAL(10,2) NOT NULL DEFAULT 250.0,
    "tonuEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tonuFlatAmount" DECIMAL(10,2) NOT NULL DEFAULT 150.0,
    "lumperEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lumperReimbursementMode" "LumperReimbursementMode" NOT NULL DEFAULT 'ACTUAL',
    "lumperCapAmount" DECIMAL(10,2),
    "notes" TEXT,
    "effectiveStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalLoadNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "carrierId" TEXT,
    "facilityId" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'IMPORTED',
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "commodity" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'CSV',
    "sourceFileName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "type" "StopType" NOT NULL,
    "facilityName" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "timezone" TEXT NOT NULL,
    "appointmentStart" TIMESTAMP(3),
    "appointmentEnd" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3),
    "checkInTime" TIMESTAMP(3),
    "dockInTime" TIMESTAMP(3),
    "loadedOutTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "documentType" "DocumentType",
    "uploadedByUserId" TEXT NOT NULL,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractionConfidence" DECIMAL(5,2),
    "rawExtractionJson" JSONB,
    "reviewedExtractionJson" JSONB,
    "extractionError" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "confidence" DECIMAL(5,2),
    "sourcePage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessorialCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "stopId" TEXT,
    "type" "AccessorialType" NOT NULL,
    "eligibilityStatus" "EligibilityStatus" NOT NULL,
    "calculatedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "explanation" TEXT NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "calculationJson" JSONB,
    "ruleSetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessorialCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimLineItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "candidateId" TEXT,
    "accessorialType" "AccessorialType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimMessage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "direction" "ClaimMessageDirection" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvImportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvMappingTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvMappingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_status_idx" ON "Customer"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_name_key" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Facility_organizationId_customerId_idx" ON "Facility"("organizationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_organizationId_customerId_name_key" ON "Facility"("organizationId", "customerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_organizationId_name_key" ON "Carrier"("organizationId", "name");

-- CreateIndex
CREATE INDEX "RuleSet_organizationId_customerId_facilityId_active_idx" ON "RuleSet"("organizationId", "customerId", "facilityId", "active");

-- CreateIndex
CREATE INDEX "Load_organizationId_status_idx" ON "Load"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Load_organizationId_pickupDate_idx" ON "Load"("organizationId", "pickupDate");

-- CreateIndex
CREATE UNIQUE INDEX "Load_organizationId_externalLoadNumber_key" ON "Load"("organizationId", "externalLoadNumber");

-- CreateIndex
CREATE INDEX "Stop_loadId_type_idx" ON "Stop"("loadId", "type");

-- CreateIndex
CREATE INDEX "Document_organizationId_loadId_extractionStatus_idx" ON "Document"("organizationId", "loadId", "extractionStatus");

-- CreateIndex
CREATE INDEX "ExtractedField_documentId_fieldName_idx" ON "ExtractedField"("documentId", "fieldName");

-- CreateIndex
CREATE INDEX "AccessorialCandidate_organizationId_loadId_type_idx" ON "AccessorialCandidate"("organizationId", "loadId", "type");

-- CreateIndex
CREATE INDEX "AccessorialCandidate_organizationId_eligibilityStatus_idx" ON "AccessorialCandidate"("organizationId", "eligibilityStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_loadId_key" ON "Claim"("loadId");

-- CreateIndex
CREATE INDEX "Claim_organizationId_status_idx" ON "Claim"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_organizationId_claimNumber_key" ON "Claim"("organizationId", "claimNumber");

-- CreateIndex
CREATE INDEX "ClaimLineItem_claimId_idx" ON "ClaimLineItem"("claimId");

-- CreateIndex
CREATE INDEX "ClaimMessage_claimId_direction_idx" ON "ClaimMessage"("claimId", "direction");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_idx" ON "AuditLog"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_status_idx" ON "Invitation"("organizationId", "email", "status");

-- CreateIndex
CREATE INDEX "CsvImportJob_organizationId_createdAt_idx" ON "CsvImportJob"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CsvMappingTemplate_organizationId_name_key" ON "CsvMappingTemplate"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedField" ADD CONSTRAINT "ExtractedField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorialCandidate" ADD CONSTRAINT "AccessorialCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorialCandidate" ADD CONSTRAINT "AccessorialCandidate_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorialCandidate" ADD CONSTRAINT "AccessorialCandidate_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessorialCandidate" ADD CONSTRAINT "AccessorialCandidate_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "RuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimLineItem" ADD CONSTRAINT "ClaimLineItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimLineItem" ADD CONSTRAINT "ClaimLineItem_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AccessorialCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMessage" ADD CONSTRAINT "ClaimMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvImportJob" ADD CONSTRAINT "CsvImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvMappingTemplate" ADD CONSTRAINT "CsvMappingTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

