"use client";

import { FormModal } from "@/components/forms/form-modal";
import { GoalForm } from "./goal-form";
import type { GoalDTO } from "@/types/domain";

export function GoalFormModal({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDTO;
}) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Edit Goal" : "New Savings Goal"}
      description={goal ? undefined : "Set a target and track your progress."}
    >
      {open ? <GoalForm goal={goal} onDone={() => onOpenChange(false)} /> : null}
    </FormModal>
  );
}
