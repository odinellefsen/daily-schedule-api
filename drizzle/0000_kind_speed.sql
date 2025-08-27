CREATE TABLE "food_item_units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"food_item_id" uuid NOT NULL,
	"unit_of_measurement" text NOT NULL,
	"unit_description" text,
	"calories" integer NOT NULL,
	"protein_in_grams" integer,
	"carbohydrates_in_grams" integer,
	"fat_in_grams" integer,
	"fiber_in_grams" integer,
	"sugar_in_grams" integer,
	"sodium_in_milligrams" integer,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_hierarchy" text[],
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meal_id" uuid NOT NULL,
	"recipe_id" uuid,
	"ingredient_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meal_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"original_recipe_step_id" uuid NOT NULL,
	"instruction" text NOT NULL,
	"step_number" integer NOT NULL,
	"is_step_completed" boolean DEFAULT false NOT NULL,
	"estimated_duration_minutes" integer,
	"assigned_to_date" text,
	"todo_id" uuid,
	"ingredients_used_in_step" text
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meal_name" text NOT NULL,
	"scheduled_to_be_eaten_at" timestamp,
	"has_meal_been_consumed" boolean DEFAULT false NOT NULL,
	"recipes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_steps_food_item_units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_step_id" uuid,
	"food_item_unit_id" uuid NOT NULL,
	"quantity" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_id" uuid,
	"step" text NOT NULL,
	"step_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name_of_the_recipe" text NOT NULL,
	"general_description_of_the_recipe" text,
	"when_is_it_consumed" text[],
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"scheduled_for" timestamp,
	"completed_at" timestamp,
	"relations" text
);
--> statement-breakpoint
ALTER TABLE "food_item_units" ADD CONSTRAINT "food_item_units_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_steps" ADD CONSTRAINT "meal_steps_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_steps_food_item_units" ADD CONSTRAINT "recipe_steps_food_item_units_recipe_step_id_recipe_steps_id_fk" FOREIGN KEY ("recipe_step_id") REFERENCES "public"."recipe_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;