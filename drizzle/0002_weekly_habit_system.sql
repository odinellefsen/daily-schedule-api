-- Add instanceId column to todos table
ALTER TABLE "todos" ADD COLUMN "instance_id" uuid;

-- Update habits table structure for weekly system
ALTER TABLE "habits" DROP COLUMN IF EXISTS "name";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "description";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "sub_entity_id";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "entity_name";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "sub_entity_name";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "week_days";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "monthly_day";
ALTER TABLE "habits" DROP COLUMN IF EXISTS "preferred_time";

ALTER TABLE "habits" ADD COLUMN "entity_name" text NOT NULL DEFAULT '';
ALTER TABLE "habits" ADD COLUMN "target_weekday" text NOT NULL DEFAULT 'monday';
ALTER TABLE "habits" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;

-- Create habit_triggers table
CREATE TABLE "habit_triggers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"habit_id" uuid NOT NULL,
	"trigger_sub_entity_id" uuid,
	"trigger_weekday" text NOT NULL
);

-- Create habit_subentities table
CREATE TABLE "habit_subentities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"habit_id" uuid NOT NULL,
	"sub_entity_id" uuid,
	"sub_entity_name" text NOT NULL,
	"scheduled_weekday" text NOT NULL,
	"scheduled_time" text,
	"is_main_event" boolean DEFAULT false NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "habit_triggers" ADD CONSTRAINT "habit_triggers_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "habit_subentities" ADD CONSTRAINT "habit_subentities_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
