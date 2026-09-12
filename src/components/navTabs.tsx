export const NAV_TABS = [
  {
    href: "/lists",
    label: "Shopping",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M3.5 4h2l.9 2M6.4 6h14.1l-1.8 7.5a1.5 1.5 0 01-1.46 1.15H8.85a1.5 1.5 0 01-1.46-1.15L6.4 6z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinejoin="round"
        />
        <circle cx="10" cy="20" r="1.4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <circle cx="18" cy="20" r="1.4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      </svg>
    ),
  },
  {
    href: "/items",
    label: "Items",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M12 3.5l1.6 3.4 3.7.5-2.7 2.6.6 3.7L12 11.9l-3.2 1.8.6-3.7-2.7-2.6 3.7-.5L12 3.5z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinejoin="round"
        />
        <path
          d="M5 15.5h14M7 19h10"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path
          d="M12 6.5c-1.2-1.3-3-2-5-2-1 0-2 .2-3 .5v13c1-.3 2-.5 3-.5 2 0 3.8.7 5 2 1.2-1.3 3-2 5-2 1 0 2 .2 3 .5v-13c-1-.3-2-.5-3-.5-2 0-3.8.7-5 2z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinejoin="round"
        />
        <path d="M12 6.5V19" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
        <path
          d="M5 19c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];
