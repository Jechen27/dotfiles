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
exports.ActivateProject = void 0;
const project = require("../model/state/project");
const vscode = require("vscode");
const activateModel = require("../model/state/activate");
const log = require("../lib/log");
const auth_1 = require("../model/state/auth");
const auth_2 = require("./auth");
const terminal_1 = require("./terminal");
const common_1 = require("./common");
class ActivateProject extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Project Activation";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield project.isProject())) {
                log.debug("Cancelling project activation as we're not in a project");
                return;
            }
            let dots;
            let interval = setInterval(() => {
                dots += ".";
                if (dots.length > 3) {
                    dots = ".";
                }
                vscode.window.setStatusBarMessage("Activating Runtime Environment " + dots, 2000);
            }, 1000);
            try {
                yield activateModel.activate();
            }
            catch (e) {
                log.error(`Activate responded with error: ${e.message}`);
                if (yield auth_1.isAuthed()) {
                    throw e; // Handle it up the chain
                }
                let options = ["Yes (recommended)", "No"];
                let selection = yield vscode.window.showInformationMessage(`Could not activate your runtime environment, this could be because you are not authenticated, would you like to authenticate?`, ...options);
                if (selection !== options[0]) {
                    log.debug(`User chose not to authenticate`);
                    return;
                }
                yield new auth_2.Authenticate().run();
                if (!(yield auth_1.isAuthed())) {
                    log.debug("Cancelling because user did not authenticate");
                    return;
                }
                return yield this.run(); // try again now that we're authenticated
            }
            finally {
                vscode.window.setStatusBarMessage("", 0);
                clearInterval(interval);
            }
            let config = vscode.workspace.getConfiguration("activestate");
            if (config.get("autoConfigureTerminal")) {
                new terminal_1.ConfigureTerminal().run();
            }
            vscode.window.setStatusBarMessage("Runtime Environment activated", 5000);
            return;
        });
    }
}
exports.ActivateProject = ActivateProject;
//# sourceMappingURL=activate.js.map