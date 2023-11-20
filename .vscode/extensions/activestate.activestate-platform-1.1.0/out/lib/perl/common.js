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
exports.Perl = void 0;
const vscode = require("vscode");
const execonfig_1 = require("../execonfig");
const dependency_1 = require("../dependency");
const log = require("../log");
const project_1 = require("../../model/state/project");
const activate_1 = require("../../model/state/activate");
const runtime_1 = require("../../runners/runtime");
const deps = [
    {
        id: "zhiyuan-lin.simple-perl",
        name: "Simple Perl (support for perltidy and perlcritic)",
        packages: [
            {
                package: "Perl-Critic",
                provides: "best-practices linting support",
            },
            {
                package: "Perl-Tidy",
                provides: "auto-formatting",
            },
        ],
    },
    {
        id: "richterger.perl",
        name: "Perl (language server and debugger)",
        packages: [
            {
                package: "Perl-LanguageServer",
                provides: "syntax checking, intellisense and debugger support",
            },
        ],
    },
];
class Perl {
    constructor() {
        this.loaded = false;
        // This configures the Perl Language server extension to use the perl command
        this.perlExecutable = [
            new execonfig_1.ExeConfig("perl", "perl", "perlCmd"),
        ];
        this.executables = [];
        if (vscode.extensions.getExtension('richterger.perl')) {
            this.executables = [...this.perlExecutable];
        }
        vscode.workspace.onDidOpenTextDocument(this.onOpenTextDocument, this);
    }
    onOpenTextDocument(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded) {
                return;
            }
            if (doc.languageId !== "perl") {
                log.debug("Skipping Perl onOpenTextDocument; Only run on perl.");
                return;
            }
            if (!(yield project_1.isProject())) {
                yield new runtime_1.AddRuntime().runWithPrompt("Perl");
            }
            if (yield project_1.isProject()) {
                dependency_1.setupMissingDeps(deps);
                // If simple-perl extension is installed, configure executables for perlcritic and perltidy
                if (vscode.extensions.getExtension('zhiyuan-lin.simple-perl')) {
                    this.executables.push(new execonfig_1.ExeConfig("perlcritic", "simple-perl", "perlcritic"));
                    this.executables.push(new execonfig_1.ExeConfig("perltidy", "simple-perl", "perltidy"));
                }
                let env = yield activate_1.activate();
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
            for (let exe of this.perlExecutable) {
                if (exe.getPath(env)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                log.debug("Project does not have a Perl executable");
                return;
            }
            for (let exe of this.executables) {
                exe.update(env);
            }
        });
    }
}
exports.Perl = Perl;
//# sourceMappingURL=common.js.map