import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Notification } from "@shared/schema";
import { useAuth } from "./use-auth";

export function useNotifications() {
  const { user } = useAuth();
  return useQuery<Notification[]>({
    queryKey: [api.notifications.list.path, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`${api.notifications.list.path}?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!user?.id,
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.notifications.markRead.path, { id }), {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path, user?.id] });
    },
  });
}
