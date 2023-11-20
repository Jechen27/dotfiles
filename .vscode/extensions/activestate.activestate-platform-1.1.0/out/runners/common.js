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
exports.Runner = void 0;
const common_1 = require("../types/common");
const log = require("../lib/log");
const vscode = require("vscode");
class Runner {
    runWithCatcher() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.run();
            }
            catch (e) {
                let msg = `${this.title} threw exception: ${e.message}`;
                if (e instanceof common_1.UserError) {
                    log.debug(msg);
                    let err = e;
                    if (err.userError) {
                        vscode.window.showErrorMessage(err.userError, { modal: true });
                    }
                    else {
                        vscode.window.showErrorMessage(`${this.title} encountered error: ${e.message}`);
                    }
                }
                log.errorAndReport(msg, e);
            }
        });
    }
}
exports.Runner = Runner;
//# sourceMappingURL=common.js.map