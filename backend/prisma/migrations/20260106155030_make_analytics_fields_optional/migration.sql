-- AlterTable
ALTER TABLE "FeedbackAnalyticsCache" ALTER COLUMN "avgMarks" DROP NOT NULL,
ALTER COLUMN "marksBand" DROP NOT NULL,
ALTER COLUMN "alignmentIndex" DROP NOT NULL;
