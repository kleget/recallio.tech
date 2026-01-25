"use client";

import { useEffect } from "react";

import { getCookie } from "./lib/client-cookies";

export default function ThemeClient() {
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || getCookie("theme");
    if (storedTheme) {
      document.documentElement.dataset.theme = storedTheme;
    }
    const storedPalette = localStorage.getItem("palette") || getCookie("palette");
    if (storedPalette) {
      const paletteMap = {
        slate: "steel",
        graphite: "ice",
        ash: "iris",
        ink: "amber"
      };
      const candidate = paletteMap[storedPalette] || storedPalette;
      const normalized = ["ice", "iris", "amber", "steel"].includes(candidate)
        ? candidate
        : "ice";
      document.documentElement.dataset.palette = normalized;
    }
  }, []);

  return null;
}
