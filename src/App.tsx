import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";
import { RoomPage } from "./room/RoomPage";

function App() {
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
  const user = useQuery(api.users.getMe);
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (user === null) {
      ensureUser({ username: "User" });
    }
  }, [user, ensureUser]);

  if (!user) return <div className="h-screen w-screen flex items-center justify-center">Loading user...</div>;

  return <RoomPage />;
}

export default App;
