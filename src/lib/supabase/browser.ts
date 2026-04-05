"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  }

  return client;
}
