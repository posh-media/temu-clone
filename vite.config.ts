import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /**
         * The Firebase SDK dominates the bundle, so it is split into its own
         * long-lived vendor chunk instead of riding along with app code that
         * changes on every deploy.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase") || id.includes("@firebase")) return "vendor-firebase";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("/react/") || id.includes("/react-dom/")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});
