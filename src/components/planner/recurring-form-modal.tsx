"use client";

import { FormModal } from "@/components/forms/form-modal";
import { RecurringForm } from "./recurring-form";
import type { RecurringTemplate } from "@/lib/constants";
import type { RecurringItemDTO } from "@/types/domain";

const TITLE: Record<RecurringTemplate, string> = {
  salary: "Salary / Income",
  emi: "Loan / EMI",
  sip: "SIP",
};

const DESC: Record<RecurringTemplate, string> = {
  salary: "A recurring income like your monthly salary.",
  emi: "A loan, or a credit-card bill split into monthly installments.",
  sip: "A recurring investment into one of your holdings.",
};

export function RecurringFormModal({
  open,
  onOpenChange,
  template,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: RecurringTemplate;
  item?: RecurringItemDTO;
}) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `Edit ${TITLE[template]}` : `Add ${TITLE[template]}`}
      description={item ? undefined : DESC[template]}
    >
      {open ? (
        <RecurringForm
          template={template}
          item={item}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormModal>
  );
}
