import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const counts = await sql`
    select
      (select count(*) from projects) as projects,
      (select count(*) from categories) as categories,
      (select count(*) from accounts) as accounts,
      (select count(*) from transactions) as transactions,
      (select count(*) from subscriptions) as subscriptions,
      (select count(*) from investments) as investments,
      (select count(*) from investment_value_history) as history`;
  console.log("Row counts:", counts[0]);

  const bad = await sql`select count(*) as n from transactions where base_amount + gst_amount <> gross_amount`;
  console.log("GST reconciliation violations:", bad[0].n);

  const totals = await sql`
    select
      coalesce(sum(case when type='income' then gross_amount else 0 end),0) as income_paise,
      coalesce(sum(case when type='expense' then gross_amount else 0 end),0) as expense_paise,
      coalesce(sum(gst_amount),0) as gst_paise,
      coalesce(sum(signed_amount),0) as net_flow_paise
    from transactions`;
  const t = totals[0] as Record<string, number>;
  console.log("Income ₹", Number(t.income_paise) / 100);
  console.log("Expense ₹", Number(t.expense_paise) / 100);
  console.log("GST paid ₹", Number(t.gst_paise) / 100);
  console.log("Net flow ₹", Number(t.net_flow_paise) / 100);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
