"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Receipt,
  CreditCard,
  TrendingUp,
  ArrowLeftRight,
  Wallet,
  Landmark,
  PiggyBank,
  Target,
  Vault,
  Moon,
  Sun,
  Search as SearchIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { ProjectDot } from "@/components/common/project-dot";
import { Money } from "@/components/common/money";
import { useUiStore, type QuickAddType } from "@/stores/ui-store";
import { useProjects } from "@/hooks/use-projects";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { NAV_ITEMS } from "@/lib/nav";

const QUICK_ACTIONS: {
  type: QuickAddType;
  label: string;
  icon: typeof Banknote;
}[] = [
  { type: "income", label: "Add Income", icon: Banknote },
  { type: "expense", label: "Add Expense", icon: Receipt },
  { type: "transfer", label: "Transfer", icon: ArrowLeftRight },
  { type: "subscription", label: "Add Subscription", icon: CreditCard },
  { type: "investment", label: "Add Investment", icon: TrendingUp },
  { type: "salary", label: "Add Salary / Income", icon: Wallet },
  { type: "emi", label: "Add Loan / EMI", icon: Landmark },
  { type: "sip", label: "Add SIP", icon: PiggyBank },
  { type: "deposit", label: "Add FD / RD", icon: Vault },
  { type: "goal", label: "Add Savings Goal", icon: Target },
];

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const setActiveProject = useUiStore((s) => s.setActiveProject);
  const { data: projects } = useProjects();

  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const searching = debounced.trim().length >= 1;
  const search = useSearch(debounced, open);

  // Clear the query whenever the palette closes (incl. via the ⌘K shortcut,
  // which toggles the store directly and bypasses onOpenChange).
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const run = (fn: () => void) => {
    fn();
    close();
  };
  const matches = (label: string) =>
    !query || label.toLowerCase().includes(query.toLowerCase());

  const hits = search.data;
  const hitGroups = [
    {
      key: "transactions",
      title: "Transactions",
      items: hits?.transactions ?? [],
    },
    { key: "projects", title: "Projects", items: hits?.projects ?? [] },
    {
      key: "subscriptions",
      title: "Subscriptions",
      items: hits?.subscriptions ?? [],
    },
    {
      key: "investments",
      title: "Investments",
      items: hits?.investments ?? [],
    },
    { key: "categories", title: "Categories", items: hits?.categories ?? [] },
  ].filter((g) => g.items.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
    >
      <Command shouldFilter={false} className="bg-transparent">
        <CommandInput
          placeholder="Search or run a command…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {!searching ? (
            <>
              <CommandGroup heading="Quick add">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <CommandItem
                      key={a.type}
                      onSelect={() => run(() => openQuickAdd(a.type))}
                    >
                      <Icon className="size-4" />
                      {a.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => run(() => router.push(item.href))}
                    >
                      <Icon className="size-4" />
                      {item.label}
                      {item.shortcut ? (
                        <CommandShortcut>g {item.shortcut}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Filter project">
                <CommandItem
                  onSelect={() => run(() => setActiveProject("all"))}
                >
                  All Projects
                </CommandItem>
                {projects?.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => run(() => setActiveProject(p.id))}
                  >
                    <ProjectDot color={p.color} />
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Preferences">
                <CommandItem
                  onSelect={() =>
                    run(() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                    )
                  }
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                  Toggle theme
                </CommandItem>
              </CommandGroup>
            </>
          ) : (
            <>
              {hitGroups.length === 0 && !search.isFetching ? null : null}
              {hitGroups.map((g) => (
                <CommandGroup key={g.key} heading={g.title}>
                  {g.items.map((hit) => (
                    <CommandItem
                      key={hit.id}
                      onSelect={() => run(() => router.push(hit.href))}
                    >
                      <SearchIcon className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{hit.label}</span>
                      {hit.amount !== null ? (
                        <Money
                          paise={hit.amount}
                          className="text-xs text-muted-foreground"
                        />
                      ) : hit.sublabel ? (
                        <span className="text-xs text-muted-foreground">
                          {hit.sublabel}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
