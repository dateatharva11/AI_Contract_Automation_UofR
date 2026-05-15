import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Define types for Architect
export type CreateArchitectRequest = {
  name: string;
  contactEmail: string;
  phone?: string | null;
  address?: string | null;
  additionalInfo?: string | null;
};

export type UpdateArchitectRequest = Partial<CreateArchitectRequest>;

export function useArchitects() {
  return useQuery({
    queryKey: [api.architects.list.path],
    queryFn: async () => {
      const res = await fetch(api.architects.list.path);
      if (!res.ok) throw new Error("Failed to fetch architects");
      return api.architects.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateArchitect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateArchitectRequest) => {
      const res = await fetch(api.architects.create.path, {
        method: api.architects.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create architect");
      }
      return api.architects.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.architects.list.path] });
      toast({ title: "Architect created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateArchitect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateArchitectRequest }) => {
      const url = api.architects.update.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.architects.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update architect");
      }
      return api.architects.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.architects.list.path] });
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
      const url = api.architects.delete.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.architects.delete.method,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete architect");
      }
      return api.architects.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.architects.list.path] });
      toast({ title: "Architect deleted successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}