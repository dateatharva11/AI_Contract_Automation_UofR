import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Define API endpoints for owners
const ownersApi = {
  list: { path: "/api/owners" },
  create: { path: "/api/owners", method: "POST" },
  update: { path: "/api/owners/:id", method: "PUT" },
  delete: { path: "/api/owners/:id", method: "DELETE" },
};

export function useOwners() {
  return useQuery({
    queryKey: [ownersApi.list.path],
    queryFn: async () => {
      const res = await fetch(ownersApi.list.path);
      if (!res.ok) throw new Error("Failed to fetch owners");
      return res.json();
    },
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(ownersApi.create.path, {
        method: ownersApi.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create owner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ownersApi.list.path] });
      toast({ title: "Owner created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(ownersApi.update.path.replace(":id", id.toString()), {
        method: ownersApi.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update owner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ownersApi.list.path] });
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
      const res = await fetch(ownersApi.delete.path.replace(":id", id.toString()), {
        method: ownersApi.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete owner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ownersApi.list.path] });
      toast({ title: "Owner deleted successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}