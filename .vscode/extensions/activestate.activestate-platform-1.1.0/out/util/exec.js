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
exports.exec = void 0;
const vscode = require("vscode");
const cp = require("child_process");
// parseCmdOutputJsonBlobs parses the JSON strings printed to stdout by the state tool
function parseCmdOutputJsonBlobs(stdout) {
    return stdout.trim().split('\x00').map(blob => {
        try {
            return JSON.parse(blob);
        }
        catch (_a) {
            return blob;
        }
    });
}
function exec(cmdValue, logger, ...sensitive) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d;
            let cwd;
            if (((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
                let workspace = vscode.workspace.workspaceFolders[0];
                cwd = workspace.uri.fsPath;
            }
            let cmdValueCensored = cmdValue;
            for (let s of sensitive) {
                if (s === "") {
                    continue;
                }
                let rx = new RegExp(s, "g");
                cmdValueCensored = cmdValueCensored.replace(rx, "***");
            }
            logger.debug(`Running: ${cmdValueCensored}`);
            let cmd = cp.exec(cmdValue, { cwd: cwd });
            cmd.on("error", (err) => {
                logger.report(`Error while running command: ${cmdValueCensored}, error: ${err.message}`);
                throw err;
            });
            // close stdin, as we need to run non-interactive and don't want the process to be waiting for user input
            (_b = cmd.stdin) === null || _b === void 0 ? void 0 : _b.end();
            let res = { code: 666, stdout: "", stderr: "", messages: [] };
            (_c = cmd.stdout) === null || _c === void 0 ? void 0 : _c.on("data", (d) => {
                res.stdout += d.toString();
            });
            (_d = cmd.stderr) === null || _d === void 0 ? void 0 : _d.on("data", (d) => {
                res.stderr += d.toString();
            });
            cmd.on("close", (code) => {
                // Note: The state tool currently logs error messages to stdout.
                // Here, we are appending stderr in case the state changes this behavior in the future.
                res.messages = parseCmdOutputJsonBlobs(res.stdout + "\x00" + res.stderr);
                if (code !== 0) {
                    logger.error(`Command: '${cmdValueCensored}' exited with ${code}, stdout: ${res.stdout}, stderr: ${res.stderr}.`);
                }
                else {
                    logger.debug(`Command finished`);
                }
                res.code = code;
                resolve(res);
            });
        });
    });
}
exports.exec = exec;
//# sourceMappingURL=exec.js.map