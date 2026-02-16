import "./styles.css";
import "./ui/components/model-selector.js";
import "./ui/app.ts";

// Cache busting - these values are injected at build time
declare const __BUILD_TIMESTAMP__: string;
declare const __APP_VERSION__: string;

console.log("[LYNX UI] Build timestamp:", __BUILD_TIMESTAMP__);
console.log("[LYNX UI] Version:", __APP_VERSION__);

// Force reload if cached version is detected
if (typeof window !== "undefined") {
  const currentBuild = __BUILD_TIMESTAMP__;
  const lastBuild = localStorage.getItem("lynx-build-timestamp");
  
  if (lastBuild && lastBuild !== currentBuild) {
    console.log("[LYNX UI] New build detected, reloading...");
    localStorage.setItem("lynx-build-timestamp", currentBuild);
    // Optional: force reload if needed
    // window.location.reload();
  } else {
    localStorage.setItem("lynx-build-timestamp", currentBuild);
  }
}
