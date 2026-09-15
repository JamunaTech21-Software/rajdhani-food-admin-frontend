import { Link } from "react-router";

import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { formatRelative } from "../../lib/format.js";

// Detail routes arrive with RTPP-48 (enquiries, applications) and RTPP-49
// (messages). Linking now means the list works the moment those land.
const LEAD_TYPES = {
  enquiry: { label: "Enquiry", to: (id) => `/enquiries/${id}`, tone: "bg-brand-tint text-brand" },
  dealer_application: {
    label: "Application",
    to: (id) => `/applications/${id}`,
    tone: "bg-gold-tint text-on-gold",
  },
  contact_message: {
    label: "Message",
    to: (id) => `/messages/${id}`,
    tone: "bg-info-tint text-info",
  },
};

export function RecentLeads({ leads, isPending, now }) {
  if (isPending) {
    return (
      <ul role="status" aria-label="Loading recent leads" aria-busy="true" className="divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3 w-44" />
            </div>
            <Skeleton className="h-3 w-16" />
          </li>
        ))}
      </ul>
    );
  }

  if (!leads?.length) {
    return (
      <EmptyState
        icon="handshake"
        title="No leads yet"
        description="Enquiries, dealer applications and contact messages will appear here as they arrive."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {leads.map((lead) => {
        const kind = LEAD_TYPES[lead.type] ?? {
          label: lead.type,
          to: () => "/enquiries",
          tone: "bg-ground text-ink-muted",
        };

        return (
          <li key={`${lead.type}-${lead.id}`}>
            <Link
              to={kind.to(lead.id)}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-(--duration-fast) hover:bg-ground"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${kind.tone}`}
              >
                {kind.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{lead.name}</span>
                <span className="block truncate text-sm text-ink-muted">{lead.email}</span>
              </span>
              <time
                dateTime={lead.created_at}
                className="shrink-0 text-xs text-ink-subtle"
                title={lead.created_at}
              >
                {formatRelative(lead.created_at, now)}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
