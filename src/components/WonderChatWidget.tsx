import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * WonderChat Widget Component
 * 
 * Controls visibility of the Wonderchat chatbot widget based on current route.
 * The chatbot appears only on patient-facing pages and is hidden on dentist/admin portals.
 * 
 * Note: The Wonderchat script is loaded in index.html for faster initial load.
 * This component only controls visibility via CSS.
 */
export default function WonderChatWidget() {
  const location = useLocation();

  useEffect(() => {
    // Define paths where the chatbot should appear (patient-facing pages only)
    const allowedPaths = [
      "/",
      "/home",
      "/dentists",
      "/dentist/",
      "/contact",
      "/about",
      "/auth",
      "/dashboard",
      "/profile-settings",
      "/reset-password"
    ];

    // Check if current path matches any allowed path
    const isAllowed = allowedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(path)
    );

    // Exclude dentist/admin portal routes explicitly
    const isDentistOrAdminRoute = 
      location.pathname.startsWith("/dentist-dashboard") ||
      location.pathname.startsWith("/dentist-portal") ||
      location.pathname.startsWith("/admin");

    // Determine if widget should be visible
    const shouldShowWidget = isAllowed && !isDentistOrAdminRoute;

    // Wait for widget to be loaded by checking for common Wonderchat elements
    const checkAndToggleWidget = () => {
      // Try to find the Wonderchat widget container
      // Wonderchat typically creates elements with specific IDs or classes
      const widgetSelectors = [
        '[id*="wonderchat"]',
        '[class*="wonderchat"]',
        'iframe[src*="wonderchat"]',
        '[data-wonderchat]'
      ];

      let widgetElement = null;
      for (const selector of widgetSelectors) {
        widgetElement = document.querySelector(selector);
        if (widgetElement) break;
      }

      if (widgetElement) {
        // Control visibility with display property
        if (shouldShowWidget) {
          (widgetElement as HTMLElement).style.display = '';
          console.log("✅ Wonderchat widget visible on:", location.pathname);
        } else {
          (widgetElement as HTMLElement).style.display = 'none';
          console.log("🚫 Wonderchat widget hidden on:", location.pathname);
        }
      } else {
        console.log("⏳ Wonderchat widget not found yet, will retry...");
      }
    };

    // Check immediately
    checkAndToggleWidget();

    // Also check after a short delay to ensure widget is loaded
    const timeoutId = setTimeout(checkAndToggleWidget, 500);
    const timeoutId2 = setTimeout(checkAndToggleWidget, 1000);
    const timeoutId3 = setTimeout(checkAndToggleWidget, 2000);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [location]);

  // This component doesn't render anything visible
  return null;
}
