import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
});
