"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = void 0;
const vscode = require("vscode");
const activate_1 = require("./runners/activate");
const auth_1 = require("./runners/auth");
const install_1 = require("./runners/install");
const runtime_1 = require("./runners/runtime");
const terminal_1 = require("./runners/terminal");
const Commands = [
    {
        name: "activestate.activateProject",
        title: "Activate Project",
        runner: new activate_1.ActivateProject(),
    },
    {
        name: "activestate.addRuntime",
        title: "Add Runtime",
        runner: new runtime_1.AddRuntime(),
    },
    {
        name: "activestate.auth",
        title: "Authentication",
        runner: new auth_1.Authenticate(),
    },
    {
        name: "activestate.installStateTool",
        title: "State Tool Installation",
        runner: new install_1.InstallState(),
    },
    {
        name: "activestate.configureTerminal",
        title: "Terminal Configuration",
        runner: new terminal_1.ConfigureTerminal(),
    },
];
function registerCommands() {
    for (let c of Commands) {
        vscode.commands.registerCommand(c.name, c.runner.runWithCatcher.bind(c.runner));
    }
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=commands.js.map