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
exports.projectURL = exports.isProject = void 0;
const common_1 = require("./common");
const log = require("../../lib/log");
function isProject() {
    return __awaiter(this, void 0, void 0, function* () {
        let res;
        try {
            res = yield common_1.execState("show");
        }
        catch (e) {
            log.debug(`assuming project doesn't exist due to state show error`);
            return false;
        }
        return res.code === 0;
    });
}
exports.isProject = isProject;
function projectURL() {
    return __awaiter(this, void 0, void 0, function* () {
        let res = yield common_1.execState("show");
        return res.messages[0].ProjectURL;
    });
}
exports.projectURL = projectURL;
//# sourceMappingURL=project.js.map