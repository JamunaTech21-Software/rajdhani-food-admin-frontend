import { zodResolver } from "@hookform/resolvers/zod";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { StatusBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { UnsavedChangesDialog } from "../../components/ui/UnsavedChangesDialog.jsx";
import { SITE_URL } from "../../config.js";
import { useUnsavedGuard } from "../../hooks/useUnsavedGuard.js";
import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { productSchema, toApiBody, toFormValues } from "./productSchema.js";
import { BasicTab } from "./tabs/BasicTab.jsx";
import { HighlightsTab } from "./tabs/HighlightsTab.jsx";
import { ImagesTab } from "./tabs/ImagesTab.jsx";
import { PackSizesTab } from "./tabs/PackSizesTab.jsx";
import { SeoTab } from "./tabs/SeoTab.jsx";

// TipTap is heavy and only one of six tabs needs it.
const ContentTab = lazy(() =>
  import("./tabs/ContentTab.jsx").then((m) => ({ default: m.ContentTab })),
);

const TABS = [
  { value: "basic", label: "Basic" },
  { value: "content", label: "Content" },
  { value: "images", label: "Images" },
  { value: "pack-sizes", label: "Pack sizes" },
  { value: "highlights", label: "Highlights" },
  { value: "seo", label: "SEO" },
];

// Which tab each field lives on, so a validation failure can send the editor to
// the tab holding the problem instead of silently failing on a hidden one.
const FIELD_TAB = {
  name: "basic",
  category_id: "basic",
  slug: "basic",
  tagline: "basic",
  short_description: "basic",
  badge_text: "basic",
  status: "basic",
  pack_sizes: "pack-sizes",
  highlights: "highlights",
  images: "images",
  meta_title: "seo",
  meta_description: "seo",
};

export function ProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState("basic");

  const product = useQuery({
    queryKey: ["admin", "products", id],
    queryFn: () => api.get(`/admin/products/${id}`),
    enabled: !isNew,
  });

  const categories = useQuery({
    queryKey: ["admin", "categories", { all: true }],
    queryFn: () => api.list("/admin/categories", { params: { limit: 100 } }),
    staleTime: 5 * 60_000,
  });

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(null),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => {
    if (product.data) reset(toFormValues(product.data));
  }, [product.data, reset]);

  const blocker = useUnsavedGuard(isDirty);

  const save = useMutation({
    mutationFn: (values) => {
      const body = toApiBody(values);
      return isNew ? api.post("/admin/products", body) : api.patch(`/admin/products/${id}`, body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(isNew ? "Product created" : "Product saved");

      if (isNew && saved?.id) {
        // reset() first so the guard does not fire on the redirect.
        reset(toFormValues(saved));
        navigate(`/products/${saved.id}`, { replace: true });
      } else {
        reset(toFormValues(saved));
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        let firstTab = null;
        for (const detail of error.details) {
          if (!detail.field) continue;
          setError(detail.field, { type: "server", message: detail.message });
          firstTab ??= FIELD_TAB[detail.field.split(".")[0]];
        }
        if (firstTab) setTab(firstTab);
        toast.error("Some fields need attention");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.CONFLICT) {
        toast.error("Conflict", "A slug or SKU here is already in use.");
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  function onInvalid(formErrors) {
    const first = Object.keys(formErrors)[0];
    const target = FIELD_TAB[first];
    if (target) setTab(target);
  }

  if (!isNew && product.isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load this product"
            action={
              <Button variant="secondary" onClick={() => product.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  const loading = !isNew && product.isPending;
  const current = product.data;

  return (
    <Container as="main" className="py-8">
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
        Back to products
      </Link>

      <form onSubmit={handleSubmit((values) => save.mutate(values), onInvalid)} noValidate>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">
              {isNew ? "New product" : (current?.name ?? "Product")}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              {current ? <StatusBadge status={current.status} /> : null}
              {current?.status === "PUBLISHED" ? (
                <a
                  href={`${SITE_URL}/products/${current.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-dark"
                >
                  View on site
                  <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty ? <span className="text-sm text-ink-muted">Unsaved changes</span> : null}
            <Button type="submit" loading={save.isPending} disabled={loading}>
              {save.isPending ? "Saving…" : isNew ? "Create product" : "Save changes"}
            </Button>
          </div>
        </header>

        <Card>
          {loading ? (
            <div role="status" aria-label="Loading product" aria-busy="true" className="p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="mt-4 h-40 w-full" />
            </div>
          ) : (
            <Tabs.Root value={tab} onValueChange={setTab}>
              <Tabs.List
                aria-label="Product sections"
                className="flex gap-1 overflow-x-auto border-b border-line px-3"
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

              <div className="p-5">
                <Tabs.Content value="basic">
                  <BasicTab
                    register={register}
                    control={control}
                    errors={errors}
                    isNew={isNew}
                    categories={categories.data?.items ?? []}
                  />
                </Tabs.Content>

                <Tabs.Content value="content">
                  <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                    <ContentTab control={control} />
                  </Suspense>
                </Tabs.Content>

                <Tabs.Content value="images">
                  <ImagesTab control={control} setValue={setValue} />
                </Tabs.Content>

                <Tabs.Content value="pack-sizes">
                  <PackSizesTab
                    control={control}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                  />
                </Tabs.Content>

                <Tabs.Content value="highlights">
                  <HighlightsTab control={control} register={register} errors={errors} />
                </Tabs.Content>

                <Tabs.Content value="seo">
                  <SeoTab register={register} control={control} errors={errors} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </Card>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </Container>
  );
}
