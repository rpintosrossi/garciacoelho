-- AlterTable
ALTER TABLE "Building" ADD COLUMN     "apartments" INTEGER,
ADD COLUMN     "debtThreshold" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "doormanType" TEXT,
ADD COLUMN     "floors" INTEGER,
ADD COLUMN     "generalInfo" TEXT,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "managerPhone" TEXT,
ADD COLUMN     "phones" TEXT[],
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 1;
