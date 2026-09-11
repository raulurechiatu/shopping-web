"use client";

import { getInitials, type CurrentUser } from "@/lib/useCurrentUser";

export default function UserAvatar({
  user,
  size = 28,
  className = "",
}: {
  user: CurrentUser | null;
  size?: number;
  className?: string;
}) {
  if (user?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(size * 0.4, 10) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#2b3a55] font-medium text-white ${className}`}
    >
      {getInitials(user)}
    </div>
  );
}
