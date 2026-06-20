CREATE TYPE "public"."account_type" AS ENUM('bank', 'cash', 'credit_card', 'wallet', 'upi', 'other');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'quarterly', 'half_yearly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."investment_type" AS ENUM('stock', 'mutual_fund', 'crypto', 'gold', 'fd', 'rd', 'bond', 'real_estate', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sub_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."txn_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"icon" text,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"icon" text,
	"color" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'bank' NOT NULL,
	"opening_balance" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "txn_type" NOT NULL,
	"project_id" uuid,
	"category_id" uuid,
	"account_id" uuid,
	"occurred_at" date NOT NULL,
	"gross_amount" bigint NOT NULL,
	"base_amount" bigint NOT NULL,
	"gst_amount" bigint DEFAULT 0 NOT NULL,
	"gst_rate_bps" integer DEFAULT 0 NOT NULL,
	"gst_included" boolean DEFAULT false NOT NULL,
	"signed_amount" bigint NOT NULL,
	"vendor" text,
	"notes" text,
	"transfer_account_id" uuid,
	"transfer_project_id" uuid,
	"client_id" text NOT NULL,
	"dedupe_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "tx_gst_reconciles" CHECK ("transactions"."base_amount" + "transactions"."gst_amount" = "transactions"."gross_amount"),
	CONSTRAINT "tx_amounts_nonneg" CHECK ("transactions"."gross_amount" >= 0 AND "transactions"."base_amount" >= 0 AND "transactions"."gst_amount" >= 0),
	CONSTRAINT "tx_signed_amount" CHECK (("transactions"."type" = 'income' AND "transactions"."signed_amount" = "transactions"."gross_amount")
        OR ("transactions"."type" = 'expense' AND "transactions"."signed_amount" = -"transactions"."gross_amount")
        OR ("transactions"."type" = 'transfer' AND "transactions"."signed_amount" = 0))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"base_amount" bigint NOT NULL,
	"gst_amount" bigint DEFAULT 0 NOT NULL,
	"gst_rate_bps" integer DEFAULT 0 NOT NULL,
	"gst_included" boolean DEFAULT false NOT NULL,
	"billing_cycle" "billing_cycle" NOT NULL,
	"anchor_date" date NOT NULL,
	"status" "sub_status" DEFAULT 'active' NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"project_id" uuid,
	"category_id" uuid,
	"notes" text,
	"cancelled_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subs_gst_reconciles" CHECK ("subscriptions"."base_amount" + "subscriptions"."gst_amount" = "subscriptions"."amount"),
	CONSTRAINT "subs_amount_nonneg" CHECK ("subscriptions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "investment_type" NOT NULL,
	"project_id" uuid,
	"invested_amount" bigint NOT NULL,
	"current_value" bigint NOT NULL,
	"purchase_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investments_amounts_nonneg" CHECK ("investments"."invested_amount" >= 0 AND "investments"."current_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "investment_value_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investment_id" uuid NOT NULL,
	"value" bigint NOT NULL,
	"valued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"default_project_id" uuid,
	"fy_start_month" integer DEFAULT 4 NOT NULL,
	"week_starts_on" integer DEFAULT 1 NOT NULL,
	"default_gst_rate_bps" integer DEFAULT 1800 NOT NULL,
	"large_payment_threshold" bigint,
	"currency" text DEFAULT 'INR' NOT NULL,
	"locale" text DEFAULT 'en-IN' NOT NULL,
	"include_archived_in_totals" boolean DEFAULT false NOT NULL,
	"last_backup_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_account_id_accounts_id_fk" FOREIGN KEY ("transfer_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_project_id_projects_id_fk" FOREIGN KEY ("transfer_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_value_history" ADD CONSTRAINT "investment_value_history_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_default_project_id_projects_id_fk" FOREIGN KEY ("default_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_archived_idx" ON "projects" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "projects_sort_idx" ON "projects" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_kind_uq" ON "categories" USING btree (lower("name"),"kind");--> statement-breakpoint
CREATE INDEX "categories_kind_idx" ON "categories" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "accounts_type_idx" ON "accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tx_project_date_idx" ON "transactions" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "tx_occurred_id_idx" ON "transactions" USING btree ("occurred_at","id");--> statement-breakpoint
CREATE INDEX "tx_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tx_category_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "tx_dedupe_idx" ON "transactions" USING btree ("dedupe_hash");--> statement-breakpoint
CREATE INDEX "subs_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subs_project_idx" ON "subscriptions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "subs_anchor_idx" ON "subscriptions" USING btree ("anchor_date");--> statement-breakpoint
CREATE INDEX "investments_type_idx" ON "investments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "investments_project_idx" ON "investments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ivh_investment_idx" ON "investment_value_history" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX "ivh_valued_at_idx" ON "investment_value_history" USING btree ("valued_at");