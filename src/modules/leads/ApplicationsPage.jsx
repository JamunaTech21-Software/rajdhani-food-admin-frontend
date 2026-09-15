import { LEAD_RESOURCES } from "./leadResources.jsx";
import { LeadsPage } from "./LeadsPage.jsx";

export function ApplicationsPage() {
  return <LeadsPage resource={LEAD_RESOURCES.applications} />;
}
