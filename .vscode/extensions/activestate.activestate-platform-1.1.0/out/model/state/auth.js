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
exports.info = exports.isAuthed = exports.signup = exports.login = void 0;
const shell = require("../../lib/shell");
const common_1 = require("./common");
const log = require("../../lib/log");
function login(username, password, totp) {
    return __awaiter(this, void 0, void 0, function* () {
        let res;
        res = yield common_1.execState(`auth`, `--username "${username}" --password "${password}" --totp "${totp}" --output editor`, password, totp);
        return res.messages[0];
    });
}
exports.login = login;
function signup() {
    return __awaiter(this, void 0, void 0, function* () {
        return shell.execInTerminal("Signup for ActiveState Platform", "state auth signup");
    });
}
exports.signup = signup;
function isAuthed() {
    return __awaiter(this, void 0, void 0, function* () {
        let res;
        try {
            res = yield common_1.execState(`export`, `jwt --output editor`);
        }
        catch (e) {
            log.error(`state export jwt exec ran into error: ${e}`);
            return false;
        }
        return res.code === 0;
    });
}
exports.isAuthed = isAuthed;
function info() {
    return __awaiter(this, void 0, void 0, function* () {
        let res = yield common_1.execState("auth");
        return res.messages[0];
    });
}
exports.info = info;
//# sourceMappingURL=auth.js.map