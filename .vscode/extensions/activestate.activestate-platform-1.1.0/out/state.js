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
exports.State = exports.StateCmdOutputError = exports.StateCmdError = void 0;
const vscode = require("vscode");
const which = require("which");
const extension_1 = require("./extension");
const exec_1 = require("./util/exec");
const shell = require("./util/shell");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http_1 = require("./util/http");
const open = require("open");
const installNonUnix = "https://platform.activestate.com/dl/cli/install.ps1";
const installUnix = "https://platform.activestate.com/dl/cli/install.sh";
// StateCmdError is thrown for errors happening during execution of a state command with execState()
class StateCmdError extends Error {
    constructor(m, logger) {
        super(m);
        logger.error(m);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, StateCmdError.prototype);
    }
}
exports.StateCmdError = StateCmdError;
// StateCmdOutputError is thrown if a state command returns with a non-zero exit code.
// It parses the JSON formatted errors and creates a human read-able message including the exit code and all error messages.
class StateCmdOutputError extends StateCmdError {
    constructor(m, res, logger) {
        let parsedErrors = res.messages.map(b => Object(b)["Error"]).filter(b => b !== undefined);
        logger.debug("res.messages" + JSON.stringify(res.messages));
        let errors = parsedErrors.join("\n");
        super(`${m}:\n${errors}\nProcess returned with exit code ${res.code}.`, logger);
        this.parsedErrors = parsedErrors;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, StateCmdOutputError.prototype);
    }
    getParsedErrors() {
        return this.parsedErrors;
    }
}
exports.StateCmdOutputError = StateCmdOutputError;
class State {
    constructor(logger, shell) {
        this.logger = logger;
        this.shell = shell;
    }
    executable() {
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
    ensureInstalled() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isInstalled()) {
                return true;
            }
            let options = ["Yes, Install it for me", "No"];
            let selection = yield vscode.window.showInformationMessage(`State Tool is required to interface with the ActiveState platform but is currently not installed on your system, would you like to install it?`, ...options);
            if (selection !== options[0]) {
                this.logger.debug(`User chose not to install state tool`);
                return false;
            }
            try {
                yield this.install();
            }
            catch (e) {
                this.logger.errorAndReport(`State tool installation failed: ${e}`);
                let options = ["Manually install State Tool"];
                let selection = yield vscode.window.showErrorMessage(`State Tool could not be installed, check the "ActiveState Platform" Output panel for more information.`, ...options);
                if (selection === options[0]) {
                    open("https://www.activestate.com/products/platform/state-tool/");
                }
                return false;
            }
            return true;
        });
    }
    isInstalled() {
        let configuredExe = this.executable();
        if (configuredExe !== "state") {
            return fs.existsSync(configuredExe);
        }
        let exe = which.sync("state", { nothrow: true });
        if (!exe) {
            return false;
        }
        this.logger.debug("State tool is installed at " + exe);
        return true;
    }
    signup() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let terminalName = "Signup for ActiveState Platform";
                let terminal = vscode.window.createTerminal(terminalName, this.shell.name(), [this.shell.runCommandFlag(), "state auth signup"]);
                terminal.show();
                this.logger.debug(`Started terminal`);
                vscode.window.onDidCloseTerminal((closedTerminal) => {
                    var _a, _b;
                    if (closedTerminal.name === terminalName) {
                        this.logger.debug(`Closed terminal`);
                        if (((_a = closedTerminal.exitStatus) === null || _a === void 0 ? void 0 : _a.code) !== 0) {
                            reject(new Error(`"state auth signup" returned with exit code ${(_b = closedTerminal.exitStatus) === null || _b === void 0 ? void 0 : _b.code}`));
                            return;
                        }
                        resolve();
                    }
                });
            });
        });
    }
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            vscode.window.setStatusBarMessage("Installing State Tool ...", 5000);
            let url = extension_1.platformKey !== extension_1.Platform.Windows ? installUnix : installNonUnix;
            let filePath = path.join(os.tmpdir(), Math.floor(Date.now() / 1000).toString() + url.split("/").pop());
            yield http_1.download(this.logger, url, filePath);
            fs.chmodSync(filePath, "0755");
            let targetPath;
            let cmd = filePath + " -n -f -t ";
            if (extension_1.platformKey === extension_1.Platform.Windows) {
                targetPath = path.join(process.env.APPDATA, "ActiveState", "bin");
                cmd = `${shell.powershellPath} ${shell.powershellFlag} "${cmd} ${targetPath}"`; // always use powershell on windows
            }
            else {
                targetPath = path.join(os.homedir(), ".local", "bin");
                cmd = `${this.shell.name()} ${this.shell.runCommandFlag()} "${cmd} ${targetPath}"`;
            }
            let res = yield exec_1.exec(cmd, this.logger);
            if (res.code !== 0) {
                let msg = "Installation failed with code " + res.code.toString();
                this.logger.error(msg);
                throw new Error(msg);
            }
            let config = vscode.workspace.getConfiguration("activestate");
            config.update("statePath", path.join(targetPath, "state" + (extension_1.platformKey === extension_1.Platform.Windows ? ".exe" : "")), vscode.ConfigurationTarget.Global);
        });
    }
    clearCache() {
        this.env = undefined;
    }
    getEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.env) {
                this.env = (yield this.activate()) || undefined;
            }
            return this.env;
        });
    }
    // execState executes a state tool sub-command `cmd` with `args` and handles occurring errors.
    execState(cmd, args) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                throw new StateCmdError("State Tool cannot operate without an active workspace.", this.logger);
            }
            let res;
            try {
                res = yield exec_1.exec(`${this.executable()} ${cmd} --output editor ${args}`, this.logger);
            }
            catch (e) {
                throw new StateCmdError(`state ${cmd} ran into error ${e}`, this.logger);
            }
            if (!res || res.code !== 0) {
                throw new StateCmdOutputError(`state ${cmd} exited with error`, res, this.logger);
            }
            return res;
        });
    }
    activate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.debug("No workspace");
                return;
            }
            let res;
            try {
                res = yield exec_1.exec(this.executable() + " activate --output editor", this.logger);
            }
            catch (e) {
                this.logger.error(`state activate exec ran into error: ${e}`);
                return;
            }
            let datas = res.stdout.split('\x00');
            for (let d of datas) {
                let err = this.processError(d);
                if (err && err.Error.indexOf("No activestate.yaml file exists") === -1) { // todo: use exit code to convey this instead
                    throw new Error(err.Error);
                }
                let env = this.processEnvironmentData(d);
                if (env) {
                    this.logger.debug("Returning environment after processing");
                    return env;
                }
            }
            this.logger.error(`No environment data was found in stdout:\n${res.stdout}.\nstderr: ${res.stderr}`);
        });
    }
    isAuthed() {
        return __awaiter(this, void 0, void 0, function* () {
            let res;
            try {
                res = yield exec_1.exec(this.executable() + ` export jwt --output editor`, this.logger);
            }
            catch (e) {
                this.logger.error(`state export jwt exec ran into error: ${e}`);
                return false;
            }
            return res.code === 0;
        });
    }
    isProject() {
        return __awaiter(this, void 0, void 0, function* () {
            let res;
            try {
                res = yield this.execState("show", "");
            }
            catch (e) {
                this.logger.error(`state show error: ${e}`);
                return false;
            }
            return res.code === 0;
        });
    }
    getAuthInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.execState("auth", "");
            if (res.messages[0] === undefined) {
                this.logger.errorAndReport(`Could not parse authInfo from state tool response: ${res.stdout}`);
                return null;
            }
            return res.messages[0];
        });
    }
    auth(username, password, totp) {
        return __awaiter(this, void 0, void 0, function* () {
            let res;
            try {
                res = yield exec_1.exec(this.executable() + ` auth --username "${username}" --password "${password}" --totp "${totp}" --output editor`, this.logger, username, password, totp);
            }
            catch (e) {
                this.logger.error(`state auth exec ran into error: ${e}`);
                return null;
            }
            if (res.messages[0] === undefined) {
                this.logger.errorAndReport(`Could not parse authInfo from state tool response: ${res.stdout}`);
                return null;
            }
            return res.messages[0];
        });
    }
    organizations() {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.execState("organizations", "");
            return res.messages[0];
        });
    }
    projectURL() {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.execState("show", "");
            return res.messages[0].ProjectURL;
        });
    }
    packages() {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.execState("packages", "");
            return res.messages[0];
        });
    }
    processError(data) {
        if (!data || data.trim() === "") {
            return;
        }
        let err;
        try {
            this.logger.debug(`Parsing: ${data}`);
            err = JSON.parse(data);
        }
        catch (e) {
            this.logger.errorAndReport(`Could not parse JSON, error: ${e}`);
            return;
        }
        if (err.Error && err.Error !== "") {
            this.logger.debug("Returning error");
            return err;
        }
    }
    processEnvironmentData(data) {
        if (!data || data.trim() === "") {
            return;
        }
        let env;
        try {
            this.logger.debug(`Parsing: ${data}`);
            env = JSON.parse(data);
        }
        catch (e) {
            this.logger.errorAndReport(`Could not parse JSON, error: ${e}`);
            return;
        }
        if (!env.PATH) {
            this.logger.debug(`Not an env object, keys: ${Object.keys(env).join(", ")}`);
            return;
        }
        return env;
    }
}
exports.State = State;
//# sourceMappingURL=state.js.map