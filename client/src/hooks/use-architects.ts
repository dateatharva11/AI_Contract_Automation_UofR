import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Define API endpoints for architects
const architectsApi = {
  list: { path: "/api/architects" },
  create: { path: "/api/architects", method: "POST" },
  update: { path: "/api/architects/:id", method: "PUT" },
  delete: { path: "/api/architects/:id", method: "DELETE" },
};

export function useArchitects() {
  return useQuery({
    queryKey: [architectsApi.list.path],
    queryFn: async () => {
      const res = await fetch(architectsApi.list.path);
      if (!res.ok) throw new Error("Failed to fetch architects");
      return res.json();
    },
  });
}

export function useCreateArchitect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(architectsApi.create.path, {
        method: architectsApi.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create architect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [architectsApi.list.path] });
      toast({ title: "Architect created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateArchitect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(architectsApi.update.path.replace(":id", id.toString()), {
        method: architectsApi.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update architect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [architectsApi.list.path] });
      toast({ title: "Architect updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteArchitect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(architectsApi.delete.path.replace(":id", id.toString()), {
        method: architectsApi.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete architect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [architectsApi.list.path] });
      toast({ title: "Architect deleted successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}