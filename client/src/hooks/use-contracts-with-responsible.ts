import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Contract } from "@shared/schema";

interface ContractWithResponsible extends Contract {
  responsiblePerson: string;
  responsiblePersonName: string;
  responsiblePersonRole: string;
}

export function useContractsWithResponsible() {
  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/contracts");
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
  });

  const [contractsWithResponsible, setContractsWithResponsible] = useState<ContractWithResponsible[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatusHistories() {
      if (!contracts || contracts.length === 0) {
        setLoading(false);
        setContractsWithResponsible([]);
        return;
      }

      setLoading(true);
      
      try {
        // Fetch status history for all contracts in parallel
        const statusHistoryPromises = contracts.map(async (contract) => {
          try {
            const res = await fetch(`/api/contracts/${contract.id}/status-history`);
            if (!res.ok) throw new Error(`Failed to fetch history for contract ${contract.id}`);
            const data = await res.json();
            return { contractId: contract.id, statusHistory: data.statusHistory };
          } catch (error) {
            console.error(`Error fetching history for contract ${contract.id}:`, error);
            return { contractId: contract.id, statusHistory: [] };
          }
        });

        const statusHistories = await Promise.all(statusHistoryPromises);
        
        // Create a map of contract ID to status history
        const historyMap = new Map();
        statusHistories.forEach(({ contractId, statusHistory }) => {
          historyMap.set(contractId, statusHistory);
        });

        // Enrich contracts with responsible person info
        const enrichedContracts = contracts.map((contract) => {
          const statusHistory = historyMap.get(contract.id) || [];
          const responsible = getResponsiblePerson(contract, statusHistory);
          
          return {
            ...contract,
            responsiblePerson: `${responsible.name}`,
            responsiblePersonName: responsible.name,
            responsiblePersonRole: responsible.role,
          };
        });

        setContractsWithResponsible(enrichedContracts);
      } catch (error) {
        console.error("Error fetching status histories:", error);
        // Fallback: set contracts without responsible info
        const fallbackContracts = contracts.map((contract) => ({
          ...contract,
          responsiblePerson: getFallbackResponsible(contract.status),
          responsiblePersonName: getFallbackResponsibleName(contract.status),
          responsiblePersonRole: getFallbackResponsibleRole(contract.status),
        }));
        setContractsWithResponsible(fallbackContracts);
      } finally {
        setLoading(false);
      }
    }

    fetchStatusHistories();
  }, [contracts]);

  return { contracts: contractsWithResponsible, isLoading: contractsLoading || loading };
}

// Helper to get responsible person based on contract status and history
function getResponsiblePerson(contract: Contract, statusHistory: any[]): { name: string; role: string } {
  if (!statusHistory || statusHistory.length === 0) {
    return getFallbackResponsibleInfo(contract.status);
  }
  
  // Find the most recent status entry (current status)
  const currentStatusEntry = statusHistory[statusHistory.length - 1];
  if (currentStatusEntry && currentStatusEntry.userName) {
    const roleDisplay = currentStatusEntry.userRole === 'contract_manager' ? 'Contract Admininstrator' :
                       currentStatusEntry.userRole === 'reviewer' ? 'Reviewer' :
                       currentStatusEntry.userRole === 'vendor' ? 'Vendor' : '';
    return {
      name: currentStatusEntry.userName,
      role: roleDisplay,
    };
  }
  
  return getFallbackResponsibleInfo(contract.status);
}

function getFallbackResponsibleInfo(status: string): { name: string; role: string } {
  switch (status) {
    case 'draft':
      return { name: 'Contract Admininstrator', role: 'admin' };
    case 'review':
      return { name: 'Reviewer', role: 'Reviewer' };
    case 'approved':
    case 'signed':
      return { name: 'Vendor', role: 'Vendor' };
    default:
      return { name: '-', role: '-' };
  }
}

function getFallbackResponsible(status: string): string {
  const info = getFallbackResponsibleInfo(status);
  return `${info.name}`;
}

function getFallbackResponsibleName(status: string): string {
  const info = getFallbackResponsibleInfo(status);
  return `${info.name}`;
}

function getFallbackResponsibleRole(status: string): string {
  const info = getFallbackResponsibleInfo(status);
  return `${info.role}`;
}