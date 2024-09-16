import { exec } from "child_process";
import chokidar from "chokidar";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run tsup in watch mode
const tsup = exec(
    "tsup src/index.ts --external react,react-dom --format esm,cjs --outDir ./dist --dts --sourcemap --watch --no-clean"
);

tsup.stdout.on("data", (data) => {
    console.log(data);
    if (data.includes("Build success")) {
        injectCSS();
    }
});

tsup.stderr.on("data", (data) => {
    console.error(data);
});

// Watch the output CSS file
chokidar.watch(path.resolve(__dirname, "../dist/styles/output.css")).on("change", () => {
    injectCSS();
});

function injectCSS() {
    exec("node scripts/inject-css-import.js", (error, _stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
    });
}
