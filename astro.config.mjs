import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  site: "https://leonavit.github.io",
  base: isGitHubPagesBuild ? "/Tahara-Guide" : "/",
  integrations: [react()],
});
