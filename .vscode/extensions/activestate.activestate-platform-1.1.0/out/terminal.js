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
exports.Terminal = void 0;
const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
class Terminal {
    constructor(logger, state) {
        this.logger = logger;
        this.state = state;
    }
    ensureNotInstalled() {
        return __awaiter(this, void 0, void 0, function* () {
            let platformKey = os.platform() === "win32" ? "windows" : (os.platform() === "darwin" ? "osx" : "linux");
            let prefNameShell = 'terminal.integrated.shell';
            let configShell = vscode.workspace.getConfiguration(prefNameShell);
            let prefNameShellArgs = 'terminal.integrated.shellArgs';
            let configShellArgs = vscode.workspace.getConfiguration(prefNameShellArgs);
            let currentValue = configShellArgs.inspect(platformKey);
            if (!(currentValue === null || currentValue === void 0 ? void 0 : currentValue.workspaceValue)) {
                return;
            }
            let value = currentValue.workspaceValue;
            if (value[0] === "activate" && fs.existsSync(value[1])) {
                return;
            }
            // Delete
            configShell.update(platformKey, undefined);
            configShellArgs.update(platformKey, undefined);
        });
    }
    configure(statePath) {
        return __awaiter(this, void 0, void 0, function* () {
            let platformKey = os.platform() === "win32" ? "windows" : (os.platform() === "darwin" ? "osx" : "linux");
            let prefNameShell = 'terminal.integrated.shell';
            let configShell = vscode.workspace.getConfiguration(prefNameShell);
            let prefNameShellArgs = 'terminal.integrated.shellArgs';
            let configShellArgs = vscode.workspace.getConfiguration(prefNameShellArgs);
            let currentValue = configShell.inspect(platformKey);
            if (currentValue === null || currentValue === void 0 ? void 0 : currentValue.workspaceValue) {
                let value = currentValue.workspaceValue;
                if (value !== statePath) {
                    let options = ["Yes", "No"];
                    let selection = yield vscode.window.showInformationMessage(`Would you like your terminal sessions to automatically use 'state activate'? This will override your current preference for ${prefNameShell}.`, ...options);
                    if (selection !== options[0]) {
                        this.logger.debug(`User chose to use custom version of ${prefNameShell}`);
                        return false;
                    }
                }
                else {
                    return; // We're already configured properly
                }
            }
            this.logger.info(`Updating setting ${prefNameShell}.${platformKey} to '${statePath}'`);
            configShell.update(platformKey, statePath);
            this.logger.info(`Updating setting ${prefNameShellArgs}.${platformKey} to 'activate --confirm-exit-on-error'`);
            configShellArgs.update(platformKey, ["activate", "--confirm-exit-on-error"]);
            vscode.window.showInformationMessage("Your terminal configuration has been updated, affecting only new terminal sessions.", "Ok"); // Ok forces it to wrap text rather than overflow it (hiding part of the message)
            return true;
        });
    }
    ensureTerminalCanActivate(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (e.name.indexOf("state") === -1) {
                return;
            }
            let hasAsYaml = yield this.state.isProject();
            if (hasAsYaml) {
                return;
            }
            yield this.ensureNotInstalled();
            vscode.window.showInformationMessage("Your terminal configuration has been updated, as your project does not contain an activestate.yaml file.  Please retry starting the terminal.", "Ok");
        });
    }
}
exports.Terminal = Terminal;
//# sourceMappingURL=terminal.js.map