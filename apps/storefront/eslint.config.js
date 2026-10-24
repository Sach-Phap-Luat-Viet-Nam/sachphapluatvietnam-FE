import { globalIgnores } from "eslint/config";
import { nextConfig } from "@slvn/config/eslint/next";

// `mockServiceWorker.js` do `msw init` sinh ra, không sửa tay.
export default [...nextConfig, globalIgnores(["public/mockServiceWorker.js"])];
