"use client";

import { FormModal } from "@/components/forms/form-modal";
import { DepositForm } from "./deposit-form";
import type { DepositType } from "@/lib/constants";
import type { DepositDTO } from "@/types/domain";

export function DepositFormModal({
  open,
  onOpenChange,
  item,
  initialType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: DepositDTO;
  initialType?: DepositType;
}) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit Deposit" : "Add Deposit"}
      description={
        item
          ? undefined
          : "Track a fixed or recurring deposit and its maturity."
      }
    >
      {open ? (
        <DepositForm
          item={item}
          initialType={initialType}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormModal>
  );
}
