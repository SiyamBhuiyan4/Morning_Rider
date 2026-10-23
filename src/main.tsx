import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertCircle, RotateCcw, LogOut } from "lucide-react";
import App from "./App";
import { useLang } from "./lib/prefs";
import { SessionProvider } from "./lib/session";
import { ToastProvider, errorText } from "./lib/toast";
import "./index.css";
import { t } from "./lib/prefs";

const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  "https://tough-badger-435.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

function isSessionOrBackendMismatch(error: unknown): boolean {
  if (!error) return false;

  let msg = "";
  if (typeof error === "string") {
    msg = error;
  } else if (error instanceof ConvexError) {
    msg = typeof error.data === "string" ? error.data : JSON.stringify(error.data);
  } else if (error instanceof Error) {
    msg = `${error.name} ${error.message} ${error.stack ?? ""}`;
  } else if (typeof error === "object" && error !== null && "message" in error) {
    msg = String((error as { message?: unknown }).message ?? "");
  } else {
    msg = String(error);
  }

  const lower = msg.toLowerCase();

  const sessionKeywords = [
    "session",
    "token",
    "not signed in",
    "useauthed",
    "unauthorized",
    "unauthenticated",
    "forbidden",
    "signed-out",
    "auth",
  ];

  const backendKeywords = [
    "backend",
    "mismatch",
    "convex",
    "network",
    "failed to fetch",
    "fetch failed",
    "websocket",
    "connection",
    "could not reach",
    "server error",
    "load failed",
    "500",
    "502",
    "503",
    "504",
  ];

  if ([...sessionKeywords, ...backendKeywords].some((keyword) => lower.includes(keyword))) {
    return true;
  }

  try {
    if (localStorage.getItem("mr.session")) {
      return true;
    }
  } catch {
    // Ignore private mode or storage restrictions
  }

  return false;
}

/** A failed query (e.g. a session revoked mid-page) shows a message instead of a blank screen. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore private mode or storage restrictions
    }
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    let message = "";
    try {
      message = errorText(this.state.error);
    } catch {
      message = t("Something went wrong. Please try again.");
    }

    let showReset = false;
    try {
      showReset = isSessionOrBackendMismatch(this.state.error);
    } catch {
      showReset = true;
    }

    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-page p-4 text-ink sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand dark:bg-brand-50/20">
            <AlertCircle className="size-7" />
          </div>

          <h1 className="mt-5 text-xl font-bold text-ink">
            {t("Something went wrong")}
          </h1>

          <p className="mt-2.5 text-sm leading-relaxed text-ink-2 break-words">
            {message}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-navy-100 hover:bg-navy-50 active:scale-[0.98]"
            >
              <RotateCcw className="size-4 shrink-0" />
              {t("Reload")}
            </button>

            {showReset && (
              <button
                type="button"
                onClick={this.handleResetSession}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-600 active:scale-[0.98]"
              >
                <LogOut className="size-4 shrink-0" />
                {t("Reset Session & Go to Login")}
              </button>
            )}
          </div>
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
