"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Guard component that redirects users to /information page
 * if their profile is incomplete (OAuth users who haven't filled in details)
 */
export function ProfileCompleteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check when session is loaded
    if (status === "loading") return;
    
    // Don't redirect if already on information page or login/register pages
    if (pathname === "/information" || pathname === "/login" || pathname === "/register") {
      return;
    }

    // Check if user is authenticated but profile incomplete
    if (session?.user) {
      const profileComplete = (session.user as any).profileComplete;
      
      // Redirect to information page if profile incomplete
      if (profileComplete === false) {
        router.push("/information");
      }
    }
  }, [session, status, pathname, router]);

  return <>{children}</>;
}
