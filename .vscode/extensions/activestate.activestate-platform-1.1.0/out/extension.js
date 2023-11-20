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
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const log = require("./lib/log");
const commands_1 = require("./commands");
const install_1 = require("./runners/install");
const events_1 = require("./events");
const common_1 = require("./lib/perl/common");
const common_2 = require("./lib/python/common");
const project = require("./model/state/project");
const Rollbar = require("rollbar");
const activate_1 = require("./runners/activate");
let extensionLoaded;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    if (extensionLoaded) {
        return;
    }
    extensionLoaded = true;
    console.log("Activating ActiveState-Platform");
    let rollbar = new Rollbar({
        accessToken: 'eb245a4d58d54bfbb9ba5776a96e816d',
    });
    log.setRollbar(rollbar);
    let handler = (reason) => {
        var _a;
        if (reason && reason instanceof Error && ((_a = reason.stack) === null || _a === void 0 ? void 0 : _a.indexOf("activestate-platform")) !== -1) {
            rollbar.error(reason);
        }
    };
    process.on("uncaughtException", handler);
    process.on("unhandledRejection", handler);
    (() => __awaiter(this, void 0, void 0, function* () {
        yield new install_1.EnsureStateInstalled().runWithCatcher();
        commands_1.registerCommands();
        events_1.addEventListeners();
        if (yield project.isProject()) {
            let config = vscode.workspace.getConfiguration("activestate");
            if (config.get("autoActivate")) {
                new activate_1.ActivateProject().runWithCatcher();
            }
        }
    }))();
    new common_1.Perl();
    new common_2.Python();
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map