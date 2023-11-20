"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shell = void 0;
const vscode = require("vscode");
const extension_1 = require("./extension");
const path_1 = require("path");
const unixShells = [
    "bash",
    "zsh",
    "tcsh",
    "fish"
];
class Shell {
    name() {
        let shell = vscode.workspace.getConfiguration("terminal.integrated.shell.").get(extension_1.platformKey);
        if (shell !== undefined) {
            return path_1.basename(shell.split(".")[0]);
        }
        return extension_1.platformKey === extension_1.Platform.Windows ? "cmd" : extension_1.platformKey === extension_1.Platform.Linux ? "bash" : "zsh"; // fallback on sensible defaults
    }
    runCommandFlag() {
        if (this.isUnixy()) {
            return "-c";
        }
        return "/c";
    }
    isUnixy() {
        if (extension_1.platformKey !== extension_1.Platform.Windows || unixShells.indexOf(this.name()) !== -1) {
            return true;
        }
        return false;
    }
}
exports.Shell = Shell;
//# sourceMappingURL=shell.js.map