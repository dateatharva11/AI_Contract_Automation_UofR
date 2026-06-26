import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Extend UserActivityItem to include user fields (for consistency with ActivityItem)
export type UserActivityItem = {
  id: number;
  action: string;
  details: string | null;
  createdAt: Date | null;
  contractId: number;
  projectName: string;
  projectNumber: string;
  contractStatus: string;
  // User fields - for personal activity, these will always be "self"
  userId: number;
  userFullName: string;
  userRole: string;
};

export function useUserActivity() {
  return useQuery({
    queryKey: [`${api.users.meActivity.path}`],
    queryFn: async () => {
      const res = await fetch(`${api.users.meActivity.path}?limit=1000`);
      if (!res.ok) throw new Error("Failed to fetch user activity");
      const data = await res.json();
      return data as UserActivityItem[];
    },
    staleTime: 60_000,
  });
}