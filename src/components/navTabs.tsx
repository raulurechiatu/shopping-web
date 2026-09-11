export const NAV_TABS = [
  {
    href: "/lists",
    label: "Shopping",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
        />
        <path
          d="M8 9h8M8 12.5h8M8 16h5"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.5}
          strokeLinecap="round"
        />
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
