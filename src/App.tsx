import { useUser } from "@clerk/clerk-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { RoomPage } from "./room/RoomPage";
import { readGuestSession } from "./guest/guestSession";
import { GuestConversionGate } from "./guest/GuestConversionGate";
import { saveReferralCode } from "./referralStorage";
import { TouchWarningToast } from "./components/TouchWarningToast";
import { useTouchCapability } from "./hooks/useTouchCapability";
import { useGlobalTypingSounds } from "./hooks/useGlobalTypingSounds";

const VisitorRoomPage = lazy(() => import("./room/VisitorRoomPage").then((module) => ({ default: module.VisitorRoomPage })));
const FriendVisitPage = lazy(() => import("./room/FriendVisitPage").then((module) => ({ default: module.FriendVisitPage })));
const AdminPage = lazy(() => import("./admin/AdminPage").then((module) => ({ default: module.AdminPage })));

function RouteLoading() {
  return <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">Loading your cozytab...</div>;
}

/** Backwards-compat: /ref/:code and /addfriend/:code both redirect to /?friendRef=code */
function LegacyRedirect() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={code ? `/?friendRef=${encodeURIComponent(code)}` : "/"} replace />;
}

function App() {
  useGlobalTypingSounds();

  return (
    <BrowserRouter>
      <TouchWarningGate />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/visit/:token" element={<VisitorRoomPage />} />
          <Route path="/friend/:friendUserId" element={<FriendVisitPage />} />
          <Route path="/addfriend/:code" element={<LegacyRedirect />} />
          <Route path="/ref/:code" element={<LegacyRedirect />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function HomeRoute() {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const guestSession = useMemo(() => readGuestSession(), []);

  // Read ?friendRef= from URL, save as referral code, and clean URL
  const [friendRefCode] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("friendRef");
    if (code) {
      saveReferralCode(code);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("friendRef");
      window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
    }
    return code;
  });

  if (!isClerkLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
        Loading your cozytab...
      </div>
    );
  }

  if (!isSignedIn) {
    return <RoomPage isGuest guestSession={guestSession} friendRefCode={friendRefCode} />;
  }

  return (
    <GuestConversionGate username={clerkUser?.username ?? "User"}>
      <RoomPage isGuest={false} friendRefCode={friendRefCode} />
    </GuestConversionGate>
  );
}

function TouchWarningGate() {
  const isTouchCapable = useTouchCapability();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("nook_touch_warning_dismissed") === "true";
  });

  if (!isTouchCapable || dismissed) return null;

  const handleDismiss = (dontShowAgain: boolean) => {
    if (typeof window !== "undefined" && dontShowAgain) {
      window.localStorage.setItem("nook_touch_warning_dismissed", "true");
    }
    setDismissed(true);
  };

  return <TouchWarningToast onDismiss={handleDismiss} />;
}

export default App;
