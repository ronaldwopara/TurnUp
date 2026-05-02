import type { Metadata } from "next";
import CameraPage from "@/components/camera/CameraPage";
import "../camera.css";

export const metadata: Metadata = {
  title: "TurnUp Camera",
};

export default function CameraRoute() {
  return (
    <div className="mobile-frame">
      <CameraPage />
    </div>
  );
}
