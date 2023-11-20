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
exports.AddRuntime = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const organizations_1 = require("../model/state/organizations");
const vscode_1 = require("../lib/vscode");
const open = require("open");
const init_1 = require("../model/state/init");
const push_1 = require("../model/state/push");
const common_1 = require("./common");
const log = require("../lib/log");
const utils_1 = require("../lib/utils");
const activate_1 = require("./activate");
const which = require("which");
const auth_1 = require("../model/state/auth");
const auth_2 = require("./auth");
class AddRuntime extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Add Runtime";
    }
    run() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield auth_1.isAuthed())) {
                yield new auth_2.Authenticate().run();
                if (!(yield auth_1.isAuthed())) {
                    log.debug("Cancelling add runtime because authentication failed");
                    return;
                }
            }
            if (!vscode.workspace.workspaceFolders) {
                vscode.window.setStatusBarMessage(`You must first open a workspace folder. `, 5000);
                return;
            }
            if (fs.existsSync(path.join((_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath, "activestate.yaml"))) {
                vscode.window.setStatusBarMessage(`Your workspace already has an activestate.yaml. `, 5000);
                return;
            }
            let orgs = yield organizations_1.organizations();
            let orgChoices = orgs.map(o => ({
                label: o.name,
                description: `${o.tier} tier}${(o.privateProjects ? ", supports private projects" : "")}`,
            }));
            let orgName = yield vscode.window.showQuickPick(orgChoices, { placeHolder: "Which organization should the new runtime project be under?" });
            if (!orgName) {
                return;
            }
            let org = orgs.find(o => (orgName === null || orgName === void 0 ? void 0 : orgName.label) === o.name);
            let projectName = yield vscode.window.showInputBox({
                prompt: "Enter name of the runtime project",
                validateInput: vscode_1.argNotEmptyValidator,
            });
            if (!projectName) {
                return;
            }
            if (!org.privateProjects) {
                (() => __awaiter(this, void 0, void 0, function* () {
                    let upgrade = "Upgrade account";
                    let res = yield vscode.window.showInformationMessage(`Project ${org.name}/${projectName} will be created as a public project.  To create private projects, upgrade your account.`, upgrade);
                    if (res === upgrade) {
                        open('https://www.activestate.com/solutions/pricing/');
                        return;
                    }
                }))();
            }
            const langChoices = [
                "perl",
                "python2",
                "python3",
            ];
            let language = yield vscode.window.showQuickPick(langChoices, { placeHolder: "What language do you want to use for your project?" });
            if (!language) {
                return;
            }
            vscode.window.setStatusBarMessage(`Creating runtime project ${orgName.label}/${projectName}...`, 5000);
            yield init_1.init(orgName.label, projectName, language, vscode_1.workspaceDir(), org.privateProjects);
            yield push_1.push();
            (() => __awaiter(this, void 0, void 0, function* () {
                let projScope = org.privateProjects ? 'private' : 'public';
                let suggestion = org.privateProjects ? 'Click on "Project settings" if you want to make it public' : '';
                let actions = ["Manage Project and Dependencies", "Project settings"];
                let result = yield vscode.window.showInformationMessage(`Created ${projScope} runtime project ${orgName.label}/${projectName}. ${suggestion}`, ...actions);
                if (!result) {
                    return;
                }
                if (result === actions[0]) { // Manage project
                    open(`https://platform.activestate.com/${orgName.label}/${projectName}`);
                }
                open(`https://platform.activestate.com/${orgName.label}/${projectName}/settings`);
            }))();
            vscode.window.setStatusBarMessage("Runtime project created.", 5000);
            new activate_1.ActivateProject().run();
        });
    }
    runWithPrompt(language) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug("Checking if we want to prompt for runtime creation");
            let folder = vscode_1.workspaceFolder();
            if (!folder) {
                return;
            }
            let config = vscode.workspace.getConfiguration("python", folder);
            let asConfig = vscode.workspace.getConfiguration("activestate", folder);
            if (!asConfig.get("promptRuntimeCreation")) {
                log.debug("Skipping AddRuntime:runWithPrompt; promptRuntimeCreation is false.");
                return;
            }
            let pythonPath = config.inspect("pythonPath");
            if (pythonPath && (pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue)) {
                let [_, notFoundErr] = yield utils_1.withError(which(pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue));
                if (notFoundErr !== null) {
                    log.debug("Not prompting cause runtime is already configured");
                    return;
                }
            }
            log.debug("Prompting for runtime creation");
            let options = ["Yes", "No", "Don't ask Again"];
            let selection = yield vscode.window.showInformationMessage(`Would you like to automatically set up a sandboxed ${language} runtime environment for your current workspace?`, ...options);
            if (selection === options[0]) {
                this.runWithCatcher();
            }
            else {
                log.debug(`User chose not to set up runtime environment`);
                if (selection === options[2]) {
                    log.debug(`User does not wish to be asked again`);
                    asConfig.update("promptRuntimeCreation", false);
                }
            }
        });
    }
}
exports.AddRuntime = AddRuntime;
//# sourceMappingURL=runtime.js.map