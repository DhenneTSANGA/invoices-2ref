import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  isCrmTabActive,
  type CrmHubTab,
  type CrmNavItem,
} from "@/components/prospection/prospection-nav";

export function CrmHubTabs({
  hub,
  pathname,
}: {
  hub: CrmNavItem;
  pathname: string;
}) {
  const tabs = hub.tabs;
  if (!tabs || tabs.length < 2) return null;

  return (
    <div className="mb-5 overflow-x-auto pb-0.5">
      <div
        className="inline-flex min-w-full flex-wrap gap-2 sm:min-w-0"
        role="tablist"
        aria-label={hub.label}
      >
        {tabs.map((tab) => (
          <HubTabLink key={tab.to} tab={tab} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

function HubTabLink({ tab, pathname }: { tab: CrmHubTab; pathname: string }) {
  const active = isCrmTabActive(pathname, tab);
  return (
    <Link
      to={tab.to}
      role="tab"
      aria-selected={active}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
        active
          ? "border-transparent bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900"
          : "border-slate-300/90 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800",
      )}
    >
      {tab.label}
    </Link>
  );
}
