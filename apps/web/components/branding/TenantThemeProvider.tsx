"use client";

import { ReactNode, useEffect } from "react";

interface TenantBranding {
  primaryColor?: string;
  accentColor?: string;
  customCss?: string | null;
}

interface TenantThemeProviderProps {
  branding: TenantBranding | null;
  children: ReactNode;
}

export function TenantThemeProvider({ branding, children }: TenantThemeProviderProps) {
  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;

    if (branding.primaryColor) {
      root.style.setProperty("--tenant-primary-color", branding.primaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty("--tenant-accent-color", branding.accentColor);
    }

    // Inject custom CSS if provided
    let styleElement: HTMLStyleElement | null = null;
    if (branding.customCss) {
      styleElement = document.createElement("style");
      styleElement.setAttribute("data-tenant-custom-css", "true");
      styleElement.textContent = branding.customCss;
      document.head.appendChild(styleElement);
    }

    return () => {
      root.style.removeProperty("--tenant-primary-color");
      root.style.removeProperty("--tenant-accent-color");
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, [branding]);

  return <>{children}</>;
}
