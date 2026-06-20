"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { FormModal } from "@/components/forms/form-modal";
import { Field } from "@/components/forms/field";
import { EntitySelect } from "@/components/forms/entity-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/lib/constants";
import { useCreateProject, useUpdateProject } from "@/hooks/use-projects";
import type { ProjectDTO } from "@/types/domain";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string(),
  status: z.enum(["active", "completed"]),
});
type FormValues = z.infer<typeof schema>;

export function ProjectFormModal({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDTO;
}) {
  const create = useCreateProject();
  const update = useUpdateProject();
  const editing = !!project;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      color: project?.color ?? PROJECT_COLORS[0],
      status: project?.status ?? "active",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: project.id, input: values });
        toast.success("Project updated");
      } else {
        await create.mutateAsync(values);
        toast.success("Project created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save project");
    }
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Project" : "New Project"}
      description={editing ? undefined : "Group income and expenses by project."}
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <Field label="Name" htmlFor="p-name" error={errors.name?.message}>
          <Input id="p-name" autoFocus placeholder="e.g. AI SaaS" {...register("name")} />
        </Field>

        <Field label="Color">
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => field.onChange(c)}
                    className={cn(
                      "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      field.value === c && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          />
        </Field>

        {editing ? (
          <Field label="Status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <EntitySelect
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                  ]}
                />
              )}
            />
          </Field>
        ) : null}

        <Field label="Description" htmlFor="p-desc">
          <Textarea id="p-desc" rows={2} placeholder="Optional…" {...register("description")} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save" : "Create Project"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
