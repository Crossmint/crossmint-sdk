import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const entryFile = path.join(__dirname, "../dist/index.js");
let content = fs.readFileSync(entryFile, "utf8");

// Check if the import statement already exists
const importStatement = `import "./styles/output.css";`;
if (!content.includes(importStatement)) {
    content = `${importStatement}\n${content}`;
    // Add CSS import at the top of the file
    fs.writeFileSync(entryFile, content, "utf8");
    console.log("CSS import injected successfully.");
} else {
    console.log("CSS import already exists. No changes made.");
}
