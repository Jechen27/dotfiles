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
function exec(cmdValue, logger) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var _a, _b, _c;
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                reject();
                return;
            }
            let workspace = vscode.workspace.workspaceFolders[0];
            let cwd = workspace.uri.fsPath;
            let cmd = cp.exec(cmdValue, { cwd: cwd });
            let res = { code: 666, stdout: "", stderr: "" };
            (_b = cmd.stdout) === null || _b === void 0 ? void 0 : _b.on("data", (d) => {
                res.stdout += d.toString();
            });
            (_c = cmd.stderr) === null || _c === void 0 ? void 0 : _c.on("data", (d) => {
                res.stderr += d.toString();
            });
            cmd.on("close", (code) => {
                if (code !== 0) {
                    logger.error(`'${cmdValue}' exited with ${code}, stdout: ${res.stdout}, stderr: ${res.stderr}.`);
                }
                res.code = code;
                resolve(res);
            });
        });
    });
}
exports.exec = exec;
//# sourceMappingURL=exec.js.map