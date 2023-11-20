"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shell = exports.powershellFlag = exports.powershellPath = void 0;
const process = require("process");
const vscode = require("vscode");
const extension_1 = require("../extension");
const path_1 = require("path");
const unixShells = [
    "bash",
    "zsh",
    "tcsh",
    "fish"
];
exports.powershellPath = path_1.join((process.env.SystemRoot || ""), "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
exports.powershellFlag = "-ExecutionPolicy Bypass -Command";
class Shell {
    name() {
        let shell = vscode.workspace.getConfiguration("terminal.integrated.shell.").get(extension_1.platformKey);
        if (shell !== undefined && unixShells.indexOf(shell) !== -1) {
            return path_1.basename(shell.split(".")[0]);
        }
        if (extension_1.platformKey === extension_1.Platform.Windows) {
            return exports.powershellPath;
        }
        else {
            return extension_1.platformKey === extension_1.Platform.Linux ? "bash" : "zsh"; // fallback on sensible defaults
        }
    }
    runCommandFlag() {
        if (this.isUnixy()) {
            return "-c";
        }
        return "-Command";
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