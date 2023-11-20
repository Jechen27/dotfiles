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
exports.Executable = void 0;
const vscode = require("vscode");
const which = require("which");
const extension_1 = require("../extension");
class Executable {
    constructor(logger, name, prefScope, prefSection) {
        var _a;
        this.logger = logger;
        this.name = name;
        this.prefScope = prefScope;
        this.prefSection = prefSection;
        if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
            return;
        }
        this.workspace = vscode.workspace.workspaceFolders[0];
    }
    getPath(env) {
        return __awaiter(this, void 0, void 0, function* () {
            let [exePath, notFoundErr] = yield extension_1.withError(this.logger, which(this.name, { path: env.PATH }));
            if (notFoundErr !== null) {
                return;
            }
            return exePath;
        });
    }
    update(env) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.workspace === undefined) {
                return;
            }
            let exePath = yield this.getPath(env);
            if (!exePath) {
                return;
            }
            this.logger.debug(`Found exePath for ${this.name}, ${exePath}`);
            let config = vscode.workspace.getConfiguration(this.prefScope, this.workspace);
            let prefName = `${this.prefScope}.${this.prefSection}`;
            let prefInspector = config.inspect(this.prefSection);
            if (prefInspector === null || prefInspector === void 0 ? void 0 : prefInspector.workspaceValue) {
                let value = prefInspector.workspaceValue;
                if (value.indexOf("activestate") === -1) {
                    let options = ["Yes (recommended)", "No"];
                    let selection = yield vscode.window.showInformationMessage(`Would you like to use the ${this.name} executable provided by your project, overriding your current preference for ${prefName}?`, ...options);
                    if (selection !== options[0]) {
                        this.logger.debug(`User chose to use custom version of ${prefName}`);
                        return;
                    }
                }
            }
            this.logger.info(`Updating setting ${prefName}=${exePath}`);
            try {
                config.update(this.prefSection, exePath);
            }
            catch (e) {
                this.logger.errorAndReport(`error while updating config: ${e}`);
            }
        });
    }
}
exports.Executable = Executable;
//# sourceMappingURL=executable.js.map