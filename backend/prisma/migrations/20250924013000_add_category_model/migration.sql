-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2196f3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- Insert default categories
INSERT INTO "Category" ("id", "name", "description", "color", "createdAt", "updatedAt") VALUES
('cat-1', 'Herramientas', 'Herramientas manuales y eléctricas', '#ff9800', NOW(), NOW()),
('cat-2', 'Materiales', 'Materiales de construcción y electricidad', '#4caf50', NOW(), NOW()),
('cat-3', 'Equipos', 'Equipos y maquinaria', '#2196f3', NOW(), NOW()),
('cat-4', 'Consumibles', 'Productos consumibles y repuestos', '#9c27b0', NOW(), NOW());

-- Add categoryId column to Stock table (nullable first)
ALTER TABLE "Stock" ADD COLUMN "categoryId" TEXT;

-- Update existing Stock records to use default category
UPDATE "Stock" SET "categoryId" = 'cat-1' WHERE "categoryId" IS NULL;

-- Make categoryId required
ALTER TABLE "Stock" ALTER COLUMN "categoryId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create index for categoryId
CREATE INDEX "Stock_categoryId_idx" ON "Stock"("categoryId");

-- Drop the old category column
ALTER TABLE "Stock" DROP COLUMN "category";
