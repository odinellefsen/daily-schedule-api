-- Remove occurrence_id foreign key from todos table
ALTER TABLE "todos" DROP COLUMN IF EXISTS "occurrence_id";

-- Drop occurrences table if it exists
DROP TABLE IF EXISTS "occurrences";
