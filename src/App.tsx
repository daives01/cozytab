import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { RoomPage } from "./room/RoomPage";
import { VisitorRoomPage } from "./room/VisitorRoomPage";
import { FriendVisitPage } from "./room/FriendVisitPage";
import { AdminPage } from "./admin/AdminPage";
import { clearGuestSession, readGuestSession } from "./guest/guestSession";
import { createGuestStore, GuestStateProvider } from "./guest/state";
import {
  clearReferralCode,
  getReferralCode,
  saveReferralCode,
} from "./referralStorage";
import { TouchWarningToast } from "./components/TouchWarningToast";
import { useTouchCapability } from "./hooks/useTouchCapability";
import { useGlobalTypingSounds } from "./hooks/useGlobalTypingSounds";

/** Backwards-compat: /ref/:code and /addfriend/:code both redirect to /?friendRef=code */
function LegacyRedirect() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={code ? `/?friendRef=${code}` : "/"} replace />;
}

function App() {
  useGlobalTypingSounds();

  return (
    <BrowserRouter>
      <TouchWarningGate />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/visit/:token" element={<VisitorRoomPage />} />
        <Route path="/friend/:friendUserId" element={<FriendVisitPage />} />
        <Route path="/addfriend/:code" element={<LegacyRedirect />} />
        <Route path="/ref/:code" element={<LegacyRedirect />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomeRoute() {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const shouldFetchAuthedUser = isClerkLoaded && isSignedIn;
  const user = useQuery(api.users.getMe, shouldFetchAuthedUser ? {} : "skip");
  const guestSession = useMemo(() => readGuestSession(), []);
  const isUserLoading = shouldFetchAuthedUser && user === undefined;

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

  useEffect(() => {
    if (!shouldFetchAuthedUser) return;
    if (user === undefined || user !== null) return;

    const username = clerkUser?.username ?? "User";
    const referralCode = getReferralCode() ?? undefined;

    void ensureUser({
      username,
      referralCode,
      guestSession: {
        coins: guestSession.coins,
        inventoryIds: guestSession.inventoryIds,
        roomItems: guestSession.roomItems,
        shortcuts: guestSession.shortcuts,
        onboardingCompleted: guestSession.onboardingCompleted,
        cursorColor: guestSession.cursorColor,
      },
    })
      .then(() => {
        if (referralCode) {
          clearReferralCode();
        }
        clearGuestSession();
      })
      .catch((error) => {
        console.error("Failed to ensure user", error);
      });
  }, [clerkUser, ensureUser, guestSession, shouldFetchAuthedUser, user]);

  const isGuestView = isClerkLoaded ? !isSignedIn || user === null : false;
  const guestStore = useMemo(() => {
    if (!isGuestView) return null;
    return createGuestStore(guestSession);
  }, [guestSession, isGuestView]);

  if (!isClerkLoaded || isUserLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
        Loading your cozytab...
      </div>
    );
  }

  if (isGuestView && guestStore) {
    return (
      <GuestStateProvider store={guestStore}>
        <RoomPage isGuest guestSession={guestSession} friendRefCode={friendRefCode} />
      </GuestStateProvider>
    );
  }

  return <RoomPage isGuest={false} guestSession={guestSession} friendRefCode={friendRefCode} />;
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
