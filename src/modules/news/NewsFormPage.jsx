import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../components/ui/Card.jsx";
import { Checkbox, Field, Select, Textarea } from "../../components/ui/Field.jsx";
import { Container } from "../../components/ui/Container.jsx";
import { MediaPicker } from "../../components/ui/MediaPicker.jsx";
import { ErrorState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { useToast } from "../../components/ui/toast-context.js";
import { UnsavedChangesDialog } from "../../components/ui/UnsavedChangesDialog.jsx";
import { SITE_URL } from "../../config.js";
import { useNow } from "../../hooks/useNow.js";
import { useUnsavedGuard } from "../../hooks/useUnsavedGuard.js";
import { api } from "../../lib/api.js";
import { fromDateTimeLocalInput, toDateTimeLocalInput } from "../../lib/format.js";
import { isPubliclyVisible, NEWS_LABEL, NEWS_TONE, newsState } from "../../lib/newsSchedule.js";
import { TagInput } from "./TagInput.jsx";

const RichTextEditor = lazy(() =>
  import("../../components/ui/RichTextEditor.jsx").then((m) => ({ default: m.RichTextEditor })),
);

const schema = z.object({
  title: z.string().min(1, "Enter a title").max(255),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(191)
    .optional()
    .or(z.literal("")),
  excerpt: z.string().optional(),
  // The API requires visible content once disallowed markup is stripped, so an
  // editor holding only "<p></p>" must not reach it.
  content: z
    .string()
    .nullish()
    .refine((v) => Boolean(v && v.replace(/<[^>]*>/g, "").trim()), "Write the article body"),
  tags: z.array(z.string()),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  is_featured: z.boolean(),
  cover_image_id: z.string().nullish(),
  published_at: z.string().optional(),
});

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  content: null,
  tags: [],
  status: "DRAFT",
  is_featured: false,
  cover_image_id: null,
  published_at: "",
};

const toFormValues = (post) =>
  post
    ? {
        title: post.title ?? "",
        slug: post.slug ?? "",
        excerpt: post.excerpt ?? "",
        content: post.content ?? null,
        tags: post.tags ?? [],
        status: post.status ?? "DRAFT",
        is_featured: post.is_featured ?? false,
        cover_image_id: post.cover_image_id ?? null,
        published_at: toDateTimeLocalInput(post.published_at),
      }
    : EMPTY;

export function NewsFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const now = useNow();

  const post = useQuery({
    queryKey: ["admin", "news", id],
    queryFn: () => api.get(`/admin/news/${id}`),
    enabled: !isNew,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(null) });

  useEffect(() => {
    if (post.data) reset(toFormValues(post.data));
  }, [post.data, reset]);

  const blocker = useUnsavedGuard(isDirty);
  const [status, publishedAt] = useWatch({ control, name: ["status", "published_at"] });

  // The badge reflects what the editor is about to save, not what is stored —
  // choosing a future date should read "Scheduled" before pressing Save.
  const pendingState = newsState(
    { status, published_at: fromDateTimeLocalInput(publishedAt) },
    now,
  );

  const save = useMutation({
    mutationFn: (values) => {
      const body = {
        title: values.title,
        slug: values.slug?.trim() || undefined,
        excerpt: values.excerpt || null,
        content: values.content,
        tags: values.tags,
        status: values.status,
        is_featured: values.is_featured,
        cover_image_id: values.cover_image_id || null,
        published_at: fromDateTimeLocalInput(values.published_at),
      };

      return isNew ? api.post("/admin/news", body) : api.patch(`/admin/news/${id}`, body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
      toast.success(isNew ? "Post created" : "Post saved");
      reset(toFormValues(saved));
      if (isNew && saved?.id) navigate(`/news/${saved.id}`, { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        toast.error("Some fields need attention");
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.CONFLICT) {
        setError("slug", { type: "server", message: "That slug is already in use." });
        return;
      }
      toast.error("Could not save", error.message);
    },
  });

  if (!isNew && post.isError) {
    return (
      <Container as="main" className="py-8">
        <Card>
          <ErrorState
            title="Could not load this post"
            action={
              <Button variant="secondary" onClick={() => post.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  const loading = !isNew && post.isPending;

  return (
    <Container as="main" className="py-8">
      <Link
        to="/news"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
        Back to news
      </Link>

      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">
              {isNew ? "New post" : (post.data?.title ?? "Post")}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge tone={NEWS_TONE[pendingState]}>{NEWS_LABEL[pendingState]}</Badge>
              {post.data && isPubliclyVisible(post.data, now) ? (
                <a
                  href={`${SITE_URL}/news/${post.data.slug}`}
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
              {save.isPending ? "Saving…" : isNew ? "Create post" : "Save changes"}
            </Button>
          </div>
        </header>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
              <div className="flex flex-col gap-5 p-5">
                <Field label="Title" required autoFocus error={errors.title?.message} {...register("title")} />

                <Field
                  label="Slug"
                  hint={isNew ? "Derived from the title if left blank." : undefined}
                  error={errors.slug?.message}
                  {...register("slug")}
                />

                <Textarea
                  label="Excerpt"
                  rows={2}
                  hint="The teaser shown on the news listing and the home page."
                  error={errors.excerpt?.message}
                  {...register("excerpt")}
                />

                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <Controller
                    control={control}
                    name="content"
                    render={({ field }) => (
                      <RichTextEditor
                        label="Article"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.content?.message}
                        onPasteCleaned={() =>
                          toast.info(
                            "Formatting cleaned",
                            "Styles from Word or Google Docs were removed; the text and structure were kept.",
                          )
                        }
                      />
                    )}
                  />
                </Suspense>
              </div>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Publishing" />
                <div className="flex flex-col gap-4 p-5">
                  <Select label="Status" error={errors.status?.message} {...register("status")}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>

                  <Field
                    label="Publish date"
                    type="datetime-local"
                    hint={
                      status === "PUBLISHED"
                        ? "Leave blank to publish immediately. A future time schedules it."
                        : "Only takes effect once the status is Published."
                    }
                    error={errors.published_at?.message}
                    {...register("published_at")}
                  />

                  <Checkbox
                    label="Feature this post"
                    description="Featured posts lead the home page’s latest updates."
                    {...register("is_featured")}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader title="Organisation" />
                <div className="flex flex-col gap-4 p-5">
                  <Controller
                    control={control}
                    name="tags"
                    render={({ field }) => (
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        hint="Lower-cased automatically so one topic is one filter."
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="cover_image_id"
                    render={({ field }) => (
                      <MediaPicker
                        label="Cover image"
                        hint="Shown on the news listing and at the top of the article."
                        resource="news"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </Card>
            </div>
          </div>
        )}
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </Container>
  );
}
