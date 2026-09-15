import { formatDateTime } from "../../lib/format.js";

/**
 * Enquiries and dealer applications are the same screen with different columns,
 * so they are configured rather than duplicated — the pattern RTPP-44 set.
 *
 * `filterParam` names the one resource-specific filter each supports. The list
 * and export endpoints take identical parameters, which is what makes "export
 * respects the active filters" a matter of passing the same object twice.
 */

const ENQUIRY_STATUSES = [
  { value: "NEW", label: "New", tone: "info" },
  { value: "IN_PROGRESS", label: "In progress", tone: "warning" },
  { value: "CONTACTED", label: "Contacted", tone: "brand" },
  { value: "CLOSED", label: "Closed", tone: "success" },
  { value: "SPAM", label: "Spam", tone: "danger" },
];

const APPLICATION_STATUSES = [
  { value: "SUBMITTED", label: "Submitted", tone: "info" },
  { value: "UNDER_REVIEW", label: "Under review", tone: "warning" },
  { value: "APPROVED", label: "Approved", tone: "success" },
  { value: "REJECTED", label: "Rejected", tone: "danger" },
  { value: "ON_HOLD", label: "On hold", tone: "neutral" },
];

const yesNo = (value) => (value ? "Yes" : "No");

export const LEAD_RESOURCES = {
  enquiries: {
    id: "enquiries",
    label: "Enquiries",
    singular: "enquiry",
    endpoint: "/admin/enquiries",
    queryKey: ["admin", "enquiries"],
    capability: "enquiries",
    statuses: ENQUIRY_STATUSES,

    // The reference number is generated gaplessly server-side (§8.2) and is what
    // Sales quotes on the phone, so it leads every row.
    reference: (row) => row.reference_no,
    title: (row) => row.name,
    subtitle: (row) => [row.company_name, row.city].filter(Boolean).join(" · "),

    filter: {
      param: "productId",
      label: "Product",
      allLabel: "All products",
      source: { endpoint: "/admin/products", queryKey: ["admin", "products", { all: true }] },
      optionLabel: (item) => item.name,
    },

    columns: [
      { key: "product", label: "Product", get: (row) => row.product?.name ?? "—" },
      { key: "quantity", label: "Quantity", get: (row) => row.quantity ?? "—" },
    ],

    detail: (row) => [
      ["Reference", row.reference_no],
      ["Name", row.name],
      ["Company", row.company_name],
      ["Phone", row.phone],
      ["Email", row.email],
      ["City", row.city],
      ["Product", row.product?.name],
      ["Pack size", row.pack_size_label],
      ["Quantity", row.quantity],
      ["Received", formatDateTime(row.created_at)],
    ],
    message: (row) => row.message,
  },

  applications: {
    id: "applications",
    label: "Applications",
    singular: "application",
    endpoint: "/admin/applications",
    queryKey: ["admin", "applications"],
    capability: "dealer_applications",
    statuses: APPLICATION_STATUSES,

    reference: (row) => row.application_id,
    title: (row) => row.full_name,
    subtitle: (row) => [row.company_name, row.district?.name].filter(Boolean).join(" · "),

    filter: {
      param: "districtId",
      label: "District",
      allLabel: "All districts",
      source: { endpoint: "/public/locations/districts", queryKey: ["locations", "districts"], auth: false },
      optionLabel: (item) => item.name,
    },

    columns: [
      { key: "district", label: "District", get: (row) => row.district?.name ?? "—" },
      { key: "experience", label: "Experience", get: (row) => (row.years_of_experience ? `${row.years_of_experience} yr` : "—") },
    ],

    detail: (row) => [
      ["Application ID", row.application_id],
      ["Name", row.full_name],
      ["Company", row.company_name],
      ["Phone", row.phone],
      ["Email", row.email],
      ["District", row.district?.name],
      ["Upazila", row.upazila?.name],
      ["Address", row.address_line],
      ["Trade licence", yesNo(row.has_trade_license)],
      ["TIN certificate", yesNo(row.has_tin_certificate)],
      ["Experience", row.years_of_experience ? `${row.years_of_experience} years` : null],
      ["Received", formatDateTime(row.created_at)],
    ],
    message: (row) => row.message,
  },
};

export const leadResource = (id) => LEAD_RESOURCES[id] ?? LEAD_RESOURCES.enquiries;

export const statusMeta = (resource, value) =>
  resource.statuses.find((s) => s.value === value) ?? { value, label: value, tone: "neutral" };
