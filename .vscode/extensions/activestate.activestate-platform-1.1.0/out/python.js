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
const vscode = require("vscode");
const which = require("which");
const extension_1 = require("./extension");
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
            let [exePath, notFoundErr] = yield extension_1.withError(which(this.name, { path: env.PATH }));
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
                this.logger.error(`error while updating config: ${e}`);
            }
        });
    }
}
class Python {
    constructor(logger) {
        this.loaded = false;
        this.logger = logger;
        this.pythonExecutables = [
            new Executable(this.logger, "python2", "python", "pythonPath"),
            new Executable(this.logger, "python3", "python", "pythonPath"),
        ];
        this.executables = this.pythonExecutables.concat([
            new Executable(this.logger, "autopep8", "python.formatting", "autopep8Path"),
            new Executable(this.logger, "black", "python.formatting", "blackPath"),
            new Executable(this.logger, "yapf", "python.formatting", "yapfPath"),
            new Executable(this.logger, "bandit", "python.linting", "banditPath"),
            new Executable(this.logger, "flake8", "python.linting", "flake8Path"),
            new Executable(this.logger, "mypy", "python.linting", "mypyPath"),
            new Executable(this.logger, "prospector", "python.linting", "prospectorPath"),
            new Executable(this.logger, "pycodestyle", "python.linting", "pycodestylePath"),
            new Executable(this.logger, "pycodestyle", "python.linting", "pycodestylePath"),
            new Executable(this.logger, "pylama", "python.linting", "pylamaPath"),
            new Executable(this.logger, "pylint", "python.linting", "pylintPath"),
            new Executable(this.logger, "pipenv", "python", "pipenvPath"),
            new Executable(this.logger, "poetry", "python", "poetryPath"),
            new Executable(this.logger, "nosetests", "python.testing", "nosetestPath"),
            new Executable(this.logger, "pytest", "python.testing", "pytestPath"),
            new Executable(this.logger, "ctags", "python.workspaceSymbols", "ctagsPath"),
        ]);
        vscode.workspace.onDidOpenTextDocument(this.onOpenTextDocument, this);
    }
    onOpenTextDocument(doc) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded) {
                this.logger.debug("Skipping onOpenTextDocument; already loaded.");
                return;
            }
            if (this.loaded || doc.languageId !== "python") {
                this.logger.debug("Skipping onOpenTextDocument; Only run on python.");
                return;
            }
            if (!((_a = vscode.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) || vscode.workspace.workspaceFolders.length === 0) {
                this.logger.debug("Skipping onOpenTextDocument; No workspace.");
                return;
            }
            this.logger.debug("Checking if we want to prompt for runtime creation");
            let asConfig = vscode.workspace.getConfiguration("activestate", vscode.workspace.workspaceFolders[0]);
            let config = vscode.workspace.getConfiguration("python", vscode.workspace.workspaceFolders[0]);
            if (!asConfig.get("promptRuntimeCreation")) {
                this.logger.debug("Skipping onOpenTextDocument; promptRuntimeCreation is false.");
                return;
            }
            let pythonPath = config.inspect("pythonPath");
            if (pythonPath && (pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue)) {
                let [_, notFoundErr] = yield extension_1.withError(which(pythonPath === null || pythonPath === void 0 ? void 0 : pythonPath.workspaceValue));
                if (notFoundErr !== null) {
                    this.logger.debug("Not prompting cause runtime is already configured");
                    return;
                }
            }
            this.logger.debug("Prompting for runtime creation");
            let options = ["Yes", "No", "Don't ask Again"];
            let selection = yield vscode.window.showInformationMessage(`Would you like to automatically set up a sandboxed Python runtime environment for your current workspace?`, ...options);
            if (selection !== options[0]) {
                this.logger.debug(`User chose not to set up runtime environment`);
                if (selection === options[2]) {
                    asConfig.update("promptRuntimeCreation", false);
                }
                return;
            }
            vscode.commands.executeCommand("activestate.addRuntime");
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