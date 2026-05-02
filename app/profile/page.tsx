import type { Metadata } from "next";
import ProfilePage from "@/components/profile/ProfilePage";
import "../browse.css";
import "../profile.css";

export const metadata: Metadata = {
  title: "TurnUp — Profile",
};

export default function ProfileRoute() {
  return (
    <div className="mobile-frame">
      <ProfilePage />
    </div>
  );
}
