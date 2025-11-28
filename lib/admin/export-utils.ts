"use client";

/**
 * Admin Data Export Utilities
 * Provides functions to export admin data as CSV files
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function exportToCSV(data: any[], columns: ExportColumn[], filename: string) {
  // Create CSV header
  const headers = columns.map(col => col.label).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Apply custom formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value);
      
      // Wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  }).join('\n');
  
  // Combine header and rows
  const csv = `${headers}\n${rows}`;
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: any[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Pre-configured export templates
export const exportTemplates = {
  users: {
    columns: [
      { key: 'id', label: 'User ID' },
      { key: 'email', label: 'Email' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created Date', format: (val: any) => new Date(val).toLocaleDateString() },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalSpent', label: 'Total Spent', format: (val: any) => `$${Number(val).toFixed(2)}` },
    ],
    filename: 'users-export.csv'
  },
  
  pools: {
    columns: [
      { key: 'id', label: 'Pool ID' },
      { key: 'productTitle', label: 'Product' },
      { key: 'status', label: 'Status' },
      { key: 'targetQty', label: 'Target Quantity' },
      { key: 'pledgedQty', label: 'Pledged Quantity' },
      { key: 'progress', label: 'Progress %', format: (val: any) => `${val}%` },
      { key: 'deadlineAt', label: 'Deadline', format: (val: any) => val ? new Date(val).toLocaleDateString() : 'N/A' },
      { key: 'createdAt', label: 'Created Date', format: (val: any) => new Date(val).toLocaleDateString() },
    ],
    filename: 'pools-export.csv'
  },
  
  orders: {
    columns: [
      { key: 'id', label: 'Order ID' },
      { key: 'userId', label: 'User ID' },
      { key: 'userEmail', label: 'User Email' },
      { key: 'productTitle', label: 'Product' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unitPrice', label: 'Unit Price', format: (val: any) => `$${Number(val).toFixed(2)}` },
      { key: 'totalPrice', label: 'Total Price', format: (val: any) => `$${Number(val).toFixed(2)}` },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Order Date', format: (val: any) => new Date(val).toLocaleDateString() },
    ],
    filename: 'orders-export.csv'
  },
  
  payments: {
    columns: [
      { key: 'id', label: 'Payment ID' },
      { key: 'orderId', label: 'Order ID' },
      { key: 'userId', label: 'User ID' },
      { key: 'amount', label: 'Amount', format: (val: any) => `$${Number(val).toFixed(2)}` },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'createdAt', label: 'Payment Date', format: (val: any) => new Date(val).toLocaleDateString() },
    ],
    filename: 'payments-export.csv'
  }
};

/**
 * Generate a timestamped filename
 */
export function getTimestampedFilename(baseFilename: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [name, ext] = baseFilename.split('.');
  return `${name}-${timestamp}.${ext}`;
}
