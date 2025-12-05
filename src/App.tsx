import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { RoomPage } from "./room/RoomPage";
import { VisitorRoomPage } from "./room/VisitorRoomPage";
import { AdminPage } from "./admin/AdminPage";
import { clearGuestSession, readGuestSession } from "./room/guestSession";
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (user === undefined) return;
    if (user !== null) return;

    const username = clerkUser?.username ?? "User";
    const referralCode = getReferralCode();
    const session = guestSession;

    const run = async () => {
      try {
        await ensureUser({
          username,
          referralCode: referralCode ?? undefined,
          guestSession: {
            coins: session.coins,
            inventoryIds: session.inventoryIds,
            roomItems: session.roomItems,
            shortcuts: session.shortcuts,
            onboardingCompleted: session.onboardingCompleted,
          },
        });
        if (referralCode) {
          clearReferralCode();
        }
        clearGuestSession();
      } catch (error) {
        console.error("Failed to ensure user", error);
      }
    };

    void run();
  }, [clerkUser, ensureUser, guestSession, isLoaded, isSignedIn, user]);

  const isGuestView = !isSignedIn || !user;

  return <RoomPage isGuest={isGuestView} guestSession={guestSession} />;
}

export default App;
