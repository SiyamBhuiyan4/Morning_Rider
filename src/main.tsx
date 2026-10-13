import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import { useLang } from "./lib/prefs";
import { SessionProvider } from "./lib/session";
import { ToastProvider, errorText } from "./lib/toast";
import "./index.css";
import { t } from "./lib/prefs";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

/** A failed query (e.g. a session revoked mid-page) shows a message instead of a blank screen. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-bold">{t("Something went wrong")}</p>
          <p className="mt-2 text-sm text-ink-2">{errorText(this.state.error)}</p>
          <button
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            onClick={() => location.assign("/app")}
          >
            {t("Reload")}
          </button>
        </div>
      </div>
    );
  }
}

/** Re-mounts the app when the language changes, so every string re-translates. */
function LangRoot() {
  const lang = useLang();
  return <App key={lang} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <ToastProvider>
          <SessionProvider>
            <LangRoot />
          </SessionProvider>
        </ToastProvider>
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>,
);
