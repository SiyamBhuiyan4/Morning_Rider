import { useEffect, type ReactNode } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { navigate, useLocation } from "./lib/router";
import { useSession } from "./lib/session";
import { Shell } from "./components/Shell";
import { Spinner } from "./components/ui";
import { Home, Join, Login, Register, RiderLogin, Track } from "./pages/public";
import { AdminDashboard, Merchants, Payouts, RateSettings, RiderCashAdmin, Riders } from "./pages/admin";
import { Messages } from "./pages/messages";
import { BulkUpload, MerchantDashboard, MerchantPayments } from "./pages/merchant";
import { RiderCash, RiderTasks } from "./pages/rider";
import { Account, EditParcel, FraudCheck, NewParcel, ParcelsPage } from "./pages/shared";
import { PrintLabels, PrintPayout } from "./pages/print";
import { VerifyBusiness } from "./pages/verify";
import { IS_ADMIN_PORTAL } from "./lib/portal";

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

export default function App() {
  const { path, search } = useLocation();
  const { me } = useSession();

  // The admin website has no public pages: everything starts at its login.
  if (
    IS_ADMIN_PORTAL &&
    (path === "/" || path === "/register" || path === "/rider" || path === "/join" || path.startsWith("/track"))
  ) {
    return <Redirect to={me ? "/app" : "/login"} />;
  }

  // Public pages
  if (path === "/") return <Home />;
  if (path === "/track" || path.startsWith("/track/")) {
    return <Track code={decodeURIComponent(path.slice(7)) || undefined} />;
  }
  if (path === "/join") return <Join />;
  if (path === "/login" || path === "/register" || path === "/rider") {
    if (me === undefined) return <Spinner className="h-full items-center" />;
    if (me) return <Redirect to="/app" />;
    return path === "/login" ? <Login /> : path === "/rider" ? <RiderLogin /> : <Register />;
  }

  // Everything below needs a signed-in user
  if (me === undefined) return <Spinner className="h-full items-center" />;
  if (me === null) return <Redirect to="/login" />;

  if (path === "/print/labels") {
    const ids = (new URLSearchParams(search).get("ids") ?? "").split(",").filter(Boolean) as Id<"parcels">[];
    return <PrintLabels ids={ids.slice(0, 100)} />;
  }
  if (path.startsWith("/print/payout/")) return <PrintPayout id={path.slice(14) as Id<"payouts">} />;

  // Each website only serves its own roles; the server already enforces this
  // at sign-in, so reaching here with the wrong role means a stale session.
  if ((me.role === "admin") !== IS_ADMIN_PORTAL) return <WrongPortal />;

  return <Shell>{route(path, me.role)}</Shell>;
}

function WrongPortal() {
  const { signOut } = useSession();
  useEffect(() => {
    void signOut().then(() => navigate("/login", { replace: true }));
  }, [signOut]);
  return null;
}

function route(path: string, role: "admin" | "merchant" | "rider"): ReactNode {
  if (path === "/app/account") return <Account />;

  if (role === "rider") {
    if (path === "/app") return <RiderTasks />;
    if (path === "/app/cash") return <RiderCash />;
    return <Redirect to="/app" />;
  }

  // admin + merchant
  if (path === "/app/parcels") return <ParcelsPage />;
  if (path === "/app/parcels/new") return <NewParcel />;
  if (path === "/app/parcels/bulk") return <BulkUpload />;
  if (path.startsWith("/app/parcels/edit/")) return <EditParcel key={path} id={path.slice(18) as Id<"parcels">} />;
  if (path === "/app/fraud") return <FraudCheck />;

  if (role === "merchant") {
    if (path === "/app") return <MerchantDashboard />;
    if (path === "/app/payments") return <MerchantPayments />;
    if (path === "/app/verify") return <VerifyBusiness />;
    return <Redirect to="/app" />;
  }

  if (path === "/app") return <AdminDashboard />;
  if (path === "/app/merchants") return <Merchants />;
  if (path === "/app/riders") return <Riders />;
  if (path === "/app/payouts") return <Payouts />;
  if (path === "/app/cash") return <RiderCashAdmin />;
  if (path === "/app/settings") return <RateSettings />;
  if (path === "/app/messages") return <Messages />;
  return <Redirect to="/app" />;
}
