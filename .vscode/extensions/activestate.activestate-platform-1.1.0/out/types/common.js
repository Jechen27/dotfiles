"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserError = void 0;
class UserError extends Error {
    constructor(m, userError) {
        super(m);
        this.userError = userError;
        Object.setPrototypeOf(this, UserError.prototype);
    }
}
exports.UserError = UserError;
//# sourceMappingURL=common.js.map