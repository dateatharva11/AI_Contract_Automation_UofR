import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateVendorRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useVendors() {
  return useQuery({
    queryKey: [api.vendors.list.path],
    queryFn: async () => {
      const res = await fetch(api.vendors.list.path);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return api.vendors.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVendorRequest) => {
      const res = await fetch(api.vendors.create.path, {
        method: api.vendors.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      return api.vendors.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vendors.list.path] });
      toast({ title: "Vendor created successfully" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateVendorRequest }) => {
      const url = api.vendors.update.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.vendors.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update vendor");
      }
      return api.vendors.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vendors.list.path] });
      toast({ title: "Vendor updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = api.vendors.delete.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: api.vendors.delete.method,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete vendor");
      }
      return api.vendors.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vendors.list.path] });
      toast({ title: "Vendor deleted successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}