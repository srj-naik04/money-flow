CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."recurring_flow" AS ENUM('income', 'expense', 'investment');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recurring_template" AS ENUM('salary', 'emi', 'sip');--> statement-breakpoint
CREATE TABLE "recurring_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow" "recurring_flow" NOT NULL,
	"template" "recurring_template" NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"amount" bigint NOT NULL,
	"base_amount" bigint NOT NULL,
	"gst_amount" bigint DEFAULT 0 NOT NULL,
	"gst_rate_bps" integer DEFAULT 0 NOT NULL,
	"gst_included" boolean DEFAULT false NOT NULL,
	"billing_cycle" "billing_cycle" NOT NULL,
	"anchor_date" date NOT NULL,
	"anchor_day" integer,
	"status" "recurring_status" DEFAULT 'active' NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"auto_post" boolean DEFAULT true NOT NULL,
	"account_id" uuid,
	"project_id" uuid,
	"category_id" uuid,
	"principal_amount" bigint,
	"total_installments" integer,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"interest_rate_bps" integer,
	"investment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ri_gst_reconciles" CHECK ("recurring_items"."base_amount" + "recurring_items"."gst_amount" = "recurring_items"."amount"),
	CONSTRAINT "ri_amount_nonneg" CHECK ("recurring_items"."amount" >= 0),
	CONSTRAINT "ri_installments_valid" CHECK ("recurring_items"."installments_paid" >= 0 AND ("recurring_items"."total_installments" IS NULL OR "recurring_items"."installments_paid" <= "recurring_items"."total_installments")),
	CONSTRAINT "ri_template_flow" CHECK (("recurring_items"."template" = 'salary' AND "recurring_items"."flow" = 'income')
        OR ("recurring_items"."template" = 'emi' AND "recurring_items"."flow" = 'expense')
        OR ("recurring_items"."template" = 'sip' AND "recurring_items"."flow" = 'investment')),
	CONSTRAINT "ri_emi_needs_count" CHECK ("recurring_items"."template" <> 'emi' OR "recurring_items"."total_installments" IS NOT NULL),
	CONSTRAINT "ri_sip_needs_investment" CHECK ("recurring_items"."template" <> 'sip' OR "recurring_items"."investment_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"color" text,
	"icon" text,
	"target_amount" bigint NOT NULL,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"linked_account_id" uuid,
	"linked_investment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_pos" CHECK ("goals"."target_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_at" date NOT NULL,
	"note" text,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gc_amount_nonzero" CHECK ("goal_contributions"."amount" <> 0)
);
--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_investment_id_investments_id_fk" FOREIGN KEY ("linked_investment_id") REFERENCES "public"."investments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ri_status_idx" ON "recurring_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ri_template_idx" ON "recurring_items" USING btree ("template");--> statement-breakpoint
CREATE INDEX "ri_project_idx" ON "recurring_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ri_anchor_idx" ON "recurring_items" USING btree ("anchor_date");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gc_goal_idx" ON "goal_contributions" USING btree ("goal_id");