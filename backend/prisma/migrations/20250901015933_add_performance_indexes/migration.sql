-- CreateIndex
CREATE INDEX "Building_administratorId_idx" ON "Building"("administratorId");

-- CreateIndex
CREATE INDEX "Building_name_idx" ON "Building"("name");

-- CreateIndex
CREATE INDEX "Building_locality_idx" ON "Building"("locality");

-- CreateIndex
CREATE INDEX "Building_administratorId_name_idx" ON "Building"("administratorId", "name");
