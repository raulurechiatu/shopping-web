"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const u = data.user;
      const metadata = u.user_metadata ?? {};
      setUser({
        id: u.id,
        email: u.email ?? null,
        fullName: (metadata.full_name as string) || (metadata.name as string) || null,
        avatarUrl: (metadata.avatar_url as string) || (metadata.picture as string) || null,
        isAnonymous: !!u.is_anonymous,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}

export function getInitials(user: CurrentUser | null): string {
  if (!user) return "";
  if (user.isAnonymous) return "G";
  const source = user.fullName || user.email || "";
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
