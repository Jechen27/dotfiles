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
exports.isInstalled = exports.install = exports.executable = void 0;
const vscode = require("vscode");
const which = require("which");
const fs = require("fs");
const os = require("os");
const log = require("./log");
const shell = require("./shell");
const path = require("path");
const http_1 = require("./http");
const installNonUnix = "https://platform.activestate.com/dl/cli/install.ps1";
const installUnix = "https://platform.activestate.com/dl/cli/install.sh";
const isWindows = os.platform() === "win32";
function executable() {
    let config = vscode.workspace.getConfiguration("activestate");
    let path = config.get("statePath");
    if (path) {
        if (!fs.existsSync(path)) {
            config.update("statePath", undefined); // delete
        }
        else {
            return path;
        }
    }
    return "state";
}
exports.executable = executable;
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        let url = isWindows ? installNonUnix : installUnix;
        let filePath = path.join(os.tmpdir(), Math.floor(Date.now() / 1000).toString() + url.split("/").pop());
        yield http_1.download(url, filePath);
        fs.chmodSync(filePath, "0755");
        let installPath;
        let cmd = filePath + " -n -f -t ";
        if (isWindows) {
            installPath = path.join(process.env.APPDATA, "ActiveState", "bin");
        }
        else {
            installPath = path.join(os.homedir(), ".local", "bin");
        }
        cmd = `"${cmd} ${installPath}"`;
        let res = yield shell.exec(cmd);
        if (res.code !== 0) {
            let msg = "Installation failed with code " + res.code.toString();
            log.error(msg);
            throw new Error(msg);
        }
        let config = vscode.workspace.getConfiguration("activestate");
        config.update("statePath", path.join(installPath, "state" + (isWindows ? ".exe" : "")), vscode.ConfigurationTarget.Global);
    });
}
exports.install = install;
function isInstalled() {
    let configuredExe = executable();
    if (configuredExe !== "state") {
        return fs.existsSync(configuredExe);
    }
    let exe = which.sync("state", { nothrow: true });
    if (!exe) {
        return false;
    }
    log.debug("State tool is installed at " + exe);
    return true;
}
exports.isInstalled = isInstalled;
//# sourceMappingURL=state.js.map