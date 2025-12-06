import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { RoomPage } from "./room/RoomPage";
import { VisitorRoomPage } from "./room/VisitorRoomPage";
import { AdminPage } from "./admin/AdminPage";
import { clearGuestSession, readGuestSession } from "./room/guestSession";
import { createGuestStore, GuestStateProvider } from "./room/guestState";
import {
  clearReferralCode,
  getReferralCode,
  saveReferralCode,
} from "./referralStorage";

function ReferralCapture() {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (code) {
      saveReferralCode(code);
    }
  }, [code]);

  return <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/visit/:token" element={<VisitorRoomPage />} />
        <Route path="/ref/:code" element={<ReferralCapture />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomeRoute() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const user = useQuery(api.users.getMe, isSignedIn ? {} : "skip");
  const guestSession = useMemo(() => readGuestSession(), []);
  const isUserLoading = isSignedIn && user === undefined;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
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
  }, [clerkUser, ensureUser, guestSession, isLoaded, isSignedIn, user]);

  const isGuestView = !isSignedIn || user === null;
  const guestStore = useMemo(() => {
    if (!isGuestView) return null;
    return createGuestStore(guestSession);
  }, [guestSession, isGuestView]);

  if (isUserLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
        Loading your cozytab...
      </div>
    );
  }

  if (isGuestView && guestStore) {
    return (
      <GuestStateProvider store={guestStore}>
        <RoomPage isGuest guestSession={guestSession} />
      </GuestStateProvider>
    );
  }

  return <RoomPage isGuest={false} guestSession={guestSession} />;
}

export default App;
