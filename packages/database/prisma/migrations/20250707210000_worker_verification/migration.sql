-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "verifiedById" TEXT;

-- AlterTable WorkerDocument
ALTER TABLE "WorkerDocument" ADD COLUMN "status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "WorkerDocument" ADD COLUMN "rejectReason" TEXT;
ALTER TABLE "WorkerDocument" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "WorkerDocument" ADD COLUMN "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "WorkerDocument_workerId_status_idx" ON "WorkerDocument"("workerId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerDocument" ADD CONSTRAINT "WorkerDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
