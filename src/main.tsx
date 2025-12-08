import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, useAuth } from "@clerk/clerk-react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"
import './App.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
          colorPrimary: "#111827",
          colorText: "#111827",
          colorBackground: "#f8f4ec",
          colorInputBackground: "#ffffff",
          colorInputText: "#111827",
          colorShimmer: "#fff7e6",
          borderRadius: "12px",
        },
        elements: {
          rootBox: "bg-[var(--paper)] text-[var(--ink)] rounded-[24px] overflow-hidden",
          card: "shadow-[8px_8px_0px_0px_var(--color-foreground)] border-2 border-[var(--color-foreground)] rounded-[24px] overflow-hidden bg-[var(--paper)]",
          modalContent: "rounded-[12px] overflow-hidden",
          headerTitle: "text-2xl font-bold text-[var(--ink)]",
          headerSubtitle: "text-sm uppercase tracking-[0.12em] text-[var(--ink-muted)]",
          formButtonPrimary:
            "bg-[var(--foreground)] text-white rounded-2xl border-2 border-[var(--color-foreground)] shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          formButtonSecondary:
            "rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--paper)] shadow-[3px_3px_0px_0px_var(--color-foreground)] text-[var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          formFieldInput:
            "border-2 border-[var(--color-foreground)] rounded-2xl bg-white shadow-[2px_2px_0px_0px_var(--color-foreground)] focus:border-[var(--color-foreground)] focus:ring-0 text-[var(--ink)]",
          formFieldLabel: "text-[var(--ink)] font-semibold tracking-[0.04em]",
          socialButtonsBlockButton:
            "border-2 border-[var(--color-foreground)] rounded-2xl bg-[var(--paper)] shadow-[4px_4px_0px_0px_var(--color-foreground)] text-[var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          footerAction__link: "text-[var(--ink)] underline decoration-2",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
)