import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

/*
  A tiny history-API router: the app has a handful of flat routes, so a
  routing library would be more code than it saves.
*/

const listeners = new Set<() => void>();

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search) return;
  if (opts.replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  window.scrollTo(0, 0);
  listeners.forEach((l) => l());
}

export function useLocation() {
  const [loc, setLoc] = useState(() => ({ path: location.pathname, search: location.search }));
  useEffect(() => {
    const update = () =>
      setLoc((cur) =>
        cur.path === location.pathname && cur.search === location.search
          ? cur
          : { path: location.pathname, search: location.search },
      );
    listeners.add(update);
    window.addEventListener("popstate", update);
    // A child's redirect effect runs before this one subscribes, so catch up.
    update();
    return () => {
      listeners.delete(update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return loc;
}

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}
