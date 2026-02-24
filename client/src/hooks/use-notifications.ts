import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Notification } from "@shared/schema";

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: [api.notifications.list.path],
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.notifications.markRead.path, { id }), {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}
