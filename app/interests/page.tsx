"use client";

import { useRouter } from "next/navigation";

import InterestsSelectionScreen from "@/components/profile/InterestsSelectionScreen";

export default function InterestsPage() {
  const router = useRouter();

  return (
    <div className="mobile-frame">
      <InterestsSelectionScreen variant="settings" onBack={() => router.push("/profile")} />
    </div>
  );
}
