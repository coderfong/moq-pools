"use client";

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface AdminDeleteButtonProps {
  listingId?: string;
  listingUrl?: string;
  productTitle: string;
  onDeleted?: () => void;
}

export default function AdminDeleteButton({ 
  listingId, 
  listingUrl, 
  productTitle, 
  onDeleted 
}: AdminDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!listingId && !listingUrl) return;
    
    setIsDeleting(true);
    try {
      const params = new URLSearchParams();
      if (listingId) params.append('id', listingId);
      if (listingUrl) params.append('url', listingUrl);
      
      const response = await fetch(`/api/admin/delete-listing?${params.toString()}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.ok) {
        onDeleted?.();
        setShowConfirm(false);
        // Show success toast or notification
        alert(`Successfully deleted ${result.deletedCount} listing(s)`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Admin Delete</h3>
          <p className="text-gray-700 mb-4">
            Are you sure you want to permanently delete this listing?
          </p>
          <p className="text-sm text-gray-600 mb-6 font-medium">
            "{productTitle}"
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300"
      title="Admin: Delete this listing permanently"
    >
      <Trash2 size={16} />
    </button>
  );
}