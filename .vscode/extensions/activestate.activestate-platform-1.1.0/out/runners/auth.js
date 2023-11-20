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
exports.Authenticate = void 0;
const vscode = require("vscode");
const open = require("open");
const auth = require("../model/state/auth");
const log = require("../lib/log");
const common_1 = require("./common");
class Authenticate extends common_1.Runner {
    constructor() {
        super(...arguments);
        this.title = "Authentication";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const opts = [
                "I have an ActiveState Platform account",
                "I don't have an ActiveState Platform account yet"
            ];
            let result = yield vscode.window.showQuickPick(opts);
            let authInfo;
            if (result === opts[0]) {
                let username = yield vscode.window.showInputBox({
                    prompt: "Enter your ActiveState Platform Username",
                    validateInput: argNotEmptyValidator
                });
                let password = yield vscode.window.showInputBox({
                    prompt: "Enter your Password",
                    password: true,
                    validateInput: argNotEmptyValidator
                });
                let totp = yield vscode.window.showInputBox({
                    prompt: "Enter your TOTP token (or leave empty)",
                    password: true
                });
                authInfo = yield auth.login(username, password, totp || "");
            }
            else if (result === opts[1]) {
                const opts2 = [
                    "Register new user via terminal",
                    "Register new user via website"
                ];
                let result = yield vscode.window.showQuickPick(opts2);
                if (result === undefined) {
                    return;
                }
                if (result === opts2[1]) {
                    open("https://platform.activestate.com/create-account");
                    vscode.window.showInformationMessage("Please run this command again once you have registered an ActiveState Platform account in your browser.", { modal: true });
                    return;
                }
                try {
                    log.debug("signing up new user");
                    yield auth.signup();
                    authInfo = yield auth.info();
                }
                catch (e) {
                    log.errorAndReport(`Signing up new user failed: ${e.message}`);
                    vscode.window.showErrorMessage(`Could not sign-up new user due to error: ${e.message}`);
                    return;
                }
            }
            if (!authInfo) {
                vscode.window.setStatusBarMessage("Authentication failed, check 'ActiveState Platform' output channel for more information.", 5000);
                return;
            }
            else if (authInfo.Error && authInfo.Error !== "") {
                vscode.window.setStatusBarMessage("Authentication error: " + authInfo.Error, 5000);
                return;
            }
            else {
                vscode.window.setStatusBarMessage(`You are authenticated as ${authInfo === null || authInfo === void 0 ? void 0 : authInfo.username}`, 5000);
                return;
            }
        });
    }
}
exports.Authenticate = Authenticate;
function argNotEmptyValidator(v) {
    if (v.trim() === "") {
        return "Value is required";
    }
    return null;
}
//# sourceMappingURL=auth.js.map