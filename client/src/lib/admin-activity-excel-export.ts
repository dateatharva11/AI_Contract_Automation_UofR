import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { formatAuditAction } from './format-audit-action';
import type { ActivityItem } from '@shared/schema';

export function exportAdminActivityToExcel(
  items: ActivityItem[],
  filename: string = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
) {
  if (items.length === 0) {
    throw new Error('No data to export');
  }

  // Map the data to Excel rows
  const rows = items.map((item) => ({
    'User': item.userFullName,
    'Role': item.userRole === 'contract_manager' ? 'Admin' : item.userRole,
    'Action': formatAuditAction(item.action),
    'Details': item.details ?? '',
    'Contract': item.projectName,
    'Project Number': item.projectNumber,
    'Contract Status': item.contractStatus,
    'Date': item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : '',
    'Time': item.createdAt ? format(new Date(item.createdAt), 'h:mm a') : '',
    'Contract ID': item.contractId,
  }));

  // Create worksheet
  const ws = utils.json_to_sheet(rows);

  // Auto-size columns (approximate)
  const columnWidths = getColumnWidths(rows);
  ws['!cols'] = columnWidths;

  // Create workbook
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Activity Log');

  // Generate Excel file
  const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  // Download with file-saver
  saveAs(blob, filename);
}

// Helper function to calculate column widths
function getColumnWidths(rows: Record<string, any>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  
  const columns = Object.keys(rows[0]);
  const widths = columns.map((col) => {
    // Start with header width
    let maxWidth = col.length + 2;
    
    // Check content widths
    rows.forEach((row) => {
      const value = String(row[col] ?? '');
      maxWidth = Math.max(maxWidth, value.length + 2);
    });
    
    // Cap the width at 50 characters
    return { wch: Math.min(maxWidth, 50) };
  });
  
  return widths;
}

// Export with metadata sheet (optional, but nice to have)
export function exportAdminActivityWithMetadata(
  items: ActivityItem[],
  filters: {
    userCount?: number;
    dateRange?: { from?: string; to?: string };
    search?: string;
  },
  filename: string = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
) {
  if (items.length === 0) {
    throw new Error('No data to export');
  }

  // Create data worksheet
  const dataRows = items.map((item) => ({
    'User': item.userFullName,
    'Role': item.userRole === 'contract_manager' ? 'Admin' : item.userRole,
    'Action': formatAuditAction(item.action),
    'Details': item.details ?? '',
    'Contract': item.projectName,
    'Project Number': item.projectNumber,
    'Contract Status': item.contractStatus,
    'Date': item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : '',
    'Time': item.createdAt ? format(new Date(item.createdAt), 'h:mm a') : '',
    'Contract ID': item.contractId,
  }));

  // Create main data sheet
  const wsData = utils.json_to_sheet(dataRows);
  
  // Auto-size columns
  const columnWidths = getColumnWidths(dataRows);
  wsData['!cols'] = columnWidths;

  // Create metadata worksheet
  const metadata: Record<string, string | number> = {
    'Export Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    'Total Events': items.length,
  };

  if (filters.userCount) {
    metadata['Users Filtered'] = filters.userCount;
  }
  if (filters.search) {
    metadata['Search Term'] = filters.search;
  }
  if (filters.dateRange?.from) {
    metadata['Date From'] = filters.dateRange.from;
  }
  if (filters.dateRange?.to) {
    metadata['Date To'] = filters.dateRange.to;
  }

  const metadataRows = Object.entries(metadata).map(([key, value]) => ({
    'Property': key,
    'Value': value,
  }));

  const wsMeta = utils.json_to_sheet(metadataRows);
  wsMeta['!cols'] = [{ wch: 20 }, { wch: 30 }];

  // Create workbook with both sheets
  const wb = utils.book_new();
  utils.book_append_sheet(wb, wsData, 'Activity Log');
  utils.book_append_sheet(wb, wsMeta, 'Metadata');

  // Generate and download
  const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, filename);
}