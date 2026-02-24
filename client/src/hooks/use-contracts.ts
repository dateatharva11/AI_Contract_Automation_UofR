import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Contract, type CreateContractRequest, type UpdateContractRequest, type AuditLog, type ContractSection } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useContracts() {
  return useQuery({
    queryKey: [api.contracts.list.path],
    queryFn: async () => {
      const res = await fetch(api.contracts.list.path);
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return api.contracts.list.responses[200].parse(await res.json());
    },
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: [api.contracts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.contracts.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch contract");
      return api.contracts.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.contracts.create.path, {
        method: api.contracts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create contract");
      }
      return api.contracts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.contracts.list.path] });
      toast({ title: "Contract initiated successfully" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateContractRequest) => {
      const url = buildUrl(api.contracts.update.path, { id });
      const res = await fetch(url, {
        method: api.contracts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update contract");
      return api.contracts.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.contracts.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.contracts.list.path] });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.contracts.generateDraft.path, { id });
      const res = await fetch(url, { method: api.contracts.generateDraft.method });
      if (!res.ok) throw new Error("Failed to generate draft");
      return api.contracts.generateDraft.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: [api.contracts.get.path, id] });
      toast({ title: "AI Draft Generated", description: "The template has been applied successfully." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useAnalyzeContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.contracts.analyze.path, { id });
      const res = await fetch(url, { method: api.contracts.analyze.method });
      if (!res.ok) throw new Error("Failed to analyze contract");
      return api.contracts.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.contracts.get.path, id] });
      toast({ title: "AI Analysis Complete", description: "Review findings and flagged clauses updated." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useAuditLogs(contractId: number) {
  return useQuery({
    queryKey: [api.contracts.getAuditLogs.path, contractId],
    queryFn: async () => {
      const url = buildUrl(api.contracts.getAuditLogs.path, { id: contractId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return api.contracts.getAuditLogs.responses[200].parse(await res.json());
    },
    enabled: !!contractId,
  });
}
