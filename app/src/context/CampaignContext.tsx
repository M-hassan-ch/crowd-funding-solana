"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { Campaign } from "@/types";

interface CampaignContextType {
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  refreshCampaigns: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // ✅ Load from LocalStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("campaigns");
    if (stored) setCampaigns(JSON.parse(stored));
  }, []);

  // ✅ Save to LocalStorage whenever campaigns change
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  // Optional: Clear and refetch manually
  const refreshCampaigns = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("campaigns");
    setCampaigns([]);
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        setCampaigns,
        refreshCampaigns,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext);
  if (!ctx)
    throw new Error("useCampaigns must be used within CampaignProvider");
  return ctx;
}
