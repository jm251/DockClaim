export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "DockClaim",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  demoMode: ["1", "true", "yes", "on"].includes((process.env.NEXT_PUBLIC_DEMO_MODE || process.env.DEMO_MODE || "").toLowerCase()),
};
