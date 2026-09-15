import { LEAD_RESOURCES } from "./leadResources.jsx";
import { LeadsPage } from "./LeadsPage.jsx";

export function EnquiriesPage() {
  return <LeadsPage resource={LEAD_RESOURCES.enquiries} />;
}
