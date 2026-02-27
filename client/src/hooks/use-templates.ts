import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ContractTemplate } from "@shared/schema";

export function useTemplates() {
  return useQuery<ContractTemplate[]>({
    queryKey: [api.templates.list.path],
  });
}
