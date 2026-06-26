import { useQuery } from "@tanstack/react-query";
import type { AdminActivityFilters, AdminActivityResponse, ActivityItem } from "@shared/schema";

export type { AdminActivityFilters, AdminActivityResponse };

export function useAdminActivity(filters: AdminActivityFilters) {
  const queryParams = new URLSearchParams();
  
  if (filters.userIds?.length) {
    queryParams.set('userIds', filters.userIds.join(','));
  }
  if (filters.actions?.length) {
    queryParams.set('actions', filters.actions.join(','));
  }
  if (filters.search) {
    queryParams.set('search', filters.search);
  }
  if (filters.dateFrom) {
    queryParams.set('dateFrom', filters.dateFrom);
  }
  if (filters.dateTo) {
    queryParams.set('dateTo', filters.dateTo);
  }
  if (filters.sortBy) {
    queryParams.set('sortBy', filters.sortBy);
  }
  if (filters.sortOrder) {
    queryParams.set('sortOrder', filters.sortOrder);
  }
  queryParams.set('page', String(filters.page || 1));
  queryParams.set('pageSize', String(filters.pageSize || 25));

  const url = `/api/admin/activity?${queryParams.toString()}`;

  return useQuery({
    queryKey: ['/api/admin/activity', filters],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You do not have permission to view admin activity');
        }
        throw new Error('Failed to fetch activity logs');
      }
      const data = await res.json();
      return data as AdminActivityResponse;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

// Fetch all activity for export (paginated fetch)
export async function fetchAllAdminActivityForExport(
  filters: Omit<AdminActivityFilters, 'page' | 'pageSize'>
): Promise<ActivityItem[]> {
  const pageSize = 100; // schema max
  let page = 1;
  let allItems: ActivityItem[] = [];
  let total = 0;

  do {
    // Build query params (same as hook)
    const queryParams = new URLSearchParams();
    
    if (filters.userIds?.length) {
      queryParams.set('userIds', filters.userIds.join(','));
    }
    if (filters.actions?.length) {
      queryParams.set('actions', filters.actions.join(','));
    }
    if (filters.search) {
      queryParams.set('search', filters.search);
    }
    if (filters.dateFrom) {
      queryParams.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryParams.set('dateTo', filters.dateTo);
    }
    if (filters.sortBy) {
      queryParams.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      queryParams.set('sortOrder', filters.sortOrder);
    }
    queryParams.set('page', String(page));
    queryParams.set('pageSize', String(pageSize));

    const url = `/api/admin/activity?${queryParams.toString()}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('You do not have permission to view admin activity');
      }
      throw new Error('Failed to fetch activity logs for export');
    }
    
    const data = (await res.json()) as AdminActivityResponse;
    allItems = [...allItems, ...data.items];
    total = data.total;
    page++;
  } while (allItems.length < total);

  return allItems;
}