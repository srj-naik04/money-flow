CREATE TYPE "public"."deposit_status" AS ENUM('active', 'matured', 'closed');--> statement-breakpoint
CREATE TYPE "public"."deposit_type" AS ENUM('fd', 'rd');--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "deposit_type" NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"principal_amount" bigint NOT NULL,
	"interest_rate_bps" integer DEFAULT 0 NOT NULL,
	"start_date" date NOT NULL,
	"tenure_months" integer NOT NULL,
	"maturity_date" date NOT NULL,
	"maturity_amount" bigint NOT NULL,
	"status" "deposit_status" DEFAULT 'active' NOT NULL,
	"account_id" uuid,
	"project_id" uuid,
	"anchor_date" date,
	"anchor_day" integer,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"auto_post" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dep_principal_pos" CHECK ("deposits"."principal_amount" > 0),
	CONSTRAINT "dep_tenure_pos" CHECK ("deposits"."tenure_months" > 0),
	CONSTRAINT "dep_rate_nonneg" CHECK ("deposits"."interest_rate_bps" >= 0),
	CONSTRAINT "dep_installments_valid" CHECK ("deposits"."installments_paid" >= 0 AND ("deposits"."type" <> 'rd' OR "deposits"."installments_paid" <= "deposits"."tenure_months")),
	CONSTRAINT "dep_rd_anchor" CHECK ("deposits"."type" <> 'rd' OR "deposits"."anchor_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "recurring_items" ADD COLUMN "gross_salary" bigint;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dep_status_idx" ON "deposits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dep_type_idx" ON "deposits" USING btree ("type");--> statement-breakpoint
CREATE INDEX "dep_maturity_idx" ON "deposits" USING btree ("maturity_date");--> statement-breakpoint
CREATE INDEX "dep_project_idx" ON "deposits" USING btree ("project_id");