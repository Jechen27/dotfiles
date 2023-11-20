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
const executable_1 = require("./executable");
const dependency_1 = require("./dependency");
class Perl {
    constructor(logger, state) {
        this.logger = logger;
        this.state = state;
        // This configures the Perl Language server extension to use the perl command
        this.perlExecutable = [
            new executable_1.Executable(this.logger, "perl", "perl", "perlCmd"),
        ];
        this.executables = [];
        if (vscode.extensions.getExtension('richterger.perl')) {
            this.executables = [...this.perlExecutable];
        }
        vscode.workspace.onDidOpenTextDocument(this.onOpenTextDocument, this);
    }
    onOpenTextDocument(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (doc.languageId !== "perl") {
                this.logger.debug("Skipping Perl onOpenTextDocument; Only run on perl.");
                return;
            }
            let deps = [
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
            dependency_1.setupMissingDeps(this.logger, this.state, deps);
            // If simple-perl extension is installed, configure executables for perlcritic and perltidy
            if (vscode.extensions.getExtension('zhiyuan-lin.simple-perl')) {
                this.executables.push(new executable_1.Executable(this.logger, "perlcritic", "simple-perl", "perlcritic"));
                this.executables.push(new executable_1.Executable(this.logger, "perltidy", "simple-perl", "perltidy"));
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
                this.logger.debug("Project does not have a Perl executable");
                return;
            }
            for (let exe of this.executables) {
                exe.update(env);
            }
        });
    }
}
exports.Perl = Perl;
//# sourceMappingURL=perl.js.map