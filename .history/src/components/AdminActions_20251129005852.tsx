"use client";

import { useEffect, useState } from 'react';
import AdminDeleteButton from './AdminDeleteButton';

interface AdminActionsProps {
  savedListingId?: string;
  productUrl?: string;
  productTitle: string;
}

export default function AdminActions({ 
  savedListingId, 
  productUrl, 
  productTitle 
}: AdminActionsProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check admin status by calling the /api/me endpoint
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.ok && data.user) {
          setIsAdmin(data.user.role === 'ADMIN');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Don't render anything if not admin or still loading
  if (isLoading || !isAdmin) {
    return null;
  }

  const handleDeleted = () => {
    // Refresh the page to reflect the deletion
    window.location.reload();
  };

  return (
    <div className="admin-actions flex items-center gap-2">
      <AdminDeleteButton
        listingId={savedListingId}
        listingUrl={productUrl}
        productTitle={productTitle}
        onDeleted={handleDeleted}
      />
    </div>
  );
}