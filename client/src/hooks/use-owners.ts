import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { insertOwnerSchema } from "@shared/schema";

// Define types for Owner
export type CreateOwnerRequest = {
  name: string;
  contactEmail: string;
  phone?: string | null;
  address?: string | null;
  additionalInfo?: string | null;
};

export type UpdateOwnerRequest = Partial<CreateOwnerRequest>;

export function useOwners() {
  return useQuery({
    queryKey: [api.owners.list.path],
    queryFn: async () => {
      const res = await fetch(api.owners.list.path);
      if (!res.ok) throw new Error("Failed to fetch owners");
      return api.owners.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOwnerRequest) => {
      const res = await fetch(api.owners.create.path, {
        method: api.owners.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create owner");
      }
      return api.owners.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
      toast({ title: "Owner created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateOwnerRequest }) => {
      const url = api.owners.update.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.owners.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update owner");
      }
      return api.owners.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
      toast({ title: "Owner updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = api.owners.delete.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.owners.delete.method,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete owner");
      }
      return api.owners.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
      toast({ title: "Owner deleted successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}