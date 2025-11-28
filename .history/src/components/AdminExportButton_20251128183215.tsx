"use client";

import { useState } from 'react';
import { Download, FileText, Table, CheckCircle } from 'lucide-react';
import { exportToCSV, exportToJSON, exportTemplates, getTimestampedFilename } from '@/lib/admin/export-utils';

type ExportType = 'users' | 'pools' | 'orders' | 'payments';

interface ExportButtonProps {
  type: ExportType;
  data?: any[];
  onExport?: () => Promise<any[]>;
  className?: string;
}

export default function AdminExportButton({ type, data, onExport, className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    
    try {
      // Get data either from prop or fetch it
      let exportData = data;
      
      if (!exportData && onExport) {
        exportData = await onExport();
      }
      
      if (!exportData || exportData.length === 0) {
        alert('No data to export');
        return;
      }

      const template = exportTemplates[type];
      const filename = getTimestampedFilename(
        format === 'csv' ? template.filename : template.filename.replace('.csv', '.json')
      );

      if (format === 'csv') {
        exportToCSV(exportData, template.columns, filename);
      } else {
        exportToJSON(exportData, filename);
      }

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
          title="Export as CSV"
        >
          <Table className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
        
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
          title="Export as JSON"
        >
          <FileText className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Success notification */}
      {showSuccess && (
        <div className="absolute top-full left-0 mt-2 px-4 py-2 bg-green-100 border border-green-200 rounded-lg flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">Exported successfully!</span>
        </div>
      )}
    </div>
  );
}

/**
 * Bulk Export Component - Export multiple datasets at once
 */
export function AdminBulkExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<ExportType>>(new Set());

  const toggleType = (type: ExportType) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const handleBulkExport = async () => {
    if (selectedTypes.size === 0) {
      alert('Please select at least one data type to export');
      return;
    }

    setIsExporting(true);

    try {
      // Fetch real data from API endpoints
      for (const type of Array.from(selectedTypes)) {
        const response = await fetch(`/api/admin/export/${type}`);
        
        if (!response.ok) {
          throw new Error(`Failed to export ${type}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const template = exportTemplates[type];
        const filename = getTimestampedFilename(template.filename);
        
        exportToCSV(data, template.columns, filename);
        
        // Small delay between exports
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      alert(`Successfully exported ${selectedTypes.size} file(s)`);
      setSelectedTypes(new Set());
      
    } catch (error) {
      console.error('Bulk export error:', error);
      alert(`Failed to export some files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Download className="w-5 h-5 text-orange-600" />
        Bulk Data Export
      </h3>
      
      <div className="space-y-3 mb-4">
        {(['users', 'pools', 'orders', 'payments'] as ExportType[]).map((type) => (
          <label key={type} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTypes.has(type)}
              onChange={() => toggleType(type)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
            />
            <div>
              <p className="font-medium text-gray-900 capitalize">{type}</p>
              <p className="text-xs text-gray-500">Export all {type} data</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleBulkExport}
        disabled={isExporting || selectedTypes.size === 0}
        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isExporting ? 'Exporting...' : `Export Selected (${selectedTypes.size})`}
      </button>
    </div>
  );
}

// Mock data generator for demo purposes
function generateMockData(type: ExportType): any[] {
  switch (type) {
    case 'users':
      return [
        { id: '1', email: 'user1@example.com', name: 'John Doe', role: 'USER', status: 'active', createdAt: new Date(), totalOrders: 5, totalSpent: 250.00 },
        { id: '2', email: 'user2@example.com', name: 'Jane Smith', role: 'USER', status: 'active', createdAt: new Date(), totalOrders: 3, totalSpent: 180.00 },
      ];
    case 'pools':
      return [
        { id: '1', productTitle: 'Product A', status: 'ACTIVE', targetQty: 100, pledgedQty: 75, progress: 75, deadlineAt: new Date(), createdAt: new Date() },
        { id: '2', productTitle: 'Product B', status: 'FULFILLED', targetQty: 50, pledgedQty: 50, progress: 100, deadlineAt: new Date(), createdAt: new Date() },
      ];
    case 'orders':
      return [
        { id: '1', userId: 'u1', userEmail: 'user@example.com', productTitle: 'Product A', quantity: 2, unitPrice: 25.00, totalPrice: 50.00, status: 'completed', createdAt: new Date() },
      ];
    case 'payments':
      return [
        { id: '1', orderId: 'o1', userId: 'u1', amount: 50.00, currency: 'USD', status: 'completed', paymentMethod: 'card', createdAt: new Date() },
      ];
    default:
      return [];
  }
}
