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
exports.addEventListeners = void 0;
const vscode = require("vscode");
const state = require("./lib/state");
const project = require("./model/state/project");
const activate_1 = require("./runners/activate");
const terminal_1 = require("./runners/terminal");
function addEventListeners() {
    let config = vscode.workspace.getConfiguration("activestate");
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration("activestate")) {
            return;
        }
        if (!state.isInstalled()) {
            return;
        }
        // The next section only runs if state tool is installed
        (() => __awaiter(this, void 0, void 0, function* () {
            if (yield project.isProject()) {
                if (config.get("autoActivate")) {
                    new activate_1.ActivateProject().runWithCatcher();
                }
            }
            else {
                new terminal_1.UnconfigureTerminal().runWithCatcher();
            }
        }))();
    });
    vscode.window.onDidOpenTerminal((e) => {
        if (e.name.indexOf("state") === -1) {
            return;
        }
        new terminal_1.TerminalVerifier().runWithCatcher();
    });
}
exports.addEventListeners = addEventListeners;
//# sourceMappingURL=events.js.map