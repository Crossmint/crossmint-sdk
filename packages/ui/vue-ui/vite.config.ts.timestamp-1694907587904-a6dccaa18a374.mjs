// vite.config.ts
import vue from "file:///C:/Users/Maxwell/code/paella/crossmint-client-sdk-stable/node_modules/.pnpm/@vitejs+plugin-vue@4.3.4_vite@4.4.9_vue@3.3.4/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { resolve } from "path";
import { defineConfig } from "file:///C:/Users/Maxwell/code/paella/crossmint-client-sdk-stable/node_modules/.pnpm/vite@4.4.9_@types+node@18.16.14/node_modules/vite/dist/node/index.js";
import dts from "file:///C:/Users/Maxwell/code/paella/crossmint-client-sdk-stable/node_modules/.pnpm/vite-plugin-dts@3.5.3_@types+node@18.16.14_typescript@5.2.2_vite@4.4.9/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\Maxwell\\code\\paella\\crossmint-client-sdk-stable\\packages\\ui\\vue-ui";
var vite_config_default = defineConfig({
  plugins: [vue(), dts()],
  build: {
    sourcemap: true,
    outDir: "dist",
    lib: {
      entry: resolve(__vite_injected_original_dirname, "./src/index.ts"),
      name: "CrossmintVueSDKUi",
      formats: ["es", "cjs"],
      fileName: "index"
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled into your library
      external: ["vue"],
      output: {
        // Provide global variables to use in the UMD build for externalized deps
        globals: {
          vue: "Vue"
        },
        exports: "named"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxNYXh3ZWxsXFxcXGNvZGVcXFxccGFlbGxhXFxcXGNyb3NzbWludC1jbGllbnQtc2RrLXN0YWJsZVxcXFxwYWNrYWdlc1xcXFx1aVxcXFx2dWUtdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE1heHdlbGxcXFxcY29kZVxcXFxwYWVsbGFcXFxcY3Jvc3NtaW50LWNsaWVudC1zZGstc3RhYmxlXFxcXHBhY2thZ2VzXFxcXHVpXFxcXHZ1ZS11aVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTWF4d2VsbC9jb2RlL3BhZWxsYS9jcm9zc21pbnQtY2xpZW50LXNkay1zdGFibGUvcGFja2FnZXMvdWkvdnVlLXVpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHZ1ZSBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgZHRzIGZyb20gXCJ2aXRlLXBsdWdpbi1kdHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbdnVlKCksIGR0cygpXSxcbiAgICBidWlsZDoge1xuICAgICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgICAgIG91dERpcjogXCJkaXN0XCIsXG4gICAgICAgIGxpYjoge1xuICAgICAgICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL2luZGV4LnRzXCIpLFxuICAgICAgICAgICAgbmFtZTogXCJDcm9zc21pbnRWdWVTREtVaVwiLFxuICAgICAgICAgICAgZm9ybWF0czogW1wiZXNcIiwgXCJjanNcIl0sXG4gICAgICAgICAgICBmaWxlTmFtZTogXCJpbmRleFwiLFxuICAgICAgICB9LFxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAvLyBtYWtlIHN1cmUgdG8gZXh0ZXJuYWxpemUgZGVwcyB0aGF0IHNob3VsZG4ndCBiZSBidW5kbGVkIGludG8geW91ciBsaWJyYXJ5XG4gICAgICAgICAgICBleHRlcm5hbDogW1widnVlXCJdLFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZSBnbG9iYWwgdmFyaWFibGVzIHRvIHVzZSBpbiB0aGUgVU1EIGJ1aWxkIGZvciBleHRlcm5hbGl6ZWQgZGVwc1xuICAgICAgICAgICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgdnVlOiBcIlZ1ZVwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXhwb3J0czogXCJuYW1lZFwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFhLE9BQU8sU0FBUztBQUNyYixTQUFTLGVBQWU7QUFDeEIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBSGhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQUEsRUFDdEIsT0FBTztBQUFBLElBQ0gsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQ1IsS0FBSztBQUFBLE1BQ0QsT0FBTyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLE1BQzFDLE1BQU07QUFBQSxNQUNOLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUNyQixVQUFVO0FBQUEsSUFDZDtBQUFBLElBQ0EsZUFBZTtBQUFBO0FBQUEsTUFFWCxVQUFVLENBQUMsS0FBSztBQUFBLE1BQ2hCLFFBQVE7QUFBQTtBQUFBLFFBRUosU0FBUztBQUFBLFVBQ0wsS0FBSztBQUFBLFFBQ1Q7QUFBQSxRQUNBLFNBQVM7QUFBQSxNQUNiO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
