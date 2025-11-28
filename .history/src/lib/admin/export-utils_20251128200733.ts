/**
 * Admin Export Utilities
 * Functions for exporting admin data to various formats
 */

export type ExportColumn = {
  key: string;
  label: string;
  format?: (value: any) => string;
};

export type ExportTemplate = {
  filename: string;
  columns: ExportColumn[];
};

/**
 * Export templates for different data types
 */
export const exportTemplates: Record<string, ExportTemplate> = {
  users: {
    filename: 'users_export.csv',
    columns: [
      { key: 'id', label: 'User ID' },
      { key: 'email', label: 'Email' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At', format: (date) => new Date(date).toLocaleDateString() },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalSpent', label: 'Total Spent', format: (amount) => `$${Number(amount).toFixed(2)}` }
    ]
  },
  pools: {
    filename: 'pools_export.csv',
    columns: [
      { key: 'id', label: 'Pool ID' },
      { key: 'productTitle', label: 'Product Title' },
      { key: 'status', label: 'Status' },
      { key: 'targetQty', label: 'Target Quantity' },
      { key: 'pledgedQty', label: 'Pledged Quantity' },
      { key: 'progress', label: 'Progress %' },
      { key: 'deadlineAt', label: 'Deadline', format: (date) => new Date(date).toLocaleDateString() },
      { key: 'createdAt', label: 'Created At', format: (date) => new Date(date).toLocaleDateString() }
    ]
  },
  orders: {
    filename: 'orders_export.csv',
    columns: [
      { key: 'id', label: 'Order ID' },
      { key: 'userId', label: 'User ID' },
      { key: 'userEmail', label: 'User Email' },
      { key: 'productTitle', label: 'Product Title' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unitPrice', label: 'Unit Price', format: (amount) => `$${Number(amount).toFixed(2)}` },
      { key: 'totalPrice', label: 'Total Price', format: (amount) => `$${Number(amount).toFixed(2)}` },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At', format: (date) => new Date(date).toLocaleDateString() }
    ]
  },
  payments: {
    filename: 'payments_export.csv',
    columns: [
      { key: 'id', label: 'Payment ID' },
      { key: 'orderId', label: 'Order ID' },
      { key: 'userId', label: 'User ID' },
      { key: 'amount', label: 'Amount', format: (amount) => `$${Number(amount).toFixed(2)}` },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'createdAt', label: 'Created At', format: (date) => new Date(date).toLocaleDateString() }
    ]
  }
};

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], columns: ExportColumn[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create CSV headers
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      
      // Apply formatting if provided
      if (col.format && value != null) {
        value = col.format(value);
      }
      
      // Handle null/undefined values
      if (value == null) {
        value = '';
      }
      
      // Escape commas and quotes in CSV
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(',');
  });
  
  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Create and download file
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Create a timestamped filename
 */
export function getTimestampedFilename(baseFilename: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const [name, ext] = baseFilename.split('.');
  return `${name}_${timestamp}.${ext}`;
}

/**
 * Download a file to the user's device
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate data before export
 */
export function validateExportData(data: any[], type: string): { isValid: boolean; error?: string } {
  if (!data || !Array.isArray(data)) {
    return { isValid: false, error: 'Data must be an array' };
  }
  
  if (data.length === 0) {
    return { isValid: false, error: 'No data to export' };
  }
  
  if (!exportTemplates[type]) {
    return { isValid: false, error: `Unknown export type: ${type}` };
  }
  
  // Check if data has required fields
  const template = exportTemplates[type];
  const firstRow = data[0];
  const missingFields = template.columns
    .filter(col => !(col.key in firstRow))
    .map(col => col.key);
  
  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      error: `Missing required fields: ${missingFields.join(', ')}` 
    };
  }
  
  return { isValid: true };
}

/**
 * Transform data for export (sanitize, format, etc.)
 */
export function transformForExport(data: any[], type: string): any[] {
  const template = exportTemplates[type];
  
  return data.map(row => {
    const transformed: any = {};
    
    template.columns.forEach(col => {
      let value = row[col.key];
      
      // Apply any transformations needed for export
      if (typeof value === 'object' && value !== null) {
        // Convert objects to strings for CSV compatibility
        value = JSON.stringify(value);
      }
      
      transformed[col.key] = value;
    });
    
    return transformed;
  });
}