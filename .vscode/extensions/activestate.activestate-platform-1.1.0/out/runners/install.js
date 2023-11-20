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
exports.EnsureStateInstalled = exports.InstallState = void 0;
const vscode = require("vscode");
const stateTool = require("../lib/state");
const log = require("../lib/log");
const open = require("open");
const common_1 = require("../types/common");
const common_2 = require("./common");
class InstallState extends common_2.Runner {
    constructor() {
        super(...arguments);
        this.title = "State Tool Installation";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (stateTool.isInstalled()) {
                log.debug("InstallStateTool: Already installed");
                vscode.window.setStatusBarMessage("State Tool is already installed.", 5000);
                return;
            }
            let options = ["Yes, Install it for me", "No"];
            let selection = yield vscode.window.showInformationMessage(`State Tool is required to interface with the ActiveState platform but is currently not installed on your system, would you like to install it?`, ...options);
            if (selection !== options[0]) {
                throw new common_1.UserError(`User chose not to install state tool`);
            }
            vscode.window.setStatusBarMessage("Installing State Tool ...", 5000);
            try {
                yield stateTool.install();
            }
            catch (e) {
                log.errorAndReport(`State tool installation failed: ${e}`);
                vscode.window.setStatusBarMessage(`Installation failed: ${e}`);
                let options = ["Manually install State Tool"];
                let selection = yield vscode.window.showErrorMessage(`State Tool could not be installed, check the "ActiveState Platform" Output panel for more information.`, ...options);
                if (selection === options[0]) {
                    open("https://www.activestate.com/products/platform/state-tool/");
                }
                return;
            }
            vscode.window.setStatusBarMessage("State Tool has been installed.", 5000);
        });
    }
}
exports.InstallState = InstallState;
class EnsureStateInstalled extends common_2.Runner {
    constructor() {
        super(...arguments);
        this.title = "State Tool Installation Validation";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (stateTool.isInstalled()) {
                return;
            }
            yield new InstallState().run();
        });
    }
}
exports.EnsureStateInstalled = EnsureStateInstalled;
//# sourceMappingURL=install.js.map