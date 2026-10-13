/*
  The same code builds two websites:
    main  — public pages, tracking, merchant + rider panels
    admin — the admin panel only, deployed separately and never linked
  The server enforces the split too (auth.login vs auth.adminLogin), so this
  flag only decides what each site shows.
*/
export const IS_ADMIN_PORTAL = import.meta.env.VITE_PORTAL === "admin";
