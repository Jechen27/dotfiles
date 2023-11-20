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
exports.Python = void 0;
const executable_1 = require("./executable");
const vscode = require("vscode");
const which = require("which");
const extension_1 = require("../extension");
const dependency_1 = require("./dependency");
class Python {
    constructor(logger, state) {
        this.loaded = false;
        this.logger = logger;
        this.state = state;
        this.pythonExecutables = [
            new executable_1.Executable(this.logger, "python2", "python", "pythonPath"),
            new executable_1.Executable(this.logger, "python3", "python", "pythonPath"),
        ];
        this.executables = this.pythonExecutables.concat([
            new executable_1.Executable(this.logger, "autopep8", "python.formatting", "autopep8Path"),
            new executable_1.Executable(this.logger, "black", "python.formatting", "blackPath"),
            new executable_1.Executable(this.logger, "yapf", "python.formatting", "yapfPath"),
            new executable_1.Executable(this.logger, "bandit", "python.linting", "banditPath"),
            new executable_1.Executable(this.logger, "flake8", "python.linting", "flake8Path"),
            new executable_1.Executable(this.logger, "mypy", "python.linting", "mypyPath"),
            new executable_1.Executable(this.logger, "prospector", "python.linting", "prospectorPath"),
            new executable_1.Executable(this.logger, "pycodestyle", "python.linting", "pycodestylePath"),
            new executable_1.Executable(this.logger, "pycodestyle", "python.linting", "pycodestylePath"),
            new executable_1.Executable(this.logger, "pylama", "python.linting", "pylamaPath"),
            new executable_1.Executable(this.logger, "pylint", "python.linting", "pylintPath"),
            new executable_1.Executable(this.logger, "pipenv", "python", "pipenvPath"),
            new executable_1.Executable(this.logger, "poetry", "python", "poetryPath"),
            new executable_1.Executable(this.logger, "nosetests", "python.testing", "nosetestPath"),
            new executable_1.Executable(this.logger, "pytest", "python.testing", "pytestPath"),
            new executable_1.Executable(this.logger, "ctags", "python.workspaceSymbols", "ctagsPath"),
        ]);
        vscode.workspace.onDidOpenTextDocument(this.onOpenTextDocument, this);
    }
    onOpenTextDocument(doc) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded) {
                this.logger.debug("Skipping Python onOpenTextDocument; already loaded.");
                return;
            }
            if (doc.languageId !== "python") {
                this.logger.debug("Skipping Python onOpenTextDocument; Only run on python.");
                return;
            }
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.debug("Skipping Python onOpenTextDocument; No workspace.");
                return;
            }
            this.logger.debug("Checking if we want to prompt for runtime creation");
            let asConfig = vscode.workspace.getConfiguration("activestate", vscode.workspace.workspaceFolders[0]);
            let config = vscode.workspace.getConfiguration("python", vscode.workspace.workspaceFolders[0]);
            if (!asConfig.get("promptRuntimeCreation")) {
                this.logger.debug("Skipping Python onOpenTextDocument; promptRuntimeCreation is false.");
                return;
            }
            let pythonPath = config.inspect("pythonPath");
            if (pythonPath && (pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue)) {
                let [_, notFoundErr] = yield extension_1.withError(this.logger, which(pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue));
                if (notFoundErr !== null) {
                    this.logger.debug("Not prompting cause runtime is already configured");
                    return;
                }
            }
            this.logger.debug("Prompting for runtime creation");
            let options = ["Yes", "No", "Don't ask Again"];
            let selection = yield vscode.window.showInformationMessage(`Would you like to automatically set up a sandboxed Python runtime environment for your current workspace?`, ...options);
            if (selection === options[0]) {
                vscode.commands.executeCommand("activestate.addRuntime");
            }
            else {
                this.logger.debug(`User chose not to set up runtime environment`);
                if (selection === options[2]) {
                    this.logger.debug(`User does not wish to be asked again`);
                    asConfig.update("promptRuntimeCreation", false);
                }
            }
            let deps = [{ id: "ms-python.python", name: "Python (by Microsoft)", packages: [] }];
            dependency_1.setupMissingDeps(this.logger, this.state, deps);
        });
    }
    loadEnvironment(env) {
        return __awaiter(this, void 0, void 0, function* () {
            let found = false;
            for (let exe of this.pythonExecutables) {
                if (exe.getPath(env)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.logger.debug("Project does not have a Python executable");
                return;
            }
            for (let exe of this.executables) {
                exe.update(env);
            }
            this.loaded = true;
        });
    }
}
exports.Python = Python;
//# sourceMappingURL=python.js.map