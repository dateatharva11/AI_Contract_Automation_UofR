import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import type { Contract } from "@shared/schema";
import type { Vendor } from "@shared/schema";

type ContractRow = Contract & { responsiblePerson?: string };

// Helper function to get fallback responsible person (same logic as in contracts page)
function getFallbackResponsible(status: string): string {
  switch (status) {
    case 'draft':
        return 'Contract Admininstrator (Admin)';
    case 'review':
        return 'Reviewer (Reviewer)';
    case 'approved':
    case 'signed':
        return 'Vendor (Vendor)';
    default:
        return '-';
  }
}

/**
 * Exports the filtered/sorted contracts to an Excel file
 */
export function exportContractsToExcel(
  contracts: ContractRow[],
  vendors: Vendor[] | undefined,
  filename: string = `contracts-${format(new Date(), "yyyy-MM-dd")}.xlsx`
) {
  if (!contracts || contracts.length === 0) {
    throw new Error("No contracts to export");
  }

  // Create vendor lookup map for quick access
  const vendorById = new Map(vendors?.map((v) => [v.id, v.name]) ?? []);
  
  // Map contracts to Excel rows, matching what's displayed in the table
  const rows = contracts.map((c) => {
    // Get responsible person (same logic as in table)
    const responsiblePerson = (c as any).responsiblePerson || getFallbackResponsible(c.status);
    
    // Get vendor name
    const vendorName = vendorById.get(c.vendorId) ?? (c as any).vendorName ?? "Unknown Vendor";
    
    return {
      "Project Name": c.projectName,
      "Project Number": c.projectNumber,
      "Vendor": vendorName,
      "Draft Created": format(new Date(c.createdAt), "yyyy-MM-dd"),
      "Project Start": format(new Date(c.startDate), "yyyy-MM-dd"),
      "Project End": format(new Date(c.endDate), "yyyy-MM-dd"),
      "Budget (USD)": Number(c.budgetAmount), // Export as number for potential Excel calculations
      "Status": c.status,
      "Responsible Person": responsiblePerson,
    };
  });

  // Create worksheet from the mapped rows
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns (optional - improves readability)
  const maxWidths = getColumnWidths(rows);
  worksheet['!cols'] = maxWidths.map(width => ({ wch: Math.min(width + 2, 50) })); // Cap at 50 characters
  
  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
  
  // Generate Excel file
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  
  // Trigger download
  saveAs(blob, filename);
}

/**
 * Helper function to calculate column widths based on content
 */
function getColumnWidths(rows: any[]): number[] {
  if (!rows || rows.length === 0) return new Array(Object.keys(rows[0] || {}).length).fill(10);
  
  const headers = Object.keys(rows[0]);
  const widths = headers.map(header => header.length); // Start with header width
  
  rows.forEach(row => {
    headers.forEach((header, index) => {
      const value = row[header];
      const valueLength = value ? String(value).length : 0;
      widths[index] = Math.max(widths[index], valueLength);
    });
  });
  
  return widths;
}

/**
 * Alternative export with additional metadata (e.g., export date, filter info)
 */
export function exportContractsToExcelWithMetadata(
  contracts: ContractRow[],
  vendors: Vendor[] | undefined,
  filterInfo?: { hasFilters: boolean; filterDescription: string },
  filename?: string
) {
  if (!contracts || contracts.length === 0) {
    throw new Error("No contracts to export");
  }

  const defaultFilename = `contracts-${format(new Date(), "yyyy-MM-dd")}${filterInfo?.hasFilters ? '-filtered' : ''}.xlsx`;
  const finalFilename = filename || defaultFilename;
  
  // Create the data rows
  const vendorById = new Map(vendors?.map((v) => [v.id, v.name]) ?? []);
  const dataRows = contracts.map((c) => {
    const responsiblePerson = (c as any).responsiblePerson || getFallbackResponsible(c.status);
    const vendorName = vendorById.get(c.vendorId) ?? (c as any).vendorName ?? "Unknown Vendor";
    
    return {
      "Project Name": c.projectName,
      "Project Number": c.projectNumber,
      "Vendor": vendorName,
      "Draft Created": format(new Date(c.createdAt), "yyyy-MM-dd"),
      "Project Start": format(new Date(c.startDate), "yyyy-MM-dd"),
      "Project End": format(new Date(c.endDate), "yyyy-MM-dd"),
      "Budget (USD)": Number(c.budgetAmount),
      "Status": c.status,
      "Responsible Person": responsiblePerson,
    };
  });
  
  // Add metadata as a separate sheet if filters are applied
  const workbook = XLSX.utils.book_new();
  
  // Main data sheet
  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Contracts");
  
  // Add metadata sheet if filter info is provided
  if (filterInfo && filterInfo.hasFilters) {
    const metadata = [
      ["Export Date:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
      ["Filter Applied:", "Yes"],
      ["Filter Description:", filterInfo.filterDescription],
      ["Total Contracts Exported:", contracts.length],
    ];
    const metadataSheet = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, "Export Info");
  }
  
  // Generate and download
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  saveAs(blob, finalFilename);
}