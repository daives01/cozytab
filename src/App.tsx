import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { RoomPage } from "./room/RoomPage";
import { VisitorRoomPage } from "./room/VisitorRoomPage";
import { AdminPage } from "./admin/AdminPage";

const REFERRAL_CODE_KEY = "cozytab_referral_code";

function ReferralCapture() {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (code) {
      sessionStorage.setItem(REFERRAL_CODE_KEY, code);
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
  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <RoomPage isGuest />
      </SignedOut>
    </>
  );
}

function AuthenticatedApp() {
  const { user: clerkUser, isLoaded } = useUser();
  const user = useQuery(api.users.getMe);
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (user === null && isLoaded) {
      const username = clerkUser?.username ?? "User";
      const referralCode = sessionStorage.getItem(REFERRAL_CODE_KEY);
      ensureUser({ username, referralCode: referralCode ?? undefined });
      if (referralCode) {
        sessionStorage.removeItem(REFERRAL_CODE_KEY);
      }
    }
  }, [user, ensureUser, clerkUser, isLoaded]);

  if (!user) return <div className="h-screen w-screen flex items-center justify-center">Loading user...</div>;

  return <RoomPage />;
}

export default App;
