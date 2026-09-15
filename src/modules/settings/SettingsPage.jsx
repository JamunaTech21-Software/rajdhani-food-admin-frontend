import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";

import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";
import { BrandTab } from "./tabs/BrandTab.jsx";
import { ContactTab } from "./tabs/ContactTab.jsx";
import { MenusTab } from "./tabs/MenusTab.jsx";
import { SeoTab } from "./tabs/SeoTab.jsx";
import { SocialTab } from "./tabs/SocialTab.jsx";
import { SystemTab } from "./tabs/SystemTab.jsx";
import { useSiteProfile } from "./useSiteProfile.js";

// Which tabs edit the site_profile row, and therefore share one Save.
const PROFILE_TABS = new Set(["brand", "contact", "seo"]);

const TABS = [
  { value: "brand", label: "Brand & theme" },
  { value: "contact", label: "Contact" },
  { value: "seo", label: "Footer & SEO" },
  { value: "menus", label: "Menus" },
  { value: "social", label: "Social" },
  { value: "system", label: "System" },
];

/**
 * Everything that configures the site, in one place.
 *
 * Three of the six tabs are views onto the same `site_profile` row, so they
 * share one form and one Save — a Save per tab would mean four requests to
 * change four related things, each overwriting the last with stale values. The
 * other three own their own endpoints and save as you go.
 *
 * There is no "new site profile" anywhere here, by design: the API exposes only
 * GET and PATCH on a singleton, and the UI offers nothing the API would refuse.
 */
export function SettingsPage() {
  const [tab, setTab] = useState("brand");
  const profile = useSiteProfile();

  const showSaveBar = PROFILE_TABS.has(tab);

  if (profile.isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load settings"
            action={
              <Button variant="secondary" onClick={() => profile.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  return (
    <Container as="main" className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Branding, contact details, menus and site behaviour. Changes here reach the customer site
          on its next page load — there is nothing to rebuild and no cache to clear.
        </p>
      </header>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List
          aria-label="Settings sections"
          className="mb-6 flex gap-1 overflow-x-auto border-b border-line"
        >
          {TABS.map(({ value, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-(--duration-fast)",
                "border-transparent text-ink-muted hover:text-ink",
                "data-[state=active]:border-brand data-[state=active]:text-brand",
              )}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {profile.isPending && showSaveBar ? (
          <div role="status" aria-label="Loading settings" aria-busy="true" className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <Tabs.Content value="brand">
              <Card className="p-5">
                <BrandTab {...profile} />
              </Card>
            </Tabs.Content>

            <Tabs.Content value="contact">
              <Card className="p-5">
                <ContactTab {...profile} />
              </Card>
            </Tabs.Content>

            <Tabs.Content value="seo">
              <Card className="p-5">
                <SeoTab {...profile} />
              </Card>
            </Tabs.Content>
          </>
        )}

        <Tabs.Content value="menus">
          <MenusTab />
        </Tabs.Content>

        <Tabs.Content value="social">
          <SocialTab />
        </Tabs.Content>

        <Tabs.Content value="system">
          <SystemTab />
        </Tabs.Content>
      </Tabs.Root>

      {showSaveBar && profile.isDirty ? (
        // Sticky rather than inline: the brand tab is long enough that a save
        // button at the bottom is off-screen while you are editing the top of it.
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-lg bg-surface px-4 py-3 shadow-modal">
          <span className="mr-auto text-sm text-ink-muted">
            {profile.changedCount === 1 ? "1 change" : `${profile.changedCount} changes`} not saved
          </span>
          <Button variant="ghost" onClick={profile.reset} disabled={profile.isSaving}>
            Discard
          </Button>
          <Button onClick={() => profile.save()} loading={profile.isSaving}>
            {profile.isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </Container>
  );
}
