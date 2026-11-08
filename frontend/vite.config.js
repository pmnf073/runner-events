import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Android app (TWA): Chrome only opens the site without the browser bar when
// /.well-known/assetlinks.json lists the app's package and signing-key fingerprint.
// Both come from the environment (Vercel), so the file is only emitted once they are set.
function androidAssetLinks(env) {
  return {
    name: "android-asset-links",
    apply: "build",
    generateBundle() {
      const fingerprints = (env.TWA_SHA256_FINGERPRINTS || "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);
      if (!fingerprints.length) return;
      const packageName = env.TWA_PACKAGE_NAME || "pt.alvercaurbanrunners.app";
      const statements = [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
      }];
      this.emitFile({
        type: "asset",
        fileName: ".well-known/assetlinks.json",
        source: `${JSON.stringify(statements, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "TWA_"), ...process.env };
  return {
    plugins: [react(), androidAssetLinks(env)],
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:3001",
        "/auth": "http://localhost:3001",
      },
    },
  };
});
