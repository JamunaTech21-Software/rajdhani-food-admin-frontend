import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui/toast-context.js";
import { api } from "../../lib/api.js";

/**
 * Query, optimistic reorder and delete for one sortable content resource.
 *
 * All five section resources behave identically here, differing only in whether
 * their order is scoped. `feature_items` reorder by `section`, `process_steps`
 * and `stat_counters` by `group`, and certifications and testimonials are flat
 * — so `scopeKey` decides both the list filter and the reorder body.
 */
export function useSortableResource({ endpoint, queryKey, scopeKey, scope }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const key = [...queryKey, scope ?? "all"];
  const params = { limit: 200, ...(scopeKey && scope ? { [scopeKey]: scope } : {}) };

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.list(endpoint, { params }),
  });

  const reorder = useMutation({
    mutationFn: (ids) =>
      api.patch(`${endpoint}/reorder`, scopeKey && scope ? { [scopeKey]: scope, ids } : { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (current) => {
        if (!current) return current;
        const byId = new Map(current.items.map((item) => [item.id, item]));
        return { ...current, items: ids.map((id) => byId.get(id)).filter(Boolean) };
      });

      return { previous };
    },
    onError: (error, _ids, context) => {
      // Put the old order back rather than leaving the screen lying about it.
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error("Could not save the new order", error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Deleted");
    },
    onError: (error) => toast.error("Could not delete", error.message),
  });

  return {
    items: query.data?.items ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    reorder,
    remove,
  };
}
