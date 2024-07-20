import { spawnSync } from "child_process";

export function spawnScript(script: string, ...args: any[]) {
    const { status } = spawnSync(script, { stdio: "inherit", shell: true });
    if (status != null && status !== 0) {
        process.exit(status);
    }
}
