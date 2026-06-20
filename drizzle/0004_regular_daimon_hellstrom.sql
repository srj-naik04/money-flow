ALTER TABLE "projects" DROP CONSTRAINT "projects_slug_unique";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_client_id_unique";--> statement-breakpoint
DROP INDEX "categories_name_kind_uq";--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "investment_value_history" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "deposits" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_slug_uq" ON "projects" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_kind_uq" ON "categories" USING btree ("user_id",lower("name"),"kind");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tx_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tx_user_client_uq" ON "transactions" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "subs_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investments_user_idx" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ivh_user_idx" ON "investment_value_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ri_user_idx" ON "recurring_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gc_user_idx" ON "goal_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dep_user_idx" ON "deposits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_user_uq" ON "settings" USING btree ("user_id");