"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.argNotEmptyValidator = exports.workspaceFolder = exports.workspaceDir = void 0;
const vscode = require("vscode");
function workspaceDir() {
    var _a;
    if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
        return;
    }
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
}
exports.workspaceDir = workspaceDir;
function workspaceFolder() {
    var _a;
    if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
        return;
    }
    return vscode.workspace.workspaceFolders[0];
}
exports.workspaceFolder = workspaceFolder;
function argNotEmptyValidator(v) {
    if (v.trim() === "") {
        return "Value is required";
    }
    return null;
}
exports.argNotEmptyValidator = argNotEmptyValidator;
//# sourceMappingURL=vscode.js.map