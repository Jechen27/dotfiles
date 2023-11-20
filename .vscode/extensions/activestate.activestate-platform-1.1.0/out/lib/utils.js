"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withError = void 0;
function withError(promise) {
    return promise.then((data) => {
        return [data, null];
    }).catch((err) => [null, err]);
}
exports.withError = withError;
//# sourceMappingURL=utils.js.map