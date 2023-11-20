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
exports.ExeConfig = void 0;
const vscode = require("vscode");
const which = require("which");
const log = require("./log");
const vscode_1 = require("./vscode");
class ExeConfig {
    constructor(name, prefScope, prefSection) {
        var _a;
        this.name = name;
        this.prefScope = prefScope;
        this.prefSection = prefSection;
        if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
            return;
        }
    }
    getPath(env) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield which(this.name, { path: env.PATH });
            }
            catch (e) {
                log.debug(`'which' failed with: ${e.message}`);
                return;
            }
        });
    }
    update(env) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vscode_1.workspaceFolder()) {
                return;
            }
            let exePath = yield this.getPath(env);
            if (!exePath) {
                return;
            }
            log.debug(`Found exePath for ${this.name}, ${exePath}`);
            let config = vscode.workspace.getConfiguration(this.prefScope, vscode_1.workspaceFolder());
            let prefName = `${this.prefScope}.${this.prefSection}`;
            let prefInspector = config.inspect(this.prefSection);
            if (prefInspector === null || prefInspector === void 0 ? void 0 : prefInspector.workspaceValue) {
                let value = prefInspector.workspaceValue;
                if (value.indexOf("activestate") === -1) {
                    let options = ["Yes (recommended)", "No"];
                    let selection = yield vscode.window.showInformationMessage(`Would you like to use the ${this.name} executable provided by your project, overriding your current preference for ${prefName}?`, ...options);
                    if (selection !== options[0]) {
                        log.debug(`User chose to use custom version of ${prefName}`);
                        return;
                    }
                }
            }
            log.info(`Updating setting ${prefName}=${exePath}`);
            try {
                config.update(this.prefSection, exePath);
            }
            catch (e) {
                log.errorAndReport(`error while updating config: ${e}`);
            }
        });
    }
}
exports.ExeConfig = ExeConfig;
//# sourceMappingURL=execonfig.js.map