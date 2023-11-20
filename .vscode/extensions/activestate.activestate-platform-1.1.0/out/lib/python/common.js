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
const execonfig_1 = require("../execonfig");
const vscode = require("vscode");
const dependency_1 = require("../dependency");
const log = require("../log");
const runtime_1 = require("../../runners/runtime");
const vscode_1 = require("../vscode");
const project_1 = require("../../model/state/project");
const activateModel = require("../../model/state/activate");
class Python {
    constructor() {
        this.loaded = false;
        this.pythonExecutables = [
            new execonfig_1.ExeConfig("python2", "python", "pythonPath"),
            new execonfig_1.ExeConfig("python3", "python", "pythonPath"),
        ];
        this.executables = this.pythonExecutables.concat([
            new execonfig_1.ExeConfig("autopep8", "python.formatting", "autopep8Path"),
            new execonfig_1.ExeConfig("black", "python.formatting", "blackPath"),
            new execonfig_1.ExeConfig("yapf", "python.formatting", "yapfPath"),
            new execonfig_1.ExeConfig("bandit", "python.linting", "banditPath"),
            new execonfig_1.ExeConfig("flake8", "python.linting", "flake8Path"),
            new execonfig_1.ExeConfig("mypy", "python.linting", "mypyPath"),
            new execonfig_1.ExeConfig("prospector", "python.linting", "prospectorPath"),
            new execonfig_1.ExeConfig("pycodestyle", "python.linting", "pycodestylePath"),
            new execonfig_1.ExeConfig("pycodestyle", "python.linting", "pycodestylePath"),
            new execonfig_1.ExeConfig("pylama", "python.linting", "pylamaPath"),
            new execonfig_1.ExeConfig("pylint", "python.linting", "pylintPath"),
            new execonfig_1.ExeConfig("pipenv", "python", "pipenvPath"),
            new execonfig_1.ExeConfig("poetry", "python", "poetryPath"),
            new execonfig_1.ExeConfig("nosetests", "python.testing", "nosetestPath"),
            new execonfig_1.ExeConfig("pytest", "python.testing", "pytestPath"),
            new execonfig_1.ExeConfig("ctags", "python.workspaceSymbols", "ctagsPath"),
        ]);
        vscode.workspace.onDidOpenTextDocument(this.onOpenTextDocument, this);
    }
    onOpenTextDocument(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded) {
                log.debug("Skipping Python onOpenTextDocument; already loaded.");
                return;
            }
            if (doc.languageId !== "python") {
                log.debug("Skipping Python onOpenTextDocument; Only run on python.");
                return;
            }
            if (!vscode_1.workspaceFolder()) {
                log.debug("Skipping Python onOpenTextDocument; No workspace.");
                return;
            }
            if (!(yield project_1.isProject())) {
                yield new runtime_1.AddRuntime().runWithPrompt("Python");
            }
            if (yield project_1.isProject()) {
                let deps = [{ id: "ms-python.python", name: "Python (by Microsoft)", packages: [] }];
                dependency_1.setupMissingDeps(deps);
                let env = yield activateModel.activate();
                if (env) {
                    this.loadEnvironment(env);
                }
                this.loaded = true;
            }
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
                log.debug("Project does not have a Python executable");
                return;
            }
            for (let exe of this.executables) {
                exe.update(env);
            }
        });
    }
}
exports.Python = Python;
//# sourceMappingURL=common.js.map