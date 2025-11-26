import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";

function App() {
  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <div className="h-screen flex items-center justify-center">
          <SignInButton />
        </div>
      </SignedOut>
    </>
  );
}

import { RoomPage } from "./room/RoomPage";

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
