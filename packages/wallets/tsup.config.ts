import { treeShakableConfig } from "../../tsup.config.base";

export default { ...treeShakableConfig, minify: false }; // Disable minification for less-verbose error logs
