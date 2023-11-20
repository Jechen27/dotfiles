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
exports.TerminalVerifier = exports.UnconfigureTerminal = exports.ConfigureTerminal = void 0;
const os_1 = require("../lib/os");
const vscode = require("vscode");
const fs = require("fs");
const state = require("../lib/state");
const log = require("../lib/log");
const common_1 = require("./common");
const project_1 = require("../model/state/project");
class ConfigureTerminal extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Terminal Configuration";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!state.isInstalled()) {
                vscode.window.setStatusBarMessage("Won't configure terminal if State Tool is not installed.", 5000);
                return;
            }
            let statePath = state.executable();
            let platformKey = os_1.osName();
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
                        log.debug(`User chose to use custom version of ${prefNameShell}`);
                        return;
                    }
                }
                else {
                    vscode.window.setStatusBarMessage("Terminal has already been configured, no changes required.", 5000);
                    return; // We're already configured properly
                }
            }
            log.info(`Updating setting ${prefNameShell}.${platformKey} to '${statePath}'`);
            configShell.update(platformKey, statePath);
            log.info(`Updating setting ${prefNameShellArgs}.${platformKey}`);
            configShellArgs.update(platformKey, ["activate", "--confirm-exit-on-error", "--non-interactive", "--output=simple"]);
            vscode.window.showInformationMessage("Your terminal configuration has been updated, affecting only new terminal sessions.", "Ok"); // Ok forces it to wrap text rather than overflow it (hiding part of the message)
        });
    }
}
exports.ConfigureTerminal = ConfigureTerminal;
class UnconfigureTerminal extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Terminal Reset";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            let platformKey = os_1.osName();
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
}
exports.UnconfigureTerminal = UnconfigureTerminal;
class TerminalVerifier extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Terminal Verification";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (state.isInstalled() && (yield project_1.isProject())) {
                return;
            }
            yield new UnconfigureTerminal().run();
            vscode.window.showInformationMessage("Your terminal configuration has been updated, as your project does not contain an activestate.yaml file.  Please retry starting the terminal.", "Ok");
        });
    }
}
exports.TerminalVerifier = TerminalVerifier;
//# sourceMappingURL=terminal.js.map