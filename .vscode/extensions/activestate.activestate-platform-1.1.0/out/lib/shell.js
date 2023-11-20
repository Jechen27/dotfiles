"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execInTerminal = exports.exec = exports.isUnixy = exports.execFlagsFor = exports.getDefault = exports.getConfigured = void 0;
const os = require("os");
const osutils = require("./os");
const process = require("process");
const vscode = require("vscode");
const log = require("./log");
const path_1 = require("path");
const cp = require("child_process");
const unixShells = [
    "bash",
    "zsh",
    "tcsh",
    "fish"
];
const isWindows = os.platform() === "win32";
class NoMessagesError extends Error {
    constructor(message) {
        super(message);
        this.name = "NoMessagesError";
    }
}
function getConfigured() {
    let shell = vscode.workspace.getConfiguration("terminal.integrated.shell.").get(osutils.osName());
    if (shell !== undefined && unixShells.indexOf(shell) !== -1) {
        let shellName = path_1.basename(shell.split(".")[0]);
        return {
            name: shellName,
            path: shell,
            execFlags: execFlagsFor(shellName),
        };
    }
    return getDefault();
}
exports.getConfigured = getConfigured;
function getDefault() {
    if (isWindows) {
        return {
            name: "powershell",
            path: path_1.join((process.env.SystemRoot || ""), "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
            execFlags: execFlagsFor("powershell"),
        };
    }
    else {
        let name = os.platform() === "linux" ? "bash" : "zsh"; // fallback on sensible defaults
        return {
            name: name,
            path: name,
            execFlags: execFlagsFor(name),
        };
    }
}
exports.getDefault = getDefault;
function execFlagsFor(shellName) {
    if (isUnixy(shellName)) {
        return "-c";
    }
    return "-ExecutionPolicy Bypass -Command";
}
exports.execFlagsFor = execFlagsFor;
function isUnixy(shellName) {
    if (!isWindows || unixShells.indexOf(shellName) !== -1) {
        return true;
    }
    return false;
}
exports.isUnixy = isUnixy;
// parseCmdOut parses the JSON strings printed to stdout by the state tool
function parseCmdOut(stdout) {
    return stdout.trim().split('\x00').map(blob => {
        try {
            return JSON.parse(blob);
        }
        catch (_a) {
            return blob;
        }
    });
}
function exec(cmdValue, ...sensitive) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d;
            let cwd;
            if (((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
                let workspace = vscode.workspace.workspaceFolders[0];
                cwd = workspace.uri.fsPath;
            }
            let shell = getDefault();
            cmdValue = `${shell.path} ${shell.execFlags} "${cmdValue}"`;
            let cmdValueCensored = cmdValue;
            for (let s of sensitive) {
                if (s === "") {
                    continue;
                }
                let rx = new RegExp(s, "g");
                cmdValueCensored = cmdValueCensored.replace(rx, "***");
            }
            log.debug(`Running: ${cmdValueCensored}`);
            let cmd = cp.exec(cmdValue, { cwd: cwd });
            cmd.on("error", (err) => {
                log.report(`Error while running command: ${cmdValueCensored}, error: ${err.message}`);
                throw err;
            });
            // close stdin, as we need to run non-interactive and don't want the process to be waiting for user input
            (_b = cmd.stdin) === null || _b === void 0 ? void 0 : _b.end();
            let res = { code: 666, stdout: "", stderr: "", messages: [], errorMessages: [] };
            (_c = cmd.stdout) === null || _c === void 0 ? void 0 : _c.on("data", (d) => {
                res.stdout += d.toString();
            });
            (_d = cmd.stderr) === null || _d === void 0 ? void 0 : _d.on("data", (d) => {
                res.stderr += d.toString();
            });
            cmd.on("close", (code) => {
                // Note: The state tool currently logs error messages to stdout.
                // Here, we are appending stderr in case the state changes this behavior in the future.
                res.messages = parseCmdOut(res.stdout);
                res.errorMessages = parseCmdOut(res.stderr);
                if (res.messages.length === 0) {
                    throw new NoMessagesError(`Command: '${cmdValueCensored}' did not return any messages, stdout: ${res.stdout}, stderr: ${res.stderr}.`);
                }
                if (code !== 0) {
                    log.error(`Command: '${cmdValueCensored}' exited with ${code}, stdout: ${res.stdout}, stderr: ${res.stderr}.`);
                }
                else {
                    log.debug(`Command finished`);
                }
                res.code = code;
                resolve(res);
            });
        });
    });
}
exports.exec = exec;
function execInTerminal(terminalName, cmdValue) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let configuredShell = getConfigured();
            let terminal = vscode.window.createTerminal(terminalName, configuredShell.path, [configuredShell.execFlags, cmdValue]);
            terminal.show();
            log.debug(`Started terminal`);
            vscode.window.onDidCloseTerminal((closedTerminal) => {
                var _a, _b;
                if (closedTerminal.name === terminalName) {
                    log.debug(`Closed terminal`);
                    if (((_a = closedTerminal.exitStatus) === null || _a === void 0 ? void 0 : _a.code) !== 0) {
                        reject(new Error(`"${cmdValue}" returned with exit code ${(_b = closedTerminal.exitStatus) === null || _b === void 0 ? void 0 : _b.code}`));
                        return;
                    }
                    resolve();
                }
            });
        });
    });
}
exports.execInTerminal = execInTerminal;
//# sourceMappingURL=shell.js.map