/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode_1 = __webpack_require__(1);
const vscode_extension_telemetry_wrapper_1 = __webpack_require__(2);
const codeActionProvider_1 = __webpack_require__(45);
const util_1 = __webpack_require__(95);
const lombokChecker_1 = __webpack_require__(97);
const commands_1 = __webpack_require__(46);
let isRegistered = false;
let disposables = [];
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, vscode_extension_telemetry_wrapper_1.initializeFromJsonFile)(context.asAbsolutePath('./package.json'), { firstParty: true });
        yield (0, vscode_extension_telemetry_wrapper_1.instrumentOperation)('activation', doActivate)(context);
    });
}
exports.activate = activate;
function doActivate(_operationId, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const javaLanguageSupport = (0, util_1.getJavaExtension)();
        if (!javaLanguageSupport) {
            return;
        }
        if (!javaLanguageSupport.isActive) {
            yield javaLanguageSupport.activate();
        }
        const extensionApi = javaLanguageSupport.exports;
        if (!extensionApi) {
            return;
        }
        if (extensionApi.serverMode === "LightWeight" /* LanguageServerMode.LightWeight */) {
            if (extensionApi.onDidServerModeChange) {
                const onDidServerModeChange = extensionApi.onDidServerModeChange;
                context.subscriptions.push(onDidServerModeChange((mode) => __awaiter(this, void 0, void 0, function* () {
                    if (mode === "Standard" /* LanguageServerMode.Standard */) {
                        syncComponents();
                    }
                })));
            }
        }
        else {
            yield extensionApi.serverReady();
            syncComponents();
        }
        if (extensionApi.onDidClasspathUpdate) {
            const onDidClasspathUpdate = extensionApi.onDidClasspathUpdate;
            context.subscriptions.push(onDidClasspathUpdate(() => __awaiter(this, void 0, void 0, function* () {
                // workaround: wait more time to make sure Language Server has updated all caches
                setTimeout(() => {
                    syncComponents();
                }, 1000 /*ms*/);
            })));
        }
        if (extensionApi.onDidProjectsImport) {
            const onDidProjectsImport = extensionApi.onDidProjectsImport;
            context.subscriptions.push(onDidProjectsImport(() => {
                syncComponents();
            }));
        }
    });
}
function syncComponents() {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, util_1.isLombokSupportEnabled)() && (yield (0, lombokChecker_1.isLombokExists)())) {
            registerComponents();
        }
        else {
            unRegisterComponents();
        }
    });
}
function registerComponents() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isRegistered) {
            return;
        }
        disposables.push((0, vscode_extension_telemetry_wrapper_1.instrumentOperationAsVsCodeCommand)(commands_1.Commands.CODEACTION_LOMBOK, (params, selectedAnnotations) => __awaiter(this, void 0, void 0, function* () {
            (0, codeActionProvider_1.lombokAction)(params, selectedAnnotations);
        })));
        disposables.push(vscode_1.languages.registerCodeActionsProvider({ scheme: 'file', language: 'java' }, new codeActionProvider_1.LombokCodeActionProvider()));
        isRegistered = true;
    });
}
function unRegisterComponents() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isRegistered) {
            return;
        }
        for (const disposable of disposables) {
            disposable.dispose();
        }
        disposables = [];
        isRegistered = false;
    });
}
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const disposable of disposables) {
            disposable.dispose();
        }
        yield (0, vscode_extension_telemetry_wrapper_1.dispose)();
    });
}
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addReplacementRule = exports.addContextProperty = exports.dispose = exports.createUuid = exports.instrumentOperationStep = exports.sendInfo = exports.sendOperationError = exports.sendError = exports.sendOperationEnd = exports.sendOperationStart = exports.instrumentOperationAsVsCodeCommand = exports.instrumentSimpleOperation = exports.instrumentOperation = exports.setErrorCode = exports.setUserError = exports.initialize = exports.initializeFromJsonFile = void 0;
const fs = __webpack_require__(3);
const uuid = __webpack_require__(4);
const vscode = __webpack_require__(1);
const extension_telemetry_1 = __webpack_require__(20);
const event_1 = __webpack_require__(43);
const output_1 = __webpack_require__(44);
let isDebug = false;
let reporters;
const contextProperties = {};
const replacementRules = [];
const SENSITIVE_EVENTS = [event_1.EventName.ERROR, event_1.EventName.OPERATION_END, event_1.EventName.OPERATION_STEP];
/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 * @param options debug: if set as true, debug information be printed to console.
 */
function initializeFromJsonFile(jsonFilepath, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.promises.access(jsonFilepath);
            const { publisher, name, version, aiKey } = JSON.parse(fs.readFileSync(jsonFilepath, "utf-8"));
            initialize(`${publisher}.${name}`, version, aiKey, options);
        }
        catch (error) {
            throw new Error(`The JSON file '${jsonFilepath}' does not exist.`);
        }
    });
}
exports.initializeFromJsonFile = initializeFromJsonFile;
/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 * @param options debug: if set as true, debug information be printed to console.
 */
function initialize(extensionId, version, aiKey, options) {
    if (reporters) {
        throw new Error("TelemetryReporter already initialized.");
    }
    if (aiKey) {
        const firstParty = options && options.firstParty;
        if (aiKey instanceof Array) {
            reporters = aiKey.map((key) => new extension_telemetry_1.default(extensionId, version, key, firstParty));
        }
        else {
            reporters = [new extension_telemetry_1.default(extensionId, version, aiKey, firstParty)];
        }
    }
    isDebug = !!(options && options.debug) || process.env.DEBUG_TELEMETRY === "true";
}
exports.initialize = initialize;
/**
 * Mark an Error instance as a user error.
 */
function setUserError(err) {
    err.isUserError = true;
}
exports.setUserError = setUserError;
/**
 * Set custom error code or an Error instance.
 * @param errorCode A custom error code.
 */
function setErrorCode(err, errorCode) {
    err.errorCode = errorCode;
}
exports.setErrorCode = setErrorCode;
/**
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * A unique Id is created and accessible in the callback.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function **with a unique Id passed by its 1st parameter**.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
function instrumentOperation(operationName, cb, thisArg) {
    return (...args) => __awaiter(this, void 0, void 0, function* () {
        let error;
        const operationId = createUuid();
        const startAt = Date.now();
        try {
            sendOperationStart(operationId, operationName);
            return yield cb.apply(thisArg, [operationId, ...args]);
        }
        catch (e) {
            error = e;
            sendOperationError(operationId, operationName, error);
        }
        finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    });
}
exports.instrumentOperation = instrumentOperation;
/**
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
function instrumentSimpleOperation(operationName, cb, thisArg) {
    return instrumentOperation(operationName, (operationId, ...args) => __awaiter(this, void 0, void 0, function* () { return yield cb.apply(thisArg, args); }), thisArg /** unnecessary */);
}
exports.instrumentSimpleOperation = instrumentSimpleOperation;
/**
 * A shortcut to instrument and operation and register it as a VSCode command.
 * Note that operation Id will no longer be accessible in this approach.
 * @param command A unique identifier for the command.
 * @param cb A command handler function.
 * @param thisArg The `this` context used when invoking the handler function.
 */
function instrumentOperationAsVsCodeCommand(command, cb, thisArg) {
    return vscode.commands.registerCommand(command, instrumentSimpleOperation(command, cb, thisArg));
}
exports.instrumentOperationAsVsCodeCommand = instrumentOperationAsVsCodeCommand;
/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
function sendOperationStart(operationId, operationName) {
    const event = {
        eventName: event_1.EventName.OPERATION_START,
        operationId,
        operationName,
    };
    sendEvent(event);
}
exports.sendOperationStart = sendOperationStart;
/**
 * Send OPERATION_END event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
function sendOperationEnd(operationId, operationName, duration, err) {
    const event = Object.assign({ eventName: event_1.EventName.OPERATION_END, operationId,
        operationName,
        duration }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendOperationEnd = sendOperationEnd;
/**
 * Send an ERROR event.
 * @param err An Error instance.
 */
function sendError(err) {
    const event = Object.assign({ eventName: event_1.EventName.ERROR }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendError = sendError;
/**
 * Send an ERROR event during an operation, carrying id and name of the operation.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
function sendOperationError(operationId, operationName, err) {
    const event = Object.assign({ eventName: event_1.EventName.ERROR, operationId,
        operationName }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendOperationError = sendOperationError;
/**
 * Implementation of sendInfo.
 */
function sendInfo(operationId, dimensionsOrMeasurements, optionalMeasurements) {
    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }
    let dimensions;
    let measurements;
    if (optionalMeasurements) {
        dimensions = dimensionsOrMeasurements;
        measurements = optionalMeasurements;
    }
    else {
        dimensions = {};
        measurements = {};
        for (const key in dimensionsOrMeasurements) {
            if (typeof dimensionsOrMeasurements[key] === "string") {
                dimensions[key] = dimensionsOrMeasurements[key];
            }
            else if (typeof dimensionsOrMeasurements[key] === "number") {
                measurements[key] = dimensionsOrMeasurements[key];
            }
            else {
                // discard unsupported types.
            }
        }
    }
    sendTelemetryEvent(event_1.EventName.INFO, Object.assign(Object.assign({}, dimensions), { operationId }), measurements);
}
exports.sendInfo = sendInfo;
/**
 * Instrument callback for a procedure (regarded as a step in an operation).
 * @param operationId A unique identifier for the operation to which the step belongs.
 * @param stepName Name of the step.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
function instrumentOperationStep(operationId, stepName, cb) {
    return (...args) => __awaiter(this, void 0, void 0, function* () {
        let error;
        const startAt = Date.now();
        try {
            return yield cb(...args);
        }
        catch (e) {
            error = e;
            throw e;
        }
        finally {
            const event = Object.assign({ eventName: event_1.EventName.OPERATION_STEP, operationId,
                stepName, duration: Date.now() - startAt }, extractErrorInfo(error));
            sendEvent(event);
        }
    });
}
exports.instrumentOperationStep = instrumentOperationStep;
/**
 * Create a UUID string using uuid.v4().
 */
function createUuid() {
    return uuid.v4();
}
exports.createUuid = createUuid;
/**
 * Dispose the reporter.
 */
function dispose() {
    return __awaiter(this, void 0, void 0, function* () {
        if (reporters) {
            return yield Promise.all(reporters.map((reporter) => reporter.dispose()));
        }
    });
}
exports.dispose = dispose;
/**
 * Add a context property that will be set for all "info" events.
 * It will be overwritten by the property with the same name, if it's explicitly set in an event.
 * @param name name of context property
 * @param value value of context property
 */
function addContextProperty(name, value) {
    contextProperties[name] = value;
}
exports.addContextProperty = addContextProperty;
/**
 * Add a replacement rule that will be applied to all properties. Useful when you want to wipe sensitive data.
 *
 * Note: rules will not affect context properties.
 *
 * @param pattern RegExp pattern to search
 * @param replaceString target string to repalce matched parts
 */
function addReplacementRule(pattern, replaceString) {
    replacementRules.push({
        pattern,
        replace: replaceString !== null && replaceString !== void 0 ? replaceString : ""
    });
}
exports.addReplacementRule = addReplacementRule;
function extractErrorInfo(err) {
    if (!err) {
        return {
            errorCode: event_1.ErrorCodes.NO_ERROR,
        };
    }
    const richError = err;
    return {
        errorCode: richError.errorCode || event_1.ErrorCodes.GENERAL_ERROR,
        errorType: richError.isUserError ? event_1.ErrorType.USER_ERROR : event_1.ErrorType.SYSTEM_ERROR,
        message: err.message,
        stack: err.stack,
    };
}
function sendEvent(event) {
    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }
    const dimensions = {};
    for (const key of event_1.DimensionEntries) {
        const value = event[key];
        if (value !== undefined) {
            dimensions[key] = String(value);
        }
    }
    const measurements = {};
    for (const key of event_1.MeasurementEntries) {
        const value = event[key];
        if (value !== undefined) {
            measurements[key] = value;
        }
    }
    sendTelemetryEvent(event.eventName, dimensions, measurements);
}
function sendTelemetryEvent(eventName, dimensions, measurements) {
    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }
    // apply replacement rules
    dimensions = dimensions !== null && dimensions !== void 0 ? dimensions : {};
    for (const k of Object.keys(dimensions)) {
        dimensions[k] = applyRules(replacementRules, dimensions[k]);
    }
    // add context props
    dimensions = Object.assign(Object.assign({}, contextProperties), dimensions);
    if (eventName in SENSITIVE_EVENTS) { // for GDPR
        reporters.forEach((reporter) => {
            reporter.sendTelemetryErrorEvent(eventName, dimensions, measurements);
        });
    }
    else {
        reporters.forEach((reporter) => {
            reporter.sendTelemetryEvent(eventName, dimensions, measurements);
        });
    }
    if (isDebug) {
        output_1.Output.getInstance().appendLine(`>> ${(new Date()).toISOString()}`);
        output_1.Output.getInstance().appendLine(JSON.stringify({ eventName, dimensions, measurements }, null, 2));
    }
}
function applyRules(rules, content) {
    for (const rule of rules) {
        content = content.replace(rule.pattern, rule.replace);
    }
    return content;
}
//# sourceMappingURL=index.js.map

/***/ }),
/* 3 */
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NIL": () => (/* reexport safe */ _nil_js__WEBPACK_IMPORTED_MODULE_4__["default"]),
/* harmony export */   "parse": () => (/* reexport safe */ _parse_js__WEBPACK_IMPORTED_MODULE_8__["default"]),
/* harmony export */   "stringify": () => (/* reexport safe */ _stringify_js__WEBPACK_IMPORTED_MODULE_7__["default"]),
/* harmony export */   "v1": () => (/* reexport safe */ _v1_js__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   "v3": () => (/* reexport safe */ _v3_js__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   "v4": () => (/* reexport safe */ _v4_js__WEBPACK_IMPORTED_MODULE_2__["default"]),
/* harmony export */   "v5": () => (/* reexport safe */ _v5_js__WEBPACK_IMPORTED_MODULE_3__["default"]),
/* harmony export */   "validate": () => (/* reexport safe */ _validate_js__WEBPACK_IMPORTED_MODULE_6__["default"]),
/* harmony export */   "version": () => (/* reexport safe */ _version_js__WEBPACK_IMPORTED_MODULE_5__["default"])
/* harmony export */ });
/* harmony import */ var _v1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _v3_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(11);
/* harmony import */ var _v4_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(15);
/* harmony import */ var _v5_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(16);
/* harmony import */ var _nil_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(18);
/* harmony import */ var _version_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(19);
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(9);
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(8);
/* harmony import */ var _parse_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(13);










/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8);

 // **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

let _nodeId;

let _clockseq; // Previous uuid creation time


let _lastMSecs = 0;
let _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node || _nodeId;
  let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  let msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__["default"])(b);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v1);

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ rng)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);

const rnds8Pool = new Uint8Array(256); // # of random values to pre-allocate

let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto__WEBPACK_IMPORTED_MODULE_0___default().randomFillSync(rnds8Pool);
    poolPtr = 0;
  }

  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

/***/ }),
/* 7 */
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (stringify);

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);


function validate(uuid) {
  return typeof uuid === 'string' && _regex_js__WEBPACK_IMPORTED_MODULE_0__["default"].test(uuid);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validate);

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i);

/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(12);
/* harmony import */ var _md5_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(14);


const v3 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v3', 0x30, _md5_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v3);

/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DNS": () => (/* binding */ DNS),
/* harmony export */   "URL": () => (/* binding */ URL),
/* harmony export */   "default": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8);
/* harmony import */ var _parse_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(13);



function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  const bytes = [];

  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }

  return bytes;
}

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    if (typeof value === 'string') {
      value = stringToBytes(value);
    }

    if (typeof namespace === 'string') {
      namespace = (0,_parse_js__WEBPACK_IMPORTED_MODULE_0__["default"])(namespace);
    }

    if (namespace.length !== 16) {
      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
    } // Compute hash of namespace and value, Per 4.3
    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
    // hashfunc([...namespace, ... value])`


    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;

    if (buf) {
      offset = offset || 0;

      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }

      return buf;
    }

    return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__["default"])(bytes);
  } // Function#name is not settable on some platforms (#270)


  try {
    generateUUID.name = name; // eslint-disable-next-line no-empty
  } catch (err) {} // For CommonJS default export support


  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}

/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);


function parse(uuid) {
  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Invalid UUID');
  }

  let v;
  const arr = new Uint8Array(16); // Parse ########-....-....-....-............

  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 0xff;
  arr[2] = v >>> 8 & 0xff;
  arr[3] = v & 0xff; // Parse ........-####-....-....-............

  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff; // Parse ........-....-####-....-............

  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff; // Parse ........-....-....-####-............

  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff; // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
  arr[11] = v / 0x100000000 & 0xff;
  arr[12] = v >>> 24 & 0xff;
  arr[13] = v >>> 16 & 0xff;
  arr[14] = v >>> 8 & 0xff;
  arr[15] = v & 0xff;
  return arr;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (parse);

/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);


function md5(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }

  return crypto__WEBPACK_IMPORTED_MODULE_0___default().createHash('md5').update(bytes).digest();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (md5);

/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8);



function v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__["default"])(rnds);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v4);

/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(12);
/* harmony import */ var _sha1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(17);


const v5 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v5', 0x50, _sha1_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v5);

/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);


function sha1(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }

  return crypto__WEBPACK_IMPORTED_MODULE_0___default().createHash('sha1').update(bytes).digest();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (sha1);

/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ('00000000-0000-0000-0000-000000000000');

/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);


function version(uuid) {
  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Invalid UUID');
  }

  return parseInt(uuid.substr(14, 1), 16);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (version);

/***/ }),
/* 20 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var oA=Object.create;var Ti=Object.defineProperty,uA=Object.defineProperties,cA=Object.getOwnPropertyDescriptor,lA=Object.getOwnPropertyDescriptors,fA=Object.getOwnPropertyNames,Op=Object.getOwnPropertySymbols,pA=Object.getPrototypeOf,Rp=Object.prototype.hasOwnProperty,dA=Object.prototype.propertyIsEnumerable;var Pp=(e,t,r)=>t in e?Ti(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,St=(e,t)=>{for(var r in t||(t={}))Rp.call(t,r)&&Pp(e,r,t[r]);if(Op)for(var r of Op(t))dA.call(t,r)&&Pp(e,r,t[r]);return e},Np=(e,t)=>uA(e,lA(t));var l=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports),hA=(e,t)=>{for(var r in t)Ti(e,r,{get:t[r],enumerable:!0})},Dp=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of fA(t))!Rp.call(e,i)&&i!==r&&Ti(e,i,{get:()=>t[i],enumerable:!(n=cA(t,i))||n.enumerable});return e};var nn=(e,t,r)=>(r=e!=null?oA(pA(e)):{},Dp(t||!e||!e.__esModule?Ti(r,"default",{value:e,enumerable:!0}):r,e)),_A=e=>Dp(Ti({},"__esModule",{value:!0}),e);var _e=l((eM,xp)=>{"use strict";var gA=function(){function e(){}return e.info=function(t){for(var r=[],n=1;n<arguments.length;n++)r[n-1]=arguments[n];e.enableDebug&&console.info(e.TAG+t,r)},e.warn=function(t){for(var r=[],n=1;n<arguments.length;n++)r[n-1]=arguments[n];e.disableWarnings||console.warn(e.TAG+t,r)},e.enableDebug=!1,e.disableWarnings=!1,e.disableErrors=!1,e.TAG="ApplicationInsights:",e}();xp.exports=gA});var vu=l(Vt=>{"use strict";var an=Vt&&Vt.__assign||function(){return an=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},an.apply(this,arguments)};Object.defineProperty(Vt,"__esModule",{value:!0});Vt.AsyncScopeManager=Vt.OpenTelemetryScopeManagerWrapper=void 0;var gr=Er(),EA=__webpack_require__(21),Mp=function(){function e(){}return e.prototype.active=function(){var t=this,r=gr.CorrelationContextManager.getCurrentContext();return an(an({},r),{getValue:function(n){return t._activeSymbol?n===t._activeSymbol?r:!1:(t._activeSymbol=n,r)},setValue:function(){}})},e.prototype.with=function(t,r){var n=t.parentSpanId,i=t.name,a=e._spanToContext(t,n,i);return gr.CorrelationContextManager.runWithContext(a,r)()},e.prototype.bind=function(t){return typeof t=="function"?gr.CorrelationContextManager.wrapCallback(t):(t instanceof EA.EventEmitter&&gr.CorrelationContextManager.wrapEmitter(t),t)},e.prototype.enable=function(){return gr.CorrelationContextManager.enable(),this},e.prototype.disable=function(){return gr.CorrelationContextManager.disable(),this},e._spanToContext=function(t,r,n){var i=r?"|"+t.spanContext().traceId+"."+r+".":t.spanContext().traceId,a=an(an({},t.spanContext()),{traceFlags:t.spanContext().traceFlags}),s=gr.CorrelationContextManager.spanToContextObject(a,i,n);return s},e}();Vt.OpenTelemetryScopeManagerWrapper=Mp;Vt.AsyncScopeManager=new Mp});var Wp=l((I,Qp)=>{I=Qp.exports=N;var k;typeof process=="object"&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG)?k=function(){var e=Array.prototype.slice.call(arguments,0);e.unshift("SEMVER"),console.log.apply(console,e)}:k=function(){};I.SEMVER_SPEC_VERSION="2.0.0";var Eu=256,Ma=Number.MAX_SAFE_INTEGER||9007199254740991,gu=16,B=I.re=[],_=I.src=[],O=0,sn=O++;_[sn]="0|[1-9]\\d*";var on=O++;_[on]="[0-9]+";var Au=O++;_[Au]="\\d*[a-zA-Z-][a-zA-Z0-9-]*";var qp=O++;_[qp]="("+_[sn]+")\\.("+_[sn]+")\\.("+_[sn]+")";var jp=O++;_[jp]="("+_[on]+")\\.("+_[on]+")\\.("+_[on]+")";var mu=O++;_[mu]="(?:"+_[sn]+"|"+_[Au]+")";var yu=O++;_[yu]="(?:"+_[on]+"|"+_[Au]+")";var Su=O++;_[Su]="(?:-("+_[mu]+"(?:\\."+_[mu]+")*))";var Iu=O++;_[Iu]="(?:-?("+_[yu]+"(?:\\."+_[yu]+")*))";var Tu=O++;_[Tu]="[0-9A-Za-z-]+";var Ii=O++;_[Ii]="(?:\\+("+_[Tu]+"(?:\\."+_[Tu]+")*))";var Cu=O++,kp="v?"+_[qp]+_[Su]+"?"+_[Ii]+"?";_[Cu]="^"+kp+"$";var bu="[v=\\s]*"+_[jp]+_[Iu]+"?"+_[Ii]+"?",Ou=O++;_[Ou]="^"+bu+"$";var ln=O++;_[ln]="((?:<|>)?=?)";var La=O++;_[La]=_[on]+"|x|X|\\*";var qa=O++;_[qa]=_[sn]+"|x|X|\\*";var mr=O++;_[mr]="[v=\\s]*("+_[qa]+")(?:\\.("+_[qa]+")(?:\\.("+_[qa]+")(?:"+_[Su]+")?"+_[Ii]+"?)?)?";var cn=O++;_[cn]="[v=\\s]*("+_[La]+")(?:\\.("+_[La]+")(?:\\.("+_[La]+")(?:"+_[Iu]+")?"+_[Ii]+"?)?)?";var Hp=O++;_[Hp]="^"+_[ln]+"\\s*"+_[mr]+"$";var Up=O++;_[Up]="^"+_[ln]+"\\s*"+_[cn]+"$";var Bp=O++;_[Bp]="(?:^|[^\\d])(\\d{1,"+gu+"})(?:\\.(\\d{1,"+gu+"}))?(?:\\.(\\d{1,"+gu+"}))?(?:$|[^\\d])";var Fa=O++;_[Fa]="(?:~>?)";var ja=O++;_[ja]="(\\s*)"+_[Fa]+"\\s+";B[ja]=new RegExp(_[ja],"g");var mA="$1~",Fp=O++;_[Fp]="^"+_[Fa]+_[mr]+"$";var Gp=O++;_[Gp]="^"+_[Fa]+_[cn]+"$";var Ga=O++;_[Ga]="(?:\\^)";var ka=O++;_[ka]="(\\s*)"+_[Ga]+"\\s+";B[ka]=new RegExp(_[ka],"g");var yA="$1^",Vp=O++;_[Vp]="^"+_[Ga]+_[mr]+"$";var $p=O++;_[$p]="^"+_[Ga]+_[cn]+"$";var Pu=O++;_[Pu]="^"+_[ln]+"\\s*("+bu+")$|^$";var Ru=O++;_[Ru]="^"+_[ln]+"\\s*("+kp+")$|^$";var Ai=O++;_[Ai]="(\\s*)"+_[ln]+"\\s*("+bu+"|"+_[mr]+")";B[Ai]=new RegExp(_[Ai],"g");var TA="$1$2$3",zp=O++;_[zp]="^\\s*("+_[mr]+")\\s+-\\s+("+_[mr]+")\\s*$";var Xp=O++;_[Xp]="^\\s*("+_[cn]+")\\s+-\\s+("+_[cn]+")\\s*$";var Kp=O++;_[Kp]="(<|>)?=?\\s*\\*";for($t=0;$t<O;$t++)k($t,_[$t]),B[$t]||(B[$t]=new RegExp(_[$t]));var $t;I.parse=yr;function yr(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof N)return e;if(typeof e!="string"||e.length>Eu)return null;var r=t.loose?B[Ou]:B[Cu];if(!r.test(e))return null;try{return new N(e,t)}catch{return null}}I.valid=AA;function AA(e,t){var r=yr(e,t);return r?r.version:null}I.clean=SA;function SA(e,t){var r=yr(e.trim().replace(/^[=v]+/,""),t);return r?r.version:null}I.SemVer=N;function N(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof N){if(e.loose===t.loose)return e;e=e.version}else if(typeof e!="string")throw new TypeError("Invalid Version: "+e);if(e.length>Eu)throw new TypeError("version is longer than "+Eu+" characters");if(!(this instanceof N))return new N(e,t);k("SemVer",e,t),this.options=t,this.loose=!!t.loose;var r=e.trim().match(t.loose?B[Ou]:B[Cu]);if(!r)throw new TypeError("Invalid Version: "+e);if(this.raw=e,this.major=+r[1],this.minor=+r[2],this.patch=+r[3],this.major>Ma||this.major<0)throw new TypeError("Invalid major version");if(this.minor>Ma||this.minor<0)throw new TypeError("Invalid minor version");if(this.patch>Ma||this.patch<0)throw new TypeError("Invalid patch version");r[4]?this.prerelease=r[4].split(".").map(function(n){if(/^[0-9]+$/.test(n)){var i=+n;if(i>=0&&i<Ma)return i}return n}):this.prerelease=[],this.build=r[5]?r[5].split("."):[],this.format()}N.prototype.format=function(){return this.version=this.major+"."+this.minor+"."+this.patch,this.prerelease.length&&(this.version+="-"+this.prerelease.join(".")),this.version};N.prototype.toString=function(){return this.version};N.prototype.compare=function(e){return k("SemVer.compare",this.version,this.options,e),e instanceof N||(e=new N(e,this.options)),this.compareMain(e)||this.comparePre(e)};N.prototype.compareMain=function(e){return e instanceof N||(e=new N(e,this.options)),un(this.major,e.major)||un(this.minor,e.minor)||un(this.patch,e.patch)};N.prototype.comparePre=function(e){if(e instanceof N||(e=new N(e,this.options)),this.prerelease.length&&!e.prerelease.length)return-1;if(!this.prerelease.length&&e.prerelease.length)return 1;if(!this.prerelease.length&&!e.prerelease.length)return 0;var t=0;do{var r=this.prerelease[t],n=e.prerelease[t];if(k("prerelease compare",t,r,n),r===void 0&&n===void 0)return 0;if(n===void 0)return 1;if(r===void 0)return-1;if(r===n)continue;return un(r,n)}while(++t)};N.prototype.inc=function(e,t){switch(e){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",t);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",t);break;case"prepatch":this.prerelease.length=0,this.inc("patch",t),this.inc("pre",t);break;case"prerelease":this.prerelease.length===0&&this.inc("patch",t),this.inc("pre",t);break;case"major":(this.minor!==0||this.patch!==0||this.prerelease.length===0)&&this.major++,this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":(this.patch!==0||this.prerelease.length===0)&&this.minor++,this.patch=0,this.prerelease=[];break;case"patch":this.prerelease.length===0&&this.patch++,this.prerelease=[];break;case"pre":if(this.prerelease.length===0)this.prerelease=[0];else{for(var r=this.prerelease.length;--r>=0;)typeof this.prerelease[r]=="number"&&(this.prerelease[r]++,r=-2);r===-1&&this.prerelease.push(0)}t&&(this.prerelease[0]===t?isNaN(this.prerelease[1])&&(this.prerelease=[t,0]):this.prerelease=[t,0]);break;default:throw new Error("invalid increment argument: "+e)}return this.format(),this.raw=this.version,this};I.inc=IA;function IA(e,t,r,n){typeof r=="string"&&(n=r,r=void 0);try{return new N(e,r).inc(t,n).version}catch{return null}}I.diff=CA;function CA(e,t){if(Nu(e,t))return null;var r=yr(e),n=yr(t),i="";if(r.prerelease.length||n.prerelease.length){i="pre";var a="prerelease"}for(var s in r)if((s==="major"||s==="minor"||s==="patch")&&r[s]!==n[s])return i+s;return a}I.compareIdentifiers=un;var Lp=/^[0-9]+$/;function un(e,t){var r=Lp.test(e),n=Lp.test(t);return r&&n&&(e=+e,t=+t),e===t?0:r&&!n?-1:n&&!r?1:e<t?-1:1}I.rcompareIdentifiers=bA;function bA(e,t){return un(t,e)}I.major=OA;function OA(e,t){return new N(e,t).major}I.minor=PA;function PA(e,t){return new N(e,t).minor}I.patch=RA;function RA(e,t){return new N(e,t).patch}I.compare=It;function It(e,t,r){return new N(e,r).compare(new N(t,r))}I.compareLoose=NA;function NA(e,t){return It(e,t,!0)}I.rcompare=DA;function DA(e,t,r){return It(t,e,r)}I.sort=wA;function wA(e,t){return e.sort(function(r,n){return I.compare(r,n,t)})}I.rsort=xA;function xA(e,t){return e.sort(function(r,n){return I.rcompare(r,n,t)})}I.gt=Si;function Si(e,t,r){return It(e,t,r)>0}I.lt=Ha;function Ha(e,t,r){return It(e,t,r)<0}I.eq=Nu;function Nu(e,t,r){return It(e,t,r)===0}I.neq=Yp;function Yp(e,t,r){return It(e,t,r)!==0}I.gte=Du;function Du(e,t,r){return It(e,t,r)>=0}I.lte=wu;function wu(e,t,r){return It(e,t,r)<=0}I.cmp=Ua;function Ua(e,t,r,n){switch(t){case"===":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e===r;case"!==":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e!==r;case"":case"=":case"==":return Nu(e,r,n);case"!=":return Yp(e,r,n);case">":return Si(e,r,n);case">=":return Du(e,r,n);case"<":return Ha(e,r,n);case"<=":return wu(e,r,n);default:throw new TypeError("Invalid operator: "+t)}}I.Comparator=Ve;function Ve(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof Ve){if(e.loose===!!t.loose)return e;e=e.value}if(!(this instanceof Ve))return new Ve(e,t);k("comparator",e,t),this.options=t,this.loose=!!t.loose,this.parse(e),this.semver===Ci?this.value="":this.value=this.operator+this.semver.version,k("comp",this)}var Ci={};Ve.prototype.parse=function(e){var t=this.options.loose?B[Pu]:B[Ru],r=e.match(t);if(!r)throw new TypeError("Invalid comparator: "+e);this.operator=r[1],this.operator==="="&&(this.operator=""),r[2]?this.semver=new N(r[2],this.options.loose):this.semver=Ci};Ve.prototype.toString=function(){return this.value};Ve.prototype.test=function(e){return k("Comparator.test",e,this.options.loose),this.semver===Ci?!0:(typeof e=="string"&&(e=new N(e,this.options)),Ua(e,this.operator,this.semver,this.options))};Ve.prototype.intersects=function(e,t){if(!(e instanceof Ve))throw new TypeError("a Comparator is required");(!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1});var r;if(this.operator==="")return r=new W(e.value,t),Ba(this.value,r,t);if(e.operator==="")return r=new W(this.value,t),Ba(e.semver,r,t);var n=(this.operator===">="||this.operator===">")&&(e.operator===">="||e.operator===">"),i=(this.operator==="<="||this.operator==="<")&&(e.operator==="<="||e.operator==="<"),a=this.semver.version===e.semver.version,s=(this.operator===">="||this.operator==="<=")&&(e.operator===">="||e.operator==="<="),o=Ua(this.semver,"<",e.semver,t)&&(this.operator===">="||this.operator===">")&&(e.operator==="<="||e.operator==="<"),u=Ua(this.semver,">",e.semver,t)&&(this.operator==="<="||this.operator==="<")&&(e.operator===">="||e.operator===">");return n||i||a&&s||o||u};I.Range=W;function W(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof W)return e.loose===!!t.loose&&e.includePrerelease===!!t.includePrerelease?e:new W(e.raw,t);if(e instanceof Ve)return new W(e.value,t);if(!(this instanceof W))return new W(e,t);if(this.options=t,this.loose=!!t.loose,this.includePrerelease=!!t.includePrerelease,this.raw=e,this.set=e.split(/\s*\|\|\s*/).map(function(r){return this.parseRange(r.trim())},this).filter(function(r){return r.length}),!this.set.length)throw new TypeError("Invalid SemVer Range: "+e);this.format()}W.prototype.format=function(){return this.range=this.set.map(function(e){return e.join(" ").trim()}).join("||").trim(),this.range};W.prototype.toString=function(){return this.range};W.prototype.parseRange=function(e){var t=this.options.loose;e=e.trim();var r=t?B[Xp]:B[zp];e=e.replace(r,GA),k("hyphen replace",e),e=e.replace(B[Ai],TA),k("comparator trim",e,B[Ai]),e=e.replace(B[ja],mA),e=e.replace(B[ka],yA),e=e.split(/\s+/).join(" ");var n=t?B[Pu]:B[Ru],i=e.split(" ").map(function(a){return LA(a,this.options)},this).join(" ").split(/\s+/);return this.options.loose&&(i=i.filter(function(a){return!!a.match(n)})),i=i.map(function(a){return new Ve(a,this.options)},this),i};W.prototype.intersects=function(e,t){if(!(e instanceof W))throw new TypeError("a Range is required");return this.set.some(function(r){return r.every(function(n){return e.set.some(function(i){return i.every(function(a){return n.intersects(a,t)})})})})};I.toComparators=MA;function MA(e,t){return new W(e,t).set.map(function(r){return r.map(function(n){return n.value}).join(" ").trim().split(" ")})}function LA(e,t){return k("comp",e,t),e=kA(e,t),k("caret",e),e=qA(e,t),k("tildes",e),e=UA(e,t),k("xrange",e),e=FA(e,t),k("stars",e),e}function Re(e){return!e||e.toLowerCase()==="x"||e==="*"}function qA(e,t){return e.trim().split(/\s+/).map(function(r){return jA(r,t)}).join(" ")}function jA(e,t){var r=t.loose?B[Gp]:B[Fp];return e.replace(r,function(n,i,a,s,o){k("tilde",e,n,i,a,s,o);var u;return Re(i)?u="":Re(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":Re(s)?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":o?(k("replaceTilde pr",o),u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0"):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0",k("tilde return",u),u})}function kA(e,t){return e.trim().split(/\s+/).map(function(r){return HA(r,t)}).join(" ")}function HA(e,t){k("caret",e,t);var r=t.loose?B[$p]:B[Vp];return e.replace(r,function(n,i,a,s,o){k("caret",e,n,i,a,s,o);var u;return Re(i)?u="":Re(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":Re(s)?i==="0"?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+".0 <"+(+i+1)+".0.0":o?(k("replaceCaret pr",o),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+"-"+o+" <"+(+i+1)+".0.0"):(k("no pr"),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+" <"+(+i+1)+".0.0"),k("caret return",u),u})}function UA(e,t){return k("replaceXRanges",e,t),e.split(/\s+/).map(function(r){return BA(r,t)}).join(" ")}function BA(e,t){e=e.trim();var r=t.loose?B[Up]:B[Hp];return e.replace(r,function(n,i,a,s,o,u){k("xRange",e,n,i,a,s,o,u);var c=Re(a),f=c||Re(s),p=f||Re(o),d=p;return i==="="&&d&&(i=""),c?i===">"||i==="<"?n="<0.0.0":n="*":i&&d?(f&&(s=0),o=0,i===">"?(i=">=",f?(a=+a+1,s=0,o=0):(s=+s+1,o=0)):i==="<="&&(i="<",f?a=+a+1:s=+s+1),n=i+a+"."+s+"."+o):f?n=">="+a+".0.0 <"+(+a+1)+".0.0":p&&(n=">="+a+"."+s+".0 <"+a+"."+(+s+1)+".0"),k("xRange return",n),n})}function FA(e,t){return k("replaceStars",e,t),e.trim().replace(B[Kp],"")}function GA(e,t,r,n,i,a,s,o,u,c,f,p,d){return Re(r)?t="":Re(n)?t=">="+r+".0.0":Re(i)?t=">="+r+"."+n+".0":t=">="+t,Re(u)?o="":Re(c)?o="<"+(+u+1)+".0.0":Re(f)?o="<"+u+"."+(+c+1)+".0":p?o="<="+u+"."+c+"."+f+"-"+p:o="<="+o,(t+" "+o).trim()}W.prototype.test=function(e){if(!e)return!1;typeof e=="string"&&(e=new N(e,this.options));for(var t=0;t<this.set.length;t++)if(VA(this.set[t],e,this.options))return!0;return!1};function VA(e,t,r){for(var n=0;n<e.length;n++)if(!e[n].test(t))return!1;if(t.prerelease.length&&!r.includePrerelease){for(n=0;n<e.length;n++)if(k(e[n].semver),e[n].semver!==Ci&&e[n].semver.prerelease.length>0){var i=e[n].semver;if(i.major===t.major&&i.minor===t.minor&&i.patch===t.patch)return!0}return!1}return!0}I.satisfies=Ba;function Ba(e,t,r){try{t=new W(t,r)}catch{return!1}return t.test(e)}I.maxSatisfying=$A;function $A(e,t,r){var n=null,i=null;try{var a=new W(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===-1)&&(n=s,i=new N(n,r))}),n}I.minSatisfying=zA;function zA(e,t,r){var n=null,i=null;try{var a=new W(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===1)&&(n=s,i=new N(n,r))}),n}I.minVersion=XA;function XA(e,t){e=new W(e,t);var r=new N("0.0.0");if(e.test(r)||(r=new N("0.0.0-0"),e.test(r)))return r;r=null;for(var n=0;n<e.set.length;++n){var i=e.set[n];i.forEach(function(a){var s=new N(a.semver.version);switch(a.operator){case">":s.prerelease.length===0?s.patch++:s.prerelease.push(0),s.raw=s.format();case"":case">=":(!r||Si(r,s))&&(r=s);break;case"<":case"<=":break;default:throw new Error("Unexpected operation: "+a.operator)}})}return r&&e.test(r)?r:null}I.validRange=KA;function KA(e,t){try{return new W(e,t).range||"*"}catch{return null}}I.ltr=YA;function YA(e,t,r){return xu(e,t,"<",r)}I.gtr=QA;function QA(e,t,r){return xu(e,t,">",r)}I.outside=xu;function xu(e,t,r,n){e=new N(e,n),t=new W(t,n);var i,a,s,o,u;switch(r){case">":i=Si,a=wu,s=Ha,o=">",u=">=";break;case"<":i=Ha,a=Du,s=Si,o="<",u="<=";break;default:throw new TypeError('Must provide a hilo val of "<" or ">"')}if(Ba(e,t,n))return!1;for(var c=0;c<t.set.length;++c){var f=t.set[c],p=null,d=null;if(f.forEach(function(h){h.semver===Ci&&(h=new Ve(">=0.0.0")),p=p||h,d=d||h,i(h.semver,p.semver,n)?p=h:s(h.semver,d.semver,n)&&(d=h)}),p.operator===o||p.operator===u||(!d.operator||d.operator===o)&&a(e,d.semver))return!1;if(d.operator===u&&s(e,d.semver))return!1}return!0}I.prerelease=WA;function WA(e,t){var r=yr(e,t);return r&&r.prerelease.length?r.prerelease:null}I.intersects=ZA;function ZA(e,t,r){return e=new W(e,r),t=new W(t,r),e.intersects(t)}I.coerce=JA;function JA(e){if(e instanceof N)return e;if(typeof e!="string")return null;var t=e.match(B[Bp]);return t==null?null:yr(t[1]+"."+(t[2]||"0")+"."+(t[3]||"0"))}});var Mu=l(Va=>{"use strict";Object.defineProperty(Va,"__esModule",{value:!0});Va.makePatchingRequire=void 0;var eS=__webpack_require__(22),tS=Wp(),Jp=__webpack_require__(23),rS=Object.keys(process.binding("natives")),Zp=Jp.prototype.require;function nS(e){var t={};return function(n){var i=Zp.apply(this,arguments);if(e[n]){var a=Jp._resolveFilename(n,this);if(t.hasOwnProperty(a))return t[a];var s=void 0;if(rS.indexOf(n)<0)try{s=Zp.call(this,eS.join(n,"package.json")).version}catch{return i}else s=process.version.substring(1);var o=s.indexOf("-");o>=0&&(s=s.substring(0,o));for(var u=i,c=0,f=e[n];c<f.length;c++){var p=f[c];tS.satisfies(s,p.versionSpecifier)&&(u=p.patch(u,a))}return t[a]=u}return i}}Va.makePatchingRequire=nS});var ed=l((nM,iS)=>{iS.exports={name:"diagnostic-channel",version:"1.0.0",main:"./dist/src/channel.js",types:"./dist/src/channel.d.ts",scripts:{build:"tsc",lint:"tslint -c tslint.json -p tsconfig.json",clean:"rimraf ./dist",test:"mocha ./dist/tests/**/*.js"},homepage:"https://github.com/Microsoft/node-diagnostic-channel",bugs:{url:"https://github.com/Microsoft/node-diagnostic-channel/issues"},repository:{type:"git",url:"https://github.com/Microsoft/node-diagnostic-channel.git"},description:"Provides a context-saving pub/sub channel to connect diagnostic event publishers and subscribers",dependencies:{semver:"^5.3.0"},devDependencies:{"@types/mocha":"^2.2.40","@types/node":"~8.0.0",mocha:"^3.2.0",rimraf:"^2.6.1",tslint:"^5.0.0",typescript:"4.1.2"},files:["dist/src/**/*.d.ts","dist/src/**/*.js","LICENSE","README.md","package.json"],license:"MIT"}});var oe=l(fn=>{"use strict";Object.defineProperty(fn,"__esModule",{value:!0});fn.channel=fn.makePatchingRequire=void 0;var aS=Mu(),sS=Mu();Object.defineProperty(fn,"makePatchingRequire",{enumerable:!0,get:function(){return sS.makePatchingRequire}});var td=function(e){return!0},oS=function(){function e(){this.version=ed().version,this.subscribers={},this.contextPreservationFunction=function(t){return t},this.knownPatches={},this.currentlyPublishing=!1}return e.prototype.shouldPublish=function(t){var r=this.subscribers[t];return r?r.some(function(n){var i=n.filter;return!i||i(!1)}):!1},e.prototype.publish=function(t,r){if(!this.currentlyPublishing){var n=this.subscribers[t];if(n){var i={timestamp:Date.now(),data:r};this.currentlyPublishing=!0,n.forEach(function(a){var s=a.listener,o=a.filter;try{o&&o(!0)&&s(i)}catch{}}),this.currentlyPublishing=!1}}},e.prototype.subscribe=function(t,r,n){n===void 0&&(n=td),this.subscribers[t]||(this.subscribers[t]=[]),this.subscribers[t].push({listener:r,filter:n})},e.prototype.unsubscribe=function(t,r,n){n===void 0&&(n=td);var i=this.subscribers[t];if(i){for(var a=0;a<i.length;++a)if(i[a].listener===r&&i[a].filter===n)return i.splice(a,1),!0}return!1},e.prototype.reset=function(){var t=this;this.subscribers={},this.contextPreservationFunction=function(r){return r},Object.getOwnPropertyNames(this.knownPatches).forEach(function(r){return delete t.knownPatches[r]})},e.prototype.bindToContext=function(t){return this.contextPreservationFunction(t)},e.prototype.addContextPreservation=function(t){var r=this.contextPreservationFunction;this.contextPreservationFunction=function(n){return t(r(n))}},e.prototype.registerMonkeyPatch=function(t,r){this.knownPatches[t]||(this.knownPatches[t]=[]),this.knownPatches[t].push(r)},e.prototype.getPatchesObject=function(){return this.knownPatches},e}();global.diagnosticsSource||(global.diagnosticsSource=new oS,rd=__webpack_require__(23),rd.prototype.require=aS.makePatchingRequire(global.diagnosticsSource.getPatchesObject()));var rd;fn.channel=global.diagnosticsSource});var id=l(nd=>{"use strict";Object.defineProperty(nd,"__esModule",{value:!0})});var ad=l($a=>{"use strict";Object.defineProperty($a,"__esModule",{value:!0});$a._globalThis=void 0;$a._globalThis=typeof globalThis=="object"?globalThis:global});var sd=l(Tr=>{"use strict";var uS=Tr&&Tr.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),cS=Tr&&Tr.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&uS(t,e,r)};Object.defineProperty(Tr,"__esModule",{value:!0});cS(ad(),Tr)});var od=l(Ar=>{"use strict";var lS=Ar&&Ar.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),fS=Ar&&Ar.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&lS(t,e,r)};Object.defineProperty(Ar,"__esModule",{value:!0});fS(sd(),Ar)});var Lu=l(za=>{"use strict";Object.defineProperty(za,"__esModule",{value:!0});za.VERSION=void 0;za.VERSION="1.0.3"});var ld=l(pn=>{"use strict";Object.defineProperty(pn,"__esModule",{value:!0});pn.isCompatible=pn._makeCompatibilityCheck=void 0;var pS=Lu(),ud=/^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;function cd(e){var t=new Set([e]),r=new Set,n=e.match(ud);if(!n)return function(){return!1};var i={major:+n[1],minor:+n[2],patch:+n[3],prerelease:n[4]};if(i.prerelease!=null)return function(u){return u===e};function a(o){return r.add(o),!1}function s(o){return t.add(o),!0}return function(u){if(t.has(u))return!0;if(r.has(u))return!1;var c=u.match(ud);if(!c)return a(u);var f={major:+c[1],minor:+c[2],patch:+c[3],prerelease:c[4]};return f.prerelease!=null||i.major!==f.major?a(u):i.major===0?i.minor===f.minor&&i.patch<=f.patch?s(u):a(u):i.minor<=f.minor?s(u):a(u)}}pn._makeCompatibilityCheck=cd;pn.isCompatible=cd(pS.VERSION)});var dn=l(zt=>{"use strict";Object.defineProperty(zt,"__esModule",{value:!0});zt.unregisterGlobal=zt.getGlobal=zt.registerGlobal=void 0;var dS=od(),bi=Lu(),hS=ld(),_S=bi.VERSION.split(".")[0],Oi=Symbol.for("opentelemetry.js.api."+_S),Pi=dS._globalThis;function vS(e,t,r,n){var i;n===void 0&&(n=!1);var a=Pi[Oi]=(i=Pi[Oi])!==null&&i!==void 0?i:{version:bi.VERSION};if(!n&&a[e]){var s=new Error("@opentelemetry/api: Attempted duplicate registration of API: "+e);return r.error(s.stack||s.message),!1}if(a.version!==bi.VERSION){var s=new Error("@opentelemetry/api: All API registration versions must match");return r.error(s.stack||s.message),!1}return a[e]=t,r.debug("@opentelemetry/api: Registered a global for "+e+" v"+bi.VERSION+"."),!0}zt.registerGlobal=vS;function gS(e){var t,r,n=(t=Pi[Oi])===null||t===void 0?void 0:t.version;if(!(!n||!hS.isCompatible(n)))return(r=Pi[Oi])===null||r===void 0?void 0:r[e]}zt.getGlobal=gS;function ES(e,t){t.debug("@opentelemetry/api: Unregistering a global for "+e+" v"+bi.VERSION+".");var r=Pi[Oi];r&&delete r[e]}zt.unregisterGlobal=ES});var fd=l(Xa=>{"use strict";Object.defineProperty(Xa,"__esModule",{value:!0});Xa.DiagComponentLogger=void 0;var mS=dn(),yS=function(){function e(t){this._namespace=t.namespace||"DiagComponentLogger"}return e.prototype.debug=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return Ri("debug",this._namespace,t)},e.prototype.error=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return Ri("error",this._namespace,t)},e.prototype.info=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return Ri("info",this._namespace,t)},e.prototype.warn=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return Ri("warn",this._namespace,t)},e.prototype.verbose=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];return Ri("verbose",this._namespace,t)},e}();Xa.DiagComponentLogger=yS;function Ri(e,t,r){var n=mS.getGlobal("diag");if(!!n)return r.unshift(t),n[e].apply(n,r)}});var Ka=l(Ni=>{"use strict";Object.defineProperty(Ni,"__esModule",{value:!0});Ni.DiagLogLevel=void 0;var TS;(function(e){e[e.NONE=0]="NONE",e[e.ERROR=30]="ERROR",e[e.WARN=50]="WARN",e[e.INFO=60]="INFO",e[e.DEBUG=70]="DEBUG",e[e.VERBOSE=80]="VERBOSE",e[e.ALL=9999]="ALL"})(TS=Ni.DiagLogLevel||(Ni.DiagLogLevel={}))});var pd=l(Ya=>{"use strict";Object.defineProperty(Ya,"__esModule",{value:!0});Ya.createLogLevelDiagLogger=void 0;var Ct=Ka();function AS(e,t){e<Ct.DiagLogLevel.NONE?e=Ct.DiagLogLevel.NONE:e>Ct.DiagLogLevel.ALL&&(e=Ct.DiagLogLevel.ALL),t=t||{};function r(n,i){var a=t[n];return typeof a=="function"&&e>=i?a.bind(t):function(){}}return{error:r("error",Ct.DiagLogLevel.ERROR),warn:r("warn",Ct.DiagLogLevel.WARN),info:r("info",Ct.DiagLogLevel.INFO),debug:r("debug",Ct.DiagLogLevel.DEBUG),verbose:r("verbose",Ct.DiagLogLevel.VERBOSE)}}Ya.createLogLevelDiagLogger=AS});var hn=l(Wa=>{"use strict";Object.defineProperty(Wa,"__esModule",{value:!0});Wa.DiagAPI=void 0;var SS=fd(),IS=pd(),CS=Ka(),Qa=dn(),bS="diag",OS=function(){function e(){function t(n){return function(){var i=Qa.getGlobal("diag");if(!!i)return i[n].apply(i,arguments)}}var r=this;r.setLogger=function(n,i){var a,s;if(i===void 0&&(i=CS.DiagLogLevel.INFO),n===r){var o=new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");return r.error((a=o.stack)!==null&&a!==void 0?a:o.message),!1}var u=Qa.getGlobal("diag"),c=IS.createLogLevelDiagLogger(i,n);if(u){var f=(s=new Error().stack)!==null&&s!==void 0?s:"<failed to generate stacktrace>";u.warn("Current logger will be overwritten from "+f),c.warn("Current logger will overwrite one already registered from "+f)}return Qa.registerGlobal("diag",c,r,!0)},r.disable=function(){Qa.unregisterGlobal(bS,r)},r.createComponentLogger=function(n){return new SS.DiagComponentLogger(n)},r.verbose=t("verbose"),r.debug=t("debug"),r.info=t("info"),r.warn=t("warn"),r.error=t("error")}return e.instance=function(){return this._instance||(this._instance=new e),this._instance},e}();Wa.DiagAPI=OS});var dd=l(Za=>{"use strict";Object.defineProperty(Za,"__esModule",{value:!0});Za.BaggageImpl=void 0;var PS=function(){function e(t){this._entries=t?new Map(t):new Map}return e.prototype.getEntry=function(t){var r=this._entries.get(t);if(!!r)return Object.assign({},r)},e.prototype.getAllEntries=function(){return Array.from(this._entries.entries()).map(function(t){var r=t[0],n=t[1];return[r,n]})},e.prototype.setEntry=function(t,r){var n=new e(this._entries);return n._entries.set(t,r),n},e.prototype.removeEntry=function(t){var r=new e(this._entries);return r._entries.delete(t),r},e.prototype.removeEntries=function(){for(var t=[],r=0;r<arguments.length;r++)t[r]=arguments[r];for(var n=new e(this._entries),i=0,a=t;i<a.length;i++){var s=a[i];n._entries.delete(s)}return n},e.prototype.clear=function(){return new e},e}();Za.BaggageImpl=PS});var hd=l(Ja=>{"use strict";Object.defineProperty(Ja,"__esModule",{value:!0});Ja.baggageEntryMetadataSymbol=void 0;Ja.baggageEntryMetadataSymbol=Symbol("BaggageEntryMetadata")});var qu=l(_n=>{"use strict";Object.defineProperty(_n,"__esModule",{value:!0});_n.baggageEntryMetadataFromString=_n.createBaggage=void 0;var RS=hn(),NS=dd(),DS=hd(),wS=RS.DiagAPI.instance();function xS(e){return e===void 0&&(e={}),new NS.BaggageImpl(new Map(Object.entries(e)))}_n.createBaggage=xS;function MS(e){return typeof e!="string"&&(wS.error("Cannot create baggage metadata from unknown type: "+typeof e),e=""),{__TYPE__:DS.baggageEntryMetadataSymbol,toString:function(){return e}}}_n.baggageEntryMetadataFromString=MS});var vd=l(_d=>{"use strict";Object.defineProperty(_d,"__esModule",{value:!0})});var Ed=l(gd=>{"use strict";Object.defineProperty(gd,"__esModule",{value:!0})});var md=l(es=>{"use strict";Object.defineProperty(es,"__esModule",{value:!0});es.DiagConsoleLogger=void 0;var ju=[{n:"error",c:"error"},{n:"warn",c:"warn"},{n:"info",c:"info"},{n:"debug",c:"debug"},{n:"verbose",c:"trace"}],LS=function(){function e(){function t(n){return function(){var i=arguments;if(console){var a=console[n];if(typeof a!="function"&&(a=console.log),typeof a=="function")return a.apply(console,i)}}}for(var r=0;r<ju.length;r++)this[ju[r].n]=t(ju[r].c)}return e}();es.DiagConsoleLogger=LS});var Td=l(Xt=>{"use strict";var qS=Xt&&Xt.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),yd=Xt&&Xt.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&qS(t,e,r)};Object.defineProperty(Xt,"__esModule",{value:!0});yd(md(),Xt);yd(Ka(),Xt)});var ku=l(vn=>{"use strict";Object.defineProperty(vn,"__esModule",{value:!0});vn.defaultTextMapSetter=vn.defaultTextMapGetter=void 0;vn.defaultTextMapGetter={get:function(e,t){if(e!=null)return e[t]},keys:function(e){return e==null?[]:Object.keys(e)}};vn.defaultTextMapSetter={set:function(e,t,r){e!=null&&(e[t]=r)}}});var Sd=l(Ad=>{"use strict";Object.defineProperty(Ad,"__esModule",{value:!0})});var Cd=l(Id=>{"use strict";Object.defineProperty(Id,"__esModule",{value:!0})});var Di=l(gn=>{"use strict";Object.defineProperty(gn,"__esModule",{value:!0});gn.ROOT_CONTEXT=gn.createContextKey=void 0;function jS(e){return Symbol.for(e)}gn.createContextKey=jS;var kS=function(){function e(t){var r=this;r._currentContext=t?new Map(t):new Map,r.getValue=function(n){return r._currentContext.get(n)},r.setValue=function(n,i){var a=new e(r._currentContext);return a._currentContext.set(n,i),a},r.deleteValue=function(n){var i=new e(r._currentContext);return i._currentContext.delete(n),i}}return e}();gn.ROOT_CONTEXT=new kS});var bd=l(En=>{"use strict";var HS=En&&En.__spreadArray||function(e,t){for(var r=0,n=t.length,i=e.length;r<n;r++,i++)e[i]=t[r];return e};Object.defineProperty(En,"__esModule",{value:!0});En.NoopContextManager=void 0;var US=Di(),BS=function(){function e(){}return e.prototype.active=function(){return US.ROOT_CONTEXT},e.prototype.with=function(t,r,n){for(var i=[],a=3;a<arguments.length;a++)i[a-3]=arguments[a];return r.call.apply(r,HS([n],i))},e.prototype.bind=function(t,r){return r},e.prototype.enable=function(){return this},e.prototype.disable=function(){return this},e}();En.NoopContextManager=BS});var Bu=l(mn=>{"use strict";var FS=mn&&mn.__spreadArray||function(e,t){for(var r=0,n=t.length,i=e.length;r<n;r++,i++)e[i]=t[r];return e};Object.defineProperty(mn,"__esModule",{value:!0});mn.ContextAPI=void 0;var GS=bd(),Hu=dn(),Od=hn(),Uu="context",VS=new GS.NoopContextManager,$S=function(){function e(){}return e.getInstance=function(){return this._instance||(this._instance=new e),this._instance},e.prototype.setGlobalContextManager=function(t){return Hu.registerGlobal(Uu,t,Od.DiagAPI.instance())},e.prototype.active=function(){return this._getContextManager().active()},e.prototype.with=function(t,r,n){for(var i,a=[],s=3;s<arguments.length;s++)a[s-3]=arguments[s];return(i=this._getContextManager()).with.apply(i,FS([t,r,n],a))},e.prototype.bind=function(t,r){return this._getContextManager().bind(t,r)},e.prototype._getContextManager=function(){return Hu.getGlobal(Uu)||VS},e.prototype.disable=function(){this._getContextManager().disable(),Hu.unregisterGlobal(Uu,Od.DiagAPI.instance())},e}();mn.ContextAPI=$S});var Fu=l(wi=>{"use strict";Object.defineProperty(wi,"__esModule",{value:!0});wi.TraceFlags=void 0;var zS;(function(e){e[e.NONE=0]="NONE",e[e.SAMPLED=1]="SAMPLED"})(zS=wi.TraceFlags||(wi.TraceFlags={}))});var ts=l(ct=>{"use strict";Object.defineProperty(ct,"__esModule",{value:!0});ct.INVALID_SPAN_CONTEXT=ct.INVALID_TRACEID=ct.INVALID_SPANID=void 0;var XS=Fu();ct.INVALID_SPANID="0000000000000000";ct.INVALID_TRACEID="00000000000000000000000000000000";ct.INVALID_SPAN_CONTEXT={traceId:ct.INVALID_TRACEID,spanId:ct.INVALID_SPANID,traceFlags:XS.TraceFlags.NONE}});var ns=l(rs=>{"use strict";Object.defineProperty(rs,"__esModule",{value:!0});rs.NonRecordingSpan=void 0;var KS=ts(),YS=function(){function e(t){t===void 0&&(t=KS.INVALID_SPAN_CONTEXT),this._spanContext=t}return e.prototype.spanContext=function(){return this._spanContext},e.prototype.setAttribute=function(t,r){return this},e.prototype.setAttributes=function(t){return this},e.prototype.addEvent=function(t,r){return this},e.prototype.setStatus=function(t){return this},e.prototype.updateName=function(t){return this},e.prototype.end=function(t){},e.prototype.isRecording=function(){return!1},e.prototype.recordException=function(t,r){},e}();rs.NonRecordingSpan=YS});var Vu=l($e=>{"use strict";Object.defineProperty($e,"__esModule",{value:!0});$e.getSpanContext=$e.setSpanContext=$e.deleteSpan=$e.setSpan=$e.getSpan=void 0;var QS=Di(),WS=ns(),Gu=QS.createContextKey("OpenTelemetry Context Key SPAN");function Pd(e){return e.getValue(Gu)||void 0}$e.getSpan=Pd;function Rd(e,t){return e.setValue(Gu,t)}$e.setSpan=Rd;function ZS(e){return e.deleteValue(Gu)}$e.deleteSpan=ZS;function JS(e,t){return Rd(e,new WS.NonRecordingSpan(t))}$e.setSpanContext=JS;function eI(e){var t;return(t=Pd(e))===null||t===void 0?void 0:t.spanContext()}$e.getSpanContext=eI});var is=l(lt=>{"use strict";Object.defineProperty(lt,"__esModule",{value:!0});lt.wrapSpanContext=lt.isSpanContextValid=lt.isValidSpanId=lt.isValidTraceId=void 0;var Nd=ts(),tI=ns(),rI=/^([0-9a-f]{32})$/i,nI=/^[0-9a-f]{16}$/i;function Dd(e){return rI.test(e)&&e!==Nd.INVALID_TRACEID}lt.isValidTraceId=Dd;function wd(e){return nI.test(e)&&e!==Nd.INVALID_SPANID}lt.isValidSpanId=wd;function iI(e){return Dd(e.traceId)&&wd(e.spanId)}lt.isSpanContextValid=iI;function aI(e){return new tI.NonRecordingSpan(e)}lt.wrapSpanContext=aI});var zu=l(as=>{"use strict";Object.defineProperty(as,"__esModule",{value:!0});as.NoopTracer=void 0;var sI=Bu(),xd=Vu(),$u=ns(),oI=is(),Md=sI.ContextAPI.getInstance(),uI=function(){function e(){}return e.prototype.startSpan=function(t,r,n){var i=Boolean(r==null?void 0:r.root);if(i)return new $u.NonRecordingSpan;var a=n&&xd.getSpanContext(n);return cI(a)&&oI.isSpanContextValid(a)?new $u.NonRecordingSpan(a):new $u.NonRecordingSpan},e.prototype.startActiveSpan=function(t,r,n,i){var a,s,o;if(!(arguments.length<2)){arguments.length===2?o=r:arguments.length===3?(a=r,o=n):(a=r,s=n,o=i);var u=s??Md.active(),c=this.startSpan(t,a,u),f=xd.setSpan(u,c);return Md.with(f,o,void 0,c)}},e}();as.NoopTracer=uI;function cI(e){return typeof e=="object"&&typeof e.spanId=="string"&&typeof e.traceId=="string"&&typeof e.traceFlags=="number"}});var Xu=l(ss=>{"use strict";Object.defineProperty(ss,"__esModule",{value:!0});ss.ProxyTracer=void 0;var lI=zu(),fI=new lI.NoopTracer,pI=function(){function e(t,r,n){this._provider=t,this.name=r,this.version=n}return e.prototype.startSpan=function(t,r,n){return this._getTracer().startSpan(t,r,n)},e.prototype.startActiveSpan=function(t,r,n,i){var a=this._getTracer();return Reflect.apply(a.startActiveSpan,a,arguments)},e.prototype._getTracer=function(){if(this._delegate)return this._delegate;var t=this._provider.getDelegateTracer(this.name,this.version);return t?(this._delegate=t,this._delegate):fI},e}();ss.ProxyTracer=pI});var Ld=l(os=>{"use strict";Object.defineProperty(os,"__esModule",{value:!0});os.NoopTracerProvider=void 0;var dI=zu(),hI=function(){function e(){}return e.prototype.getTracer=function(t,r){return new dI.NoopTracer},e}();os.NoopTracerProvider=hI});var Ku=l(us=>{"use strict";Object.defineProperty(us,"__esModule",{value:!0});us.ProxyTracerProvider=void 0;var _I=Xu(),vI=Ld(),gI=new vI.NoopTracerProvider,EI=function(){function e(){}return e.prototype.getTracer=function(t,r){var n;return(n=this.getDelegateTracer(t,r))!==null&&n!==void 0?n:new _I.ProxyTracer(this,t,r)},e.prototype.getDelegate=function(){var t;return(t=this._delegate)!==null&&t!==void 0?t:gI},e.prototype.setDelegate=function(t){this._delegate=t},e.prototype.getDelegateTracer=function(t,r){var n;return(n=this._delegate)===null||n===void 0?void 0:n.getTracer(t,r)},e}();us.ProxyTracerProvider=EI});var jd=l(qd=>{"use strict";Object.defineProperty(qd,"__esModule",{value:!0})});var kd=l(xi=>{"use strict";Object.defineProperty(xi,"__esModule",{value:!0});xi.SamplingDecision=void 0;var mI;(function(e){e[e.NOT_RECORD=0]="NOT_RECORD",e[e.RECORD=1]="RECORD",e[e.RECORD_AND_SAMPLED=2]="RECORD_AND_SAMPLED"})(mI=xi.SamplingDecision||(xi.SamplingDecision={}))});var Ud=l(Hd=>{"use strict";Object.defineProperty(Hd,"__esModule",{value:!0})});var Bd=l(Mi=>{"use strict";Object.defineProperty(Mi,"__esModule",{value:!0});Mi.SpanKind=void 0;var yI;(function(e){e[e.INTERNAL=0]="INTERNAL",e[e.SERVER=1]="SERVER",e[e.CLIENT=2]="CLIENT",e[e.PRODUCER=3]="PRODUCER",e[e.CONSUMER=4]="CONSUMER"})(yI=Mi.SpanKind||(Mi.SpanKind={}))});var Gd=l(Fd=>{"use strict";Object.defineProperty(Fd,"__esModule",{value:!0})});var $d=l(Vd=>{"use strict";Object.defineProperty(Vd,"__esModule",{value:!0})});var zd=l(Li=>{"use strict";Object.defineProperty(Li,"__esModule",{value:!0});Li.SpanStatusCode=void 0;var TI;(function(e){e[e.UNSET=0]="UNSET",e[e.OK=1]="OK",e[e.ERROR=2]="ERROR"})(TI=Li.SpanStatusCode||(Li.SpanStatusCode={}))});var Kd=l(Xd=>{"use strict";Object.defineProperty(Xd,"__esModule",{value:!0})});var Qd=l(Yd=>{"use strict";Object.defineProperty(Yd,"__esModule",{value:!0})});var Zd=l(Wd=>{"use strict";Object.defineProperty(Wd,"__esModule",{value:!0})});var eh=l(Jd=>{"use strict";Object.defineProperty(Jd,"__esModule",{value:!0})});var ih=l(cs=>{"use strict";Object.defineProperty(cs,"__esModule",{value:!0});cs.TraceAPI=void 0;var Yu=dn(),th=Ku(),rh=is(),qi=Vu(),nh=hn(),Qu="trace",AI=function(){function e(){this._proxyTracerProvider=new th.ProxyTracerProvider,this.wrapSpanContext=rh.wrapSpanContext,this.isSpanContextValid=rh.isSpanContextValid,this.deleteSpan=qi.deleteSpan,this.getSpan=qi.getSpan,this.getSpanContext=qi.getSpanContext,this.setSpan=qi.setSpan,this.setSpanContext=qi.setSpanContext}return e.getInstance=function(){return this._instance||(this._instance=new e),this._instance},e.prototype.setGlobalTracerProvider=function(t){var r=Yu.registerGlobal(Qu,this._proxyTracerProvider,nh.DiagAPI.instance());return r&&this._proxyTracerProvider.setDelegate(t),r},e.prototype.getTracerProvider=function(){return Yu.getGlobal(Qu)||this._proxyTracerProvider},e.prototype.getTracer=function(t,r){return this.getTracerProvider().getTracer(t,r)},e.prototype.disable=function(){Yu.unregisterGlobal(Qu,nh.DiagAPI.instance()),this._proxyTracerProvider=new th.ProxyTracerProvider},e}();cs.TraceAPI=AI});var ah=l(ls=>{"use strict";Object.defineProperty(ls,"__esModule",{value:!0});ls.NoopTextMapPropagator=void 0;var SI=function(){function e(){}return e.prototype.inject=function(t,r){},e.prototype.extract=function(t,r){return t},e.prototype.fields=function(){return[]},e}();ls.NoopTextMapPropagator=SI});var sh=l(Kt=>{"use strict";Object.defineProperty(Kt,"__esModule",{value:!0});Kt.deleteBaggage=Kt.setBaggage=Kt.getBaggage=void 0;var II=Di(),Wu=II.createContextKey("OpenTelemetry Baggage Key");function CI(e){return e.getValue(Wu)||void 0}Kt.getBaggage=CI;function bI(e,t){return e.setValue(Wu,t)}Kt.setBaggage=bI;function OI(e){return e.deleteValue(Wu)}Kt.deleteBaggage=OI});var ch=l(fs=>{"use strict";Object.defineProperty(fs,"__esModule",{value:!0});fs.PropagationAPI=void 0;var Zu=dn(),PI=ah(),oh=ku(),Ju=sh(),RI=qu(),uh=hn(),ec="propagation",NI=new PI.NoopTextMapPropagator,DI=function(){function e(){this.createBaggage=RI.createBaggage,this.getBaggage=Ju.getBaggage,this.setBaggage=Ju.setBaggage,this.deleteBaggage=Ju.deleteBaggage}return e.getInstance=function(){return this._instance||(this._instance=new e),this._instance},e.prototype.setGlobalPropagator=function(t){return Zu.registerGlobal(ec,t,uh.DiagAPI.instance())},e.prototype.inject=function(t,r,n){return n===void 0&&(n=oh.defaultTextMapSetter),this._getGlobalPropagator().inject(t,r,n)},e.prototype.extract=function(t,r,n){return n===void 0&&(n=oh.defaultTextMapGetter),this._getGlobalPropagator().extract(t,r,n)},e.prototype.fields=function(){return this._getGlobalPropagator().fields()},e.prototype.disable=function(){Zu.unregisterGlobal(ec,uh.DiagAPI.instance())},e.prototype._getGlobalPropagator=function(){return Zu.getGlobal(ec)||NI},e}();fs.PropagationAPI=DI});var z=l(y=>{"use strict";var wI=y&&y.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),re=y&&y.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&wI(t,e,r)};Object.defineProperty(y,"__esModule",{value:!0});y.diag=y.propagation=y.trace=y.context=y.INVALID_SPAN_CONTEXT=y.INVALID_TRACEID=y.INVALID_SPANID=y.isValidSpanId=y.isValidTraceId=y.isSpanContextValid=y.baggageEntryMetadataFromString=void 0;re(id(),y);var xI=qu();Object.defineProperty(y,"baggageEntryMetadataFromString",{enumerable:!0,get:function(){return xI.baggageEntryMetadataFromString}});re(vd(),y);re(Ed(),y);re(Td(),y);re(ku(),y);re(Sd(),y);re(Cd(),y);re(Xu(),y);re(Ku(),y);re(jd(),y);re(kd(),y);re(Ud(),y);re(Bd(),y);re(Gd(),y);re($d(),y);re(zd(),y);re(Fu(),y);re(Kd(),y);re(Qd(),y);re(Zd(),y);var tc=is();Object.defineProperty(y,"isSpanContextValid",{enumerable:!0,get:function(){return tc.isSpanContextValid}});Object.defineProperty(y,"isValidTraceId",{enumerable:!0,get:function(){return tc.isValidTraceId}});Object.defineProperty(y,"isValidSpanId",{enumerable:!0,get:function(){return tc.isValidSpanId}});var rc=ts();Object.defineProperty(y,"INVALID_SPANID",{enumerable:!0,get:function(){return rc.INVALID_SPANID}});Object.defineProperty(y,"INVALID_TRACEID",{enumerable:!0,get:function(){return rc.INVALID_TRACEID}});Object.defineProperty(y,"INVALID_SPAN_CONTEXT",{enumerable:!0,get:function(){return rc.INVALID_SPAN_CONTEXT}});re(Di(),y);re(eh(),y);var MI=Bu();y.context=MI.ContextAPI.getInstance();var LI=ih();y.trace=LI.TraceAPI.getInstance();var qI=ch();y.propagation=qI.PropagationAPI.getInstance();var jI=hn();y.diag=jI.DiagAPI.instance();y.default={trace:y.trace,context:y.context,propagation:y.propagation,diag:y.diag}});var ps=l(Yt=>{"use strict";Object.defineProperty(Yt,"__esModule",{value:!0});Yt.isTracingSuppressed=Yt.unsuppressTracing=Yt.suppressTracing=void 0;var kI=z(),nc=kI.createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");function HI(e){return e.setValue(nc,!0)}Yt.suppressTracing=HI;function UI(e){return e.deleteValue(nc)}Yt.unsuppressTracing=UI;function BI(e){return e.getValue(nc)===!0}Yt.isTracingSuppressed=BI});var ic=l(Ie=>{"use strict";Object.defineProperty(Ie,"__esModule",{value:!0});Ie.BAGGAGE_MAX_TOTAL_LENGTH=Ie.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS=Ie.BAGGAGE_MAX_NAME_VALUE_PAIRS=Ie.BAGGAGE_HEADER=Ie.BAGGAGE_ITEMS_SEPARATOR=Ie.BAGGAGE_PROPERTIES_SEPARATOR=Ie.BAGGAGE_KEY_PAIR_SEPARATOR=void 0;Ie.BAGGAGE_KEY_PAIR_SEPARATOR="=";Ie.BAGGAGE_PROPERTIES_SEPARATOR=";";Ie.BAGGAGE_ITEMS_SEPARATOR=",";Ie.BAGGAGE_HEADER="baggage";Ie.BAGGAGE_MAX_NAME_VALUE_PAIRS=180;Ie.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS=4096;Ie.BAGGAGE_MAX_TOTAL_LENGTH=8192});var ac=l(rt=>{"use strict";Object.defineProperty(rt,"__esModule",{value:!0});rt.parseKeyPairsIntoRecord=rt.parsePairKeyValue=rt.getKeyPairs=rt.serializeKeyPairs=void 0;var FI=z(),yn=ic(),GI=e=>e.reduce((t,r)=>{let n=`${t}${t!==""?yn.BAGGAGE_ITEMS_SEPARATOR:""}${r}`;return n.length>yn.BAGGAGE_MAX_TOTAL_LENGTH?t:n},"");rt.serializeKeyPairs=GI;var VI=e=>e.getAllEntries().map(([t,r])=>`${encodeURIComponent(t)}=${encodeURIComponent(r.value)}`);rt.getKeyPairs=VI;var $I=e=>{let t=e.split(yn.BAGGAGE_PROPERTIES_SEPARATOR);if(t.length<=0)return;let r=t.shift();if(!r)return;let n=r.split(yn.BAGGAGE_KEY_PAIR_SEPARATOR);if(n.length!==2)return;let i=decodeURIComponent(n[0].trim()),a=decodeURIComponent(n[1].trim()),s;return t.length>0&&(s=FI.baggageEntryMetadataFromString(t.join(yn.BAGGAGE_PROPERTIES_SEPARATOR))),{key:i,value:a,metadata:s}};rt.parsePairKeyValue=$I;var zI=e=>typeof e!="string"||e.length===0?{}:e.split(yn.BAGGAGE_ITEMS_SEPARATOR).map(t=>rt.parsePairKeyValue(t)).filter(t=>t!==void 0&&t.value.length>0).reduce((t,r)=>(t[r.key]=r.value,t),{});rt.parseKeyPairsIntoRecord=zI});var lh=l(ds=>{"use strict";Object.defineProperty(ds,"__esModule",{value:!0});ds.HttpBaggagePropagator=void 0;var sc=z(),XI=ps(),Tn=ic(),oc=ac(),uc=class{inject(t,r,n){let i=sc.propagation.getBaggage(t);if(!i||XI.isTracingSuppressed(t))return;let a=oc.getKeyPairs(i).filter(o=>o.length<=Tn.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS).slice(0,Tn.BAGGAGE_MAX_NAME_VALUE_PAIRS),s=oc.serializeKeyPairs(a);s.length>0&&n.set(r,Tn.BAGGAGE_HEADER,s)}extract(t,r,n){let i=n.get(r,Tn.BAGGAGE_HEADER);if(!i)return t;let a={};return i.length===0||(i.split(Tn.BAGGAGE_ITEMS_SEPARATOR).forEach(o=>{let u=oc.parsePairKeyValue(o);if(u){let c={value:u.value};u.metadata&&(c.metadata=u.metadata),a[u.key]=c}}),Object.entries(a).length===0)?t:sc.propagation.setBaggage(t,sc.propagation.createBaggage(a))}fields(){return[Tn.BAGGAGE_HEADER]}};ds.HttpBaggagePropagator=uc});var dh=l(An=>{"use strict";Object.defineProperty(An,"__esModule",{value:!0});An.isAttributeValue=An.sanitizeAttributes=void 0;function KI(e){let t={};if(e==null||typeof e!="object")return t;for(let[r,n]of Object.entries(e))fh(n)&&(Array.isArray(n)?t[r]=n.slice():t[r]=n);return t}An.sanitizeAttributes=KI;function fh(e){return e==null?!0:Array.isArray(e)?YI(e):ph(e)}An.isAttributeValue=fh;function YI(e){let t;for(let r of e)if(r!=null){if(!t){if(ph(r)){t=typeof r;continue}return!1}if(typeof r!==t)return!1}return!0}function ph(e){switch(typeof e){case"number":return!0;case"boolean":return!0;case"string":return!0}return!1}});var cc=l(hs=>{"use strict";Object.defineProperty(hs,"__esModule",{value:!0});hs.loggingErrorHandler=void 0;var QI=z();function WI(){return e=>{QI.diag.error(ZI(e))}}hs.loggingErrorHandler=WI;function ZI(e){return typeof e=="string"?e:JSON.stringify(JI(e))}function JI(e){let t={},r=e;for(;r!==null;)Object.getOwnPropertyNames(r).forEach(n=>{if(t[n])return;let i=r[n];i&&(t[n]=String(i))}),r=Object.getPrototypeOf(r);return t}});var lc=l(Sn=>{"use strict";Object.defineProperty(Sn,"__esModule",{value:!0});Sn.globalErrorHandler=Sn.setGlobalErrorHandler=void 0;var eC=cc(),hh=eC.loggingErrorHandler();function tC(e){hh=e}Sn.setGlobalErrorHandler=tC;var rC=e=>{try{hh(e)}catch{}};Sn.globalErrorHandler=rC});var fc=l(ji=>{"use strict";Object.defineProperty(ji,"__esModule",{value:!0});ji.TracesSamplerValues=void 0;var nC;(function(e){e.AlwaysOff="always_off",e.AlwaysOn="always_on",e.ParentBasedAlwaysOff="parentbased_always_off",e.ParentBasedAlwaysOn="parentbased_always_on",e.ParentBasedTraceIdRatio="parentbased_traceidratio",e.TraceIdRatio="traceidratio"})(nC=ji.TracesSamplerValues||(ji.TracesSamplerValues={}))});var pc=l(Sr=>{"use strict";Object.defineProperty(Sr,"__esModule",{value:!0});Sr.parseEnvironment=Sr.DEFAULT_ENVIRONMENT=void 0;var Qt=z(),iC=fc(),aC=",",sC=["OTEL_BSP_EXPORT_TIMEOUT","OTEL_BSP_MAX_EXPORT_BATCH_SIZE","OTEL_BSP_MAX_QUEUE_SIZE","OTEL_BSP_SCHEDULE_DELAY","OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT","OTEL_SPAN_EVENT_COUNT_LIMIT","OTEL_SPAN_LINK_COUNT_LIMIT"];function oC(e){return sC.indexOf(e)>-1}var uC=["OTEL_NO_PATCH_MODULES","OTEL_PROPAGATORS"];function cC(e){return uC.indexOf(e)>-1}Sr.DEFAULT_ENVIRONMENT={CONTAINER_NAME:"",ECS_CONTAINER_METADATA_URI_V4:"",ECS_CONTAINER_METADATA_URI:"",HOSTNAME:"",KUBERNETES_SERVICE_HOST:"",NAMESPACE:"",OTEL_BSP_EXPORT_TIMEOUT:3e4,OTEL_BSP_MAX_EXPORT_BATCH_SIZE:512,OTEL_BSP_MAX_QUEUE_SIZE:2048,OTEL_BSP_SCHEDULE_DELAY:5e3,OTEL_EXPORTER_JAEGER_AGENT_HOST:"",OTEL_EXPORTER_JAEGER_ENDPOINT:"",OTEL_EXPORTER_JAEGER_PASSWORD:"",OTEL_EXPORTER_JAEGER_USER:"",OTEL_EXPORTER_OTLP_ENDPOINT:"",OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:"",OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:"",OTEL_EXPORTER_OTLP_HEADERS:"",OTEL_EXPORTER_OTLP_TRACES_HEADERS:"",OTEL_EXPORTER_OTLP_METRICS_HEADERS:"",OTEL_EXPORTER_ZIPKIN_ENDPOINT:"http://localhost:9411/api/v2/spans",OTEL_LOG_LEVEL:Qt.DiagLogLevel.INFO,OTEL_NO_PATCH_MODULES:[],OTEL_PROPAGATORS:["tracecontext","baggage"],OTEL_RESOURCE_ATTRIBUTES:"",OTEL_SERVICE_NAME:"",OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT:128,OTEL_SPAN_EVENT_COUNT_LIMIT:128,OTEL_SPAN_LINK_COUNT_LIMIT:128,OTEL_TRACES_EXPORTER:"none",OTEL_TRACES_SAMPLER:iC.TracesSamplerValues.ParentBasedAlwaysOn,OTEL_TRACES_SAMPLER_ARG:""};function lC(e,t,r,n=-1/0,i=1/0){if(typeof r[e]<"u"){let a=Number(r[e]);isNaN(a)||(a<n?t[e]=n:a>i?t[e]=i:t[e]=a)}}function fC(e,t,r,n=aC){let i=r[e];typeof i=="string"&&(t[e]=i.split(n).map(a=>a.trim()))}var pC={ALL:Qt.DiagLogLevel.ALL,VERBOSE:Qt.DiagLogLevel.VERBOSE,DEBUG:Qt.DiagLogLevel.DEBUG,INFO:Qt.DiagLogLevel.INFO,WARN:Qt.DiagLogLevel.WARN,ERROR:Qt.DiagLogLevel.ERROR,NONE:Qt.DiagLogLevel.NONE};function dC(e,t,r){let n=r[e];if(typeof n=="string"){let i=pC[n.toUpperCase()];i!=null&&(t[e]=i)}}function hC(e){let t={};for(let r in Sr.DEFAULT_ENVIRONMENT){let n=r;switch(n){case"OTEL_LOG_LEVEL":dC(n,t,e);break;default:if(oC(n))lC(n,t,e);else if(cC(n))fC(n,t,e);else{let i=e[n];typeof i<"u"&&i!==null&&(t[n]=String(i))}}}return t}Sr.parseEnvironment=hC});var vh=l(_s=>{"use strict";Object.defineProperty(_s,"__esModule",{value:!0});_s.getEnv=void 0;var _C=__webpack_require__(24),_h=pc();function vC(){let e=_h.parseEnvironment(process.env);return Object.assign({HOSTNAME:_C.hostname()},_h.DEFAULT_ENVIRONMENT,e)}_s.getEnv=vC});var gh=l(vs=>{"use strict";Object.defineProperty(vs,"__esModule",{value:!0});vs.hexToBase64=void 0;function gC(e){let t=e.length,r="";for(let n=0;n<t;n+=2){let i=e.substring(n,n+2),a=parseInt(i,16);r+=String.fromCharCode(a)}return Buffer.from(r,"ascii").toString("base64")}vs.hexToBase64=gC});var yh=l(Es=>{"use strict";Object.defineProperty(Es,"__esModule",{value:!0});Es.RandomIdGenerator=void 0;var EC=8,mh=16,dc=class{constructor(){this.generateTraceId=Eh(mh),this.generateSpanId=Eh(EC)}};Es.RandomIdGenerator=dc;var gs=Buffer.allocUnsafe(mh);function Eh(e){return function(){for(let r=0;r<e/4;r++)gs.writeUInt32BE(Math.random()*2**32>>>0,r*4);for(let r=0;r<e&&!(gs[r]>0);r++)r===e-1&&(gs[e-1]=1);return gs.toString("hex",0,e)}}});var Th=l(ms=>{"use strict";Object.defineProperty(ms,"__esModule",{value:!0});ms.otperformance=void 0;var mC=__webpack_require__(25);ms.otperformance=mC.performance});var Ts=l(ys=>{"use strict";Object.defineProperty(ys,"__esModule",{value:!0});ys.VERSION=void 0;ys.VERSION="0.23.0"});var Ah=l(x=>{"use strict";Object.defineProperty(x,"__esModule",{value:!0});x.RpcGrpcStatusCodeValues=x.MessagingOperationValues=x.MessagingDestinationKindValues=x.HttpFlavorValues=x.NetTransportValues=x.FaasInvokedProviderValues=x.FaasDocumentOperationValues=x.FaasTriggerValues=x.DbCassandraConsistencyLevelValues=x.DbSystemValues=x.SemanticAttributes=void 0;x.SemanticAttributes={DB_SYSTEM:"db.system",DB_CONNECTION_STRING:"db.connection_string",DB_USER:"db.user",DB_JDBC_DRIVER_CLASSNAME:"db.jdbc.driver_classname",DB_NAME:"db.name",DB_STATEMENT:"db.statement",DB_OPERATION:"db.operation",DB_MSSQL_INSTANCE_NAME:"db.mssql.instance_name",DB_CASSANDRA_KEYSPACE:"db.cassandra.keyspace",DB_CASSANDRA_PAGE_SIZE:"db.cassandra.page_size",DB_CASSANDRA_CONSISTENCY_LEVEL:"db.cassandra.consistency_level",DB_CASSANDRA_TABLE:"db.cassandra.table",DB_CASSANDRA_IDEMPOTENCE:"db.cassandra.idempotence",DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT:"db.cassandra.speculative_execution_count",DB_CASSANDRA_COORDINATOR_ID:"db.cassandra.coordinator.id",DB_CASSANDRA_COORDINATOR_DC:"db.cassandra.coordinator.dc",DB_HBASE_NAMESPACE:"db.hbase.namespace",DB_REDIS_DATABASE_INDEX:"db.redis.database_index",DB_MONGODB_COLLECTION:"db.mongodb.collection",DB_SQL_TABLE:"db.sql.table",EXCEPTION_TYPE:"exception.type",EXCEPTION_MESSAGE:"exception.message",EXCEPTION_STACKTRACE:"exception.stacktrace",EXCEPTION_ESCAPED:"exception.escaped",FAAS_TRIGGER:"faas.trigger",FAAS_EXECUTION:"faas.execution",FAAS_DOCUMENT_COLLECTION:"faas.document.collection",FAAS_DOCUMENT_OPERATION:"faas.document.operation",FAAS_DOCUMENT_TIME:"faas.document.time",FAAS_DOCUMENT_NAME:"faas.document.name",FAAS_TIME:"faas.time",FAAS_CRON:"faas.cron",FAAS_COLDSTART:"faas.coldstart",FAAS_INVOKED_NAME:"faas.invoked_name",FAAS_INVOKED_PROVIDER:"faas.invoked_provider",FAAS_INVOKED_REGION:"faas.invoked_region",NET_TRANSPORT:"net.transport",NET_PEER_IP:"net.peer.ip",NET_PEER_PORT:"net.peer.port",NET_PEER_NAME:"net.peer.name",NET_HOST_IP:"net.host.ip",NET_HOST_PORT:"net.host.port",NET_HOST_NAME:"net.host.name",PEER_SERVICE:"peer.service",ENDUSER_ID:"enduser.id",ENDUSER_ROLE:"enduser.role",ENDUSER_SCOPE:"enduser.scope",THREAD_ID:"thread.id",THREAD_NAME:"thread.name",CODE_FUNCTION:"code.function",CODE_NAMESPACE:"code.namespace",CODE_FILEPATH:"code.filepath",CODE_LINENO:"code.lineno",HTTP_METHOD:"http.method",HTTP_URL:"http.url",HTTP_TARGET:"http.target",HTTP_HOST:"http.host",HTTP_SCHEME:"http.scheme",HTTP_STATUS_CODE:"http.status_code",HTTP_FLAVOR:"http.flavor",HTTP_USER_AGENT:"http.user_agent",HTTP_REQUEST_CONTENT_LENGTH:"http.request_content_length",HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED:"http.request_content_length_uncompressed",HTTP_RESPONSE_CONTENT_LENGTH:"http.response_content_length",HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED:"http.response_content_length_uncompressed",HTTP_SERVER_NAME:"http.server_name",HTTP_ROUTE:"http.route",HTTP_CLIENT_IP:"http.client_ip",AWS_DYNAMODB_TABLE_NAMES:"aws.dynamodb.table_names",AWS_DYNAMODB_CONSUMED_CAPACITY:"aws.dynamodb.consumed_capacity",AWS_DYNAMODB_ITEM_COLLECTION_METRICS:"aws.dynamodb.item_collection_metrics",AWS_DYNAMODB_PROVISIONED_READ_CAPACITY:"aws.dynamodb.provisioned_read_capacity",AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY:"aws.dynamodb.provisioned_write_capacity",AWS_DYNAMODB_CONSISTENT_READ:"aws.dynamodb.consistent_read",AWS_DYNAMODB_PROJECTION:"aws.dynamodb.projection",AWS_DYNAMODB_LIMIT:"aws.dynamodb.limit",AWS_DYNAMODB_ATTRIBUTES_TO_GET:"aws.dynamodb.attributes_to_get",AWS_DYNAMODB_INDEX_NAME:"aws.dynamodb.index_name",AWS_DYNAMODB_SELECT:"aws.dynamodb.select",AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES:"aws.dynamodb.global_secondary_indexes",AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES:"aws.dynamodb.local_secondary_indexes",AWS_DYNAMODB_EXCLUSIVE_START_TABLE:"aws.dynamodb.exclusive_start_table",AWS_DYNAMODB_TABLE_COUNT:"aws.dynamodb.table_count",AWS_DYNAMODB_SCAN_FORWARD:"aws.dynamodb.scan_forward",AWS_DYNAMODB_SEGMENT:"aws.dynamodb.segment",AWS_DYNAMODB_TOTAL_SEGMENTS:"aws.dynamodb.total_segments",AWS_DYNAMODB_COUNT:"aws.dynamodb.count",AWS_DYNAMODB_SCANNED_COUNT:"aws.dynamodb.scanned_count",AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS:"aws.dynamodb.attribute_definitions",AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES:"aws.dynamodb.global_secondary_index_updates",MESSAGING_SYSTEM:"messaging.system",MESSAGING_DESTINATION:"messaging.destination",MESSAGING_DESTINATION_KIND:"messaging.destination_kind",MESSAGING_TEMP_DESTINATION:"messaging.temp_destination",MESSAGING_PROTOCOL:"messaging.protocol",MESSAGING_PROTOCOL_VERSION:"messaging.protocol_version",MESSAGING_URL:"messaging.url",MESSAGING_MESSAGE_ID:"messaging.message_id",MESSAGING_CONVERSATION_ID:"messaging.conversation_id",MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES:"messaging.message_payload_size_bytes",MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES:"messaging.message_payload_compressed_size_bytes",MESSAGING_OPERATION:"messaging.operation",MESSAGING_RABBITMQ_ROUTING_KEY:"messaging.rabbitmq.routing_key",MESSAGING_KAFKA_MESSAGE_KEY:"messaging.kafka.message_key",MESSAGING_KAFKA_CONSUMER_GROUP:"messaging.kafka.consumer_group",MESSAGING_KAFKA_CLIENT_ID:"messaging.kafka.client_id",MESSAGING_KAFKA_PARTITION:"messaging.kafka.partition",MESSAGING_KAFKA_TOMBSTONE:"messaging.kafka.tombstone",RPC_SYSTEM:"rpc.system",RPC_SERVICE:"rpc.service",RPC_METHOD:"rpc.method",RPC_GRPC_STATUS_CODE:"rpc.grpc.status_code",RPC_JSONRPC_VERSION:"rpc.jsonrpc.version",RPC_JSONRPC_METHOD:"rpc.jsonrpc.method",RPC_JSONRPC_REQUEST_ID:"rpc.jsonrpc.request_id",RPC_JSONRPC_ERROR_CODE:"rpc.jsonrpc.error_code",RPC_JSONRPC_ERROR_MESSAGE:"rpc.jsonrpc.error_message"};var yC;(function(e){e.OTHER_SQL="other_sql",e.MSSQL="mssql",e.MYSQL="mysql",e.ORACLE="oracle",e.DB2="db2",e.POSTGRESQL="postgresql",e.REDSHIFT="redshift",e.HIVE="hive",e.CLOUDSCAPE="cloudscape",e.HSQLDB="hsqldb",e.PROGRESS="progress",e.MAXDB="maxdb",e.HANADB="hanadb",e.INGRES="ingres",e.FIRSTSQL="firstsql",e.EDB="edb",e.CACHE="cache",e.ADABAS="adabas",e.FIREBIRD="firebird",e.DERBY="derby",e.FILEMAKER="filemaker",e.INFORMIX="informix",e.INSTANTDB="instantdb",e.INTERBASE="interbase",e.MARIADB="mariadb",e.NETEZZA="netezza",e.PERVASIVE="pervasive",e.POINTBASE="pointbase",e.SQLITE="sqlite",e.SYBASE="sybase",e.TERADATA="teradata",e.VERTICA="vertica",e.H2="h2",e.COLDFUSION="coldfusion",e.CASSANDRA="cassandra",e.HBASE="hbase",e.MONGODB="mongodb",e.REDIS="redis",e.COUCHBASE="couchbase",e.COUCHDB="couchdb",e.COSMOSDB="cosmosdb",e.DYNAMODB="dynamodb",e.NEO4J="neo4j",e.GEODE="geode",e.ELASTICSEARCH="elasticsearch",e.MEMCACHED="memcached",e.COCKROACHDB="cockroachdb"})(yC=x.DbSystemValues||(x.DbSystemValues={}));var TC;(function(e){e.ALL="all",e.EACH_QUORUM="each_quorum",e.QUORUM="quorum",e.LOCAL_QUORUM="local_quorum",e.ONE="one",e.TWO="two",e.THREE="three",e.LOCAL_ONE="local_one",e.ANY="any",e.SERIAL="serial",e.LOCAL_SERIAL="local_serial"})(TC=x.DbCassandraConsistencyLevelValues||(x.DbCassandraConsistencyLevelValues={}));var AC;(function(e){e.DATASOURCE="datasource",e.HTTP="http",e.PUBSUB="pubsub",e.TIMER="timer",e.OTHER="other"})(AC=x.FaasTriggerValues||(x.FaasTriggerValues={}));var SC;(function(e){e.INSERT="insert",e.EDIT="edit",e.DELETE="delete"})(SC=x.FaasDocumentOperationValues||(x.FaasDocumentOperationValues={}));var IC;(function(e){e.AWS="aws",e.AZURE="azure",e.GCP="gcp"})(IC=x.FaasInvokedProviderValues||(x.FaasInvokedProviderValues={}));var CC;(function(e){e.IP_TCP="ip_tcp",e.IP_UDP="ip_udp",e.IP="ip",e.UNIX="unix",e.PIPE="pipe",e.INPROC="inproc",e.OTHER="other"})(CC=x.NetTransportValues||(x.NetTransportValues={}));var bC;(function(e){e.HTTP_1_0="1.0",e.HTTP_1_1="1.1",e.HTTP_2_0="2.0",e.SPDY="SPDY",e.QUIC="QUIC"})(bC=x.HttpFlavorValues||(x.HttpFlavorValues={}));var OC;(function(e){e.QUEUE="queue",e.TOPIC="topic"})(OC=x.MessagingDestinationKindValues||(x.MessagingDestinationKindValues={}));var PC;(function(e){e.RECEIVE="receive",e.PROCESS="process"})(PC=x.MessagingOperationValues||(x.MessagingOperationValues={}));var RC;(function(e){e[e.OK=0]="OK",e[e.CANCELLED=1]="CANCELLED",e[e.UNKNOWN=2]="UNKNOWN",e[e.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",e[e.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",e[e.NOT_FOUND=5]="NOT_FOUND",e[e.ALREADY_EXISTS=6]="ALREADY_EXISTS",e[e.PERMISSION_DENIED=7]="PERMISSION_DENIED",e[e.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",e[e.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",e[e.ABORTED=10]="ABORTED",e[e.OUT_OF_RANGE=11]="OUT_OF_RANGE",e[e.UNIMPLEMENTED=12]="UNIMPLEMENTED",e[e.INTERNAL=13]="INTERNAL",e[e.UNAVAILABLE=14]="UNAVAILABLE",e[e.DATA_LOSS=15]="DATA_LOSS",e[e.UNAUTHENTICATED=16]="UNAUTHENTICATED"})(RC=x.RpcGrpcStatusCodeValues||(x.RpcGrpcStatusCodeValues={}))});var Sh=l(Ir=>{"use strict";var NC=Ir&&Ir.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),DC=Ir&&Ir.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&NC(t,e,r)};Object.defineProperty(Ir,"__esModule",{value:!0});DC(Ah(),Ir)});var Ih=l(ne=>{"use strict";Object.defineProperty(ne,"__esModule",{value:!0});ne.TelemetrySdkLanguageValues=ne.OsTypeValues=ne.HostArchValues=ne.AwsEcsLaunchtypeValues=ne.CloudPlatformValues=ne.CloudProviderValues=ne.ResourceAttributes=void 0;ne.ResourceAttributes={CLOUD_PROVIDER:"cloud.provider",CLOUD_ACCOUNT_ID:"cloud.account.id",CLOUD_REGION:"cloud.region",CLOUD_AVAILABILITY_ZONE:"cloud.availability_zone",CLOUD_PLATFORM:"cloud.platform",AWS_ECS_CONTAINER_ARN:"aws.ecs.container.arn",AWS_ECS_CLUSTER_ARN:"aws.ecs.cluster.arn",AWS_ECS_LAUNCHTYPE:"aws.ecs.launchtype",AWS_ECS_TASK_ARN:"aws.ecs.task.arn",AWS_ECS_TASK_FAMILY:"aws.ecs.task.family",AWS_ECS_TASK_REVISION:"aws.ecs.task.revision",AWS_EKS_CLUSTER_ARN:"aws.eks.cluster.arn",AWS_LOG_GROUP_NAMES:"aws.log.group.names",AWS_LOG_GROUP_ARNS:"aws.log.group.arns",AWS_LOG_STREAM_NAMES:"aws.log.stream.names",AWS_LOG_STREAM_ARNS:"aws.log.stream.arns",CONTAINER_NAME:"container.name",CONTAINER_ID:"container.id",CONTAINER_RUNTIME:"container.runtime",CONTAINER_IMAGE_NAME:"container.image.name",CONTAINER_IMAGE_TAG:"container.image.tag",DEPLOYMENT_ENVIRONMENT:"deployment.environment",DEVICE_ID:"device.id",DEVICE_MODEL_IDENTIFIER:"device.model.identifier",DEVICE_MODEL_NAME:"device.model.name",FAAS_NAME:"faas.name",FAAS_ID:"faas.id",FAAS_VERSION:"faas.version",FAAS_INSTANCE:"faas.instance",FAAS_MAX_MEMORY:"faas.max_memory",HOST_ID:"host.id",HOST_NAME:"host.name",HOST_TYPE:"host.type",HOST_ARCH:"host.arch",HOST_IMAGE_NAME:"host.image.name",HOST_IMAGE_ID:"host.image.id",HOST_IMAGE_VERSION:"host.image.version",K8S_CLUSTER_NAME:"k8s.cluster.name",K8S_NODE_NAME:"k8s.node.name",K8S_NODE_UID:"k8s.node.uid",K8S_NAMESPACE_NAME:"k8s.namespace.name",K8S_POD_UID:"k8s.pod.uid",K8S_POD_NAME:"k8s.pod.name",K8S_CONTAINER_NAME:"k8s.container.name",K8S_REPLICASET_UID:"k8s.replicaset.uid",K8S_REPLICASET_NAME:"k8s.replicaset.name",K8S_DEPLOYMENT_UID:"k8s.deployment.uid",K8S_DEPLOYMENT_NAME:"k8s.deployment.name",K8S_STATEFULSET_UID:"k8s.statefulset.uid",K8S_STATEFULSET_NAME:"k8s.statefulset.name",K8S_DAEMONSET_UID:"k8s.daemonset.uid",K8S_DAEMONSET_NAME:"k8s.daemonset.name",K8S_JOB_UID:"k8s.job.uid",K8S_JOB_NAME:"k8s.job.name",K8S_CRONJOB_UID:"k8s.cronjob.uid",K8S_CRONJOB_NAME:"k8s.cronjob.name",OS_TYPE:"os.type",OS_DESCRIPTION:"os.description",OS_NAME:"os.name",OS_VERSION:"os.version",PROCESS_PID:"process.pid",PROCESS_EXECUTABLE_NAME:"process.executable.name",PROCESS_EXECUTABLE_PATH:"process.executable.path",PROCESS_COMMAND:"process.command",PROCESS_COMMAND_LINE:"process.command_line",PROCESS_COMMAND_ARGS:"process.command_args",PROCESS_OWNER:"process.owner",PROCESS_RUNTIME_NAME:"process.runtime.name",PROCESS_RUNTIME_VERSION:"process.runtime.version",PROCESS_RUNTIME_DESCRIPTION:"process.runtime.description",SERVICE_NAME:"service.name",SERVICE_NAMESPACE:"service.namespace",SERVICE_INSTANCE_ID:"service.instance.id",SERVICE_VERSION:"service.version",TELEMETRY_SDK_NAME:"telemetry.sdk.name",TELEMETRY_SDK_LANGUAGE:"telemetry.sdk.language",TELEMETRY_SDK_VERSION:"telemetry.sdk.version",TELEMETRY_AUTO_VERSION:"telemetry.auto.version",WEBENGINE_NAME:"webengine.name",WEBENGINE_VERSION:"webengine.version",WEBENGINE_DESCRIPTION:"webengine.description"};var wC;(function(e){e.AWS="aws",e.AZURE="azure",e.GCP="gcp"})(wC=ne.CloudProviderValues||(ne.CloudProviderValues={}));var xC;(function(e){e.AWS_EC2="aws_ec2",e.AWS_ECS="aws_ecs",e.AWS_EKS="aws_eks",e.AWS_LAMBDA="aws_lambda",e.AWS_ELASTIC_BEANSTALK="aws_elastic_beanstalk",e.AZURE_VM="azure_vm",e.AZURE_CONTAINER_INSTANCES="azure_container_instances",e.AZURE_AKS="azure_aks",e.AZURE_FUNCTIONS="azure_functions",e.AZURE_APP_SERVICE="azure_app_service",e.GCP_COMPUTE_ENGINE="gcp_compute_engine",e.GCP_CLOUD_RUN="gcp_cloud_run",e.GCP_KUBERNETES_ENGINE="gcp_kubernetes_engine",e.GCP_CLOUD_FUNCTIONS="gcp_cloud_functions",e.GCP_APP_ENGINE="gcp_app_engine"})(xC=ne.CloudPlatformValues||(ne.CloudPlatformValues={}));var MC;(function(e){e.EC2="ec2",e.FARGATE="fargate"})(MC=ne.AwsEcsLaunchtypeValues||(ne.AwsEcsLaunchtypeValues={}));var LC;(function(e){e.AMD64="amd64",e.ARM32="arm32",e.ARM64="arm64",e.IA64="ia64",e.PPC32="ppc32",e.PPC64="ppc64",e.X86="x86"})(LC=ne.HostArchValues||(ne.HostArchValues={}));var qC;(function(e){e.WINDOWS="windows",e.LINUX="linux",e.DARWIN="darwin",e.FREEBSD="freebsd",e.NETBSD="netbsd",e.OPENBSD="openbsd",e.DRAGONFLYBSD="dragonflybsd",e.HPUX="hpux",e.AIX="aix",e.SOLARIS="solaris",e.Z_OS="z_os"})(qC=ne.OsTypeValues||(ne.OsTypeValues={}));var jC;(function(e){e.CPP="cpp",e.DOTNET="dotnet",e.ERLANG="erlang",e.GO="go",e.JAVA="java",e.NODEJS="nodejs",e.PHP="php",e.PYTHON="python",e.RUBY="ruby",e.WEBJS="webjs"})(jC=ne.TelemetrySdkLanguageValues||(ne.TelemetrySdkLanguageValues={}))});var Ch=l(Cr=>{"use strict";var kC=Cr&&Cr.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),HC=Cr&&Cr.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&kC(t,e,r)};Object.defineProperty(Cr,"__esModule",{value:!0});HC(Ih(),Cr)});var In=l(Wt=>{"use strict";var UC=Wt&&Wt.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),bh=Wt&&Wt.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&UC(t,e,r)};Object.defineProperty(Wt,"__esModule",{value:!0});bh(Sh(),Wt);bh(Ch(),Wt)});var Oh=l(As=>{"use strict";Object.defineProperty(As,"__esModule",{value:!0});As.SDK_INFO=void 0;var BC=Ts(),ki=In();As.SDK_INFO={[ki.ResourceAttributes.TELEMETRY_SDK_NAME]:"opentelemetry",[ki.ResourceAttributes.PROCESS_RUNTIME_NAME]:"node",[ki.ResourceAttributes.TELEMETRY_SDK_LANGUAGE]:ki.TelemetrySdkLanguageValues.NODEJS,[ki.ResourceAttributes.TELEMETRY_SDK_VERSION]:BC.VERSION}});var Ph=l(Ss=>{"use strict";Object.defineProperty(Ss,"__esModule",{value:!0});Ss.unrefTimer=void 0;function FC(e){e.unref()}Ss.unrefTimer=FC});var Rh=l(ze=>{"use strict";var GC=ze&&ze.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),Cn=ze&&ze.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&GC(t,e,r)};Object.defineProperty(ze,"__esModule",{value:!0});Cn(vh(),ze);Cn(gh(),ze);Cn(yh(),ze);Cn(Th(),ze);Cn(Oh(),ze);Cn(Ph(),ze)});var hc=l(br=>{"use strict";var VC=br&&br.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),$C=br&&br.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&VC(t,e,r)};Object.defineProperty(br,"__esModule",{value:!0});$C(Rh(),br)});var wh=l(le=>{"use strict";Object.defineProperty(le,"__esModule",{value:!0});le.isTimeInput=le.isTimeInputHrTime=le.hrTimeToMicroseconds=le.hrTimeToMilliseconds=le.hrTimeToNanoseconds=le.hrTimeToTimeStamp=le.hrTimeDuration=le.timeInputToHrTime=le.hrTime=void 0;var _c=hc(),vc=9,Hi=Math.pow(10,vc);function Is(e){let t=e/1e3,r=Math.trunc(t),n=Number((t-r).toFixed(vc))*Hi;return[r,n]}function Nh(){let e=_c.otperformance.timeOrigin;if(typeof e!="number"){let t=_c.otperformance;e=t.timing&&t.timing.fetchStart}return e}function Dh(e){let t=Is(Nh()),r=Is(typeof e=="number"?e:_c.otperformance.now()),n=t[0]+r[0],i=t[1]+r[1];return i>Hi&&(i-=Hi,n+=1),[n,i]}le.hrTime=Dh;function zC(e){if(gc(e))return e;if(typeof e=="number")return e<Nh()?Dh(e):Is(e);if(e instanceof Date)return Is(e.getTime());throw TypeError("Invalid input type")}le.timeInputToHrTime=zC;function XC(e,t){let r=t[0]-e[0],n=t[1]-e[1];return n<0&&(r-=1,n+=Hi),[r,n]}le.hrTimeDuration=XC;function KC(e){let t=vc,r=`${"0".repeat(t)}${e[1]}Z`,n=r.substr(r.length-t-1);return new Date(e[0]*1e3).toISOString().replace("000Z",n)}le.hrTimeToTimeStamp=KC;function YC(e){return e[0]*Hi+e[1]}le.hrTimeToNanoseconds=YC;function QC(e){return Math.round(e[0]*1e3+e[1]/1e6)}le.hrTimeToMilliseconds=QC;function WC(e){return Math.round(e[0]*1e6+e[1]/1e3)}le.hrTimeToMicroseconds=WC;function gc(e){return Array.isArray(e)&&e.length===2&&typeof e[0]=="number"&&typeof e[1]=="number"}le.isTimeInputHrTime=gc;function ZC(e){return gc(e)||typeof e=="number"||e instanceof Date}le.isTimeInput=ZC});var Mh=l(xh=>{"use strict";Object.defineProperty(xh,"__esModule",{value:!0})});var Lh=l(Ui=>{"use strict";Object.defineProperty(Ui,"__esModule",{value:!0});Ui.ExportResultCode=void 0;var JC;(function(e){e[e.SUCCESS=0]="SUCCESS",e[e.FAILED=1]="FAILED"})(JC=Ui.ExportResultCode||(Ui.ExportResultCode={}))});var jh=l(Cs=>{"use strict";Object.defineProperty(Cs,"__esModule",{value:!0});Cs.CompositePropagator=void 0;var qh=z(),Ec=class{constructor(t={}){var r;this._propagators=(r=t.propagators)!==null&&r!==void 0?r:[],this._fields=Array.from(new Set(this._propagators.map(n=>typeof n.fields=="function"?n.fields():[]).reduce((n,i)=>n.concat(i),[])))}inject(t,r,n){for(let i of this._propagators)try{i.inject(t,r,n)}catch(a){qh.diag.warn(`Failed to inject with ${i.constructor.name}. Err: ${a.message}`)}}extract(t,r,n){return this._propagators.reduce((i,a)=>{try{return a.extract(i,r,n)}catch(s){qh.diag.warn(`Failed to inject with ${a.constructor.name}. Err: ${s.message}`)}return i},t)}fields(){return this._fields.slice()}};Cs.CompositePropagator=Ec});var kh=l(bn=>{"use strict";Object.defineProperty(bn,"__esModule",{value:!0});bn.validateValue=bn.validateKey=void 0;var mc="[_0-9a-z-*/]",eb=`[a-z]${mc}{0,255}`,tb=`[a-z0-9]${mc}{0,240}@[a-z]${mc}{0,13}`,rb=new RegExp(`^(?:${eb}|${tb})$`),nb=/^[ -~]{0,255}[!-~]$/,ib=/,|=/;function ab(e){return rb.test(e)}bn.validateKey=ab;function sb(e){return nb.test(e)&&!ib.test(e)}bn.validateValue=sb});var yc=l(bs=>{"use strict";Object.defineProperty(bs,"__esModule",{value:!0});bs.TraceState=void 0;var Hh=kh(),Uh=32,ob=512,Bh=",",Fh="=",Bi=class{constructor(t){this._internalState=new Map,t&&this._parse(t)}set(t,r){let n=this._clone();return n._internalState.has(t)&&n._internalState.delete(t),n._internalState.set(t,r),n}unset(t){let r=this._clone();return r._internalState.delete(t),r}get(t){return this._internalState.get(t)}serialize(){return this._keys().reduce((t,r)=>(t.push(r+Fh+this.get(r)),t),[]).join(Bh)}_parse(t){t.length>ob||(this._internalState=t.split(Bh).reverse().reduce((r,n)=>{let i=n.trim(),a=i.indexOf(Fh);if(a!==-1){let s=i.slice(0,a),o=i.slice(a+1,n.length);Hh.validateKey(s)&&Hh.validateValue(o)&&r.set(s,o)}return r},new Map),this._internalState.size>Uh&&(this._internalState=new Map(Array.from(this._internalState.entries()).reverse().slice(0,Uh))))}_keys(){return Array.from(this._internalState.keys()).reverse()}_clone(){let t=new Bi;return t._internalState=new Map(this._internalState),t}};bs.TraceState=Bi});var Vh=l(Ce=>{"use strict";Object.defineProperty(Ce,"__esModule",{value:!0});Ce.HttpTraceContextPropagator=Ce.parseTraceParent=Ce.TRACE_STATE_HEADER=Ce.TRACE_PARENT_HEADER=void 0;var Os=z(),ub=ps(),cb=yc();Ce.TRACE_PARENT_HEADER="traceparent";Ce.TRACE_STATE_HEADER="tracestate";var lb="00",fb="(?!ff)[\\da-f]{2}",pb="(?![0]{32})[\\da-f]{32}",db="(?![0]{16})[\\da-f]{16}",hb="[\\da-f]{2}",_b=new RegExp(`^\\s?(${fb})-(${pb})-(${db})-(${hb})(-.*)?\\s?$`);function Gh(e){let t=_b.exec(e);return!t||t[1]==="00"&&t[5]?null:{traceId:t[2],spanId:t[3],traceFlags:parseInt(t[4],16)}}Ce.parseTraceParent=Gh;var Tc=class{inject(t,r,n){let i=Os.trace.getSpanContext(t);if(!i||ub.isTracingSuppressed(t)||!Os.isSpanContextValid(i))return;let a=`${lb}-${i.traceId}-${i.spanId}-0${Number(i.traceFlags||Os.TraceFlags.NONE).toString(16)}`;n.set(r,Ce.TRACE_PARENT_HEADER,a),i.traceState&&n.set(r,Ce.TRACE_STATE_HEADER,i.traceState.serialize())}extract(t,r,n){let i=n.get(r,Ce.TRACE_PARENT_HEADER);if(!i)return t;let a=Array.isArray(i)?i[0]:i;if(typeof a!="string")return t;let s=Gh(a);if(!s)return t;s.isRemote=!0;let o=n.get(r,Ce.TRACE_STATE_HEADER);if(o){let u=Array.isArray(o)?o.join(","):o;s.traceState=new cb.TraceState(typeof u=="string"?u:void 0)}return Os.trace.setSpanContext(t,s)}fields(){return[Ce.TRACE_PARENT_HEADER,Ce.TRACE_STATE_HEADER]}};Ce.HttpTraceContextPropagator=Tc});var zh=l($h=>{"use strict";Object.defineProperty($h,"__esModule",{value:!0})});var Xh=l(nt=>{"use strict";Object.defineProperty(nt,"__esModule",{value:!0});nt.getRPCMetadata=nt.deleteRPCMetadata=nt.setRPCMetadata=nt.RPCType=void 0;var vb=z(),Ac=vb.createContextKey("OpenTelemetry SDK Context Key RPC_METADATA"),gb;(function(e){e.HTTP="http"})(gb=nt.RPCType||(nt.RPCType={}));function Eb(e,t){return e.setValue(Ac,t)}nt.setRPCMetadata=Eb;function mb(e){return e.deleteValue(Ac)}nt.deleteRPCMetadata=mb;function yb(e){return e.getValue(Ac)}nt.getRPCMetadata=yb});var Ic=l(Ps=>{"use strict";Object.defineProperty(Ps,"__esModule",{value:!0});Ps.AlwaysOffSampler=void 0;var Tb=z(),Sc=class{shouldSample(){return{decision:Tb.SamplingDecision.NOT_RECORD}}toString(){return"AlwaysOffSampler"}};Ps.AlwaysOffSampler=Sc});var bc=l(Rs=>{"use strict";Object.defineProperty(Rs,"__esModule",{value:!0});Rs.AlwaysOnSampler=void 0;var Ab=z(),Cc=class{shouldSample(){return{decision:Ab.SamplingDecision.RECORD_AND_SAMPLED}}toString(){return"AlwaysOnSampler"}};Rs.AlwaysOnSampler=Cc});var Yh=l(Ds=>{"use strict";Object.defineProperty(Ds,"__esModule",{value:!0});Ds.ParentBasedSampler=void 0;var Ns=z(),Sb=lc(),Kh=Ic(),Oc=bc(),Pc=class{constructor(t){var r,n,i,a;this._root=t.root,this._root||(Sb.globalErrorHandler(new Error("ParentBasedSampler must have a root sampler configured")),this._root=new Oc.AlwaysOnSampler),this._remoteParentSampled=(r=t.remoteParentSampled)!==null&&r!==void 0?r:new Oc.AlwaysOnSampler,this._remoteParentNotSampled=(n=t.remoteParentNotSampled)!==null&&n!==void 0?n:new Kh.AlwaysOffSampler,this._localParentSampled=(i=t.localParentSampled)!==null&&i!==void 0?i:new Oc.AlwaysOnSampler,this._localParentNotSampled=(a=t.localParentNotSampled)!==null&&a!==void 0?a:new Kh.AlwaysOffSampler}shouldSample(t,r,n,i,a,s){let o=Ns.trace.getSpanContext(t);return!o||!Ns.isSpanContextValid(o)?this._root.shouldSample(t,r,n,i,a,s):o.isRemote?o.traceFlags&Ns.TraceFlags.SAMPLED?this._remoteParentSampled.shouldSample(t,r,n,i,a,s):this._remoteParentNotSampled.shouldSample(t,r,n,i,a,s):o.traceFlags&Ns.TraceFlags.SAMPLED?this._localParentSampled.shouldSample(t,r,n,i,a,s):this._localParentNotSampled.shouldSample(t,r,n,i,a,s)}toString(){return`ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`}};Ds.ParentBasedSampler=Pc});var Qh=l(ws=>{"use strict";Object.defineProperty(ws,"__esModule",{value:!0});ws.TraceIdRatioBasedSampler=void 0;var Rc=z(),Nc=class{constructor(t=0){this._ratio=t,this._ratio=this._normalize(t),this._upperBound=Math.floor(this._ratio*4294967295)}shouldSample(t,r){return{decision:Rc.isValidTraceId(r)&&this._accumulate(r)<this._upperBound?Rc.SamplingDecision.RECORD_AND_SAMPLED:Rc.SamplingDecision.NOT_RECORD}}toString(){return`TraceIdRatioBased{${this._ratio}}`}_normalize(t){return typeof t!="number"||isNaN(t)?0:t>=1?1:t<=0?0:t}_accumulate(t){let r=0;for(let n=0;n<t.length/8;n++){let i=n*8,a=parseInt(t.slice(i,i+8),16);r=(r^a)>>>0}return r}};ws.TraceIdRatioBasedSampler=Nc});var Zh=l(On=>{"use strict";Object.defineProperty(On,"__esModule",{value:!0});On.isUrlIgnored=On.urlMatches=void 0;function Wh(e,t){return typeof t=="string"?e===t:t.test(e)}On.urlMatches=Wh;function Ib(e,t){if(!t)return!1;for(let r of t)if(Wh(e,r))return!0;return!1}On.isUrlIgnored=Ib});var Jh=l(xs=>{"use strict";Object.defineProperty(xs,"__esModule",{value:!0});xs.isWrapped=void 0;function Cb(e){return typeof e=="function"&&typeof e.__original=="function"&&typeof e.__unwrap=="function"&&e.__wrapped===!0}xs.isWrapped=Cb});var Xe=l(M=>{"use strict";var bb=M&&M.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),Y=M&&M.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&bb(t,e,r)};Object.defineProperty(M,"__esModule",{value:!0});M.baggageUtils=void 0;Y(lh(),M);Y(dh(),M);Y(lc(),M);Y(cc(),M);Y(wh(),M);Y(Mh(),M);Y(Lh(),M);Y(Ts(),M);M.baggageUtils=ac();Y(hc(),M);Y(jh(),M);Y(Vh(),M);Y(zh(),M);Y(Xh(),M);Y(Ic(),M);Y(bc(),M);Y(Yh(),M);Y(Qh(),M);Y(ps(),M);Y(yc(),M);Y(pc(),M);Y(fc(),M);Y(Zh(),M);Y(Jh(),M);Y(Ts(),M)});var e_=l(Ms=>{"use strict";Object.defineProperty(Ms,"__esModule",{value:!0});Ms.ExceptionEventName=void 0;Ms.ExceptionEventName="exception"});var wc=l(Ls=>{"use strict";Object.defineProperty(Ls,"__esModule",{value:!0});Ls.Span=void 0;var Zt=z(),ft=Xe(),Or=In(),Ob=e_(),Dc=class{constructor(t,r,n,i,a,s,o=[],u=ft.hrTime()){this.attributes={},this.links=[],this.events=[],this.status={code:Zt.SpanStatusCode.UNSET},this.endTime=[0,0],this._ended=!1,this._duration=[-1,-1],this.name=n,this._spanContext=i,this.parentSpanId=s,this.kind=a,this.links=o,this.startTime=ft.timeInputToHrTime(u),this.resource=t.resource,this.instrumentationLibrary=t.instrumentationLibrary,this._spanLimits=t.getSpanLimits(),this._spanProcessor=t.getActiveSpanProcessor(),this._spanProcessor.onStart(this,r)}spanContext(){return this._spanContext}setAttribute(t,r){return r==null||this._isSpanEnded()?this:t.length===0?(Zt.diag.warn(`Invalid attribute key: ${t}`),this):ft.isAttributeValue(r)?Object.keys(this.attributes).length>=this._spanLimits.attributeCountLimit&&!Object.prototype.hasOwnProperty.call(this.attributes,t)?this:(this.attributes[t]=r,this):(Zt.diag.warn(`Invalid attribute value set for key: ${t}`),this)}setAttributes(t){for(let[r,n]of Object.entries(t))this.setAttribute(r,n);return this}addEvent(t,r,n){return this._isSpanEnded()?this:(this.events.length>=this._spanLimits.eventCountLimit&&(Zt.diag.warn("Dropping extra events."),this.events.shift()),ft.isTimeInput(r)&&(typeof n>"u"&&(n=r),r=void 0),typeof n>"u"&&(n=ft.hrTime()),this.events.push({name:t,attributes:r,time:ft.timeInputToHrTime(n)}),this)}setStatus(t){return this._isSpanEnded()?this:(this.status=t,this)}updateName(t){return this._isSpanEnded()?this:(this.name=t,this)}end(t=ft.hrTime()){if(this._isSpanEnded()){Zt.diag.error("You can only call end() on a span once.");return}this._ended=!0,this.endTime=ft.timeInputToHrTime(t),this._duration=ft.hrTimeDuration(this.startTime,this.endTime),this._duration[0]<0&&Zt.diag.warn("Inconsistent start and end time, startTime > endTime",this.startTime,this.endTime),this._spanProcessor.onEnd(this)}isRecording(){return this._ended===!1}recordException(t,r=ft.hrTime()){let n={};typeof t=="string"?n[Or.SemanticAttributes.EXCEPTION_MESSAGE]=t:t&&(t.code?n[Or.SemanticAttributes.EXCEPTION_TYPE]=t.code.toString():t.name&&(n[Or.SemanticAttributes.EXCEPTION_TYPE]=t.name),t.message&&(n[Or.SemanticAttributes.EXCEPTION_MESSAGE]=t.message),t.stack&&(n[Or.SemanticAttributes.EXCEPTION_STACKTRACE]=t.stack)),n[Or.SemanticAttributes.EXCEPTION_TYPE]||n[Or.SemanticAttributes.EXCEPTION_MESSAGE]?this.addEvent(Ob.ExceptionEventName,n,r):Zt.diag.warn(`Failed to record an exception ${t}`)}get duration(){return this._duration}get ended(){return this._ended}_isSpanEnded(){return this._ended&&Zt.diag.warn("Can not execute the operation on ended Span {traceId: %s, spanId: %s}",this._spanContext.traceId,this._spanContext.spanId),this._ended}};Ls.Span=Dc});var xc=l(Rn=>{"use strict";Object.defineProperty(Rn,"__esModule",{value:!0});Rn.buildSamplerFromEnv=Rn.DEFAULT_CONFIG=void 0;var qs=z(),ie=Xe(),Pb=ie.getEnv(),Rb=ie.TracesSamplerValues.AlwaysOn;Rn.DEFAULT_CONFIG={sampler:r_(Pb),forceFlushTimeoutMillis:3e4,spanLimits:{attributeCountLimit:ie.getEnv().OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT,linkCountLimit:ie.getEnv().OTEL_SPAN_LINK_COUNT_LIMIT,eventCountLimit:ie.getEnv().OTEL_SPAN_EVENT_COUNT_LIMIT}};function r_(e=ie.getEnv()){switch(e.OTEL_TRACES_SAMPLER){case ie.TracesSamplerValues.AlwaysOn:return new ie.AlwaysOnSampler;case ie.TracesSamplerValues.AlwaysOff:return new ie.AlwaysOffSampler;case ie.TracesSamplerValues.ParentBasedAlwaysOn:return new ie.ParentBasedSampler({root:new ie.AlwaysOnSampler});case ie.TracesSamplerValues.ParentBasedAlwaysOff:return new ie.ParentBasedSampler({root:new ie.AlwaysOffSampler});case ie.TracesSamplerValues.TraceIdRatio:return new ie.TraceIdRatioBasedSampler(t_(e));case ie.TracesSamplerValues.ParentBasedTraceIdRatio:return new ie.ParentBasedSampler({root:new ie.TraceIdRatioBasedSampler(t_(e))});default:return qs.diag.error(`OTEL_TRACES_SAMPLER value "${e.OTEL_TRACES_SAMPLER} invalid, defaulting to ${Rb}".`),new ie.AlwaysOnSampler}}Rn.buildSamplerFromEnv=r_;var Pn=1;function t_(e){if(e.OTEL_TRACES_SAMPLER_ARG===void 0||e.OTEL_TRACES_SAMPLER_ARG==="")return qs.diag.error(`OTEL_TRACES_SAMPLER_ARG is blank, defaulting to ${Pn}.`),Pn;let t=Number(e.OTEL_TRACES_SAMPLER_ARG);return isNaN(t)?(qs.diag.error(`OTEL_TRACES_SAMPLER_ARG=${e.OTEL_TRACES_SAMPLER_ARG} was given, but it is invalid, defaulting to ${Pn}.`),Pn):t<0||t>1?(qs.diag.error(`OTEL_TRACES_SAMPLER_ARG=${e.OTEL_TRACES_SAMPLER_ARG} was given, but it is out of range ([0..1]), defaulting to ${Pn}.`),Pn):t}});var n_=l(js=>{"use strict";Object.defineProperty(js,"__esModule",{value:!0});js.mergeConfig=void 0;var Mc=xc();function Nb(e){let t={sampler:Mc.buildSamplerFromEnv()},r=Object.assign({},Mc.DEFAULT_CONFIG,t,e);return r.spanLimits=Object.assign({},Mc.DEFAULT_CONFIG.spanLimits,e.spanLimits||{}),r}js.mergeConfig=Nb});var i_=l(ks=>{"use strict";Object.defineProperty(ks,"__esModule",{value:!0});ks.Tracer=void 0;var ve=z(),Lc=Xe(),Db=wc(),wb=n_(),qc=class{constructor(t,r,n){this._tracerProvider=n;let i=wb.mergeConfig(r);this._sampler=i.sampler,this._spanLimits=i.spanLimits,this._idGenerator=r.idGenerator||new Lc.RandomIdGenerator,this.resource=n.resource,this.instrumentationLibrary=t}startSpan(t,r={},n=ve.context.active()){var i,a;if(Lc.isTracingSuppressed(n))return ve.diag.debug("Instrumentation suppressed, returning Noop Span"),ve.trace.wrapSpanContext(ve.INVALID_SPAN_CONTEXT);let s=xb(r,n),o=this._idGenerator.generateSpanId(),u,c,f;!s||!ve.trace.isSpanContextValid(s)?u=this._idGenerator.generateTraceId():(u=s.traceId,c=s.traceState,f=s.spanId);let p=(i=r.kind)!==null&&i!==void 0?i:ve.SpanKind.INTERNAL,d=(a=r.links)!==null&&a!==void 0?a:[],h=Lc.sanitizeAttributes(r.attributes),E=this._sampler.shouldSample(r.root?ve.trace.setSpanContext(n,ve.INVALID_SPAN_CONTEXT):n,u,t,p,h,d),A=E.decision===ve.SamplingDecision.RECORD_AND_SAMPLED?ve.TraceFlags.SAMPLED:ve.TraceFlags.NONE,j={traceId:u,spanId:o,traceFlags:A,traceState:c};if(E.decision===ve.SamplingDecision.NOT_RECORD)return ve.diag.debug("Recording is off, propagating context in a non-recording span"),ve.trace.wrapSpanContext(j);let se=new Db.Span(this,n,t,j,p,f,d,r.startTime);return se.setAttributes(Object.assign(h,E.attributes)),se}startActiveSpan(t,r,n,i){let a,s,o;if(arguments.length<2)return;arguments.length===2?o=r:arguments.length===3?(a=r,o=n):(a=r,s=n,o=i);let u=s??ve.context.active(),c=this.startSpan(t,a,u),f=ve.trace.setSpan(u,c);return ve.context.with(f,o,void 0,c)}getSpanLimits(){return this._spanLimits}getActiveSpanProcessor(){return this._tracerProvider.getActiveSpanProcessor()}};ks.Tracer=qc;function xb(e,t){if(!e.root)return ve.trace.getSpanContext(t)}});var a_=l(Hs=>{"use strict";Object.defineProperty(Hs,"__esModule",{value:!0});Hs.defaultServiceName=void 0;function Mb(){return`unknown_service:${process.argv0}`}Hs.defaultServiceName=Mb});var o_=l(Us=>{"use strict";Object.defineProperty(Us,"__esModule",{value:!0});Us.detectResources=void 0;var s_=kc(),jc=z(),Lb=__webpack_require__(26),qb=async(e={})=>{let t=Object.assign(e),r=await Promise.all((t.detectors||[]).map(async n=>{try{let i=await n.detect(t);return jc.diag.debug(`${n.constructor.name} found resource.`,i),i}catch(i){return jc.diag.debug(`${n.constructor.name} failed: ${i.message}`),s_.Resource.empty()}}));return jb(r),r.reduce((n,i)=>n.merge(i),s_.Resource.empty())};Us.detectResources=qb;var jb=e=>{e.forEach(t=>{if(Object.keys(t.attributes).length>0){let r=Lb.inspect(t.attributes,{depth:2,breakLength:1/0,sorted:!0,compact:!1});jc.diag.verbose(r)}})}});var u_=l(Bs=>{"use strict";Object.defineProperty(Bs,"__esModule",{value:!0});Bs.envDetector=void 0;var kb=z(),Hb=Xe(),Ub=In(),Bb=Fs(),Hc=class{constructor(){this._MAX_LENGTH=255,this._COMMA_SEPARATOR=",",this._LABEL_KEY_VALUE_SPLITTER="=",this._ERROR_MESSAGE_INVALID_CHARS="should be a ASCII string with a length greater than 0 and not exceed "+this._MAX_LENGTH+" characters.",this._ERROR_MESSAGE_INVALID_VALUE="should be a ASCII string with a length not exceed "+this._MAX_LENGTH+" characters."}async detect(t){let r={},n=Hb.getEnv(),i=n.OTEL_RESOURCE_ATTRIBUTES,a=n.OTEL_SERVICE_NAME;if(i)try{let s=this._parseResourceAttributes(i);Object.assign(r,s)}catch(s){kb.diag.debug(`EnvDetector failed: ${s.message}`)}return a&&(r[Ub.ResourceAttributes.SERVICE_NAME]=a),new Bb.Resource(r)}_parseResourceAttributes(t){if(!t)return{};let r={},n=t.split(this._COMMA_SEPARATOR,-1);for(let i of n){let a=i.split(this._LABEL_KEY_VALUE_SPLITTER,-1);if(a.length!==2)continue;let[s,o]=a;if(s=s.trim(),o=o.trim().split('^"|"$').join(""),!this._isValidAndNotEmpty(s))throw new Error(`Attribute key ${this._ERROR_MESSAGE_INVALID_CHARS}`);if(!this._isValid(o))throw new Error(`Attribute value ${this._ERROR_MESSAGE_INVALID_VALUE}`);r[s]=o}return r}_isValid(t){return t.length<=this._MAX_LENGTH&&this._isPrintableString(t)}_isPrintableString(t){for(let r=0;r<t.length;r++){let n=t.charAt(r);if(n<=" "||n>="~")return!1}return!0}_isValidAndNotEmpty(t){return t.length>0&&this._isValid(t)}};Bs.envDetector=new Hc});var l_=l(Gs=>{"use strict";Object.defineProperty(Gs,"__esModule",{value:!0});Gs.processDetector=void 0;var Fb=z(),Jt=In(),c_=Fs(),Uc=class{async detect(t){let r={[Jt.ResourceAttributes.PROCESS_PID]:process.pid,[Jt.ResourceAttributes.PROCESS_EXECUTABLE_NAME]:process.title||"",[Jt.ResourceAttributes.PROCESS_COMMAND]:process.argv[1]||"",[Jt.ResourceAttributes.PROCESS_COMMAND_LINE]:process.argv.join(" ")||""};return this._getResourceAttributes(r,t)}_getResourceAttributes(t,r){return t[Jt.ResourceAttributes.PROCESS_EXECUTABLE_NAME]===""||t[Jt.ResourceAttributes.PROCESS_EXECUTABLE_PATH]===""||t[Jt.ResourceAttributes.PROCESS_COMMAND]===""||t[Jt.ResourceAttributes.PROCESS_COMMAND_LINE]===""?(Fb.diag.debug("ProcessDetector failed: Unable to find required process resources. "),c_.Resource.empty()):new c_.Resource(Object.assign({},t))}};Gs.processDetector=new Uc});var p_=l(er=>{"use strict";var Gb=er&&er.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),f_=er&&er.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&Gb(t,e,r)};Object.defineProperty(er,"__esModule",{value:!0});f_(u_(),er);f_(l_(),er)});var d_=l(bt=>{"use strict";var Vb=bt&&bt.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),Bc=bt&&bt.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&Vb(t,e,r)};Object.defineProperty(bt,"__esModule",{value:!0});Bc(a_(),bt);Bc(o_(),bt);Bc(p_(),bt)});var Fc=l(Pr=>{"use strict";var $b=Pr&&Pr.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),zb=Pr&&Pr.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&$b(t,e,r)};Object.defineProperty(Pr,"__esModule",{value:!0});zb(d_(),Pr)});var kc=l(Vs=>{"use strict";Object.defineProperty(Vs,"__esModule",{value:!0});Vs.Resource=void 0;var Rr=In(),Gc=Xe(),Xb=Fc(),Ot=class{constructor(t){this.attributes=t}static empty(){return Ot.EMPTY}static default(){return new Ot({[Rr.ResourceAttributes.SERVICE_NAME]:Xb.defaultServiceName(),[Rr.ResourceAttributes.TELEMETRY_SDK_LANGUAGE]:Gc.SDK_INFO[Rr.ResourceAttributes.TELEMETRY_SDK_LANGUAGE],[Rr.ResourceAttributes.TELEMETRY_SDK_NAME]:Gc.SDK_INFO[Rr.ResourceAttributes.TELEMETRY_SDK_NAME],[Rr.ResourceAttributes.TELEMETRY_SDK_VERSION]:Gc.SDK_INFO[Rr.ResourceAttributes.TELEMETRY_SDK_VERSION]})}merge(t){if(!t||!Object.keys(t.attributes).length)return this;let r=Object.assign({},this.attributes,t.attributes);return new Ot(r)}};Vs.Resource=Ot;Ot.EMPTY=new Ot({})});var __=l(h_=>{"use strict";Object.defineProperty(h_,"__esModule",{value:!0})});var g_=l(v_=>{"use strict";Object.defineProperty(v_,"__esModule",{value:!0})});var Fs=l(pt=>{"use strict";var Kb=pt&&pt.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),$s=pt&&pt.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&Kb(t,e,r)};Object.defineProperty(pt,"__esModule",{value:!0});$s(kc(),pt);$s(Fc(),pt);$s(__(),pt);$s(g_(),pt)});var E_=l(zs=>{"use strict";Object.defineProperty(zs,"__esModule",{value:!0});zs.MultiSpanProcessor=void 0;var Yb=Xe(),Vc=class{constructor(t){this._spanProcessors=t}forceFlush(){let t=[];for(let r of this._spanProcessors)t.push(r.forceFlush());return new Promise(r=>{Promise.all(t).then(()=>{r()}).catch(n=>{Yb.globalErrorHandler(n||new Error("MultiSpanProcessor: forceFlush failed")),r()})})}onStart(t,r){for(let n of this._spanProcessors)n.onStart(t,r)}onEnd(t){for(let r of this._spanProcessors)r.onEnd(t)}shutdown(){let t=[];for(let r of this._spanProcessors)t.push(r.shutdown());return new Promise((r,n)=>{Promise.all(t).then(()=>{r()},n)})}};zs.MultiSpanProcessor=Vc});var zc=l(Xs=>{"use strict";Object.defineProperty(Xs,"__esModule",{value:!0});Xs.NoopSpanProcessor=void 0;var $c=class{onStart(t,r){}onEnd(t){}shutdown(){return Promise.resolve()}forceFlush(){return Promise.resolve()}};Xs.NoopSpanProcessor=$c});var X_=l((Fi,Nn)=>{var Qb=200,P_="__lodash_hash_undefined__",Wb=800,Zb=16,R_=9007199254740991,N_="[object Arguments]",Jb="[object Array]",eO="[object AsyncFunction]",tO="[object Boolean]",rO="[object Date]",nO="[object Error]",D_="[object Function]",iO="[object GeneratorFunction]",aO="[object Map]",sO="[object Number]",oO="[object Null]",w_="[object Object]",uO="[object Proxy]",cO="[object RegExp]",lO="[object Set]",fO="[object String]",pO="[object Undefined]",dO="[object WeakMap]",hO="[object ArrayBuffer]",_O="[object DataView]",vO="[object Float32Array]",gO="[object Float64Array]",EO="[object Int8Array]",mO="[object Int16Array]",yO="[object Int32Array]",TO="[object Uint8Array]",AO="[object Uint8ClampedArray]",SO="[object Uint16Array]",IO="[object Uint32Array]",CO=/[\\^$.*+?()[\]{}|]/g,bO=/^\[object .+?Constructor\]$/,OO=/^(?:0|[1-9]\d*)$/,X={};X[vO]=X[gO]=X[EO]=X[mO]=X[yO]=X[TO]=X[AO]=X[SO]=X[IO]=!0;X[N_]=X[Jb]=X[hO]=X[tO]=X[_O]=X[rO]=X[nO]=X[D_]=X[aO]=X[sO]=X[w_]=X[cO]=X[lO]=X[fO]=X[dO]=!1;var x_=typeof global=="object"&&global&&global.Object===Object&&global,PO=typeof self=="object"&&self&&self.Object===Object&&self,$i=x_||PO||Function("return this")(),M_=typeof Fi=="object"&&Fi&&!Fi.nodeType&&Fi,Gi=M_&&typeof Nn=="object"&&Nn&&!Nn.nodeType&&Nn,L_=Gi&&Gi.exports===M_,Xc=L_&&x_.process,m_=function(){try{var e=Gi&&Gi.require&&Gi.require("util").types;return e||Xc&&Xc.binding&&Xc.binding("util")}catch{}}(),y_=m_&&m_.isTypedArray;function RO(e,t,r){switch(r.length){case 0:return e.call(t);case 1:return e.call(t,r[0]);case 2:return e.call(t,r[0],r[1]);case 3:return e.call(t,r[0],r[1],r[2])}return e.apply(t,r)}function NO(e,t){for(var r=-1,n=Array(e);++r<e;)n[r]=t(r);return n}function DO(e){return function(t){return e(t)}}function wO(e,t){return e==null?void 0:e[t]}function xO(e,t){return function(r){return e(t(r))}}var MO=Array.prototype,LO=Function.prototype,Qs=Object.prototype,Kc=$i["__core-js_shared__"],Ws=LO.toString,Pt=Qs.hasOwnProperty,T_=function(){var e=/[^.]+$/.exec(Kc&&Kc.keys&&Kc.keys.IE_PROTO||"");return e?"Symbol(src)_1."+e:""}(),q_=Qs.toString,qO=Ws.call(Object),jO=RegExp("^"+Ws.call(Pt).replace(CO,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),Ks=L_?$i.Buffer:void 0,A_=$i.Symbol,S_=$i.Uint8Array,I_=Ks?Ks.allocUnsafe:void 0,j_=xO(Object.getPrototypeOf,Object),C_=Object.create,kO=Qs.propertyIsEnumerable,HO=MO.splice,Nr=A_?A_.toStringTag:void 0,Ys=function(){try{var e=el(Object,"defineProperty");return e({},"",{}),e}catch{}}(),UO=Ks?Ks.isBuffer:void 0,b_=Math.max,BO=Date.now,k_=el($i,"Map"),Vi=el(Object,"create"),FO=function(){function e(){}return function(t){if(!wr(t))return{};if(C_)return C_(t);e.prototype=t;var r=new e;return e.prototype=void 0,r}}();function Dr(e){var t=-1,r=e==null?0:e.length;for(this.clear();++t<r;){var n=e[t];this.set(n[0],n[1])}}function GO(){this.__data__=Vi?Vi(null):{},this.size=0}function VO(e){var t=this.has(e)&&delete this.__data__[e];return this.size-=t?1:0,t}function $O(e){var t=this.__data__;if(Vi){var r=t[e];return r===P_?void 0:r}return Pt.call(t,e)?t[e]:void 0}function zO(e){var t=this.__data__;return Vi?t[e]!==void 0:Pt.call(t,e)}function XO(e,t){var r=this.__data__;return this.size+=this.has(e)?0:1,r[e]=Vi&&t===void 0?P_:t,this}Dr.prototype.clear=GO;Dr.prototype.delete=VO;Dr.prototype.get=$O;Dr.prototype.has=zO;Dr.prototype.set=XO;function Rt(e){var t=-1,r=e==null?0:e.length;for(this.clear();++t<r;){var n=e[t];this.set(n[0],n[1])}}function KO(){this.__data__=[],this.size=0}function YO(e){var t=this.__data__,r=Zs(t,e);if(r<0)return!1;var n=t.length-1;return r==n?t.pop():HO.call(t,r,1),--this.size,!0}function QO(e){var t=this.__data__,r=Zs(t,e);return r<0?void 0:t[r][1]}function WO(e){return Zs(this.__data__,e)>-1}function ZO(e,t){var r=this.__data__,n=Zs(r,e);return n<0?(++this.size,r.push([e,t])):r[n][1]=t,this}Rt.prototype.clear=KO;Rt.prototype.delete=YO;Rt.prototype.get=QO;Rt.prototype.has=WO;Rt.prototype.set=ZO;function Dn(e){var t=-1,r=e==null?0:e.length;for(this.clear();++t<r;){var n=e[t];this.set(n[0],n[1])}}function JO(){this.size=0,this.__data__={hash:new Dr,map:new(k_||Rt),string:new Dr}}function e0(e){var t=eo(this,e).delete(e);return this.size-=t?1:0,t}function t0(e){return eo(this,e).get(e)}function r0(e){return eo(this,e).has(e)}function n0(e,t){var r=eo(this,e),n=r.size;return r.set(e,t),this.size+=r.size==n?0:1,this}Dn.prototype.clear=JO;Dn.prototype.delete=e0;Dn.prototype.get=t0;Dn.prototype.has=r0;Dn.prototype.set=n0;function wn(e){var t=this.__data__=new Rt(e);this.size=t.size}function i0(){this.__data__=new Rt,this.size=0}function a0(e){var t=this.__data__,r=t.delete(e);return this.size=t.size,r}function s0(e){return this.__data__.get(e)}function o0(e){return this.__data__.has(e)}function u0(e,t){var r=this.__data__;if(r instanceof Rt){var n=r.__data__;if(!k_||n.length<Qb-1)return n.push([e,t]),this.size=++r.size,this;r=this.__data__=new Dn(n)}return r.set(e,t),this.size=r.size,this}wn.prototype.clear=i0;wn.prototype.delete=a0;wn.prototype.get=s0;wn.prototype.has=o0;wn.prototype.set=u0;function c0(e,t){var r=Zc(e),n=!r&&Wc(e),i=!r&&!n&&F_(e),a=!r&&!n&&!i&&V_(e),s=r||n||i||a,o=s?NO(e.length,String):[],u=o.length;for(var c in e)(t||Pt.call(e,c))&&!(s&&(c=="length"||i&&(c=="offset"||c=="parent")||a&&(c=="buffer"||c=="byteLength"||c=="byteOffset")||U_(c,u)))&&o.push(c);return o}function Yc(e,t,r){(r!==void 0&&!to(e[t],r)||r===void 0&&!(t in e))&&Jc(e,t,r)}function l0(e,t,r){var n=e[t];(!(Pt.call(e,t)&&to(n,r))||r===void 0&&!(t in e))&&Jc(e,t,r)}function Zs(e,t){for(var r=e.length;r--;)if(to(e[r][0],t))return r;return-1}function Jc(e,t,r){t=="__proto__"&&Ys?Ys(e,t,{configurable:!0,enumerable:!0,value:r,writable:!0}):e[t]=r}var f0=I0();function Js(e){return e==null?e===void 0?pO:oO:Nr&&Nr in Object(e)?C0(e):D0(e)}function O_(e){return zi(e)&&Js(e)==N_}function p0(e){if(!wr(e)||R0(e))return!1;var t=rl(e)?jO:bO;return t.test(L0(e))}function d0(e){return zi(e)&&G_(e.length)&&!!X[Js(e)]}function h0(e){if(!wr(e))return N0(e);var t=B_(e),r=[];for(var n in e)n=="constructor"&&(t||!Pt.call(e,n))||r.push(n);return r}function H_(e,t,r,n,i){e!==t&&f0(t,function(a,s){if(i||(i=new wn),wr(a))_0(e,t,s,r,H_,n,i);else{var o=n?n(Qc(e,s),a,s+"",e,t,i):void 0;o===void 0&&(o=a),Yc(e,s,o)}},$_)}function _0(e,t,r,n,i,a,s){var o=Qc(e,r),u=Qc(t,r),c=s.get(u);if(c){Yc(e,r,c);return}var f=a?a(o,u,r+"",e,t,s):void 0,p=f===void 0;if(p){var d=Zc(u),h=!d&&F_(u),E=!d&&!h&&V_(u);f=u,d||h||E?Zc(o)?f=o:q0(o)?f=T0(o):h?(p=!1,f=E0(u,!0)):E?(p=!1,f=y0(u,!0)):f=[]:j0(u)||Wc(u)?(f=o,Wc(o)?f=k0(o):(!wr(o)||rl(o))&&(f=b0(u))):p=!1}p&&(s.set(u,f),i(f,u,n,a,s),s.delete(u)),Yc(e,r,f)}function v0(e,t){return x0(w0(e,t,z_),e+"")}var g0=Ys?function(e,t){return Ys(e,"toString",{configurable:!0,enumerable:!1,value:U0(t),writable:!0})}:z_;function E0(e,t){if(t)return e.slice();var r=e.length,n=I_?I_(r):new e.constructor(r);return e.copy(n),n}function m0(e){var t=new e.constructor(e.byteLength);return new S_(t).set(new S_(e)),t}function y0(e,t){var r=t?m0(e.buffer):e.buffer;return new e.constructor(r,e.byteOffset,e.length)}function T0(e,t){var r=-1,n=e.length;for(t||(t=Array(n));++r<n;)t[r]=e[r];return t}function A0(e,t,r,n){var i=!r;r||(r={});for(var a=-1,s=t.length;++a<s;){var o=t[a],u=n?n(r[o],e[o],o,r,e):void 0;u===void 0&&(u=e[o]),i?Jc(r,o,u):l0(r,o,u)}return r}function S0(e){return v0(function(t,r){var n=-1,i=r.length,a=i>1?r[i-1]:void 0,s=i>2?r[2]:void 0;for(a=e.length>3&&typeof a=="function"?(i--,a):void 0,s&&O0(r[0],r[1],s)&&(a=i<3?void 0:a,i=1),t=Object(t);++n<i;){var o=r[n];o&&e(t,o,n,a)}return t})}function I0(e){return function(t,r,n){for(var i=-1,a=Object(t),s=n(t),o=s.length;o--;){var u=s[e?o:++i];if(r(a[u],u,a)===!1)break}return t}}function eo(e,t){var r=e.__data__;return P0(t)?r[typeof t=="string"?"string":"hash"]:r.map}function el(e,t){var r=wO(e,t);return p0(r)?r:void 0}function C0(e){var t=Pt.call(e,Nr),r=e[Nr];try{e[Nr]=void 0;var n=!0}catch{}var i=q_.call(e);return n&&(t?e[Nr]=r:delete e[Nr]),i}function b0(e){return typeof e.constructor=="function"&&!B_(e)?FO(j_(e)):{}}function U_(e,t){var r=typeof e;return t=t??R_,!!t&&(r=="number"||r!="symbol"&&OO.test(e))&&e>-1&&e%1==0&&e<t}function O0(e,t,r){if(!wr(r))return!1;var n=typeof t;return(n=="number"?tl(r)&&U_(t,r.length):n=="string"&&t in r)?to(r[t],e):!1}function P0(e){var t=typeof e;return t=="string"||t=="number"||t=="symbol"||t=="boolean"?e!=="__proto__":e===null}function R0(e){return!!T_&&T_ in e}function B_(e){var t=e&&e.constructor,r=typeof t=="function"&&t.prototype||Qs;return e===r}function N0(e){var t=[];if(e!=null)for(var r in Object(e))t.push(r);return t}function D0(e){return q_.call(e)}function w0(e,t,r){return t=b_(t===void 0?e.length-1:t,0),function(){for(var n=arguments,i=-1,a=b_(n.length-t,0),s=Array(a);++i<a;)s[i]=n[t+i];i=-1;for(var o=Array(t+1);++i<t;)o[i]=n[i];return o[t]=r(s),RO(e,this,o)}}function Qc(e,t){if(!(t==="constructor"&&typeof e[t]=="function")&&t!="__proto__")return e[t]}var x0=M0(g0);function M0(e){var t=0,r=0;return function(){var n=BO(),i=Zb-(n-r);if(r=n,i>0){if(++t>=Wb)return arguments[0]}else t=0;return e.apply(void 0,arguments)}}function L0(e){if(e!=null){try{return Ws.call(e)}catch{}try{return e+""}catch{}}return""}function to(e,t){return e===t||e!==e&&t!==t}var Wc=O_(function(){return arguments}())?O_:function(e){return zi(e)&&Pt.call(e,"callee")&&!kO.call(e,"callee")},Zc=Array.isArray;function tl(e){return e!=null&&G_(e.length)&&!rl(e)}function q0(e){return zi(e)&&tl(e)}var F_=UO||B0;function rl(e){if(!wr(e))return!1;var t=Js(e);return t==D_||t==iO||t==eO||t==uO}function G_(e){return typeof e=="number"&&e>-1&&e%1==0&&e<=R_}function wr(e){var t=typeof e;return e!=null&&(t=="object"||t=="function")}function zi(e){return e!=null&&typeof e=="object"}function j0(e){if(!zi(e)||Js(e)!=w_)return!1;var t=j_(e);if(t===null)return!0;var r=Pt.call(t,"constructor")&&t.constructor;return typeof r=="function"&&r instanceof r&&Ws.call(r)==qO}var V_=y_?DO(y_):d0;function k0(e){return A0(e,$_(e))}function $_(e){return tl(e)?c0(e,!0):h0(e)}var H0=S0(function(e,t,r){H_(e,t,r)});function U0(e){return function(){return e}}function z_(e){return e}function B0(){return!1}Nn.exports=H0});var Y_=l(ro=>{"use strict";Object.defineProperty(ro,"__esModule",{value:!0});ro.BatchSpanProcessorBase=void 0;var K_=z(),Xi=Xe(),nl=class{constructor(t,r){this._exporter=t,this._finishedSpans=[],this._isShutdown=!1,this._shuttingDownPromise=Promise.resolve();let n=Xi.getEnv();this._maxExportBatchSize=typeof(r==null?void 0:r.maxExportBatchSize)=="number"?r.maxExportBatchSize:n.OTEL_BSP_MAX_EXPORT_BATCH_SIZE,this._maxQueueSize=typeof(r==null?void 0:r.maxQueueSize)=="number"?r.maxQueueSize:n.OTEL_BSP_MAX_QUEUE_SIZE,this._scheduledDelayMillis=typeof(r==null?void 0:r.scheduledDelayMillis)=="number"?r.scheduledDelayMillis:n.OTEL_BSP_SCHEDULE_DELAY,this._exportTimeoutMillis=typeof(r==null?void 0:r.exportTimeoutMillis)=="number"?r.exportTimeoutMillis:n.OTEL_BSP_EXPORT_TIMEOUT}forceFlush(){return this._isShutdown?this._shuttingDownPromise:this._flushAll()}onStart(t){}onEnd(t){this._isShutdown||this._addToBuffer(t)}shutdown(){return this._isShutdown?this._shuttingDownPromise:(this._isShutdown=!0,this._shuttingDownPromise=new Promise((t,r)=>{Promise.resolve().then(()=>this.onShutdown()).then(()=>this._flushAll()).then(()=>this._exporter.shutdown()).then(t).catch(n=>{r(n)})}),this._shuttingDownPromise)}_addToBuffer(t){this._finishedSpans.length>=this._maxQueueSize||(this._finishedSpans.push(t),this._maybeStartTimer())}_flushAll(){return new Promise((t,r)=>{let n=[],i=Math.ceil(this._finishedSpans.length/this._maxExportBatchSize);for(let a=0,s=i;a<s;a++)n.push(this._flushOneBatch());Promise.all(n).then(()=>{t()}).catch(r)})}_flushOneBatch(){return this._clearTimer(),this._finishedSpans.length===0?Promise.resolve():new Promise((t,r)=>{let n=setTimeout(()=>{r(new Error("Timeout"))},this._exportTimeoutMillis);K_.context.with(Xi.suppressTracing(K_.context.active()),()=>{this._exporter.export(this._finishedSpans.splice(0,this._maxExportBatchSize),i=>{var a;clearTimeout(n),i.code===Xi.ExportResultCode.SUCCESS?t():r((a=i.error)!==null&&a!==void 0?a:new Error("BatchSpanProcessor: span export failed"))})})})}_maybeStartTimer(){this._timer===void 0&&(this._timer=setTimeout(()=>{this._flushOneBatch().then(()=>{this._finishedSpans.length>0&&(this._clearTimer(),this._maybeStartTimer())}).catch(t=>{Xi.globalErrorHandler(t)})},this._scheduledDelayMillis),Xi.unrefTimer(this._timer))}_clearTimer(){this._timer!==void 0&&(clearTimeout(this._timer),this._timer=void 0)}};ro.BatchSpanProcessorBase=nl});var Q_=l(no=>{"use strict";Object.defineProperty(no,"__esModule",{value:!0});no.BatchSpanProcessor=void 0;var F0=Y_(),il=class extends F0.BatchSpanProcessorBase{onShutdown(){}};no.BatchSpanProcessor=il});var W_=l(xr=>{"use strict";var G0=xr&&xr.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),V0=xr&&xr.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&G0(t,e,r)};Object.defineProperty(xr,"__esModule",{value:!0});V0(Q_(),xr)});var al=l(Mr=>{"use strict";var $0=Mr&&Mr.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),z0=Mr&&Mr.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&$0(t,e,r)};Object.defineProperty(Mr,"__esModule",{value:!0});z0(W_(),Mr)});var J_=l(Lr=>{"use strict";Object.defineProperty(Lr,"__esModule",{value:!0});Lr.BasicTracerProvider=Lr.ForceFlushState=void 0;var xn=z(),Ki=Xe(),Z_=Fs(),X0=sl(),K0=xc(),Y0=E_(),Q0=zc(),W0=X_(),Z0=al(),Mn;(function(e){e[e.resolved=0]="resolved",e[e.timeout=1]="timeout",e[e.error=2]="error",e[e.unresolved=3]="unresolved"})(Mn=Lr.ForceFlushState||(Lr.ForceFlushState={}));var tr=class{constructor(t={}){var r;this._registeredSpanProcessors=[],this._tracers=new Map;let n=W0({},K0.DEFAULT_CONFIG,t);this.resource=(r=n.resource)!==null&&r!==void 0?r:Z_.Resource.empty(),this.resource=Z_.Resource.default().merge(this.resource),this._config=Object.assign({},n,{resource:this.resource});let i=this._buildExporterFromEnv();if(i!==void 0){let a=new Z0.BatchSpanProcessor(i);this.activeSpanProcessor=a}else this.activeSpanProcessor=new Q0.NoopSpanProcessor}getTracer(t,r){let n=`${t}@${r||""}`;return this._tracers.has(n)||this._tracers.set(n,new X0.Tracer({name:t,version:r},this._config,this)),this._tracers.get(n)}addSpanProcessor(t){this._registeredSpanProcessors.length===0&&this.activeSpanProcessor.shutdown().catch(r=>xn.diag.error("Error while trying to shutdown current span processor",r)),this._registeredSpanProcessors.push(t),this.activeSpanProcessor=new Y0.MultiSpanProcessor(this._registeredSpanProcessors)}getActiveSpanProcessor(){return this.activeSpanProcessor}register(t={}){xn.trace.setGlobalTracerProvider(this),t.propagator===void 0&&(t.propagator=this._buildPropagatorFromEnv()),t.contextManager&&xn.context.setGlobalContextManager(t.contextManager),t.propagator&&xn.propagation.setGlobalPropagator(t.propagator)}forceFlush(){let t=this._config.forceFlushTimeoutMillis,r=this._registeredSpanProcessors.map(n=>new Promise(i=>{let a,s=setTimeout(()=>{i(new Error(`Span processor did not completed within timeout period of ${t} ms`)),a=Mn.timeout},t);n.forceFlush().then(()=>{clearTimeout(s),a!==Mn.timeout&&(a=Mn.resolved,i(a))}).catch(o=>{clearTimeout(s),a=Mn.error,i(o)})}));return new Promise((n,i)=>{Promise.all(r).then(a=>{let s=a.filter(o=>o!==Mn.resolved);s.length>0?i(s):n()}).catch(a=>i([a]))})}shutdown(){return this.activeSpanProcessor.shutdown()}_getPropagator(t){var r;return(r=tr._registeredPropagators.get(t))===null||r===void 0?void 0:r()}_getSpanExporter(t){var r;return(r=tr._registeredExporters.get(t))===null||r===void 0?void 0:r()}_buildPropagatorFromEnv(){let t=Array.from(new Set(Ki.getEnv().OTEL_PROPAGATORS)),n=t.map(i=>{let a=this._getPropagator(i);return a||xn.diag.warn(`Propagator "${i}" requested through environment variable is unavailable.`),a}).reduce((i,a)=>(a&&i.push(a),i),[]);if(n.length!==0)return t.length===1?n[0]:new Ki.CompositePropagator({propagators:n})}_buildExporterFromEnv(){let t=Ki.getEnv().OTEL_TRACES_EXPORTER;if(t==="none")return;let r=this._getSpanExporter(t);return r||xn.diag.error(`Exporter "${t}" requested through environment variable is unavailable.`),r}};Lr.BasicTracerProvider=tr;tr._registeredPropagators=new Map([["tracecontext",()=>new Ki.HttpTraceContextPropagator],["baggage",()=>new Ki.HttpBaggagePropagator]]);tr._registeredExporters=new Map});var ev=l(io=>{"use strict";Object.defineProperty(io,"__esModule",{value:!0});io.ConsoleSpanExporter=void 0;var ol=Xe(),ul=class{export(t,r){return this._sendSpans(t,r)}shutdown(){return this._sendSpans([]),Promise.resolve()}_exportInfo(t){return{traceId:t.spanContext().traceId,parentId:t.parentSpanId,name:t.name,id:t.spanContext().spanId,kind:t.kind,timestamp:ol.hrTimeToMicroseconds(t.startTime),duration:ol.hrTimeToMicroseconds(t.duration),attributes:t.attributes,status:t.status,events:t.events}}_sendSpans(t,r){for(let n of t)console.log(this._exportInfo(n));if(r)return r({code:ol.ExportResultCode.SUCCESS})}};io.ConsoleSpanExporter=ul});var rv=l(ao=>{"use strict";Object.defineProperty(ao,"__esModule",{value:!0});ao.InMemorySpanExporter=void 0;var tv=Xe(),cl=class{constructor(){this._finishedSpans=[],this._stopped=!1}export(t,r){if(this._stopped)return r({code:tv.ExportResultCode.FAILED,error:new Error("Exporter has been stopped")});this._finishedSpans.push(...t),setTimeout(()=>r({code:tv.ExportResultCode.SUCCESS}),0)}shutdown(){return this._stopped=!0,this._finishedSpans=[],Promise.resolve()}reset(){this._finishedSpans=[]}getFinishedSpans(){return this._finishedSpans}};ao.InMemorySpanExporter=cl});var iv=l(nv=>{"use strict";Object.defineProperty(nv,"__esModule",{value:!0})});var sv=l(so=>{"use strict";Object.defineProperty(so,"__esModule",{value:!0});so.SimpleSpanProcessor=void 0;var av=z(),ll=Xe(),fl=class{constructor(t){this._exporter=t,this._isShutdown=!1,this._shuttingDownPromise=Promise.resolve()}forceFlush(){return Promise.resolve()}onStart(t){}onEnd(t){this._isShutdown||av.context.with(ll.suppressTracing(av.context.active()),()=>{this._exporter.export([t],r=>{var n;r.code!==ll.ExportResultCode.SUCCESS&&ll.globalErrorHandler((n=r.error)!==null&&n!==void 0?n:new Error(`SimpleSpanProcessor: span export failed (status ${r})`))})})}shutdown(){return this._isShutdown?this._shuttingDownPromise:(this._isShutdown=!0,this._shuttingDownPromise=new Promise((t,r)=>{Promise.resolve().then(()=>this._exporter.shutdown()).then(t).catch(n=>{r(n)})}),this._shuttingDownPromise)}};so.SimpleSpanProcessor=fl});var uv=l(ov=>{"use strict";Object.defineProperty(ov,"__esModule",{value:!0})});var lv=l(cv=>{"use strict";Object.defineProperty(cv,"__esModule",{value:!0})});var pv=l(fv=>{"use strict";Object.defineProperty(fv,"__esModule",{value:!0})});var hv=l(dv=>{"use strict";Object.defineProperty(dv,"__esModule",{value:!0})});var sl=l(de=>{"use strict";var J0=de&&de.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),He=de&&de.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&J0(t,e,r)};Object.defineProperty(de,"__esModule",{value:!0});He(i_(),de);He(J_(),de);He(al(),de);He(ev(),de);He(rv(),de);He(iv(),de);He(sv(),de);He(uv(),de);He(zc(),de);He(wc(),de);He(lv(),de);He(pv(),de);He(hv(),de)});var gv=l(dt=>{"use strict";Object.defineProperty(dt,"__esModule",{value:!0});dt.enable=dt.azureCoreTracing=dt.AzureMonitorSymbol=void 0;var vv=oe();dt.AzureMonitorSymbol="Azure_Monitor_Tracer";var _v=!1,eP=function(e){if(_v)return e;try{var t=sl(),r=z(),n=new t.BasicTracerProvider,i=n.getTracer("applicationinsights tracer"),a=e.setTracer;e.setTracer=function(s){var o=s.startSpan;s.startSpan=function(u,c,f){var p=o.call(this,u,c,f),d=p.end;return p.end=function(){var h=d.apply(this,arguments);return vv.channel.publish("azure-coretracing",p),h},p},s[dt.AzureMonitorSymbol]=!0,a.call(this,s)},r.trace.getSpan(r.context.active()),e.setTracer(i),_v=!0}catch{}return e};dt.azureCoreTracing={versionSpecifier:">= 1.0.0 < 2.0.0",patch:eP};function tP(){vv.channel.registerMonkeyPatch("@azure/core-tracing",dt.azureCoreTracing)}dt.enable=tP});var mv=l(qr=>{"use strict";Object.defineProperty(qr,"__esModule",{value:!0});qr.enable=qr.bunyan=void 0;var Ev=oe(),rP=function(e){var t=e.prototype._emit;return e.prototype._emit=function(r,n){var i=t.apply(this,arguments);if(!n){var a=i;a||(a=t.call(this,r,!0)),Ev.channel.publish("bunyan",{level:r.level,result:a})}return i},e};qr.bunyan={versionSpecifier:">= 1.0.0 < 2.0.0",patch:rP};function nP(){Ev.channel.registerMonkeyPatch("bunyan",qr.bunyan)}qr.enable=nP});var Tv=l(jr=>{"use strict";Object.defineProperty(jr,"__esModule",{value:!0});jr.enable=jr.console=void 0;var pl=oe(),yv=__webpack_require__(27),iP=function(e){var t=new yv.Writable,r=new yv.Writable;t.write=function(c){if(!c)return!0;var f=c.toString();return pl.channel.publish("console",{message:f}),!0},r.write=function(c){if(!c)return!0;var f=c.toString();return pl.channel.publish("console",{message:f,stderr:!0}),!0};for(var n=new e.Console(t,r),i=["log","info","warn","error","dir","time","timeEnd","trace","assert"],a=function(c){var f=e[c];f&&(e[c]=function(){if(n[c])try{n[c].apply(n,arguments)}catch{}return f.apply(e,arguments)})},s=0,o=i;s<o.length;s++){var u=o[s];a(u)}return e};jr.console={versionSpecifier:">= 4.0.0",patch:iP};function aP(){pl.channel.registerMonkeyPatch("console",jr.console),__webpack_require__(28)}jr.enable=aP});var Av=l(kr=>{"use strict";Object.defineProperty(kr,"__esModule",{value:!0});kr.enable=kr.mongoCore=void 0;var dl=oe(),sP=function(e){var t=e.Server.prototype.connect;return e.Server.prototype.connect=function(){var n=t.apply(this,arguments),i=this.s.pool.write;this.s.pool.write=function(){var o=typeof arguments[1]=="function"?1:2;return typeof arguments[o]=="function"&&(arguments[o]=dl.channel.bindToContext(arguments[o])),i.apply(this,arguments)};var a=this.s.pool.logout;return this.s.pool.logout=function(){return typeof arguments[1]=="function"&&(arguments[1]=dl.channel.bindToContext(arguments[1])),a.apply(this,arguments)},n},e};kr.mongoCore={versionSpecifier:">= 2.0.0 < 4.0.0",patch:sP};function oP(){dl.channel.registerMonkeyPatch("mongodb-core",kr.mongoCore)}kr.enable=oP});var Sv=l(Ne=>{"use strict";var Ln=Ne&&Ne.__assign||function(){return Ln=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},Ln.apply(this,arguments)};Object.defineProperty(Ne,"__esModule",{value:!0});Ne.enable=Ne.mongo330=Ne.mongo3=Ne.mongo2=void 0;var be=oe(),uP=function(e){var t=e.instrument({operationIdGenerator:{next:function(){return be.channel.bindToContext(function(n){return n()})}}}),r={};return t.on("started",function(n){r[n.requestId]||(r[n.requestId]=Ln(Ln({},n),{time:new Date}))}),t.on("succeeded",function(n){var i=r[n.requestId];i&&delete r[n.requestId],typeof n.operationId=="function"?n.operationId(function(){return be.channel.publish("mongodb",{startedData:i,event:n,succeeded:!0})}):be.channel.publish("mongodb",{startedData:i,event:n,succeeded:!0})}),t.on("failed",function(n){var i=r[n.requestId];i&&delete r[n.requestId],typeof n.operationId=="function"?n.operationId(function(){return be.channel.publish("mongodb",{startedData:i,event:n,succeeded:!1})}):be.channel.publish("mongodb",{startedData:i,event:n,succeeded:!1})}),e},cP=function(e){var t=e.instrument(),r={},n={};return t.on("started",function(i){r[i.requestId]||(n[i.requestId]=be.channel.bindToContext(function(a){return a()}),r[i.requestId]=Ln(Ln({},i),{time:new Date}))}),t.on("succeeded",function(i){var a=r[i.requestId];a&&delete r[i.requestId],typeof i=="object"&&typeof n[i.requestId]=="function"&&(n[i.requestId](function(){return be.channel.publish("mongodb",{startedData:a,event:i,succeeded:!0})}),delete n[i.requestId])}),t.on("failed",function(i){var a=r[i.requestId];a&&delete r[i.requestId],typeof i=="object"&&typeof n[i.requestId]=="function"&&(n[i.requestId](function(){return be.channel.publish("mongodb",{startedData:a,event:i,succeeded:!1})}),delete n[i.requestId])}),e},lP=function(e){var t=e.Server.prototype.connect;return e.Server.prototype.connect=function(){var n=t.apply(this,arguments),i=this.s.coreTopology.s.pool.write;this.s.coreTopology.s.pool.write=function(){var o=typeof arguments[1]=="function"?1:2;return typeof arguments[o]=="function"&&(arguments[o]=be.channel.bindToContext(arguments[o])),i.apply(this,arguments)};var a=this.s.coreTopology.s.pool.logout;return this.s.coreTopology.s.pool.logout=function(){return typeof arguments[1]=="function"&&(arguments[1]=be.channel.bindToContext(arguments[1])),a.apply(this,arguments)},n},e},fP=function(e){lP(e);var t=e.instrument(),r={},n={};return t.on("started",function(i){r[i.requestId]||(n[i.requestId]=be.channel.bindToContext(function(a){return a()}),r[i.requestId]=i)}),t.on("succeeded",function(i){var a=r[i.requestId];a&&delete r[i.requestId],typeof i=="object"&&typeof n[i.requestId]=="function"&&(n[i.requestId](function(){return be.channel.publish("mongodb",{startedData:a,event:i,succeeded:!0})}),delete n[i.requestId])}),t.on("failed",function(i){var a=r[i.requestId];a&&delete r[i.requestId],typeof i=="object"&&typeof n[i.requestId]=="function"&&(n[i.requestId](function(){return be.channel.publish("mongodb",{startedData:a,event:i,succeeded:!1})}),delete n[i.requestId])}),e};Ne.mongo2={versionSpecifier:">= 2.0.0 <= 3.0.5",patch:uP};Ne.mongo3={versionSpecifier:"> 3.0.5 < 3.3.0",patch:cP};Ne.mongo330={versionSpecifier:">= 3.3.0 < 4.0.0",patch:fP};function pP(){be.channel.registerMonkeyPatch("mongodb",Ne.mongo2),be.channel.registerMonkeyPatch("mongodb",Ne.mongo3),be.channel.registerMonkeyPatch("mongodb",Ne.mongo330)}Ne.enable=pP});var Cv=l(Hr=>{"use strict";Object.defineProperty(Hr,"__esModule",{value:!0});Hr.enable=Hr.mysql=void 0;var oo=oe(),Iv=__webpack_require__(22),dP=function(e,t){var r=function(u,c){return function(f,p){var d=u[f];d&&(u[f]=function(){for(var E=arguments.length-1,A=arguments.length-1;A>=0;--A)if(typeof arguments[A]=="function"){E=A;break}else if(typeof arguments[A]<"u")break;var j=arguments[E],se={result:null,startTime:null,startDate:null};typeof j=="function"&&(p?(se.startTime=process.hrtime(),se.startDate=new Date,arguments[E]=oo.channel.bindToContext(p(se,j))):arguments[E]=oo.channel.bindToContext(j));var Ae=d.apply(this,arguments);return se.result=Ae,Ae})}},n=function(u,c){return r(u.prototype,c+".prototype")},i=["connect","changeUser","ping","statistics","end"],a=__webpack_require__(29)(Iv.dirname(t)+"/lib/Connection");i.forEach(function(u){return n(a,"Connection")(u)}),r(a,"Connection")("createQuery",function(u,c){return function(f){var p=process.hrtime(u.startTime),d=p[0]*1e3+p[1]/1e6|0;oo.channel.publish("mysql",{query:u.result,callbackArgs:arguments,err:f,duration:d,time:u.startDate}),c.apply(this,arguments)}});var s=["_enqueueCallback"],o=__webpack_require__(30)(Iv.dirname(t)+"/lib/Pool");return s.forEach(function(u){return n(o,"Pool")(u)}),e};Hr.mysql={versionSpecifier:">= 2.0.0 < 3.0.0",patch:dP};function hP(){oo.channel.registerMonkeyPatch("mysql",Hr.mysql)}Hr.enable=hP});var Ov=l(Ur=>{"use strict";Object.defineProperty(Ur,"__esModule",{value:!0});Ur.enable=Ur.postgresPool1=void 0;var bv=oe();function _P(e){var t=e.prototype.connect;return e.prototype.connect=function(n){return n&&(arguments[0]=bv.channel.bindToContext(n)),t.apply(this,arguments)},e}Ur.postgresPool1={versionSpecifier:">= 1.0.0 < 3.0.0",patch:_P};function vP(){bv.channel.registerMonkeyPatch("pg-pool",Ur.postgresPool1)}Ur.enable=vP});var Rv=l(ht=>{"use strict";Object.defineProperty(ht,"__esModule",{value:!0});ht.enable=ht.postgres7=ht.postgres6=void 0;var qn=oe(),Pv=__webpack_require__(21);function gP(e,t){var r=e.Client.prototype.query,n="__diagnosticOriginalFunc";return e.Client.prototype.query=function(a,s,o){var u={query:{},database:{host:this.connectionParameters.host,port:this.connectionParameters.port},result:null,error:null,duration:0,time:new Date},c=process.hrtime(),f;function p(d){d&&d[n]&&(d=d[n]);var h=qn.channel.bindToContext(function(E,A){var j=process.hrtime(c);if(u.result=A&&{rowCount:A.rowCount,command:A.command},u.error=E,u.duration=Math.ceil(j[0]*1e3+j[1]/1e6),qn.channel.publish("postgres",u),E){if(d)return d.apply(this,arguments);f&&f instanceof Pv.EventEmitter&&f.emit("error",E)}else d&&d.apply(this,arguments)});try{return Object.defineProperty(h,n,{value:d}),h}catch{return d}}try{typeof a=="string"?s instanceof Array?(u.query.preparable={text:a,args:s},o=p(o)):(u.query.text=a,o?o=p(o):s=p(s)):(typeof a.name=="string"?u.query.plan=a.name:a.values instanceof Array?u.query.preparable={text:a.text,args:a.values}:u.query.text=a.text,o?o=p(o):s?s=p(s):a.callback=p(a.callback))}catch{return r.apply(this,arguments)}return arguments[0]=a,arguments[1]=s,arguments[2]=o,arguments.length=arguments.length>3?arguments.length:3,f=r.apply(this,arguments),f},e}function EP(e,t){var r=e.Client.prototype.query,n="__diagnosticOriginalFunc";return e.Client.prototype.query=function(a,s,o){var u=this,c=!!o,f={query:{},database:{host:this.connectionParameters.host,port:this.connectionParameters.port},result:null,error:null,duration:0,time:new Date},p=process.hrtime(),d;function h(E){E&&E[n]&&(E=E[n]);var A=qn.channel.bindToContext(function(j,se){var Ae=process.hrtime(p);if(f.result=se&&{rowCount:se.rowCount,command:se.command},f.error=j,f.duration=Math.ceil(Ae[0]*1e3+Ae[1]/1e6),qn.channel.publish("postgres",f),j){if(E)return E.apply(this,arguments);d&&d instanceof Pv.EventEmitter&&d.emit("error",j)}else E&&E.apply(this,arguments)});try{return Object.defineProperty(A,n,{value:E}),A}catch{return E}}try{typeof a=="string"?s instanceof Array?(f.query.preparable={text:a,args:s},c=typeof o=="function",o=c?h(o):o):(f.query.text=a,o?(c=typeof o=="function",o=c?h(o):o):(c=typeof s=="function",s=c?h(s):s)):(typeof a.name=="string"?f.query.plan=a.name:a.values instanceof Array?f.query.preparable={text:a.text,args:a.values}:f.query.text=a.text,o?(c=typeof o=="function",o=h(o)):s?(c=typeof s=="function",s=c?h(s):s):(c=typeof a.callback=="function",a.callback=c?h(a.callback):a.callback))}catch{return r.apply(this,arguments)}return arguments[0]=a,arguments[1]=s,arguments[2]=o,arguments.length=arguments.length>3?arguments.length:3,d=r.apply(this,arguments),c?d:d.then(function(E){return h()(void 0,E),new u._Promise(function(A,j){A(E)})}).catch(function(E){return h()(E,void 0),new u._Promise(function(A,j){j(E)})})},e}ht.postgres6={versionSpecifier:"6.*",patch:gP};ht.postgres7={versionSpecifier:">=7.* <=8.*",patch:EP};function mP(){qn.channel.registerMonkeyPatch("pg",ht.postgres6),qn.channel.registerMonkeyPatch("pg",ht.postgres7)}ht.enable=mP});var Nv=l(Br=>{"use strict";Object.defineProperty(Br,"__esModule",{value:!0});Br.enable=Br.redis=void 0;var hl=oe(),yP=function(e){var t=e.RedisClient.prototype.internal_send_command;return e.RedisClient.prototype.internal_send_command=function(r){if(r){var n=r.callback;if(!n||!n.pubsubBound){var i=this.address,a=process.hrtime(),s=new Date;r.callback=hl.channel.bindToContext(function(o,u){var c=process.hrtime(a),f=c[0]*1e3+c[1]/1e6|0;hl.channel.publish("redis",{duration:f,address:i,commandObj:r,err:o,result:u,time:s}),typeof n=="function"&&n.apply(this,arguments)}),r.callback.pubsubBound=!0}}return t.call(this,r)},e};Br.redis={versionSpecifier:">= 2.0.0 < 4.0.0",patch:yP};function TP(){hl.channel.registerMonkeyPatch("redis",Br.redis)}Br.enable=TP});var Dv=l(Nt=>{"use strict";var uo=Nt&&Nt.__assign||function(){return uo=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},uo.apply(this,arguments)};Object.defineProperty(Nt,"__esModule",{value:!0});Nt.enable=Nt.tedious=void 0;var _l=oe(),AP=function(e){var t=e.Connection.prototype.makeRequest;return e.Connection.prototype.makeRequest=function(){function n(a){var s=process.hrtime(),o={query:{},database:{host:null,port:null},result:null,error:null,duration:0};return _l.channel.bindToContext(function(u,c,f){var p=process.hrtime(s);o=uo(uo({},o),{database:{host:this.connection.config.server,port:this.connection.config.options.port},result:!u&&{rowCount:c,rows:f},query:{text:this.parametersByName.statement.value},error:u,duration:Math.ceil(p[0]*1e3+p[1]/1e6)}),_l.channel.publish("tedious",o),a.call(this,u,c,f)})}var i=arguments[0];arguments[0].callback=n(i.callback),t.apply(this,arguments)},e};Nt.tedious={versionSpecifier:">= 6.0.0 < 9.0.0",patch:AP};function SP(){_l.channel.registerMonkeyPatch("tedious",Nt.tedious)}Nt.enable=SP});var wv=l(Le=>{"use strict";var IP=Le&&Le.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),CP=Le&&Le.__rest||function(e,t){var r={};for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&t.indexOf(n)<0&&(r[n]=e[n]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,n=Object.getOwnPropertySymbols(e);i<n.length;i++)t.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(e,n[i])&&(r[n[i]]=e[n[i]]);return r};Object.defineProperty(Le,"__esModule",{value:!0});Le.enable=Le.winston2=Le.winston3=void 0;var co=oe(),bP=function(e){var t=e.Logger.prototype.log,r,n=function(i,a,s){var o;return r===e.config.npm.levels?o="npm":r===e.config.syslog.levels?o="syslog":o="unknown",co.channel.publish("winston",{level:i,message:a,meta:s,levelKind:o}),a};return e.Logger.prototype.log=function(){return r=this.levels,!this.filters||this.filters.length===0?this.filters=[n]:this.filters[this.filters.length-1]!==n&&(this.filters=this.filters.filter(function(a){return a!==n}),this.filters.push(n)),t.apply(this,arguments)},e},OP=function(e){var t=function(s,o){var u;return s.config.npm.levels[o]!=null?u="npm":s.config.syslog.levels[o]!=null?u="syslog":u="unknown",u},r=function(s){IP(o,s);function o(u,c){var f=s.call(this,c)||this;return f.winston=u,f}return o.prototype.log=function(u,c){var f=u.message,p=u.level,d=u.meta,h=CP(u,["message","level","meta"]);p=typeof Symbol.for=="function"?u[Symbol.for("level")]:p,f=u instanceof Error?u:f;var E=t(this.winston,p);d=d||{};for(var A in h)h.hasOwnProperty(A)&&(d[A]=h[A]);co.channel.publish("winston",{message:f,level:p,levelKind:E,meta:d}),c()},o}(e.Transport);function n(){var s=arguments[0].levels||e.config.npm.levels,o;for(var u in s)s.hasOwnProperty(u)&&(o=o===void 0||s[u]>s[o]?u:o);this.add(new r(e,{level:o}))}var i=e.createLogger;e.createLogger=function(){var o=arguments[0].levels||e.config.npm.levels,u;for(var c in o)o.hasOwnProperty(c)&&(u=u===void 0||o[c]>o[u]?c:u);var f=i.apply(this,arguments);f.add(new r(e,{level:u}));var p=f.configure;return f.configure=function(){p.apply(this,arguments),n.apply(this,arguments)},f};var a=e.configure;return e.configure=function(){a.apply(this,arguments),n.apply(this,arguments)},e.add(new r(e)),e};Le.winston3={versionSpecifier:"3.x",patch:OP};Le.winston2={versionSpecifier:"2.x",patch:bP};function PP(){co.channel.registerMonkeyPatch("winston",Le.winston2),co.channel.registerMonkeyPatch("winston",Le.winston3)}Le.enable=PP});var Vv=l($=>{"use strict";Object.defineProperty($,"__esModule",{value:!0});$.enable=$.tedious=$.pgPool=$.pg=$.winston=$.redis=$.mysql=$.mongodb=$.mongodbCore=$.console=$.bunyan=$.azuresdk=void 0;var xv=gv();$.azuresdk=xv;var Mv=mv();$.bunyan=Mv;var Lv=Tv();$.console=Lv;var qv=Av();$.mongodbCore=qv;var jv=Sv();$.mongodb=jv;var kv=Cv();$.mysql=kv;var Hv=Ov();$.pgPool=Hv;var Uv=Rv();$.pg=Uv;var Bv=Nv();$.redis=Bv;var Fv=Dv();$.tedious=Fv;var Gv=wv();$.winston=Gv;function RP(){Mv.enable(),Lv.enable(),qv.enable(),jv.enable(),kv.enable(),Uv.enable(),Hv.enable(),Bv.enable(),Gv.enable(),xv.enable(),Fv.enable()}$.enable=RP});var po=l(rr=>{"use strict";Object.defineProperty(rr,"__esModule",{value:!0});rr.registerContextPreservation=rr.IsInitialized=void 0;var NP=vu(),vl=_e();rr.IsInitialized=!process.env.APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL;var gl="DiagnosticChannel";if(rr.IsInitialized){it=Vv(),$v=process.env.APPLICATION_INSIGHTS_NO_PATCH_MODULES||"",lo=$v.split(","),El={bunyan:it.bunyan,console:it.console,mongodb:it.mongodb,mongodbCore:it.mongodbCore,mysql:it.mysql,redis:it.redis,pg:it.pg,pgPool:it.pgPool,winston:it.winston,azuresdk:it.azuresdk};for(fo in El)lo.indexOf(fo)===-1&&(El[fo].enable(),vl.info(gl,"Subscribed to "+fo+" events"));lo.length>0&&vl.info(gl,"Some modules will not be patched",lo)}else vl.info(gl,"Not subscribing to dependency autocollection because APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL was set");var it,$v,lo,El,fo;function DP(e){if(!!rr.IsInitialized){var t=oe();t.channel.addContextPreservation(e),t.channel.spanContextPropagator=NP.AsyncScopeManager}}rr.registerContextPreservation=DP});var jn=l((Nq,zv)=>{"use strict";zv.exports={requestContextHeader:"request-context",requestContextSourceKey:"appId",requestContextTargetKey:"appId",requestIdHeader:"request-id",parentIdHeader:"x-ms-request-id",rootIdHeader:"x-ms-request-root-id",correlationContextHeader:"correlation-context",traceparentHeader:"traceparent",traceStateHeader:"tracestate"}});var Ue=l((yl,Kv)=>{"use strict";var nr=yl&&yl.__assign||function(){return nr=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},nr.apply(this,arguments)},wP=__webpack_require__(31),Xv=__webpack_require__(32),ml=__webpack_require__(33),ho=__webpack_require__(34),Yi=_e(),kn=jn(),xP=function(){function e(){}return e.getCookie=function(t,r){var n="";if(t&&t.length&&typeof r=="string")for(var i=t+"=",a=r.split(";"),s=0;s<a.length;s++){var r=a[s];if(r=e.trim(r),r&&r.indexOf(i)===0){n=r.substring(i.length,a[s].length);break}}return n},e.trim=function(t){return typeof t=="string"?t.replace(/^\s+|\s+$/g,""):""},e.int32ArrayToBase64=function(t){var r=function(o,u){return String.fromCharCode(o>>u&255)},n=function(o){return r(o,24)+r(o,16)+r(o,8)+r(o,0)},i=t.map(n).join(""),a=Buffer.from?Buffer.from(i,"binary"):new Buffer(i,"binary"),s=a.toString("base64");return s.substr(0,s.indexOf("="))},e.random32=function(){return 4294967296*Math.random()|0},e.randomu32=function(){return e.random32()+2147483648},e.w3cTraceId=function(){for(var t=["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"],r="",n,i=0;i<4;i++)n=e.random32(),r+=t[n&15]+t[n>>4&15]+t[n>>8&15]+t[n>>12&15]+t[n>>16&15]+t[n>>20&15]+t[n>>24&15]+t[n>>28&15];var a=t[8+Math.random()*4|0];return r.substr(0,8)+r.substr(9,4)+"4"+r.substr(13,3)+a+r.substr(16,3)+r.substr(19,12)},e.w3cSpanId=function(){return e.w3cTraceId().substring(16)},e.isValidW3CId=function(t){return t.length===32&&t!=="00000000000000000000000000000000"},e.isArray=function(t){return Object.prototype.toString.call(t)==="[object Array]"},e.isError=function(t){return t instanceof Error},e.isPrimitive=function(t){var r=typeof t;return r==="string"||r==="number"||r==="boolean"},e.isDate=function(t){return Object.prototype.toString.call(t)==="[object Date]"},e.msToTimeSpan=function(t){(isNaN(t)||t<0)&&(t=0);var r=(t/1e3%60).toFixed(7).replace(/0{0,4}$/,""),n=""+Math.floor(t/(1e3*60))%60,i=""+Math.floor(t/(1e3*60*60))%24,a=Math.floor(t/(1e3*60*60*24));r=r.indexOf(".")<2?"0"+r:r,n=n.length<2?"0"+n:n,i=i.length<2?"0"+i:i;var s=a>0?a+".":"";return s+i+":"+n+":"+r},e.extractError=function(t){var r=t;return{message:t.message,code:r.code||r.id||""}},e.extractObject=function(t){return t instanceof Error?e.extractError(t):typeof t.toJSON=="function"?t.toJSON():t},e.validateStringMap=function(t){if(typeof t!="object"){Yi.info("Invalid properties dropped from payload");return}var r={};for(var n in t){var i="",a=t[n],s=typeof a;if(e.isPrimitive(a))i=a.toString();else if(a===null||s==="undefined")i="";else if(s==="function"){Yi.info("key: "+n+" was function; will not serialize");continue}else{var o=e.isArray(a)?a:e.extractObject(a);try{e.isPrimitive(o)?i=o:i=JSON.stringify(o)}catch(u){i=a.constructor.name.toString()+" (Error: "+u.message+")",Yi.info("key: "+n+", could not be serialized")}}r[n]=i.substring(0,e.MAX_PROPERTY_LENGTH)}return r},e.canIncludeCorrelationHeader=function(t,r){var n=t&&t.config&&t.config.correlationHeaderExcludedDomains;if(!n||n.length==0||!r)return!0;for(var i=0;i<n.length;i++){var a=new RegExp(n[i].replace(/\./g,".").replace(/\*/g,".*"));if(a.test(ml.parse(r).hostname))return!1}return!0},e.getCorrelationContextTarget=function(t,r){var n=t.headers&&t.headers[kn.requestContextHeader];if(n)for(var i=n.split(","),a=0;a<i.length;++a){var s=i[a].split("=");if(s.length==2&&s[0]==r)return s[1]}},e.makeRequest=function(t,r,n,i){r&&r.indexOf("//")===0&&(r="https:"+r);var a=ml.parse(r),s=nr(nr({},n),{host:a.hostname,port:a.port,path:a.pathname}),o=void 0;if(a.protocol==="https:"&&(o=t.proxyHttpsUrl||void 0),a.protocol==="http:"&&(o=t.proxyHttpUrl||void 0),o){o.indexOf("//")===0&&(o="http:"+o);var u=ml.parse(o);u.protocol==="https:"?(Yi.info("Proxies that use HTTPS are not supported"),o=void 0):s=nr(nr({},s),{host:u.hostname,port:u.port||"80",path:r,headers:nr(nr({},s.headers),{Host:a.hostname})})}var c=a.protocol==="https:"&&!o;return c&&t.httpsAgent!==void 0?s.agent=t.httpsAgent:!c&&t.httpAgent!==void 0?s.agent=t.httpAgent:c&&(s.agent=e.tlsRestrictedAgent),c?Xv.request(s,i):wP.request(s,i)},e.safeIncludeCorrelationHeader=function(t,r,n){var i;if(typeof n=="string")i=n;else if(n instanceof Array)i=n.join(",");else if(n&&typeof n.toString=="function")try{i=n.toString()}catch(a){Yi.warn("Outgoing request-context header could not be read. Correlation of requests may be lost.",a,n)}i?e.addCorrelationIdHeaderFromString(t,r,i):r.setHeader(kn.requestContextHeader,kn.requestContextSourceKey+"="+t.config.correlationId)},e.dumpObj=function(t){var r=Object.prototype.toString.call(t),n="";return r==="[object Error]"?n="{ stack: '"+t.stack+"', message: '"+t.message+"', name: '"+t.name+"'":n=JSON.stringify(t),r+n},e.addCorrelationIdHeaderFromString=function(t,r,n){var i=n.split(","),a=kn.requestContextSourceKey+"=",s=i.some(function(o){return o.substring(0,a.length)===a});s||r.setHeader(kn.requestContextHeader,n+","+kn.requestContextSourceKey+"="+t.config.correlationId)},e.MAX_PROPERTY_LENGTH=8192,e.tlsRestrictedAgent=new Xv.Agent({keepAlive:!0,maxSockets:25,secureOptions:ho.SSL_OP_NO_SSLv2|ho.SSL_OP_NO_SSLv3|ho.SSL_OP_NO_TLSv1|ho.SSL_OP_NO_TLSv1_1}),e}();Kv.exports=xP});var Fr=l((Dq,Yv)=>{"use strict";var _o=Ue(),Tl=_e(),MP=function(){function e(){}return e.queryCorrelationId=function(t,r){var n=t.profileQueryEndpoint+"/api/profiles/"+t.instrumentationKey+"/appId";if(e.completedLookups.hasOwnProperty(n)){r(e.completedLookups[n]);return}else if(e.pendingLookups[n]){e.pendingLookups[n].push(r);return}e.pendingLookups[n]=[r];var i=function(){if(!!e.pendingLookups[n]){var a={method:"GET",disableAppInsightsAutoCollection:!0};Tl.info(e.TAG,a);var s=_o.makeRequest(t,n,a,function(o){if(o.statusCode===200){var u="";o.setEncoding("utf-8"),o.on("data",function(c){u+=c}),o.on("end",function(){Tl.info(e.TAG,u);var c=e.correlationIdPrefix+u;e.completedLookups[n]=c,e.pendingLookups[n]&&e.pendingLookups[n].forEach(function(f){return f(c)}),delete e.pendingLookups[n]})}else o.statusCode>=400&&o.statusCode<500?(e.completedLookups[n]=void 0,delete e.pendingLookups[n]):setTimeout(i,t.correlationIdRetryIntervalMs)});s&&(s.on("error",function(o){Tl.warn(e.TAG,o)}),s.end())}};setTimeout(i,0)},e.cancelCorrelationIdQuery=function(t,r){var n=t.profileQueryEndpoint+"/api/profiles/"+t.instrumentationKey+"/appId",i=e.pendingLookups[n];i&&(e.pendingLookups[n]=i.filter(function(a){return a!=r}),e.pendingLookups[n].length==0&&delete e.pendingLookups[n])},e.generateRequestId=function(t){if(t){t=t[0]=="|"?t:"|"+t,t[t.length-1]!=="."&&(t+=".");var r=(e.currentRootId++).toString(16);return e.appendSuffix(t,r,"_")}else return e.generateRootId()},e.getRootId=function(t){var r=t.indexOf(".");r<0&&(r=t.length);var n=t[0]==="|"?1:0;return t.substring(n,r)},e.generateRootId=function(){return"|"+_o.w3cTraceId()+"."},e.appendSuffix=function(t,r,n){if(t.length+r.length<e.requestIdMaxLength)return t+r+n;var i=e.requestIdMaxLength-9;if(t.length>i)for(;i>1;--i){var a=t[i-1];if(a==="."||a==="_")break}if(i<=1)return e.generateRootId();for(r=_o.randomu32().toString(16);r.length<8;)r="0"+r;return t.substring(0,i)+r+"#"},e.TAG="CorrelationIdManager",e.correlationIdPrefix="cid-v1:",e.w3cEnabled=!0,e.pendingLookups={},e.completedLookups={},e.requestIdMaxLength=1024,e.currentRootId=_o.randomu32(),e}();Yv.exports=MP});var Qi=l((wq,Qv)=>{"use strict";var me=Ue(),LP=Fr(),qP=function(){function e(t,r){if(this.traceFlag=e.DEFAULT_TRACE_FLAG,this.version=e.DEFAULT_VERSION,t&&typeof t=="string")if(t.split(",").length>1)this.traceId=me.w3cTraceId(),this.spanId=me.w3cTraceId().substr(0,16);else{var n=t.trim().split("-"),i=n.length;i>=4?(this.version=n[0],this.traceId=n[1],this.spanId=n[2],this.traceFlag=n[3]):(this.traceId=me.w3cTraceId(),this.spanId=me.w3cTraceId().substr(0,16)),this.version.match(/^[0-9a-f]{2}$/g)||(this.version=e.DEFAULT_VERSION,this.traceId=me.w3cTraceId()),this.version==="00"&&i!==4&&(this.traceId=me.w3cTraceId(),this.spanId=me.w3cTraceId().substr(0,16)),this.version==="ff"&&(this.version=e.DEFAULT_VERSION,this.traceId=me.w3cTraceId(),this.spanId=me.w3cTraceId().substr(0,16)),this.version.match(/^0[0-9a-f]$/g)||(this.version=e.DEFAULT_VERSION),this.traceFlag.match(/^[0-9a-f]{2}$/g)||(this.traceFlag=e.DEFAULT_TRACE_FLAG,this.traceId=me.w3cTraceId()),e.isValidTraceId(this.traceId)||(this.traceId=me.w3cTraceId()),e.isValidSpanId(this.spanId)||(this.spanId=me.w3cTraceId().substr(0,16),this.traceId=me.w3cTraceId()),this.parentId=this.getBackCompatRequestId()}else if(r){this.parentId=r.slice();var a=LP.getRootId(r);e.isValidTraceId(a)||(this.legacyRootId=a,a=me.w3cTraceId()),r.indexOf("|")!==-1&&(r=r.substring(1+r.substring(0,r.length-1).lastIndexOf("."),r.length-1)),this.traceId=a,this.spanId=r}else this.traceId=me.w3cTraceId(),this.spanId=me.w3cTraceId().substr(0,16)}return e.isValidTraceId=function(t){return t.match(/^[0-9a-f]{32}$/)&&t!=="00000000000000000000000000000000"},e.isValidSpanId=function(t){return t.match(/^[0-9a-f]{16}$/)&&t!=="0000000000000000"},e.formatOpenTelemetryTraceFlags=function(t){var r="0"+t.toString(16);return r.substring(r.length-2)},e.prototype.getBackCompatRequestId=function(){return"|"+this.traceId+"."+this.spanId+"."},e.prototype.toString=function(){return this.version+"-"+this.traceId+"-"+this.spanId+"-"+this.traceFlag},e.prototype.updateSpanId=function(){this.spanId=me.w3cTraceId().substr(0,16)},e.DEFAULT_TRACE_FLAG="01",e.DEFAULT_VERSION="00",e}();Qv.exports=qP});var Al=l((xq,Wv)=>{"use strict";var jP=function(){function e(t){this.fieldmap=[],t&&(this.fieldmap=this.parseHeader(t))}return e.prototype.toString=function(){var t=this.fieldmap;return!t||t.length==0?null:t.join(", ")},e.validateKeyChars=function(t){var r=t.split("@");if(r.length==2){var n=r[0].trim(),i=r[1].trim(),a=Boolean(n.match(/^[\ ]?[a-z0-9\*\-\_/]{1,241}$/)),s=Boolean(i.match(/^[\ ]?[a-z0-9\*\-\_/]{1,14}$/));return a&&s}else if(r.length==1)return Boolean(t.match(/^[\ ]?[a-z0-9\*\-\_/]{1,256}$/));return!1},e.prototype.parseHeader=function(t){var r=[],n={},i=t.split(",");if(i.length>32)return null;for(var a=0,s=i;a<s.length;a++){var o=s[a],u=o.trim();if(u.length!==0){var c=u.split("=");if(c.length!==2||!e.validateKeyChars(c[0])||n[c[0]])return null;n[c[0]]=!0,r.push(u)}}return r},e.strict=!0,e}();Wv.exports=jP});var Dt=l((Mq,Zv)=>{"use strict";var kP=function(){function e(){}return e}();Zv.exports=kP});var eg=l((Sl,Jv)=>{"use strict";var HP=Sl&&Sl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),UP=Dt(),BP=function(e){HP(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return t}(UP);Jv.exports=BP});var Il=l((Lq,tg)=>{"use strict";var FP=function(){function e(){}return e}();tg.exports=FP});var ng=l((qq,rg)=>{"use strict";var GP=function(){function e(){this.applicationVersion="ai.application.ver",this.deviceId="ai.device.id",this.deviceLocale="ai.device.locale",this.deviceModel="ai.device.model",this.deviceOEMName="ai.device.oemName",this.deviceOSVersion="ai.device.osVersion",this.deviceType="ai.device.type",this.locationIp="ai.location.ip",this.operationId="ai.operation.id",this.operationName="ai.operation.name",this.operationParentId="ai.operation.parentId",this.operationSyntheticSource="ai.operation.syntheticSource",this.operationCorrelationVector="ai.operation.correlationVector",this.sessionId="ai.session.id",this.sessionIsFirst="ai.session.isFirst",this.userAccountId="ai.user.accountId",this.userId="ai.user.id",this.userAuthUserId="ai.user.authUserId",this.cloudRole="ai.cloud.role",this.cloudRoleInstance="ai.cloud.roleInstance",this.internalSdkVersion="ai.internal.sdkVersion",this.internalAgentVersion="ai.internal.agentVersion",this.internalNodeName="ai.internal.nodeName"}return e}();rg.exports=GP});var ag=l((Cl,ig)=>{"use strict";var VP=Cl&&Cl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),$P=Il(),zP=function(e){VP(t,e);function t(){return e.call(this)||this}return t}($P);ig.exports=zP});var Ol=l((jq,sg)=>{"use strict";var bl;(function(e){e[e.Measurement=0]="Measurement",e[e.Aggregation=1]="Aggregation"})(bl||(bl={}));sg.exports=bl});var ug=l((kq,og)=>{"use strict";var XP=Ol(),KP=function(){function e(){this.kind=XP.Measurement}return e}();og.exports=KP});var lg=l((Hq,cg)=>{"use strict";var YP=function(){function e(){this.ver=1,this.sampleRate=100,this.tags={}}return e}();cg.exports=YP});var Rl=l((Pl,fg)=>{"use strict";var QP=Pl&&Pl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),WP=Dt(),ZP=function(e){QP(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return t}(WP);fg.exports=ZP});var dg=l((Nl,pg)=>{"use strict";var JP=Nl&&Nl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),eR=Dt(),tR=function(e){JP(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.exceptions=[],r.properties={},r.measurements={},r}return t}(eR);pg.exports=tR});var _g=l((Uq,hg)=>{"use strict";var rR=function(){function e(){this.hasFullStack=!0,this.parsedStack=[]}return e}();hg.exports=rR});var gg=l((Dl,vg)=>{"use strict";var nR=Dl&&Dl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),iR=Dt(),aR=function(e){nR(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.properties={},r}return t}(iR);vg.exports=aR});var mg=l((wl,Eg)=>{"use strict";var sR=wl&&wl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),oR=Dt(),uR=function(e){sR(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.metrics=[],r.properties={},r}return t}(oR);Eg.exports=uR});var Tg=l((xl,yg)=>{"use strict";var cR=xl&&xl.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),lR=Rl(),fR=function(e){cR(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return t}(lR);yg.exports=fR});var Sg=l((Ml,Ag)=>{"use strict";var pR=Ml&&Ml.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),dR=Dt(),hR=function(e){pR(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.success=!0,r.properties={},r.measurements={},r}return t}(dR);Ag.exports=hR});var Cg=l((Ll,Ig)=>{"use strict";var _R=Ll&&Ll.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),vR=Dt(),gR=function(e){_R(t,e);function t(){var r=e.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return t}(vR);Ig.exports=gR});var Og=l((Bq,bg)=>{"use strict";var ql;(function(e){e[e.Verbose=0]="Verbose",e[e.Information=1]="Information",e[e.Warning=2]="Warning",e[e.Error=3]="Error",e[e.Critical=4]="Critical"})(ql||(ql={}));bg.exports=ql});var Rg=l((Fq,Pg)=>{"use strict";var ER=function(){function e(){}return e}();Pg.exports=ER});var jl=l(fe=>{"use strict";Object.defineProperty(fe,"__esModule",{value:!0});fe.AvailabilityData=eg();fe.Base=Il();fe.ContextTagKeys=ng();fe.Data=ag();fe.DataPoint=ug();fe.DataPointType=Ol();fe.Domain=Dt();fe.Envelope=lg();fe.EventData=Rl();fe.ExceptionData=dg();fe.ExceptionDetails=_g();fe.MessageData=gg();fe.MetricData=mg();fe.PageViewData=Tg();fe.RemoteDependencyData=Sg();fe.RequestData=Cg();fe.SeverityLevel=Og();fe.StackFrame=Rg()});var Ng=l(Hn=>{"use strict";Object.defineProperty(Hn,"__esModule",{value:!0});Hn.domainSupportsProperties=Hn.RemoteDependencyDataConstants=void 0;var Gr=jl(),mR=function(){function e(){}return e.TYPE_HTTP="Http",e.TYPE_AI="Http (tracked component)",e}();Hn.RemoteDependencyDataConstants=mR;function yR(e){return"properties"in e||e instanceof Gr.EventData||e instanceof Gr.ExceptionData||e instanceof Gr.MessageData||e instanceof Gr.MetricData||e instanceof Gr.PageViewData||e instanceof Gr.RemoteDependencyData||e instanceof Gr.RequestData}Hn.domainSupportsProperties=yR});var wg=l(Dg=>{"use strict";Object.defineProperty(Dg,"__esModule",{value:!0})});var Mg=l(xg=>{"use strict";Object.defineProperty(xg,"__esModule",{value:!0})});var qg=l(Lg=>{"use strict";Object.defineProperty(Lg,"__esModule",{value:!0})});var kg=l(jg=>{"use strict";Object.defineProperty(jg,"__esModule",{value:!0})});var Ug=l(Hg=>{"use strict";Object.defineProperty(Hg,"__esModule",{value:!0})});var Fg=l(Bg=>{"use strict";Object.defineProperty(Bg,"__esModule",{value:!0})});var Vg=l(Gg=>{"use strict";Object.defineProperty(Gg,"__esModule",{value:!0})});var zg=l($g=>{"use strict";Object.defineProperty($g,"__esModule",{value:!0})});var Kg=l(Xg=>{"use strict";Object.defineProperty(Xg,"__esModule",{value:!0})});var Qg=l(Yg=>{"use strict";Object.defineProperty(Yg,"__esModule",{value:!0})});var Zg=l(Wg=>{"use strict";Object.defineProperty(Wg,"__esModule",{value:!0})});var eE=l(Jg=>{"use strict";Object.defineProperty(Jg,"__esModule",{value:!0})});var tE=l(at=>{"use strict";Object.defineProperty(at,"__esModule",{value:!0});at.TelemetryType=at.TelemetryTypeString=at.baseTypeToTelemetryType=at.telemetryTypeToBaseType=void 0;function TR(e){switch(e){case ye.Event:return"EventData";case ye.Exception:return"ExceptionData";case ye.Trace:return"MessageData";case ye.Metric:return"MetricData";case ye.Request:return"RequestData";case ye.Dependency:return"RemoteDependencyData";case ye.Availability:return"AvailabilityData";case ye.PageView:return"PageViewData"}}at.telemetryTypeToBaseType=TR;function AR(e){switch(e){case"EventData":return ye.Event;case"ExceptionData":return ye.Exception;case"MessageData":return ye.Trace;case"MetricData":return ye.Metric;case"RequestData":return ye.Request;case"RemoteDependencyData":return ye.Dependency;case"AvailabilityData":return ye.Availability;case"PageViewData":return ye.PageView}}at.baseTypeToTelemetryType=AR;at.TelemetryTypeString={Event:"EventData",Exception:"ExceptionData",Trace:"MessageData",Metric:"MetricData",Request:"RequestData",Dependency:"RemoteDependencyData",Availability:"AvailabilityData",PageView:"PageViewData"};var ye;(function(e){e[e.Event=0]="Event",e[e.Exception=1]="Exception",e[e.Trace=2]="Trace",e[e.Metric=3]="Metric",e[e.Request=4]="Request",e[e.Dependency=5]="Dependency",e[e.Availability=6]="Availability",e[e.PageView=7]="PageView"})(ye=at.TelemetryType||(at.TelemetryType={}))});var rE=l(he=>{"use strict";var SR=he&&he.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),Be=he&&he.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&SR(t,e,r)};Object.defineProperty(he,"__esModule",{value:!0});Be(wg(),he);Be(Mg(),he);Be(qg(),he);Be(kg(),he);Be(Ug(),he);Be(Fg(),he);Be(Vg(),he);Be(zg(),he);Be(Kg(),he);Be(Qg(),he);Be(Zg(),he);Be(eE(),he);Be(tE(),he)});var iE=l(nE=>{"use strict";Object.defineProperty(nE,"__esModule",{value:!0})});var sE=l(aE=>{"use strict";Object.defineProperty(aE,"__esModule",{value:!0})});var uE=l(oE=>{"use strict";Object.defineProperty(oE,"__esModule",{value:!0})});var lE=l(cE=>{"use strict";Object.defineProperty(cE,"__esModule",{value:!0})});var pE=l(fE=>{"use strict";Object.defineProperty(fE,"__esModule",{value:!0})});var hE=l(dE=>{"use strict";Object.defineProperty(dE,"__esModule",{value:!0})});var vE=l(_E=>{"use strict";Object.defineProperty(_E,"__esModule",{value:!0})});var EE=l(gE=>{"use strict";Object.defineProperty(gE,"__esModule",{value:!0})});var mE=l(qe=>{"use strict";var IR=qe&&qe.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),ir=qe&&qe.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&IR(t,e,r)};Object.defineProperty(qe,"__esModule",{value:!0});ir(iE(),qe);ir(sE(),qe);ir(uE(),qe);ir(lE(),qe);ir(pE(),qe);ir(hE(),qe);ir(vE(),qe);ir(EE(),qe)});var De=l(_t=>{"use strict";var CR=_t&&_t.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),vo=_t&&_t.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&CR(t,e,r)};Object.defineProperty(_t,"__esModule",{value:!0});vo(Ng(),_t);vo(jl(),_t);vo(rE(),_t);vo(mE(),_t)});var kl=l((_1,yE)=>{"use strict";var bR=function(){function e(){}return e.prototype.getUrl=function(){return this.url},e.prototype.RequestParser=function(){this.startTime=+new Date},e.prototype._setStatus=function(t,r){var n=+new Date;this.duration=n-this.startTime,this.statusCode=t;var i=this.properties||{};if(r){if(typeof r=="string")i.error=r;else if(r instanceof Error)i.error=r.message;else if(typeof r=="object")for(var a in r)i[a]=r[a]&&r[a].toString&&r[a].toString()}this.properties=i},e.prototype._isSuccess=function(){return 0<this.statusCode&&this.statusCode<400},e}();yE.exports=bR});var Bl=l((Ul,AE)=>{"use strict";var OR=Ul&&Ul.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),go=__webpack_require__(33),PR=De(),TE=Ue(),Fe=jn(),RR=kl(),ar=Fr(),NR=Al(),Hl=Qi(),DR=function(e){OR(t,e);function t(r,n){var i=e.call(this)||this;return r&&(i.method=r.method,i.url=i._getAbsoluteUrl(r),i.startTime=+new Date,i.socketRemoteAddress=r.socket&&r.socket.remoteAddress,i.parseHeaders(r,n),r.connection&&(i.connectionRemoteAddress=r.connection.remoteAddress,i.legacySocketRemoteAddress=r.connection.socket&&r.connection.socket.remoteAddress)),i}return t.prototype.onError=function(r,n){this._setStatus(void 0,r),n&&(this.duration=n)},t.prototype.onResponse=function(r,n){this._setStatus(r.statusCode,void 0),n&&(this.duration=n)},t.prototype.getRequestTelemetry=function(r){var n={id:this.requestId,name:this.method+" "+go.parse(this.url).pathname,url:this.url,source:this.sourceCorrelationId,duration:this.duration,resultCode:this.statusCode?this.statusCode.toString():null,success:this._isSuccess(),properties:this.properties};if(r&&r.time?n.time=r.time:this.startTime&&(n.time=new Date(this.startTime)),r){for(var i in r)n[i]||(n[i]=r[i]);if(r.properties)for(var i in r.properties)n.properties[i]=r.properties[i]}return n},t.prototype.getRequestTags=function(r){var n={};for(var i in r)n[i]=r[i];return n[t.keys.locationIp]=r[t.keys.locationIp]||this._getIp(),n[t.keys.sessionId]=r[t.keys.sessionId]||this._getId("ai_session"),n[t.keys.userId]=r[t.keys.userId]||this._getId("ai_user"),n[t.keys.userAuthUserId]=r[t.keys.userAuthUserId]||this._getId("ai_authUser"),n[t.keys.operationName]=this.getOperationName(r),n[t.keys.operationParentId]=this.getOperationParentId(r),n[t.keys.operationId]=this.getOperationId(r),n},t.prototype.getOperationId=function(r){return r[t.keys.operationId]||this.operationId},t.prototype.getOperationParentId=function(r){return r[t.keys.operationParentId]||this.parentId||this.getOperationId(r)},t.prototype.getOperationName=function(r){return r[t.keys.operationName]||this.method+" "+go.parse(this.url).pathname},t.prototype.getRequestId=function(){return this.requestId},t.prototype.getCorrelationContextHeader=function(){return this.correlationContextHeader},t.prototype.getTraceparent=function(){return this.traceparent},t.prototype.getTracestate=function(){return this.tracestate},t.prototype.getLegacyRootId=function(){return this.legacyRootId},t.prototype._getAbsoluteUrl=function(r){if(!r.headers)return r.url;var n=r.connection?r.connection.encrypted:null,i=go.parse(r.url),a=i.pathname,s=i.search,o=n||r.headers["x-forwarded-proto"]=="https"?"https":"http",u=go.format({protocol:o,host:r.headers.host,pathname:a,search:s});return u},t.prototype._getIp=function(){var r=/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,n=function(a){var s=r.exec(a);if(s)return s[0]},i=n(this.rawHeaders["x-forwarded-for"])||n(this.rawHeaders["x-client-ip"])||n(this.rawHeaders["x-real-ip"])||n(this.connectionRemoteAddress)||n(this.socketRemoteAddress)||n(this.legacySocketRemoteAddress);return!i&&this.connectionRemoteAddress&&this.connectionRemoteAddress.substr&&this.connectionRemoteAddress.substr(0,2)==="::"&&(i="127.0.0.1"),i},t.prototype._getId=function(r){var n=this.rawHeaders&&this.rawHeaders.cookie&&typeof this.rawHeaders.cookie=="string"&&this.rawHeaders.cookie||"",i=t.parseId(TE.getCookie(r,n));return i},t.prototype.setBackCompatFromThisTraceContext=function(){this.operationId=this.traceparent.traceId,this.traceparent.legacyRootId&&(this.legacyRootId=this.traceparent.legacyRootId),this.parentId=this.traceparent.parentId,this.traceparent.updateSpanId(),this.requestId=this.traceparent.getBackCompatRequestId()},t.prototype.parseHeaders=function(r,n){if(this.rawHeaders=r.headers||r.rawHeaders,this.userAgent=r.headers&&r.headers["user-agent"],this.sourceCorrelationId=TE.getCorrelationContextTarget(r,Fe.requestContextSourceKey),r.headers){var i=r.headers[Fe.traceStateHeader]?r.headers[Fe.traceStateHeader].toString():null,a=r.headers[Fe.traceparentHeader]?r.headers[Fe.traceparentHeader].toString():null,s=r.headers[Fe.requestIdHeader]?r.headers[Fe.requestIdHeader].toString():null,o=r.headers[Fe.parentIdHeader]?r.headers[Fe.parentIdHeader].toString():null,u=r.headers[Fe.rootIdHeader]?r.headers[Fe.rootIdHeader].toString():null;this.correlationContextHeader=r.headers[Fe.correlationContextHeader]?r.headers[Fe.correlationContextHeader].toString():null,ar.w3cEnabled&&(a||i)?(this.traceparent=new Hl(a?a.toString():null),this.tracestate=a&&i&&new NR(i?i.toString():null),this.setBackCompatFromThisTraceContext()):s?ar.w3cEnabled?(this.traceparent=new Hl(null,s),this.setBackCompatFromThisTraceContext()):(this.parentId=s,this.requestId=ar.generateRequestId(this.parentId),this.operationId=ar.getRootId(this.requestId)):ar.w3cEnabled?(this.traceparent=new Hl,this.traceparent.parentId=o,this.traceparent.legacyRootId=u||o,this.setBackCompatFromThisTraceContext()):(this.parentId=o,this.requestId=ar.generateRequestId(u||this.parentId),this.correlationContextHeader=null,this.operationId=ar.getRootId(this.requestId)),n&&(this.requestId=n,this.operationId=ar.getRootId(this.requestId))}},t.parseId=function(r){var n=r.split("|");return n.length>0?n[0]:""},t.keys=new PR.ContextTagKeys,t}(RR);AE.exports=DR});var HE=l((C,kE)=>{C=kE.exports=D;var H;typeof process=="object"&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG)?H=function(){var e=Array.prototype.slice.call(arguments,0);e.unshift("SEMVER"),console.log.apply(console,e)}:H=function(){};C.SEMVER_SPEC_VERSION="2.0.0";var Gl=256,Eo=Number.MAX_SAFE_INTEGER||9007199254740991,Fl=16,F=C.re=[],v=C.src=[],P=0,Un=P++;v[Un]="0|[1-9]\\d*";var Bn=P++;v[Bn]="[0-9]+";var Xl=P++;v[Xl]="\\d*[a-zA-Z-][a-zA-Z0-9-]*";var IE=P++;v[IE]="("+v[Un]+")\\.("+v[Un]+")\\.("+v[Un]+")";var CE=P++;v[CE]="("+v[Bn]+")\\.("+v[Bn]+")\\.("+v[Bn]+")";var Vl=P++;v[Vl]="(?:"+v[Un]+"|"+v[Xl]+")";var $l=P++;v[$l]="(?:"+v[Bn]+"|"+v[Xl]+")";var Kl=P++;v[Kl]="(?:-("+v[Vl]+"(?:\\."+v[Vl]+")*))";var Yl=P++;v[Yl]="(?:-?("+v[$l]+"(?:\\."+v[$l]+")*))";var zl=P++;v[zl]="[0-9A-Za-z-]+";var Ji=P++;v[Ji]="(?:\\+("+v[zl]+"(?:\\."+v[zl]+")*))";var Ql=P++,bE="v?"+v[IE]+v[Kl]+"?"+v[Ji]+"?";v[Ql]="^"+bE+"$";var Wl="[v=\\s]*"+v[CE]+v[Yl]+"?"+v[Ji]+"?",Zl=P++;v[Zl]="^"+Wl+"$";var Vn=P++;v[Vn]="((?:<|>)?=?)";var mo=P++;v[mo]=v[Bn]+"|x|X|\\*";var yo=P++;v[yo]=v[Un]+"|x|X|\\*";var Vr=P++;v[Vr]="[v=\\s]*("+v[yo]+")(?:\\.("+v[yo]+")(?:\\.("+v[yo]+")(?:"+v[Kl]+")?"+v[Ji]+"?)?)?";var Gn=P++;v[Gn]="[v=\\s]*("+v[mo]+")(?:\\.("+v[mo]+")(?:\\.("+v[mo]+")(?:"+v[Yl]+")?"+v[Ji]+"?)?)?";var OE=P++;v[OE]="^"+v[Vn]+"\\s*"+v[Vr]+"$";var PE=P++;v[PE]="^"+v[Vn]+"\\s*"+v[Gn]+"$";var RE=P++;v[RE]="(?:^|[^\\d])(\\d{1,"+Fl+"})(?:\\.(\\d{1,"+Fl+"}))?(?:\\.(\\d{1,"+Fl+"}))?(?:$|[^\\d])";var bo=P++;v[bo]="(?:~>?)";var To=P++;v[To]="(\\s*)"+v[bo]+"\\s+";F[To]=new RegExp(v[To],"g");var wR="$1~",NE=P++;v[NE]="^"+v[bo]+v[Vr]+"$";var DE=P++;v[DE]="^"+v[bo]+v[Gn]+"$";var Oo=P++;v[Oo]="(?:\\^)";var Ao=P++;v[Ao]="(\\s*)"+v[Oo]+"\\s+";F[Ao]=new RegExp(v[Ao],"g");var xR="$1^",wE=P++;v[wE]="^"+v[Oo]+v[Vr]+"$";var xE=P++;v[xE]="^"+v[Oo]+v[Gn]+"$";var Jl=P++;v[Jl]="^"+v[Vn]+"\\s*("+Wl+")$|^$";var ef=P++;v[ef]="^"+v[Vn]+"\\s*("+bE+")$|^$";var Wi=P++;v[Wi]="(\\s*)"+v[Vn]+"\\s*("+Wl+"|"+v[Vr]+")";F[Wi]=new RegExp(v[Wi],"g");var MR="$1$2$3",ME=P++;v[ME]="^\\s*("+v[Vr]+")\\s+-\\s+("+v[Vr]+")\\s*$";var LE=P++;v[LE]="^\\s*("+v[Gn]+")\\s+-\\s+("+v[Gn]+")\\s*$";var qE=P++;v[qE]="(<|>)?=?\\s*\\*";for(sr=0;sr<P;sr++)H(sr,v[sr]),F[sr]||(F[sr]=new RegExp(v[sr]));var sr;C.parse=$r;function $r(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof D)return e;if(typeof e!="string"||e.length>Gl)return null;var r=t.loose?F[Zl]:F[Ql];if(!r.test(e))return null;try{return new D(e,t)}catch{return null}}C.valid=LR;function LR(e,t){var r=$r(e,t);return r?r.version:null}C.clean=qR;function qR(e,t){var r=$r(e.trim().replace(/^[=v]+/,""),t);return r?r.version:null}C.SemVer=D;function D(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof D){if(e.loose===t.loose)return e;e=e.version}else if(typeof e!="string")throw new TypeError("Invalid Version: "+e);if(e.length>Gl)throw new TypeError("version is longer than "+Gl+" characters");if(!(this instanceof D))return new D(e,t);H("SemVer",e,t),this.options=t,this.loose=!!t.loose;var r=e.trim().match(t.loose?F[Zl]:F[Ql]);if(!r)throw new TypeError("Invalid Version: "+e);if(this.raw=e,this.major=+r[1],this.minor=+r[2],this.patch=+r[3],this.major>Eo||this.major<0)throw new TypeError("Invalid major version");if(this.minor>Eo||this.minor<0)throw new TypeError("Invalid minor version");if(this.patch>Eo||this.patch<0)throw new TypeError("Invalid patch version");r[4]?this.prerelease=r[4].split(".").map(function(n){if(/^[0-9]+$/.test(n)){var i=+n;if(i>=0&&i<Eo)return i}return n}):this.prerelease=[],this.build=r[5]?r[5].split("."):[],this.format()}D.prototype.format=function(){return this.version=this.major+"."+this.minor+"."+this.patch,this.prerelease.length&&(this.version+="-"+this.prerelease.join(".")),this.version};D.prototype.toString=function(){return this.version};D.prototype.compare=function(e){return H("SemVer.compare",this.version,this.options,e),e instanceof D||(e=new D(e,this.options)),this.compareMain(e)||this.comparePre(e)};D.prototype.compareMain=function(e){return e instanceof D||(e=new D(e,this.options)),Fn(this.major,e.major)||Fn(this.minor,e.minor)||Fn(this.patch,e.patch)};D.prototype.comparePre=function(e){if(e instanceof D||(e=new D(e,this.options)),this.prerelease.length&&!e.prerelease.length)return-1;if(!this.prerelease.length&&e.prerelease.length)return 1;if(!this.prerelease.length&&!e.prerelease.length)return 0;var t=0;do{var r=this.prerelease[t],n=e.prerelease[t];if(H("prerelease compare",t,r,n),r===void 0&&n===void 0)return 0;if(n===void 0)return 1;if(r===void 0)return-1;if(r===n)continue;return Fn(r,n)}while(++t)};D.prototype.inc=function(e,t){switch(e){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",t);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",t);break;case"prepatch":this.prerelease.length=0,this.inc("patch",t),this.inc("pre",t);break;case"prerelease":this.prerelease.length===0&&this.inc("patch",t),this.inc("pre",t);break;case"major":(this.minor!==0||this.patch!==0||this.prerelease.length===0)&&this.major++,this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":(this.patch!==0||this.prerelease.length===0)&&this.minor++,this.patch=0,this.prerelease=[];break;case"patch":this.prerelease.length===0&&this.patch++,this.prerelease=[];break;case"pre":if(this.prerelease.length===0)this.prerelease=[0];else{for(var r=this.prerelease.length;--r>=0;)typeof this.prerelease[r]=="number"&&(this.prerelease[r]++,r=-2);r===-1&&this.prerelease.push(0)}t&&(this.prerelease[0]===t?isNaN(this.prerelease[1])&&(this.prerelease=[t,0]):this.prerelease=[t,0]);break;default:throw new Error("invalid increment argument: "+e)}return this.format(),this.raw=this.version,this};C.inc=jR;function jR(e,t,r,n){typeof r=="string"&&(n=r,r=void 0);try{return new D(e,r).inc(t,n).version}catch{return null}}C.diff=kR;function kR(e,t){if(tf(e,t))return null;var r=$r(e),n=$r(t),i="";if(r.prerelease.length||n.prerelease.length){i="pre";var a="prerelease"}for(var s in r)if((s==="major"||s==="minor"||s==="patch")&&r[s]!==n[s])return i+s;return a}C.compareIdentifiers=Fn;var SE=/^[0-9]+$/;function Fn(e,t){var r=SE.test(e),n=SE.test(t);return r&&n&&(e=+e,t=+t),e===t?0:r&&!n?-1:n&&!r?1:e<t?-1:1}C.rcompareIdentifiers=HR;function HR(e,t){return Fn(t,e)}C.major=UR;function UR(e,t){return new D(e,t).major}C.minor=BR;function BR(e,t){return new D(e,t).minor}C.patch=FR;function FR(e,t){return new D(e,t).patch}C.compare=wt;function wt(e,t,r){return new D(e,r).compare(new D(t,r))}C.compareLoose=GR;function GR(e,t){return wt(e,t,!0)}C.rcompare=VR;function VR(e,t,r){return wt(t,e,r)}C.sort=$R;function $R(e,t){return e.sort(function(r,n){return C.compare(r,n,t)})}C.rsort=zR;function zR(e,t){return e.sort(function(r,n){return C.rcompare(r,n,t)})}C.gt=Zi;function Zi(e,t,r){return wt(e,t,r)>0}C.lt=So;function So(e,t,r){return wt(e,t,r)<0}C.eq=tf;function tf(e,t,r){return wt(e,t,r)===0}C.neq=jE;function jE(e,t,r){return wt(e,t,r)!==0}C.gte=rf;function rf(e,t,r){return wt(e,t,r)>=0}C.lte=nf;function nf(e,t,r){return wt(e,t,r)<=0}C.cmp=Io;function Io(e,t,r,n){switch(t){case"===":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e===r;case"!==":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e!==r;case"":case"=":case"==":return tf(e,r,n);case"!=":return jE(e,r,n);case">":return Zi(e,r,n);case">=":return rf(e,r,n);case"<":return So(e,r,n);case"<=":return nf(e,r,n);default:throw new TypeError("Invalid operator: "+t)}}C.Comparator=Ke;function Ke(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof Ke){if(e.loose===!!t.loose)return e;e=e.value}if(!(this instanceof Ke))return new Ke(e,t);H("comparator",e,t),this.options=t,this.loose=!!t.loose,this.parse(e),this.semver===ea?this.value="":this.value=this.operator+this.semver.version,H("comp",this)}var ea={};Ke.prototype.parse=function(e){var t=this.options.loose?F[Jl]:F[ef],r=e.match(t);if(!r)throw new TypeError("Invalid comparator: "+e);this.operator=r[1],this.operator==="="&&(this.operator=""),r[2]?this.semver=new D(r[2],this.options.loose):this.semver=ea};Ke.prototype.toString=function(){return this.value};Ke.prototype.test=function(e){return H("Comparator.test",e,this.options.loose),this.semver===ea?!0:(typeof e=="string"&&(e=new D(e,this.options)),Io(e,this.operator,this.semver,this.options))};Ke.prototype.intersects=function(e,t){if(!(e instanceof Ke))throw new TypeError("a Comparator is required");(!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1});var r;if(this.operator==="")return r=new Z(e.value,t),Co(this.value,r,t);if(e.operator==="")return r=new Z(this.value,t),Co(e.semver,r,t);var n=(this.operator===">="||this.operator===">")&&(e.operator===">="||e.operator===">"),i=(this.operator==="<="||this.operator==="<")&&(e.operator==="<="||e.operator==="<"),a=this.semver.version===e.semver.version,s=(this.operator===">="||this.operator==="<=")&&(e.operator===">="||e.operator==="<="),o=Io(this.semver,"<",e.semver,t)&&(this.operator===">="||this.operator===">")&&(e.operator==="<="||e.operator==="<"),u=Io(this.semver,">",e.semver,t)&&(this.operator==="<="||this.operator==="<")&&(e.operator===">="||e.operator===">");return n||i||a&&s||o||u};C.Range=Z;function Z(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof Z)return e.loose===!!t.loose&&e.includePrerelease===!!t.includePrerelease?e:new Z(e.raw,t);if(e instanceof Ke)return new Z(e.value,t);if(!(this instanceof Z))return new Z(e,t);if(this.options=t,this.loose=!!t.loose,this.includePrerelease=!!t.includePrerelease,this.raw=e,this.set=e.split(/\s*\|\|\s*/).map(function(r){return this.parseRange(r.trim())},this).filter(function(r){return r.length}),!this.set.length)throw new TypeError("Invalid SemVer Range: "+e);this.format()}Z.prototype.format=function(){return this.range=this.set.map(function(e){return e.join(" ").trim()}).join("||").trim(),this.range};Z.prototype.toString=function(){return this.range};Z.prototype.parseRange=function(e){var t=this.options.loose;e=e.trim();var r=t?F[LE]:F[ME];e=e.replace(r,rN),H("hyphen replace",e),e=e.replace(F[Wi],MR),H("comparator trim",e,F[Wi]),e=e.replace(F[To],wR),e=e.replace(F[Ao],xR),e=e.split(/\s+/).join(" ");var n=t?F[Jl]:F[ef],i=e.split(" ").map(function(a){return KR(a,this.options)},this).join(" ").split(/\s+/);return this.options.loose&&(i=i.filter(function(a){return!!a.match(n)})),i=i.map(function(a){return new Ke(a,this.options)},this),i};Z.prototype.intersects=function(e,t){if(!(e instanceof Z))throw new TypeError("a Range is required");return this.set.some(function(r){return r.every(function(n){return e.set.some(function(i){return i.every(function(a){return n.intersects(a,t)})})})})};C.toComparators=XR;function XR(e,t){return new Z(e,t).set.map(function(r){return r.map(function(n){return n.value}).join(" ").trim().split(" ")})}function KR(e,t){return H("comp",e,t),e=WR(e,t),H("caret",e),e=YR(e,t),H("tildes",e),e=JR(e,t),H("xrange",e),e=tN(e,t),H("stars",e),e}function we(e){return!e||e.toLowerCase()==="x"||e==="*"}function YR(e,t){return e.trim().split(/\s+/).map(function(r){return QR(r,t)}).join(" ")}function QR(e,t){var r=t.loose?F[DE]:F[NE];return e.replace(r,function(n,i,a,s,o){H("tilde",e,n,i,a,s,o);var u;return we(i)?u="":we(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":we(s)?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":o?(H("replaceTilde pr",o),u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0"):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0",H("tilde return",u),u})}function WR(e,t){return e.trim().split(/\s+/).map(function(r){return ZR(r,t)}).join(" ")}function ZR(e,t){H("caret",e,t);var r=t.loose?F[xE]:F[wE];return e.replace(r,function(n,i,a,s,o){H("caret",e,n,i,a,s,o);var u;return we(i)?u="":we(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":we(s)?i==="0"?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+".0 <"+(+i+1)+".0.0":o?(H("replaceCaret pr",o),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+"-"+o+" <"+(+i+1)+".0.0"):(H("no pr"),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+" <"+(+i+1)+".0.0"),H("caret return",u),u})}function JR(e,t){return H("replaceXRanges",e,t),e.split(/\s+/).map(function(r){return eN(r,t)}).join(" ")}function eN(e,t){e=e.trim();var r=t.loose?F[PE]:F[OE];return e.replace(r,function(n,i,a,s,o,u){H("xRange",e,n,i,a,s,o,u);var c=we(a),f=c||we(s),p=f||we(o),d=p;return i==="="&&d&&(i=""),c?i===">"||i==="<"?n="<0.0.0":n="*":i&&d?(f&&(s=0),o=0,i===">"?(i=">=",f?(a=+a+1,s=0,o=0):(s=+s+1,o=0)):i==="<="&&(i="<",f?a=+a+1:s=+s+1),n=i+a+"."+s+"."+o):f?n=">="+a+".0.0 <"+(+a+1)+".0.0":p&&(n=">="+a+"."+s+".0 <"+a+"."+(+s+1)+".0"),H("xRange return",n),n})}function tN(e,t){return H("replaceStars",e,t),e.trim().replace(F[qE],"")}function rN(e,t,r,n,i,a,s,o,u,c,f,p,d){return we(r)?t="":we(n)?t=">="+r+".0.0":we(i)?t=">="+r+"."+n+".0":t=">="+t,we(u)?o="":we(c)?o="<"+(+u+1)+".0.0":we(f)?o="<"+u+"."+(+c+1)+".0":p?o="<="+u+"."+c+"."+f+"-"+p:o="<="+o,(t+" "+o).trim()}Z.prototype.test=function(e){if(!e)return!1;typeof e=="string"&&(e=new D(e,this.options));for(var t=0;t<this.set.length;t++)if(nN(this.set[t],e,this.options))return!0;return!1};function nN(e,t,r){for(var n=0;n<e.length;n++)if(!e[n].test(t))return!1;if(t.prerelease.length&&!r.includePrerelease){for(n=0;n<e.length;n++)if(H(e[n].semver),e[n].semver!==ea&&e[n].semver.prerelease.length>0){var i=e[n].semver;if(i.major===t.major&&i.minor===t.minor&&i.patch===t.patch)return!0}return!1}return!0}C.satisfies=Co;function Co(e,t,r){try{t=new Z(t,r)}catch{return!1}return t.test(e)}C.maxSatisfying=iN;function iN(e,t,r){var n=null,i=null;try{var a=new Z(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===-1)&&(n=s,i=new D(n,r))}),n}C.minSatisfying=aN;function aN(e,t,r){var n=null,i=null;try{var a=new Z(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===1)&&(n=s,i=new D(n,r))}),n}C.minVersion=sN;function sN(e,t){e=new Z(e,t);var r=new D("0.0.0");if(e.test(r)||(r=new D("0.0.0-0"),e.test(r)))return r;r=null;for(var n=0;n<e.set.length;++n){var i=e.set[n];i.forEach(function(a){var s=new D(a.semver.version);switch(a.operator){case">":s.prerelease.length===0?s.patch++:s.prerelease.push(0),s.raw=s.format();case"":case">=":(!r||Zi(r,s))&&(r=s);break;case"<":case"<=":break;default:throw new Error("Unexpected operation: "+a.operator)}})}return r&&e.test(r)?r:null}C.validRange=oN;function oN(e,t){try{return new Z(e,t).range||"*"}catch{return null}}C.ltr=uN;function uN(e,t,r){return af(e,t,"<",r)}C.gtr=cN;function cN(e,t,r){return af(e,t,">",r)}C.outside=af;function af(e,t,r,n){e=new D(e,n),t=new Z(t,n);var i,a,s,o,u;switch(r){case">":i=Zi,a=nf,s=So,o=">",u=">=";break;case"<":i=So,a=rf,s=Zi,o="<",u="<=";break;default:throw new TypeError('Must provide a hilo val of "<" or ">"')}if(Co(e,t,n))return!1;for(var c=0;c<t.set.length;++c){var f=t.set[c],p=null,d=null;if(f.forEach(function(h){h.semver===ea&&(h=new Ke(">=0.0.0")),p=p||h,d=d||h,i(h.semver,p.semver,n)?p=h:s(h.semver,d.semver,n)&&(d=h)}),p.operator===o||p.operator===u||(!d.operator||d.operator===o)&&a(e,d.semver))return!1;if(d.operator===u&&s(e,d.semver))return!1}return!0}C.prerelease=lN;function lN(e,t){var r=$r(e,t);return r&&r.prerelease.length?r.prerelease:null}C.intersects=fN;function fN(e,t,r){return e=new Z(e,r),t=new Z(t,r),e.intersects(t)}C.coerce=pN;function pN(e){if(e instanceof D)return e;if(typeof e!="string")return null;var t=e.match(F[RE]);return t==null?null:$r(t[1]+"."+(t[2]||"0")+"."+(t[3]||"0"))}});var Po=l((v1,FE)=>{"use strict";function sf(e){return typeof e=="function"}var xe=console.error.bind(console);function ta(e,t,r){var n=!!e[t]&&e.propertyIsEnumerable(t);Object.defineProperty(e,t,{configurable:!0,enumerable:n,writable:!0,value:r})}function ra(e){e&&e.logger&&(sf(e.logger)?xe=e.logger:xe("new logger isn't a function, not replacing"))}function UE(e,t,r){if(!e||!e[t]){xe("no original function "+t+" to wrap");return}if(!r){xe("no wrapper function"),xe(new Error().stack);return}if(!sf(e[t])||!sf(r)){xe("original object and wrapper must be functions");return}var n=e[t],i=r(n,t);return ta(i,"__original",n),ta(i,"__unwrap",function(){e[t]===i&&ta(e,t,n)}),ta(i,"__wrapped",!0),ta(e,t,i),i}function dN(e,t,r){if(e)Array.isArray(e)||(e=[e]);else{xe("must provide one or more modules to patch"),xe(new Error().stack);return}if(!(t&&Array.isArray(t))){xe("must provide one or more functions to wrap on modules");return}e.forEach(function(n){t.forEach(function(i){UE(n,i,r)})})}function BE(e,t){if(!e||!e[t]){xe("no function to unwrap."),xe(new Error().stack);return}if(!e[t].__unwrap)xe("no original to unwrap to -- has "+t+" already been unwrapped?");else return e[t].__unwrap()}function hN(e,t){if(e)Array.isArray(e)||(e=[e]);else{xe("must provide one or more modules to patch"),xe(new Error().stack);return}if(!(t&&Array.isArray(t))){xe("must provide one or more functions to unwrap on modules");return}e.forEach(function(r){t.forEach(function(n){BE(r,n)})})}ra.wrap=UE;ra.massWrap=dN;ra.unwrap=BE;ra.massUnwrap=hN;FE.exports=ra});var Do=l((g1,zE)=>{"use strict";var VE=Po(),$n=VE.wrap,Ro=VE.unwrap,xt="wrap@before";function No(e,t,r){var n=!!e[t]&&e.propertyIsEnumerable(t);Object.defineProperty(e,t,{configurable:!0,enumerable:n,writable:!0,value:r})}function _N(e,t){for(var r=t.length,n=0;n<r;n++){var i=t[n],a=e[xt];if(typeof a=="function")a(i);else if(Array.isArray(a))for(var s=a.length,o=0;o<s;o++)a[o](i)}}function $E(e,t){var r;return r=e._events&&e._events[t],Array.isArray(r)||(r?r=[r]:r=[]),r}function vN(e,t,r){var n=$E(e,t),i=n.filter(function(a){return r.indexOf(a)===-1});i.length>0&&_N(e,i)}function GE(e,t){if(!!e){var r=e;if(typeof e=="function")r=t(e);else if(Array.isArray(e)){r=[];for(var n=0;n<e.length;n++)r[n]=t(e[n])}return r}}zE.exports=function(t,r,n){if(!t||!t.on||!t.addListener||!t.removeListener||!t.emit)throw new Error("can only wrap real EEs");if(!r)throw new Error("must have function to run on listener addition");if(!n)throw new Error("must have function to wrap listeners when emitting");function i(s){return function(u,c){var f=$E(this,u).slice();try{var p=s.call(this,u,c);return vN(this,u,f),p}finally{this.on.__wrapped||$n(this,"on",i),this.addListener.__wrapped||$n(this,"addListener",i)}}}function a(s){return function(u){if(!this._events||!this._events[u])return s.apply(this,arguments);var c=this._events[u];function f(p){return function(){this._events[u]=c;try{return p.apply(this,arguments)}finally{c=this._events[u],this._events[u]=GE(c,n)}}}$n(this,"removeListener",f);try{return this._events[u]=GE(c,n),s.apply(this,arguments)}finally{Ro(this,"removeListener"),this._events[u]=c}}}t[xt]?typeof t[xt]=="function"?No(t,xt,[t[xt],r]):Array.isArray(t[xt])&&t[xt].push(r):No(t,xt,r),t.__wrapped||($n(t,"addListener",i),$n(t,"on",i),$n(t,"emit",a),No(t,"__unwrap",function(){Ro(t,"addListener"),Ro(t,"on"),Ro(t,"emit"),delete t[xt],delete t.__wrapped}),No(t,"__wrapped",!0))}});var QE=l((E1,YE)=>{"use strict";var q=__webpack_require__(26),Mt=__webpack_require__(35),gN=Do(),K=__webpack_require__(36),na="cls@contexts",ia="error@context",J=process.env.DEBUG_CLS_HOOKED,L=-1;YE.exports={getNamespace:XE,createNamespace:EN,destroyNamespace:KE,reset:mN,ERROR_SYMBOL:ia};function Ye(e){this.name=e,this.active=null,this._set=[],this.id=null,this._contexts=new Map,this._indent=0}Ye.prototype.set=function(t,r){if(!this.active)throw new Error("No context available. ns.run() or ns.bind() must be called first.");if(this.active[t]=r,J){let n=" ".repeat(this._indent<0?0:this._indent);Q(n+"CONTEXT-SET KEY:"+t+"="+r+" in ns:"+this.name+" currentUid:"+L+" active:"+q.inspect(this.active,{showHidden:!0,depth:2,colors:!0}))}return r};Ye.prototype.get=function(t){if(!this.active){if(J){let r=K.currentId(),n=K.triggerAsyncId(),i=" ".repeat(this._indent<0?0:this._indent);Q(`${i}CONTEXT-GETTING KEY NO ACTIVE NS: (${this.name}) ${t}=undefined currentUid:${L} asyncHooksCurrentId:${r} triggerId:${n} len:${this._set.length}`)}return}if(J){let r=K.executionAsyncId(),n=K.triggerAsyncId(),i=" ".repeat(this._indent<0?0:this._indent);Q(i+"CONTEXT-GETTING KEY:"+t+"="+this.active[t]+" ("+this.name+") currentUid:"+L+" active:"+q.inspect(this.active,{showHidden:!0,depth:2,colors:!0})),Q(`${i}CONTEXT-GETTING KEY: (${this.name}) ${t}=${this.active[t]} currentUid:${L} asyncHooksCurrentId:${r} triggerId:${n} len:${this._set.length} active:${q.inspect(this.active)}`)}return this.active[t]};Ye.prototype.createContext=function(){let t=Object.create(this.active?this.active:Object.prototype);if(t._ns_name=this.name,t.id=L,J){let r=K.executionAsyncId(),n=K.triggerAsyncId(),i=" ".repeat(this._indent<0?0:this._indent);Q(`${i}CONTEXT-CREATED Context: (${this.name}) currentUid:${L} asyncHooksCurrentId:${r} triggerId:${n} len:${this._set.length} context:${q.inspect(t,{showHidden:!0,depth:2,colors:!0})}`)}return t};Ye.prototype.run=function(t){let r=this.createContext();this.enter(r);try{if(J){let n=K.triggerAsyncId(),i=K.executionAsyncId(),a=" ".repeat(this._indent<0?0:this._indent);Q(`${a}CONTEXT-RUN BEGIN: (${this.name}) currentUid:${L} triggerId:${n} asyncHooksCurrentId:${i} len:${this._set.length} context:${q.inspect(r)}`)}return t(r),r}catch(n){throw n&&(n[ia]=r),n}finally{if(J){let n=K.triggerAsyncId(),i=K.executionAsyncId(),a=" ".repeat(this._indent<0?0:this._indent);Q(`${a}CONTEXT-RUN END: (${this.name}) currentUid:${L} triggerId:${n} asyncHooksCurrentId:${i} len:${this._set.length} ${q.inspect(r)}`)}this.exit(r)}};Ye.prototype.runAndReturn=function(t){let r;return this.run(function(n){r=t(n)}),r};Ye.prototype.runPromise=function(t){let r=this.createContext();this.enter(r);let n=t(r);if(!n||!n.then||!n.catch)throw new Error("fn must return a promise.");return J&&Q("CONTEXT-runPromise BEFORE: ("+this.name+") currentUid:"+L+" len:"+this._set.length+" "+q.inspect(r)),n.then(i=>(J&&Q("CONTEXT-runPromise AFTER then: ("+this.name+") currentUid:"+L+" len:"+this._set.length+" "+q.inspect(r)),this.exit(r),i)).catch(i=>{throw i[ia]=r,J&&Q("CONTEXT-runPromise AFTER catch: ("+this.name+") currentUid:"+L+" len:"+this._set.length+" "+q.inspect(r)),this.exit(r),i})};Ye.prototype.bind=function(t,r){r||(this.active?r=this.active:r=this.createContext());let n=this;return function(){n.enter(r);try{return t.apply(this,arguments)}catch(a){throw a&&(a[ia]=r),a}finally{n.exit(r)}}};Ye.prototype.enter=function(t){if(Mt.ok(t,"context must be provided for entering"),J){let r=K.executionAsyncId(),n=K.triggerAsyncId(),i=" ".repeat(this._indent<0?0:this._indent);Q(`${i}CONTEXT-ENTER: (${this.name}) currentUid:${L} triggerId:${n} asyncHooksCurrentId:${r} len:${this._set.length} ${q.inspect(t)}`)}this._set.push(this.active),this.active=t};Ye.prototype.exit=function(t){if(Mt.ok(t,"context must be provided for exiting"),J){let n=K.executionAsyncId(),i=K.triggerAsyncId(),a=" ".repeat(this._indent<0?0:this._indent);Q(`${a}CONTEXT-EXIT: (${this.name}) currentUid:${L} triggerId:${i} asyncHooksCurrentId:${n} len:${this._set.length} ${q.inspect(t)}`)}if(this.active===t){Mt.ok(this._set.length,"can't remove top context"),this.active=this._set.pop();return}let r=this._set.lastIndexOf(t);r<0?(J&&Q("??ERROR?? context exiting but not entered - ignoring: "+q.inspect(t)),Mt.ok(r>=0,`context not currently entered; can't exit. 
`+q.inspect(this)+`
`+q.inspect(t))):(Mt.ok(r,"can't remove top context"),this._set.splice(r,1))};Ye.prototype.bindEmitter=function(t){Mt.ok(t.on&&t.addListener&&t.emit,"can only bind real EEs");let r=this,n="context@"+this.name;function i(s){!s||(s[na]||(s[na]=Object.create(null)),s[na][n]={namespace:r,context:r.active})}function a(s){if(!(s&&s[na]))return s;let o=s,u=s[na];return Object.keys(u).forEach(function(c){let f=u[c];o=f.namespace.bind(o,f.context)}),o}gN(t,i,a)};Ye.prototype.fromException=function(t){return t[ia]};function XE(e){return process.namespaces[e]}function EN(e){Mt.ok(e,"namespace must be given a name."),J&&Q(`NS-CREATING NAMESPACE (${e})`);let t=new Ye(e);return t.id=L,K.createHook({init(n,i,a,s){if(L=K.executionAsyncId(),t.active){if(t._contexts.set(n,t.active),J){let o=" ".repeat(t._indent<0?0:t._indent);Q(`${o}INIT [${i}] (${e}) asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} resource:${s}`)}}else if(L===0){let o=K.triggerAsyncId(),u=t._contexts.get(o);if(u){if(t._contexts.set(n,u),J){let c=" ".repeat(t._indent<0?0:t._indent);Q(`${c}INIT USING CONTEXT FROM TRIGGERID [${i}] (${e}) asyncId:${n} currentUid:${L} triggerId:${o} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} resource:${s}`)}}else if(J){let c=" ".repeat(t._indent<0?0:t._indent);Q(`${c}INIT MISSING CONTEXT [${i}] (${e}) asyncId:${n} currentUid:${L} triggerId:${o} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} resource:${s}`)}}if(J&&i==="PROMISE"){Q(q.inspect(s,{showHidden:!0}));let o=s.parentId,u=" ".repeat(t._indent<0?0:t._indent);Q(`${u}INIT RESOURCE-PROMISE [${i}] (${e}) parentId:${o} asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} resource:${s}`)}},before(n){L=K.executionAsyncId();let i;if(i=t._contexts.get(n)||t._contexts.get(L),i){if(J){let a=K.triggerAsyncId(),s=" ".repeat(t._indent<0?0:t._indent);Q(`${s}BEFORE (${e}) asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} context:${q.inspect(i)}`),t._indent+=2}t.enter(i)}else if(J){let a=K.triggerAsyncId(),s=" ".repeat(t._indent<0?0:t._indent);Q(`${s}BEFORE MISSING CONTEXT (${e}) asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} namespace._contexts:${q.inspect(t._contexts,{showHidden:!0,depth:2,colors:!0})}`),t._indent+=2}},after(n){L=K.executionAsyncId();let i;if(i=t._contexts.get(n)||t._contexts.get(L),i){if(J){let a=K.triggerAsyncId();t._indent-=2;let s=" ".repeat(t._indent<0?0:t._indent);Q(`${s}AFTER (${e}) asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} context:${q.inspect(i)}`)}t.exit(i)}else if(J){let a=K.triggerAsyncId();t._indent-=2;let s=" ".repeat(t._indent<0?0:t._indent);Q(`${s}AFTER MISSING CONTEXT (${e}) asyncId:${n} currentUid:${L} triggerId:${a} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} context:${q.inspect(i)}`)}},destroy(n){if(L=K.executionAsyncId(),J){let i=K.triggerAsyncId(),a=" ".repeat(t._indent<0?0:t._indent);Q(`${a}DESTROY (${e}) currentUid:${L} asyncId:${n} triggerId:${i} active:${q.inspect(t.active,{showHidden:!0,depth:2,colors:!0})} context:${q.inspect(t._contexts.get(L))}`)}t._contexts.delete(n)}}).enable(),process.namespaces[e]=t,t}function KE(e){let t=XE(e);Mt.ok(t,`can't delete nonexistent namespace! "`+e+'"'),Mt.ok(t.id,"don't assign to process.namespaces directly! "+q.inspect(t)),process.namespaces[e]=null}function mN(){process.namespaces&&Object.keys(process.namespaces).forEach(function(e){KE(e)}),process.namespaces=Object.create(null)}process.namespaces={};function Q(...e){J&&process._rawDebug(`${q.format(...e)}`)}});var ZE=l((m1,WE)=>{"use strict";function yN(){}WE.exports=function(){let t=this._hooks,r=this._state,n=process.nextTick;process.nextTick=function(){if(!r.enabled)return n.apply(process,arguments);let i=new Array(arguments.length);for(let u=0;u<arguments.length;u++)i[u]=arguments[u];let a=i[0];if(typeof a!="function")throw new TypeError("callback is not a function");let s=new yN,o=--r.counter;return t.init.call(s,o,0,null,null),i[0]=function(){t.pre.call(s,o);let u=!0;try{a.apply(this,arguments),u=!1}finally{u&&process.listenerCount("uncaughtException")>0&&process.once("uncaughtException",function(){t.post.call(s,o,!0),t.destroy.call(null,o)})}t.post.call(s,o,!1),t.destroy.call(null,o)},n.apply(process,i)}}});var em=l((y1,JE)=>{"use strict";function TN(){}JE.exports=function(){let t=this._hooks,r=this._state,n=global.Promise,i=n.prototype.then;n.prototype.then=u;function a(c,f,p,d){return typeof c!="function"?d?s(p):o(p):function(){t.pre.call(f,p);try{return c.apply(this,arguments)}finally{t.post.call(f,p,!1),t.destroy.call(null,p)}}}function s(c){return function(p){return t.destroy.call(null,c),p}}function o(c){return function(p){throw t.destroy.call(null,c),p}}function u(c,f){if(!r.enabled)return i.call(this,c,f);let p=new TN,d=--r.counter;return t.init.call(p,d,0,null,null),i.call(this,a(c,p,d,!0),a(f,p,d,!1))}}});var rm=l((T1,tm)=>{"use strict";var Ge=__webpack_require__(37);function AN(){}function SN(){}function IN(){}var CN=new Map,bN=new Map,ON=new Map,of=null,uf=!1;tm.exports=function(){cf(this._hooks,this._state,"setTimeout","clearTimeout",AN,CN,!0),cf(this._hooks,this._state,"setInterval","clearInterval",SN,bN,!1),cf(this._hooks,this._state,"setImmediate","clearImmediate",IN,ON,!0),global.setTimeout=Ge.setTimeout,global.setInterval=Ge.setInterval,global.setImmediate=Ge.setImmediate,global.clearTimeout=Ge.clearTimeout,global.clearInterval=Ge.clearInterval,global.clearImmediate=Ge.clearImmediate};function cf(e,t,r,n,i,a,s){let o=Ge[r],u=Ge[n];Ge[r]=function(){if(!t.enabled)return o.apply(Ge,arguments);let c=new Array(arguments.length);for(let E=0;E<arguments.length;E++)c[E]=arguments[E];let f=c[0];if(typeof f!="function")throw new TypeError('"callback" argument must be a function');let p=new i,d=--t.counter,h;return e.init.call(p,d,0,null,null),c[0]=function(){of=h,e.pre.call(p,d);let E=!0;try{f.apply(this,arguments),E=!1}finally{E&&process.listenerCount("uncaughtException")>0&&process.once("uncaughtException",function(){e.post.call(p,d,!0),a.delete(h),e.destroy.call(null,d)})}e.post.call(p,d,!1),of=null,(s||uf)&&(uf=!1,a.delete(h),e.destroy.call(null,d))},h=o.apply(Ge,c),a.set(h,d),h},Ge[n]=function(c){if(of===c&&c!==null)uf=!0;else if(a.has(c)){let f=a.get(c);a.delete(c),e.destroy.call(null,f)}u.apply(Ge,arguments)}}});var lf=l((A1,PN)=>{PN.exports={name:"async-hook-jl",description:"Inspect the life of handle objects in node",version:"1.7.6",author:"Andreas Madsen <amwebdk@gmail.com>",main:"./index.js",scripts:{test:"node ./test/runner.js && eslint ."},repository:{type:"git",url:"git://github.com/jeff-lewis/async-hook-jl.git"},keywords:["async","async hooks","inspect","async wrap"],license:"MIT",dependencies:{"stack-chain":"^1.3.7"},devDependencies:{async:"1.5.x","cli-color":"1.1.x",eslint:"^3.4.0",endpoint:"0.4.x"},engines:{node:"^4.7 || >=6.9 || >=7.3"}}});var am=l((S1,im)=>{"use strict";var sa=process.binding("async_wrap"),RN=sa.Providers.TIMERWRAP,nm={nextTick:ZE(),promise:em(),timers:rm()},aa=new Set;function NN(){this.enabled=!1,this.counter=0}function ff(){let e=this.initFns=[],t=this.preFns=[],r=this.postFns=[],n=this.destroyFns=[];this.init=function(i,a,s,o){if(a===RN){aa.add(i);return}for(let u of e)u(i,this,a,s,o)},this.pre=function(i){if(!aa.has(i))for(let a of t)a(i,this)},this.post=function(i,a){if(!aa.has(i))for(let s of r)s(i,this,a)},this.destroy=function(i){if(aa.has(i)){aa.delete(i);return}for(let a of n)a(i)}}ff.prototype.add=function(e){e.init&&this.initFns.push(e.init),e.pre&&this.preFns.push(e.pre),e.post&&this.postFns.push(e.post),e.destroy&&this.destroyFns.push(e.destroy)};function wo(e,t){let r=e.indexOf(t);r!==-1&&e.splice(r,1)}ff.prototype.remove=function(e){e.init&&wo(this.initFns,e.init),e.pre&&wo(this.preFns,e.pre),e.post&&wo(this.postFns,e.post),e.destroy&&wo(this.destroyFns,e.destroy)};function oa(){this._state=new NN,this._hooks=new ff,this.version=lf().version,this.providers=sa.Providers;for(let e of Object.keys(nm))nm[e].call(this);process.env.hasOwnProperty("NODE_ASYNC_HOOK_WARNING")&&console.warn("warning: you are using async-hook-jl which is unstable."),sa.setupHooks({init:this._hooks.init,pre:this._hooks.pre,post:this._hooks.post,destroy:this._hooks.destroy})}im.exports=oa;oa.prototype.addHooks=function(e){this._hooks.add(e)};oa.prototype.removeHooks=function(e){this._hooks.remove(e)};oa.prototype.enable=function(){this._state.enabled=!0,sa.enable()};oa.prototype.disable=function(){this._state.enabled=!1,sa.disable()}});var pf=l((I1,DN)=>{DN.exports={name:"stack-chain",description:"API for combining call site modifiers",version:"1.3.7",author:"Andreas Madsen <amwebdk@gmail.com>",scripts:{test:"tap ./test/simple"},repository:{type:"git",url:"git://github.com/AndreasMadsen/stack-chain.git"},keywords:["stack","chain","trace","call site","concat","format"],devDependencies:{tap:"2.x.x","uglify-js":"2.5.x"},license:"MIT"}});var om=l((C1,sm)=>{function wN(e){try{return Error.prototype.toString.call(e)}catch(t){try{return"<error: "+t+">"}catch{return"<error>"}}}sm.exports=function(t,r){var n=[];n.push(wN(t));for(var i=0;i<r.length;i++){var a=r[i],s;try{s=a.toString()}catch(o){try{s="<error: "+o+">"}catch{s="<error>"}}n.push("    at "+s)}return n.join(`
`)}});var fm=l((b1,lm)=>{var xo=om();function cm(){this.extend=new ua,this.filter=new ua,this.format=new ca,this.version=pf().version}var hf=!1;cm.prototype.callSite=function e(t){t||(t={}),hf=!0;var r={};Error.captureStackTrace(r,e);var n=r.stack;return hf=!1,n=n.slice(t.slice||0),t.extend&&(n=this.extend._modify(r,n)),t.filter&&(n=this.filter._modify(r,n)),n};var or=new cm;function ua(){this._modifiers=[]}ua.prototype._modify=function(e,t){for(var r=0,n=this._modifiers.length;r<n;r++)t=this._modifiers[r](e,t);return t};ua.prototype.attach=function(e){this._modifiers.push(e)};ua.prototype.deattach=function(e){var t=this._modifiers.indexOf(e);return t===-1?!1:(this._modifiers.splice(t,1),!0)};function ca(){this._formater=xo,this._previous=void 0}ca.prototype.replace=function(e){e?this._formater=e:this.restore()};ca.prototype.restore=function(){this._formater=xo,this._previous=void 0};ca.prototype._backup=function(){this._previous=this._formater};ca.prototype._roolback=function(){this._previous===xo?this.replace(void 0):this.replace(this._previous),this._previous=void 0};Error.prepareStackTrace&&or.format.replace(Error.prepareStackTrace);var df=!1;function um(e,t){if(hf)return t;if(df)return xo(e,t);var r=t.concat();r=or.extend._modify(e,r),r=or.filter._modify(e,r),r=r.slice(0,Error.stackTraceLimit),Object.isExtensible(e)&&Object.getOwnPropertyDescriptor(e,"callSite")===void 0&&(e.callSite={original:t,mutated:r}),df=!0;var n=or.format._formater(e,r);return df=!1,n}Object.defineProperty(Error,"prepareStackTrace",{get:function(){return um},set:function(e){e===um?or.format._roolback():(or.format._backup(),or.format.replace(e))}});function xN(){return this.stack,this.callSite}Object.defineProperty(Error.prototype,"callSite",{get:xN,set:function(e){Object.defineProperty(this,"callSite",{value:e,writable:!0,configurable:!0})},configurable:!0});lm.exports=or});var vf=l((O1,_f)=>{if(global._stackChain)if(global._stackChain.version===pf().version)_f.exports=global._stackChain;else throw new Error("Conflicting version of stack-chain found");else _f.exports=global._stackChain=fm()});var pm=l((P1,gf)=>{"use strict";var MN=am();if(global._asyncHook)if(global._asyncHook.version===lf().version)gf.exports=global._asyncHook;else throw new Error("Conflicting version of async-hook-jl found");else vf().filter.attach(function(t,r){return r.filter(function(n){let i=n.getFileName();return!(i&&i.slice(0,__dirname.length)===__dirname)})}),gf.exports=global._asyncHook=new MN});var Em=l((R1,gm)=>{"use strict";var ce=__webpack_require__(26),Lt=__webpack_require__(35),LN=Do(),zn=pm(),la="cls@contexts",fa="error@context",hm=[];for(let e in zn.providers)hm[zn.providers[e]]=e;var ae=process.env.DEBUG_CLS_HOOKED,pe=-1;gm.exports={getNamespace:_m,createNamespace:qN,destroyNamespace:vm,reset:jN,ERROR_SYMBOL:fa};function Qe(e){this.name=e,this.active=null,this._set=[],this.id=null,this._contexts=new Map}Qe.prototype.set=function(t,r){if(!this.active)throw new Error("No context available. ns.run() or ns.bind() must be called first.");return ae&&ue("    SETTING KEY:"+t+"="+r+" in ns:"+this.name+" uid:"+pe+" active:"+ce.inspect(this.active,!0)),this.active[t]=r,r};Qe.prototype.get=function(t){if(!this.active){ae&&ue("    GETTING KEY:"+t+"=undefined "+this.name+" uid:"+pe+" active:"+ce.inspect(this.active,!0));return}return ae&&ue("    GETTING KEY:"+t+"="+this.active[t]+" "+this.name+" uid:"+pe+" active:"+ce.inspect(this.active,!0)),this.active[t]};Qe.prototype.createContext=function(){ae&&ue("   CREATING Context: "+this.name+" uid:"+pe+" len:"+this._set.length+"  active:"+ce.inspect(this.active,!0,2,!0));let t=Object.create(this.active?this.active:Object.prototype);return t._ns_name=this.name,t.id=pe,ae&&ue("   CREATED Context: "+this.name+" uid:"+pe+" len:"+this._set.length+"  context:"+ce.inspect(t,!0,2,!0)),t};Qe.prototype.run=function(t){let r=this.createContext();this.enter(r);try{return ae&&ue(" BEFORE RUN: "+this.name+" uid:"+pe+" len:"+this._set.length+" "+ce.inspect(r)),t(r),r}catch(n){throw n&&(n[fa]=r),n}finally{ae&&ue(" AFTER RUN: "+this.name+" uid:"+pe+" len:"+this._set.length+" "+ce.inspect(r)),this.exit(r)}};Qe.prototype.runAndReturn=function(t){var r;return this.run(function(n){r=t(n)}),r};Qe.prototype.runPromise=function(t){let r=this.createContext();this.enter(r);let n=t(r);if(!n||!n.then||!n.catch)throw new Error("fn must return a promise.");return ae&&ue(" BEFORE runPromise: "+this.name+" uid:"+pe+" len:"+this._set.length+" "+ce.inspect(r)),n.then(i=>(ae&&ue(" AFTER runPromise: "+this.name+" uid:"+pe+" len:"+this._set.length+" "+ce.inspect(r)),this.exit(r),i)).catch(i=>{throw i[fa]=r,ae&&ue(" AFTER runPromise: "+this.name+" uid:"+pe+" len:"+this._set.length+" "+ce.inspect(r)),this.exit(r),i})};Qe.prototype.bind=function(t,r){r||(this.active?r=this.active:r=this.createContext());let n=this;return function(){n.enter(r);try{return t.apply(this,arguments)}catch(a){throw a&&(a[fa]=r),a}finally{n.exit(r)}}};Qe.prototype.enter=function(t){Lt.ok(t,"context must be provided for entering"),ae&&ue("  ENTER "+this.name+" uid:"+pe+" len:"+this._set.length+" context: "+ce.inspect(t)),this._set.push(this.active),this.active=t};Qe.prototype.exit=function(t){if(Lt.ok(t,"context must be provided for exiting"),ae&&ue("  EXIT "+this.name+" uid:"+pe+" len:"+this._set.length+" context: "+ce.inspect(t)),this.active===t){Lt.ok(this._set.length,"can't remove top context"),this.active=this._set.pop();return}let r=this._set.lastIndexOf(t);r<0?(ae&&ue("??ERROR?? context exiting but not entered - ignoring: "+ce.inspect(t)),Lt.ok(r>=0,`context not currently entered; can't exit. 
`+ce.inspect(this)+`
`+ce.inspect(t))):(Lt.ok(r,"can't remove top context"),this._set.splice(r,1))};Qe.prototype.bindEmitter=function(t){Lt.ok(t.on&&t.addListener&&t.emit,"can only bind real EEs");let r=this,n="context@"+this.name;function i(s){!s||(s[la]||(s[la]=Object.create(null)),s[la][n]={namespace:r,context:r.active})}function a(s){if(!(s&&s[la]))return s;let o=s,u=s[la];return Object.keys(u).forEach(function(c){let f=u[c];o=f.namespace.bind(o,f.context)}),o}LN(t,i,a)};Qe.prototype.fromException=function(t){return t[fa]};function _m(e){return process.namespaces[e]}function qN(e){Lt.ok(e,"namespace must be given a name."),ae&&ue("CREATING NAMESPACE "+e);let t=new Qe(e);return t.id=pe,zn.addHooks({init(r,n,i,a,s){pe=r,a?(t._contexts.set(r,t._contexts.get(a)),ae&&ue("PARENTID: "+e+" uid:"+r+" parent:"+a+" provider:"+i)):t._contexts.set(pe,t.active),ae&&ue("INIT "+e+" uid:"+r+" parent:"+a+" provider:"+hm[i]+" active:"+ce.inspect(t.active,!0))},pre(r,n){pe=r;let i=t._contexts.get(r);i?(ae&&ue(" PRE "+e+" uid:"+r+" handle:"+Mo(n)+" context:"+ce.inspect(i)),t.enter(i)):ae&&ue(" PRE MISSING CONTEXT "+e+" uid:"+r+" handle:"+Mo(n))},post(r,n){pe=r;let i=t._contexts.get(r);i?(ae&&ue(" POST "+e+" uid:"+r+" handle:"+Mo(n)+" context:"+ce.inspect(i)),t.exit(i)):ae&&ue(" POST MISSING CONTEXT "+e+" uid:"+r+" handle:"+Mo(n))},destroy(r){pe=r,ae&&ue("DESTROY "+e+" uid:"+r+" context:"+ce.inspect(t._contexts.get(pe))+" active:"+ce.inspect(t.active,!0)),t._contexts.delete(r)}}),process.namespaces[e]=t,t}function vm(e){let t=_m(e);Lt.ok(t,`can't delete nonexistent namespace! "`+e+'"'),Lt.ok(t.id,"don't assign to process.namespaces directly! "+ce.inspect(t)),process.namespaces[e]=null}function jN(){process.namespaces&&Object.keys(process.namespaces).forEach(function(e){vm(e)}),process.namespaces=Object.create(null)}process.namespaces={};zn._state&&!zn._state.enabled&&zn.enable();function ue(e){process.env.DEBUG&&process._rawDebug(e)}function Mo(e){if(!e)return e;if(typeof e=="function")return e.name?e.name:(e.toString().trim().match(/^function\s*([^\s(]+)/)||[])[1];if(e.constructor&&e.constructor.name)return e.constructor.name}if(ae){Ef=vf();for(dm in Ef.filter._modifiers)Ef.filter.deattach(dm)}var Ef,dm});var mm=l((N1,mf)=>{"use strict";var kN=HE();process&&kN.gte(process.versions.node,"8.0.0")?mf.exports=QE():mf.exports=Em()});var qm=l((b,Lm)=>{b=Lm.exports=w;var U;typeof process=="object"&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG)?U=function(){var e=Array.prototype.slice.call(arguments,0);e.unshift("SEMVER"),console.log.apply(console,e)}:U=function(){};b.SEMVER_SPEC_VERSION="2.0.0";var Tf=256,Lo=Number.MAX_SAFE_INTEGER||9007199254740991,yf=16,G=b.re=[],g=b.src=[],R=0,Xn=R++;g[Xn]="0|[1-9]\\d*";var Kn=R++;g[Kn]="[0-9]+";var Cf=R++;g[Cf]="\\d*[a-zA-Z-][a-zA-Z0-9-]*";var Tm=R++;g[Tm]="("+g[Xn]+")\\.("+g[Xn]+")\\.("+g[Xn]+")";var Am=R++;g[Am]="("+g[Kn]+")\\.("+g[Kn]+")\\.("+g[Kn]+")";var Af=R++;g[Af]="(?:"+g[Xn]+"|"+g[Cf]+")";var Sf=R++;g[Sf]="(?:"+g[Kn]+"|"+g[Cf]+")";var bf=R++;g[bf]="(?:-("+g[Af]+"(?:\\."+g[Af]+")*))";var Of=R++;g[Of]="(?:-?("+g[Sf]+"(?:\\."+g[Sf]+")*))";var If=R++;g[If]="[0-9A-Za-z-]+";var ha=R++;g[ha]="(?:\\+("+g[If]+"(?:\\."+g[If]+")*))";var Pf=R++,Sm="v?"+g[Tm]+g[bf]+"?"+g[ha]+"?";g[Pf]="^"+Sm+"$";var Rf="[v=\\s]*"+g[Am]+g[Of]+"?"+g[ha]+"?",Nf=R++;g[Nf]="^"+Rf+"$";var Wn=R++;g[Wn]="((?:<|>)?=?)";var qo=R++;g[qo]=g[Kn]+"|x|X|\\*";var jo=R++;g[jo]=g[Xn]+"|x|X|\\*";var zr=R++;g[zr]="[v=\\s]*("+g[jo]+")(?:\\.("+g[jo]+")(?:\\.("+g[jo]+")(?:"+g[bf]+")?"+g[ha]+"?)?)?";var Qn=R++;g[Qn]="[v=\\s]*("+g[qo]+")(?:\\.("+g[qo]+")(?:\\.("+g[qo]+")(?:"+g[Of]+")?"+g[ha]+"?)?)?";var Im=R++;g[Im]="^"+g[Wn]+"\\s*"+g[zr]+"$";var Cm=R++;g[Cm]="^"+g[Wn]+"\\s*"+g[Qn]+"$";var bm=R++;g[bm]="(?:^|[^\\d])(\\d{1,"+yf+"})(?:\\.(\\d{1,"+yf+"}))?(?:\\.(\\d{1,"+yf+"}))?(?:$|[^\\d])";var Go=R++;g[Go]="(?:~>?)";var ko=R++;g[ko]="(\\s*)"+g[Go]+"\\s+";G[ko]=new RegExp(g[ko],"g");var HN="$1~",Om=R++;g[Om]="^"+g[Go]+g[zr]+"$";var Pm=R++;g[Pm]="^"+g[Go]+g[Qn]+"$";var Vo=R++;g[Vo]="(?:\\^)";var Ho=R++;g[Ho]="(\\s*)"+g[Vo]+"\\s+";G[Ho]=new RegExp(g[Ho],"g");var UN="$1^",Rm=R++;g[Rm]="^"+g[Vo]+g[zr]+"$";var Nm=R++;g[Nm]="^"+g[Vo]+g[Qn]+"$";var Df=R++;g[Df]="^"+g[Wn]+"\\s*("+Rf+")$|^$";var wf=R++;g[wf]="^"+g[Wn]+"\\s*("+Sm+")$|^$";var pa=R++;g[pa]="(\\s*)"+g[Wn]+"\\s*("+Rf+"|"+g[zr]+")";G[pa]=new RegExp(g[pa],"g");var BN="$1$2$3",Dm=R++;g[Dm]="^\\s*("+g[zr]+")\\s+-\\s+("+g[zr]+")\\s*$";var wm=R++;g[wm]="^\\s*("+g[Qn]+")\\s+-\\s+("+g[Qn]+")\\s*$";var xm=R++;g[xm]="(<|>)?=?\\s*\\*";for(ur=0;ur<R;ur++)U(ur,g[ur]),G[ur]||(G[ur]=new RegExp(g[ur]));var ur;b.parse=Xr;function Xr(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof w)return e;if(typeof e!="string"||e.length>Tf)return null;var r=t.loose?G[Nf]:G[Pf];if(!r.test(e))return null;try{return new w(e,t)}catch{return null}}b.valid=FN;function FN(e,t){var r=Xr(e,t);return r?r.version:null}b.clean=GN;function GN(e,t){var r=Xr(e.trim().replace(/^[=v]+/,""),t);return r?r.version:null}b.SemVer=w;function w(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof w){if(e.loose===t.loose)return e;e=e.version}else if(typeof e!="string")throw new TypeError("Invalid Version: "+e);if(e.length>Tf)throw new TypeError("version is longer than "+Tf+" characters");if(!(this instanceof w))return new w(e,t);U("SemVer",e,t),this.options=t,this.loose=!!t.loose;var r=e.trim().match(t.loose?G[Nf]:G[Pf]);if(!r)throw new TypeError("Invalid Version: "+e);if(this.raw=e,this.major=+r[1],this.minor=+r[2],this.patch=+r[3],this.major>Lo||this.major<0)throw new TypeError("Invalid major version");if(this.minor>Lo||this.minor<0)throw new TypeError("Invalid minor version");if(this.patch>Lo||this.patch<0)throw new TypeError("Invalid patch version");r[4]?this.prerelease=r[4].split(".").map(function(n){if(/^[0-9]+$/.test(n)){var i=+n;if(i>=0&&i<Lo)return i}return n}):this.prerelease=[],this.build=r[5]?r[5].split("."):[],this.format()}w.prototype.format=function(){return this.version=this.major+"."+this.minor+"."+this.patch,this.prerelease.length&&(this.version+="-"+this.prerelease.join(".")),this.version};w.prototype.toString=function(){return this.version};w.prototype.compare=function(e){return U("SemVer.compare",this.version,this.options,e),e instanceof w||(e=new w(e,this.options)),this.compareMain(e)||this.comparePre(e)};w.prototype.compareMain=function(e){return e instanceof w||(e=new w(e,this.options)),Yn(this.major,e.major)||Yn(this.minor,e.minor)||Yn(this.patch,e.patch)};w.prototype.comparePre=function(e){if(e instanceof w||(e=new w(e,this.options)),this.prerelease.length&&!e.prerelease.length)return-1;if(!this.prerelease.length&&e.prerelease.length)return 1;if(!this.prerelease.length&&!e.prerelease.length)return 0;var t=0;do{var r=this.prerelease[t],n=e.prerelease[t];if(U("prerelease compare",t,r,n),r===void 0&&n===void 0)return 0;if(n===void 0)return 1;if(r===void 0)return-1;if(r===n)continue;return Yn(r,n)}while(++t)};w.prototype.inc=function(e,t){switch(e){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",t);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",t);break;case"prepatch":this.prerelease.length=0,this.inc("patch",t),this.inc("pre",t);break;case"prerelease":this.prerelease.length===0&&this.inc("patch",t),this.inc("pre",t);break;case"major":(this.minor!==0||this.patch!==0||this.prerelease.length===0)&&this.major++,this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":(this.patch!==0||this.prerelease.length===0)&&this.minor++,this.patch=0,this.prerelease=[];break;case"patch":this.prerelease.length===0&&this.patch++,this.prerelease=[];break;case"pre":if(this.prerelease.length===0)this.prerelease=[0];else{for(var r=this.prerelease.length;--r>=0;)typeof this.prerelease[r]=="number"&&(this.prerelease[r]++,r=-2);r===-1&&this.prerelease.push(0)}t&&(this.prerelease[0]===t?isNaN(this.prerelease[1])&&(this.prerelease=[t,0]):this.prerelease=[t,0]);break;default:throw new Error("invalid increment argument: "+e)}return this.format(),this.raw=this.version,this};b.inc=VN;function VN(e,t,r,n){typeof r=="string"&&(n=r,r=void 0);try{return new w(e,r).inc(t,n).version}catch{return null}}b.diff=$N;function $N(e,t){if(xf(e,t))return null;var r=Xr(e),n=Xr(t),i="";if(r.prerelease.length||n.prerelease.length){i="pre";var a="prerelease"}for(var s in r)if((s==="major"||s==="minor"||s==="patch")&&r[s]!==n[s])return i+s;return a}b.compareIdentifiers=Yn;var ym=/^[0-9]+$/;function Yn(e,t){var r=ym.test(e),n=ym.test(t);return r&&n&&(e=+e,t=+t),e===t?0:r&&!n?-1:n&&!r?1:e<t?-1:1}b.rcompareIdentifiers=zN;function zN(e,t){return Yn(t,e)}b.major=XN;function XN(e,t){return new w(e,t).major}b.minor=KN;function KN(e,t){return new w(e,t).minor}b.patch=YN;function YN(e,t){return new w(e,t).patch}b.compare=qt;function qt(e,t,r){return new w(e,r).compare(new w(t,r))}b.compareLoose=QN;function QN(e,t){return qt(e,t,!0)}b.rcompare=WN;function WN(e,t,r){return qt(t,e,r)}b.sort=ZN;function ZN(e,t){return e.sort(function(r,n){return b.compare(r,n,t)})}b.rsort=JN;function JN(e,t){return e.sort(function(r,n){return b.rcompare(r,n,t)})}b.gt=da;function da(e,t,r){return qt(e,t,r)>0}b.lt=Uo;function Uo(e,t,r){return qt(e,t,r)<0}b.eq=xf;function xf(e,t,r){return qt(e,t,r)===0}b.neq=Mm;function Mm(e,t,r){return qt(e,t,r)!==0}b.gte=Mf;function Mf(e,t,r){return qt(e,t,r)>=0}b.lte=Lf;function Lf(e,t,r){return qt(e,t,r)<=0}b.cmp=Bo;function Bo(e,t,r,n){switch(t){case"===":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e===r;case"!==":return typeof e=="object"&&(e=e.version),typeof r=="object"&&(r=r.version),e!==r;case"":case"=":case"==":return xf(e,r,n);case"!=":return Mm(e,r,n);case">":return da(e,r,n);case">=":return Mf(e,r,n);case"<":return Uo(e,r,n);case"<=":return Lf(e,r,n);default:throw new TypeError("Invalid operator: "+t)}}b.Comparator=We;function We(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof We){if(e.loose===!!t.loose)return e;e=e.value}if(!(this instanceof We))return new We(e,t);U("comparator",e,t),this.options=t,this.loose=!!t.loose,this.parse(e),this.semver===_a?this.value="":this.value=this.operator+this.semver.version,U("comp",this)}var _a={};We.prototype.parse=function(e){var t=this.options.loose?G[Df]:G[wf],r=e.match(t);if(!r)throw new TypeError("Invalid comparator: "+e);this.operator=r[1],this.operator==="="&&(this.operator=""),r[2]?this.semver=new w(r[2],this.options.loose):this.semver=_a};We.prototype.toString=function(){return this.value};We.prototype.test=function(e){return U("Comparator.test",e,this.options.loose),this.semver===_a?!0:(typeof e=="string"&&(e=new w(e,this.options)),Bo(e,this.operator,this.semver,this.options))};We.prototype.intersects=function(e,t){if(!(e instanceof We))throw new TypeError("a Comparator is required");(!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1});var r;if(this.operator==="")return r=new ee(e.value,t),Fo(this.value,r,t);if(e.operator==="")return r=new ee(this.value,t),Fo(e.semver,r,t);var n=(this.operator===">="||this.operator===">")&&(e.operator===">="||e.operator===">"),i=(this.operator==="<="||this.operator==="<")&&(e.operator==="<="||e.operator==="<"),a=this.semver.version===e.semver.version,s=(this.operator===">="||this.operator==="<=")&&(e.operator===">="||e.operator==="<="),o=Bo(this.semver,"<",e.semver,t)&&(this.operator===">="||this.operator===">")&&(e.operator==="<="||e.operator==="<"),u=Bo(this.semver,">",e.semver,t)&&(this.operator==="<="||this.operator==="<")&&(e.operator===">="||e.operator===">");return n||i||a&&s||o||u};b.Range=ee;function ee(e,t){if((!t||typeof t!="object")&&(t={loose:!!t,includePrerelease:!1}),e instanceof ee)return e.loose===!!t.loose&&e.includePrerelease===!!t.includePrerelease?e:new ee(e.raw,t);if(e instanceof We)return new ee(e.value,t);if(!(this instanceof ee))return new ee(e,t);if(this.options=t,this.loose=!!t.loose,this.includePrerelease=!!t.includePrerelease,this.raw=e,this.set=e.split(/\s*\|\|\s*/).map(function(r){return this.parseRange(r.trim())},this).filter(function(r){return r.length}),!this.set.length)throw new TypeError("Invalid SemVer Range: "+e);this.format()}ee.prototype.format=function(){return this.range=this.set.map(function(e){return e.join(" ").trim()}).join("||").trim(),this.range};ee.prototype.toString=function(){return this.range};ee.prototype.parseRange=function(e){var t=this.options.loose;e=e.trim();var r=t?G[wm]:G[Dm];e=e.replace(r,cD),U("hyphen replace",e),e=e.replace(G[pa],BN),U("comparator trim",e,G[pa]),e=e.replace(G[ko],HN),e=e.replace(G[Ho],UN),e=e.split(/\s+/).join(" ");var n=t?G[Df]:G[wf],i=e.split(" ").map(function(a){return tD(a,this.options)},this).join(" ").split(/\s+/);return this.options.loose&&(i=i.filter(function(a){return!!a.match(n)})),i=i.map(function(a){return new We(a,this.options)},this),i};ee.prototype.intersects=function(e,t){if(!(e instanceof ee))throw new TypeError("a Range is required");return this.set.some(function(r){return r.every(function(n){return e.set.some(function(i){return i.every(function(a){return n.intersects(a,t)})})})})};b.toComparators=eD;function eD(e,t){return new ee(e,t).set.map(function(r){return r.map(function(n){return n.value}).join(" ").trim().split(" ")})}function tD(e,t){return U("comp",e,t),e=iD(e,t),U("caret",e),e=rD(e,t),U("tildes",e),e=sD(e,t),U("xrange",e),e=uD(e,t),U("stars",e),e}function Me(e){return!e||e.toLowerCase()==="x"||e==="*"}function rD(e,t){return e.trim().split(/\s+/).map(function(r){return nD(r,t)}).join(" ")}function nD(e,t){var r=t.loose?G[Pm]:G[Om];return e.replace(r,function(n,i,a,s,o){U("tilde",e,n,i,a,s,o);var u;return Me(i)?u="":Me(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":Me(s)?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":o?(U("replaceTilde pr",o),u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0"):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0",U("tilde return",u),u})}function iD(e,t){return e.trim().split(/\s+/).map(function(r){return aD(r,t)}).join(" ")}function aD(e,t){U("caret",e,t);var r=t.loose?G[Nm]:G[Rm];return e.replace(r,function(n,i,a,s,o){U("caret",e,n,i,a,s,o);var u;return Me(i)?u="":Me(a)?u=">="+i+".0.0 <"+(+i+1)+".0.0":Me(s)?i==="0"?u=">="+i+"."+a+".0 <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+".0 <"+(+i+1)+".0.0":o?(U("replaceCaret pr",o),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+"-"+o+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+"-"+o+" <"+(+i+1)+".0.0"):(U("no pr"),i==="0"?a==="0"?u=">="+i+"."+a+"."+s+" <"+i+"."+a+"."+(+s+1):u=">="+i+"."+a+"."+s+" <"+i+"."+(+a+1)+".0":u=">="+i+"."+a+"."+s+" <"+(+i+1)+".0.0"),U("caret return",u),u})}function sD(e,t){return U("replaceXRanges",e,t),e.split(/\s+/).map(function(r){return oD(r,t)}).join(" ")}function oD(e,t){e=e.trim();var r=t.loose?G[Cm]:G[Im];return e.replace(r,function(n,i,a,s,o,u){U("xRange",e,n,i,a,s,o,u);var c=Me(a),f=c||Me(s),p=f||Me(o),d=p;return i==="="&&d&&(i=""),c?i===">"||i==="<"?n="<0.0.0":n="*":i&&d?(f&&(s=0),o=0,i===">"?(i=">=",f?(a=+a+1,s=0,o=0):(s=+s+1,o=0)):i==="<="&&(i="<",f?a=+a+1:s=+s+1),n=i+a+"."+s+"."+o):f?n=">="+a+".0.0 <"+(+a+1)+".0.0":p&&(n=">="+a+"."+s+".0 <"+a+"."+(+s+1)+".0"),U("xRange return",n),n})}function uD(e,t){return U("replaceStars",e,t),e.trim().replace(G[xm],"")}function cD(e,t,r,n,i,a,s,o,u,c,f,p,d){return Me(r)?t="":Me(n)?t=">="+r+".0.0":Me(i)?t=">="+r+"."+n+".0":t=">="+t,Me(u)?o="":Me(c)?o="<"+(+u+1)+".0.0":Me(f)?o="<"+u+"."+(+c+1)+".0":p?o="<="+u+"."+c+"."+f+"-"+p:o="<="+o,(t+" "+o).trim()}ee.prototype.test=function(e){if(!e)return!1;typeof e=="string"&&(e=new w(e,this.options));for(var t=0;t<this.set.length;t++)if(lD(this.set[t],e,this.options))return!0;return!1};function lD(e,t,r){for(var n=0;n<e.length;n++)if(!e[n].test(t))return!1;if(t.prerelease.length&&!r.includePrerelease){for(n=0;n<e.length;n++)if(U(e[n].semver),e[n].semver!==_a&&e[n].semver.prerelease.length>0){var i=e[n].semver;if(i.major===t.major&&i.minor===t.minor&&i.patch===t.patch)return!0}return!1}return!0}b.satisfies=Fo;function Fo(e,t,r){try{t=new ee(t,r)}catch{return!1}return t.test(e)}b.maxSatisfying=fD;function fD(e,t,r){var n=null,i=null;try{var a=new ee(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===-1)&&(n=s,i=new w(n,r))}),n}b.minSatisfying=pD;function pD(e,t,r){var n=null,i=null;try{var a=new ee(t,r)}catch{return null}return e.forEach(function(s){a.test(s)&&(!n||i.compare(s)===1)&&(n=s,i=new w(n,r))}),n}b.minVersion=dD;function dD(e,t){e=new ee(e,t);var r=new w("0.0.0");if(e.test(r)||(r=new w("0.0.0-0"),e.test(r)))return r;r=null;for(var n=0;n<e.set.length;++n){var i=e.set[n];i.forEach(function(a){var s=new w(a.semver.version);switch(a.operator){case">":s.prerelease.length===0?s.patch++:s.prerelease.push(0),s.raw=s.format();case"":case">=":(!r||da(r,s))&&(r=s);break;case"<":case"<=":break;default:throw new Error("Unexpected operation: "+a.operator)}})}return r&&e.test(r)?r:null}b.validRange=hD;function hD(e,t){try{return new ee(e,t).range||"*"}catch{return null}}b.ltr=_D;function _D(e,t,r){return qf(e,t,"<",r)}b.gtr=vD;function vD(e,t,r){return qf(e,t,">",r)}b.outside=qf;function qf(e,t,r,n){e=new w(e,n),t=new ee(t,n);var i,a,s,o,u;switch(r){case">":i=da,a=Lf,s=Uo,o=">",u=">=";break;case"<":i=Uo,a=Mf,s=da,o="<",u="<=";break;default:throw new TypeError('Must provide a hilo val of "<" or ">"')}if(Fo(e,t,n))return!1;for(var c=0;c<t.set.length;++c){var f=t.set[c],p=null,d=null;if(f.forEach(function(h){h.semver===_a&&(h=new We(">=0.0.0")),p=p||h,d=d||h,i(h.semver,p.semver,n)?p=h:s(h.semver,d.semver,n)&&(d=h)}),p.operator===o||p.operator===u||(!d.operator||d.operator===o)&&a(e,d.semver))return!1;if(d.operator===u&&s(e,d.semver))return!1}return!0}b.prerelease=gD;function gD(e,t){var r=Xr(e,t);return r&&r.prerelease.length?r.prerelease:null}b.intersects=ED;function ED(e,t,r){return e=new ee(e,r),t=new ee(t,r),e.intersects(t)}b.coerce=mD;function mD(e){if(e instanceof w)return e;if(typeof e!="string")return null;var t=e.match(G[bm]);return t==null?null:Xr(t[1]+"."+(t[2]||"0")+"."+(t[3]||"0"))}});var Hm=l((D1,km)=>{var yD=Po().wrap,kf=1<<0,Hf=1<<1,Uf=1<<2,zo=1<<3,V=[],TD=0,Oe=!1,cr=[],Zn,Bf;function Ff(e,t){var r=e.length,n=t.length,i=[];if(r===0&&n===0)return i;for(var a=0;a<r;a++)i[a]=e[a];if(n===0)return i;for(var s=0;s<n;s++){var o=!0;for(a=0;a<r;a++)if(e[a].uid===t[s].uid){o=!1;break}o&&i.push(t[s])}return i}process._fatalException?($o=!1,Zn=function(t){var r=V.length;if($o||r===0)return!1;var n=!1;$o=!0;for(var i=0;i<r;++i){var a=V[i];if((a.flags&zo)!==0){var s=Jn&&Jn[a.uid];n=a.error(s,t)||n}}return $o=!1,cr.length>0&&(V=cr.pop()),Jn=void 0,n&&!Oe},Bf=function(t,r,n){var i=[];Oe=!0;for(var a=0;a<n;++a){var s=r[a];if(i[s.uid]=s.data,(s.flags&kf)!==0){var o=s.create(s.data);o!==void 0&&(i[s.uid]=o)}}return Oe=!1,function(){Jn=i,cr.push(V),V=Ff(r,V),Oe=!0;for(var u=0;u<n;++u)(r[u].flags&Hf)>0&&r[u].before(this,i[r[u].uid]);Oe=!1;var c=t.apply(this,arguments);for(Oe=!0,u=0;u<n;++u)(r[u].flags&Uf)>0&&r[u].after(this,i[r[u].uid]);return Oe=!1,V=cr.pop(),Jn=void 0,c}},yD(process,"_fatalException",function(e){return function(r){return Zn(r)||e(r)}})):(jf=!1,Zn=function(t){if(jf)throw t;for(var r=!1,n=V.length,i=0;i<n;++i){var a=V[i];(a.flags&zo)!==0&&(r=a.error(null,t)||r)}if(!r&&Oe)throw t},Bf=function(t,r,n){var i=[];Oe=!0;for(var a=0;a<n;++a){var s=r[a];if(i[s.uid]=s.data,(s.flags&kf)!==0){var o=s.create(s.data);o!==void 0&&(i[s.uid]=o)}}return Oe=!1,function(){var u=!1,c=!1;cr.push(V),V=Ff(r,V),Oe=!0;for(var f=0;f<n;++f)(r[f].flags&Hf)>0&&r[f].before(this,i[r[f].uid]);Oe=!1;var p;try{p=t.apply(this,arguments)}catch(d){u=!0;for(var f=0;f<n;++f)if((V[f].flags&zo)!=0)try{c=V[f].error(i[r[f].uid],d)||c}catch(E){throw jf=!0,E}if(!c)throw process.removeListener("uncaughtException",Zn),process._originalNextTick(function(){process.addListener("uncaughtException",Zn)}),d}finally{if(!u||c){for(Oe=!0,f=0;f<n;++f)(r[f].flags&Uf)>0&&r[f].after(this,i[r[f].uid]);Oe=!1}V=cr.pop()}return p}},process.addListener("uncaughtException",Zn));var $o,Jn,jf;function AD(e,t,r){Oe=!0;for(var n=0;n<r;++n){var i=t[n];i.create&&i.create(i.data)}return Oe=!1,function(){cr.push(V),V=Ff(t,V);var a=e.apply(this,arguments);return V=cr.pop(),a}}function SD(e){var t=V.length;if(t===0)return e;for(var r=V.slice(),n=0;n<t;++n)if(r[n].flags>0)return Bf(e,r,t);return AD(e,r,t)}function vt(e,t){typeof e.create=="function"&&(this.create=e.create,this.flags|=kf),typeof e.before=="function"&&(this.before=e.before,this.flags|=Hf),typeof e.after=="function"&&(this.after=e.after,this.flags|=Uf),typeof e.error=="function"&&(this.error=e.error,this.flags|=zo),this.uid=++TD,this.data=t===void 0?null:t}vt.prototype.create=void 0;vt.prototype.before=void 0;vt.prototype.after=void 0;vt.prototype.error=void 0;vt.prototype.data=void 0;vt.prototype.uid=0;vt.prototype.flags=0;function jm(e,t){if(typeof e!="object"||!e)throw new TypeError("callbacks argument must be an object");return e instanceof vt?e:new vt(e,t)}function ID(e,t){var r;e instanceof vt?r=e:r=jm(e,t);for(var n=!1,i=0;i<V.length;i++)if(r===V[i]){n=!0;break}return n||V.push(r),r}function CD(e){for(var t=0;t<V.length;t++)if(e===V[t]){V.splice(t,1);break}}process.createAsyncListener=jm;process.addAsyncListener=ID;process.removeAsyncListener=CD;km.exports=SD});var Bm=l((x1,Um)=>{"use strict";Um.exports=(e,t)=>class extends e{constructor(n){var i,a;super(o);var s=this;try{n.apply(i,a)}catch(u){a[1](u)}return s;function o(u,c){i=this,a=[f,p];function f(d){return t(s,!1),u(d)}function p(d){return t(s,!1),c(d)}}}}});var Km=l(()=>{"use strict";if(process.addAsyncListener)throw new Error("Don't require polyfill unless needed");var $m=Po(),Ko=qm(),je=$m.wrap,lr=$m.massWrap,te=Hm(),bD=__webpack_require__(26),OD=Ko.gte(process.version,"6.0.0"),$f=Ko.gte(process.version,"7.0.0"),PD=Ko.gte(process.version,"8.0.0"),RD=Ko.gte(process.version,"11.0.0"),gt=__webpack_require__(38);$f&&!gt._normalizeArgs?gt._normalizeArgs=function(e){if(e.length===0)return[{},null];var t=e[0],r={};typeof t=="object"&&t!==null?r=t:MD(t)?r.path=t:(r.port=t,e.length>1&&typeof e[1]=="string"&&(r.host=e[1]));var n=e[e.length-1];return typeof n!="function"?[r,null]:[r,n]}:!$f&&!gt._normalizeConnectArgs&&(gt._normalizeConnectArgs=function(e){var t={};function r(i){return(i=Number(i))>=0?i:!1}typeof e[0]=="object"&&e[0]!==null?t=e[0]:typeof e[0]=="string"&&r(e[0])===!1?t.path=e[0]:(t.port=e[0],typeof e[1]=="string"&&(t.host=e[1]));var n=e[e.length-1];return typeof n=="function"?[t,n]:[t]});"_setUpListenHandle"in gt.Server.prototype?je(gt.Server.prototype,"_setUpListenHandle",Fm):je(gt.Server.prototype,"_listen2",Fm);function Fm(e){return function(){this.on("connection",function(t){t._handle&&(t._handle.onread=te(t._handle.onread))});try{return e.apply(this,arguments)}finally{this._handle&&this._handle.onconnection&&(this._handle.onconnection=te(this._handle.onconnection))}}}function zm(e){if(e&&e._handle){var t=e._handle;t._originalOnread||(t._originalOnread=t.onread),t.onread=te(t._originalOnread)}}je(gt.Socket.prototype,"connect",function(e){return function(){var t;PD&&Array.isArray(arguments[0])&&Object.getOwnPropertySymbols(arguments[0]).length>0?t=arguments[0]:t=$f?gt._normalizeArgs(arguments):gt._normalizeConnectArgs(arguments),t[1]&&(t[1]=te(t[1]));var r=e.apply(this,t);return zm(this),r}});var ND=__webpack_require__(31);je(ND.Agent.prototype,"addRequest",function(e){return function(t){var r=t.onSocket;return t.onSocket=te(function(n){return zm(n),r.apply(this,arguments)}),e.apply(this,arguments)}});var Gf=__webpack_require__(39);function Gm(e){Array.isArray(e.stdio)&&e.stdio.forEach(function(t){t&&t._handle&&(t._handle.onread=te(t._handle.onread),je(t._handle,"close",Yo))}),e._handle&&(e._handle.onexit=te(e._handle.onexit))}Gf.ChildProcess?je(Gf.ChildProcess.prototype,"spawn",function(e){return function(){var t=e.apply(this,arguments);return Gm(this),t}}):lr(Gf,["execFile","fork","spawn"],function(e){return function(){var t=e.apply(this,arguments);return Gm(t),t}});process._fatalException||(process._originalNextTick=process.nextTick);var Kf=[];process._nextDomainTick&&Kf.push("_nextDomainTick");process._tickDomainCallback&&Kf.push("_tickDomainCallback");lr(process,Kf,Et);je(process,"nextTick",Yo);var Yf=["setTimeout","setInterval"];global.setImmediate&&Yf.push("setImmediate");var Xm=__webpack_require__(37),DD=global.setTimeout===Xm.setTimeout;lr(Xm,Yf,Yo);DD&&lr(global,Yf,Yo);var zf=__webpack_require__(40);lr(zf,["lookup","resolve","resolve4","resolve6","resolveCname","resolveMx","resolveNs","resolveTxt","resolveSrv","reverse"],Et);zf.resolveNaptr&&je(zf,"resolveNaptr",Et);var Yr=__webpack_require__(3);lr(Yr,["watch","rename","truncate","chown","fchown","chmod","fchmod","stat","lstat","fstat","link","symlink","readlink","realpath","unlink","rmdir","mkdir","readdir","close","open","utimes","futimes","fsync","write","read","readFile","writeFile","appendFile","watchFile","unwatchFile","exists"],Et);Yr.lchown&&je(Yr,"lchown",Et);Yr.lchmod&&je(Yr,"lchmod",Et);Yr.ftruncate&&je(Yr,"ftruncate",Et);var va;try{va=__webpack_require__(41)}catch{}va&&va.Deflate&&va.Deflate.prototype&&(Kr=Object.getPrototypeOf(va.Deflate.prototype),Kr._transform?je(Kr,"_transform",Et):Kr.write&&Kr.flush&&Kr.end&&lr(Kr,["write","flush","end"],Et));var Kr,Xf;try{Xf=__webpack_require__(7)}catch{}Xf&&(Vf=["pbkdf2","randomBytes"],RD||Vf.push("pseudoRandomBytes"),lr(Xf,Vf,Et));var Vf,Xo=!!global.Promise&&Promise.toString()==="function Promise() { [native code] }"&&Promise.toString.toString()==="function toString() { [native code] }";Xo&&(Vm=process.addAsyncListener({create:function(){Xo=!1}}),global.Promise.resolve(!0).then(function(){Xo=!1}),process.removeAsyncListener(Vm));var Vm;Xo&&wD();function wD(){var e=global.Promise;function t(s){if(!(this instanceof t))return e(s);if(typeof s!="function")return new e(s);var o,u,c=new e(f);c.__proto__=t.prototype;try{s.apply(o,u)}catch(p){u[1](p)}return c;function f(p,d){o=this,u=[h,E];function h(A){return n(c,!1),p(A)}function E(A){return n(c,!1),d(A)}}}if(bD.inherits(t,e),je(e.prototype,"then",a),e.prototype.chain&&je(e.prototype,"chain",a),OD)global.Promise=Bm()(e,n);else{var r=["all","race","reject","resolve","accept","defer"];r.forEach(function(s){typeof e[s]=="function"&&(t[s]=e[s])}),global.Promise=t}function n(s,o){(!s.__asl_wrapper||o)&&(s.__asl_wrapper=te(i))}function i(s,o,u,c){var f;try{return f=o.call(s,u),{returnVal:f,error:!1}}catch(p){return{errorVal:p,error:!0}}finally{f instanceof e?c.__asl_wrapper=function(){var d=f.__asl_wrapper||i;return d.apply(this,arguments)}:n(c,!0)}}function a(s){return function(){var u=this,c=s.apply(u,Array.prototype.map.call(arguments,f));return c.__asl_wrapper=function(d,h,E,A){return u.__asl_wrapper?(u.__asl_wrapper(d,function(){},null,c),c.__asl_wrapper(d,h,E,A)):i(d,h,E,A)},c;function f(p){return typeof p!="function"?p:te(function(d){var h=(u.__asl_wrapper||i)(this,p,d,c);if(h.error)throw h.errorVal;return h.returnVal})}}}}function Et(e){var t=function(){var r,n=arguments.length-1;if(typeof arguments[n]=="function"){r=Array(arguments.length);for(var i=0;i<arguments.length-1;i++)r[i]=arguments[i];r[n]=te(arguments[n])}return e.apply(this,r||arguments)};switch(e.length){case 1:return function(r){return arguments.length!==1?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r))};case 2:return function(r,n){return arguments.length!==2?t.apply(this,arguments):(typeof n=="function"&&(n=te(n)),e.call(this,r,n))};case 3:return function(r,n,i){return arguments.length!==3?t.apply(this,arguments):(typeof i=="function"&&(i=te(i)),e.call(this,r,n,i))};case 4:return function(r,n,i,a){return arguments.length!==4?t.apply(this,arguments):(typeof a=="function"&&(a=te(a)),e.call(this,r,n,i,a))};case 5:return function(r,n,i,a,s){return arguments.length!==5?t.apply(this,arguments):(typeof s=="function"&&(s=te(s)),e.call(this,r,n,i,a,s))};case 6:return function(r,n,i,a,s,o){return arguments.length!==6?t.apply(this,arguments):(typeof o=="function"&&(o=te(o)),e.call(this,r,n,i,a,s,o))};default:return t}}function Yo(e){var t=function(){var r;if(typeof arguments[0]=="function"){r=Array(arguments.length),r[0]=te(arguments[0]);for(var n=1;n<arguments.length;n++)r[n]=arguments[n]}return e.apply(this,r||arguments)};switch(e.length){case 1:return function(r){return arguments.length!==1?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r))};case 2:return function(r,n){return arguments.length!==2?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r,n))};case 3:return function(r,n,i){return arguments.length!==3?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r,n,i))};case 4:return function(r,n,i,a){return arguments.length!==4?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r,n,i,a))};case 5:return function(r,n,i,a,s){return arguments.length!==5?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r,n,i,a,s))};case 6:return function(r,n,i,a,s,o){return arguments.length!==6?t.apply(this,arguments):(typeof r=="function"&&(r=te(r)),e.call(this,r,n,i,a,s,o))};default:return t}}function xD(e){return(e=Number(e))>=0?e:!1}function MD(e){return typeof e=="string"&&xD(e)===!1}});var Jm=l((q1,Zm)=>{"use strict";var jt=__webpack_require__(35),LD=Do(),ga="cls@contexts",Qf="error@context";process.addAsyncListener||Km();function st(e){this.name=e,this.active=null,this._set=[],this.id=null}st.prototype.set=function(e,t){if(!this.active)throw new Error("No context available. ns.run() or ns.bind() must be called first.");return this.active[e]=t,t};st.prototype.get=function(e){if(!!this.active)return this.active[e]};st.prototype.createContext=function(){return Object.create(this.active)};st.prototype.run=function(e){var t=this.createContext();this.enter(t);try{return e(t),t}catch(r){throw r&&(r[Qf]=t),r}finally{this.exit(t)}};st.prototype.runAndReturn=function(e){var t;return this.run(function(r){t=e(r)}),t};st.prototype.bind=function(e,t){t||(this.active?t=this.active:t=this.createContext());var r=this;return function(){r.enter(t);try{return e.apply(this,arguments)}catch(n){throw n&&(n[Qf]=t),n}finally{r.exit(t)}}};st.prototype.enter=function(e){jt.ok(e,"context must be provided for entering"),this._set.push(this.active),this.active=e};st.prototype.exit=function(e){if(jt.ok(e,"context must be provided for exiting"),this.active===e){jt.ok(this._set.length,"can't remove top context"),this.active=this._set.pop();return}var t=this._set.lastIndexOf(e);jt.ok(t>=0,"context not currently entered; can't exit"),jt.ok(t,"can't remove top context"),this._set.splice(t,1)};st.prototype.bindEmitter=function(e){jt.ok(e.on&&e.addListener&&e.emit,"can only bind real EEs");var t=this,r="context@"+this.name;function n(a){!a||(a[ga]||(a[ga]=Object.create(null)),a[ga][r]={namespace:t,context:t.active})}function i(a){if(!(a&&a[ga]))return a;var s=a,o=a[ga];return Object.keys(o).forEach(function(u){var c=o[u];s=c.namespace.bind(s,c.context)}),s}LD(e,n,i)};st.prototype.fromException=function(e){return e[Qf]};function Ym(e){return process.namespaces[e]}function qD(e){jt.ok(e,"namespace must be given a name!");var t=new st(e);return t.id=process.addAsyncListener({create:function(){return t.active},before:function(r,n){n&&t.enter(n)},after:function(r,n){n&&t.exit(n)},error:function(r){r&&t.exit(r)}}),process.namespaces[e]=t,t}function Qm(e){var t=Ym(e);jt.ok(t,"can't delete nonexistent namespace!"),jt.ok(t.id,"don't assign to process.namespaces directly!"),process.removeAsyncListener(t.id),process.namespaces[e]=null}function Wm(){process.namespaces&&Object.keys(process.namespaces).forEach(function(e){Qm(e)}),process.namespaces=Object.create(null)}process.namespaces||Wm();Zm.exports={getNamespace:Ym,createNamespace:qD,destroyNamespace:Qm,reset:Wm}});var Er=l(Qo=>{"use strict";Object.defineProperty(Qo,"__esModule",{value:!0});Qo.CorrelationContextManager=void 0;var ty=_e(),jD=po(),ei=Qi(),Wf=Al(),ey=Bl(),kD=function(){function e(){}return e.getCurrentContext=function(){if(!e.enabled)return null;var t=e.session.get(e.CONTEXT_NAME);return t===void 0?null:t},e.generateContextObject=function(t,r,n,i,a,s){return r=r||t,this.enabled?{operation:{name:n,id:t,parentId:r,traceparent:a,tracestate:s},customProperties:new HD(i)}:null},e.spanToContextObject=function(t,r,n){var i=new ei;return i.traceId=t.traceId,i.spanId=t.spanId,i.traceFlag=ei.formatOpenTelemetryTraceFlags(t.traceFlags)||ei.DEFAULT_TRACE_FLAG,i.parentId=r,e.generateContextObject(i.traceId,i.parentId,n,null,i)},e.runWithContext=function(t,r){var n;return e.enabled?e.session.bind(r,(n={},n[e.CONTEXT_NAME]=t,n))():r()},e.wrapEmitter=function(t){e.enabled&&e.session.bindEmitter(t)},e.wrapCallback=function(t,r){var n;return e.enabled?e.session.bind(t,r?(n={},n[e.CONTEXT_NAME]=r,n):void 0):t},e.enable=function(t){if(!this.enabled){if(!this.isNodeVersionCompatible()){this.enabled=!1;return}e.hasEverEnabled||(this.forceClsHooked=t,this.hasEverEnabled=!0,typeof this.cls>"u"&&(e.forceClsHooked===!0||e.forceClsHooked===void 0&&e.shouldUseClsHooked()?this.cls=mm():this.cls=Jm()),e.session=this.cls.createNamespace("AI-CLS-Session"),jD.registerContextPreservation(function(r){return e.session.bind(r)})),this.enabled=!0}},e.startOperation=function(t,r){var n=t&&t.traceContext||null,i=t&&t.traceId?t:null,a=t&&t.headers;if(i){var s=new ei("00-"+i.traceId+"-"+i.spanId+"-01"),o=new Wf(i.traceState?i.traceState.serialize():null),u=e.generateContextObject(i.traceId,"|"+i.traceId+"."+i.spanId+".",typeof r=="string"?r:"",void 0,s,o);return u}if(n){var s=new ei(n.traceparent),o=new Wf(n.tracestate),c=typeof r=="object"?new ey(r):null,u=e.generateContextObject(s.traceId,s.parentId,typeof r=="string"?r:c.getOperationName({}),c&&c.getCorrelationContextHeader()||void 0,s,o);return u}if(a){var s=new ei(a.traceparent?a.traceparent.toString():null),o=new Wf(a.tracestate?a.tracestate.toString():null),c=new ey(t),u=e.generateContextObject(s.traceId,s.parentId,c.getOperationName({}),c.getCorrelationContextHeader(),s,o);return u}return ty.warn("startOperation was called with invalid arguments",arguments),null},e.disable=function(){this.enabled=!1},e.reset=function(){e.hasEverEnabled&&(e.session=null,e.session=this.cls.createNamespace("AI-CLS-Session"))},e.isNodeVersionCompatible=function(){var t=process.versions.node.split(".");return parseInt(t[0])>3||parseInt(t[0])>2&&parseInt(t[1])>2},e.shouldUseClsHooked=function(){var t=process.versions.node.split(".");return parseInt(t[0])>8||parseInt(t[0])>=8&&parseInt(t[1])>=2},e.canUseClsHooked=function(){var t=process.versions.node.split("."),r=parseInt(t[0])>8||parseInt(t[0])>=8&&parseInt(t[1])>=0,n=parseInt(t[0])<8||parseInt(t[0])<=8&&parseInt(t[1])<2,i=parseInt(t[0])>4||parseInt(t[0])>=4&&parseInt(t[1])>=7;return!(r&&n)&&i},e.enabled=!1,e.hasEverEnabled=!1,e.forceClsHooked=void 0,e.CONTEXT_NAME="ApplicationInsights-Context",e}();Qo.CorrelationContextManager=kD;var HD=function(){function e(t){this.props=[],this.addHeaderData(t)}return e.prototype.addHeaderData=function(t){var r=t?t.split(", "):[];this.props=r.map(function(n){var i=n.split("=");return{key:i[0],value:i[1]}}).concat(this.props)},e.prototype.serializeToHeader=function(){return this.props.map(function(t){return t.key+"="+t.value}).join(", ")},e.prototype.getProperty=function(t){for(var r=0;r<this.props.length;++r){var n=this.props[r];if(n.key===t)return n.value}},e.prototype.setProperty=function(t,r){if(e.bannedCharacters.test(t)||e.bannedCharacters.test(r)){ty.warn("Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: "+t+" and value: "+r);return}for(var n=0;n<this.props.length;++n){var i=this.props[n];if(i.key===t){i.value=r;return}}this.props.push({key:t,value:r})},e.bannedCharacters=/[,=]/,e}()});var ny=l(ti=>{"use strict";Object.defineProperty(ti,"__esModule",{value:!0});ti.dispose=ti.enable=void 0;var ry=De(),Zf=oe(),Qr=[],Jf=function(e){var t=e.data.message;Qr.forEach(function(r){t instanceof Error?r.trackException({exception:t}):(t.lastIndexOf(`
`)==t.length-1&&(t=t.substring(0,t.length-1)),r.trackTrace({message:t,severity:e.data.stderr?ry.SeverityLevel.Warning:ry.SeverityLevel.Information}))})};function UD(e,t){e?(Qr.length===0&&Zf.channel.subscribe("console",Jf),Qr.push(t)):(Qr=Qr.filter(function(r){return r!=t}),Qr.length===0&&Zf.channel.unsubscribe("console",Jf))}ti.enable=UD;function BD(){Zf.channel.unsubscribe("console",Jf),Qr=[]}ti.dispose=BD});var iy=l(ni=>{"use strict";Object.defineProperty(ni,"__esModule",{value:!0});ni.dispose=ni.enable=void 0;var ri=De(),ep=oe(),Wr=[],FD={10:ri.SeverityLevel.Verbose,20:ri.SeverityLevel.Verbose,30:ri.SeverityLevel.Information,40:ri.SeverityLevel.Warning,50:ri.SeverityLevel.Error,60:ri.SeverityLevel.Critical},tp=function(e){var t=e.data.result;Wr.forEach(function(r){var n=FD[e.data.level];t instanceof Error?r.trackException({exception:t}):r.trackTrace({message:t,severity:n})})};function GD(e,t){e?(Wr.length===0&&ep.channel.subscribe("bunyan",tp),Wr.push(t)):(Wr=Wr.filter(function(r){return r!=t}),Wr.length===0&&ep.channel.unsubscribe("bunyan",tp))}ni.enable=GD;function VD(){ep.channel.unsubscribe("bunyan",tp),Wr=[]}ni.dispose=VD});var ay=l(ii=>{"use strict";Object.defineProperty(ii,"__esModule",{value:!0});ii.dispose=ii.enable=void 0;var Te=De(),rp=oe(),Zr=[],$D={syslog:function(e){var t={emerg:Te.SeverityLevel.Critical,alert:Te.SeverityLevel.Critical,crit:Te.SeverityLevel.Critical,error:Te.SeverityLevel.Error,warning:Te.SeverityLevel.Warning,notice:Te.SeverityLevel.Information,info:Te.SeverityLevel.Information,debug:Te.SeverityLevel.Verbose};return t[e]===void 0?Te.SeverityLevel.Information:t[e]},npm:function(e){var t={error:Te.SeverityLevel.Error,warn:Te.SeverityLevel.Warning,info:Te.SeverityLevel.Information,verbose:Te.SeverityLevel.Verbose,debug:Te.SeverityLevel.Verbose,silly:Te.SeverityLevel.Verbose};return t[e]===void 0?Te.SeverityLevel.Information:t[e]},unknown:function(e){return Te.SeverityLevel.Information}},np=function(e){var t=e.data.message;Zr.forEach(function(r){if(t instanceof Error)r.trackException({exception:t,properties:e.data.meta});else{var n=$D[e.data.levelKind](e.data.level);r.trackTrace({message:t,severity:n,properties:e.data.meta})}})};function zD(e,t){e?(Zr.length===0&&rp.channel.subscribe("winston",np),Zr.push(t)):(Zr=Zr.filter(function(r){return r!=t}),Zr.length===0&&rp.channel.unsubscribe("winston",np))}ii.enable=zD;function XD(){rp.channel.unsubscribe("winston",np),Zr=[]}ii.dispose=XD});var oy=l((B1,sy)=>{"use strict";var KD=po(),YD=function(){function e(t){if(e.INSTANCE)throw new Error("Console logging adapter tracking should be configured from the applicationInsights object");this._client=t,e.INSTANCE=this}return e.prototype.enable=function(t,r){KD.IsInitialized&&(ny().enable(t&&r,this._client),iy().enable(t,this._client),ay().enable(t,this._client))},e.prototype.isInitialized=function(){return this._isInitialized},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1,!1)},e._methodNames=["debug","info","log","warn","error"],e}();sy.exports=YD});var cy=l((F1,uy)=>{"use strict";var QD=function(){function e(t){if(e.INSTANCE)throw new Error("Exception tracking should be configured from the applicationInsights object");e.INSTANCE=this,this._client=t;var r=process.versions.node.split(".");e._canUseUncaughtExceptionMonitor=parseInt(r[0])>13||parseInt(r[0])===13&&parseInt(r[1])>=7}return e.prototype.isInitialized=function(){return this._isInitialized},e.prototype.enable=function(t){var r=this;if(t){this._isInitialized=!0;var n=this;if(!this._exceptionListenerHandle){var i=function(a,s,o){o===void 0&&(o=new Error(e._FALLBACK_ERROR_MESSAGE)),r._client.trackException({exception:o}),r._client.flush({isAppCrashing:!0}),a&&s&&process.listeners(s).length===1&&(console.error(o),process.exit(1))};e._canUseUncaughtExceptionMonitor?(this._exceptionListenerHandle=i.bind(this,!1,void 0),process.on(e.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,this._exceptionListenerHandle)):(this._exceptionListenerHandle=i.bind(this,!0,e.UNCAUGHT_EXCEPTION_HANDLER_NAME),this._rejectionListenerHandle=i.bind(this,!1,void 0),process.on(e.UNCAUGHT_EXCEPTION_HANDLER_NAME,this._exceptionListenerHandle),process.on(e.UNHANDLED_REJECTION_HANDLER_NAME,this._rejectionListenerHandle))}}else this._exceptionListenerHandle&&(e._canUseUncaughtExceptionMonitor?process.removeListener(e.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,this._exceptionListenerHandle):(process.removeListener(e.UNCAUGHT_EXCEPTION_HANDLER_NAME,this._exceptionListenerHandle),process.removeListener(e.UNHANDLED_REJECTION_HANDLER_NAME,this._rejectionListenerHandle)),this._exceptionListenerHandle=void 0,this._rejectionListenerHandle=void 0,delete this._exceptionListenerHandle,delete this._rejectionListenerHandle)},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1},e.INSTANCE=null,e.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME="uncaughtExceptionMonitor",e.UNCAUGHT_EXCEPTION_HANDLER_NAME="uncaughtException",e.UNHANDLED_REJECTION_HANDLER_NAME="unhandledRejection",e._RETHROW_EXIT_MESSAGE="Application Insights Rethrow Exception Handler",e._FALLBACK_ERROR_MESSAGE="A promise was rejected without providing an error. Application Insights generated this error stack for you.",e._canUseUncaughtExceptionMonitor=!1,e}();uy.exports=QD});var kt=l(T=>{"use strict";var ot;Object.defineProperty(T,"__esModule",{value:!0});T.HeartBeatMetricName=T.DependencyTypeName=T.SpanAttribute=T.TelemetryTypeStringToQuickPulseDocumentType=T.TelemetryTypeStringToQuickPulseType=T.QuickPulseType=T.QuickPulseDocumentType=T.PerformanceToQuickPulseCounter=T.MetricId=T.PerformanceCounter=T.QuickPulseCounter=T.DEFAULT_LIVEMETRICS_HOST=T.DEFAULT_LIVEMETRICS_ENDPOINT=T.DEFAULT_BREEZE_ENDPOINT=void 0;T.DEFAULT_BREEZE_ENDPOINT="https://dc.services.visualstudio.com";T.DEFAULT_LIVEMETRICS_ENDPOINT="https://rt.services.visualstudio.com";T.DEFAULT_LIVEMETRICS_HOST="rt.services.visualstudio.com";var Pe;(function(e){e.COMMITTED_BYTES="\\Memory\\Committed Bytes",e.PROCESSOR_TIME="\\Processor(_Total)\\% Processor Time",e.REQUEST_RATE="\\ApplicationInsights\\Requests/Sec",e.REQUEST_FAILURE_RATE="\\ApplicationInsights\\Requests Failed/Sec",e.REQUEST_DURATION="\\ApplicationInsights\\Request Duration",e.DEPENDENCY_RATE="\\ApplicationInsights\\Dependency Calls/Sec",e.DEPENDENCY_FAILURE_RATE="\\ApplicationInsights\\Dependency Calls Failed/Sec",e.DEPENDENCY_DURATION="\\ApplicationInsights\\Dependency Call Duration",e.EXCEPTION_RATE="\\ApplicationInsights\\Exceptions/Sec"})(Pe=T.QuickPulseCounter||(T.QuickPulseCounter={}));var Wo;(function(e){e.PRIVATE_BYTES="\\Process(??APP_WIN32_PROC??)\\Private Bytes",e.AVAILABLE_BYTES="\\Memory\\Available Bytes",e.PROCESSOR_TIME="\\Processor(_Total)\\% Processor Time",e.PROCESS_TIME="\\Process(??APP_WIN32_PROC??)\\% Processor Time",e.REQUEST_RATE="\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",e.REQUEST_DURATION="\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time"})(Wo=T.PerformanceCounter||(T.PerformanceCounter={}));var WD;(function(e){e.REQUESTS_DURATION="requests/duration",e.DEPENDENCIES_DURATION="dependencies/duration",e.EXCEPTIONS_COUNT="exceptions/count",e.TRACES_COUNT="traces/count"})(WD=T.MetricId||(T.MetricId={}));T.PerformanceToQuickPulseCounter=(ot={},ot[Wo.PROCESSOR_TIME]=Pe.PROCESSOR_TIME,ot[Wo.REQUEST_RATE]=Pe.REQUEST_RATE,ot[Wo.REQUEST_DURATION]=Pe.REQUEST_DURATION,ot[Pe.COMMITTED_BYTES]=Pe.COMMITTED_BYTES,ot[Pe.REQUEST_FAILURE_RATE]=Pe.REQUEST_FAILURE_RATE,ot[Pe.DEPENDENCY_RATE]=Pe.DEPENDENCY_RATE,ot[Pe.DEPENDENCY_FAILURE_RATE]=Pe.DEPENDENCY_FAILURE_RATE,ot[Pe.DEPENDENCY_DURATION]=Pe.DEPENDENCY_DURATION,ot[Pe.EXCEPTION_RATE]=Pe.EXCEPTION_RATE,ot);T.QuickPulseDocumentType={Event:"Event",Exception:"Exception",Trace:"Trace",Metric:"Metric",Request:"Request",Dependency:"RemoteDependency",Availability:"Availability",PageView:"PageView"};T.QuickPulseType={Event:"EventTelemetryDocument",Exception:"ExceptionTelemetryDocument",Trace:"TraceTelemetryDocument",Metric:"MetricTelemetryDocument",Request:"RequestTelemetryDocument",Dependency:"DependencyTelemetryDocument",Availability:"AvailabilityTelemetryDocument",PageView:"PageViewTelemetryDocument"};T.TelemetryTypeStringToQuickPulseType={EventData:T.QuickPulseType.Event,ExceptionData:T.QuickPulseType.Exception,MessageData:T.QuickPulseType.Trace,MetricData:T.QuickPulseType.Metric,RequestData:T.QuickPulseType.Request,RemoteDependencyData:T.QuickPulseType.Dependency,AvailabilityData:T.QuickPulseType.Availability,PageViewData:T.QuickPulseType.PageView};T.TelemetryTypeStringToQuickPulseDocumentType={EventData:T.QuickPulseDocumentType.Event,ExceptionData:T.QuickPulseDocumentType.Exception,MessageData:T.QuickPulseDocumentType.Trace,MetricData:T.QuickPulseDocumentType.Metric,RequestData:T.QuickPulseDocumentType.Request,RemoteDependencyData:T.QuickPulseDocumentType.Dependency,AvailabilityData:T.QuickPulseDocumentType.Availability,PageViewData:T.QuickPulseDocumentType.PageView};T.SpanAttribute={HttpHost:"http.host",HttpMethod:"http.method",HttpPort:"http.port",HttpStatusCode:"http.status_code",HttpUrl:"http.url",HttpUserAgent:"http.user_agent",GrpcMethod:"grpc.method",GrpcService:"rpc.service"};T.DependencyTypeName={Grpc:"GRPC",Http:"HTTP",InProc:"InProc"};T.HeartBeatMetricName="HeartBeat"});var Jo=l((V1,ly)=>{"use strict";var Zo=__webpack_require__(24),Ze=kt(),ZD=function(){function e(t,r,n){r===void 0&&(r=6e4),n===void 0&&(n=!1),this._lastIntervalRequestExecutionTime=0,this._lastIntervalDependencyExecutionTime=0,e.INSTANCE||(e.INSTANCE=this),this._isInitialized=!1,this._client=t,this._collectionInterval=r,this._enableLiveMetricsCounters=n}return e.prototype.enable=function(t,r){var n=this;this._isEnabled=t,this._isEnabled&&!this._isInitialized&&(this._isInitialized=!0),t?this._handle||(this._lastCpus=Zo.cpus(),this._lastRequests={totalRequestCount:e._totalRequestCount,totalFailedRequestCount:e._totalFailedRequestCount,time:+new Date},this._lastDependencies={totalDependencyCount:e._totalDependencyCount,totalFailedDependencyCount:e._totalFailedDependencyCount,time:+new Date},this._lastExceptions={totalExceptionCount:e._totalExceptionCount,time:+new Date},typeof process.cpuUsage=="function"&&(this._lastAppCpuUsage=process.cpuUsage()),this._lastHrtime=process.hrtime(),this._collectionInterval=r||this._collectionInterval,this._handle=setInterval(function(){return n.trackPerformance()},this._collectionInterval),this._handle.unref()):this._handle&&(clearInterval(this._handle),this._handle=void 0)},e.countRequest=function(t,r){var n;if(!!e.isEnabled()){if(typeof t=="string")n=+new Date("1970-01-01T"+t+"Z");else if(typeof t=="number")n=t;else return;e._intervalRequestExecutionTime+=n,r===!1&&e._totalFailedRequestCount++,e._totalRequestCount++}},e.countException=function(){e._totalExceptionCount++},e.countDependency=function(t,r){var n;if(!!e.isEnabled()){if(typeof t=="string")n=+new Date("1970-01-01T"+t+"Z");else if(typeof t=="number")n=t;else return;e._intervalDependencyExecutionTime+=n,r===!1&&e._totalFailedDependencyCount++,e._totalDependencyCount++}},e.prototype.isInitialized=function(){return this._isInitialized},e.isEnabled=function(){return e.INSTANCE&&e.INSTANCE._isEnabled},e.prototype.trackPerformance=function(){this._trackCpu(),this._trackMemory(),this._trackNetwork(),this._trackDependencyRate(),this._trackExceptionRate()},e.prototype._trackCpu=function(){var t=Zo.cpus();if(t&&t.length&&this._lastCpus&&t.length===this._lastCpus.length){for(var r=0,n=0,i=0,a=0,s=0,o=0;!!t&&o<t.length;o++){var u=t[o],c=this._lastCpus[o],f="% cpu("+o+") ",p=u.model,d=u.speed,h=u.times,E=c.times,A=h.user-E.user||0;r+=A;var j=h.sys-E.sys||0;n+=j;var se=h.nice-E.nice||0;i+=se;var Ae=h.idle-E.idle||0;a+=Ae;var At=h.irq-E.irq||0;s+=At}var tn=void 0;if(typeof process.cpuUsage=="function"){var yi=process.cpuUsage(),rn=process.hrtime(),aA=yi.user-this._lastAppCpuUsage.user+(yi.system-this._lastAppCpuUsage.system)||0;if(typeof this._lastHrtime<"u"&&this._lastHrtime.length===2){var sA=(rn[0]-this._lastHrtime[0])*1e6+(rn[1]-this._lastHrtime[1])/1e3||0;tn=100*aA/(sA*t.length)}this._lastAppCpuUsage=yi,this._lastHrtime=rn}var _u=r+n+i+a+s||1;this._client.trackMetric({name:Ze.PerformanceCounter.PROCESSOR_TIME,value:(_u-a)/_u*100}),this._client.trackMetric({name:Ze.PerformanceCounter.PROCESS_TIME,value:tn||r/_u*100})}this._lastCpus=t},e.prototype._trackMemory=function(){var t=Zo.freemem(),r=process.memoryUsage().rss,n=Zo.totalmem()-t;this._client.trackMetric({name:Ze.PerformanceCounter.PRIVATE_BYTES,value:r}),this._client.trackMetric({name:Ze.PerformanceCounter.AVAILABLE_BYTES,value:t}),this._enableLiveMetricsCounters&&this._client.trackMetric({name:Ze.QuickPulseCounter.COMMITTED_BYTES,value:n})},e.prototype._trackNetwork=function(){var t=this._lastRequests,r={totalRequestCount:e._totalRequestCount,totalFailedRequestCount:e._totalFailedRequestCount,time:+new Date},n=r.totalRequestCount-t.totalRequestCount||0,i=r.totalFailedRequestCount-t.totalFailedRequestCount||0,a=r.time-t.time,s=a/1e3,o=(e._intervalRequestExecutionTime-this._lastIntervalRequestExecutionTime)/n||0;if(this._lastIntervalRequestExecutionTime=e._intervalRequestExecutionTime,a>0){var u=n/s,c=i/s;this._client.trackMetric({name:Ze.PerformanceCounter.REQUEST_RATE,value:u}),(!this._enableLiveMetricsCounters||n>0)&&this._client.trackMetric({name:Ze.PerformanceCounter.REQUEST_DURATION,value:o}),this._enableLiveMetricsCounters&&this._client.trackMetric({name:Ze.QuickPulseCounter.REQUEST_FAILURE_RATE,value:c})}this._lastRequests=r},e.prototype._trackDependencyRate=function(){if(this._enableLiveMetricsCounters){var t=this._lastDependencies,r={totalDependencyCount:e._totalDependencyCount,totalFailedDependencyCount:e._totalFailedDependencyCount,time:+new Date},n=r.totalDependencyCount-t.totalDependencyCount||0,i=r.totalFailedDependencyCount-t.totalFailedDependencyCount||0,a=r.time-t.time,s=a/1e3,o=(e._intervalDependencyExecutionTime-this._lastIntervalDependencyExecutionTime)/n||0;if(this._lastIntervalDependencyExecutionTime=e._intervalDependencyExecutionTime,a>0){var u=n/s,c=i/s;this._client.trackMetric({name:Ze.QuickPulseCounter.DEPENDENCY_RATE,value:u}),this._client.trackMetric({name:Ze.QuickPulseCounter.DEPENDENCY_FAILURE_RATE,value:c}),(!this._enableLiveMetricsCounters||n>0)&&this._client.trackMetric({name:Ze.QuickPulseCounter.DEPENDENCY_DURATION,value:o})}this._lastDependencies=r}},e.prototype._trackExceptionRate=function(){if(this._enableLiveMetricsCounters){var t=this._lastExceptions,r={totalExceptionCount:e._totalExceptionCount,time:+new Date},n=r.totalExceptionCount-t.totalExceptionCount||0,i=r.time-t.time,a=i/1e3;if(i>0){var s=n/a;this._client.trackMetric({name:Ze.QuickPulseCounter.EXCEPTION_RATE,value:s})}this._lastExceptions=r}},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1},e._totalRequestCount=0,e._totalFailedRequestCount=0,e._totalDependencyCount=0,e._totalFailedDependencyCount=0,e._totalExceptionCount=0,e._intervalDependencyExecutionTime=0,e._intervalRequestExecutionTime=0,e}();ly.exports=ZD});var fy=l(eu=>{"use strict";Object.defineProperty(eu,"__esModule",{value:!0});eu.AggregatedMetricCounter=void 0;var JD=function(){function e(t){this.dimensions=t,this.totalCount=0,this.lastTotalCount=0,this.intervalExecutionTime=0,this.lastTime=+new Date,this.lastIntervalExecutionTime=0}return e}();eu.AggregatedMetricCounter=JD});var py=l(tu=>{"use strict";Object.defineProperty(tu,"__esModule",{value:!0});tu.PreaggregatedMetricPropertyNames=void 0;tu.PreaggregatedMetricPropertyNames={cloudRoleInstance:"cloud/roleInstance",cloudRoleName:"cloud/roleName",operationSynthetic:"operation/synthetic",requestSuccess:"Request.Success",requestResultCode:"request/resultCode",dependencyType:"Dependency.Type",dependencyTarget:"dependency/target",dependencySuccess:"Dependency.Success",dependencyResultCode:"dependency/resultCode",traceSeverityLevel:"trace/severityLevel"}});var ap=l((ip,dy)=>{"use strict";var nu=ip&&ip.__assign||function(){return nu=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},nu.apply(this,arguments)},ru=kt(),ew=fy(),tw=py(),rw=function(){function e(t,r){r===void 0&&(r=6e4),e.INSTANCE||(e.INSTANCE=this),this._isInitialized=!1,e._dependencyCountersCollection=[],e._requestCountersCollection=[],e._exceptionCountersCollection=[],e._traceCountersCollection=[],this._client=t,this._collectionInterval=r}return e.prototype.enable=function(t,r){var n=this;this._isEnabled=t,this._isEnabled&&!this._isInitialized&&(this._isInitialized=!0),t?this._handle||(this._collectionInterval=r||this._collectionInterval,this._handle=setInterval(function(){return n.trackPreAggregatedMetrics()},this._collectionInterval),this._handle.unref()):this._handle&&(clearInterval(this._handle),this._handle=void 0)},e.countException=function(t){if(!!e.isEnabled()){var r=e._getAggregatedCounter(t,this._exceptionCountersCollection);r.totalCount++}},e.countTrace=function(t){if(!!e.isEnabled()){var r=e._getAggregatedCounter(t,this._traceCountersCollection);r.totalCount++}},e.countRequest=function(t,r){if(!!e.isEnabled()){var n,i=e._getAggregatedCounter(r,this._requestCountersCollection);if(typeof t=="string")n=+new Date("1970-01-01T"+t+"Z");else if(typeof t=="number")n=t;else return;i.intervalExecutionTime+=n,i.totalCount++}},e.countDependency=function(t,r){if(!!e.isEnabled()){var n=e._getAggregatedCounter(r,this._dependencyCountersCollection),i;if(typeof t=="string")i=+new Date("1970-01-01T"+t+"Z");else if(typeof t=="number")i=t;else return;n.intervalExecutionTime+=i,n.totalCount++}},e.prototype.isInitialized=function(){return this._isInitialized},e.isEnabled=function(){return e.INSTANCE&&e.INSTANCE._isEnabled},e.prototype.trackPreAggregatedMetrics=function(){this._trackRequestMetrics(),this._trackDependencyMetrics(),this._trackExceptionMetrics(),this._trackTraceMetrics()},e._getAggregatedCounter=function(t,r){for(var n=!1,i=0;i<r.length;i++){if(t===r[i].dimensions)return r[i];if(Object.keys(t).length===Object.keys(r[i].dimensions).length){for(var a in t)if(t[a]!=r[i].dimensions[a]){n=!0;break}if(!n)return r[i];n=!1}}var s=new ew.AggregatedMetricCounter(t);return r.push(s),s},e.prototype._trackRequestMetrics=function(){for(var t=0;t<e._requestCountersCollection.length;t++){var r=e._requestCountersCollection[t];r.time=+new Date;var n=r.totalCount-r.lastTotalCount||0,i=r.time-r.lastTime,a=(r.intervalExecutionTime-r.lastIntervalExecutionTime)/n||0;r.lastIntervalExecutionTime=r.intervalExecutionTime,i>0&&n>0&&this._trackPreAggregatedMetric({name:"Server response time",dimensions:r.dimensions,value:a,count:n,aggregationInterval:i,metricType:ru.MetricId.REQUESTS_DURATION}),r.lastTotalCount=r.totalCount,r.lastTime=r.time}},e.prototype._trackDependencyMetrics=function(){for(var t=0;t<e._dependencyCountersCollection.length;t++){var r=e._dependencyCountersCollection[t];r.time=+new Date;var n=r.totalCount-r.lastTotalCount||0,i=r.time-r.lastTime,a=(r.intervalExecutionTime-r.lastIntervalExecutionTime)/n||0;r.lastIntervalExecutionTime=r.intervalExecutionTime,i>0&&n>0&&this._trackPreAggregatedMetric({name:"Dependency duration",dimensions:r.dimensions,value:a,count:n,aggregationInterval:i,metricType:ru.MetricId.DEPENDENCIES_DURATION}),r.lastTotalCount=r.totalCount,r.lastTime=r.time}},e.prototype._trackExceptionMetrics=function(){for(var t=0;t<e._exceptionCountersCollection.length;t++){var r=e._exceptionCountersCollection[t],n=r.totalCount-r.lastTotalCount||0,i=r.time-r.lastTime;this._trackPreAggregatedMetric({name:"Exceptions",dimensions:r.dimensions,value:n,count:n,aggregationInterval:i,metricType:ru.MetricId.EXCEPTIONS_COUNT}),r.lastTotalCount=r.totalCount,r.lastTime=r.time}},e.prototype._trackTraceMetrics=function(){for(var t=0;t<e._traceCountersCollection.length;t++){var r=e._traceCountersCollection[t],n=r.totalCount-r.lastTotalCount||0,i=r.time-r.lastTime;this._trackPreAggregatedMetric({name:"Traces",dimensions:r.dimensions,value:n,count:n,aggregationInterval:i,metricType:ru.MetricId.TRACES_COUNT}),r.lastTotalCount=r.totalCount,r.lastTime=r.time}},e.prototype._trackPreAggregatedMetric=function(t){var r={};for(var n in t.dimensions)r[tw.PreaggregatedMetricPropertyNames[n]]=t.dimensions[n];r=nu(nu({},r),{"_MS.MetricId":t.metricType,"_MS.AggregationIntervalMs":String(t.aggregationInterval),"_MS.IsAutocollected":"True"});var i={name:t.name,value:t.value,count:t.count,properties:r,kind:"Aggregation"};this._client.trackMetric(i)},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1},e}();dy.exports=rw});var Ea=l((X1,gy)=>{"use strict";var Ht=__webpack_require__(24),hy=__webpack_require__(3),_y=__webpack_require__(22),nw=De(),vy=_e(),iw=function(){function e(t){this.keys=new nw.ContextTagKeys,this.tags={},this._loadApplicationContext(t),this._loadDeviceContext(),this._loadInternalContext()}return e.prototype._loadApplicationContext=function(t){if(t=t||_y.resolve(__dirname,"../../../../package.json"),!e.appVersion[t]){e.appVersion[t]="unknown";try{var r=JSON.parse(hy.readFileSync(t,"utf8"));r&&typeof r.version=="string"&&(e.appVersion[t]=r.version)}catch(n){vy.info("unable to read app version: ",n)}}this.tags[this.keys.applicationVersion]=e.appVersion[t]},e.prototype._loadDeviceContext=function(){this.tags[this.keys.deviceId]="",this.tags[this.keys.cloudRoleInstance]=Ht&&Ht.hostname(),this.tags[this.keys.deviceOSVersion]=Ht&&Ht.type()+" "+Ht.release(),this.tags[this.keys.cloudRole]=e.DefaultRoleName,this.tags["ai.device.osArchitecture"]=Ht&&Ht.arch(),this.tags["ai.device.osPlatform"]=Ht&&Ht.platform()},e.prototype._loadInternalContext=function(){var t=_y.resolve(__dirname,"../../package.json");if(!e.sdkVersion){e.sdkVersion="unknown";try{var r=JSON.parse(hy.readFileSync(t,"utf8"));r&&typeof r.version=="string"&&(e.sdkVersion=r.version)}catch(n){vy.info("unable to read app version: ",n)}}this.tags[this.keys.internalSdkVersion]="node:"+e.sdkVersion},e.DefaultRoleName="Web",e.appVersion={},e.sdkVersion=null,e}();gy.exports=iw});var my=l((op,Ey)=>{"use strict";var aw=op&&op.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),ut=__webpack_require__(33),sp=De(),sw=Ue(),ow=jn(),uw=kl(),cw=Fr(),lw=function(e){aw(t,e);function t(r,n){var i=e.call(this)||this;return n&&n.method&&r&&(i.method=n.method,i.url=t._getUrlFromRequestOptions(r,n),i.startTime=+new Date),i}return t.prototype.onError=function(r){this._setStatus(void 0,r)},t.prototype.onResponse=function(r){this._setStatus(r.statusCode,void 0),this.correlationId=sw.getCorrelationContextTarget(r,ow.requestContextTargetKey)},t.prototype.getDependencyTelemetry=function(r,n){var i=ut.parse(this.url);i.search=void 0,i.hash=void 0;var a=this.method.toUpperCase()+" "+i.pathname,s=sp.RemoteDependencyDataConstants.TYPE_HTTP,o=i.hostname;i.port&&(o+=":"+i.port),this.correlationId?(s=sp.RemoteDependencyDataConstants.TYPE_AI,this.correlationId!==cw.correlationIdPrefix&&(o+=" | "+this.correlationId)):s=sp.RemoteDependencyDataConstants.TYPE_HTTP;var u={id:n,name:a,data:this.url,duration:this.duration,success:this._isSuccess(),resultCode:this.statusCode?this.statusCode.toString():null,properties:this.properties||{},dependencyTypeName:s,target:o};if(r&&r.time?u.time=r.time:this.startTime&&(u.time=new Date(this.startTime)),r){for(var c in r)u[c]||(u[c]=r[c]);if(r.properties)for(var c in r.properties)u.properties[c]=r.properties[c]}return u},t._getUrlFromRequestOptions=function(r,n){if(typeof r=="string")if(r.indexOf("http://")===0||r.indexOf("https://")===0)r=ut.parse(r);else{var i=ut.parse(r);i.host==="443"?r=ut.parse("https://"+r):r=ut.parse("http://"+r)}else{if(r&&typeof ut.URL=="function"&&r instanceof ut.URL)return ut.format(r);var a=r;r={},a&&Object.keys(a).forEach(function(u){r[u]=a[u]})}if(r.path){var s=ut.parse(r.path);r.pathname=s.pathname,r.search=s.search}if(r.host&&r.port){var o=ut.parse("http://"+r.host);!o.port&&r.port&&(r.hostname=r.host,delete r.host)}return r.protocol=r.protocol||n.agent&&n.agent.protocol||n.protocol||void 0,r.hostname=r.hostname||"localhost",ut.format(r)},t}(uw);Ey.exports=lw});var yy=l(ai=>{"use strict";var ma=ai&&ai.__assign||function(){return ma=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},ma.apply(this,arguments)};Object.defineProperty(ai,"__esModule",{value:!0});ai.spanToTelemetryContract=void 0;var fw=z(),ke=kt();function up(e){var t=ma({},e);return Object.keys(ke.SpanAttribute).forEach(function(r){delete t[r]}),t}function pw(e){var t="|"+e.spanContext().traceId+"."+e.spanContext().spanId+".",r=Math.round(e._duration[0]*1e3+e._duration[1]/1e6),n=e.attributes["peer.address"]?e.attributes["peer.address"].toString():"",i=e.attributes.component?e.attributes.component.toString():"",a=i.toUpperCase()===ke.DependencyTypeName.Http||!!e.attributes[ke.SpanAttribute.HttpUrl],s=i.toLowerCase()===ke.DependencyTypeName.Grpc;if(a){var o=e.attributes[ke.SpanAttribute.HttpMethod]||"GET",u=new URL(e.attributes[ke.SpanAttribute.HttpUrl].toString()),c=e.attributes[ke.SpanAttribute.HttpHost]||u.host,f=e.attributes[ke.SpanAttribute.HttpPort]||u.port||null,p=u.pathname||"/",d=o+" "+p,h=ke.DependencyTypeName.Http,E=f?(c+":"+f).toString():c.toString(),A=u.toString(),j=e.attributes[ke.SpanAttribute.HttpStatusCode]||e.status.code||0,se=j<400;return{id:t,name:d,dependencyTypeName:h,target:E,data:A,success:se,duration:r,url:A,resultCode:String(j),properties:up(e.attributes)}}else if(s){var o=e.attributes[ke.SpanAttribute.GrpcMethod]||"rpc",Ae=e.attributes[ke.SpanAttribute.GrpcService],At=Ae?o+" "+Ae:e.name;return{id:t,duration:r,name:At,target:Ae.toString(),data:Ae.toString()||At,url:Ae.toString()||At,dependencyTypeName:ke.DependencyTypeName.Grpc,resultCode:String(e.status.code||0),success:e.status.code===0,properties:up(e.attributes)}}else{var tn=e.name,yi=e.links&&e.links.map(function(rn){return{operation_Id:rn.context.traceId,id:rn.context.spanId}});return{id:t,duration:r,name:tn,target:n,data:n||tn,url:n||tn,dependencyTypeName:e.kind===fw.SpanKind.INTERNAL?ke.DependencyTypeName.InProc:i||e.name,resultCode:String(e.status.code||0),success:e.status.code===0,properties:ma(ma({},up(e.attributes)),{"_MS.links":yi||void 0})}}}ai.spanToTelemetryContract=pw});var Sy=l(fr=>{"use strict";Object.defineProperty(fr,"__esModule",{value:!0});fr.enable=fr.subscriber=void 0;var cp=z(),Ty=oe(),Ay=Qi(),dw=yy(),hw=vu(),si=[],_w=function(e){var t=e.data,r=dw.spanToTelemetryContract(t),n=t.spanContext(),i=new Ay;i.traceId=n.traceId,i.spanId=n.spanId,i.traceFlag=Ay.formatOpenTelemetryTraceFlags(n.traceFlags),i.parentId=t.parentSpanId?"|"+n.traceId+"."+t.parentSpanId+".":null,hw.AsyncScopeManager.with(t,function(){si.forEach(function(a){t.kind===cp.SpanKind.SERVER?a.trackRequest(r):(t.kind===cp.SpanKind.CLIENT||t.kind===cp.SpanKind.INTERNAL)&&a.trackDependency(r)})})};fr.subscriber=_w;function vw(e,t){e?(si.length===0&&Ty.channel.subscribe("azure-coretracing",fr.subscriber),si.push(t)):(si=si.filter(function(r){return r!=t}),si.length===0&&Ty.channel.unsubscribe("azure-coretracing",fr.subscriber))}fr.enable=vw});var Cy=l(pr=>{"use strict";Object.defineProperty(pr,"__esModule",{value:!0});pr.enable=pr.subscriber=void 0;var Iy=oe(),oi=[],gw=function(e){e.data.event.commandName!=="ismaster"&&oi.forEach(function(t){var r=e.data.startedData&&e.data.startedData.databaseName||"Unknown database";t.trackDependency({target:r,data:e.data.event.commandName,name:e.data.event.commandName,duration:e.data.event.duration,success:e.data.succeeded,resultCode:e.data.succeeded?"0":"1",time:e.data.startedData.time,dependencyTypeName:"mongodb"})})};pr.subscriber=gw;function Ew(e,t){e?(oi.length===0&&Iy.channel.subscribe("mongodb",pr.subscriber),oi.push(t)):(oi=oi.filter(function(r){return r!=t}),oi.length===0&&Iy.channel.unsubscribe("mongodb",pr.subscriber))}pr.enable=Ew});var Oy=l(dr=>{"use strict";Object.defineProperty(dr,"__esModule",{value:!0});dr.enable=dr.subscriber=void 0;var by=oe(),ui=[],mw=function(e){ui.forEach(function(t){var r=e.data.query||{},n=r.sql||"Unknown query",i=!e.data.err,a=r._connection||{},s=a.config||{},o=s.socketPath?s.socketPath:(s.host||"localhost")+":"+s.port;t.trackDependency({target:o,data:n,name:n,duration:e.data.duration,success:i,resultCode:i?"0":"1",time:e.data.time,dependencyTypeName:"mysql"})})};dr.subscriber=mw;function yw(e,t){e?(ui.length===0&&by.channel.subscribe("mysql",dr.subscriber),ui.push(t)):(ui=ui.filter(function(r){return r!=t}),ui.length===0&&by.channel.unsubscribe("mysql",dr.subscriber))}dr.enable=yw});var Ry=l(hr=>{"use strict";Object.defineProperty(hr,"__esModule",{value:!0});hr.enable=hr.subscriber=void 0;var Py=oe(),ci=[],Tw=function(e){ci.forEach(function(t){e.data.commandObj.command!=="info"&&t.trackDependency({target:e.data.address,name:e.data.commandObj.command,data:e.data.commandObj.command,duration:e.data.duration,success:!e.data.err,resultCode:e.data.err?"1":"0",time:e.data.time,dependencyTypeName:"redis"})})};hr.subscriber=Tw;function Aw(e,t){e?(ci.length===0&&Py.channel.subscribe("redis",hr.subscriber),ci.push(t)):(ci=ci.filter(function(r){return r!=t}),ci.length===0&&Py.channel.unsubscribe("redis",hr.subscriber))}hr.enable=Aw});var Dy=l(_r=>{"use strict";Object.defineProperty(_r,"__esModule",{value:!0});_r.enable=_r.subscriber=void 0;var Ny=oe(),li=[],Sw=function(e){li.forEach(function(t){var r=e.data.query,n=r.preparable&&r.preparable.text||r.plan||r.text||"unknown query",i=!e.data.error,a=e.data.database.host+":"+e.data.database.port;t.trackDependency({target:a,data:n,name:n,duration:e.data.duration,success:i,resultCode:i?"0":"1",time:e.data.time,dependencyTypeName:"postgres"})})};_r.subscriber=Sw;function Iw(e,t){e?(li.length===0&&Ny.channel.subscribe("postgres",_r.subscriber),li.push(t)):(li=li.filter(function(r){return r!=t}),li.length===0&&Ny.channel.unsubscribe("postgres",_r.subscriber))}_r.enable=Iw});var di=l((pp,Ly)=>{"use strict";var iu=pp&&pp.__spreadArrays||function(){for(var e=0,t=0,r=arguments.length;t<r;t++)e+=arguments[t].length;for(var n=Array(e),i=0,t=0;t<r;t++)for(var a=arguments[t],s=0,o=a.length;s<o;s++,i++)n[i]=a[s];return n},fi=__webpack_require__(31),pi=__webpack_require__(32),lp=_e(),wy=Ue(),vr=jn(),Cw=my(),xy=Er(),My=Fr(),fp=Qi(),bw=po(),Ow=function(){function e(t){if(e.INSTANCE)throw new Error("Client request tracking should be configured from the applicationInsights object");e.INSTANCE=this,this._client=t}return e.prototype.enable=function(t){this._isEnabled=t,this._isEnabled&&!this._isInitialized&&this._initialize(),bw.IsInitialized&&(Sy().enable(!0,this._client),Cy().enable(t,this._client),Oy().enable(t,this._client),Ry().enable(t,this._client),Dy().enable(t,this._client))},e.prototype.isInitialized=function(){return this._isInitialized},e.prototype._initialize=function(){var t=this;this._isInitialized=!0;var r=fi.request,n=pi.request,i=function(a,s){var o=!s[e.disableCollectionRequestOption]&&!a[e.alreadyAutoCollectedFlag];s.headers&&s.headers["user-agent"]&&s.headers["user-agent"].toString().indexOf("azsdk-js")!==-1&&(o=!1),a[e.alreadyAutoCollectedFlag]=!0,a&&s&&o&&(xy.CorrelationContextManager.wrapEmitter(a),e.trackRequest(t._client,{options:s,request:a}))};fi.request=function(a){for(var s=[],o=1;o<arguments.length;o++)s[o-1]=arguments[o];var u=r.call.apply(r,iu([fi,a],s));return i(u,a),u},pi.request=function(a){for(var s=[],o=1;o<arguments.length;o++)s[o-1]=arguments[o];var u=n.call.apply(n,iu([pi,a],s));return i(u,a),u},fi.get=function(a){for(var s,o=[],u=1;u<arguments.length;u++)o[u-1]=arguments[u];var c=(s=fi.request).call.apply(s,iu([fi,a],o));return c.end(),c},pi.get=function(a){for(var s,o=[],u=1;u<arguments.length;u++)o[u-1]=arguments[u];var c=(s=pi.request).call.apply(s,iu([pi,a],o));return c.end(),c}},e.trackRequest=function(t,r){if(!r.options||!r.request||!t){lp.info("AutoCollectHttpDependencies.trackRequest was called with invalid parameters: ",!r.options,!r.request,!t);return}var n=new Cw(r.options,r.request),i=xy.CorrelationContextManager.getCurrentContext(),a,s;if(i&&i.operation&&i.operation.traceparent&&fp.isValidTraceId(i.operation.traceparent.traceId))i.operation.traceparent.updateSpanId(),a=i.operation.traceparent.getBackCompatRequestId();else if(My.w3cEnabled){var o=new fp;s=o.toString(),a=o.getBackCompatRequestId()}else a=i&&i.operation&&i.operation.parentId+e.requestNumber+++".";if(wy.canIncludeCorrelationHeader(t,n.getUrl())&&r.request.getHeader&&r.request.setHeader&&t.config&&t.config.correlationId){var u=r.request.getHeader(vr.requestContextHeader);try{wy.safeIncludeCorrelationHeader(t,r.request,u)}catch(p){lp.warn("Request-Context header could not be set. Correlation of requests may be lost",p)}if(i&&i.operation)try{if(r.request.setHeader(vr.requestIdHeader,a),t.config.ignoreLegacyHeaders||(r.request.setHeader(vr.parentIdHeader,i.operation.id),r.request.setHeader(vr.rootIdHeader,a)),s||i.operation.traceparent)r.request.setHeader(vr.traceparentHeader,s||i.operation.traceparent.toString());else if(My.w3cEnabled){var o=new fp().toString();r.request.setHeader(vr.traceparentHeader,o)}if(i.operation.tracestate){var c=i.operation.tracestate.toString();c&&r.request.setHeader(vr.traceStateHeader,c)}var f=i.customProperties.serializeToHeader();f&&r.request.setHeader(vr.correlationContextHeader,f)}catch(p){lp.warn("Correlation headers could not be set. Correlation of requests may be lost.",p)}}r.request.on&&(r.request.on("response",function(p){n.onResponse(p);var d=n.getDependencyTelemetry(r,a);d.contextObjects=d.contextObjects||{},d.contextObjects["http.RequestOptions"]=r.options,d.contextObjects["http.ClientRequest"]=r.request,d.contextObjects["http.ClientResponse"]=p,t.trackDependency(d)}),r.request.on("error",function(p){n.onError(p);var d=n.getDependencyTelemetry(r,a);d.contextObjects=d.contextObjects||{},d.contextObjects["http.RequestOptions"]=r.options,d.contextObjects["http.ClientRequest"]=r.request,d.contextObjects.Error=p,t.trackDependency(d)}),r.request.on("abort",function(){n.onError(new Error);var p=n.getDependencyTelemetry(r,a);p.contextObjects=p.contextObjects||{},p.contextObjects["http.RequestOptions"]=r.options,p.contextObjects["http.ClientRequest"]=r.request,t.trackDependency(p)}))},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1},e.disableCollectionRequestOption="disableAppInsightsAutoCollection",e.requestNumber=1,e.alreadyAutoCollectedFlag="_appInsightsAutoCollected",e}();Ly.exports=Ow});var ky=l((ej,jy)=>{"use strict";var Pw=__webpack_require__(24),qy=kt(),Rw=Ue(),Nw=Ea(),Dw=di(),ww="http://169.254.169.254/metadata/instance/compute",xw="api-version=2017-12-01",Mw="format=json",Lw="ENETUNREACH",qw=function(){function e(t){this._collectionInterval=9e5,this._vmData={},this._azInst_vmId="",this._azInst_subscriptionId="",this._azInst_osType="",e.INSTANCE||(e.INSTANCE=this),this._isInitialized=!1,this._client=t}return e.prototype.enable=function(t,r){var n=this;this._isEnabled=t,this._isEnabled&&!this._isInitialized&&(this._isInitialized=!0),t?this._handle||(this._handle=setInterval(function(){return n.trackHeartBeat(r,function(){})},this._collectionInterval),this._handle.unref()):this._handle&&(clearInterval(this._handle),this._handle=null)},e.prototype.isInitialized=function(){return this._isInitialized},e.isEnabled=function(){return e.INSTANCE&&e.INSTANCE._isEnabled},e.prototype.trackHeartBeat=function(t,r){var n=this,i=!1,a={},s=Nw.sdkVersion;a.sdk=s,a.osType=Pw.type(),process.env.WEBSITE_SITE_NAME?(a.appSrv_SiteName=process.env.WEBSITE_SITE_NAME||"",a.appSrv_wsStamp=process.env.WEBSITE_HOME_STAMPNAME||"",a.appSrv_wsHost=process.env.WEBSITE_HOSTNAME||""):process.env.FUNCTIONS_WORKER_RUNTIME?a.azfunction_appId=process.env.WEBSITE_HOSTNAME:t&&(this._isVM===void 0?(i=!0,this._getAzureComputeMetadata(t,function(){n._isVM&&Object.keys(n._vmData).length>0&&(a.azInst_vmId=n._vmData.vmId||"",a.azInst_subscriptionId=n._vmData.subscriptionId||"",a.azInst_osType=n._vmData.osType||"",n._azInst_vmId=n._vmData.vmId||"",n._azInst_subscriptionId=n._vmData.subscriptionId||"",n._azInst_osType=n._vmData.osType||""),n._client.trackMetric({name:qy.HeartBeatMetricName,value:0,properties:a}),r()})):this._isVM&&(a.azInst_vmId=this._azInst_vmId,a.azInst_subscriptionId=this._azInst_subscriptionId,a.azInst_osType=this._azInst_osType)),i||(this._client.trackMetric({name:qy.HeartBeatMetricName,value:0,properties:a}),r())},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1},e.prototype._getAzureComputeMetadata=function(t,r){var n,i=this,a=ww+"?"+xw+"&"+Mw,s=(n={method:"GET"},n[Dw.disableCollectionRequestOption]=!0,n.headers={Metadata:"True"},n),o=Rw.makeRequest(t,a,s,function(u){if(u.statusCode===200){i._isVM=!0;var c="";u.on("data",function(f){c+=f}),u.on("end",function(){i._vmData=i._isJSON(c)?JSON.parse(c):{},r()})}else r()});o&&(o.on("error",function(u){u&&u.message&&u.message.indexOf(Lw)>-1&&(i._isVM=!1),r()}),o.end())},e.prototype._isJSON=function(t){try{return JSON.parse(t)&&!!t}catch{return!1}},e}();jy.exports=qw});var hp=l((tj,Gy)=>{"use strict";var Hy=__webpack_require__(31),Uy=__webpack_require__(32),By=_e(),Fy=Ue(),jw=jn(),dp=Bl(),Ut=Er(),kw=Jo(),Hw=function(){function e(t){if(e.INSTANCE)throw new Error("Server request tracking should be configured from the applicationInsights object");e.INSTANCE=this,this._client=t}return e.prototype.enable=function(t){this._isEnabled=t,(this._isAutoCorrelating||this._isEnabled||kw.isEnabled())&&!this._isInitialized&&(this.useAutoCorrelation(this._isAutoCorrelating),this._initialize())},e.prototype.useAutoCorrelation=function(t,r){t&&!this._isAutoCorrelating?Ut.CorrelationContextManager.enable(r):!t&&this._isAutoCorrelating&&Ut.CorrelationContextManager.disable(),this._isAutoCorrelating=t},e.prototype.isInitialized=function(){return this._isInitialized},e.prototype.isAutoCorrelating=function(){return this._isAutoCorrelating},e.prototype._generateCorrelationContext=function(t){if(!!this._isAutoCorrelating)return Ut.CorrelationContextManager.generateContextObject(t.getOperationId(this._client.context.tags),t.getRequestId(),t.getOperationName(this._client.context.tags),t.getCorrelationContextHeader(),t.getTraceparent(),t.getTracestate())},e.prototype._initialize=function(){var t=this;this._isInitialized=!0;var r=function(s){if(!!s){if(typeof s!="function")throw new Error("onRequest handler must be a function");return function(o,u){Ut.CorrelationContextManager.wrapEmitter(o),Ut.CorrelationContextManager.wrapEmitter(u);var c=o&&!o[e.alreadyAutoCollectedFlag];if(o&&c){var f=new dp(o),p=t._generateCorrelationContext(f);Ut.CorrelationContextManager.runWithContext(p,function(){t._isEnabled&&(o[e.alreadyAutoCollectedFlag]=!0,e.trackRequest(t._client,{request:o,response:u},f)),typeof s=="function"&&s(o,u)})}else typeof s=="function"&&s(o,u)}}},n=function(s){var o=s.addListener.bind(s);s.addListener=function(u,c){switch(u){case"request":case"checkContinue":return o(u,r(c));default:return o(u,c)}},s.on=s.addListener},i=Hy.createServer;Hy.createServer=function(s,o){if(o&&typeof o=="function"){var u=i(s,r(o));return n(u),u}else{var u=i(r(s));return n(u),u}};var a=Uy.createServer;Uy.createServer=function(s,o){var u=a(s,r(o));return n(u),u}},e.trackRequestSync=function(t,r){if(!r.request||!r.response||!t){By.info("AutoCollectHttpRequests.trackRequestSync was called with invalid parameters: ",!r.request,!r.response,!t);return}e.addResponseCorrelationIdHeader(t,r.response);var n=Ut.CorrelationContextManager.getCurrentContext(),i=new dp(r.request,n&&n.operation.parentId);n&&(n.operation.id=i.getOperationId(t.context.tags)||n.operation.id,n.operation.name=i.getOperationName(t.context.tags)||n.operation.name,n.operation.parentId=i.getRequestId()||n.operation.parentId,n.customProperties.addHeaderData(i.getCorrelationContextHeader())),e.endRequest(t,i,r,r.duration,r.error)},e.trackRequest=function(t,r,n){if(!r.request||!r.response||!t){By.info("AutoCollectHttpRequests.trackRequest was called with invalid parameters: ",!r.request,!r.response,!t);return}var i=Ut.CorrelationContextManager.getCurrentContext(),a=n||new dp(r.request,i&&i.operation.parentId);Fy.canIncludeCorrelationHeader(t,a.getUrl())&&e.addResponseCorrelationIdHeader(t,r.response),i&&!n&&(i.operation.id=a.getOperationId(t.context.tags)||i.operation.id,i.operation.name=a.getOperationName(t.context.tags)||i.operation.name,i.operation.parentId=a.getOperationParentId(t.context.tags)||i.operation.parentId,i.customProperties.addHeaderData(a.getCorrelationContextHeader())),r.response.once&&r.response.once("finish",function(){e.endRequest(t,a,r,null,null)}),r.request.on&&r.request.on("error",function(s){e.endRequest(t,a,r,null,s)}),r.request.on&&r.request.on("aborted",function(){var s="The request has been aborted and the network socket has closed.";e.endRequest(t,a,r,null,s)})},e.addResponseCorrelationIdHeader=function(t,r){if(t.config&&t.config.correlationId&&r.getHeader&&r.setHeader&&!r.headersSent){var n=r.getHeader(jw.requestContextHeader);Fy.safeIncludeCorrelationHeader(t,r,n)}},e.endRequest=function(t,r,n,i,a){a?r.onError(a,i):r.onResponse(n.response,i);var s=r.getRequestTelemetry(n);if(s.tagOverrides=r.getRequestTags(t.context.tags),n.tagOverrides)for(var o in n.tagOverrides)s.tagOverrides[o]=n.tagOverrides[o];var u=r.getLegacyRootId();u&&(s.properties.ai_legacyRootId=u),s.contextObjects=s.contextObjects||{},s.contextObjects["http.ServerRequest"]=n.request,s.contextObjects["http.ServerResponse"]=n.response,t.trackRequest(s)},e.prototype.dispose=function(){e.INSTANCE=null,this.enable(!1),this._isInitialized=!1,Ut.CorrelationContextManager.disable(),this._isAutoCorrelating=!1},e.alreadyAutoCollectedFlag="_appInsightsAutoCollected",e}();Gy.exports=Hw});var zy=l((vp,$y)=>{"use strict";var Je=vp&&vp.__assign||function(){return Je=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},Je.apply(this,arguments)},_p=__webpack_require__(24),Jr=De(),Vy=kt(),Uw=Ue(),Bw=_e(),Fw=Uw.w3cTraceId(),Gw=function(){function e(){}return e.createQuickPulseEnvelope=function(t,r,n,i){var a=_p&&typeof _p.hostname=="function"&&_p.hostname()||"Unknown",s=i.tags&&i.keys&&i.keys.cloudRoleInstance&&i.tags[i.keys.cloudRoleInstance]||a,o=i.tags&&i.keys&&i.keys.cloudRole&&i.tags[i.keys.cloudRole]||null,u={Documents:r.length>0?r:null,InstrumentationKey:n.instrumentationKey||"",Metrics:t.length>0?t:null,InvariantVersion:1,Timestamp:"/Date("+Date.now()+")/",Version:i.tags[i.keys.internalSdkVersion],StreamId:Fw,MachineName:a,Instance:s,RoleName:o};return u},e.createQuickPulseMetric=function(t){var r;return r={Name:t.name,Value:t.value,Weight:t.count||1},r},e.telemetryEnvelopeToQuickPulseDocument=function(t){switch(t.data.baseType){case Jr.TelemetryTypeString.Event:return e.createQuickPulseEventDocument(t);case Jr.TelemetryTypeString.Exception:return e.createQuickPulseExceptionDocument(t);case Jr.TelemetryTypeString.Trace:return e.createQuickPulseTraceDocument(t);case Jr.TelemetryTypeString.Dependency:return e.createQuickPulseDependencyDocument(t);case Jr.TelemetryTypeString.Request:return e.createQuickPulseRequestDocument(t)}return null},e.createQuickPulseEventDocument=function(t){var r=e.createQuickPulseDocument(t),n=t.data.baseData.name,i=Je(Je({},r),{Name:n});return i},e.createQuickPulseTraceDocument=function(t){var r=e.createQuickPulseDocument(t),n=t.data.baseData.severityLevel||0,i=Je(Je({},r),{Message:t.data.baseData.message,SeverityLevel:Jr.SeverityLevel[n]});return i},e.createQuickPulseExceptionDocument=function(t){var r=e.createQuickPulseDocument(t),n=t.data.baseData.exceptions,i="",a="",s="";n&&n.length>0&&(n[0].parsedStack&&n[0].parsedStack.length>0?n[0].parsedStack.forEach(function(u){i+=u.assembly+`
`}):n[0].stack&&n[0].stack.length>0&&(i=n[0].stack),a=n[0].message,s=n[0].typeName);var o=Je(Je({},r),{Exception:i,ExceptionMessage:a,ExceptionType:s});return o},e.createQuickPulseRequestDocument=function(t){var r=e.createQuickPulseDocument(t),n=t.data.baseData,i=Je(Je({},r),{Name:n.name,Success:n.success,Duration:n.duration,ResponseCode:n.responseCode,OperationName:n.name});return i},e.createQuickPulseDependencyDocument=function(t){var r=e.createQuickPulseDocument(t),n=t.data.baseData,i=Je(Je({},r),{Name:n.name,Target:n.target,Success:n.success,Duration:n.duration,ResultCode:n.resultCode,CommandName:n.data,OperationName:r.OperationId,DependencyTypeName:n.type});return i},e.createQuickPulseDocument=function(t){var r,n,i,a;t.data.baseType?(n=Vy.TelemetryTypeStringToQuickPulseType[t.data.baseType],r=Vy.TelemetryTypeStringToQuickPulseDocumentType[t.data.baseType]):Bw.warn("Document type invalid; not sending live metric document",t.data.baseType),i=t.tags[e.keys.operationId],a=e.aggregateProperties(t);var s={DocumentType:r,__type:n,OperationId:i,Version:"1.0",Properties:a};return s},e.aggregateProperties=function(t){var r=[],n=t.data.baseData.measurements||{};for(var i in n)if(n.hasOwnProperty(i)){var a=n[i],s={key:i,value:a};r.push(s)}var o=t.data.baseData.properties||{};for(var i in o)if(o.hasOwnProperty(i)){var a=o[i],s={key:i,value:a};r.push(s)}return r},e.keys=new Jr.ContextTagKeys,e}();$y.exports=Gw});var Ky=l((rj,Xy)=>{"use strict";var Vw=function(){return(Date.now()+621355968e5)*1e4};Xy.exports={getTransmissionTime:Vw}});var Jy=l((ya,Zy)=>{"use strict";var Yy=ya&&ya.__awaiter||function(e,t,r,n){function i(a){return a instanceof r?a:new r(function(s){s(a)})}return new(r||(r=Promise))(function(a,s){function o(f){try{c(n.next(f))}catch(p){s(p)}}function u(f){try{c(n.throw(f))}catch(p){s(p)}}function c(f){f.done?a(f.value):i(f.value).then(o,u)}c((n=n.apply(e,t||[])).next())})},Qy=ya&&ya.__generator||function(e,t){var r={label:0,sent:function(){if(a[0]&1)throw a[1];return a[1]},trys:[],ops:[]},n,i,a,s;return s={next:o(0),throw:o(1),return:o(2)},typeof Symbol=="function"&&(s[Symbol.iterator]=function(){return this}),s;function o(c){return function(f){return u([c,f])}}function u(c){if(n)throw new TypeError("Generator is already executing.");for(;r;)try{if(n=1,i&&(a=c[0]&2?i.return:c[0]?i.throw||((a=i.return)&&a.call(i),0):i.next)&&!(a=a.call(i,c[1])).done)return a;switch(i=0,a&&(c=[c[0]&2,a.value]),c[0]){case 0:case 1:a=c;break;case 4:return r.label++,{value:c[1],done:!1};case 5:r.label++,i=c[1],c=[0];continue;case 7:c=r.ops.pop(),r.trys.pop();continue;default:if(a=r.trys,!(a=a.length>0&&a[a.length-1])&&(c[0]===6||c[0]===2)){r=0;continue}if(c[0]===3&&(!a||c[1]>a[0]&&c[1]<a[3])){r.label=c[1];break}if(c[0]===6&&r.label<a[1]){r.label=a[1],a=c;break}if(a&&r.label<a[2]){r.label=a[2],r.ops.push(c);break}a[2]&&r.ops.pop(),r.trys.pop();continue}c=t.call(e,r)}catch(f){c=[6,f],i=0}finally{n=a=0}if(c[0]&5)throw c[1];return{value:c[0]?c[1]:void 0,done:!0}}},$w=__webpack_require__(32),zw=di(),Wy=_e(),Xw=Ky(),Kw=Ue(),et={method:"POST",time:"x-ms-qps-transmission-time",pollingIntervalHint:"x-ms-qps-service-polling-interval-hint",endpointRedirect:"x-ms-qps-service-endpoint-redirect",instanceName:"x-ms-qps-instance-name",streamId:"x-ms-qps-stream-id",machineName:"x-ms-qps-machine-name",roleName:"x-ms-qps-role-name",streamid:"x-ms-qps-stream-id",invariantVersion:"x-ms-qps-invariant-version",subscribed:"x-ms-qps-subscribed"},Yw=function(){function e(t){this._config=t,this._consecutiveErrors=0}return e.prototype.ping=function(t,r,n){var i=[{name:et.streamId,value:t.StreamId},{name:et.machineName,value:t.MachineName},{name:et.roleName,value:t.RoleName},{name:et.instanceName,value:t.Instance},{name:et.invariantVersion,value:t.InvariantVersion.toString()}];this._submitData(t,r,n,"ping",i)},e.prototype.post=function(t,r,n){return Yy(this,void 0,void 0,function(){return Qy(this,function(i){switch(i.label){case 0:return[4,this._submitData([t],r,n,"post")];case 1:return i.sent(),[2]}})})},e.prototype._submitData=function(t,r,n,i,a){return Yy(this,void 0,void 0,function(){var s,o,u,c,f,p=this;return Qy(this,function(d){return s=JSON.stringify(t),o=(c={},c[zw.disableCollectionRequestOption]=!0,c.host=r&&r.length>0?r:this._config.quickPulseHost,c.method=et.method,c.path="/QuickPulseService.svc/"+i+"?ikey="+this._config.instrumentationKey,c.headers=(f={Expect:"100-continue"},f[et.time]=Xw.getTransmissionTime(),f["Content-Type"]="application/json",f["Content-Length"]=Buffer.byteLength(s),f),c),a&&a.length>0&&a.forEach(function(h){return o.headers[h.name]=h.value}),this._config.httpsAgent?o.agent=this._config.httpsAgent:o.agent=Kw.tlsRestrictedAgent,u=$w.request(o,function(h){if(h.statusCode==200){var E=h.headers[et.subscribed]==="true",A=h.headers[et.endpointRedirect]?h.headers[et.endpointRedirect].toString():null,j=h.headers[et.pollingIntervalHint]?parseInt(h.headers[et.pollingIntervalHint].toString()):null;p._consecutiveErrors=0,n(E,h,A,j)}else p._onError("StatusCode:"+h.statusCode+" StatusMessage:"+h.statusMessage),n()}),u.on("error",function(h){p._onError(h),n()}),u.write(s),u.end(),[2]})})},e.prototype._onError=function(t){this._consecutiveErrors++;var r="Transient error connecting to the Live Metrics endpoint. This packet will not appear in your Live Metrics Stream. Error:";this._consecutiveErrors%e.MAX_QPS_FAILURES_BEFORE_WARN===0?(r="Live Metrics endpoint could not be reached "+this._consecutiveErrors+" consecutive times. Most recent error:",Wy.warn(e.TAG,r,t)):Wy.info(e.TAG,r,t)},e.TAG="QuickPulseSender",e.MAX_QPS_FAILURES_BEFORE_WARN=25,e}();Zy.exports=Yw});var iT=l((Ta,nT)=>{"use strict";var eT=Ta&&Ta.__awaiter||function(e,t,r,n){function i(a){return a instanceof r?a:new r(function(s){s(a)})}return new(r||(r=Promise))(function(a,s){function o(f){try{c(n.next(f))}catch(p){s(p)}}function u(f){try{c(n.throw(f))}catch(p){s(p)}}function c(f){f.done?a(f.value):i(f.value).then(o,u)}c((n=n.apply(e,t||[])).next())})},tT=Ta&&Ta.__generator||function(e,t){var r={label:0,sent:function(){if(a[0]&1)throw a[1];return a[1]},trys:[],ops:[]},n,i,a,s;return s={next:o(0),throw:o(1),return:o(2)},typeof Symbol=="function"&&(s[Symbol.iterator]=function(){return this}),s;function o(c){return function(f){return u([c,f])}}function u(c){if(n)throw new TypeError("Generator is already executing.");for(;r;)try{if(n=1,i&&(a=c[0]&2?i.return:c[0]?i.throw||((a=i.return)&&a.call(i),0):i.next)&&!(a=a.call(i,c[1])).done)return a;switch(i=0,a&&(c=[c[0]&2,a.value]),c[0]){case 0:case 1:a=c;break;case 4:return r.label++,{value:c[1],done:!1};case 5:r.label++,i=c[1],c=[0];continue;case 7:c=r.ops.pop(),r.trys.pop();continue;default:if(a=r.trys,!(a=a.length>0&&a[a.length-1])&&(c[0]===6||c[0]===2)){r=0;continue}if(c[0]===3&&(!a||c[1]>a[0]&&c[1]<a[3])){r.label=c[1];break}if(c[0]===6&&r.label<a[1]){r.label=a[1],a=c;break}if(a&&r.label<a[2]){r.label=a[2],r.ops.push(c);break}a[2]&&r.ops.pop(),r.trys.pop();continue}c=t.call(e,r)}catch(f){c=[6,f],i=0}finally{n=a=0}if(c[0]&5)throw c[1];return{value:c[0]?c[1]:void 0,done:!0}}},rT=_e(),gp=zy(),Qw=Jy(),Ww=kt(),Zw=Ea(),Jw=function(){function e(t,r){this._isCollectingData=!1,this._lastSuccessTime=Date.now(),this._lastSendSucceeded=!0,this._metrics={},this._documents=[],this._collectors=[],this._redirectedHost=null,this._pollingIntervalHint=-1,this.config=t,this.context=r||new Zw,this._sender=new Qw(this.config),this._isEnabled=!1}return e.prototype.addCollector=function(t){this._collectors.push(t)},e.prototype.trackMetric=function(t){this._addMetric(t)},e.prototype.addDocument=function(t){var r=gp.telemetryEnvelopeToQuickPulseDocument(t);r&&this._documents.push(r)},e.prototype.enable=function(t){t&&!this._isEnabled?(this._isEnabled=!0,this._goQuickPulse()):!t&&this._isEnabled&&(this._isEnabled=!1,clearTimeout(this._handle),this._handle=void 0)},e.prototype.enableCollectors=function(t){this._collectors.forEach(function(r){r.enable(t)})},e.prototype._addMetric=function(t){var r=t.value,n=t.count||1,i=Ww.PerformanceToQuickPulseCounter[t.name];i&&(this._metrics[i]?(this._metrics[i].Value=(this._metrics[i].Value*this._metrics[i].Weight+r*n)/(this._metrics[i].Weight+n),this._metrics[i].Weight+=n):(this._metrics[i]=gp.createQuickPulseMetric(t),this._metrics[i].Name=i,this._metrics[i].Weight=1))},e.prototype._resetQuickPulseBuffer=function(){delete this._metrics,this._metrics={},this._documents.length=0},e.prototype._goQuickPulse=function(){return eT(this,void 0,void 0,function(){var t,r,n,i,a=this;return tT(this,function(s){switch(s.label){case 0:return t=Object.keys(this._metrics).map(function(o){return a._metrics[o]}),r=gp.createQuickPulseEnvelope(t,this._documents.slice(),this.config,this.context),this._resetQuickPulseBuffer(),this._isCollectingData?[4,this._post(r)]:[3,2];case 1:return s.sent(),[3,3];case 2:this._ping(r),s.label=3;case 3:return n=this._pollingIntervalHint>0?this._pollingIntervalHint:e.PING_INTERVAL,i=this._isCollectingData?e.POST_INTERVAL:n,this._isCollectingData&&Date.now()-this._lastSuccessTime>=e.MAX_POST_WAIT_TIME&&!this._lastSendSucceeded?(this._isCollectingData=!1,i=e.FALLBACK_INTERVAL):!this._isCollectingData&&Date.now()-this._lastSuccessTime>=e.MAX_PING_WAIT_TIME&&!this._lastSendSucceeded&&(i=e.FALLBACK_INTERVAL),this._lastSendSucceeded=null,this._handle=setTimeout(this._goQuickPulse.bind(this),i),this._handle.unref(),[2]}})})},e.prototype._ping=function(t){this._sender.ping(t,this._redirectedHost,this._quickPulseDone.bind(this))},e.prototype._post=function(t){return eT(this,void 0,void 0,function(){return tT(this,function(r){switch(r.label){case 0:return[4,this._sender.post(t,this._redirectedHost,this._quickPulseDone.bind(this))];case 1:return r.sent(),[2]}})})},e.prototype._quickPulseDone=function(t,r,n,i){t!=null?(this._isCollectingData!==t&&(rT.info("Live Metrics sending data",t),this.enableCollectors(t)),this._isCollectingData=t,n&&n.length>0&&(this._redirectedHost=n,rT.info("Redirecting endpoint to: ",n)),i&&i>0&&(this._pollingIntervalHint=i),r&&r.statusCode<300&&r.statusCode>=200?(this._lastSuccessTime=Date.now(),this._lastSendSucceeded=!0):this._lastSendSucceeded=!1):this._lastSendSucceeded=!1},e.MAX_POST_WAIT_TIME=2e4,e.MAX_PING_WAIT_TIME=6e4,e.FALLBACK_INTERVAL=6e4,e.PING_INTERVAL=5e3,e.POST_INTERVAL=1e3,e}();nT.exports=Jw});var oT=l((nj,sT)=>{"use strict";var aT=kt(),ex=function(){function e(){}return e.parse=function(t){if(!t)return{};var r=t.split(e._FIELDS_SEPARATOR),n=r.reduce(function(a,s){var o=s.split(e._FIELD_KEY_VALUE_SEPARATOR);if(o.length===2){var u=o[0].toLowerCase(),c=o[1];a[u]=c}return a},{});if(Object.keys(n).length>0){if(n.endpointsuffix){var i=n.location?n.location+".":"";n.ingestionendpoint=n.ingestionendpoint||"https://"+i+"dc."+n.endpointsuffix,n.liveendpoint=n.liveendpoint||"https://"+i+"live."+n.endpointsuffix}n.ingestionendpoint=n.ingestionendpoint||aT.DEFAULT_BREEZE_ENDPOINT,n.liveendpoint=n.liveendpoint||aT.DEFAULT_LIVEMETRICS_ENDPOINT}return n},e._FIELDS_SEPARATOR=";",e._FIELD_KEY_VALUE_SEPARATOR="=",e}();sT.exports=ex});var mp=l((aj,lT)=>{"use strict";var Ep=Fr(),uT=oT(),ij=_e(),cT=kt(),tx=__webpack_require__(33),rx=function(){function e(t){var r=this;this.endpointBase=cT.DEFAULT_BREEZE_ENDPOINT;var n=process.env[e.ENV_connectionString],i=uT.parse(t),a=uT.parse(n),s=!i.instrumentationkey&&Object.keys(i).length>0?null:t;this.instrumentationKey=i.instrumentationkey||s||a.instrumentationkey||e._getInstrumentationKey(),e._validateInstrumentationKey(this.instrumentationKey),this.endpointUrl=(i.ingestionendpoint||a.ingestionendpoint||this.endpointBase)+"/v2.1/track",this.maxBatchSize=250,this.maxBatchIntervalMs=15e3,this.disableAppInsights=!1,this.samplingPercentage=100,this.correlationIdRetryIntervalMs=30*1e3,this.correlationHeaderExcludedDomains=["*.core.windows.net","*.core.chinacloudapi.cn","*.core.cloudapi.de","*.core.usgovcloudapi.net","*.core.microsoft.scloud","*.core.eaglex.ic.gov"],this.setCorrelationId=function(o){return r.correlationId=o},this.proxyHttpUrl=process.env[e.ENV_http_proxy]||void 0,this.proxyHttpsUrl=process.env[e.ENV_https_proxy]||void 0,this.httpAgent=void 0,this.httpsAgent=void 0,this.profileQueryEndpoint=i.ingestionendpoint||a.ingestionendpoint||process.env[e.ENV_profileQueryEndpoint]||this.endpointBase,this._quickPulseHost=i.liveendpoint||a.liveendpoint||process.env[e.ENV_quickPulseHost]||cT.DEFAULT_LIVEMETRICS_HOST,this._quickPulseHost.match(/^https?:\/\//)&&(this._quickPulseHost=tx.parse(this._quickPulseHost).host)}return Object.defineProperty(e.prototype,"profileQueryEndpoint",{get:function(){return this._profileQueryEndpoint},set:function(t){Ep.cancelCorrelationIdQuery(this,this.setCorrelationId),this._profileQueryEndpoint=t,this.correlationId=Ep.correlationIdPrefix,Ep.queryCorrelationId(this,this.setCorrelationId)},enumerable:!1,configurable:!0}),Object.defineProperty(e.prototype,"quickPulseHost",{get:function(){return this._quickPulseHost},set:function(t){this._quickPulseHost=t},enumerable:!1,configurable:!0}),e._getInstrumentationKey=function(){var t=process.env[e.ENV_iKey]||process.env[e.ENV_azurePrefix+e.ENV_iKey]||process.env[e.legacy_ENV_iKey]||process.env[e.ENV_azurePrefix+e.legacy_ENV_iKey];if(!t||t=="")throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY before starting the server");return t},e._validateInstrumentationKey=function(t){var r="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",n=new RegExp(r);return n.test(t)},e.ENV_azurePrefix="APPSETTING_",e.ENV_iKey="APPINSIGHTS_INSTRUMENTATIONKEY",e.legacy_ENV_iKey="APPINSIGHTS_INSTRUMENTATION_KEY",e.ENV_profileQueryEndpoint="APPINSIGHTS_PROFILE_QUERY_ENDPOINT",e.ENV_quickPulseHost="APPINSIGHTS_QUICKPULSE_HOST",e.ENV_connectionString="APPLICATIONINSIGHTS_CONNECTION_STRING",e.ENV_nativeMetricsDisablers="APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC",e.ENV_nativeMetricsDisableAll="APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS",e.ENV_http_proxy="http_proxy",e.ENV_https_proxy="https_proxy",e}();lT.exports=rx});var pT=l(hi=>{"use strict";var au=hi&&hi.__assign||function(){return au=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},au.apply(this,arguments)};Object.defineProperty(hi,"__esModule",{value:!0});hi.AutoCollectNativePerformance=void 0;var fT=mp(),Aa=Ea(),nx=_e(),ix=function(){function e(t){this._disabledMetrics={},e.INSTANCE&&e.INSTANCE.dispose(),e.INSTANCE=this,this._client=t}return e.isNodeVersionCompatible=function(){var t=process.versions.node.split(".");return parseInt(t[0])>=6},e.prototype.enable=function(t,r,n){var i=this;if(r===void 0&&(r={}),n===void 0&&(n=6e4),!!e.isNodeVersionCompatible()){if(e._metricsAvailable==null&&t&&!this._isInitialized)try{var a=__webpack_require__(42);e._emitter=new a,e._metricsAvailable=!0,nx.info("Native metrics module successfully loaded!")}catch{e._metricsAvailable=!1;return}this._isEnabled=t,this._disabledMetrics=r,this._isEnabled&&!this._isInitialized&&(this._isInitialized=!0),this._isEnabled&&e._emitter?(e._emitter.enable(!0,n),this._handle||(this._handle=setInterval(function(){return i._trackNativeMetrics()},n),this._handle.unref())):e._emitter&&(e._emitter.enable(!1),this._handle&&(clearInterval(this._handle),this._handle=void 0))}},e.prototype.dispose=function(){this.enable(!1)},e.parseEnabled=function(t){var r=process.env[fT.ENV_nativeMetricsDisableAll],n=process.env[fT.ENV_nativeMetricsDisablers];if(r)return{isEnabled:!1,disabledMetrics:{}};if(n){var i=n.split(","),a={};if(i.length>0)for(var s=0,o=i;s<o.length;s++){var u=o[s];a[u]=!0}return typeof t=="object"?{isEnabled:!0,disabledMetrics:au(au({},t),a)}:{isEnabled:t,disabledMetrics:a}}return typeof t=="boolean"?{isEnabled:t,disabledMetrics:{}}:{isEnabled:!0,disabledMetrics:t}},e.prototype._trackNativeMetrics=function(){var t=!0;typeof this._isEnabled!="object"&&(t=this._isEnabled),t&&(this._trackGarbageCollection(),this._trackEventLoop(),this._trackHeapUsage())},e.prototype._trackGarbageCollection=function(){var t;if(!this._disabledMetrics.gc){var r=e._emitter.getGCData();for(var n in r){var i=r[n].metrics,a=n+" Garbage Collection Duration",s=Math.sqrt(i.sumSquares/i.count-Math.pow(i.total/i.count,2))||0;this._client.trackMetric({name:a,value:i.total,count:i.count,max:i.max,min:i.min,stdDev:s,tagOverrides:(t={},t[this._client.context.keys.internalSdkVersion]="node-nativeperf:"+Aa.sdkVersion,t)})}}},e.prototype._trackEventLoop=function(){var t;if(!this._disabledMetrics.loop){var r=e._emitter.getLoopData(),n=r.loopUsage;if(n.count!=0){var i="Event Loop CPU Time",a=Math.sqrt(n.sumSquares/n.count-Math.pow(n.total/n.count,2))||0;this._client.trackMetric({name:i,value:n.total,count:n.count,min:n.min,max:n.max,stdDev:a,tagOverrides:(t={},t[this._client.context.keys.internalSdkVersion]="node-nativeperf:"+Aa.sdkVersion,t)})}}},e.prototype._trackHeapUsage=function(){var t,r,n;if(!this._disabledMetrics.heap){var i=process.memoryUsage(),a=i.heapUsed,s=i.heapTotal,o=i.rss;this._client.trackMetric({name:"Memory Usage (Heap)",value:a,count:1,tagOverrides:(t={},t[this._client.context.keys.internalSdkVersion]="node-nativeperf:"+Aa.sdkVersion,t)}),this._client.trackMetric({name:"Memory Total (Heap)",value:s,count:1,tagOverrides:(r={},r[this._client.context.keys.internalSdkVersion]="node-nativeperf:"+Aa.sdkVersion,r)}),this._client.trackMetric({name:"Memory Usage (Non-Heap)",value:o-s,count:1,tagOverrides:(n={},n[this._client.context.keys.internalSdkVersion]="node-nativeperf:"+Aa.sdkVersion,n)})}},e}();hi.AutoCollectNativePerformance=ix});var hT=l((oj,dT)=>{"use strict";var ax=_e(),sx=function(){function e(t,r,n,i){this._buffer=[],this._lastSend=0,this._isDisabled=t,this._getBatchSize=r,this._getBatchIntervalMs=n,this._sender=i}return e.prototype.setUseDiskRetryCaching=function(t,r,n){this._sender.setDiskRetryMode(t,r,n)},e.prototype.send=function(t){var r=this;if(!this._isDisabled()){if(!t){ax.warn("Cannot send null/undefined telemetry");return}if(this._buffer.push(t),this._buffer.length>=this._getBatchSize()){this.triggerSend(!1);return}!this._timeoutHandle&&this._buffer.length>0&&(this._timeoutHandle=setTimeout(function(){r._timeoutHandle=null,r.triggerSend(!1)},this._getBatchIntervalMs()))}},e.prototype.triggerSend=function(t,r){var n=this._buffer.length<1;n||(t?(this._sender.saveOnCrash(this._buffer),typeof r=="function"&&r("data saved on crash")):this._sender.send(this._buffer,r)),this._lastSend=+new Date,this._buffer=[],clearTimeout(this._timeoutHandle),this._timeoutHandle=null,n&&typeof r=="function"&&r("no data to send")},e}();dT.exports=sx});var _T=l(su=>{"use strict";Object.defineProperty(su,"__esModule",{value:!0});su.azureRoleEnvironmentTelemetryProcessor=void 0;function ox(e,t){process.env.WEBSITE_SITE_NAME&&(e.tags[t.keys.cloudRole]=process.env.WEBSITE_SITE_NAME)}su.azureRoleEnvironmentTelemetryProcessor=ox});var ET=l(_i=>{"use strict";Object.defineProperty(_i,"__esModule",{value:!0});_i.getSamplingHashCode=_i.samplingTelemetryProcessor=void 0;var vT=De();function ux(e,t){var r=e.sampleRate,n=!1;return r==null||r>=100||e.data&&vT.TelemetryType.Metric===vT.baseTypeToTelemetryType(e.data.baseType)?!0:(t.correlationContext&&t.correlationContext.operation?n=gT(t.correlationContext.operation.id)<r:n=Math.random()*100<r,n)}_i.samplingTelemetryProcessor=ux;function gT(e){var t=-2147483648,r=2147483647,n=5381;if(!e)return 0;for(;e.length<8;)e=e+e;for(var i=0;i<e.length;i++)n=((n<<5)+n|0)+e.charCodeAt(i)|0;return n=n<=t?r:Math.abs(n),n/r*100}_i.getSamplingHashCode=gT});var mT=l(ou=>{"use strict";Object.defineProperty(ou,"__esModule",{value:!0});ou.performanceMetricsTelemetryProcessor=void 0;var yp=Jo(),Tp=De();function cx(e,t){switch(t&&t.addDocument(e),e.data.baseType){case Tp.TelemetryTypeString.Exception:yp.countException();break;case Tp.TelemetryTypeString.Request:var r=e.data.baseData;yp.countRequest(r.duration,r.success);break;case Tp.TelemetryTypeString.Dependency:var n=e.data.baseData;yp.countDependency(n.duration,n.success);break}return!0}ou.performanceMetricsTelemetryProcessor=cx});var yT=l(vi=>{"use strict";var mt=vi&&vi.__assign||function(){return mt=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i])}return e},mt.apply(this,arguments)};Object.defineProperty(vi,"__esModule",{value:!0});vi.preAggregatedMetricsTelemetryProcessor=void 0;var lx=De(),Sa=ap(),uu=De();function fx(e,t){if(Sa.isEnabled())switch(e.data.baseType){case uu.TelemetryTypeString.Exception:var r=e.data.baseData;r.properties=mt(mt({},r.properties),{"_MS.ProcessedByMetricExtractors":"(Name:'Exceptions', Ver:'1.1')"});var n={cloudRoleInstance:e.tags[t.keys.cloudRoleInstance],cloudRoleName:e.tags[t.keys.cloudRole]};Sa.countException(n);break;case uu.TelemetryTypeString.Trace:var i=e.data.baseData;i.properties=mt(mt({},i.properties),{"_MS.ProcessedByMetricExtractors":"(Name:'Traces', Ver:'1.1')"});var a={cloudRoleInstance:e.tags[t.keys.cloudRoleInstance],cloudRoleName:e.tags[t.keys.cloudRole],traceSeverityLevel:lx.SeverityLevel[i.severity]};Sa.countTrace(a);break;case uu.TelemetryTypeString.Request:var s=e.data.baseData;s.properties=mt(mt({},s.properties),{"_MS.ProcessedByMetricExtractors":"(Name:'Requests', Ver:'1.1')"});var o={cloudRoleInstance:e.tags[t.keys.cloudRoleInstance],cloudRoleName:e.tags[t.keys.cloudRole],operationSynthetic:e.tags[t.keys.operationSyntheticSource],requestSuccess:s.success,requestResultCode:s.responseCode};Sa.countRequest(s.duration,o);break;case uu.TelemetryTypeString.Dependency:var u=e.data.baseData;u.properties=mt(mt({},u.properties),{"_MS.ProcessedByMetricExtractors":"(Name:'Dependencies', Ver:'1.1')"});var c={cloudRoleInstance:e.tags[t.keys.cloudRoleInstance],cloudRoleName:e.tags[t.keys.cloudRole],operationSynthetic:e.tags[t.keys.operationSyntheticSource],dependencySuccess:u.success,dependencyType:u.type,dependencyTarget:u.target,dependencyResultCode:u.resultCode};Sa.countDependency(u.duration,c);break}return!0}vi.preAggregatedMetricsTelemetryProcessor=fx});var TT=l(yt=>{"use strict";var px=yt&&yt.__createBinding||(Object.create?function(e,t,r,n){n===void 0&&(n=r),Object.defineProperty(e,n,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,n){n===void 0&&(n=r),e[n]=t[r]}),cu=yt&&yt.__exportStar||function(e,t){for(var r in e)r!=="default"&&!Object.prototype.hasOwnProperty.call(t,r)&&px(t,e,r)};Object.defineProperty(yt,"__esModule",{value:!0});cu(_T(),yt);cu(ET(),yt);cu(mT(),yt);cu(yT(),yt)});var IT=l((Ia,ST)=>{"use strict";var dx=Ia&&Ia.__awaiter||function(e,t,r,n){function i(a){return a instanceof r?a:new r(function(s){s(a)})}return new(r||(r=Promise))(function(a,s){function o(f){try{c(n.next(f))}catch(p){s(p)}}function u(f){try{c(n.throw(f))}catch(p){s(p)}}function c(f){f.done?a(f.value):i(f.value).then(o,u)}c((n=n.apply(e,t||[])).next())})},hx=Ia&&Ia.__generator||function(e,t){var r={label:0,sent:function(){if(a[0]&1)throw a[1];return a[1]},trys:[],ops:[]},n,i,a,s;return s={next:o(0),throw:o(1),return:o(2)},typeof Symbol=="function"&&(s[Symbol.iterator]=function(){return this}),s;function o(c){return function(f){return u([c,f])}}function u(c){if(n)throw new TypeError("Generator is already executing.");for(;r;)try{if(n=1,i&&(a=c[0]&2?i.return:c[0]?i.throw||((a=i.return)&&a.call(i),0):i.next)&&!(a=a.call(i,c[1])).done)return a;switch(i=0,a&&(c=[c[0]&2,a.value]),c[0]){case 0:case 1:a=c;break;case 4:return r.label++,{value:c[1],done:!1};case 5:r.label++,i=c[1],c=[0];continue;case 7:c=r.ops.pop(),r.trys.pop();continue;default:if(a=r.trys,!(a=a.length>0&&a[a.length-1])&&(c[0]===6||c[0]===2)){r=0;continue}if(c[0]===3&&(!a||c[1]>a[0]&&c[1]<a[3])){r.label=c[1];break}if(c[0]===6&&r.label<a[1]){r.label=a[1],a=c;break}if(a&&r.label<a[2]){r.label=a[2],r.ops.push(c);break}a[2]&&r.ops.pop(),r.trys.pop();continue}c=t.call(e,r)}catch(f){c=[6,f],i=0}finally{n=a=0}if(c[0]&5)throw c[1];return{value:c[0]?c[1]:void 0,done:!0}}},ge=__webpack_require__(3),AT=__webpack_require__(24),Bt=__webpack_require__(22),_x=__webpack_require__(41),gi=__webpack_require__(39),Ee=_e(),vx=di(),lu=Ue(),gx=function(){function e(t,r,n){if(this._redirectedHost=null,this._config=t,this._onSuccess=r,this._onError=n,this._enableDiskRetryMode=!1,this._resendInterval=e.WAIT_BETWEEN_RESEND,this._maxBytesOnDisk=e.MAX_BYTES_ON_DISK,this._numConsecutiveFailures=0,this._numConsecutiveRedirects=0,this._resendTimer=null,this._fileCleanupTimer=null,this._tempDir=Bt.join(AT.tmpdir(),e.TEMPDIR_PREFIX+this._config.instrumentationKey),!e.OS_PROVIDES_FILE_PROTECTION)if(e.USE_ICACLS){try{e.OS_PROVIDES_FILE_PROTECTION=ge.existsSync(e.ICACLS_PATH)}catch{}e.OS_PROVIDES_FILE_PROTECTION||Ee.warn(e.TAG,"Could not find ICACLS in expected location! This is necessary to use disk retry mode on Windows.")}else e.OS_PROVIDES_FILE_PROTECTION=!0}return e.prototype.setDiskRetryMode=function(t,r,n){var i=this;this._enableDiskRetryMode=e.OS_PROVIDES_FILE_PROTECTION&&t,typeof r=="number"&&r>=0&&(this._resendInterval=Math.floor(r)),typeof n=="number"&&n>=0&&(this._maxBytesOnDisk=Math.floor(n)),t&&!e.OS_PROVIDES_FILE_PROTECTION&&(this._enableDiskRetryMode=!1,Ee.warn(e.TAG,"Ignoring request to enable disk retry mode. Sufficient file protection capabilities were not detected.")),this._enableDiskRetryMode?this._fileCleanupTimer||(this._fileCleanupTimer=setTimeout(function(){i._fileCleanupTask()},e.CLEANUP_TIMEOUT),this._fileCleanupTimer.unref()):this._fileCleanupTimer&&clearTimeout(this._fileCleanupTimer)},e.prototype.send=function(t,r){return dx(this,void 0,void 0,function(){var n,i,a,s,o=this;return hx(this,function(u){return t&&(n=this._redirectedHost||this._config.endpointUrl,i={method:"POST",withCredentials:!1,headers:{"Content-Type":"application/x-json-stream"}},a="",t.forEach(function(c){var f=o._stringify(c);typeof f=="string"&&(a+=f+`
`)}),a.length>0&&(a=a.substring(0,a.length-1)),s=Buffer.from?Buffer.from(a):new Buffer(a),_x.gzip(s,function(c,f){var p=f;c?(Ee.warn(c),p=s,i.headers["Content-Length"]=s.length.toString()):(i.headers["Content-Encoding"]="gzip",i.headers["Content-Length"]=f.length.toString()),Ee.info(e.TAG,i),i[vx.disableCollectionRequestOption]=!0;var d=function(E){E.setEncoding("utf-8");var A="";E.on("data",function(j){A+=j}),E.on("end",function(){if(o._numConsecutiveFailures=0,o._enableDiskRetryMode){if(E.statusCode===200)o._resendTimer||(o._resendTimer=setTimeout(function(){o._resendTimer=null,o._sendFirstFileOnDisk()},o._resendInterval),o._resendTimer.unref());else if(o._isRetriable(E.statusCode))try{var j=JSON.parse(A),se=[];j.errors.forEach(function(At){o._isRetriable(At.statusCode)&&se.push(t[At.index])}),se.length>0&&o._storeToDisk(se)}catch{o._storeToDisk(t)}}if(E.statusCode===307||E.statusCode===308)if(o._numConsecutiveRedirects++,o._numConsecutiveRedirects<10){var Ae=E.headers.location?E.headers.location.toString():null;Ae&&(o._redirectedHost=Ae,o.send(t,r))}else typeof r=="function"&&r("Error sending telemetry because of circular redirects.");else o._numConsecutiveRedirects=0,typeof r=="function"&&r(A),Ee.info(e.TAG,A),typeof o._onSuccess=="function"&&o._onSuccess(A)})},h=lu.makeRequest(o._config,n,i,d);h.on("error",function(E){if(o._numConsecutiveFailures++,!o._enableDiskRetryMode||o._numConsecutiveFailures>0&&o._numConsecutiveFailures%e.MAX_CONNECTION_FAILURES_BEFORE_WARN===0){var A="Ingestion endpoint could not be reached. This batch of telemetry items has been lost. Use Disk Retry Caching to enable resending of failed telemetry. Error:";o._enableDiskRetryMode&&(A="Ingestion endpoint could not be reached "+o._numConsecutiveFailures+" consecutive times. There may be resulting telemetry loss. Most recent error:"),Ee.warn(e.TAG,A,lu.dumpObj(E))}else{var A="Transient failure to reach ingestion endpoint. This batch of telemetry items will be retried. Error:";Ee.info(e.TAG,A,lu.dumpObj(E))}o._onErrorHelper(E),typeof r=="function"&&(E&&r(lu.dumpObj(E)),r("Error sending telemetry")),o._enableDiskRetryMode&&o._storeToDisk(t)}),h.write(p),h.end()})),[2]})})},e.prototype.saveOnCrash=function(t){this._enableDiskRetryMode&&this._storeToDiskSync(this._stringify(t))},e.prototype._isRetriable=function(t){return t===206||t===408||t===429||t===439||t===500||t===503},e.prototype._runICACLS=function(t,r){var n=gi.spawn(e.ICACLS_PATH,t,{windowsHide:!0});n.on("error",function(i){return r(i)}),n.on("close",function(i,a){return r(i===0?null:new Error("Setting ACL restrictions did not succeed (ICACLS returned code "+i+")"))})},e.prototype._runICACLSSync=function(t){if(gi.spawnSync){var r=gi.spawnSync(e.ICACLS_PATH,t,{windowsHide:!0});if(r.error)throw r.error;if(r.status!==0)throw new Error("Setting ACL restrictions did not succeed (ICACLS returned code "+r.status+")")}else throw new Error("Could not synchronously call ICACLS under current version of Node.js")},e.prototype._getACLIdentity=function(t){if(e.ACL_IDENTITY)return t(null,e.ACL_IDENTITY);var r=gi.spawn(e.POWERSHELL_PATH,["-Command","[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"],{windowsHide:!0,stdio:["ignore","pipe","pipe"]}),n="";r.stdout.on("data",function(i){return n+=i}),r.on("error",function(i){return t(i,null)}),r.on("close",function(i,a){return e.ACL_IDENTITY=n&&n.trim(),t(i===0?null:new Error("Getting ACL identity did not succeed (PS returned code "+i+")"),e.ACL_IDENTITY)})},e.prototype._getACLIdentitySync=function(){if(e.ACL_IDENTITY)return e.ACL_IDENTITY;if(gi.spawnSync){var t=gi.spawnSync(e.POWERSHELL_PATH,["-Command","[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"],{windowsHide:!0,stdio:["ignore","pipe","pipe"]});if(t.error)throw t.error;if(t.status!==0)throw new Error("Getting ACL identity did not succeed (PS returned code "+t.status+")");return e.ACL_IDENTITY=t.stdout&&t.stdout.toString().trim(),e.ACL_IDENTITY}else throw new Error("Could not synchronously get ACL identity under current version of Node.js")},e.prototype._getACLArguments=function(t,r){return[t,"/grant","*S-1-5-32-544:(OI)(CI)F","/grant",r+":(OI)(CI)F","/inheritance:r"]},e.prototype._applyACLRules=function(t,r){var n=this;if(!e.USE_ICACLS)return r(null);if(e.ACLED_DIRECTORIES[t]===void 0)e.ACLED_DIRECTORIES[t]=!1,this._getACLIdentity(function(i,a){if(i)return e.ACLED_DIRECTORIES[t]=!1,r(i);n._runICACLS(n._getACLArguments(t,a),function(s){return e.ACLED_DIRECTORIES[t]=!s,r(s)})});else return r(e.ACLED_DIRECTORIES[t]?null:new Error("Setting ACL restrictions did not succeed (cached result)"))},e.prototype._applyACLRulesSync=function(t){if(e.USE_ICACLS){if(e.ACLED_DIRECTORIES[t]===void 0){this._runICACLSSync(this._getACLArguments(t,this._getACLIdentitySync())),e.ACLED_DIRECTORIES[t]=!0;return}else if(!e.ACLED_DIRECTORIES[t])throw new Error("Setting ACL restrictions did not succeed (cached result)")}},e.prototype._confirmDirExists=function(t,r){var n=this;ge.lstat(t,function(i,a){i&&i.code==="ENOENT"?ge.mkdir(t,function(s){s&&s.code!=="EEXIST"?r(s):n._applyACLRules(t,r)}):!i&&a.isDirectory()?n._applyACLRules(t,r):r(i||new Error("Path existed but was not a directory"))})},e.prototype._getShallowDirectorySize=function(t,r){ge.readdir(t,function(n,i){if(n)return r(n,-1);var a=null,s=0,o=0;if(i.length===0){r(null,0);return}for(var u=0;u<i.length;u++)ge.stat(Bt.join(t,i[u]),function(c,f){o++,c?a=c:f.isFile()&&(s+=f.size),o===i.length&&(a?r(a,-1):r(a,s))})})},e.prototype._getShallowDirectorySizeSync=function(t){for(var r=ge.readdirSync(t),n=0,i=0;i<r.length;i++)n+=ge.statSync(Bt.join(t,r[i])).size;return n},e.prototype._storeToDisk=function(t){var r=this;Ee.info(e.TAG,"Checking existence of data storage directory: "+this._tempDir),this._confirmDirExists(this._tempDir,function(n){if(n){Ee.warn(e.TAG,"Error while checking/creating directory: "+(n&&n.message)),r._onErrorHelper(n);return}r._getShallowDirectorySize(r._tempDir,function(i,a){if(i||a<0){Ee.warn(e.TAG,"Error while checking directory size: "+(i&&i.message)),r._onErrorHelper(i);return}else if(a>r._maxBytesOnDisk){Ee.warn(e.TAG,"Not saving data due to max size limit being met. Directory size in bytes is: "+a);return}var s=new Date().getTime()+".ai.json",o=Bt.join(r._tempDir,s);Ee.info(e.TAG,"saving data to disk at: "+o),ge.writeFile(o,r._stringify(t),{mode:384},function(u){return r._onErrorHelper(u)})})})},e.prototype._storeToDiskSync=function(t){try{Ee.info(e.TAG,"Checking existence of data storage directory: "+this._tempDir),ge.existsSync(this._tempDir)||ge.mkdirSync(this._tempDir),this._applyACLRulesSync(this._tempDir);var r=this._getShallowDirectorySizeSync(this._tempDir);if(r>this._maxBytesOnDisk){Ee.info(e.TAG,"Not saving data due to max size limit being met. Directory size in bytes is: "+r);return}var n=new Date().getTime()+".ai.json",i=Bt.join(this._tempDir,n);Ee.info(e.TAG,"saving data before crash to disk at: "+i),ge.writeFileSync(i,t,{mode:384})}catch(a){Ee.warn(e.TAG,"Error while saving data to disk: "+(a&&a.message)),this._onErrorHelper(a)}},e.prototype._sendFirstFileOnDisk=function(){var t=this;ge.exists(this._tempDir,function(r){r&&ge.readdir(t._tempDir,function(n,i){if(n)t._onErrorHelper(n);else if(i=i.filter(function(o){return Bt.basename(o).indexOf(".ai.json")>-1}),i.length>0){var a=i[0],s=Bt.join(t._tempDir,a);ge.readFile(s,function(o,u){o?t._onErrorHelper(o):ge.unlink(s,function(c){if(c)t._onErrorHelper(c);else try{var f=JSON.parse(u.toString());t.send(f)}catch(p){Ee.warn("Failed to read persisted file",p)}})})}})})},e.prototype._onErrorHelper=function(t){typeof this._onError=="function"&&this._onError(t)},e.prototype._stringify=function(t){try{return JSON.stringify(t)}catch(r){Ee.warn("Failed to serialize payload",r,t)}},e.prototype._fileCleanupTask=function(){var t=this;ge.exists(this._tempDir,function(r){r&&ge.readdir(t._tempDir,function(n,i){n?t._onErrorHelper(n):(i=i.filter(function(a){return Bt.basename(a).indexOf(".ai.json")>-1}),i.length>0&&i.forEach(function(a){var s=new Date(parseInt(a.split(".ai.json")[0])),o=new Date(+new Date-e.FILE_RETEMPTION_PERIOD)>s;if(o){var u=Bt.join(t._tempDir,a);ge.unlink(u,function(c){c&&t._onErrorHelper(c)})}}))})})},e.TAG="Sender",e.ICACLS_PATH=process.env.systemdrive+"/windows/system32/icacls.exe",e.POWERSHELL_PATH=process.env.systemdrive+"/windows/system32/windowspowershell/v1.0/powershell.exe",e.ACLED_DIRECTORIES={},e.ACL_IDENTITY=null,e.WAIT_BETWEEN_RESEND=60*1e3,e.MAX_BYTES_ON_DISK=50*1024*1024,e.MAX_CONNECTION_FAILURES_BEFORE_WARN=5,e.CLEANUP_TIMEOUT=60*60*1e3,e.FILE_RETEMPTION_PERIOD=7*24*60*60*1e3,e.TEMPDIR_PREFIX="appInsights-node",e.OS_PROVIDES_FILE_PROTECTION=!1,e.USE_ICACLS=AT.type()==="Windows_NT",e}();ST.exports=gx});var OT=l((dj,bT)=>{"use strict";var S=De(),tt=Ue(),Ex=Er(),mx=function(){function e(){}return e.createEnvelope=function(t,r,n,i,a){var s=null;switch(r){case S.TelemetryType.Trace:s=e.createTraceData(t);break;case S.TelemetryType.Dependency:s=e.createDependencyData(t);break;case S.TelemetryType.Event:s=e.createEventData(t);break;case S.TelemetryType.Exception:s=e.createExceptionData(t);break;case S.TelemetryType.Request:s=e.createRequestData(t);break;case S.TelemetryType.Metric:s=e.createMetricData(t);break;case S.TelemetryType.Availability:s=e.createAvailabilityData(t);break;case S.TelemetryType.PageView:s=e.createPageViewData(t);break}if(n&&S.domainSupportsProperties(s.baseData)){if(s&&s.baseData)if(!s.baseData.properties)s.baseData.properties=n;else for(var o in n)s.baseData.properties[o]||(s.baseData.properties[o]=n[o]);s.baseData.properties=tt.validateStringMap(s.baseData.properties)}var u=a&&a.instrumentationKey||"",c=new S.Envelope;return c.data=s,c.iKey=u,c.name="Microsoft.ApplicationInsights."+u.replace(/-/g,"")+"."+s.baseType.substr(0,s.baseType.length-4),c.tags=this.getTags(i,t.tagOverrides),c.time=new Date().toISOString(),c.ver=1,c.sampleRate=a?a.samplingPercentage:100,r===S.TelemetryType.Metric&&(c.sampleRate=100),c},e.createTraceData=function(t){var r=new S.MessageData;r.message=t.message,r.properties=t.properties,isNaN(t.severity)?r.severityLevel=S.SeverityLevel.Information:r.severityLevel=t.severity;var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Trace),n.baseData=r,n},e.createDependencyData=function(t){var r=new S.RemoteDependencyData;typeof t.name=="string"&&(r.name=t.name.length>1024?t.name.slice(0,1021)+"...":t.name),r.data=t.data,r.target=t.target,r.duration=tt.msToTimeSpan(t.duration),r.success=t.success,r.type=t.dependencyTypeName,r.properties=t.properties,r.resultCode=t.resultCode?t.resultCode+"":"",t.id?r.id=t.id:r.id=tt.w3cTraceId();var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Dependency),n.baseData=r,n},e.createEventData=function(t){var r=new S.EventData;r.name=t.name,r.properties=t.properties,r.measurements=t.measurements;var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Event),n.baseData=r,n},e.createExceptionData=function(t){var r=new S.ExceptionData;r.properties=t.properties,isNaN(t.severity)?r.severityLevel=S.SeverityLevel.Error:r.severityLevel=t.severity,r.measurements=t.measurements,r.exceptions=[];var n=t.exception.stack,i=new S.ExceptionDetails;i.message=t.exception.message,i.typeName=t.exception.name,i.parsedStack=this.parseStack(n),i.hasFullStack=tt.isArray(i.parsedStack)&&i.parsedStack.length>0,r.exceptions.push(i);var a=new S.Data;return a.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Exception),a.baseData=r,a},e.createRequestData=function(t){var r=new S.RequestData;t.id?r.id=t.id:r.id=tt.w3cTraceId(),r.name=t.name,r.url=t.url,r.source=t.source,r.duration=tt.msToTimeSpan(t.duration),r.responseCode=t.resultCode?t.resultCode+"":"",r.success=t.success,r.properties=t.properties;var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Request),n.baseData=r,n},e.createMetricData=function(t){var r=new S.MetricData;r.metrics=[];var n=new S.DataPoint;n.count=isNaN(t.count)?1:t.count,n.kind=S.DataPointType.Aggregation,n.max=isNaN(t.max)?t.value:t.max,n.min=isNaN(t.min)?t.value:t.min,n.name=t.name,n.stdDev=isNaN(t.stdDev)?0:t.stdDev,n.value=t.value,r.metrics.push(n),r.properties=t.properties;var i=new S.Data;return i.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Metric),i.baseData=r,i},e.createAvailabilityData=function(t){var r=new S.AvailabilityData;t.id?r.id=t.id:r.id=tt.w3cTraceId(),r.name=t.name,r.duration=tt.msToTimeSpan(t.duration),r.success=t.success,r.runLocation=t.runLocation,r.message=t.message,r.measurements=t.measurements,r.properties=t.properties;var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.Availability),n.baseData=r,n},e.createPageViewData=function(t){var r=new S.PageViewData;r.name=t.name,r.duration=tt.msToTimeSpan(t.duration),r.url=t.url,r.measurements=t.measurements,r.properties=t.properties;var n=new S.Data;return n.baseType=S.telemetryTypeToBaseType(S.TelemetryType.PageView),n.baseData=r,n},e.getTags=function(t,r){var n=Ex.CorrelationContextManager.getCurrentContext(),i={};if(t&&t.tags)for(var a in t.tags)i[a]=t.tags[a];if(r)for(var a in r)i[a]=r[a];return n&&(i[t.keys.operationId]=i[t.keys.operationId]||n.operation.id,i[t.keys.operationName]=i[t.keys.operationName]||n.operation.name,i[t.keys.operationParentId]=i[t.keys.operationParentId]||n.operation.parentId),i},e.parseStack=function(t){var r=void 0;if(typeof t=="string"){var n=t.split(`
`);r=[];for(var i=0,a=0,s=0;s<=n.length;s++){var o=n[s];if(CT.regex.test(o)){var u=new CT(n[s],i++);a+=u.sizeInBytes,r.push(u)}}var c=32*1024;if(a>c)for(var f=0,p=r.length-1,d=0,h=f,E=p;f<p;){var A=r[f].sizeInBytes,j=r[p].sizeInBytes;if(d+=A+j,d>c){var se=E-h+1;r.splice(h,se);break}h=f,E=p,f++,p--}}return r},e}(),CT=function(){function e(t,r){this.sizeInBytes=0,this.level=r,this.method="<no_method>",this.assembly=tt.trim(t);var n=t.match(e.regex);n&&n.length>=5&&(this.method=tt.trim(n[2])||this.method,this.fileName=tt.trim(n[4])||"<no_filename>",this.line=parseInt(n[5])||0),this.sizeInBytes+=this.method.length,this.sizeInBytes+=this.fileName.length,this.sizeInBytes+=this.assembly.length,this.sizeInBytes+=e.baseSize,this.sizeInBytes+=this.level.toString().length,this.sizeInBytes+=this.line.toString().length}return e.regex=/^(\s+at)?(.*?)(\@|\s\(|\s)([^\(\n]+):(\d+):(\d+)(\)?)$/,e.baseSize=58,e}();bT.exports=mx});var DT=l((hj,NT)=>{"use strict";var yx=__webpack_require__(33),Tx=mp(),Ax=Ea(),Ft=De(),Sx=hT(),fu=TT(),PT=Er(),Ix=IT(),Ap=Ue(),RT=_e(),Cx=OT(),bx=function(){function e(t){this._telemetryProcessors=[],this._enableAzureProperties=!1;var r=new Tx(t);this.config=r,this.context=new Ax,this.commonProperties={};var n=new Ix(this.config);this.channel=new Sx(function(){return r.disableAppInsights},function(){return r.maxBatchSize},function(){return r.maxBatchIntervalMs},n)}return e.prototype.trackAvailability=function(t){this.track(t,Ft.TelemetryType.Availability)},e.prototype.trackPageView=function(t){this.track(t,Ft.TelemetryType.PageView)},e.prototype.trackTrace=function(t){this.track(t,Ft.TelemetryType.Trace)},e.prototype.trackMetric=function(t){this.track(t,Ft.TelemetryType.Metric)},e.prototype.trackException=function(t){t&&t.exception&&!Ap.isError(t.exception)&&(t.exception=new Error(t.exception.toString())),this.track(t,Ft.TelemetryType.Exception)},e.prototype.trackEvent=function(t){this.track(t,Ft.TelemetryType.Event)},e.prototype.trackRequest=function(t){this.track(t,Ft.TelemetryType.Request)},e.prototype.trackDependency=function(t){t&&!t.target&&t.data&&(t.target=yx.parse(t.data).host),this.track(t,Ft.TelemetryType.Dependency)},e.prototype.flush=function(t){this.channel.triggerSend(t?!!t.isAppCrashing:!1,t?t.callback:void 0)},e.prototype.track=function(t,r){if(t&&Ft.telemetryTypeToBaseType(r)){var n=Cx.createEnvelope(t,r,this.commonProperties,this.context,this.config);t.time&&(n.time=t.time.toISOString()),this._enableAzureProperties&&fu.azureRoleEnvironmentTelemetryProcessor(n,this.context);var i=this.runTelemetryProcessors(n,t.contextObjects);i=i&&fu.samplingTelemetryProcessor(n,{correlationContext:PT.CorrelationContextManager.getCurrentContext()}),fu.preAggregatedMetricsTelemetryProcessor(n,this.context),i&&(fu.performanceMetricsTelemetryProcessor(n,this.quickPulseClient),this.channel.send(n))}else RT.warn("track() requires telemetry object and telemetryType to be specified.")},e.prototype.setAutoPopulateAzureProperties=function(t){this._enableAzureProperties=t},e.prototype.addTelemetryProcessor=function(t){this._telemetryProcessors.push(t)},e.prototype.clearTelemetryProcessors=function(){this._telemetryProcessors=[]},e.prototype.runTelemetryProcessors=function(t,r){var n=!0,i=this._telemetryProcessors.length;if(i===0)return n;r=r||{},r.correlationContext=PT.CorrelationContextManager.getCurrentContext();for(var a=0;a<i;++a)try{var s=this._telemetryProcessors[a];if(s&&s.apply(null,[t,r])===!1){n=!1;break}}catch(o){n=!0,RT.warn("One of telemetry processors failed, telemetry item will be sent.",o,t)}return n&&(t&&t.tags&&(t.tags=Ap.validateStringMap(t.tags)),t&&t.data&&t.data.baseData&&t.data.baseData.properties&&(t.data.baseData.properties=Ap.validateStringMap(t.data.baseData.properties))),n},e}();NT.exports=bx});var MT=l((Sp,xT)=>{"use strict";var Ox=Sp&&Sp.__extends||function(){var e=function(t,r){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(n[a]=i[a])},e(t,r)};return function(t,r){e(t,r);function n(){this.constructor=t}t.prototype=r===null?Object.create(r):(n.prototype=r.prototype,new n)}}(),Px=DT(),wT=hp(),Rx=di(),pu=_e(),Nx=function(e){Ox(t,e);function t(){return e!==null&&e.apply(this,arguments)||this}return t.prototype.trackNodeHttpRequestSync=function(r){r&&r.request&&r.response&&r.duration?wT.trackRequestSync(this,r):pu.warn("trackNodeHttpRequestSync requires NodeHttpRequestTelemetry object with request, response and duration specified.")},t.prototype.trackNodeHttpRequest=function(r){(r.duration||r.error)&&pu.warn("trackNodeHttpRequest will ignore supplied duration and error parameters. These values are collected from the request and response objects."),r&&r.request&&r.response?wT.trackRequest(this,r):pu.warn("trackNodeHttpRequest requires NodeHttpRequestTelemetry object with request and response specified.")},t.prototype.trackNodeHttpDependency=function(r){r&&r.request?Rx.trackRequest(this,r):pu.warn("trackNodeHttpDependency requires NodeHttpDependencyTelemetry object with request specified.")},t}(Px);xT.exports=Nx});var qT=l(LT=>{"use strict";Object.defineProperty(LT,"__esModule",{value:!0})});var nA=l(m=>{"use strict";Object.defineProperty(m,"__esModule",{value:!0});m.dispose=m.Configuration=m.wrapWithCorrelationContext=m.startOperation=m.getCorrelationContext=m.start=m.setup=m.liveMetricsClient=m.defaultClient=m.DistributedTracingModes=void 0;var Ip=Er(),Dx=oy(),wx=cy(),kT=Jo(),xx=ap(),Mx=ky(),Lx=di(),qx=hp(),HT=Fr(),Ca=_e(),jx=iT(),UT=pT();m.TelemetryClient=MT();m.Contracts=De();m.azureFunctionsTypes=qT();var BT;(function(e){e[e.AI=0]="AI",e[e.AI_AND_W3C=1]="AI_AND_W3C"})(BT=m.DistributedTracingModes||(m.DistributedTracingModes={}));var FT=!0,GT=!1,VT=!0,$T=!0,zT=!0,XT=!1,KT=!0,YT=!0,QT=!0,Cp=!0,WT,du=!1,ZT=!0,JT,eA=void 0,tA=void 0,ba,Oa,Pa,Ra,Na,Ei,en,Da,Tt=!1,jT;function kx(e){return m.defaultClient?Ca.info("The default client is already setup"):(m.defaultClient=new m.TelemetryClient(e),ba=new Dx(m.defaultClient),Oa=new wx(m.defaultClient),Pa=new kT(m.defaultClient),Ra=new xx(m.defaultClient),Na=new Mx(m.defaultClient),en=new qx(m.defaultClient),Da=new Lx(m.defaultClient),Ei||(Ei=new UT.AutoCollectNativePerformance(m.defaultClient))),m.defaultClient&&m.defaultClient.channel&&m.defaultClient.channel.setUseDiskRetryCaching(QT,eA,tA),bp}m.setup=kx;function rA(){return m.defaultClient?(Tt=!0,ba.enable(FT,GT),Oa.enable(VT),Pa.enable($T),Ra.enable(zT),Na.enable(XT,m.defaultClient.config),Ei.enable(ZT,JT),en.useAutoCorrelation(Cp,WT),en.enable(KT),Da.enable(YT),m.liveMetricsClient&&du&&m.liveMetricsClient.enable(du)):Ca.warn("Start cannot be called before setup"),bp}m.start=rA;function Hx(){return Cp?Ip.CorrelationContextManager.getCurrentContext():null}m.getCorrelationContext=Hx;function Ux(e,t){return Ip.CorrelationContextManager.startOperation(e,t)}m.startOperation=Ux;function Bx(e,t){return Ip.CorrelationContextManager.wrapCallback(e,t)}m.wrapWithCorrelationContext=Bx;var bp=function(){function e(){}return e.setDistributedTracingMode=function(t){return HT.w3cEnabled=t===BT.AI_AND_W3C,e},e.setAutoCollectConsole=function(t,r){return r===void 0&&(r=!1),FT=t,GT=r,Tt&&ba.enable(t,r),e},e.setAutoCollectExceptions=function(t){return VT=t,Tt&&Oa.enable(t),e},e.setAutoCollectPerformance=function(t,r){r===void 0&&(r=!0),$T=t;var n=UT.AutoCollectNativePerformance.parseEnabled(r);return ZT=n.isEnabled,JT=n.disabledMetrics,Tt&&(Pa.enable(t),Ei.enable(n.isEnabled,n.disabledMetrics)),e},e.setAutoCollectPreAggregatedMetrics=function(t){return zT=t,Tt&&Ra.enable(t),e},e.setAutoCollectHeartbeat=function(t){return XT=t,Tt&&Na.enable(t,m.defaultClient.config),e},e.setAutoCollectRequests=function(t){return KT=t,Tt&&en.enable(t),e},e.setAutoCollectDependencies=function(t){return YT=t,Tt&&Da.enable(t),e},e.setAutoDependencyCorrelation=function(t,r){return Cp=t,WT=r,Tt&&en.useAutoCorrelation(t,r),e},e.setUseDiskRetryCaching=function(t,r,n){return QT=t,eA=r,tA=n,m.defaultClient&&m.defaultClient.channel&&m.defaultClient.channel.setUseDiskRetryCaching(t,r,n),e},e.setInternalLogging=function(t,r){return t===void 0&&(t=!1),r===void 0&&(r=!0),Ca.enableDebug=t,Ca.disableWarnings=!r,e},e.setSendLiveMetrics=function(t){return t===void 0&&(t=!1),m.defaultClient?(!m.liveMetricsClient&&t?(m.liveMetricsClient=new jx(m.defaultClient.config,null),jT=new kT(m.liveMetricsClient,1e3,!0),m.liveMetricsClient.addCollector(jT),m.defaultClient.quickPulseClient=m.liveMetricsClient):m.liveMetricsClient&&m.liveMetricsClient.enable(t),du=t,e):(Ca.warn("Live metrics client cannot be setup without the default client"),e)},e.start=rA,e}();m.Configuration=bp;function Fx(){HT.w3cEnabled=!0,m.defaultClient=null,Tt=!1,ba&&ba.dispose(),Oa&&Oa.dispose(),Pa&&Pa.dispose(),Ra&&Ra.dispose(),Na&&Na.dispose(),Ei&&Ei.dispose(),en&&en.dispose(),Da&&Da.dispose(),m.liveMetricsClient&&(m.liveMetricsClient.enable(!1),du=!1,m.liveMetricsClient=void 0)}m.dispose=Fx});var zx={};hA(zx,{default:()=>hu});module.exports=_A(zx);var mi=nn(__webpack_require__(24)),Gt=nn(__webpack_require__(1)),iA=nn(__webpack_require__(32));var Se=class{constructor(t){this.vscodeAPI=t}getTelemetryLevel(){let t="telemetry",r="enableTelemetry";try{let n=this.vscodeAPI.env.telemetryConfiguration;return n.isUsageEnabled&&n.isErrorsEnabled&&n.isCrashEnabled?"on":n.isErrorsEnabled&&n.isCrashEnabled?"error":"off"}catch{return this.vscodeAPI.env.isTelemetryEnabled!==void 0?this.vscodeAPI.env.isTelemetryEnabled?"on":"off":this.vscodeAPI.workspace.getConfiguration(t).get(r)?"on":"off"}}static applyReplacements(t,r){for(let n of Object.keys(t))for(let i of r)i.lookup.test(n)&&(i.replacementString!==void 0?t[n]=i.replacementString:delete t[n])}static shouldUseOneDataSystemSDK(t){return t.length===74&&t[32]==="-"&&t[41]==="-"&&t[46]==="-"&&t[51]==="-"&&t[56]==="-"&&t[69]==="-"}static getInstance(t){return Se._instance||(Se._instance=new Se(t)),Se._instance}};var wa=class{constructor(t,r,n,i,a,s){this.extensionId=t;this.extensionVersion=r;this.telemetryAppender=n;this.osShim=i;this.vscodeAPI=a;this.firstParty=!1;this.userOptIn=!1;this.errorOptIn=!1;this.disposables=[];this.firstParty=!!s,this.updateUserOptStatus(),a.env.onDidChangeTelemetryEnabled!==void 0?(this.disposables.push(a.env.onDidChangeTelemetryEnabled(()=>this.updateUserOptStatus())),this.disposables.push(a.workspace.onDidChangeConfiguration(()=>this.updateUserOptStatus()))):this.disposables.push(a.workspace.onDidChangeConfiguration(()=>this.updateUserOptStatus()))}updateUserOptStatus(){let t=Se.getInstance(this.vscodeAPI).getTelemetryLevel();this.userOptIn=t==="on",this.errorOptIn=t==="error"||this.userOptIn,(this.userOptIn||this.errorOptIn)&&this.telemetryAppender.instantiateAppender()}cleanRemoteName(t){if(!t)return"none";let r="other";return["ssh-remote","dev-container","attached-container","wsl","codespaces"].forEach(n=>{t.indexOf(`${n}`)===0&&(r=n)}),r}get extension(){return this._extension===void 0&&(this._extension=this.vscodeAPI.extensions.getExtension(this.extensionId)),this._extension}cloneAndChange(t,r){if(t===null||typeof t!="object"||typeof r!="function")return t;let n={};for(let i in t)n[i]=r(i,t[i]);return n}shouldSendErrorTelemetry(){return this.errorOptIn===!1?!1:this.firstParty?!(this.vscodeAPI.env.remoteName&&this.cleanRemoteName(this.vscodeAPI.env.remoteName)==="other"):!0}getCommonProperties(){let t={};if(t["common.os"]=this.osShim.platform,t["common.nodeArch"]=this.osShim.architecture,t["common.platformversion"]=(this.osShim.release||"").replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/,"$1$2$3"),t["common.extname"]=this.extensionId,t["common.extversion"]=this.extensionVersion,this.vscodeAPI&&this.vscodeAPI.env){switch(t["common.vscodemachineid"]=this.vscodeAPI.env.machineId,t["common.vscodesessionid"]=this.vscodeAPI.env.sessionId,t["common.vscodeversion"]=this.vscodeAPI.version,t["common.isnewappinstall"]=this.vscodeAPI.env.isNewAppInstall?this.vscodeAPI.env.isNewAppInstall.toString():"false",t["common.product"]=this.vscodeAPI.env.appHost,this.vscodeAPI.env.uiKind){case this.vscodeAPI.UIKind.Web:t["common.uikind"]="web";break;case this.vscodeAPI.UIKind.Desktop:t["common.uikind"]="desktop";break;default:t["common.uikind"]="unknown"}t["common.remotename"]=this.cleanRemoteName(this.vscodeAPI.env.remoteName)}return t}anonymizeFilePaths(t,r){let n;if(t==null)return"";let i=[];this.vscodeAPI.env.appRoot!==""&&i.push(new RegExp(this.vscodeAPI.env.appRoot.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")),this.extension&&i.push(new RegExp(this.extension.extensionPath.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"));let a=t;if(r){let s=[];for(let f of i)for(;(n=f.exec(t))&&n;)s.push([n.index,f.lastIndex]);let o=/^[\\/]?(node_modules|node_modules\.asar)[\\/]/,u=/(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-._]+(\\\\|\\|\/))+[\w-._]*/g,c=0;for(a="";(n=u.exec(t))&&n;)n[0]&&!o.test(n[0])&&s.every(([f,p])=>n.index<f||n.index>=p)&&(a+=t.substring(c,n.index)+"<REDACTED: user-file-path>",c=u.lastIndex);c<t.length&&(a+=t.substr(c))}for(let s of i)a=a.replace(s,"");return a}removePropertiesWithPossibleUserInfo(t){if(typeof t!="object")return;let r={};for(let n of Object.keys(t)){let i=t[n];if(!i)continue;let a=/@[a-zA-Z0-9-.]+/,s=/(key|token|sig|signature|password|passwd|pwd|android:value)[^a-zA-Z0-9]/,o=/xox[pbaors]-[a-zA-Z0-9]+-[a-zA-Z0-9-]+?/;s.test(i.toLowerCase())?r[n]="<REDACTED: secret>":a.test(i)?r[n]="<REDACTED: email>":o.test(i)?r[n]="<REDACTED: token>":r[n]=i}return r}get telemetryLevel(){switch(Se.getInstance(this.vscodeAPI).getTelemetryLevel()){case"on":return"all";case"error":return"error";case"off":return"off"}}internalSendTelemetryEvent(t,r,n,i,a){if((this.userOptIn||a)&&t!==""){if(r=St(St({},r),this.getCommonProperties()),i){let s=this.cloneAndChange(r,(o,u)=>this.anonymizeFilePaths(u,this.firstParty));r=this.removePropertiesWithPossibleUserInfo(s)}r=r??{},n=n??{},t=`${this.extensionId}/${t}`,this.telemetryAppender.logEvent(t,{properties:r,measurements:n})}}sendTelemetryEvent(t,r,n){this.internalSendTelemetryEvent(t,r,n,!0,!1)}sendRawTelemetryEvent(t,r,n){this.internalSendTelemetryEvent(t,r,n,!1,!1)}sendDangerousTelemetryEvent(t,r,n,i=!0){this.telemetryAppender.instantiateAppender(),this.internalSendTelemetryEvent(t,r,n,i,!0)}internalSendTelemetryErrorEvent(t,r,n,i,a){if((this.shouldSendErrorTelemetry()||a)&&t!==""){if(r=St(St({},r),this.getCommonProperties()),i){let s=this.cloneAndChange(r,(o,u)=>this.anonymizeFilePaths(u,this.firstParty));r=this.removePropertiesWithPossibleUserInfo(s)}r=r??{},n=n??{},t=`${this.extensionId}/${t}`,this.telemetryAppender.logEvent(t,{properties:r,measurements:n})}}sendTelemetryErrorEvent(t,r,n){this.internalSendTelemetryErrorEvent(t,r,n,!0,!1)}sendDangerousTelemetryErrorEvent(t,r,n,i=!0){this.telemetryAppender.instantiateAppender(),this.internalSendTelemetryErrorEvent(t,r,n,i,!0)}internalSendTelemetryException(t,r,n,i,a){if((this.shouldSendErrorTelemetry()||a)&&t){if(r=St(St({},r),this.getCommonProperties()),i){let s=this.cloneAndChange(r,(o,u)=>this.anonymizeFilePaths(u,this.firstParty));t.stack&&(t.stack=this.anonymizeFilePaths(t.stack,this.firstParty)),r=this.removePropertiesWithPossibleUserInfo(s)}r=r??{},n=n??{},this.telemetryAppender.logException(t,{properties:r,measurements:n})}}sendTelemetryException(t,r,n){this.internalSendTelemetryException(t,r,n,!0,!1)}sendDangerousTelemetryException(t,r,n,i=!0){this.telemetryAppender.instantiateAppender(),this.internalSendTelemetryException(t,r,n,i,!0)}dispose(){return this.telemetryAppender.flush(),Promise.all(this.disposables.map(t=>t.dispose()))}};var xa=class{constructor(t,r){this._instantiationStatus=0;this._eventQueue=[];this._exceptionQueue=[];this._clientFactory=r,this._key=t}logEvent(t,r){if(!this._telemetryClient){this._instantiationStatus!==2&&this._eventQueue.push({eventName:t,data:r});return}this._telemetryClient.logEvent(t,r)}logException(t,r){if(!this._telemetryClient){this._instantiationStatus!==2&&this._exceptionQueue.push({exception:t,data:r});return}this._telemetryClient.logException(t,r)}async flush(){this._telemetryClient&&(await this._telemetryClient.flush(),this._telemetryClient=void 0)}_flushQueues(){this._eventQueue.forEach(({eventName:t,data:r})=>this.logEvent(t,r)),this._eventQueue=[],this._exceptionQueue.forEach(({exception:t,data:r})=>this.logException(t,r)),this._exceptionQueue=[]}instantiateAppender(){this._instantiationStatus===0&&(this._instantiationStatus=1,this._clientFactory(this._key).then(t=>{this._telemetryClient=t,this._instantiationStatus=2,this._flushQueues()}).catch(t=>{console.error(t),this._instantiationStatus=2}))}};var vA=async(e,t,r)=>{let n=await Promise.all(/* import() */[__webpack_require__.e(2), __webpack_require__.e(1)]).then(__webpack_require__.bind(__webpack_require__, 98)),i=await Promise.all(/* import() */[__webpack_require__.e(2), __webpack_require__.e(3)]).then(__webpack_require__.bind(__webpack_require__, 137)),a=new n.AppInsightsCore,s=new i.PostChannel,o={instrumentationKey:e,endpointUrl:"https://mobile.events.data.microsoft.com/OneCollector/1.0",loggingLevelTelemetry:0,loggingLevelConsole:0,disableCookiesUsage:!0,disableDbgExt:!0,disableInstrumentationKeyValidation:!0,channels:[[s]]};if(r){o.extensionConfig={};let f={alwaysUseXhrOverride:!0,httpXHROverride:r};o.extensionConfig[s.identifier]=f}let c=t.workspace.getConfiguration("telemetry").get("internalTesting");return a.initialize(o,[]),a.addTelemetryInitializer(f=>{!c||(f.ext=f.ext??{},f.ext.utc=f.ext.utc??{},f.ext.utc.flags=8462029)}),a},wp=async(e,t,r)=>{let n=await vA(e,t,r);return{logEvent:(a,s)=>{try{n==null||n.track({name:a,baseData:{name:a,properties:s==null?void 0:s.properties,measurements:s==null?void 0:s.measurements}})}catch(o){throw new Error(`Failed to log event to app insights!
`+o.message)}},logException:(a,s)=>{throw new Error("1DS SDK does not support logging exceptions, please use logEvent for exception tracking")},flush:async()=>{try{n==null||n.unload()}catch(a){throw new Error(`Failed to flush app insights!
`+a.message)}}}};var Gx=async(e,t)=>{let r;try{process.env.APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL="1";let i=await Promise.resolve().then(()=>nn(nA()));i.defaultClient?(r=new i.TelemetryClient(e),r.channel.setUseDiskRetryCaching(!0)):(i.setup(e).setAutoCollectRequests(!1).setAutoCollectPerformance(!1).setAutoCollectExceptions(!1).setAutoCollectDependencies(!1).setAutoDependencyCorrelation(!1).setAutoCollectConsole(!1).setAutoCollectHeartbeat(!1).setUseDiskRetryCaching(!0).start(),r=i.defaultClient),Gt&&Gt.env&&(r.context.tags[r.context.keys.userId]=Gt.env.machineId,r.context.tags[r.context.keys.sessionId]=Gt.env.sessionId,r.context.tags[r.context.keys.cloudRole]=Gt.env.appName,r.context.tags[r.context.keys.cloudRoleInstance]=Gt.env.appName),e&&e.indexOf("AIF-")===0&&(r.config.endpointUrl="https://mobile.events.data.microsoft.com/collect/v1")}catch(i){return Promise.reject(`Failed to initialize app insights!
`+i.message)}return t!=null&&t.length&&Vx(r,t),{logEvent:(i,a)=>{try{r==null||r.trackEvent({name:i,properties:a==null?void 0:a.properties,measurements:a==null?void 0:a.measurements})}catch(s){throw new Error(`Failed to log event to app insights!
`+s.message)}},logException:(i,a)=>{try{r==null||r.trackException({exception:i,properties:a==null?void 0:a.properties,measurements:a==null?void 0:a.measurements})}catch(s){throw new Error(`Failed to log exception to app insights!
`+s.message)}},flush:async()=>{try{r==null||r.flush()}catch(i){throw new Error(`Failed to flush app insights!
`+i.message)}}}};function Vx(e,t){e.addTelemetryProcessor(r=>(Array.isArray(r.tags)?r.tags.forEach(n=>Se.applyReplacements(n,t)):r.tags&&Se.applyReplacements(r.tags,t),r.data.baseData&&Se.applyReplacements(r.data.baseData,t),!0))}function $x(){return{sendPOST:(t,r)=>{let n={method:"POST",headers:Np(St({},t.headers),{"Content-Type":"application/json","Content-Length":Buffer.byteLength(t.data)})};try{let i=iA.request(t.urlString,n,a=>{a.on("data",function(s){r(a.statusCode??200,a.headers,s.toString())}),a.on("error",function(){r(0,{})})});i.write(t.data),i.end()}catch{r(0,{})}}}}var hu=class extends wa{constructor(t,r,n,i,a){let s=u=>Gx(u,a);Se.shouldUseOneDataSystemSDK(n)&&(s=u=>wp(u,Gt,$x()));let o=new xa(n,s);n&&(n.indexOf("AIF-")===0||Se.shouldUseOneDataSystemSDK(n))&&(i=!0),super(t,r,o,{release:mi.release(),platform:mi.platform(),architecture:mi.arch()},Gt,i)}};0&&(0);


/***/ }),
/* 21 */
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),
/* 22 */
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),
/* 23 */
/***/ ((module) => {

"use strict";
module.exports = require("module");

/***/ }),
/* 24 */
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),
/* 25 */
/***/ ((module) => {

"use strict";
module.exports = require("perf_hooks");

/***/ }),
/* 26 */
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),
/* 27 */
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),
/* 28 */
/***/ ((module) => {

"use strict";
module.exports = require("console");

/***/ }),
/* 29 */
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 29;
module.exports = webpackEmptyContext;

/***/ }),
/* 30 */
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 30;
module.exports = webpackEmptyContext;

/***/ }),
/* 31 */
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),
/* 32 */
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),
/* 33 */
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),
/* 34 */
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),
/* 35 */
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),
/* 36 */
/***/ ((module) => {

"use strict";
module.exports = require("async_hooks");

/***/ }),
/* 37 */
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),
/* 38 */
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),
/* 39 */
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),
/* 40 */
/***/ ((module) => {

"use strict";
module.exports = require("dns");

/***/ }),
/* 41 */
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),
/* 42 */
/***/ ((module) => {

"use strict";
module.exports = require("applicationinsights-native-metrics");

/***/ }),
/* 43 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MeasurementEntries = exports.DimensionEntries = exports.ErrorType = exports.ErrorCodes = exports.EventName = void 0;
var EventName;
(function (EventName) {
    EventName["ERROR"] = "error";
    EventName["INFO"] = "info";
    EventName["OPERATION_START"] = "opStart";
    EventName["OPERATION_END"] = "opEnd";
    EventName["OPERATION_STEP"] = "opStep";
})(EventName = exports.EventName || (exports.EventName = {}));
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes.NO_ERROR = 0;
    ErrorCodes.GENERAL_ERROR = 1;
})(ErrorCodes = exports.ErrorCodes || (exports.ErrorCodes = {}));
var ErrorType;
(function (ErrorType) {
    ErrorType["USER_ERROR"] = "userError";
    ErrorType["SYSTEM_ERROR"] = "systemError";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
exports.DimensionEntries = [
    "operationId",
    "operationName",
    "errorCode",
    "errorType",
    "message",
    "stack",
    "stepName",
];
exports.MeasurementEntries = [
    "duration",
];
//# sourceMappingURL=event.js.map

/***/ }),
/* 44 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Output = void 0;
const vscode = __webpack_require__(1);
const OUTPUT_CHANNEL_NAME = "Telemetry Wrapper";
class Output {
    constructor() {
    }
    static getInstance() {
        if (!this.INSTANCE) {
            this.INSTANCE = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
        }
        return this.INSTANCE;
    }
}
exports.Output = Output;
//# sourceMappingURL=output.js.map

/***/ }),
/* 45 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LombokCodeActionProvider = exports.lombokAction = void 0;
const vscode_1 = __webpack_require__(1);
const commands_1 = __webpack_require__(46);
const ProtocolConverter = __webpack_require__(47);
const CodeConverter = __webpack_require__(94);
const vscode_extension_telemetry_wrapper_1 = __webpack_require__(2);
const protoConverter = ProtocolConverter.createConverter(undefined, undefined);
const codeConverter = CodeConverter.createConverter();
const supportedLombokAnnotations = ["Data", "NoArgsConstructor", "AllArgsConstructor", "Getter", "Setter", "ToString", "EqualsAndHashCode"];
const annotationsDescriptions = [
    "Bundles the features of @ToString, @EqualsAndHashCode, @Getter, @Setter and @RequiredArgsConstructor together",
    "Generates a constructor with no parameters.",
    "Generates a constructor with 1 parameter for each field in your class.",
    "Generates the default getter automatically.",
    "Generates the default setter automatically.",
    "Generates a toString for you.",
    "Generates hashCode and equals implementations from the fields of your object."
];
const annotationLinks = [
    "https://projectlombok.org/features/Data",
    "https://projectlombok.org/features/constructor",
    "https://projectlombok.org/features/constructor",
    "https://projectlombok.org/features/GetterSetter",
    "https://projectlombok.org/features/GetterSetter",
    "https://projectlombok.org/features/ToString",
    "https://projectlombok.org/features/EqualsAndHashCode"
];
function applyWorkspaceEdit(workspaceEdit) {
    return __awaiter(this, void 0, void 0, function* () {
        const edit = protoConverter.asWorkspaceEdit(workspaceEdit);
        if (edit) {
            yield vscode_1.workspace.applyEdit(edit);
        }
    });
}
function revealWorkspaceEdit(workspaceEdit) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const codeWorkspaceEdit = protoConverter.asWorkspaceEdit(workspaceEdit);
        if (!codeWorkspaceEdit) {
            return;
        }
        for (const entry of codeWorkspaceEdit.entries()) {
            yield vscode_1.workspace.openTextDocument(entry[0]);
            if (entry[1].length > 0) {
                // reveal first available change of the workspace edit
                (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.revealRange(entry[1][0].range, vscode_1.TextEditorRevealType.InCenter);
                break;
            }
        }
    });
}
function lombokAction(params, annotations) {
    return __awaiter(this, void 0, void 0, function* () {
        const annotationResponse = yield (0, commands_1.executeJavaLanguageServerCommand)(commands_1.Commands.JAVA_CODEACTION_LOMBOK_ANNOTATIONS, JSON.stringify(params));
        if (!annotationResponse) {
            return;
        }
        let annotationsAfter = [];
        if (annotations.length) {
            annotationsAfter = annotationResponse.annotations.filter((item) => {
                return !annotations.includes(item);
            });
        }
        else {
            const annotationItems = supportedLombokAnnotations.map(name => {
                return {
                    label: `@${name}`,
                    description: annotationsDescriptions[supportedLombokAnnotations.indexOf(name)],
                    buttons: [{
                            iconPath: new vscode_1.ThemeIcon("link-external"),
                            tooltip: "Reference"
                        }]
                };
            });
            const itemsToDelombok = annotationItems.filter((item) => {
                return annotationResponse.annotations.indexOf(item.label.split('@')[1]) >= 0;
            });
            const itemsToLombok = annotationItems.filter((item) => {
                return annotationResponse.annotations.indexOf(item.label.split('@')[1]) < 0;
            });
            const showItems = [];
            showItems.push({
                label: "Unselect to Delombok",
                kind: vscode_1.QuickPickItemKind.Separator
            });
            showItems.push(...itemsToDelombok);
            showItems.push({
                label: "Select to Lombok",
                kind: vscode_1.QuickPickItemKind.Separator
            });
            showItems.push(...itemsToLombok);
            let selectedItems = [];
            const disposables = [];
            try {
                selectedItems = yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    const pickBox = vscode_1.window.createQuickPick();
                    pickBox.items = showItems;
                    pickBox.canSelectMany = true;
                    pickBox.ignoreFocusOut = true;
                    pickBox.selectedItems = itemsToDelombok;
                    pickBox.placeholder = 'Add or remove Lombok annotations in class';
                    disposables.push(pickBox.onDidTriggerItemButton(e => {
                        vscode_1.env.openExternal(vscode_1.Uri.parse(annotationLinks[supportedLombokAnnotations.indexOf(e.item.label.split('@')[1])]));
                    }), pickBox.onDidAccept(() => {
                        resolve(pickBox.selectedItems);
                    }), pickBox.onDidHide(() => {
                        reject();
                    }));
                    disposables.push(pickBox);
                    pickBox.show();
                }));
            }
            catch (err) {
                // return when the quickpick is cancelled.
                (0, vscode_extension_telemetry_wrapper_1.sendInfo)("", {
                    operationName: "cancelLombokAction",
                });
                return;
            }
            finally {
                disposables.forEach(d => d.dispose());
            }
            annotationsAfter = selectedItems.map(item => {
                return item.label.split('@')[1];
            });
        }
        const lombokParams = {
            context: params,
            annotationsBefore: annotationResponse.annotations,
            annotationsAfter
        };
        const lombok = [];
        const delombok = [];
        for (const annotation of lombokParams.annotationsBefore) {
            if (!lombokParams.annotationsAfter.includes(annotation)) {
                delombok.push(annotation);
            }
        }
        for (const annotation of lombokParams.annotationsAfter) {
            if (!lombokParams.annotationsBefore.includes(annotation)) {
                lombok.push(annotation);
            }
        }
        if (!lombok.length && !delombok.length) {
            (0, vscode_extension_telemetry_wrapper_1.sendInfo)("", {
                operationName: "cancelLombokAction",
            });
            return;
        }
        const startAt = Date.now();
        let workspaceEdit;
        try {
            workspaceEdit = (yield (0, commands_1.executeJavaLanguageServerCommand)(commands_1.Commands.JAVA_CODEACTION_LOMBOK, JSON.stringify(lombokParams)));
        }
        finally {
            (0, vscode_extension_telemetry_wrapper_1.sendInfo)("", {
                operationName: "applyLombokAction",
                lombok: JSON.stringify(lombok),
                delombok: JSON.stringify(delombok),
                duration: Date.now() - startAt,
            });
        }
        yield applyWorkspaceEdit(workspaceEdit);
        yield revealWorkspaceEdit(workspaceEdit);
        // organize imports silently to fix missing annotation imports
        yield vscode_1.commands.executeCommand(commands_1.Commands.ORGANIZE_IMPORTS_SILENTLY, params.textDocument.uri.toString());
    });
}
exports.lombokAction = lombokAction;
function getSelectedAnnotations(text) {
    return supportedLombokAnnotations.filter((item) => text.includes(`@${item}`));
}
class LombokCodeActionProvider {
    provideCodeActions(document, range, context, _token) {
        const params = {
            textDocument: codeConverter.asTextDocumentIdentifier(document),
            range: codeConverter.asRange(range),
            context: codeConverter.asCodeActionContext(context)
        };
        const selectText = document.getText(range);
        let codeActionTitle = "Lombok...";
        let selectedAnnotations = [];
        if (selectText !== "") {
            selectedAnnotations = getSelectedAnnotations(selectText);
            if (selectedAnnotations.length === 1) {
                codeActionTitle = `Delombok '${selectedAnnotations[0]}'`;
            }
            else if (selectedAnnotations.length > 1) {
                codeActionTitle = `Delombok ${selectedAnnotations.length} annotations`;
            }
        }
        return [
            {
                title: codeActionTitle,
                kind: vscode_1.CodeActionKind.Refactor,
                command: {
                    title: codeActionTitle,
                    command: commands_1.Commands.CODEACTION_LOMBOK,
                    arguments: [params, selectedAnnotations]
                },
            }
        ];
    }
}
exports.LombokCodeActionProvider = LombokCodeActionProvider;


/***/ }),
/* 46 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.executeJavaLanguageServerCommand = exports.Commands = void 0;
const vscode = __webpack_require__(1);
// tslint:disable-next-line: no-namespace
var Commands;
(function (Commands) {
    Commands.JAVA_EXECUTE_WORKSPACE_COMMAND = "java.execute.workspaceCommand";
    Commands.CODEACTION_LOMBOK = "codeAction.lombok";
    Commands.JAVA_CODEACTION_LOMBOK_ANNOTATIONS = "java.codeAction.lombok.getAnnotations";
    Commands.JAVA_CODEACTION_LOMBOK = "java.codeAction.lombok";
    Commands.GET_ALL_JAVA_PROJECTS = 'java.project.getAll';
    Commands.ORGANIZE_IMPORTS_SILENTLY = "java.edit.organizeImports";
})(Commands = exports.Commands || (exports.Commands = {}));
function executeJavaLanguageServerCommand(...rest) {
    return __awaiter(this, void 0, void 0, function* () {
        return vscode.commands.executeCommand(Commands.JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
    });
}
exports.executeJavaLanguageServerCommand = executeJavaLanguageServerCommand;


/***/ }),
/* 47 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode-proposed.d.ts" />
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createConverter = void 0;
const code = __webpack_require__(1);
const ls = __webpack_require__(48);
const Is = __webpack_require__(87);
const protocolCompletionItem_1 = __webpack_require__(88);
const protocolCodeLens_1 = __webpack_require__(89);
const protocolDocumentLink_1 = __webpack_require__(90);
const protocolCodeAction_1 = __webpack_require__(91);
const protocolDiagnostic_1 = __webpack_require__(92);
const protocolCallHierarchyItem_1 = __webpack_require__(93);
const vscode_languageserver_protocol_1 = __webpack_require__(48);
var CodeBlock;
(function (CodeBlock) {
    function is(value) {
        let candidate = value;
        return candidate && Is.string(candidate.language) && Is.string(candidate.value);
    }
    CodeBlock.is = is;
})(CodeBlock || (CodeBlock = {}));
function createConverter(uriConverter, trustMarkdown) {
    const nullConverter = (value) => code.Uri.parse(value);
    const _uriConverter = uriConverter || nullConverter;
    function asUri(value) {
        return _uriConverter(value);
    }
    function asDiagnostics(diagnostics) {
        return diagnostics.map(asDiagnostic);
    }
    function asDiagnostic(diagnostic) {
        let result = new protocolDiagnostic_1.ProtocolDiagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity), diagnostic.data);
        if (diagnostic.code !== undefined) {
            if (ls.CodeDescription.is(diagnostic.codeDescription)) {
                result.code = {
                    value: diagnostic.code,
                    target: asUri(diagnostic.codeDescription.href)
                };
            }
            else if (protocolDiagnostic_1.DiagnosticCode.is(diagnostic.code)) {
                result.hasDiagnosticCode = true;
                result.code = {
                    value: diagnostic.code.value,
                    target: asUri(diagnostic.code.target)
                };
            }
            else {
                result.code = diagnostic.code;
            }
        }
        if (diagnostic.source) {
            result.source = diagnostic.source;
        }
        if (diagnostic.relatedInformation) {
            result.relatedInformation = asRelatedInformation(diagnostic.relatedInformation);
        }
        if (Array.isArray(diagnostic.tags)) {
            result.tags = asDiagnosticTags(diagnostic.tags);
        }
        return result;
    }
    function asRelatedInformation(relatedInformation) {
        return relatedInformation.map(asDiagnosticRelatedInformation);
    }
    function asDiagnosticRelatedInformation(information) {
        return new code.DiagnosticRelatedInformation(asLocation(information.location), information.message);
    }
    function asDiagnosticTags(tags) {
        if (!tags) {
            return undefined;
        }
        let result = [];
        for (let tag of tags) {
            let converted = asDiagnosticTag(tag);
            if (converted !== undefined) {
                result.push(converted);
            }
        }
        return result.length > 0 ? result : undefined;
    }
    function asDiagnosticTag(tag) {
        switch (tag) {
            case ls.DiagnosticTag.Unnecessary:
                return code.DiagnosticTag.Unnecessary;
            case ls.DiagnosticTag.Deprecated:
                return code.DiagnosticTag.Deprecated;
            default:
                return undefined;
        }
    }
    function asPosition(value) {
        if (!value) {
            return undefined;
        }
        return new code.Position(value.line, value.character);
    }
    function asRange(value) {
        if (!value) {
            return undefined;
        }
        return new code.Range(asPosition(value.start), asPosition(value.end));
    }
    function asRanges(value) {
        return value.map(value => asRange(value));
    }
    function asDiagnosticSeverity(value) {
        if (value === undefined || value === null) {
            return code.DiagnosticSeverity.Error;
        }
        switch (value) {
            case ls.DiagnosticSeverity.Error:
                return code.DiagnosticSeverity.Error;
            case ls.DiagnosticSeverity.Warning:
                return code.DiagnosticSeverity.Warning;
            case ls.DiagnosticSeverity.Information:
                return code.DiagnosticSeverity.Information;
            case ls.DiagnosticSeverity.Hint:
                return code.DiagnosticSeverity.Hint;
        }
        return code.DiagnosticSeverity.Error;
    }
    function asHoverContent(value) {
        if (Is.string(value)) {
            return asMarkdownString(value);
        }
        else if (CodeBlock.is(value)) {
            let result = asMarkdownString();
            return result.appendCodeblock(value.value, value.language);
        }
        else if (Array.isArray(value)) {
            let result = [];
            for (let element of value) {
                let item = asMarkdownString();
                if (CodeBlock.is(element)) {
                    item.appendCodeblock(element.value, element.language);
                }
                else {
                    item.appendMarkdown(element);
                }
                result.push(item);
            }
            return result;
        }
        else {
            let result;
            switch (value.kind) {
                case ls.MarkupKind.Markdown:
                    return asMarkdownString(value.value);
                case ls.MarkupKind.PlainText:
                    result = asMarkdownString();
                    result.appendText(value.value);
                    return result;
                default:
                    result = asMarkdownString();
                    result.appendText(`Unsupported Markup content received. Kind is: ${value.kind}`);
                    return result;
            }
        }
    }
    function asDocumentation(value) {
        if (Is.string(value)) {
            return value;
        }
        else {
            switch (value.kind) {
                case ls.MarkupKind.Markdown:
                    return asMarkdownString(value.value);
                case ls.MarkupKind.PlainText:
                    return value.value;
                default:
                    return `Unsupported Markup content received. Kind is: ${value.kind}`;
            }
        }
    }
    function asMarkdownString(value) {
        const result = new code.MarkdownString(value);
        if (trustMarkdown === true) {
            result.isTrusted = trustMarkdown;
        }
        return result;
    }
    function asHover(hover) {
        if (!hover) {
            return undefined;
        }
        return new code.Hover(asHoverContent(hover.contents), asRange(hover.range));
    }
    function asCompletionResult(result) {
        if (!result) {
            return undefined;
        }
        if (Array.isArray(result)) {
            let items = result;
            return items.map(asCompletionItem);
        }
        let list = result;
        return new code.CompletionList(list.items.map(asCompletionItem), list.isIncomplete);
    }
    function asCompletionItemKind(value) {
        // Protocol item kind is 1 based, codes item kind is zero based.
        if (ls.CompletionItemKind.Text <= value && value <= ls.CompletionItemKind.TypeParameter) {
            return [value - 1, undefined];
        }
        return [code.CompletionItemKind.Text, value];
    }
    function asCompletionItemTag(tag) {
        switch (tag) {
            case ls.CompletionItemTag.Deprecated:
                return code.CompletionItemTag.Deprecated;
        }
        return undefined;
    }
    function asCompletionItemTags(tags) {
        if (tags === undefined || tags === null) {
            return [];
        }
        const result = [];
        for (const tag of tags) {
            const converted = asCompletionItemTag(tag);
            if (converted !== undefined) {
                result.push(converted);
            }
        }
        return result;
    }
    function asCompletionItem(item) {
        const tags = asCompletionItemTags(item.tags);
        const result = new protocolCompletionItem_1.default(item.label);
        const label2 = asCompletionItemLabel(item);
        if (label2 !== undefined) {
            result.label2 = label2;
        }
        if (item.detail) {
            result.detail = item.detail;
        }
        if (item.documentation) {
            result.documentation = asDocumentation(item.documentation);
            result.documentationFormat = Is.string(item.documentation) ? '$string' : item.documentation.kind;
        }
        if (item.filterText) {
            result.filterText = item.filterText;
        }
        const insertText = asCompletionInsertText(item);
        if (insertText) {
            result.insertText = insertText.text;
            result.range = insertText.range;
            result.fromEdit = insertText.fromEdit;
        }
        if (Is.number(item.kind)) {
            let [itemKind, original] = asCompletionItemKind(item.kind);
            result.kind = itemKind;
            if (original) {
                result.originalItemKind = original;
            }
        }
        if (item.sortText) {
            result.sortText = item.sortText;
        }
        if (item.additionalTextEdits) {
            result.additionalTextEdits = asTextEdits(item.additionalTextEdits);
        }
        if (Is.stringArray(item.commitCharacters)) {
            result.commitCharacters = item.commitCharacters.slice();
        }
        if (item.command) {
            result.command = asCommand(item.command);
        }
        if (item.deprecated === true || item.deprecated === false) {
            result.deprecated = item.deprecated;
            if (item.deprecated === true) {
                tags.push(code.CompletionItemTag.Deprecated);
            }
        }
        if (item.preselect === true || item.preselect === false) {
            result.preselect = item.preselect;
        }
        if (item.data !== undefined) {
            result.data = item.data;
        }
        if (tags.length > 0) {
            result.tags = tags;
        }
        if (item.insertTextMode !== undefined) {
            result.insertTextMode = item.insertTextMode;
            if (item.insertTextMode === vscode_languageserver_protocol_1.InsertTextMode.asIs) {
                result.keepWhitespace = true;
            }
        }
        return result;
    }
    function asCompletionItemLabel(item) {
        if (vscode_languageserver_protocol_1.CompletionItemLabelDetails.is(item.labelDetails)) {
            return { name: item.label, parameters: item.labelDetails.parameters, qualifier: item.labelDetails.qualifier, type: item.labelDetails.type };
        }
        else {
            return undefined;
        }
    }
    function asCompletionInsertText(item) {
        if (item.textEdit) {
            if (item.insertTextFormat === ls.InsertTextFormat.Snippet) {
                return { text: new code.SnippetString(item.textEdit.newText), range: asCompletionRange(item.textEdit), fromEdit: true };
            }
            else {
                return { text: item.textEdit.newText, range: asCompletionRange(item.textEdit), fromEdit: true };
            }
        }
        else if (item.insertText) {
            if (item.insertTextFormat === ls.InsertTextFormat.Snippet) {
                return { text: new code.SnippetString(item.insertText), fromEdit: false };
            }
            else {
                return { text: item.insertText, fromEdit: false };
            }
        }
        else {
            return undefined;
        }
    }
    function asCompletionRange(value) {
        if (ls.InsertReplaceEdit.is(value)) {
            return { inserting: asRange(value.insert), replacing: asRange(value.replace) };
        }
        else {
            return asRange(value.range);
        }
    }
    function asTextEdit(edit) {
        if (!edit) {
            return undefined;
        }
        return new code.TextEdit(asRange(edit.range), edit.newText);
    }
    function asTextEdits(items) {
        if (!items) {
            return undefined;
        }
        return items.map(asTextEdit);
    }
    function asSignatureHelp(item) {
        if (!item) {
            return undefined;
        }
        let result = new code.SignatureHelp();
        if (Is.number(item.activeSignature)) {
            result.activeSignature = item.activeSignature;
        }
        else {
            // activeSignature was optional in the past
            result.activeSignature = 0;
        }
        if (Is.number(item.activeParameter)) {
            result.activeParameter = item.activeParameter;
        }
        else {
            // activeParameter was optional in the past
            result.activeParameter = 0;
        }
        if (item.signatures) {
            result.signatures = asSignatureInformations(item.signatures);
        }
        return result;
    }
    function asSignatureInformations(items) {
        return items.map(asSignatureInformation);
    }
    function asSignatureInformation(item) {
        let result = new code.SignatureInformation(item.label);
        if (item.documentation !== undefined) {
            result.documentation = asDocumentation(item.documentation);
        }
        if (item.parameters !== undefined) {
            result.parameters = asParameterInformations(item.parameters);
        }
        if (item.activeParameter !== undefined) {
            result.activeParameter = item.activeParameter;
        }
        {
            return result;
        }
    }
    function asParameterInformations(item) {
        return item.map(asParameterInformation);
    }
    function asParameterInformation(item) {
        let result = new code.ParameterInformation(item.label);
        if (item.documentation) {
            result.documentation = asDocumentation(item.documentation);
        }
        return result;
    }
    function asLocation(item) {
        if (!item) {
            return undefined;
        }
        return new code.Location(_uriConverter(item.uri), asRange(item.range));
    }
    function asDeclarationResult(item) {
        if (!item) {
            return undefined;
        }
        return asLocationResult(item);
    }
    function asDefinitionResult(item) {
        if (!item) {
            return undefined;
        }
        return asLocationResult(item);
    }
    function asLocationLink(item) {
        if (!item) {
            return undefined;
        }
        let result = {
            targetUri: _uriConverter(item.targetUri),
            targetRange: asRange(item.targetRange),
            originSelectionRange: asRange(item.originSelectionRange),
            targetSelectionRange: asRange(item.targetSelectionRange)
        };
        if (!result.targetSelectionRange) {
            throw new Error(`targetSelectionRange must not be undefined or null`);
        }
        return result;
    }
    function asLocationResult(item) {
        if (!item) {
            return undefined;
        }
        if (Is.array(item)) {
            if (item.length === 0) {
                return [];
            }
            else if (ls.LocationLink.is(item[0])) {
                let links = item;
                return links.map((link) => asLocationLink(link));
            }
            else {
                let locations = item;
                return locations.map((location) => asLocation(location));
            }
        }
        else if (ls.LocationLink.is(item)) {
            return [asLocationLink(item)];
        }
        else {
            return asLocation(item);
        }
    }
    function asReferences(values) {
        if (!values) {
            return undefined;
        }
        return values.map(location => asLocation(location));
    }
    function asDocumentHighlights(values) {
        if (!values) {
            return undefined;
        }
        return values.map(asDocumentHighlight);
    }
    function asDocumentHighlight(item) {
        let result = new code.DocumentHighlight(asRange(item.range));
        if (Is.number(item.kind)) {
            result.kind = asDocumentHighlightKind(item.kind);
        }
        return result;
    }
    function asDocumentHighlightKind(item) {
        switch (item) {
            case ls.DocumentHighlightKind.Text:
                return code.DocumentHighlightKind.Text;
            case ls.DocumentHighlightKind.Read:
                return code.DocumentHighlightKind.Read;
            case ls.DocumentHighlightKind.Write:
                return code.DocumentHighlightKind.Write;
        }
        return code.DocumentHighlightKind.Text;
    }
    function asSymbolInformations(values, uri) {
        if (!values) {
            return undefined;
        }
        return values.map(information => asSymbolInformation(information, uri));
    }
    function asSymbolKind(item) {
        if (item <= ls.SymbolKind.TypeParameter) {
            // Symbol kind is one based in the protocol and zero based in code.
            return item - 1;
        }
        return code.SymbolKind.Property;
    }
    function asSymbolTag(value) {
        switch (value) {
            case ls.SymbolTag.Deprecated:
                return code.SymbolTag.Deprecated;
            default:
                return undefined;
        }
    }
    function asSymbolTags(items) {
        if (items === undefined || items === null) {
            return undefined;
        }
        const result = [];
        for (const item of items) {
            const converted = asSymbolTag(item);
            if (converted !== undefined) {
                result.push(converted);
            }
        }
        return result.length === 0 ? undefined : result;
    }
    function asSymbolInformation(item, uri) {
        // Symbol kind is one based in the protocol and zero based in code.
        let result = new code.SymbolInformation(item.name, asSymbolKind(item.kind), asRange(item.location.range), item.location.uri ? _uriConverter(item.location.uri) : uri);
        fillTags(result, item);
        if (item.containerName) {
            result.containerName = item.containerName;
        }
        return result;
    }
    function asDocumentSymbols(values) {
        if (values === undefined || values === null) {
            return undefined;
        }
        return values.map(asDocumentSymbol);
    }
    function asDocumentSymbol(value) {
        let result = new code.DocumentSymbol(value.name, value.detail || '', asSymbolKind(value.kind), asRange(value.range), asRange(value.selectionRange));
        fillTags(result, value);
        if (value.children !== undefined && value.children.length > 0) {
            let children = [];
            for (let child of value.children) {
                children.push(asDocumentSymbol(child));
            }
            result.children = children;
        }
        return result;
    }
    function fillTags(result, value) {
        result.tags = asSymbolTags(value.tags);
        if (value.deprecated) {
            if (!result.tags) {
                result.tags = [code.SymbolTag.Deprecated];
            }
            else {
                if (!result.tags.includes(code.SymbolTag.Deprecated)) {
                    result.tags = result.tags.concat(code.SymbolTag.Deprecated);
                }
            }
        }
    }
    function asCommand(item) {
        let result = { title: item.title, command: item.command };
        if (item.arguments) {
            result.arguments = item.arguments;
        }
        return result;
    }
    function asCommands(items) {
        if (!items) {
            return undefined;
        }
        return items.map(asCommand);
    }
    const kindMapping = new Map();
    kindMapping.set(ls.CodeActionKind.Empty, code.CodeActionKind.Empty);
    kindMapping.set(ls.CodeActionKind.QuickFix, code.CodeActionKind.QuickFix);
    kindMapping.set(ls.CodeActionKind.Refactor, code.CodeActionKind.Refactor);
    kindMapping.set(ls.CodeActionKind.RefactorExtract, code.CodeActionKind.RefactorExtract);
    kindMapping.set(ls.CodeActionKind.RefactorInline, code.CodeActionKind.RefactorInline);
    kindMapping.set(ls.CodeActionKind.RefactorRewrite, code.CodeActionKind.RefactorRewrite);
    kindMapping.set(ls.CodeActionKind.Source, code.CodeActionKind.Source);
    kindMapping.set(ls.CodeActionKind.SourceOrganizeImports, code.CodeActionKind.SourceOrganizeImports);
    function asCodeActionKind(item) {
        if (item === undefined || item === null) {
            return undefined;
        }
        let result = kindMapping.get(item);
        if (result) {
            return result;
        }
        let parts = item.split('.');
        result = code.CodeActionKind.Empty;
        for (let part of parts) {
            result = result.append(part);
        }
        return result;
    }
    function asCodeActionKinds(items) {
        if (items === undefined || items === null) {
            return undefined;
        }
        return items.map(kind => asCodeActionKind(kind));
    }
    function asCodeAction(item) {
        if (item === undefined || item === null) {
            return undefined;
        }
        let result = new protocolCodeAction_1.default(item.title, item.data);
        if (item.kind !== undefined) {
            result.kind = asCodeActionKind(item.kind);
        }
        if (item.diagnostics !== undefined) {
            result.diagnostics = asDiagnostics(item.diagnostics);
        }
        if (item.edit !== undefined) {
            result.edit = asWorkspaceEdit(item.edit);
        }
        if (item.command !== undefined) {
            result.command = asCommand(item.command);
        }
        if (item.isPreferred !== undefined) {
            result.isPreferred = item.isPreferred;
        }
        if (item.disabled !== undefined) {
            result.disabled = { reason: item.disabled.reason };
        }
        return result;
    }
    function asCodeLens(item) {
        if (!item) {
            return undefined;
        }
        let result = new protocolCodeLens_1.default(asRange(item.range));
        if (item.command) {
            result.command = asCommand(item.command);
        }
        if (item.data !== undefined && item.data !== null) {
            result.data = item.data;
        }
        return result;
    }
    function asCodeLenses(items) {
        if (!items) {
            return undefined;
        }
        return items.map((codeLens) => asCodeLens(codeLens));
    }
    function asWorkspaceEdit(item) {
        if (!item) {
            return undefined;
        }
        const sharedMetadata = new Map();
        if (item.changeAnnotations !== undefined) {
            for (const key of Object.keys(item.changeAnnotations)) {
                const metaData = asWorkspaceEditEntryMetadata(item.changeAnnotations[key]);
                sharedMetadata.set(key, metaData);
            }
        }
        const asMetadata = (annotation) => {
            if (annotation === undefined) {
                return undefined;
            }
            else {
                return sharedMetadata.get(annotation);
            }
        };
        const result = new code.WorkspaceEdit();
        if (item.documentChanges) {
            for (const change of item.documentChanges) {
                if (ls.CreateFile.is(change)) {
                    result.createFile(_uriConverter(change.uri), change.options, asMetadata(change.annotationId));
                }
                else if (ls.RenameFile.is(change)) {
                    result.renameFile(_uriConverter(change.oldUri), _uriConverter(change.newUri), change.options, asMetadata(change.annotationId));
                }
                else if (ls.DeleteFile.is(change)) {
                    result.deleteFile(_uriConverter(change.uri), change.options, asMetadata(change.annotationId));
                }
                else if (ls.TextDocumentEdit.is(change)) {
                    const uri = _uriConverter(change.textDocument.uri);
                    for (const edit of change.edits) {
                        if (vscode_languageserver_protocol_1.AnnotatedTextEdit.is(edit)) {
                            result.replace(uri, asRange(edit.range), edit.newText, asMetadata(edit.annotationId));
                        }
                        else {
                            result.replace(uri, asRange(edit.range), edit.newText);
                        }
                    }
                }
                else {
                    throw new Error(`Unknown workspace edit change received:\n${JSON.stringify(change, undefined, 4)}`);
                }
            }
        }
        else if (item.changes) {
            Object.keys(item.changes).forEach(key => {
                result.set(_uriConverter(key), asTextEdits(item.changes[key]));
            });
        }
        return result;
    }
    function asWorkspaceEditEntryMetadata(annotation) {
        if (annotation === undefined) {
            return undefined;
        }
        return { label: annotation.label, needsConfirmation: !!annotation.needsConfirmation, description: annotation.description };
    }
    function asDocumentLink(item) {
        let range = asRange(item.range);
        let target = item.target ? asUri(item.target) : undefined;
        // target must be optional in DocumentLink
        let link = new protocolDocumentLink_1.default(range, target);
        if (item.tooltip !== undefined) {
            link.tooltip = item.tooltip;
        }
        if (item.data !== undefined && item.data !== null) {
            link.data = item.data;
        }
        return link;
    }
    function asDocumentLinks(items) {
        if (!items) {
            return undefined;
        }
        return items.map(asDocumentLink);
    }
    function asColor(color) {
        return new code.Color(color.red, color.green, color.blue, color.alpha);
    }
    function asColorInformation(ci) {
        return new code.ColorInformation(asRange(ci.range), asColor(ci.color));
    }
    function asColorInformations(colorInformation) {
        if (Array.isArray(colorInformation)) {
            return colorInformation.map(asColorInformation);
        }
        return undefined;
    }
    function asColorPresentation(cp) {
        let presentation = new code.ColorPresentation(cp.label);
        presentation.additionalTextEdits = asTextEdits(cp.additionalTextEdits);
        if (cp.textEdit) {
            presentation.textEdit = asTextEdit(cp.textEdit);
        }
        return presentation;
    }
    function asColorPresentations(colorPresentations) {
        if (Array.isArray(colorPresentations)) {
            return colorPresentations.map(asColorPresentation);
        }
        return undefined;
    }
    function asFoldingRangeKind(kind) {
        if (kind) {
            switch (kind) {
                case ls.FoldingRangeKind.Comment:
                    return code.FoldingRangeKind.Comment;
                case ls.FoldingRangeKind.Imports:
                    return code.FoldingRangeKind.Imports;
                case ls.FoldingRangeKind.Region:
                    return code.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    function asFoldingRange(r) {
        return new code.FoldingRange(r.startLine, r.endLine, asFoldingRangeKind(r.kind));
    }
    function asFoldingRanges(foldingRanges) {
        if (Array.isArray(foldingRanges)) {
            return foldingRanges.map(asFoldingRange);
        }
        return undefined;
    }
    function asSelectionRange(selectionRange) {
        return new code.SelectionRange(asRange(selectionRange.range), selectionRange.parent ? asSelectionRange(selectionRange.parent) : undefined);
    }
    function asSelectionRanges(selectionRanges) {
        if (!Array.isArray(selectionRanges)) {
            return [];
        }
        let result = [];
        for (let range of selectionRanges) {
            result.push(asSelectionRange(range));
        }
        return result;
    }
    function asCallHierarchyItem(item) {
        if (item === null) {
            return undefined;
        }
        let result = new protocolCallHierarchyItem_1.default(asSymbolKind(item.kind), item.name, item.detail || '', asUri(item.uri), asRange(item.range), asRange(item.selectionRange), item.data);
        if (item.tags !== undefined) {
            result.tags = asSymbolTags(item.tags);
        }
        return result;
    }
    function asCallHierarchyItems(items) {
        if (items === null) {
            return undefined;
        }
        return items.map(item => asCallHierarchyItem(item));
    }
    function asCallHierarchyIncomingCall(item) {
        return new code.CallHierarchyIncomingCall(asCallHierarchyItem(item.from), asRanges(item.fromRanges));
    }
    function asCallHierarchyIncomingCalls(items) {
        if (items === null) {
            return undefined;
        }
        return items.map(item => asCallHierarchyIncomingCall(item));
    }
    function asCallHierarchyOutgoingCall(item) {
        return new code.CallHierarchyOutgoingCall(asCallHierarchyItem(item.to), asRanges(item.fromRanges));
    }
    function asCallHierarchyOutgoingCalls(items) {
        if (items === null) {
            return undefined;
        }
        return items.map(item => asCallHierarchyOutgoingCall(item));
    }
    function asSemanticTokens(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return new code.SemanticTokens(new Uint32Array(value.data), value.resultId);
    }
    function asSemanticTokensEdit(value) {
        return new code.SemanticTokensEdit(value.start, value.deleteCount, value.data !== undefined ? new Uint32Array(value.data) : undefined);
    }
    function asSemanticTokensEdits(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return new code.SemanticTokensEdits(value.edits.map(asSemanticTokensEdit), value.resultId);
    }
    function asSemanticTokensLegend(value) {
        return value;
    }
    function asLinkedEditingRanges(value) {
        if (value === null || value === undefined) {
            return undefined;
        }
        return new code.LinkedEditingRanges(asRanges(value.ranges), asRegularExpression(value.wordPattern));
    }
    function asRegularExpression(value) {
        if (value === null || value === undefined) {
            return undefined;
        }
        return new RegExp(value);
    }
    return {
        asUri,
        asDiagnostics,
        asDiagnostic,
        asRange,
        asRanges,
        asPosition,
        asDiagnosticSeverity,
        asDiagnosticTag,
        asHover,
        asCompletionResult,
        asCompletionItem,
        asTextEdit,
        asTextEdits,
        asSignatureHelp,
        asSignatureInformations,
        asSignatureInformation,
        asParameterInformations,
        asParameterInformation,
        asDeclarationResult,
        asDefinitionResult,
        asLocation,
        asReferences,
        asDocumentHighlights,
        asDocumentHighlight,
        asDocumentHighlightKind,
        asSymbolKind,
        asSymbolTag,
        asSymbolTags,
        asSymbolInformations,
        asSymbolInformation,
        asDocumentSymbols,
        asDocumentSymbol,
        asCommand,
        asCommands,
        asCodeAction,
        asCodeActionKind,
        asCodeActionKinds,
        asCodeLens,
        asCodeLenses,
        asWorkspaceEdit,
        asDocumentLink,
        asDocumentLinks,
        asFoldingRangeKind,
        asFoldingRange,
        asFoldingRanges,
        asColor,
        asColorInformation,
        asColorInformations,
        asColorPresentation,
        asColorPresentations,
        asSelectionRange,
        asSelectionRanges,
        asSemanticTokensLegend,
        asSemanticTokens,
        asSemanticTokensEdit,
        asSemanticTokensEdits,
        asCallHierarchyItem,
        asCallHierarchyItems,
        asCallHierarchyIncomingCall,
        asCallHierarchyIncomingCalls,
        asCallHierarchyOutgoingCall,
        asCallHierarchyOutgoingCalls,
        asLinkedEditingRanges: asLinkedEditingRanges
    };
}
exports.createConverter = createConverter;
//# sourceMappingURL=protocolConverter.js.map

/***/ }),
/* 48 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createProtocolConnection = void 0;
const node_1 = __webpack_require__(49);
__exportStar(__webpack_require__(49), exports);
__exportStar(__webpack_require__(65), exports);
function createProtocolConnection(input, output, logger, options) {
    return node_1.createMessageConnection(input, output, logger, options);
}
exports.createProtocolConnection = createProtocolConnection;
//# sourceMappingURL=main.js.map

/***/ }),
/* 49 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ----------------------------------------------------------------------------------------- */


module.exports = __webpack_require__(50);

/***/ }),
/* 50 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createMessageConnection = exports.createServerSocketTransport = exports.createClientSocketTransport = exports.createServerPipeTransport = exports.createClientPipeTransport = exports.generateRandomPipeName = exports.StreamMessageWriter = exports.StreamMessageReader = exports.SocketMessageWriter = exports.SocketMessageReader = exports.IPCMessageWriter = exports.IPCMessageReader = void 0;
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ----------------------------------------------------------------------------------------- */
const ril_1 = __webpack_require__(51);
// Install the node runtime abstract.
ril_1.default.install();
const api_1 = __webpack_require__(55);
const path = __webpack_require__(22);
const os = __webpack_require__(24);
const crypto_1 = __webpack_require__(7);
const net_1 = __webpack_require__(38);
__exportStar(__webpack_require__(55), exports);
class IPCMessageReader extends api_1.AbstractMessageReader {
    constructor(process) {
        super();
        this.process = process;
        let eventEmitter = this.process;
        eventEmitter.on('error', (error) => this.fireError(error));
        eventEmitter.on('close', () => this.fireClose());
    }
    listen(callback) {
        this.process.on('message', callback);
        return api_1.Disposable.create(() => this.process.off('message', callback));
    }
}
exports.IPCMessageReader = IPCMessageReader;
class IPCMessageWriter extends api_1.AbstractMessageWriter {
    constructor(process) {
        super();
        this.process = process;
        this.errorCount = 0;
        let eventEmitter = this.process;
        eventEmitter.on('error', (error) => this.fireError(error));
        eventEmitter.on('close', () => this.fireClose);
    }
    write(msg) {
        try {
            if (typeof this.process.send === 'function') {
                this.process.send(msg, undefined, undefined, (error) => {
                    if (error) {
                        this.errorCount++;
                        this.handleError(error, msg);
                    }
                    else {
                        this.errorCount = 0;
                    }
                });
            }
            return Promise.resolve();
        }
        catch (error) {
            this.handleError(error, msg);
            return Promise.reject(error);
        }
    }
    handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
    }
    end() {
    }
}
exports.IPCMessageWriter = IPCMessageWriter;
class SocketMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(socket, encoding = 'utf-8') {
        super(ril_1.default().stream.asReadableStream(socket), encoding);
    }
}
exports.SocketMessageReader = SocketMessageReader;
class SocketMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(socket, options) {
        super(ril_1.default().stream.asWritableStream(socket), options);
        this.socket = socket;
    }
    dispose() {
        super.dispose();
        this.socket.destroy();
    }
}
exports.SocketMessageWriter = SocketMessageWriter;
class StreamMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(readble, encoding) {
        super(ril_1.default().stream.asReadableStream(readble), encoding);
    }
}
exports.StreamMessageReader = StreamMessageReader;
class StreamMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(writable, options) {
        super(ril_1.default().stream.asWritableStream(writable), options);
    }
}
exports.StreamMessageWriter = StreamMessageWriter;
const XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
const safeIpcPathLengths = new Map([
    ['linux', 107],
    ['darwin', 103]
]);
function generateRandomPipeName() {
    const randomSuffix = crypto_1.randomBytes(21).toString('hex');
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
    }
    let result;
    if (XDG_RUNTIME_DIR) {
        result = path.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
    }
    else {
        result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
    }
    const limit = safeIpcPathLengths.get(process.platform);
    if (limit !== undefined && result.length >= limit) {
        ril_1.default().console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} characters.`);
    }
    return result;
}
exports.generateRandomPipeName = generateRandomPipeName;
function createClientPipeTransport(pipeName, encoding = 'utf-8') {
    let connectResolve;
    const connected = new Promise((resolve, _reject) => {
        connectResolve = resolve;
    });
    return new Promise((resolve, reject) => {
        let server = net_1.createServer((socket) => {
            server.close();
            connectResolve([
                new SocketMessageReader(socket, encoding),
                new SocketMessageWriter(socket, encoding)
            ]);
        });
        server.on('error', reject);
        server.listen(pipeName, () => {
            server.removeListener('error', reject);
            resolve({
                onConnected: () => { return connected; }
            });
        });
    });
}
exports.createClientPipeTransport = createClientPipeTransport;
function createServerPipeTransport(pipeName, encoding = 'utf-8') {
    const socket = net_1.createConnection(pipeName);
    return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
    ];
}
exports.createServerPipeTransport = createServerPipeTransport;
function createClientSocketTransport(port, encoding = 'utf-8') {
    let connectResolve;
    const connected = new Promise((resolve, _reject) => {
        connectResolve = resolve;
    });
    return new Promise((resolve, reject) => {
        const server = net_1.createServer((socket) => {
            server.close();
            connectResolve([
                new SocketMessageReader(socket, encoding),
                new SocketMessageWriter(socket, encoding)
            ]);
        });
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => {
            server.removeListener('error', reject);
            resolve({
                onConnected: () => { return connected; }
            });
        });
    });
}
exports.createClientSocketTransport = createClientSocketTransport;
function createServerSocketTransport(port, encoding = 'utf-8') {
    const socket = net_1.createConnection(port, '127.0.0.1');
    return [
        new SocketMessageReader(socket, encoding),
        new SocketMessageWriter(socket, encoding)
    ];
}
exports.createServerSocketTransport = createServerSocketTransport;
function isReadableStream(value) {
    const candidate = value;
    return candidate.read !== undefined && candidate.addListener !== undefined;
}
function isWritableStream(value) {
    const candidate = value;
    return candidate.write !== undefined && candidate.addListener !== undefined;
}
function createMessageConnection(input, output, logger, options) {
    if (!logger) {
        logger = api_1.NullLogger;
    }
    const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
    const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
    if (api_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
    }
    return api_1.createMessageConnection(reader, writer, logger, options);
}
exports.createMessageConnection = createMessageConnection;
//# sourceMappingURL=main.js.map

/***/ }),
/* 51 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const ral_1 = __webpack_require__(52);
const util_1 = __webpack_require__(26);
const disposable_1 = __webpack_require__(53);
const messageBuffer_1 = __webpack_require__(54);
class MessageBuffer extends messageBuffer_1.AbstractMessageBuffer {
    constructor(encoding = 'utf-8') {
        super(encoding);
    }
    emptyBuffer() {
        return MessageBuffer.emptyBuffer;
    }
    fromString(value, encoding) {
        return Buffer.from(value, encoding);
    }
    toString(value, encoding) {
        if (value instanceof Buffer) {
            return value.toString(encoding);
        }
        else {
            return new util_1.TextDecoder(encoding).decode(value);
        }
    }
    asNative(buffer, length) {
        if (length === undefined) {
            return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
        }
        else {
            return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
        }
    }
    allocNative(length) {
        return Buffer.allocUnsafe(length);
    }
}
MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);
class ReadableStreamWrapper {
    constructor(stream) {
        this.stream = stream;
    }
    onClose(listener) {
        this.stream.on('close', listener);
        return disposable_1.Disposable.create(() => this.stream.off('close', listener));
    }
    onError(listener) {
        this.stream.on('error', listener);
        return disposable_1.Disposable.create(() => this.stream.off('error', listener));
    }
    onEnd(listener) {
        this.stream.on('end', listener);
        return disposable_1.Disposable.create(() => this.stream.off('end', listener));
    }
    onData(listener) {
        this.stream.on('data', listener);
        return disposable_1.Disposable.create(() => this.stream.off('data', listener));
    }
}
class WritableStreamWrapper {
    constructor(stream) {
        this.stream = stream;
    }
    onClose(listener) {
        this.stream.on('close', listener);
        return disposable_1.Disposable.create(() => this.stream.off('close', listener));
    }
    onError(listener) {
        this.stream.on('error', listener);
        return disposable_1.Disposable.create(() => this.stream.off('error', listener));
    }
    onEnd(listener) {
        this.stream.on('end', listener);
        return disposable_1.Disposable.create(() => this.stream.off('end', listener));
    }
    write(data, encoding) {
        return new Promise((resolve, reject) => {
            const callback = (error) => {
                if (error === undefined || error === null) {
                    resolve();
                }
                else {
                    reject(error);
                }
            };
            if (typeof data === 'string') {
                this.stream.write(data, encoding, callback);
            }
            else {
                this.stream.write(data, callback);
            }
        });
    }
    end() {
        this.stream.end();
    }
}
const _ril = Object.freeze({
    messageBuffer: Object.freeze({
        create: (encoding) => new MessageBuffer(encoding)
    }),
    applicationJson: Object.freeze({
        encoder: Object.freeze({
            name: 'application/json',
            encode: (msg, options) => {
                try {
                    return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
                }
                catch (err) {
                    return Promise.reject(err);
                }
            }
        }),
        decoder: Object.freeze({
            name: 'application/json',
            decode: (buffer, options) => {
                try {
                    if (buffer instanceof Buffer) {
                        return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
                    }
                    else {
                        return Promise.resolve(JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)));
                    }
                }
                catch (err) {
                    return Promise.reject(err);
                }
            }
        })
    }),
    stream: Object.freeze({
        asReadableStream: (stream) => new ReadableStreamWrapper(stream),
        asWritableStream: (stream) => new WritableStreamWrapper(stream)
    }),
    console: console,
    timer: Object.freeze({
        setTimeout(callback, ms, ...args) {
            const handle = setTimeout(callback, ms, ...args);
            return { dispose: () => clearTimeout(handle) };
        },
        setImmediate(callback, ...args) {
            const handle = setImmediate(callback, ...args);
            return { dispose: () => clearImmediate(handle) };
        },
        setInterval(callback, ms, ...args) {
            const handle = setInterval(callback, ms, ...args);
            return { dispose: () => clearInterval(handle) };
        }
    })
});
function RIL() {
    return _ril;
}
(function (RIL) {
    function install() {
        ral_1.default.install(_ril);
    }
    RIL.install = install;
})(RIL || (RIL = {}));
exports["default"] = RIL;
//# sourceMappingURL=ril.js.map

/***/ }),
/* 52 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
let _ral;
function RAL() {
    if (_ral === undefined) {
        throw new Error(`No runtime abstraction layer installed`);
    }
    return _ral;
}
(function (RAL) {
    function install(ral) {
        if (ral === undefined) {
            throw new Error(`No runtime abstraction layer provided`);
        }
        _ral = ral;
    }
    RAL.install = install;
})(RAL || (RAL = {}));
exports["default"] = RAL;
//# sourceMappingURL=ral.js.map

/***/ }),
/* 53 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Disposable = void 0;
var Disposable;
(function (Disposable) {
    function create(func) {
        return {
            dispose: func
        };
    }
    Disposable.create = create;
})(Disposable = exports.Disposable || (exports.Disposable = {}));
//# sourceMappingURL=disposable.js.map

/***/ }),
/* 54 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AbstractMessageBuffer = void 0;
const CR = 13;
const LF = 10;
const CRLF = '\r\n';
class AbstractMessageBuffer {
    constructor(encoding = 'utf-8') {
        this._encoding = encoding;
        this._chunks = [];
        this._totalLength = 0;
    }
    get encoding() {
        return this._encoding;
    }
    append(chunk) {
        const toAppend = typeof chunk === 'string' ? this.fromString(chunk, this._encoding) : chunk;
        this._chunks.push(toAppend);
        this._totalLength += toAppend.byteLength;
    }
    tryReadHeaders() {
        if (this._chunks.length === 0) {
            return undefined;
        }
        let state = 0;
        let chunkIndex = 0;
        let offset = 0;
        let chunkBytesRead = 0;
        row: while (chunkIndex < this._chunks.length) {
            const chunk = this._chunks[chunkIndex];
            offset = 0;
            column: while (offset < chunk.length) {
                const value = chunk[offset];
                switch (value) {
                    case CR:
                        switch (state) {
                            case 0:
                                state = 1;
                                break;
                            case 2:
                                state = 3;
                                break;
                            default:
                                state = 0;
                        }
                        break;
                    case LF:
                        switch (state) {
                            case 1:
                                state = 2;
                                break;
                            case 3:
                                state = 4;
                                offset++;
                                break row;
                            default:
                                state = 0;
                        }
                        break;
                    default:
                        state = 0;
                }
                offset++;
            }
            chunkBytesRead += chunk.byteLength;
            chunkIndex++;
        }
        if (state !== 4) {
            return undefined;
        }
        // The buffer contains the two CRLF at the end. So we will
        // have two empty lines after the split at the end as well.
        const buffer = this._read(chunkBytesRead + offset);
        const result = new Map();
        const headers = this.toString(buffer, 'ascii').split(CRLF);
        if (headers.length < 2) {
            return result;
        }
        for (let i = 0; i < headers.length - 2; i++) {
            const header = headers[i];
            const index = header.indexOf(':');
            if (index === -1) {
                throw new Error('Message header must separate key and value using :');
            }
            const key = header.substr(0, index);
            const value = header.substr(index + 1).trim();
            result.set(key, value);
        }
        return result;
    }
    tryReadBody(length) {
        if (this._totalLength < length) {
            return undefined;
        }
        return this._read(length);
    }
    get numberOfBytes() {
        return this._totalLength;
    }
    _read(byteCount) {
        if (byteCount === 0) {
            return this.emptyBuffer();
        }
        if (byteCount > this._totalLength) {
            throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
            // super fast path, precisely first chunk must be returned
            const chunk = this._chunks[0];
            this._chunks.shift();
            this._totalLength -= byteCount;
            return this.asNative(chunk);
        }
        if (this._chunks[0].byteLength > byteCount) {
            // fast path, the reading is entirely within the first chunk
            const chunk = this._chunks[0];
            const result = this.asNative(chunk, byteCount);
            this._chunks[0] = chunk.slice(byteCount);
            this._totalLength -= byteCount;
            return result;
        }
        const result = this.allocNative(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
            const chunk = this._chunks[chunkIndex];
            if (chunk.byteLength > byteCount) {
                // this chunk will survive
                const chunkPart = chunk.slice(0, byteCount);
                result.set(chunkPart, resultOffset);
                resultOffset += byteCount;
                this._chunks[chunkIndex] = chunk.slice(byteCount);
                this._totalLength -= byteCount;
                byteCount -= byteCount;
            }
            else {
                // this chunk will be entirely read
                result.set(chunk, resultOffset);
                resultOffset += chunk.byteLength;
                this._chunks.shift();
                this._totalLength -= chunk.byteLength;
                byteCount -= chunk.byteLength;
            }
        }
        return result;
    }
}
exports.AbstractMessageBuffer = AbstractMessageBuffer;
//# sourceMappingURL=messageBuffer.js.map

/***/ }),
/* 55 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" />
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.Trace = exports.ProgressType = exports.createMessageConnection = exports.NullLogger = exports.ConnectionOptions = exports.ConnectionStrategy = exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = exports.CancellationToken = exports.CancellationTokenSource = exports.Emitter = exports.Event = exports.Disposable = exports.LRUCache = exports.Touch = exports.LinkedMap = exports.ParameterStructures = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.ErrorCodes = exports.ResponseError = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType0 = exports.RequestType = exports.RAL = void 0;
exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.ConnectionError = void 0;
const messages_1 = __webpack_require__(56);
Object.defineProperty(exports, "RequestType", ({ enumerable: true, get: function () { return messages_1.RequestType; } }));
Object.defineProperty(exports, "RequestType0", ({ enumerable: true, get: function () { return messages_1.RequestType0; } }));
Object.defineProperty(exports, "RequestType1", ({ enumerable: true, get: function () { return messages_1.RequestType1; } }));
Object.defineProperty(exports, "RequestType2", ({ enumerable: true, get: function () { return messages_1.RequestType2; } }));
Object.defineProperty(exports, "RequestType3", ({ enumerable: true, get: function () { return messages_1.RequestType3; } }));
Object.defineProperty(exports, "RequestType4", ({ enumerable: true, get: function () { return messages_1.RequestType4; } }));
Object.defineProperty(exports, "RequestType5", ({ enumerable: true, get: function () { return messages_1.RequestType5; } }));
Object.defineProperty(exports, "RequestType6", ({ enumerable: true, get: function () { return messages_1.RequestType6; } }));
Object.defineProperty(exports, "RequestType7", ({ enumerable: true, get: function () { return messages_1.RequestType7; } }));
Object.defineProperty(exports, "RequestType8", ({ enumerable: true, get: function () { return messages_1.RequestType8; } }));
Object.defineProperty(exports, "RequestType9", ({ enumerable: true, get: function () { return messages_1.RequestType9; } }));
Object.defineProperty(exports, "ResponseError", ({ enumerable: true, get: function () { return messages_1.ResponseError; } }));
Object.defineProperty(exports, "ErrorCodes", ({ enumerable: true, get: function () { return messages_1.ErrorCodes; } }));
Object.defineProperty(exports, "NotificationType", ({ enumerable: true, get: function () { return messages_1.NotificationType; } }));
Object.defineProperty(exports, "NotificationType0", ({ enumerable: true, get: function () { return messages_1.NotificationType0; } }));
Object.defineProperty(exports, "NotificationType1", ({ enumerable: true, get: function () { return messages_1.NotificationType1; } }));
Object.defineProperty(exports, "NotificationType2", ({ enumerable: true, get: function () { return messages_1.NotificationType2; } }));
Object.defineProperty(exports, "NotificationType3", ({ enumerable: true, get: function () { return messages_1.NotificationType3; } }));
Object.defineProperty(exports, "NotificationType4", ({ enumerable: true, get: function () { return messages_1.NotificationType4; } }));
Object.defineProperty(exports, "NotificationType5", ({ enumerable: true, get: function () { return messages_1.NotificationType5; } }));
Object.defineProperty(exports, "NotificationType6", ({ enumerable: true, get: function () { return messages_1.NotificationType6; } }));
Object.defineProperty(exports, "NotificationType7", ({ enumerable: true, get: function () { return messages_1.NotificationType7; } }));
Object.defineProperty(exports, "NotificationType8", ({ enumerable: true, get: function () { return messages_1.NotificationType8; } }));
Object.defineProperty(exports, "NotificationType9", ({ enumerable: true, get: function () { return messages_1.NotificationType9; } }));
Object.defineProperty(exports, "ParameterStructures", ({ enumerable: true, get: function () { return messages_1.ParameterStructures; } }));
const linkedMap_1 = __webpack_require__(58);
Object.defineProperty(exports, "LinkedMap", ({ enumerable: true, get: function () { return linkedMap_1.LinkedMap; } }));
Object.defineProperty(exports, "LRUCache", ({ enumerable: true, get: function () { return linkedMap_1.LRUCache; } }));
Object.defineProperty(exports, "Touch", ({ enumerable: true, get: function () { return linkedMap_1.Touch; } }));
const disposable_1 = __webpack_require__(53);
Object.defineProperty(exports, "Disposable", ({ enumerable: true, get: function () { return disposable_1.Disposable; } }));
const events_1 = __webpack_require__(59);
Object.defineProperty(exports, "Event", ({ enumerable: true, get: function () { return events_1.Event; } }));
Object.defineProperty(exports, "Emitter", ({ enumerable: true, get: function () { return events_1.Emitter; } }));
const cancellation_1 = __webpack_require__(60);
Object.defineProperty(exports, "CancellationTokenSource", ({ enumerable: true, get: function () { return cancellation_1.CancellationTokenSource; } }));
Object.defineProperty(exports, "CancellationToken", ({ enumerable: true, get: function () { return cancellation_1.CancellationToken; } }));
const messageReader_1 = __webpack_require__(61);
Object.defineProperty(exports, "MessageReader", ({ enumerable: true, get: function () { return messageReader_1.MessageReader; } }));
Object.defineProperty(exports, "AbstractMessageReader", ({ enumerable: true, get: function () { return messageReader_1.AbstractMessageReader; } }));
Object.defineProperty(exports, "ReadableStreamMessageReader", ({ enumerable: true, get: function () { return messageReader_1.ReadableStreamMessageReader; } }));
const messageWriter_1 = __webpack_require__(62);
Object.defineProperty(exports, "MessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.MessageWriter; } }));
Object.defineProperty(exports, "AbstractMessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.AbstractMessageWriter; } }));
Object.defineProperty(exports, "WriteableStreamMessageWriter", ({ enumerable: true, get: function () { return messageWriter_1.WriteableStreamMessageWriter; } }));
const connection_1 = __webpack_require__(64);
Object.defineProperty(exports, "ConnectionStrategy", ({ enumerable: true, get: function () { return connection_1.ConnectionStrategy; } }));
Object.defineProperty(exports, "ConnectionOptions", ({ enumerable: true, get: function () { return connection_1.ConnectionOptions; } }));
Object.defineProperty(exports, "NullLogger", ({ enumerable: true, get: function () { return connection_1.NullLogger; } }));
Object.defineProperty(exports, "createMessageConnection", ({ enumerable: true, get: function () { return connection_1.createMessageConnection; } }));
Object.defineProperty(exports, "ProgressType", ({ enumerable: true, get: function () { return connection_1.ProgressType; } }));
Object.defineProperty(exports, "Trace", ({ enumerable: true, get: function () { return connection_1.Trace; } }));
Object.defineProperty(exports, "TraceFormat", ({ enumerable: true, get: function () { return connection_1.TraceFormat; } }));
Object.defineProperty(exports, "SetTraceNotification", ({ enumerable: true, get: function () { return connection_1.SetTraceNotification; } }));
Object.defineProperty(exports, "LogTraceNotification", ({ enumerable: true, get: function () { return connection_1.LogTraceNotification; } }));
Object.defineProperty(exports, "ConnectionErrors", ({ enumerable: true, get: function () { return connection_1.ConnectionErrors; } }));
Object.defineProperty(exports, "ConnectionError", ({ enumerable: true, get: function () { return connection_1.ConnectionError; } }));
Object.defineProperty(exports, "CancellationReceiverStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationReceiverStrategy; } }));
Object.defineProperty(exports, "CancellationSenderStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationSenderStrategy; } }));
Object.defineProperty(exports, "CancellationStrategy", ({ enumerable: true, get: function () { return connection_1.CancellationStrategy; } }));
const ral_1 = __webpack_require__(52);
exports.RAL = ral_1.default;
//# sourceMappingURL=api.js.map

/***/ }),
/* 56 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isResponseMessage = exports.isNotificationMessage = exports.isRequestMessage = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType = exports.RequestType0 = exports.AbstractMessageSignature = exports.ParameterStructures = exports.ResponseError = exports.ErrorCodes = void 0;
const is = __webpack_require__(57);
/**
 * Predefined error codes.
 */
var ErrorCodes;
(function (ErrorCodes) {
    // Defined by JSON RPC
    ErrorCodes.ParseError = -32700;
    ErrorCodes.InvalidRequest = -32600;
    ErrorCodes.MethodNotFound = -32601;
    ErrorCodes.InvalidParams = -32602;
    ErrorCodes.InternalError = -32603;
    /**
     * This is the start range of JSON RPC reserved error codes.
     * It doesn't denote a real error code. No application error codes should
     * be defined between the start and end range. For backwards
     * compatibility the `ServerNotInitialized` and the `UnknownErrorCode`
     * are left in the range.
     *
     * @since 3.16.0
    */
    ErrorCodes.jsonrpcReservedErrorRangeStart = -32099;
    /** @deprecated use  jsonrpcReservedErrorRangeStart */
    ErrorCodes.serverErrorStart = ErrorCodes.jsonrpcReservedErrorRangeStart;
    ErrorCodes.MessageWriteError = -32099;
    ErrorCodes.MessageReadError = -32098;
    /**
     * Error code indicating that a server received a notification or
     * request before the server has received the `initialize` request.
     */
    ErrorCodes.ServerNotInitialized = -32002;
    ErrorCodes.UnknownErrorCode = -32001;
    /**
     * This is the end range of JSON RPC reserved error codes.
     * It doesn't denote a real error code.
     *
     * @since 3.16.0
    */
    ErrorCodes.jsonrpcReservedErrorRangeEnd = -32000;
    /** @deprecated use  jsonrpcReservedErrorRangeEnd */
    ErrorCodes.serverErrorEnd = ErrorCodes.jsonrpcReservedErrorRangeEnd;
})(ErrorCodes = exports.ErrorCodes || (exports.ErrorCodes = {}));
/**
 * An error object return in a response in case a request
 * has failed.
 */
class ResponseError extends Error {
    constructor(code, message, data) {
        super(message);
        this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
        this.data = data;
        Object.setPrototypeOf(this, ResponseError.prototype);
    }
    toJson() {
        const result = {
            code: this.code,
            message: this.message
        };
        if (this.data !== undefined) {
            result.data = this.data;
        }
        return result;
    }
}
exports.ResponseError = ResponseError;
class ParameterStructures {
    constructor(kind) {
        this.kind = kind;
    }
    static is(value) {
        return value === ParameterStructures.auto || value === ParameterStructures.byName || value === ParameterStructures.byPosition;
    }
    toString() {
        return this.kind;
    }
}
exports.ParameterStructures = ParameterStructures;
/**
 * The parameter structure is automatically inferred on the number of parameters
 * and the parameter type in case of a single param.
 */
ParameterStructures.auto = new ParameterStructures('auto');
/**
 * Forces `byPosition` parameter structure. This is useful if you have a single
 * parameter which has a literal type.
 */
ParameterStructures.byPosition = new ParameterStructures('byPosition');
/**
 * Forces `byName` parameter structure. This is only useful when having a single
 * parameter. The library will report errors if used with a different number of
 * parameters.
 */
ParameterStructures.byName = new ParameterStructures('byName');
/**
 * An abstract implementation of a MessageType.
 */
class AbstractMessageSignature {
    constructor(method, numberOfParams) {
        this.method = method;
        this.numberOfParams = numberOfParams;
    }
    get parameterStructures() {
        return ParameterStructures.auto;
    }
}
exports.AbstractMessageSignature = AbstractMessageSignature;
/**
 * Classes to type request response pairs
 */
class RequestType0 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 0);
    }
}
exports.RequestType0 = RequestType0;
class RequestType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.RequestType = RequestType;
class RequestType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.RequestType1 = RequestType1;
class RequestType2 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 2);
    }
}
exports.RequestType2 = RequestType2;
class RequestType3 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 3);
    }
}
exports.RequestType3 = RequestType3;
class RequestType4 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 4);
    }
}
exports.RequestType4 = RequestType4;
class RequestType5 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 5);
    }
}
exports.RequestType5 = RequestType5;
class RequestType6 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 6);
    }
}
exports.RequestType6 = RequestType6;
class RequestType7 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 7);
    }
}
exports.RequestType7 = RequestType7;
class RequestType8 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 8);
    }
}
exports.RequestType8 = RequestType8;
class RequestType9 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 9);
    }
}
exports.RequestType9 = RequestType9;
class NotificationType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.NotificationType = NotificationType;
class NotificationType0 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 0);
    }
}
exports.NotificationType0 = NotificationType0;
class NotificationType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
        super(method, 1);
        this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
        return this._parameterStructures;
    }
}
exports.NotificationType1 = NotificationType1;
class NotificationType2 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 2);
    }
}
exports.NotificationType2 = NotificationType2;
class NotificationType3 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 3);
    }
}
exports.NotificationType3 = NotificationType3;
class NotificationType4 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 4);
    }
}
exports.NotificationType4 = NotificationType4;
class NotificationType5 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 5);
    }
}
exports.NotificationType5 = NotificationType5;
class NotificationType6 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 6);
    }
}
exports.NotificationType6 = NotificationType6;
class NotificationType7 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 7);
    }
}
exports.NotificationType7 = NotificationType7;
class NotificationType8 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 8);
    }
}
exports.NotificationType8 = NotificationType8;
class NotificationType9 extends AbstractMessageSignature {
    constructor(method) {
        super(method, 9);
    }
}
exports.NotificationType9 = NotificationType9;
/**
 * Tests if the given message is a request message
 */
function isRequestMessage(message) {
    const candidate = message;
    return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
}
exports.isRequestMessage = isRequestMessage;
/**
 * Tests if the given message is a notification message
 */
function isNotificationMessage(message) {
    const candidate = message;
    return candidate && is.string(candidate.method) && message.id === void 0;
}
exports.isNotificationMessage = isNotificationMessage;
/**
 * Tests if the given message is a response message
 */
function isResponseMessage(message) {
    const candidate = message;
    return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null);
}
exports.isResponseMessage = isResponseMessage;
//# sourceMappingURL=messages.js.map

/***/ }),
/* 57 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
function boolean(value) {
    return value === true || value === false;
}
exports.boolean = boolean;
function string(value) {
    return typeof value === 'string' || value instanceof String;
}
exports.string = string;
function number(value) {
    return typeof value === 'number' || value instanceof Number;
}
exports.number = number;
function error(value) {
    return value instanceof Error;
}
exports.error = error;
function func(value) {
    return typeof value === 'function';
}
exports.func = func;
function array(value) {
    return Array.isArray(value);
}
exports.array = array;
function stringArray(value) {
    return array(value) && value.every(elem => string(elem));
}
exports.stringArray = stringArray;
//# sourceMappingURL=is.js.map

/***/ }),
/* 58 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LRUCache = exports.LinkedMap = exports.Touch = void 0;
var Touch;
(function (Touch) {
    Touch.None = 0;
    Touch.First = 1;
    Touch.AsOld = Touch.First;
    Touch.Last = 2;
    Touch.AsNew = Touch.Last;
})(Touch = exports.Touch || (exports.Touch = {}));
class LinkedMap {
    constructor() {
        this[_a] = 'LinkedMap';
        this._map = new Map();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state = 0;
    }
    clear() {
        this._map.clear();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state++;
    }
    isEmpty() {
        return !this._head && !this._tail;
    }
    get size() {
        return this._size;
    }
    get first() {
        var _b;
        return (_b = this._head) === null || _b === void 0 ? void 0 : _b.value;
    }
    get last() {
        var _b;
        return (_b = this._tail) === null || _b === void 0 ? void 0 : _b.value;
    }
    has(key) {
        return this._map.has(key);
    }
    get(key, touch = Touch.None) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        if (touch !== Touch.None) {
            this.touch(item, touch);
        }
        return item.value;
    }
    set(key, value, touch = Touch.None) {
        let item = this._map.get(key);
        if (item) {
            item.value = value;
            if (touch !== Touch.None) {
                this.touch(item, touch);
            }
        }
        else {
            item = { key, value, next: undefined, previous: undefined };
            switch (touch) {
                case Touch.None:
                    this.addItemLast(item);
                    break;
                case Touch.First:
                    this.addItemFirst(item);
                    break;
                case Touch.Last:
                    this.addItemLast(item);
                    break;
                default:
                    this.addItemLast(item);
                    break;
            }
            this._map.set(key, item);
            this._size++;
        }
        return this;
    }
    delete(key) {
        return !!this.remove(key);
    }
    remove(key) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        this._map.delete(key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    shift() {
        if (!this._head && !this._tail) {
            return undefined;
        }
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        const item = this._head;
        this._map.delete(item.key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    forEach(callbackfn, thisArg) {
        const state = this._state;
        let current = this._head;
        while (current) {
            if (thisArg) {
                callbackfn.bind(thisArg)(current.value, current.key, this);
            }
            else {
                callbackfn(current.value, current.key, this);
            }
            if (this._state !== state) {
                throw new Error(`LinkedMap got modified during iteration.`);
            }
            current = current.next;
        }
    }
    keys() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.key, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    values() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.value, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    entries() {
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]: () => {
                return iterator;
            },
            next: () => {
                if (this._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: [current.key, current.value], done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            }
        };
        return iterator;
    }
    [(_a = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
    }
    trimOld(newSize) {
        if (newSize >= this.size) {
            return;
        }
        if (newSize === 0) {
            this.clear();
            return;
        }
        let current = this._head;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
            this._map.delete(current.key);
            current = current.next;
            currentSize--;
        }
        this._head = current;
        this._size = currentSize;
        if (current) {
            current.previous = undefined;
        }
        this._state++;
    }
    addItemFirst(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._tail = item;
        }
        else if (!this._head) {
            throw new Error('Invalid list');
        }
        else {
            item.next = this._head;
            this._head.previous = item;
        }
        this._head = item;
        this._state++;
    }
    addItemLast(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._head = item;
        }
        else if (!this._tail) {
            throw new Error('Invalid list');
        }
        else {
            item.previous = this._tail;
            this._tail.next = item;
        }
        this._tail = item;
        this._state++;
    }
    removeItem(item) {
        if (item === this._head && item === this._tail) {
            this._head = undefined;
            this._tail = undefined;
        }
        else if (item === this._head) {
            // This can only happened if size === 1 which is handle
            // by the case above.
            if (!item.next) {
                throw new Error('Invalid list');
            }
            item.next.previous = undefined;
            this._head = item.next;
        }
        else if (item === this._tail) {
            // This can only happened if size === 1 which is handle
            // by the case above.
            if (!item.previous) {
                throw new Error('Invalid list');
            }
            item.previous.next = undefined;
            this._tail = item.previous;
        }
        else {
            const next = item.next;
            const previous = item.previous;
            if (!next || !previous) {
                throw new Error('Invalid list');
            }
            next.previous = previous;
            previous.next = next;
        }
        item.next = undefined;
        item.previous = undefined;
        this._state++;
    }
    touch(item, touch) {
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        if ((touch !== Touch.First && touch !== Touch.Last)) {
            return;
        }
        if (touch === Touch.First) {
            if (item === this._head) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item
            if (item === this._tail) {
                // previous must be defined since item was not head but is tail
                // So there are more than on item in the map
                previous.next = undefined;
                this._tail = previous;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            // Insert the node at head
            item.previous = undefined;
            item.next = this._head;
            this._head.previous = item;
            this._head = item;
            this._state++;
        }
        else if (touch === Touch.Last) {
            if (item === this._tail) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item.
            if (item === this._head) {
                // next must be defined since item was not tail but is head
                // So there are more than on item in the map
                next.previous = undefined;
                this._head = next;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            item.next = undefined;
            item.previous = this._tail;
            this._tail.next = item;
            this._tail = item;
            this._state++;
        }
    }
    toJSON() {
        const data = [];
        this.forEach((value, key) => {
            data.push([key, value]);
        });
        return data;
    }
    fromJSON(data) {
        this.clear();
        for (const [key, value] of data) {
            this.set(key, value);
        }
    }
}
exports.LinkedMap = LinkedMap;
class LRUCache extends LinkedMap {
    constructor(limit, ratio = 1) {
        super();
        this._limit = limit;
        this._ratio = Math.min(Math.max(0, ratio), 1);
    }
    get limit() {
        return this._limit;
    }
    set limit(limit) {
        this._limit = limit;
        this.checkTrim();
    }
    get ratio() {
        return this._ratio;
    }
    set ratio(ratio) {
        this._ratio = Math.min(Math.max(0, ratio), 1);
        this.checkTrim();
    }
    get(key, touch = Touch.AsNew) {
        return super.get(key, touch);
    }
    peek(key) {
        return super.get(key, Touch.None);
    }
    set(key, value) {
        super.set(key, value, Touch.Last);
        this.checkTrim();
        return this;
    }
    checkTrim() {
        if (this.size > this._limit) {
            this.trimOld(Math.round(this._limit * this._ratio));
        }
    }
}
exports.LRUCache = LRUCache;
//# sourceMappingURL=linkedMap.js.map

/***/ }),
/* 59 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Emitter = exports.Event = void 0;
const ral_1 = __webpack_require__(52);
var Event;
(function (Event) {
    const _disposable = { dispose() { } };
    Event.None = function () { return _disposable; };
})(Event = exports.Event || (exports.Event = {}));
class CallbackList {
    add(callback, context = null, bucket) {
        if (!this._callbacks) {
            this._callbacks = [];
            this._contexts = [];
        }
        this._callbacks.push(callback);
        this._contexts.push(context);
        if (Array.isArray(bucket)) {
            bucket.push({ dispose: () => this.remove(callback, context) });
        }
    }
    remove(callback, context = null) {
        if (!this._callbacks) {
            return;
        }
        let foundCallbackWithDifferentContext = false;
        for (let i = 0, len = this._callbacks.length; i < len; i++) {
            if (this._callbacks[i] === callback) {
                if (this._contexts[i] === context) {
                    // callback & context match => remove it
                    this._callbacks.splice(i, 1);
                    this._contexts.splice(i, 1);
                    return;
                }
                else {
                    foundCallbackWithDifferentContext = true;
                }
            }
        }
        if (foundCallbackWithDifferentContext) {
            throw new Error('When adding a listener with a context, you should remove it with the same context');
        }
    }
    invoke(...args) {
        if (!this._callbacks) {
            return [];
        }
        const ret = [], callbacks = this._callbacks.slice(0), contexts = this._contexts.slice(0);
        for (let i = 0, len = callbacks.length; i < len; i++) {
            try {
                ret.push(callbacks[i].apply(contexts[i], args));
            }
            catch (e) {
                // eslint-disable-next-line no-console
                ral_1.default().console.error(e);
            }
        }
        return ret;
    }
    isEmpty() {
        return !this._callbacks || this._callbacks.length === 0;
    }
    dispose() {
        this._callbacks = undefined;
        this._contexts = undefined;
    }
}
class Emitter {
    constructor(_options) {
        this._options = _options;
    }
    /**
     * For the public to allow to subscribe
     * to events from this Emitter
     */
    get event() {
        if (!this._event) {
            this._event = (listener, thisArgs, disposables) => {
                if (!this._callbacks) {
                    this._callbacks = new CallbackList();
                }
                if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
                    this._options.onFirstListenerAdd(this);
                }
                this._callbacks.add(listener, thisArgs);
                const result = {
                    dispose: () => {
                        if (!this._callbacks) {
                            // disposable is disposed after emitter is disposed.
                            return;
                        }
                        this._callbacks.remove(listener, thisArgs);
                        result.dispose = Emitter._noop;
                        if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty()) {
                            this._options.onLastListenerRemove(this);
                        }
                    }
                };
                if (Array.isArray(disposables)) {
                    disposables.push(result);
                }
                return result;
            };
        }
        return this._event;
    }
    /**
     * To be kept private to fire an event to
     * subscribers
     */
    fire(event) {
        if (this._callbacks) {
            this._callbacks.invoke.call(this._callbacks, event);
        }
    }
    dispose() {
        if (this._callbacks) {
            this._callbacks.dispose();
            this._callbacks = undefined;
        }
    }
}
exports.Emitter = Emitter;
Emitter._noop = function () { };
//# sourceMappingURL=events.js.map

/***/ }),
/* 60 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CancellationTokenSource = exports.CancellationToken = void 0;
const ral_1 = __webpack_require__(52);
const Is = __webpack_require__(57);
const events_1 = __webpack_require__(59);
var CancellationToken;
(function (CancellationToken) {
    CancellationToken.None = Object.freeze({
        isCancellationRequested: false,
        onCancellationRequested: events_1.Event.None
    });
    CancellationToken.Cancelled = Object.freeze({
        isCancellationRequested: true,
        onCancellationRequested: events_1.Event.None
    });
    function is(value) {
        const candidate = value;
        return candidate && (candidate === CancellationToken.None
            || candidate === CancellationToken.Cancelled
            || (Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested));
    }
    CancellationToken.is = is;
})(CancellationToken = exports.CancellationToken || (exports.CancellationToken = {}));
const shortcutEvent = Object.freeze(function (callback, context) {
    const handle = ral_1.default().timer.setTimeout(callback.bind(context), 0);
    return { dispose() { handle.dispose(); } };
});
class MutableToken {
    constructor() {
        this._isCancelled = false;
    }
    cancel() {
        if (!this._isCancelled) {
            this._isCancelled = true;
            if (this._emitter) {
                this._emitter.fire(undefined);
                this.dispose();
            }
        }
    }
    get isCancellationRequested() {
        return this._isCancelled;
    }
    get onCancellationRequested() {
        if (this._isCancelled) {
            return shortcutEvent;
        }
        if (!this._emitter) {
            this._emitter = new events_1.Emitter();
        }
        return this._emitter.event;
    }
    dispose() {
        if (this._emitter) {
            this._emitter.dispose();
            this._emitter = undefined;
        }
    }
}
class CancellationTokenSource {
    get token() {
        if (!this._token) {
            // be lazy and create the token only when
            // actually needed
            this._token = new MutableToken();
        }
        return this._token;
    }
    cancel() {
        if (!this._token) {
            // save an object by returning the default
            // cancelled token when cancellation happens
            // before someone asks for the token
            this._token = CancellationToken.Cancelled;
        }
        else {
            this._token.cancel();
        }
    }
    dispose() {
        if (!this._token) {
            // ensure to initialize with an empty token if we had none
            this._token = CancellationToken.None;
        }
        else if (this._token instanceof MutableToken) {
            // actually dispose
            this._token.dispose();
        }
    }
}
exports.CancellationTokenSource = CancellationTokenSource;
//# sourceMappingURL=cancellation.js.map

/***/ }),
/* 61 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = void 0;
const ral_1 = __webpack_require__(52);
const Is = __webpack_require__(57);
const events_1 = __webpack_require__(59);
var MessageReader;
(function (MessageReader) {
    function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.listen) && Is.func(candidate.dispose) &&
            Is.func(candidate.onError) && Is.func(candidate.onClose) && Is.func(candidate.onPartialMessage);
    }
    MessageReader.is = is;
})(MessageReader = exports.MessageReader || (exports.MessageReader = {}));
class AbstractMessageReader {
    constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
        this.partialMessageEmitter = new events_1.Emitter();
    }
    dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
    }
    get onError() {
        return this.errorEmitter.event;
    }
    fireError(error) {
        this.errorEmitter.fire(this.asError(error));
    }
    get onClose() {
        return this.closeEmitter.event;
    }
    fireClose() {
        this.closeEmitter.fire(undefined);
    }
    get onPartialMessage() {
        return this.partialMessageEmitter.event;
    }
    firePartialMessage(info) {
        this.partialMessageEmitter.fire(info);
    }
    asError(error) {
        if (error instanceof Error) {
            return error;
        }
        else {
            return new Error(`Reader received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
        }
    }
}
exports.AbstractMessageReader = AbstractMessageReader;
var ResolvedMessageReaderOptions;
(function (ResolvedMessageReaderOptions) {
    function fromOptions(options) {
        var _a;
        let charset;
        let result;
        let contentDecoder;
        const contentDecoders = new Map();
        let contentTypeDecoder;
        const contentTypeDecoders = new Map();
        if (options === undefined || typeof options === 'string') {
            charset = options !== null && options !== void 0 ? options : 'utf-8';
        }
        else {
            charset = (_a = options.charset) !== null && _a !== void 0 ? _a : 'utf-8';
            if (options.contentDecoder !== undefined) {
                contentDecoder = options.contentDecoder;
                contentDecoders.set(contentDecoder.name, contentDecoder);
            }
            if (options.contentDecoders !== undefined) {
                for (const decoder of options.contentDecoders) {
                    contentDecoders.set(decoder.name, decoder);
                }
            }
            if (options.contentTypeDecoder !== undefined) {
                contentTypeDecoder = options.contentTypeDecoder;
                contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
            }
            if (options.contentTypeDecoders !== undefined) {
                for (const decoder of options.contentTypeDecoders) {
                    contentTypeDecoders.set(decoder.name, decoder);
                }
            }
        }
        if (contentTypeDecoder === undefined) {
            contentTypeDecoder = ral_1.default().applicationJson.decoder;
            contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
    }
    ResolvedMessageReaderOptions.fromOptions = fromOptions;
})(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
class ReadableStreamMessageReader extends AbstractMessageReader {
    constructor(readable, options) {
        super();
        this.readable = readable;
        this.options = ResolvedMessageReaderOptions.fromOptions(options);
        this.buffer = ral_1.default().messageBuffer.create(this.options.charset);
        this._partialMessageTimeout = 10000;
        this.nextMessageLength = -1;
        this.messageToken = 0;
    }
    set partialMessageTimeout(timeout) {
        this._partialMessageTimeout = timeout;
    }
    get partialMessageTimeout() {
        return this._partialMessageTimeout;
    }
    listen(callback) {
        this.nextMessageLength = -1;
        this.messageToken = 0;
        this.partialMessageTimer = undefined;
        this.callback = callback;
        const result = this.readable.onData((data) => {
            this.onData(data);
        });
        this.readable.onError((error) => this.fireError(error));
        this.readable.onClose(() => this.fireClose());
        return result;
    }
    onData(data) {
        this.buffer.append(data);
        while (true) {
            if (this.nextMessageLength === -1) {
                const headers = this.buffer.tryReadHeaders();
                if (!headers) {
                    return;
                }
                const contentLength = headers.get('Content-Length');
                if (!contentLength) {
                    throw new Error('Header must provide a Content-Length property.');
                }
                const length = parseInt(contentLength);
                if (isNaN(length)) {
                    throw new Error('Content-Length value must be a number.');
                }
                this.nextMessageLength = length;
            }
            const body = this.buffer.tryReadBody(this.nextMessageLength);
            if (body === undefined) {
                /** We haven't received the full message yet. */
                this.setPartialMessageTimer();
                return;
            }
            this.clearPartialMessageTimer();
            this.nextMessageLength = -1;
            let p;
            if (this.options.contentDecoder !== undefined) {
                p = this.options.contentDecoder.decode(body);
            }
            else {
                p = Promise.resolve(body);
            }
            p.then((value) => {
                this.options.contentTypeDecoder.decode(value, this.options).then((msg) => {
                    this.callback(msg);
                }, (error) => {
                    this.fireError(error);
                });
            }, (error) => {
                this.fireError(error);
            });
        }
    }
    clearPartialMessageTimer() {
        if (this.partialMessageTimer) {
            this.partialMessageTimer.dispose();
            this.partialMessageTimer = undefined;
        }
    }
    setPartialMessageTimer() {
        this.clearPartialMessageTimer();
        if (this._partialMessageTimeout <= 0) {
            return;
        }
        this.partialMessageTimer = ral_1.default().timer.setTimeout((token, timeout) => {
            this.partialMessageTimer = undefined;
            if (token === this.messageToken) {
                this.firePartialMessage({ messageToken: token, waitingTime: timeout });
                this.setPartialMessageTimer();
            }
        }, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
    }
}
exports.ReadableStreamMessageReader = ReadableStreamMessageReader;
//# sourceMappingURL=messageReader.js.map

/***/ }),
/* 62 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = void 0;
const ral_1 = __webpack_require__(52);
const Is = __webpack_require__(57);
const semaphore_1 = __webpack_require__(63);
const events_1 = __webpack_require__(59);
const ContentLength = 'Content-Length: ';
const CRLF = '\r\n';
var MessageWriter;
(function (MessageWriter) {
    function is(value) {
        let candidate = value;
        return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) &&
            Is.func(candidate.onError) && Is.func(candidate.write);
    }
    MessageWriter.is = is;
})(MessageWriter = exports.MessageWriter || (exports.MessageWriter = {}));
class AbstractMessageWriter {
    constructor() {
        this.errorEmitter = new events_1.Emitter();
        this.closeEmitter = new events_1.Emitter();
    }
    dispose() {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
    }
    get onError() {
        return this.errorEmitter.event;
    }
    fireError(error, message, count) {
        this.errorEmitter.fire([this.asError(error), message, count]);
    }
    get onClose() {
        return this.closeEmitter.event;
    }
    fireClose() {
        this.closeEmitter.fire(undefined);
    }
    asError(error) {
        if (error instanceof Error) {
            return error;
        }
        else {
            return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
        }
    }
}
exports.AbstractMessageWriter = AbstractMessageWriter;
var ResolvedMessageWriterOptions;
(function (ResolvedMessageWriterOptions) {
    function fromOptions(options) {
        var _a, _b;
        if (options === undefined || typeof options === 'string') {
            return { charset: options !== null && options !== void 0 ? options : 'utf-8', contentTypeEncoder: ral_1.default().applicationJson.encoder };
        }
        else {
            return { charset: (_a = options.charset) !== null && _a !== void 0 ? _a : 'utf-8', contentEncoder: options.contentEncoder, contentTypeEncoder: (_b = options.contentTypeEncoder) !== null && _b !== void 0 ? _b : ral_1.default().applicationJson.encoder };
        }
    }
    ResolvedMessageWriterOptions.fromOptions = fromOptions;
})(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
class WriteableStreamMessageWriter extends AbstractMessageWriter {
    constructor(writable, options) {
        super();
        this.writable = writable;
        this.options = ResolvedMessageWriterOptions.fromOptions(options);
        this.errorCount = 0;
        this.writeSemaphore = new semaphore_1.Semaphore(1);
        this.writable.onError((error) => this.fireError(error));
        this.writable.onClose(() => this.fireClose());
    }
    async write(msg) {
        return this.writeSemaphore.lock(async () => {
            const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
                if (this.options.contentEncoder !== undefined) {
                    return this.options.contentEncoder.encode(buffer);
                }
                else {
                    return buffer;
                }
            });
            return payload.then((buffer) => {
                const headers = [];
                headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
                headers.push(CRLF);
                return this.doWrite(msg, headers, buffer);
            }, (error) => {
                this.fireError(error);
                throw error;
            });
        });
    }
    async doWrite(msg, headers, data) {
        try {
            await this.writable.write(headers.join(''), 'ascii');
            return this.writable.write(data);
        }
        catch (error) {
            this.handleError(error, msg);
            return Promise.reject(error);
        }
    }
    handleError(error, msg) {
        this.errorCount++;
        this.fireError(error, msg, this.errorCount);
    }
    end() {
        this.writable.end();
    }
}
exports.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
//# sourceMappingURL=messageWriter.js.map

/***/ }),
/* 63 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Semaphore = void 0;
const ral_1 = __webpack_require__(52);
class Semaphore {
    constructor(capacity = 1) {
        if (capacity <= 0) {
            throw new Error('Capacity must be greater than 0');
        }
        this._capacity = capacity;
        this._active = 0;
        this._waiting = [];
    }
    lock(thunk) {
        return new Promise((resolve, reject) => {
            this._waiting.push({ thunk, resolve, reject });
            this.runNext();
        });
    }
    get active() {
        return this._active;
    }
    runNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
            return;
        }
        ral_1.default().timer.setImmediate(() => this.doRunNext());
    }
    doRunNext() {
        if (this._waiting.length === 0 || this._active === this._capacity) {
            return;
        }
        const next = this._waiting.shift();
        this._active++;
        if (this._active > this._capacity) {
            throw new Error(`To many thunks active`);
        }
        try {
            const result = next.thunk();
            if (result instanceof Promise) {
                result.then((value) => {
                    this._active--;
                    next.resolve(value);
                    this.runNext();
                }, (err) => {
                    this._active--;
                    next.reject(err);
                    this.runNext();
                });
            }
            else {
                this._active--;
                next.resolve(result);
                this.runNext();
            }
        }
        catch (err) {
            this._active--;
            next.reject(err);
            this.runNext();
        }
    }
}
exports.Semaphore = Semaphore;
//# sourceMappingURL=semaphore.js.map

/***/ }),
/* 64 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createMessageConnection = exports.ConnectionOptions = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.ConnectionStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.Trace = exports.NullLogger = exports.ProgressType = void 0;
const ral_1 = __webpack_require__(52);
const Is = __webpack_require__(57);
const messages_1 = __webpack_require__(56);
const linkedMap_1 = __webpack_require__(58);
const events_1 = __webpack_require__(59);
const cancellation_1 = __webpack_require__(60);
var CancelNotification;
(function (CancelNotification) {
    CancelNotification.type = new messages_1.NotificationType('$/cancelRequest');
})(CancelNotification || (CancelNotification = {}));
var ProgressNotification;
(function (ProgressNotification) {
    ProgressNotification.type = new messages_1.NotificationType('$/progress');
})(ProgressNotification || (ProgressNotification = {}));
class ProgressType {
    constructor() {
    }
}
exports.ProgressType = ProgressType;
var StarRequestHandler;
(function (StarRequestHandler) {
    function is(value) {
        return Is.func(value);
    }
    StarRequestHandler.is = is;
})(StarRequestHandler || (StarRequestHandler = {}));
exports.NullLogger = Object.freeze({
    error: () => { },
    warn: () => { },
    info: () => { },
    log: () => { }
});
var Trace;
(function (Trace) {
    Trace[Trace["Off"] = 0] = "Off";
    Trace[Trace["Messages"] = 1] = "Messages";
    Trace[Trace["Verbose"] = 2] = "Verbose";
})(Trace = exports.Trace || (exports.Trace = {}));
(function (Trace) {
    function fromString(value) {
        if (!Is.string(value)) {
            return Trace.Off;
        }
        value = value.toLowerCase();
        switch (value) {
            case 'off':
                return Trace.Off;
            case 'messages':
                return Trace.Messages;
            case 'verbose':
                return Trace.Verbose;
            default:
                return Trace.Off;
        }
    }
    Trace.fromString = fromString;
    function toString(value) {
        switch (value) {
            case Trace.Off:
                return 'off';
            case Trace.Messages:
                return 'messages';
            case Trace.Verbose:
                return 'verbose';
            default:
                return 'off';
        }
    }
    Trace.toString = toString;
})(Trace = exports.Trace || (exports.Trace = {}));
var TraceFormat;
(function (TraceFormat) {
    TraceFormat["Text"] = "text";
    TraceFormat["JSON"] = "json";
})(TraceFormat = exports.TraceFormat || (exports.TraceFormat = {}));
(function (TraceFormat) {
    function fromString(value) {
        if (!Is.string(value)) {
            return TraceFormat.Text;
        }
        value = value.toLowerCase();
        if (value === 'json') {
            return TraceFormat.JSON;
        }
        else {
            return TraceFormat.Text;
        }
    }
    TraceFormat.fromString = fromString;
})(TraceFormat = exports.TraceFormat || (exports.TraceFormat = {}));
var SetTraceNotification;
(function (SetTraceNotification) {
    SetTraceNotification.type = new messages_1.NotificationType('$/setTrace');
})(SetTraceNotification = exports.SetTraceNotification || (exports.SetTraceNotification = {}));
var LogTraceNotification;
(function (LogTraceNotification) {
    LogTraceNotification.type = new messages_1.NotificationType('$/logTrace');
})(LogTraceNotification = exports.LogTraceNotification || (exports.LogTraceNotification = {}));
var ConnectionErrors;
(function (ConnectionErrors) {
    /**
     * The connection is closed.
     */
    ConnectionErrors[ConnectionErrors["Closed"] = 1] = "Closed";
    /**
     * The connection got disposed.
     */
    ConnectionErrors[ConnectionErrors["Disposed"] = 2] = "Disposed";
    /**
     * The connection is already in listening mode.
     */
    ConnectionErrors[ConnectionErrors["AlreadyListening"] = 3] = "AlreadyListening";
})(ConnectionErrors = exports.ConnectionErrors || (exports.ConnectionErrors = {}));
class ConnectionError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, ConnectionError.prototype);
    }
}
exports.ConnectionError = ConnectionError;
var ConnectionStrategy;
(function (ConnectionStrategy) {
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
    }
    ConnectionStrategy.is = is;
})(ConnectionStrategy = exports.ConnectionStrategy || (exports.ConnectionStrategy = {}));
var CancellationReceiverStrategy;
(function (CancellationReceiverStrategy) {
    CancellationReceiverStrategy.Message = Object.freeze({
        createCancellationTokenSource(_) {
            return new cancellation_1.CancellationTokenSource();
        }
    });
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.createCancellationTokenSource);
    }
    CancellationReceiverStrategy.is = is;
})(CancellationReceiverStrategy = exports.CancellationReceiverStrategy || (exports.CancellationReceiverStrategy = {}));
var CancellationSenderStrategy;
(function (CancellationSenderStrategy) {
    CancellationSenderStrategy.Message = Object.freeze({
        sendCancellation(conn, id) {
            conn.sendNotification(CancelNotification.type, { id });
        },
        cleanup(_) { }
    });
    function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
    }
    CancellationSenderStrategy.is = is;
})(CancellationSenderStrategy = exports.CancellationSenderStrategy || (exports.CancellationSenderStrategy = {}));
var CancellationStrategy;
(function (CancellationStrategy) {
    CancellationStrategy.Message = Object.freeze({
        receiver: CancellationReceiverStrategy.Message,
        sender: CancellationSenderStrategy.Message
    });
    function is(value) {
        const candidate = value;
        return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
    }
    CancellationStrategy.is = is;
})(CancellationStrategy = exports.CancellationStrategy || (exports.CancellationStrategy = {}));
var ConnectionOptions;
(function (ConnectionOptions) {
    function is(value) {
        const candidate = value;
        return candidate && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy));
    }
    ConnectionOptions.is = is;
})(ConnectionOptions = exports.ConnectionOptions || (exports.ConnectionOptions = {}));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["New"] = 1] = "New";
    ConnectionState[ConnectionState["Listening"] = 2] = "Listening";
    ConnectionState[ConnectionState["Closed"] = 3] = "Closed";
    ConnectionState[ConnectionState["Disposed"] = 4] = "Disposed";
})(ConnectionState || (ConnectionState = {}));
function createMessageConnection(messageReader, messageWriter, _logger, options) {
    const logger = _logger !== undefined ? _logger : exports.NullLogger;
    let sequenceNumber = 0;
    let notificationSequenceNumber = 0;
    let unknownResponseSequenceNumber = 0;
    const version = '2.0';
    let starRequestHandler = undefined;
    const requestHandlers = Object.create(null);
    let starNotificationHandler = undefined;
    const notificationHandlers = Object.create(null);
    const progressHandlers = new Map();
    let timer;
    let messageQueue = new linkedMap_1.LinkedMap();
    let responsePromises = Object.create(null);
    let knownCanceledRequests = new Set();
    let requestTokens = Object.create(null);
    let trace = Trace.Off;
    let traceFormat = TraceFormat.Text;
    let tracer;
    let state = ConnectionState.New;
    const errorEmitter = new events_1.Emitter();
    const closeEmitter = new events_1.Emitter();
    const unhandledNotificationEmitter = new events_1.Emitter();
    const unhandledProgressEmitter = new events_1.Emitter();
    const disposeEmitter = new events_1.Emitter();
    const cancellationStrategy = (options && options.cancellationStrategy) ? options.cancellationStrategy : CancellationStrategy.Message;
    function createRequestQueueKey(id) {
        if (id === null) {
            throw new Error(`Can't send requests with id null since the response can't be correlated.`);
        }
        return 'req-' + id.toString();
    }
    function createResponseQueueKey(id) {
        if (id === null) {
            return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
        }
        else {
            return 'res-' + id.toString();
        }
    }
    function createNotificationQueueKey() {
        return 'not-' + (++notificationSequenceNumber).toString();
    }
    function addMessageToQueue(queue, message) {
        if (messages_1.isRequestMessage(message)) {
            queue.set(createRequestQueueKey(message.id), message);
        }
        else if (messages_1.isResponseMessage(message)) {
            queue.set(createResponseQueueKey(message.id), message);
        }
        else {
            queue.set(createNotificationQueueKey(), message);
        }
    }
    function cancelUndispatched(_message) {
        return undefined;
    }
    function isListening() {
        return state === ConnectionState.Listening;
    }
    function isClosed() {
        return state === ConnectionState.Closed;
    }
    function isDisposed() {
        return state === ConnectionState.Disposed;
    }
    function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
            state = ConnectionState.Closed;
            closeEmitter.fire(undefined);
        }
        // If the connection is disposed don't sent close events.
    }
    function readErrorHandler(error) {
        errorEmitter.fire([error, undefined, undefined]);
    }
    function writeErrorHandler(data) {
        errorEmitter.fire(data);
    }
    messageReader.onClose(closeHandler);
    messageReader.onError(readErrorHandler);
    messageWriter.onClose(closeHandler);
    messageWriter.onError(writeErrorHandler);
    function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
            return;
        }
        timer = ral_1.default().timer.setImmediate(() => {
            timer = undefined;
            processMessageQueue();
        });
    }
    function processMessageQueue() {
        if (messageQueue.size === 0) {
            return;
        }
        const message = messageQueue.shift();
        try {
            if (messages_1.isRequestMessage(message)) {
                handleRequest(message);
            }
            else if (messages_1.isNotificationMessage(message)) {
                handleNotification(message);
            }
            else if (messages_1.isResponseMessage(message)) {
                handleResponse(message);
            }
            else {
                handleInvalidMessage(message);
            }
        }
        finally {
            triggerMessageQueue();
        }
    }
    const callback = (message) => {
        try {
            // We have received a cancellation message. Check if the message is still in the queue
            // and cancel it if allowed to do so.
            if (messages_1.isNotificationMessage(message) && message.method === CancelNotification.type.method) {
                const cancelId = message.params.id;
                const key = createRequestQueueKey(cancelId);
                const toCancel = messageQueue.get(key);
                if (messages_1.isRequestMessage(toCancel)) {
                    const strategy = options === null || options === void 0 ? void 0 : options.connectionStrategy;
                    const response = (strategy && strategy.cancelUndispatched) ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
                    if (response && (response.error !== undefined || response.result !== undefined)) {
                        messageQueue.delete(key);
                        response.id = toCancel.id;
                        traceSendingResponse(response, message.method, Date.now());
                        messageWriter.write(response);
                        return;
                    }
                }
                const tokenKey = String(cancelId);
                const cancellationToken = requestTokens[tokenKey];
                // The request is already running. Cancel the token
                if (cancellationToken !== undefined) {
                    cancellationToken.cancel();
                    traceReceivedNotification(message);
                    return;
                }
                else {
                    // Remember the cancel but still queue the message to
                    // clean up state in process message.
                    knownCanceledRequests.add(cancelId);
                }
            }
            addMessageToQueue(messageQueue, message);
        }
        finally {
            triggerMessageQueue();
        }
    };
    function handleRequest(requestMessage) {
        if (isDisposed()) {
            // we return here silently since we fired an event when the
            // connection got disposed.
            return;
        }
        function reply(resultOrError, method, startTime) {
            const message = {
                jsonrpc: version,
                id: requestMessage.id
            };
            if (resultOrError instanceof messages_1.ResponseError) {
                message.error = resultOrError.toJson();
            }
            else {
                message.result = resultOrError === undefined ? null : resultOrError;
            }
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        function replyError(error, method, startTime) {
            const message = {
                jsonrpc: version,
                id: requestMessage.id,
                error: error.toJson()
            };
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        function replySuccess(result, method, startTime) {
            // The JSON RPC defines that a response must either have a result or an error
            // So we can't treat undefined as a valid response result.
            if (result === undefined) {
                result = null;
            }
            const message = {
                jsonrpc: version,
                id: requestMessage.id,
                result: result
            };
            traceSendingResponse(message, method, startTime);
            messageWriter.write(message);
        }
        traceReceivedRequest(requestMessage);
        const element = requestHandlers[requestMessage.method];
        let type;
        let requestHandler;
        if (element) {
            type = element.type;
            requestHandler = element.handler;
        }
        const startTime = Date.now();
        if (requestHandler || starRequestHandler) {
            const tokenKey = String(requestMessage.id);
            const cancellationSource = cancellationStrategy.receiver.createCancellationTokenSource(tokenKey);
            if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
                cancellationSource.cancel();
            }
            requestTokens[tokenKey] = cancellationSource;
            try {
                let handlerResult;
                if (requestHandler) {
                    if (requestMessage.params === undefined) {
                        if (type !== undefined && type.numberOfParams !== 0) {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
                            return;
                        }
                        handlerResult = requestHandler(cancellationSource.token);
                    }
                    else if (Array.isArray(requestMessage.params)) {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byName) {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
                            return;
                        }
                        handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
                    }
                    else {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
                            return;
                        }
                        handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
                    }
                }
                else if (starRequestHandler) {
                    handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
                }
                const promise = handlerResult;
                if (!handlerResult) {
                    delete requestTokens[tokenKey];
                    replySuccess(handlerResult, requestMessage.method, startTime);
                }
                else if (promise.then) {
                    promise.then((resultOrError) => {
                        delete requestTokens[tokenKey];
                        reply(resultOrError, requestMessage.method, startTime);
                    }, error => {
                        delete requestTokens[tokenKey];
                        if (error instanceof messages_1.ResponseError) {
                            replyError(error, requestMessage.method, startTime);
                        }
                        else if (error && Is.string(error.message)) {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                        }
                        else {
                            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                        }
                    });
                }
                else {
                    delete requestTokens[tokenKey];
                    reply(handlerResult, requestMessage.method, startTime);
                }
            }
            catch (error) {
                delete requestTokens[tokenKey];
                if (error instanceof messages_1.ResponseError) {
                    reply(error, requestMessage.method, startTime);
                }
                else if (error && Is.string(error.message)) {
                    replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                }
                else {
                    replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                }
            }
        }
        else {
            replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
        }
    }
    function handleResponse(responseMessage) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        if (responseMessage.id === null) {
            if (responseMessage.error) {
                logger.error(`Received response message without id: Error is: \n${JSON.stringify(responseMessage.error, undefined, 4)}`);
            }
            else {
                logger.error(`Received response message without id. No further error information provided.`);
            }
        }
        else {
            const key = String(responseMessage.id);
            const responsePromise = responsePromises[key];
            traceReceivedResponse(responseMessage, responsePromise);
            if (responsePromise) {
                delete responsePromises[key];
                try {
                    if (responseMessage.error) {
                        const error = responseMessage.error;
                        responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
                    }
                    else if (responseMessage.result !== undefined) {
                        responsePromise.resolve(responseMessage.result);
                    }
                    else {
                        throw new Error('Should never happen.');
                    }
                }
                catch (error) {
                    if (error.message) {
                        logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
                    }
                    else {
                        logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
                    }
                }
            }
        }
    }
    function handleNotification(message) {
        if (isDisposed()) {
            // See handle request.
            return;
        }
        let type = undefined;
        let notificationHandler;
        if (message.method === CancelNotification.type.method) {
            const cancelId = message.params.id;
            knownCanceledRequests.delete(cancelId);
            traceReceivedNotification(message);
            return;
        }
        else {
            const element = notificationHandlers[message.method];
            if (element) {
                notificationHandler = element.handler;
                type = element.type;
            }
        }
        if (notificationHandler || starNotificationHandler) {
            try {
                traceReceivedNotification(message);
                if (notificationHandler) {
                    if (message.params === undefined) {
                        if (type !== undefined) {
                            if (type.numberOfParams !== 0 && type.parameterStructures !== messages_1.ParameterStructures.byName) {
                                logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
                            }
                        }
                        notificationHandler();
                    }
                    else if (Array.isArray(message.params)) {
                        if (type !== undefined) {
                            if (type.parameterStructures === messages_1.ParameterStructures.byName) {
                                logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
                            }
                            if (type.numberOfParams !== message.params.length) {
                                logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${message.params.length} arguments`);
                            }
                        }
                        notificationHandler(...message.params);
                    }
                    else {
                        if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                            logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
                        }
                        notificationHandler(message.params);
                    }
                }
                else if (starNotificationHandler) {
                    starNotificationHandler(message.method, message.params);
                }
            }
            catch (error) {
                if (error.message) {
                    logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
                }
                else {
                    logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
                }
            }
        }
        else {
            unhandledNotificationEmitter.fire(message);
        }
    }
    function handleInvalidMessage(message) {
        if (!message) {
            logger.error('Received empty message.');
            return;
        }
        logger.error(`Received message which is neither a response nor a notification message:\n${JSON.stringify(message, null, 4)}`);
        // Test whether we find an id to reject the promise
        const responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
            const key = String(responseMessage.id);
            const responseHandler = responsePromises[key];
            if (responseHandler) {
                responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
            }
        }
    }
    function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose && message.params) {
                data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
            }
            tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
        }
        else {
            logLSPMessage('send-request', message);
        }
    }
    function traceSendingNotification(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose) {
                if (message.params) {
                    data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
                }
                else {
                    data = 'No parameters provided.\n\n';
                }
            }
            tracer.log(`Sending notification '${message.method}'.`, data);
        }
        else {
            logLSPMessage('send-notification', message);
        }
    }
    function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose) {
                if (message.error && message.error.data) {
                    data = `Error data: ${JSON.stringify(message.error.data, null, 4)}\n\n`;
                }
                else {
                    if (message.result) {
                        data = `Result: ${JSON.stringify(message.result, null, 4)}\n\n`;
                    }
                    else if (message.error === undefined) {
                        data = 'No result returned.\n\n';
                    }
                }
            }
            tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
        }
        else {
            logLSPMessage('send-response', message);
        }
    }
    function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose && message.params) {
                data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
            }
            tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
        }
        else {
            logLSPMessage('receive-request', message);
        }
    }
    function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose) {
                if (message.params) {
                    data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
                }
                else {
                    data = 'No parameters provided.\n\n';
                }
            }
            tracer.log(`Received notification '${message.method}'.`, data);
        }
        else {
            logLSPMessage('receive-notification', message);
        }
    }
    function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        if (traceFormat === TraceFormat.Text) {
            let data = undefined;
            if (trace === Trace.Verbose) {
                if (message.error && message.error.data) {
                    data = `Error data: ${JSON.stringify(message.error.data, null, 4)}\n\n`;
                }
                else {
                    if (message.result) {
                        data = `Result: ${JSON.stringify(message.result, null, 4)}\n\n`;
                    }
                    else if (message.error === undefined) {
                        data = 'No result returned.\n\n';
                    }
                }
            }
            if (responsePromise) {
                const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : '';
                tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
            }
            else {
                tracer.log(`Received response ${message.id} without active response promise.`, data);
            }
        }
        else {
            logLSPMessage('receive-response', message);
        }
    }
    function logLSPMessage(type, message) {
        if (!tracer || trace === Trace.Off) {
            return;
        }
        const lspMessage = {
            isLSPMessage: true,
            type,
            message,
            timestamp: Date.now()
        };
        tracer.log(lspMessage);
    }
    function throwIfClosedOrDisposed() {
        if (isClosed()) {
            throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
        }
        if (isDisposed()) {
            throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
        }
    }
    function throwIfListening() {
        if (isListening()) {
            throw new ConnectionError(ConnectionErrors.AlreadyListening, 'Connection is already listening');
        }
    }
    function throwIfNotListening() {
        if (!isListening()) {
            throw new Error('Call listen() first.');
        }
    }
    function undefinedToNull(param) {
        if (param === undefined) {
            return null;
        }
        else {
            return param;
        }
    }
    function nullToUndefined(param) {
        if (param === null) {
            return undefined;
        }
        else {
            return param;
        }
    }
    function isNamedParam(param) {
        return param !== undefined && param !== null && !Array.isArray(param) && typeof param === 'object';
    }
    function computeSingleParam(parameterStructures, param) {
        switch (parameterStructures) {
            case messages_1.ParameterStructures.auto:
                if (isNamedParam(param)) {
                    return nullToUndefined(param);
                }
                else {
                    return [undefinedToNull(param)];
                }
            case messages_1.ParameterStructures.byName:
                if (!isNamedParam(param)) {
                    throw new Error(`Received parameters by name but param is not an object literal.`);
                }
                return nullToUndefined(param);
            case messages_1.ParameterStructures.byPosition:
                return [undefinedToNull(param)];
            default:
                throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
        }
    }
    function computeMessageParams(type, params) {
        let result;
        const numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
            case 0:
                result = undefined;
                break;
            case 1:
                result = computeSingleParam(type.parameterStructures, params[0]);
                break;
            default:
                result = [];
                for (let i = 0; i < params.length && i < numberOfParams; i++) {
                    result.push(undefinedToNull(params[i]));
                }
                if (params.length < numberOfParams) {
                    for (let i = params.length; i < numberOfParams; i++) {
                        result.push(null);
                    }
                }
                break;
        }
        return result;
    }
    const connection = {
        sendNotification: (type, ...args) => {
            throwIfClosedOrDisposed();
            let method;
            let messageParams;
            if (Is.string(type)) {
                method = type;
                const first = args[0];
                let paramStart = 0;
                let parameterStructures = messages_1.ParameterStructures.auto;
                if (messages_1.ParameterStructures.is(first)) {
                    paramStart = 1;
                    parameterStructures = first;
                }
                let paramEnd = args.length;
                const numberOfParams = paramEnd - paramStart;
                switch (numberOfParams) {
                    case 0:
                        messageParams = undefined;
                        break;
                    case 1:
                        messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                        break;
                    default:
                        if (parameterStructures === messages_1.ParameterStructures.byName) {
                            throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
                        }
                        messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
                        break;
                }
            }
            else {
                const params = args;
                method = type.method;
                messageParams = computeMessageParams(type, params);
            }
            const notificationMessage = {
                jsonrpc: version,
                method: method,
                params: messageParams
            };
            traceSendingNotification(notificationMessage);
            messageWriter.write(notificationMessage);
        },
        onNotification: (type, handler) => {
            throwIfClosedOrDisposed();
            let method;
            if (Is.func(type)) {
                starNotificationHandler = type;
            }
            else if (handler) {
                if (Is.string(type)) {
                    method = type;
                    notificationHandlers[type] = { type: undefined, handler };
                }
                else {
                    method = type.method;
                    notificationHandlers[type.method] = { type, handler };
                }
            }
            return {
                dispose: () => {
                    if (method !== undefined) {
                        delete notificationHandlers[method];
                    }
                    else {
                        starNotificationHandler = undefined;
                    }
                }
            };
        },
        onProgress: (_type, token, handler) => {
            if (progressHandlers.has(token)) {
                throw new Error(`Progress handler for token ${token} already registered`);
            }
            progressHandlers.set(token, handler);
            return {
                dispose: () => {
                    progressHandlers.delete(token);
                }
            };
        },
        sendProgress: (_type, token, value) => {
            connection.sendNotification(ProgressNotification.type, { token, value });
        },
        onUnhandledProgress: unhandledProgressEmitter.event,
        sendRequest: (type, ...args) => {
            throwIfClosedOrDisposed();
            throwIfNotListening();
            let method;
            let messageParams;
            let token = undefined;
            if (Is.string(type)) {
                method = type;
                const first = args[0];
                const last = args[args.length - 1];
                let paramStart = 0;
                let parameterStructures = messages_1.ParameterStructures.auto;
                if (messages_1.ParameterStructures.is(first)) {
                    paramStart = 1;
                    parameterStructures = first;
                }
                let paramEnd = args.length;
                if (cancellation_1.CancellationToken.is(last)) {
                    paramEnd = paramEnd - 1;
                    token = last;
                }
                const numberOfParams = paramEnd - paramStart;
                switch (numberOfParams) {
                    case 0:
                        messageParams = undefined;
                        break;
                    case 1:
                        messageParams = computeSingleParam(parameterStructures, args[paramStart]);
                        break;
                    default:
                        if (parameterStructures === messages_1.ParameterStructures.byName) {
                            throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
                        }
                        messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
                        break;
                }
            }
            else {
                const params = args;
                method = type.method;
                messageParams = computeMessageParams(type, params);
                const numberOfParams = type.numberOfParams;
                token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
            }
            const id = sequenceNumber++;
            let disposable;
            if (token) {
                disposable = token.onCancellationRequested(() => {
                    cancellationStrategy.sender.sendCancellation(connection, id);
                });
            }
            const result = new Promise((resolve, reject) => {
                const requestMessage = {
                    jsonrpc: version,
                    id: id,
                    method: method,
                    params: messageParams
                };
                const resolveWithCleanup = (r) => {
                    resolve(r);
                    cancellationStrategy.sender.cleanup(id);
                    disposable === null || disposable === void 0 ? void 0 : disposable.dispose();
                };
                const rejectWithCleanup = (r) => {
                    reject(r);
                    cancellationStrategy.sender.cleanup(id);
                    disposable === null || disposable === void 0 ? void 0 : disposable.dispose();
                };
                let responsePromise = { method: method, timerStart: Date.now(), resolve: resolveWithCleanup, reject: rejectWithCleanup };
                traceSendingRequest(requestMessage);
                try {
                    messageWriter.write(requestMessage);
                }
                catch (e) {
                    // Writing the message failed. So we need to reject the promise.
                    responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, e.message ? e.message : 'Unknown reason'));
                    responsePromise = null;
                }
                if (responsePromise) {
                    responsePromises[String(id)] = responsePromise;
                }
            });
            return result;
        },
        onRequest: (type, handler) => {
            throwIfClosedOrDisposed();
            let method = null;
            if (StarRequestHandler.is(type)) {
                method = undefined;
                starRequestHandler = type;
            }
            else if (Is.string(type)) {
                method = null;
                if (handler !== undefined) {
                    method = type;
                    requestHandlers[type] = { handler: handler, type: undefined };
                }
            }
            else {
                if (handler !== undefined) {
                    method = type.method;
                    requestHandlers[type.method] = { type, handler };
                }
            }
            return {
                dispose: () => {
                    if (method === null) {
                        return;
                    }
                    if (method !== undefined) {
                        delete requestHandlers[method];
                    }
                    else {
                        starRequestHandler = undefined;
                    }
                }
            };
        },
        trace: (_value, _tracer, sendNotificationOrTraceOptions) => {
            let _sendNotification = false;
            let _traceFormat = TraceFormat.Text;
            if (sendNotificationOrTraceOptions !== undefined) {
                if (Is.boolean(sendNotificationOrTraceOptions)) {
                    _sendNotification = sendNotificationOrTraceOptions;
                }
                else {
                    _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
                    _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
                }
            }
            trace = _value;
            traceFormat = _traceFormat;
            if (trace === Trace.Off) {
                tracer = undefined;
            }
            else {
                tracer = _tracer;
            }
            if (_sendNotification && !isClosed() && !isDisposed()) {
                connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
            }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        end: () => {
            messageWriter.end();
        },
        dispose: () => {
            if (isDisposed()) {
                return;
            }
            state = ConnectionState.Disposed;
            disposeEmitter.fire(undefined);
            const error = new Error('Connection got disposed.');
            Object.keys(responsePromises).forEach((key) => {
                responsePromises[key].reject(error);
            });
            responsePromises = Object.create(null);
            requestTokens = Object.create(null);
            knownCanceledRequests = new Set();
            messageQueue = new linkedMap_1.LinkedMap();
            // Test for backwards compatibility
            if (Is.func(messageWriter.dispose)) {
                messageWriter.dispose();
            }
            if (Is.func(messageReader.dispose)) {
                messageReader.dispose();
            }
        },
        listen: () => {
            throwIfClosedOrDisposed();
            throwIfListening();
            state = ConnectionState.Listening;
            messageReader.listen(callback);
        },
        inspect: () => {
            // eslint-disable-next-line no-console
            ral_1.default().console.log('inspect');
        }
    };
    connection.onNotification(LogTraceNotification.type, (params) => {
        if (trace === Trace.Off || !tracer) {
            return;
        }
        tracer.log(params.message, trace === Trace.Verbose ? params.verbose : undefined);
    });
    connection.onNotification(ProgressNotification.type, (params) => {
        const handler = progressHandlers.get(params.token);
        if (handler) {
            handler(params.value);
        }
        else {
            unhandledProgressEmitter.fire(params);
        }
    });
    return connection;
}
exports.createMessageConnection = createMessageConnection;
//# sourceMappingURL=connection.js.map

/***/ }),
/* 65 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Proposed = exports.LSPErrorCodes = exports.createProtocolConnection = void 0;
__exportStar(__webpack_require__(50), exports);
__exportStar(__webpack_require__(66), exports);
__exportStar(__webpack_require__(67), exports);
__exportStar(__webpack_require__(68), exports);
var connection_1 = __webpack_require__(85);
Object.defineProperty(exports, "createProtocolConnection", ({ enumerable: true, get: function () { return connection_1.createProtocolConnection; } }));
var LSPErrorCodes;
(function (LSPErrorCodes) {
    /**
    * This is the start range of LSP reserved error codes.
    * It doesn't denote a real error code.
    *
    * @since 3.16.0
    */
    LSPErrorCodes.lspReservedErrorRangeStart = -32899;
    /**
     * The server cancelled the request. This error code should
     * only be used for requests that explicitly support being
     * server cancellable.
     *
     * @since 3.17.0
     */
    LSPErrorCodes.ServerCancelled = -32802;
    /**
     * The server detected that the content of a document got
     * modified outside normal conditions. A server should
     * NOT send this error code if it detects a content change
     * in it unprocessed messages. The result even computed
     * on an older state might still be useful for the client.
     *
     * If a client decides that a result is not of any use anymore
     * the client should cancel the request.
     */
    LSPErrorCodes.ContentModified = -32801;
    /**
     * The client has canceled a request and a server as detected
     * the cancel.
     */
    LSPErrorCodes.RequestCancelled = -32800;
    /**
    * This is the end range of LSP reserved error codes.
    * It doesn't denote a real error code.
    *
    * @since 3.16.0
    */
    LSPErrorCodes.lspReservedErrorRangeEnd = -32800;
})(LSPErrorCodes = exports.LSPErrorCodes || (exports.LSPErrorCodes = {}));
const diag = __webpack_require__(86);
var Proposed;
(function (Proposed) {
    Proposed.DiagnosticServerCancellationData = diag.DiagnosticServerCancellationData;
    Proposed.DocumentDiagnosticReportKind = diag.DocumentDiagnosticReportKind;
    Proposed.DocumentDiagnosticRequest = diag.DocumentDiagnosticRequest;
    Proposed.WorkspaceDiagnosticRequest = diag.WorkspaceDiagnosticRequest;
    Proposed.DiagnosticRefreshRequest = diag.DiagnosticRefreshRequest;
})(Proposed = exports.Proposed || (exports.Proposed = {}));
//# sourceMappingURL=api.js.map

/***/ }),
/* 66 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AnnotatedTextEdit": () => (/* binding */ AnnotatedTextEdit),
/* harmony export */   "ChangeAnnotation": () => (/* binding */ ChangeAnnotation),
/* harmony export */   "ChangeAnnotationIdentifier": () => (/* binding */ ChangeAnnotationIdentifier),
/* harmony export */   "CodeAction": () => (/* binding */ CodeAction),
/* harmony export */   "CodeActionContext": () => (/* binding */ CodeActionContext),
/* harmony export */   "CodeActionKind": () => (/* binding */ CodeActionKind),
/* harmony export */   "CodeDescription": () => (/* binding */ CodeDescription),
/* harmony export */   "CodeLens": () => (/* binding */ CodeLens),
/* harmony export */   "Color": () => (/* binding */ Color),
/* harmony export */   "ColorInformation": () => (/* binding */ ColorInformation),
/* harmony export */   "ColorPresentation": () => (/* binding */ ColorPresentation),
/* harmony export */   "Command": () => (/* binding */ Command),
/* harmony export */   "CompletionItem": () => (/* binding */ CompletionItem),
/* harmony export */   "CompletionItemKind": () => (/* binding */ CompletionItemKind),
/* harmony export */   "CompletionItemLabelDetails": () => (/* binding */ CompletionItemLabelDetails),
/* harmony export */   "CompletionItemTag": () => (/* binding */ CompletionItemTag),
/* harmony export */   "CompletionList": () => (/* binding */ CompletionList),
/* harmony export */   "CreateFile": () => (/* binding */ CreateFile),
/* harmony export */   "DeleteFile": () => (/* binding */ DeleteFile),
/* harmony export */   "Diagnostic": () => (/* binding */ Diagnostic),
/* harmony export */   "DiagnosticRelatedInformation": () => (/* binding */ DiagnosticRelatedInformation),
/* harmony export */   "DiagnosticSeverity": () => (/* binding */ DiagnosticSeverity),
/* harmony export */   "DiagnosticTag": () => (/* binding */ DiagnosticTag),
/* harmony export */   "DocumentHighlight": () => (/* binding */ DocumentHighlight),
/* harmony export */   "DocumentHighlightKind": () => (/* binding */ DocumentHighlightKind),
/* harmony export */   "DocumentLink": () => (/* binding */ DocumentLink),
/* harmony export */   "DocumentSymbol": () => (/* binding */ DocumentSymbol),
/* harmony export */   "EOL": () => (/* binding */ EOL),
/* harmony export */   "FoldingRange": () => (/* binding */ FoldingRange),
/* harmony export */   "FoldingRangeKind": () => (/* binding */ FoldingRangeKind),
/* harmony export */   "FormattingOptions": () => (/* binding */ FormattingOptions),
/* harmony export */   "Hover": () => (/* binding */ Hover),
/* harmony export */   "InsertReplaceEdit": () => (/* binding */ InsertReplaceEdit),
/* harmony export */   "InsertTextFormat": () => (/* binding */ InsertTextFormat),
/* harmony export */   "InsertTextMode": () => (/* binding */ InsertTextMode),
/* harmony export */   "Location": () => (/* binding */ Location),
/* harmony export */   "LocationLink": () => (/* binding */ LocationLink),
/* harmony export */   "MarkedString": () => (/* binding */ MarkedString),
/* harmony export */   "MarkupContent": () => (/* binding */ MarkupContent),
/* harmony export */   "MarkupKind": () => (/* binding */ MarkupKind),
/* harmony export */   "OptionalVersionedTextDocumentIdentifier": () => (/* binding */ OptionalVersionedTextDocumentIdentifier),
/* harmony export */   "ParameterInformation": () => (/* binding */ ParameterInformation),
/* harmony export */   "Position": () => (/* binding */ Position),
/* harmony export */   "Range": () => (/* binding */ Range),
/* harmony export */   "RenameFile": () => (/* binding */ RenameFile),
/* harmony export */   "SelectionRange": () => (/* binding */ SelectionRange),
/* harmony export */   "SemanticTokenModifiers": () => (/* binding */ SemanticTokenModifiers),
/* harmony export */   "SemanticTokenTypes": () => (/* binding */ SemanticTokenTypes),
/* harmony export */   "SemanticTokens": () => (/* binding */ SemanticTokens),
/* harmony export */   "SignatureInformation": () => (/* binding */ SignatureInformation),
/* harmony export */   "SymbolInformation": () => (/* binding */ SymbolInformation),
/* harmony export */   "SymbolKind": () => (/* binding */ SymbolKind),
/* harmony export */   "SymbolTag": () => (/* binding */ SymbolTag),
/* harmony export */   "TextDocument": () => (/* binding */ TextDocument),
/* harmony export */   "TextDocumentEdit": () => (/* binding */ TextDocumentEdit),
/* harmony export */   "TextDocumentIdentifier": () => (/* binding */ TextDocumentIdentifier),
/* harmony export */   "TextDocumentItem": () => (/* binding */ TextDocumentItem),
/* harmony export */   "TextEdit": () => (/* binding */ TextEdit),
/* harmony export */   "VersionedTextDocumentIdentifier": () => (/* binding */ VersionedTextDocumentIdentifier),
/* harmony export */   "WorkspaceChange": () => (/* binding */ WorkspaceChange),
/* harmony export */   "WorkspaceEdit": () => (/* binding */ WorkspaceEdit),
/* harmony export */   "integer": () => (/* binding */ integer),
/* harmony export */   "uinteger": () => (/* binding */ uinteger)
/* harmony export */ });
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

var integer;
(function (integer) {
    integer.MIN_VALUE = -2147483648;
    integer.MAX_VALUE = 2147483647;
})(integer || (integer = {}));
var uinteger;
(function (uinteger) {
    uinteger.MIN_VALUE = 0;
    uinteger.MAX_VALUE = 2147483647;
})(uinteger || (uinteger = {}));
/**
 * The Position namespace provides helper functions to work with
 * [Position](#Position) literals.
 */
var Position;
(function (Position) {
    /**
     * Creates a new Position literal from the given line and character.
     * @param line The position's line.
     * @param character The position's character.
     */
    function create(line, character) {
        if (line === Number.MAX_VALUE) {
            line = uinteger.MAX_VALUE;
        }
        if (character === Number.MAX_VALUE) {
            character = uinteger.MAX_VALUE;
        }
        return { line: line, character: character };
    }
    Position.create = create;
    /**
     * Checks whether the given literal conforms to the [Position](#Position) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
    }
    Position.is = is;
})(Position || (Position = {}));
/**
 * The Range namespace provides helper functions to work with
 * [Range](#Range) literals.
 */
var Range;
(function (Range) {
    function create(one, two, three, four) {
        if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
            return { start: Position.create(one, two), end: Position.create(three, four) };
        }
        else if (Position.is(one) && Position.is(two)) {
            return { start: one, end: two };
        }
        else {
            throw new Error("Range#create called with invalid arguments[" + one + ", " + two + ", " + three + ", " + four + "]");
        }
    }
    Range.create = create;
    /**
     * Checks whether the given literal conforms to the [Range](#Range) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
    }
    Range.is = is;
})(Range || (Range = {}));
/**
 * The Location namespace provides helper functions to work with
 * [Location](#Location) literals.
 */
var Location;
(function (Location) {
    /**
     * Creates a Location literal.
     * @param uri The location's uri.
     * @param range The location's range.
     */
    function create(uri, range) {
        return { uri: uri, range: range };
    }
    Location.create = create;
    /**
     * Checks whether the given literal conforms to the [Location](#Location) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
    }
    Location.is = is;
})(Location || (Location = {}));
/**
 * The LocationLink namespace provides helper functions to work with
 * [LocationLink](#LocationLink) literals.
 */
var LocationLink;
(function (LocationLink) {
    /**
     * Creates a LocationLink literal.
     * @param targetUri The definition's uri.
     * @param targetRange The full range of the definition.
     * @param targetSelectionRange The span of the symbol definition at the target.
     * @param originSelectionRange The span of the symbol being defined in the originating source file.
     */
    function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
        return { targetUri: targetUri, targetRange: targetRange, targetSelectionRange: targetSelectionRange, originSelectionRange: originSelectionRange };
    }
    LocationLink.create = create;
    /**
     * Checks whether the given literal conforms to the [LocationLink](#LocationLink) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri)
            && (Range.is(candidate.targetSelectionRange) || Is.undefined(candidate.targetSelectionRange))
            && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
    }
    LocationLink.is = is;
})(LocationLink || (LocationLink = {}));
/**
 * The Color namespace provides helper functions to work with
 * [Color](#Color) literals.
 */
var Color;
(function (Color) {
    /**
     * Creates a new Color literal.
     */
    function create(red, green, blue, alpha) {
        return {
            red: red,
            green: green,
            blue: blue,
            alpha: alpha,
        };
    }
    Color.create = create;
    /**
     * Checks whether the given literal conforms to the [Color](#Color) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.numberRange(candidate.red, 0, 1)
            && Is.numberRange(candidate.green, 0, 1)
            && Is.numberRange(candidate.blue, 0, 1)
            && Is.numberRange(candidate.alpha, 0, 1);
    }
    Color.is = is;
})(Color || (Color = {}));
/**
 * The ColorInformation namespace provides helper functions to work with
 * [ColorInformation](#ColorInformation) literals.
 */
var ColorInformation;
(function (ColorInformation) {
    /**
     * Creates a new ColorInformation literal.
     */
    function create(range, color) {
        return {
            range: range,
            color: color,
        };
    }
    ColorInformation.create = create;
    /**
     * Checks whether the given literal conforms to the [ColorInformation](#ColorInformation) interface.
     */
    function is(value) {
        var candidate = value;
        return Range.is(candidate.range) && Color.is(candidate.color);
    }
    ColorInformation.is = is;
})(ColorInformation || (ColorInformation = {}));
/**
 * The Color namespace provides helper functions to work with
 * [ColorPresentation](#ColorPresentation) literals.
 */
var ColorPresentation;
(function (ColorPresentation) {
    /**
     * Creates a new ColorInformation literal.
     */
    function create(label, textEdit, additionalTextEdits) {
        return {
            label: label,
            textEdit: textEdit,
            additionalTextEdits: additionalTextEdits,
        };
    }
    ColorPresentation.create = create;
    /**
     * Checks whether the given literal conforms to the [ColorInformation](#ColorInformation) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.string(candidate.label)
            && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate))
            && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
    }
    ColorPresentation.is = is;
})(ColorPresentation || (ColorPresentation = {}));
/**
 * Enum of known range kinds
 */
var FoldingRangeKind;
(function (FoldingRangeKind) {
    /**
     * Folding range for a comment
     */
    FoldingRangeKind["Comment"] = "comment";
    /**
     * Folding range for a imports or includes
     */
    FoldingRangeKind["Imports"] = "imports";
    /**
     * Folding range for a region (e.g. `#region`)
     */
    FoldingRangeKind["Region"] = "region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
/**
 * The folding range namespace provides helper functions to work with
 * [FoldingRange](#FoldingRange) literals.
 */
var FoldingRange;
(function (FoldingRange) {
    /**
     * Creates a new FoldingRange literal.
     */
    function create(startLine, endLine, startCharacter, endCharacter, kind) {
        var result = {
            startLine: startLine,
            endLine: endLine
        };
        if (Is.defined(startCharacter)) {
            result.startCharacter = startCharacter;
        }
        if (Is.defined(endCharacter)) {
            result.endCharacter = endCharacter;
        }
        if (Is.defined(kind)) {
            result.kind = kind;
        }
        return result;
    }
    FoldingRange.create = create;
    /**
     * Checks whether the given literal conforms to the [FoldingRange](#FoldingRange) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine)
            && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter))
            && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter))
            && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
    }
    FoldingRange.is = is;
})(FoldingRange || (FoldingRange = {}));
/**
 * The DiagnosticRelatedInformation namespace provides helper functions to work with
 * [DiagnosticRelatedInformation](#DiagnosticRelatedInformation) literals.
 */
var DiagnosticRelatedInformation;
(function (DiagnosticRelatedInformation) {
    /**
     * Creates a new DiagnosticRelatedInformation literal.
     */
    function create(location, message) {
        return {
            location: location,
            message: message
        };
    }
    DiagnosticRelatedInformation.create = create;
    /**
     * Checks whether the given literal conforms to the [DiagnosticRelatedInformation](#DiagnosticRelatedInformation) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
    }
    DiagnosticRelatedInformation.is = is;
})(DiagnosticRelatedInformation || (DiagnosticRelatedInformation = {}));
/**
 * The diagnostic's severity.
 */
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    /**
     * Reports an error.
     */
    DiagnosticSeverity.Error = 1;
    /**
     * Reports a warning.
     */
    DiagnosticSeverity.Warning = 2;
    /**
     * Reports an information.
     */
    DiagnosticSeverity.Information = 3;
    /**
     * Reports a hint.
     */
    DiagnosticSeverity.Hint = 4;
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
/**
 * The diagnostic tags.
 *
 * @since 3.15.0
 */
var DiagnosticTag;
(function (DiagnosticTag) {
    /**
     * Unused or unnecessary code.
     *
     * Clients are allowed to render diagnostics with this tag faded out instead of having
     * an error squiggle.
     */
    DiagnosticTag.Unnecessary = 1;
    /**
     * Deprecated or obsolete code.
     *
     * Clients are allowed to rendered diagnostics with this tag strike through.
     */
    DiagnosticTag.Deprecated = 2;
})(DiagnosticTag || (DiagnosticTag = {}));
/**
 * The CodeDescription namespace provides functions to deal with descriptions for diagnostic codes.
 *
 * @since 3.16.0
 */
var CodeDescription;
(function (CodeDescription) {
    function is(value) {
        var candidate = value;
        return candidate !== undefined && candidate !== null && Is.string(candidate.href);
    }
    CodeDescription.is = is;
})(CodeDescription || (CodeDescription = {}));
/**
 * The Diagnostic namespace provides helper functions to work with
 * [Diagnostic](#Diagnostic) literals.
 */
var Diagnostic;
(function (Diagnostic) {
    /**
     * Creates a new Diagnostic literal.
     */
    function create(range, message, severity, code, source, relatedInformation) {
        var result = { range: range, message: message };
        if (Is.defined(severity)) {
            result.severity = severity;
        }
        if (Is.defined(code)) {
            result.code = code;
        }
        if (Is.defined(source)) {
            result.source = source;
        }
        if (Is.defined(relatedInformation)) {
            result.relatedInformation = relatedInformation;
        }
        return result;
    }
    Diagnostic.create = create;
    /**
     * Checks whether the given literal conforms to the [Diagnostic](#Diagnostic) interface.
     */
    function is(value) {
        var _a;
        var candidate = value;
        return Is.defined(candidate)
            && Range.is(candidate.range)
            && Is.string(candidate.message)
            && (Is.number(candidate.severity) || Is.undefined(candidate.severity))
            && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code))
            && (Is.undefined(candidate.codeDescription) || (Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)))
            && (Is.string(candidate.source) || Is.undefined(candidate.source))
            && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
    }
    Diagnostic.is = is;
})(Diagnostic || (Diagnostic = {}));
/**
 * The Command namespace provides helper functions to work with
 * [Command](#Command) literals.
 */
var Command;
(function (Command) {
    /**
     * Creates a new Command literal.
     */
    function create(title, command) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var result = { title: title, command: command };
        if (Is.defined(args) && args.length > 0) {
            result.arguments = args;
        }
        return result;
    }
    Command.create = create;
    /**
     * Checks whether the given literal conforms to the [Command](#Command) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
    }
    Command.is = is;
})(Command || (Command = {}));
/**
 * The TextEdit namespace provides helper function to create replace,
 * insert and delete edits more easily.
 */
var TextEdit;
(function (TextEdit) {
    /**
     * Creates a replace text edit.
     * @param range The range of text to be replaced.
     * @param newText The new text.
     */
    function replace(range, newText) {
        return { range: range, newText: newText };
    }
    TextEdit.replace = replace;
    /**
     * Creates a insert text edit.
     * @param position The position to insert the text at.
     * @param newText The text to be inserted.
     */
    function insert(position, newText) {
        return { range: { start: position, end: position }, newText: newText };
    }
    TextEdit.insert = insert;
    /**
     * Creates a delete text edit.
     * @param range The range of text to be deleted.
     */
    function del(range) {
        return { range: range, newText: '' };
    }
    TextEdit.del = del;
    function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate)
            && Is.string(candidate.newText)
            && Range.is(candidate.range);
    }
    TextEdit.is = is;
})(TextEdit || (TextEdit = {}));
var ChangeAnnotation;
(function (ChangeAnnotation) {
    function create(label, needsConfirmation, description) {
        var result = { label: label };
        if (needsConfirmation !== undefined) {
            result.needsConfirmation = needsConfirmation;
        }
        if (description !== undefined) {
            result.description = description;
        }
        return result;
    }
    ChangeAnnotation.create = create;
    function is(value) {
        var candidate = value;
        return candidate !== undefined && Is.objectLiteral(candidate) && Is.string(candidate.label) &&
            (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === undefined) &&
            (Is.string(candidate.description) || candidate.description === undefined);
    }
    ChangeAnnotation.is = is;
})(ChangeAnnotation || (ChangeAnnotation = {}));
var ChangeAnnotationIdentifier;
(function (ChangeAnnotationIdentifier) {
    function is(value) {
        var candidate = value;
        return typeof candidate === 'string';
    }
    ChangeAnnotationIdentifier.is = is;
})(ChangeAnnotationIdentifier || (ChangeAnnotationIdentifier = {}));
var AnnotatedTextEdit;
(function (AnnotatedTextEdit) {
    /**
     * Creates an annotated replace text edit.
     *
     * @param range The range of text to be replaced.
     * @param newText The new text.
     * @param annotation The annotation.
     */
    function replace(range, newText, annotation) {
        return { range: range, newText: newText, annotationId: annotation };
    }
    AnnotatedTextEdit.replace = replace;
    /**
     * Creates an annotated insert text edit.
     *
     * @param position The position to insert the text at.
     * @param newText The text to be inserted.
     * @param annotation The annotation.
     */
    function insert(position, newText, annotation) {
        return { range: { start: position, end: position }, newText: newText, annotationId: annotation };
    }
    AnnotatedTextEdit.insert = insert;
    /**
     * Creates an annotated delete text edit.
     *
     * @param range The range of text to be deleted.
     * @param annotation The annotation.
     */
    function del(range, annotation) {
        return { range: range, newText: '', annotationId: annotation };
    }
    AnnotatedTextEdit.del = del;
    function is(value) {
        var candidate = value;
        return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
    }
    AnnotatedTextEdit.is = is;
})(AnnotatedTextEdit || (AnnotatedTextEdit = {}));
/**
 * The TextDocumentEdit namespace provides helper function to create
 * an edit that manipulates a text document.
 */
var TextDocumentEdit;
(function (TextDocumentEdit) {
    /**
     * Creates a new `TextDocumentEdit`
     */
    function create(textDocument, edits) {
        return { textDocument: textDocument, edits: edits };
    }
    TextDocumentEdit.create = create;
    function is(value) {
        var candidate = value;
        return Is.defined(candidate)
            && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument)
            && Array.isArray(candidate.edits);
    }
    TextDocumentEdit.is = is;
})(TextDocumentEdit || (TextDocumentEdit = {}));
var CreateFile;
(function (CreateFile) {
    function create(uri, options, annotation) {
        var result = {
            kind: 'create',
            uri: uri
        };
        if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
            result.options = options;
        }
        if (annotation !== undefined) {
            result.annotationId = annotation;
        }
        return result;
    }
    CreateFile.create = create;
    function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'create' && Is.string(candidate.uri) && (candidate.options === undefined ||
            ((candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists)))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
    }
    CreateFile.is = is;
})(CreateFile || (CreateFile = {}));
var RenameFile;
(function (RenameFile) {
    function create(oldUri, newUri, options, annotation) {
        var result = {
            kind: 'rename',
            oldUri: oldUri,
            newUri: newUri
        };
        if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
            result.options = options;
        }
        if (annotation !== undefined) {
            result.annotationId = annotation;
        }
        return result;
    }
    RenameFile.create = create;
    function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'rename' && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === undefined ||
            ((candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists)))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
    }
    RenameFile.is = is;
})(RenameFile || (RenameFile = {}));
var DeleteFile;
(function (DeleteFile) {
    function create(uri, options, annotation) {
        var result = {
            kind: 'delete',
            uri: uri
        };
        if (options !== undefined && (options.recursive !== undefined || options.ignoreIfNotExists !== undefined)) {
            result.options = options;
        }
        if (annotation !== undefined) {
            result.annotationId = annotation;
        }
        return result;
    }
    DeleteFile.create = create;
    function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'delete' && Is.string(candidate.uri) && (candidate.options === undefined ||
            ((candidate.options.recursive === undefined || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === undefined || Is.boolean(candidate.options.ignoreIfNotExists)))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
    }
    DeleteFile.is = is;
})(DeleteFile || (DeleteFile = {}));
var WorkspaceEdit;
(function (WorkspaceEdit) {
    function is(value) {
        var candidate = value;
        return candidate &&
            (candidate.changes !== undefined || candidate.documentChanges !== undefined) &&
            (candidate.documentChanges === undefined || candidate.documentChanges.every(function (change) {
                if (Is.string(change.kind)) {
                    return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
                }
                else {
                    return TextDocumentEdit.is(change);
                }
            }));
    }
    WorkspaceEdit.is = is;
})(WorkspaceEdit || (WorkspaceEdit = {}));
var TextEditChangeImpl = /** @class */ (function () {
    function TextEditChangeImpl(edits, changeAnnotations) {
        this.edits = edits;
        this.changeAnnotations = changeAnnotations;
    }
    TextEditChangeImpl.prototype.insert = function (position, newText, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
            edit = TextEdit.insert(position, newText);
        }
        else if (ChangeAnnotationIdentifier.is(annotation)) {
            id = annotation;
            edit = AnnotatedTextEdit.insert(position, newText, annotation);
        }
        else {
            this.assertChangeAnnotations(this.changeAnnotations);
            id = this.changeAnnotations.manage(annotation);
            edit = AnnotatedTextEdit.insert(position, newText, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
            return id;
        }
    };
    TextEditChangeImpl.prototype.replace = function (range, newText, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
            edit = TextEdit.replace(range, newText);
        }
        else if (ChangeAnnotationIdentifier.is(annotation)) {
            id = annotation;
            edit = AnnotatedTextEdit.replace(range, newText, annotation);
        }
        else {
            this.assertChangeAnnotations(this.changeAnnotations);
            id = this.changeAnnotations.manage(annotation);
            edit = AnnotatedTextEdit.replace(range, newText, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
            return id;
        }
    };
    TextEditChangeImpl.prototype.delete = function (range, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
            edit = TextEdit.del(range);
        }
        else if (ChangeAnnotationIdentifier.is(annotation)) {
            id = annotation;
            edit = AnnotatedTextEdit.del(range, annotation);
        }
        else {
            this.assertChangeAnnotations(this.changeAnnotations);
            id = this.changeAnnotations.manage(annotation);
            edit = AnnotatedTextEdit.del(range, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
            return id;
        }
    };
    TextEditChangeImpl.prototype.add = function (edit) {
        this.edits.push(edit);
    };
    TextEditChangeImpl.prototype.all = function () {
        return this.edits;
    };
    TextEditChangeImpl.prototype.clear = function () {
        this.edits.splice(0, this.edits.length);
    };
    TextEditChangeImpl.prototype.assertChangeAnnotations = function (value) {
        if (value === undefined) {
            throw new Error("Text edit change is not configured to manage change annotations.");
        }
    };
    return TextEditChangeImpl;
}());
/**
 * A helper class
 */
var ChangeAnnotations = /** @class */ (function () {
    function ChangeAnnotations(annotations) {
        this._annotations = annotations === undefined ? Object.create(null) : annotations;
        this._counter = 0;
        this._size = 0;
    }
    ChangeAnnotations.prototype.all = function () {
        return this._annotations;
    };
    Object.defineProperty(ChangeAnnotations.prototype, "size", {
        get: function () {
            return this._size;
        },
        enumerable: false,
        configurable: true
    });
    ChangeAnnotations.prototype.manage = function (idOrAnnotation, annotation) {
        var id;
        if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
            id = idOrAnnotation;
        }
        else {
            id = this.nextId();
            annotation = idOrAnnotation;
        }
        if (this._annotations[id] !== undefined) {
            throw new Error("Id " + id + " is already in use.");
        }
        if (annotation === undefined) {
            throw new Error("No annotation provided for id " + id);
        }
        this._annotations[id] = annotation;
        this._size++;
        return id;
    };
    ChangeAnnotations.prototype.nextId = function () {
        this._counter++;
        return this._counter.toString();
    };
    return ChangeAnnotations;
}());
/**
 * A workspace change helps constructing changes to a workspace.
 */
var WorkspaceChange = /** @class */ (function () {
    function WorkspaceChange(workspaceEdit) {
        var _this = this;
        this._textEditChanges = Object.create(null);
        if (workspaceEdit !== undefined) {
            this._workspaceEdit = workspaceEdit;
            if (workspaceEdit.documentChanges) {
                this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
                workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                workspaceEdit.documentChanges.forEach(function (change) {
                    if (TextDocumentEdit.is(change)) {
                        var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
                        _this._textEditChanges[change.textDocument.uri] = textEditChange;
                    }
                });
            }
            else if (workspaceEdit.changes) {
                Object.keys(workspaceEdit.changes).forEach(function (key) {
                    var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
                    _this._textEditChanges[key] = textEditChange;
                });
            }
        }
        else {
            this._workspaceEdit = {};
        }
    }
    Object.defineProperty(WorkspaceChange.prototype, "edit", {
        /**
         * Returns the underlying [WorkspaceEdit](#WorkspaceEdit) literal
         * use to be returned from a workspace edit operation like rename.
         */
        get: function () {
            this.initDocumentChanges();
            if (this._changeAnnotations !== undefined) {
                if (this._changeAnnotations.size === 0) {
                    this._workspaceEdit.changeAnnotations = undefined;
                }
                else {
                    this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                }
            }
            return this._workspaceEdit;
        },
        enumerable: false,
        configurable: true
    });
    WorkspaceChange.prototype.getTextEditChange = function (key) {
        if (OptionalVersionedTextDocumentIdentifier.is(key)) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === undefined) {
                throw new Error('Workspace edit is not configured for document changes.');
            }
            var textDocument = { uri: key.uri, version: key.version };
            var result = this._textEditChanges[textDocument.uri];
            if (!result) {
                var edits = [];
                var textDocumentEdit = {
                    textDocument: textDocument,
                    edits: edits
                };
                this._workspaceEdit.documentChanges.push(textDocumentEdit);
                result = new TextEditChangeImpl(edits, this._changeAnnotations);
                this._textEditChanges[textDocument.uri] = result;
            }
            return result;
        }
        else {
            this.initChanges();
            if (this._workspaceEdit.changes === undefined) {
                throw new Error('Workspace edit is not configured for normal text edit changes.');
            }
            var result = this._textEditChanges[key];
            if (!result) {
                var edits = [];
                this._workspaceEdit.changes[key] = edits;
                result = new TextEditChangeImpl(edits);
                this._textEditChanges[key] = result;
            }
            return result;
        }
    };
    WorkspaceChange.prototype.initDocumentChanges = function () {
        if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
            this._changeAnnotations = new ChangeAnnotations();
            this._workspaceEdit.documentChanges = [];
            this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
        }
    };
    WorkspaceChange.prototype.initChanges = function () {
        if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
            this._workspaceEdit.changes = Object.create(null);
        }
    };
    WorkspaceChange.prototype.createFile = function (uri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
            throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
            annotation = optionsOrAnnotation;
        }
        else {
            options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
            operation = CreateFile.create(uri, options);
        }
        else {
            id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
            operation = CreateFile.create(uri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
            return id;
        }
    };
    WorkspaceChange.prototype.renameFile = function (oldUri, newUri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
            throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
            annotation = optionsOrAnnotation;
        }
        else {
            options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
            operation = RenameFile.create(oldUri, newUri, options);
        }
        else {
            id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
            operation = RenameFile.create(oldUri, newUri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
            return id;
        }
    };
    WorkspaceChange.prototype.deleteFile = function (uri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
            throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
            annotation = optionsOrAnnotation;
        }
        else {
            options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
            operation = DeleteFile.create(uri, options);
        }
        else {
            id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
            operation = DeleteFile.create(uri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
            return id;
        }
    };
    return WorkspaceChange;
}());

/**
 * The TextDocumentIdentifier namespace provides helper functions to work with
 * [TextDocumentIdentifier](#TextDocumentIdentifier) literals.
 */
var TextDocumentIdentifier;
(function (TextDocumentIdentifier) {
    /**
     * Creates a new TextDocumentIdentifier literal.
     * @param uri The document's uri.
     */
    function create(uri) {
        return { uri: uri };
    }
    TextDocumentIdentifier.create = create;
    /**
     * Checks whether the given literal conforms to the [TextDocumentIdentifier](#TextDocumentIdentifier) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri);
    }
    TextDocumentIdentifier.is = is;
})(TextDocumentIdentifier || (TextDocumentIdentifier = {}));
/**
 * The VersionedTextDocumentIdentifier namespace provides helper functions to work with
 * [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) literals.
 */
var VersionedTextDocumentIdentifier;
(function (VersionedTextDocumentIdentifier) {
    /**
     * Creates a new VersionedTextDocumentIdentifier literal.
     * @param uri The document's uri.
     * @param uri The document's text.
     */
    function create(uri, version) {
        return { uri: uri, version: version };
    }
    VersionedTextDocumentIdentifier.create = create;
    /**
     * Checks whether the given literal conforms to the [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
    }
    VersionedTextDocumentIdentifier.is = is;
})(VersionedTextDocumentIdentifier || (VersionedTextDocumentIdentifier = {}));
/**
 * The OptionalVersionedTextDocumentIdentifier namespace provides helper functions to work with
 * [OptionalVersionedTextDocumentIdentifier](#OptionalVersionedTextDocumentIdentifier) literals.
 */
var OptionalVersionedTextDocumentIdentifier;
(function (OptionalVersionedTextDocumentIdentifier) {
    /**
     * Creates a new OptionalVersionedTextDocumentIdentifier literal.
     * @param uri The document's uri.
     * @param uri The document's text.
     */
    function create(uri, version) {
        return { uri: uri, version: version };
    }
    OptionalVersionedTextDocumentIdentifier.create = create;
    /**
     * Checks whether the given literal conforms to the [OptionalVersionedTextDocumentIdentifier](#OptionalVersionedTextDocumentIdentifier) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
    }
    OptionalVersionedTextDocumentIdentifier.is = is;
})(OptionalVersionedTextDocumentIdentifier || (OptionalVersionedTextDocumentIdentifier = {}));
/**
 * The TextDocumentItem namespace provides helper functions to work with
 * [TextDocumentItem](#TextDocumentItem) literals.
 */
var TextDocumentItem;
(function (TextDocumentItem) {
    /**
     * Creates a new TextDocumentItem literal.
     * @param uri The document's uri.
     * @param languageId The document's language identifier.
     * @param version The document's version number.
     * @param text The document's text.
     */
    function create(uri, languageId, version, text) {
        return { uri: uri, languageId: languageId, version: version, text: text };
    }
    TextDocumentItem.create = create;
    /**
     * Checks whether the given literal conforms to the [TextDocumentItem](#TextDocumentItem) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
    }
    TextDocumentItem.is = is;
})(TextDocumentItem || (TextDocumentItem = {}));
/**
 * Describes the content type that a client supports in various
 * result literals like `Hover`, `ParameterInfo` or `CompletionItem`.
 *
 * Please note that `MarkupKinds` must not start with a `$`. This kinds
 * are reserved for internal usage.
 */
var MarkupKind;
(function (MarkupKind) {
    /**
     * Plain text is supported as a content format
     */
    MarkupKind.PlainText = 'plaintext';
    /**
     * Markdown is supported as a content format
     */
    MarkupKind.Markdown = 'markdown';
})(MarkupKind || (MarkupKind = {}));
(function (MarkupKind) {
    /**
     * Checks whether the given value is a value of the [MarkupKind](#MarkupKind) type.
     */
    function is(value) {
        var candidate = value;
        return candidate === MarkupKind.PlainText || candidate === MarkupKind.Markdown;
    }
    MarkupKind.is = is;
})(MarkupKind || (MarkupKind = {}));
var MarkupContent;
(function (MarkupContent) {
    /**
     * Checks whether the given value conforms to the [MarkupContent](#MarkupContent) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
    }
    MarkupContent.is = is;
})(MarkupContent || (MarkupContent = {}));
/**
 * The kind of a completion entry.
 */
var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind.Text = 1;
    CompletionItemKind.Method = 2;
    CompletionItemKind.Function = 3;
    CompletionItemKind.Constructor = 4;
    CompletionItemKind.Field = 5;
    CompletionItemKind.Variable = 6;
    CompletionItemKind.Class = 7;
    CompletionItemKind.Interface = 8;
    CompletionItemKind.Module = 9;
    CompletionItemKind.Property = 10;
    CompletionItemKind.Unit = 11;
    CompletionItemKind.Value = 12;
    CompletionItemKind.Enum = 13;
    CompletionItemKind.Keyword = 14;
    CompletionItemKind.Snippet = 15;
    CompletionItemKind.Color = 16;
    CompletionItemKind.File = 17;
    CompletionItemKind.Reference = 18;
    CompletionItemKind.Folder = 19;
    CompletionItemKind.EnumMember = 20;
    CompletionItemKind.Constant = 21;
    CompletionItemKind.Struct = 22;
    CompletionItemKind.Event = 23;
    CompletionItemKind.Operator = 24;
    CompletionItemKind.TypeParameter = 25;
})(CompletionItemKind || (CompletionItemKind = {}));
/**
 * Defines whether the insert text in a completion item should be interpreted as
 * plain text or a snippet.
 */
var InsertTextFormat;
(function (InsertTextFormat) {
    /**
     * The primary text to be inserted is treated as a plain string.
     */
    InsertTextFormat.PlainText = 1;
    /**
     * The primary text to be inserted is treated as a snippet.
     *
     * A snippet can define tab stops and placeholders with `$1`, `$2`
     * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
     * the end of the snippet. Placeholders with equal identifiers are linked,
     * that is typing in one will update others too.
     *
     * See also: https://microsoft.github.io/language-server-protocol/specifications/specification-current/#snippet_syntax
     */
    InsertTextFormat.Snippet = 2;
})(InsertTextFormat || (InsertTextFormat = {}));
/**
 * Completion item tags are extra annotations that tweak the rendering of a completion
 * item.
 *
 * @since 3.15.0
 */
var CompletionItemTag;
(function (CompletionItemTag) {
    /**
     * Render a completion as obsolete, usually using a strike-out.
     */
    CompletionItemTag.Deprecated = 1;
})(CompletionItemTag || (CompletionItemTag = {}));
/**
 * The InsertReplaceEdit namespace provides functions to deal with insert / replace edits.
 *
 * @since 3.16.0
 */
var InsertReplaceEdit;
(function (InsertReplaceEdit) {
    /**
     * Creates a new insert / replace edit
     */
    function create(newText, insert, replace) {
        return { newText: newText, insert: insert, replace: replace };
    }
    InsertReplaceEdit.create = create;
    /**
     * Checks whether the given literal conforms to the [InsertReplaceEdit](#InsertReplaceEdit) interface.
     */
    function is(value) {
        var candidate = value;
        return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
    }
    InsertReplaceEdit.is = is;
})(InsertReplaceEdit || (InsertReplaceEdit = {}));
/**
 * How whitespace and indentation is handled during completion
 * item insertion.
 *
 * @since 3.16.0
 */
var InsertTextMode;
(function (InsertTextMode) {
    /**
     * The insertion or replace strings is taken as it is. If the
     * value is multi line the lines below the cursor will be
     * inserted using the indentation defined in the string value.
     * The client will not apply any kind of adjustments to the
     * string.
     */
    InsertTextMode.asIs = 1;
    /**
     * The editor adjusts leading whitespace of new lines so that
     * they match the indentation up to the cursor of the line for
     * which the item is accepted.
     *
     * Consider a line like this: <2tabs><cursor><3tabs>foo. Accepting a
     * multi line completion item is indented using 2 tabs and all
     * following lines inserted will be indented using 2 tabs as well.
     */
    InsertTextMode.adjustIndentation = 2;
})(InsertTextMode || (InsertTextMode = {}));
var CompletionItemLabelDetails;
(function (CompletionItemLabelDetails) {
    function is(value) {
        var candidate = value;
        return candidate && (Is.string(candidate.parameters) || candidate.parameters === undefined) &&
            (Is.string(candidate.qualifier) || candidate.qualifier === undefined) && (Is.string(candidate.type) || candidate.type === undefined);
    }
    CompletionItemLabelDetails.is = is;
})(CompletionItemLabelDetails || (CompletionItemLabelDetails = {}));
/**
 * The CompletionItem namespace provides functions to deal with
 * completion items.
 */
var CompletionItem;
(function (CompletionItem) {
    /**
     * Create a completion item and seed it with a label.
     * @param label The completion item's label
     */
    function create(label) {
        return { label: label };
    }
    CompletionItem.create = create;
})(CompletionItem || (CompletionItem = {}));
/**
 * The CompletionList namespace provides functions to deal with
 * completion lists.
 */
var CompletionList;
(function (CompletionList) {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    function create(items, isIncomplete) {
        return { items: items ? items : [], isIncomplete: !!isIncomplete };
    }
    CompletionList.create = create;
})(CompletionList || (CompletionList = {}));
var MarkedString;
(function (MarkedString) {
    /**
     * Creates a marked string from plain text.
     *
     * @param plainText The plain text.
     */
    function fromPlainText(plainText) {
        return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&'); // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    }
    MarkedString.fromPlainText = fromPlainText;
    /**
     * Checks whether the given value conforms to the [MarkedString](#MarkedString) type.
     */
    function is(value) {
        var candidate = value;
        return Is.string(candidate) || (Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value));
    }
    MarkedString.is = is;
})(MarkedString || (MarkedString = {}));
var Hover;
(function (Hover) {
    /**
     * Checks whether the given value conforms to the [Hover](#Hover) interface.
     */
    function is(value) {
        var candidate = value;
        return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) ||
            MarkedString.is(candidate.contents) ||
            Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === undefined || Range.is(value.range));
    }
    Hover.is = is;
})(Hover || (Hover = {}));
/**
 * The ParameterInformation namespace provides helper functions to work with
 * [ParameterInformation](#ParameterInformation) literals.
 */
var ParameterInformation;
(function (ParameterInformation) {
    /**
     * Creates a new parameter information literal.
     *
     * @param label A label string.
     * @param documentation A doc string.
     */
    function create(label, documentation) {
        return documentation ? { label: label, documentation: documentation } : { label: label };
    }
    ParameterInformation.create = create;
})(ParameterInformation || (ParameterInformation = {}));
/**
 * The SignatureInformation namespace provides helper functions to work with
 * [SignatureInformation](#SignatureInformation) literals.
 */
var SignatureInformation;
(function (SignatureInformation) {
    function create(label, documentation) {
        var parameters = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            parameters[_i - 2] = arguments[_i];
        }
        var result = { label: label };
        if (Is.defined(documentation)) {
            result.documentation = documentation;
        }
        if (Is.defined(parameters)) {
            result.parameters = parameters;
        }
        else {
            result.parameters = [];
        }
        return result;
    }
    SignatureInformation.create = create;
})(SignatureInformation || (SignatureInformation = {}));
/**
 * A document highlight kind.
 */
var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    /**
     * A textual occurrence.
     */
    DocumentHighlightKind.Text = 1;
    /**
     * Read-access of a symbol, like reading a variable.
     */
    DocumentHighlightKind.Read = 2;
    /**
     * Write-access of a symbol, like writing to a variable.
     */
    DocumentHighlightKind.Write = 3;
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
/**
 * DocumentHighlight namespace to provide helper functions to work with
 * [DocumentHighlight](#DocumentHighlight) literals.
 */
var DocumentHighlight;
(function (DocumentHighlight) {
    /**
     * Create a DocumentHighlight object.
     * @param range The range the highlight applies to.
     */
    function create(range, kind) {
        var result = { range: range };
        if (Is.number(kind)) {
            result.kind = kind;
        }
        return result;
    }
    DocumentHighlight.create = create;
})(DocumentHighlight || (DocumentHighlight = {}));
/**
 * A symbol kind.
 */
var SymbolKind;
(function (SymbolKind) {
    SymbolKind.File = 1;
    SymbolKind.Module = 2;
    SymbolKind.Namespace = 3;
    SymbolKind.Package = 4;
    SymbolKind.Class = 5;
    SymbolKind.Method = 6;
    SymbolKind.Property = 7;
    SymbolKind.Field = 8;
    SymbolKind.Constructor = 9;
    SymbolKind.Enum = 10;
    SymbolKind.Interface = 11;
    SymbolKind.Function = 12;
    SymbolKind.Variable = 13;
    SymbolKind.Constant = 14;
    SymbolKind.String = 15;
    SymbolKind.Number = 16;
    SymbolKind.Boolean = 17;
    SymbolKind.Array = 18;
    SymbolKind.Object = 19;
    SymbolKind.Key = 20;
    SymbolKind.Null = 21;
    SymbolKind.EnumMember = 22;
    SymbolKind.Struct = 23;
    SymbolKind.Event = 24;
    SymbolKind.Operator = 25;
    SymbolKind.TypeParameter = 26;
})(SymbolKind || (SymbolKind = {}));
/**
 * Symbol tags are extra annotations that tweak the rendering of a symbol.
 * @since 3.16
 */
var SymbolTag;
(function (SymbolTag) {
    /**
     * Render a symbol as obsolete, usually using a strike-out.
     */
    SymbolTag.Deprecated = 1;
})(SymbolTag || (SymbolTag = {}));
var SymbolInformation;
(function (SymbolInformation) {
    /**
     * Creates a new symbol information literal.
     *
     * @param name The name of the symbol.
     * @param kind The kind of the symbol.
     * @param range The range of the location of the symbol.
     * @param uri The resource of the location of symbol, defaults to the current document.
     * @param containerName The name of the symbol containing the symbol.
     */
    function create(name, kind, range, uri, containerName) {
        var result = {
            name: name,
            kind: kind,
            location: { uri: uri, range: range }
        };
        if (containerName) {
            result.containerName = containerName;
        }
        return result;
    }
    SymbolInformation.create = create;
})(SymbolInformation || (SymbolInformation = {}));
var DocumentSymbol;
(function (DocumentSymbol) {
    /**
     * Creates a new symbol information literal.
     *
     * @param name The name of the symbol.
     * @param detail The detail of the symbol.
     * @param kind The kind of the symbol.
     * @param range The range of the symbol.
     * @param selectionRange The selectionRange of the symbol.
     * @param children Children of the symbol.
     */
    function create(name, detail, kind, range, selectionRange, children) {
        var result = {
            name: name,
            detail: detail,
            kind: kind,
            range: range,
            selectionRange: selectionRange
        };
        if (children !== undefined) {
            result.children = children;
        }
        return result;
    }
    DocumentSymbol.create = create;
    /**
     * Checks whether the given literal conforms to the [DocumentSymbol](#DocumentSymbol) interface.
     */
    function is(value) {
        var candidate = value;
        return candidate &&
            Is.string(candidate.name) && Is.number(candidate.kind) &&
            Range.is(candidate.range) && Range.is(candidate.selectionRange) &&
            (candidate.detail === undefined || Is.string(candidate.detail)) &&
            (candidate.deprecated === undefined || Is.boolean(candidate.deprecated)) &&
            (candidate.children === undefined || Array.isArray(candidate.children)) &&
            (candidate.tags === undefined || Array.isArray(candidate.tags));
    }
    DocumentSymbol.is = is;
})(DocumentSymbol || (DocumentSymbol = {}));
/**
 * A set of predefined code action kinds
 */
var CodeActionKind;
(function (CodeActionKind) {
    /**
     * Empty kind.
     */
    CodeActionKind.Empty = '';
    /**
     * Base kind for quickfix actions: 'quickfix'
     */
    CodeActionKind.QuickFix = 'quickfix';
    /**
     * Base kind for refactoring actions: 'refactor'
     */
    CodeActionKind.Refactor = 'refactor';
    /**
     * Base kind for refactoring extraction actions: 'refactor.extract'
     *
     * Example extract actions:
     *
     * - Extract method
     * - Extract function
     * - Extract variable
     * - Extract interface from class
     * - ...
     */
    CodeActionKind.RefactorExtract = 'refactor.extract';
    /**
     * Base kind for refactoring inline actions: 'refactor.inline'
     *
     * Example inline actions:
     *
     * - Inline function
     * - Inline variable
     * - Inline constant
     * - ...
     */
    CodeActionKind.RefactorInline = 'refactor.inline';
    /**
     * Base kind for refactoring rewrite actions: 'refactor.rewrite'
     *
     * Example rewrite actions:
     *
     * - Convert JavaScript function to class
     * - Add or remove parameter
     * - Encapsulate field
     * - Make method static
     * - Move method to base class
     * - ...
     */
    CodeActionKind.RefactorRewrite = 'refactor.rewrite';
    /**
     * Base kind for source actions: `source`
     *
     * Source code actions apply to the entire file.
     */
    CodeActionKind.Source = 'source';
    /**
     * Base kind for an organize imports source action: `source.organizeImports`
     */
    CodeActionKind.SourceOrganizeImports = 'source.organizeImports';
    /**
     * Base kind for auto-fix source actions: `source.fixAll`.
     *
     * Fix all actions automatically fix errors that have a clear fix that do not require user input.
     * They should not suppress errors or perform unsafe fixes such as generating new types or classes.
     *
     * @since 3.15.0
     */
    CodeActionKind.SourceFixAll = 'source.fixAll';
})(CodeActionKind || (CodeActionKind = {}));
/**
 * The CodeActionContext namespace provides helper functions to work with
 * [CodeActionContext](#CodeActionContext) literals.
 */
var CodeActionContext;
(function (CodeActionContext) {
    /**
     * Creates a new CodeActionContext literal.
     */
    function create(diagnostics, only) {
        var result = { diagnostics: diagnostics };
        if (only !== undefined && only !== null) {
            result.only = only;
        }
        return result;
    }
    CodeActionContext.create = create;
    /**
     * Checks whether the given literal conforms to the [CodeActionContext](#CodeActionContext) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === undefined || Is.typedArray(candidate.only, Is.string));
    }
    CodeActionContext.is = is;
})(CodeActionContext || (CodeActionContext = {}));
var CodeAction;
(function (CodeAction) {
    function create(title, kindOrCommandOrEdit, kind) {
        var result = { title: title };
        var checkKind = true;
        if (typeof kindOrCommandOrEdit === 'string') {
            checkKind = false;
            result.kind = kindOrCommandOrEdit;
        }
        else if (Command.is(kindOrCommandOrEdit)) {
            result.command = kindOrCommandOrEdit;
        }
        else {
            result.edit = kindOrCommandOrEdit;
        }
        if (checkKind && kind !== undefined) {
            result.kind = kind;
        }
        return result;
    }
    CodeAction.create = create;
    function is(value) {
        var candidate = value;
        return candidate && Is.string(candidate.title) &&
            (candidate.diagnostics === undefined || Is.typedArray(candidate.diagnostics, Diagnostic.is)) &&
            (candidate.kind === undefined || Is.string(candidate.kind)) &&
            (candidate.edit !== undefined || candidate.command !== undefined) &&
            (candidate.command === undefined || Command.is(candidate.command)) &&
            (candidate.isPreferred === undefined || Is.boolean(candidate.isPreferred)) &&
            (candidate.edit === undefined || WorkspaceEdit.is(candidate.edit));
    }
    CodeAction.is = is;
})(CodeAction || (CodeAction = {}));
/**
 * The CodeLens namespace provides helper functions to work with
 * [CodeLens](#CodeLens) literals.
 */
var CodeLens;
(function (CodeLens) {
    /**
     * Creates a new CodeLens literal.
     */
    function create(range, data) {
        var result = { range: range };
        if (Is.defined(data)) {
            result.data = data;
        }
        return result;
    }
    CodeLens.create = create;
    /**
     * Checks whether the given literal conforms to the [CodeLens](#CodeLens) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
    }
    CodeLens.is = is;
})(CodeLens || (CodeLens = {}));
/**
 * The FormattingOptions namespace provides helper functions to work with
 * [FormattingOptions](#FormattingOptions) literals.
 */
var FormattingOptions;
(function (FormattingOptions) {
    /**
     * Creates a new FormattingOptions literal.
     */
    function create(tabSize, insertSpaces) {
        return { tabSize: tabSize, insertSpaces: insertSpaces };
    }
    FormattingOptions.create = create;
    /**
     * Checks whether the given literal conforms to the [FormattingOptions](#FormattingOptions) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
    }
    FormattingOptions.is = is;
})(FormattingOptions || (FormattingOptions = {}));
/**
 * The DocumentLink namespace provides helper functions to work with
 * [DocumentLink](#DocumentLink) literals.
 */
var DocumentLink;
(function (DocumentLink) {
    /**
     * Creates a new DocumentLink literal.
     */
    function create(range, target, data) {
        return { range: range, target: target, data: data };
    }
    DocumentLink.create = create;
    /**
     * Checks whether the given literal conforms to the [DocumentLink](#DocumentLink) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
    }
    DocumentLink.is = is;
})(DocumentLink || (DocumentLink = {}));
/**
 * The SelectionRange namespace provides helper function to work with
 * SelectionRange literals.
 */
var SelectionRange;
(function (SelectionRange) {
    /**
     * Creates a new SelectionRange
     * @param range the range.
     * @param parent an optional parent.
     */
    function create(range, parent) {
        return { range: range, parent: parent };
    }
    SelectionRange.create = create;
    function is(value) {
        var candidate = value;
        return candidate !== undefined && Range.is(candidate.range) && (candidate.parent === undefined || SelectionRange.is(candidate.parent));
    }
    SelectionRange.is = is;
})(SelectionRange || (SelectionRange = {}));
/**
 * A set of predefined token types. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0
 */
var SemanticTokenTypes;
(function (SemanticTokenTypes) {
    SemanticTokenTypes["namespace"] = "namespace";
    /**
     * Represents a generic type. Acts as a fallback for types which can't be mapped to
     * a specific type like class or enum.
     */
    SemanticTokenTypes["type"] = "type";
    SemanticTokenTypes["class"] = "class";
    SemanticTokenTypes["enum"] = "enum";
    SemanticTokenTypes["interface"] = "interface";
    SemanticTokenTypes["struct"] = "struct";
    SemanticTokenTypes["typeParameter"] = "typeParameter";
    SemanticTokenTypes["parameter"] = "parameter";
    SemanticTokenTypes["variable"] = "variable";
    SemanticTokenTypes["property"] = "property";
    SemanticTokenTypes["enumMember"] = "enumMember";
    SemanticTokenTypes["event"] = "event";
    SemanticTokenTypes["function"] = "function";
    SemanticTokenTypes["method"] = "method";
    SemanticTokenTypes["macro"] = "macro";
    SemanticTokenTypes["keyword"] = "keyword";
    SemanticTokenTypes["modifier"] = "modifier";
    SemanticTokenTypes["comment"] = "comment";
    SemanticTokenTypes["string"] = "string";
    SemanticTokenTypes["number"] = "number";
    SemanticTokenTypes["regexp"] = "regexp";
    SemanticTokenTypes["operator"] = "operator";
})(SemanticTokenTypes || (SemanticTokenTypes = {}));
/**
 * A set of predefined token modifiers. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0
 */
var SemanticTokenModifiers;
(function (SemanticTokenModifiers) {
    SemanticTokenModifiers["declaration"] = "declaration";
    SemanticTokenModifiers["definition"] = "definition";
    SemanticTokenModifiers["readonly"] = "readonly";
    SemanticTokenModifiers["static"] = "static";
    SemanticTokenModifiers["deprecated"] = "deprecated";
    SemanticTokenModifiers["abstract"] = "abstract";
    SemanticTokenModifiers["async"] = "async";
    SemanticTokenModifiers["modification"] = "modification";
    SemanticTokenModifiers["documentation"] = "documentation";
    SemanticTokenModifiers["defaultLibrary"] = "defaultLibrary";
})(SemanticTokenModifiers || (SemanticTokenModifiers = {}));
/**
 * @since 3.16.0
 */
var SemanticTokens;
(function (SemanticTokens) {
    function is(value) {
        var candidate = value;
        return candidate !== undefined && (candidate.resultId === undefined || typeof candidate.resultId === 'string') &&
            Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === 'number');
    }
    SemanticTokens.is = is;
})(SemanticTokens || (SemanticTokens = {}));
var EOL = ['\n', '\r\n', '\r'];
/**
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
var TextDocument;
(function (TextDocument) {
    /**
     * Creates a new ITextDocument literal from the given uri and content.
     * @param uri The document's uri.
     * @param languageId  The document's language Id.
     * @param content The document's content.
     */
    function create(uri, languageId, version, content) {
        return new FullTextDocument(uri, languageId, version, content);
    }
    TextDocument.create = create;
    /**
     * Checks whether the given literal conforms to the [ITextDocument](#ITextDocument) interface.
     */
    function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount)
            && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
    }
    TextDocument.is = is;
    function applyEdits(document, edits) {
        var text = document.getText();
        var sortedEdits = mergeSort(edits, function (a, b) {
            var diff = a.range.start.line - b.range.start.line;
            if (diff === 0) {
                return a.range.start.character - b.range.start.character;
            }
            return diff;
        });
        var lastModifiedOffset = text.length;
        for (var i = sortedEdits.length - 1; i >= 0; i--) {
            var e = sortedEdits[i];
            var startOffset = document.offsetAt(e.range.start);
            var endOffset = document.offsetAt(e.range.end);
            if (endOffset <= lastModifiedOffset) {
                text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
            }
            else {
                throw new Error('Overlapping edit');
            }
            lastModifiedOffset = startOffset;
        }
        return text;
    }
    TextDocument.applyEdits = applyEdits;
    function mergeSort(data, compare) {
        if (data.length <= 1) {
            // sorted
            return data;
        }
        var p = (data.length / 2) | 0;
        var left = data.slice(0, p);
        var right = data.slice(p);
        mergeSort(left, compare);
        mergeSort(right, compare);
        var leftIdx = 0;
        var rightIdx = 0;
        var i = 0;
        while (leftIdx < left.length && rightIdx < right.length) {
            var ret = compare(left[leftIdx], right[rightIdx]);
            if (ret <= 0) {
                // smaller_equal -> take left to preserve order
                data[i++] = left[leftIdx++];
            }
            else {
                // greater -> take right
                data[i++] = right[rightIdx++];
            }
        }
        while (leftIdx < left.length) {
            data[i++] = left[leftIdx++];
        }
        while (rightIdx < right.length) {
            data[i++] = right[rightIdx++];
        }
        return data;
    }
})(TextDocument || (TextDocument = {}));
/**
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
var FullTextDocument = /** @class */ (function () {
    function FullTextDocument(uri, languageId, version, content) {
        this._uri = uri;
        this._languageId = languageId;
        this._version = version;
        this._content = content;
        this._lineOffsets = undefined;
    }
    Object.defineProperty(FullTextDocument.prototype, "uri", {
        get: function () {
            return this._uri;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FullTextDocument.prototype, "languageId", {
        get: function () {
            return this._languageId;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FullTextDocument.prototype, "version", {
        get: function () {
            return this._version;
        },
        enumerable: false,
        configurable: true
    });
    FullTextDocument.prototype.getText = function (range) {
        if (range) {
            var start = this.offsetAt(range.start);
            var end = this.offsetAt(range.end);
            return this._content.substring(start, end);
        }
        return this._content;
    };
    FullTextDocument.prototype.update = function (event, version) {
        this._content = event.text;
        this._version = version;
        this._lineOffsets = undefined;
    };
    FullTextDocument.prototype.getLineOffsets = function () {
        if (this._lineOffsets === undefined) {
            var lineOffsets = [];
            var text = this._content;
            var isLineStart = true;
            for (var i = 0; i < text.length; i++) {
                if (isLineStart) {
                    lineOffsets.push(i);
                    isLineStart = false;
                }
                var ch = text.charAt(i);
                isLineStart = (ch === '\r' || ch === '\n');
                if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
                    i++;
                }
            }
            if (isLineStart && text.length > 0) {
                lineOffsets.push(text.length);
            }
            this._lineOffsets = lineOffsets;
        }
        return this._lineOffsets;
    };
    FullTextDocument.prototype.positionAt = function (offset) {
        offset = Math.max(Math.min(offset, this._content.length), 0);
        var lineOffsets = this.getLineOffsets();
        var low = 0, high = lineOffsets.length;
        if (high === 0) {
            return Position.create(0, offset);
        }
        while (low < high) {
            var mid = Math.floor((low + high) / 2);
            if (lineOffsets[mid] > offset) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        var line = low - 1;
        return Position.create(line, offset - lineOffsets[line]);
    };
    FullTextDocument.prototype.offsetAt = function (position) {
        var lineOffsets = this.getLineOffsets();
        if (position.line >= lineOffsets.length) {
            return this._content.length;
        }
        else if (position.line < 0) {
            return 0;
        }
        var lineOffset = lineOffsets[position.line];
        var nextLineOffset = (position.line + 1 < lineOffsets.length) ? lineOffsets[position.line + 1] : this._content.length;
        return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
    };
    Object.defineProperty(FullTextDocument.prototype, "lineCount", {
        get: function () {
            return this.getLineOffsets().length;
        },
        enumerable: false,
        configurable: true
    });
    return FullTextDocument;
}());
var Is;
(function (Is) {
    var toString = Object.prototype.toString;
    function defined(value) {
        return typeof value !== 'undefined';
    }
    Is.defined = defined;
    function undefined(value) {
        return typeof value === 'undefined';
    }
    Is.undefined = undefined;
    function boolean(value) {
        return value === true || value === false;
    }
    Is.boolean = boolean;
    function string(value) {
        return toString.call(value) === '[object String]';
    }
    Is.string = string;
    function number(value) {
        return toString.call(value) === '[object Number]';
    }
    Is.number = number;
    function numberRange(value, min, max) {
        return toString.call(value) === '[object Number]' && min <= value && value <= max;
    }
    Is.numberRange = numberRange;
    function integer(value) {
        return toString.call(value) === '[object Number]' && -2147483648 <= value && value <= 2147483647;
    }
    Is.integer = integer;
    function uinteger(value) {
        return toString.call(value) === '[object Number]' && 0 <= value && value <= 2147483647;
    }
    Is.uinteger = uinteger;
    function func(value) {
        return toString.call(value) === '[object Function]';
    }
    Is.func = func;
    function objectLiteral(value) {
        // Strictly speaking class instances pass this check as well. Since the LSP
        // doesn't use classes we ignore this for now. If we do we need to add something
        // like this: `Object.getPrototypeOf(Object.getPrototypeOf(x)) === null`
        return value !== null && typeof value === 'object';
    }
    Is.objectLiteral = objectLiteral;
    function typedArray(value, check) {
        return Array.isArray(value) && value.every(check);
    }
    Is.typedArray = typedArray;
})(Is || (Is = {}));


/***/ }),
/* 67 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProtocolNotificationType = exports.ProtocolNotificationType0 = exports.ProtocolRequestType = exports.ProtocolRequestType0 = exports.RegistrationType = void 0;
const vscode_jsonrpc_1 = __webpack_require__(50);
class RegistrationType {
    constructor(method) {
        this.method = method;
    }
}
exports.RegistrationType = RegistrationType;
class ProtocolRequestType0 extends vscode_jsonrpc_1.RequestType0 {
    constructor(method) {
        super(method);
    }
}
exports.ProtocolRequestType0 = ProtocolRequestType0;
class ProtocolRequestType extends vscode_jsonrpc_1.RequestType {
    constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
    }
}
exports.ProtocolRequestType = ProtocolRequestType;
class ProtocolNotificationType0 extends vscode_jsonrpc_1.NotificationType0 {
    constructor(method) {
        super(method);
    }
}
exports.ProtocolNotificationType0 = ProtocolNotificationType0;
class ProtocolNotificationType extends vscode_jsonrpc_1.NotificationType {
    constructor(method) {
        super(method, vscode_jsonrpc_1.ParameterStructures.byName);
    }
}
exports.ProtocolNotificationType = ProtocolNotificationType;
// let x: ProtocolNotificationType<number, { value: number}>;
// let y: ProtocolNotificationType<string, { value: number}>;
// x = y;
//# sourceMappingURL=messages.js.map

/***/ }),
/* 68 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DocumentLinkRequest = exports.CodeLensRefreshRequest = exports.CodeLensResolveRequest = exports.CodeLensRequest = exports.WorkspaceSymbolRequest = exports.CodeActionResolveRequest = exports.CodeActionRequest = exports.DocumentSymbolRequest = exports.DocumentHighlightRequest = exports.ReferencesRequest = exports.DefinitionRequest = exports.SignatureHelpRequest = exports.SignatureHelpTriggerKind = exports.HoverRequest = exports.CompletionResolveRequest = exports.CompletionRequest = exports.CompletionTriggerKind = exports.PublishDiagnosticsNotification = exports.WatchKind = exports.FileChangeType = exports.DidChangeWatchedFilesNotification = exports.WillSaveTextDocumentWaitUntilRequest = exports.WillSaveTextDocumentNotification = exports.TextDocumentSaveReason = exports.DidSaveTextDocumentNotification = exports.DidCloseTextDocumentNotification = exports.DidChangeTextDocumentNotification = exports.TextDocumentContentChangeEvent = exports.DidOpenTextDocumentNotification = exports.TextDocumentSyncKind = exports.TelemetryEventNotification = exports.LogMessageNotification = exports.ShowMessageRequest = exports.ShowMessageNotification = exports.MessageType = exports.DidChangeConfigurationNotification = exports.ExitNotification = exports.ShutdownRequest = exports.InitializedNotification = exports.InitializeError = exports.InitializeRequest = exports.WorkDoneProgressOptions = exports.TextDocumentRegistrationOptions = exports.StaticRegistrationOptions = exports.FailureHandlingKind = exports.ResourceOperationKind = exports.UnregistrationRequest = exports.RegistrationRequest = exports.DocumentSelector = exports.DocumentFilter = void 0;
exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = exports.WillDeleteFilesRequest = exports.DidDeleteFilesNotification = exports.WillRenameFilesRequest = exports.DidRenameFilesNotification = exports.WillCreateFilesRequest = exports.DidCreateFilesNotification = exports.FileOperationPatternKind = exports.LinkedEditingRangeRequest = exports.ShowDocumentRequest = exports.SemanticTokensRegistrationType = exports.SemanticTokensRefreshRequest = exports.SemanticTokensRangeRequest = exports.SemanticTokensDeltaRequest = exports.SemanticTokensRequest = exports.TokenFormat = exports.CallHierarchyPrepareRequest = exports.CallHierarchyOutgoingCallsRequest = exports.CallHierarchyIncomingCallsRequest = exports.WorkDoneProgressCancelNotification = exports.WorkDoneProgressCreateRequest = exports.WorkDoneProgress = exports.SelectionRangeRequest = exports.DeclarationRequest = exports.FoldingRangeRequest = exports.ColorPresentationRequest = exports.DocumentColorRequest = exports.ConfigurationRequest = exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = exports.TypeDefinitionRequest = exports.ImplementationRequest = exports.ApplyWorkspaceEditRequest = exports.ExecuteCommandRequest = exports.PrepareRenameRequest = exports.RenameRequest = exports.PrepareSupportDefaultBehavior = exports.DocumentOnTypeFormattingRequest = exports.DocumentRangeFormattingRequest = exports.DocumentFormattingRequest = exports.DocumentLinkResolveRequest = void 0;
const messages_1 = __webpack_require__(67);
const Is = __webpack_require__(69);
const protocol_implementation_1 = __webpack_require__(70);
Object.defineProperty(exports, "ImplementationRequest", ({ enumerable: true, get: function () { return protocol_implementation_1.ImplementationRequest; } }));
const protocol_typeDefinition_1 = __webpack_require__(71);
Object.defineProperty(exports, "TypeDefinitionRequest", ({ enumerable: true, get: function () { return protocol_typeDefinition_1.TypeDefinitionRequest; } }));
const protocol_workspaceFolders_1 = __webpack_require__(72);
Object.defineProperty(exports, "WorkspaceFoldersRequest", ({ enumerable: true, get: function () { return protocol_workspaceFolders_1.WorkspaceFoldersRequest; } }));
Object.defineProperty(exports, "DidChangeWorkspaceFoldersNotification", ({ enumerable: true, get: function () { return protocol_workspaceFolders_1.DidChangeWorkspaceFoldersNotification; } }));
const protocol_configuration_1 = __webpack_require__(73);
Object.defineProperty(exports, "ConfigurationRequest", ({ enumerable: true, get: function () { return protocol_configuration_1.ConfigurationRequest; } }));
const protocol_colorProvider_1 = __webpack_require__(74);
Object.defineProperty(exports, "DocumentColorRequest", ({ enumerable: true, get: function () { return protocol_colorProvider_1.DocumentColorRequest; } }));
Object.defineProperty(exports, "ColorPresentationRequest", ({ enumerable: true, get: function () { return protocol_colorProvider_1.ColorPresentationRequest; } }));
const protocol_foldingRange_1 = __webpack_require__(75);
Object.defineProperty(exports, "FoldingRangeRequest", ({ enumerable: true, get: function () { return protocol_foldingRange_1.FoldingRangeRequest; } }));
const protocol_declaration_1 = __webpack_require__(76);
Object.defineProperty(exports, "DeclarationRequest", ({ enumerable: true, get: function () { return protocol_declaration_1.DeclarationRequest; } }));
const protocol_selectionRange_1 = __webpack_require__(77);
Object.defineProperty(exports, "SelectionRangeRequest", ({ enumerable: true, get: function () { return protocol_selectionRange_1.SelectionRangeRequest; } }));
const protocol_progress_1 = __webpack_require__(78);
Object.defineProperty(exports, "WorkDoneProgress", ({ enumerable: true, get: function () { return protocol_progress_1.WorkDoneProgress; } }));
Object.defineProperty(exports, "WorkDoneProgressCreateRequest", ({ enumerable: true, get: function () { return protocol_progress_1.WorkDoneProgressCreateRequest; } }));
Object.defineProperty(exports, "WorkDoneProgressCancelNotification", ({ enumerable: true, get: function () { return protocol_progress_1.WorkDoneProgressCancelNotification; } }));
const protocol_callHierarchy_1 = __webpack_require__(79);
Object.defineProperty(exports, "CallHierarchyIncomingCallsRequest", ({ enumerable: true, get: function () { return protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest; } }));
Object.defineProperty(exports, "CallHierarchyOutgoingCallsRequest", ({ enumerable: true, get: function () { return protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest; } }));
Object.defineProperty(exports, "CallHierarchyPrepareRequest", ({ enumerable: true, get: function () { return protocol_callHierarchy_1.CallHierarchyPrepareRequest; } }));
const protocol_semanticTokens_1 = __webpack_require__(80);
Object.defineProperty(exports, "TokenFormat", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.TokenFormat; } }));
Object.defineProperty(exports, "SemanticTokensRequest", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.SemanticTokensRequest; } }));
Object.defineProperty(exports, "SemanticTokensDeltaRequest", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.SemanticTokensDeltaRequest; } }));
Object.defineProperty(exports, "SemanticTokensRangeRequest", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.SemanticTokensRangeRequest; } }));
Object.defineProperty(exports, "SemanticTokensRefreshRequest", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.SemanticTokensRefreshRequest; } }));
Object.defineProperty(exports, "SemanticTokensRegistrationType", ({ enumerable: true, get: function () { return protocol_semanticTokens_1.SemanticTokensRegistrationType; } }));
const protocol_showDocument_1 = __webpack_require__(81);
Object.defineProperty(exports, "ShowDocumentRequest", ({ enumerable: true, get: function () { return protocol_showDocument_1.ShowDocumentRequest; } }));
const protocol_linkedEditingRange_1 = __webpack_require__(82);
Object.defineProperty(exports, "LinkedEditingRangeRequest", ({ enumerable: true, get: function () { return protocol_linkedEditingRange_1.LinkedEditingRangeRequest; } }));
const protocol_fileOperations_1 = __webpack_require__(83);
Object.defineProperty(exports, "FileOperationPatternKind", ({ enumerable: true, get: function () { return protocol_fileOperations_1.FileOperationPatternKind; } }));
Object.defineProperty(exports, "DidCreateFilesNotification", ({ enumerable: true, get: function () { return protocol_fileOperations_1.DidCreateFilesNotification; } }));
Object.defineProperty(exports, "WillCreateFilesRequest", ({ enumerable: true, get: function () { return protocol_fileOperations_1.WillCreateFilesRequest; } }));
Object.defineProperty(exports, "DidRenameFilesNotification", ({ enumerable: true, get: function () { return protocol_fileOperations_1.DidRenameFilesNotification; } }));
Object.defineProperty(exports, "WillRenameFilesRequest", ({ enumerable: true, get: function () { return protocol_fileOperations_1.WillRenameFilesRequest; } }));
Object.defineProperty(exports, "DidDeleteFilesNotification", ({ enumerable: true, get: function () { return protocol_fileOperations_1.DidDeleteFilesNotification; } }));
Object.defineProperty(exports, "WillDeleteFilesRequest", ({ enumerable: true, get: function () { return protocol_fileOperations_1.WillDeleteFilesRequest; } }));
const protocol_moniker_1 = __webpack_require__(84);
Object.defineProperty(exports, "UniquenessLevel", ({ enumerable: true, get: function () { return protocol_moniker_1.UniquenessLevel; } }));
Object.defineProperty(exports, "MonikerKind", ({ enumerable: true, get: function () { return protocol_moniker_1.MonikerKind; } }));
Object.defineProperty(exports, "MonikerRequest", ({ enumerable: true, get: function () { return protocol_moniker_1.MonikerRequest; } }));
// @ts-ignore: to avoid inlining LocationLink as dynamic import
let __noDynamicImport;
/**
 * The DocumentFilter namespace provides helper functions to work with
 * [DocumentFilter](#DocumentFilter) literals.
 */
var DocumentFilter;
(function (DocumentFilter) {
    function is(value) {
        const candidate = value;
        return Is.string(candidate.language) || Is.string(candidate.scheme) || Is.string(candidate.pattern);
    }
    DocumentFilter.is = is;
})(DocumentFilter = exports.DocumentFilter || (exports.DocumentFilter = {}));
/**
 * The DocumentSelector namespace provides helper functions to work with
 * [DocumentSelector](#DocumentSelector)s.
 */
var DocumentSelector;
(function (DocumentSelector) {
    function is(value) {
        if (!Array.isArray(value)) {
            return false;
        }
        for (let elem of value) {
            if (!Is.string(elem) && !DocumentFilter.is(elem)) {
                return false;
            }
        }
        return true;
    }
    DocumentSelector.is = is;
})(DocumentSelector = exports.DocumentSelector || (exports.DocumentSelector = {}));
/**
 * The `client/registerCapability` request is sent from the server to the client to register a new capability
 * handler on the client side.
 */
var RegistrationRequest;
(function (RegistrationRequest) {
    RegistrationRequest.type = new messages_1.ProtocolRequestType('client/registerCapability');
})(RegistrationRequest = exports.RegistrationRequest || (exports.RegistrationRequest = {}));
/**
 * The `client/unregisterCapability` request is sent from the server to the client to unregister a previously registered capability
 * handler on the client side.
 */
var UnregistrationRequest;
(function (UnregistrationRequest) {
    UnregistrationRequest.type = new messages_1.ProtocolRequestType('client/unregisterCapability');
})(UnregistrationRequest = exports.UnregistrationRequest || (exports.UnregistrationRequest = {}));
var ResourceOperationKind;
(function (ResourceOperationKind) {
    /**
     * Supports creating new files and folders.
     */
    ResourceOperationKind.Create = 'create';
    /**
     * Supports renaming existing files and folders.
     */
    ResourceOperationKind.Rename = 'rename';
    /**
     * Supports deleting existing files and folders.
     */
    ResourceOperationKind.Delete = 'delete';
})(ResourceOperationKind = exports.ResourceOperationKind || (exports.ResourceOperationKind = {}));
var FailureHandlingKind;
(function (FailureHandlingKind) {
    /**
     * Applying the workspace change is simply aborted if one of the changes provided
     * fails. All operations executed before the failing operation stay executed.
     */
    FailureHandlingKind.Abort = 'abort';
    /**
     * All operations are executed transactional. That means they either all
     * succeed or no changes at all are applied to the workspace.
     */
    FailureHandlingKind.Transactional = 'transactional';
    /**
     * If the workspace edit contains only textual file changes they are executed transactional.
     * If resource changes (create, rename or delete file) are part of the change the failure
     * handling strategy is abort.
     */
    FailureHandlingKind.TextOnlyTransactional = 'textOnlyTransactional';
    /**
     * The client tries to undo the operations already executed. But there is no
     * guarantee that this is succeeding.
     */
    FailureHandlingKind.Undo = 'undo';
})(FailureHandlingKind = exports.FailureHandlingKind || (exports.FailureHandlingKind = {}));
/**
 * The StaticRegistrationOptions namespace provides helper functions to work with
 * [StaticRegistrationOptions](#StaticRegistrationOptions) literals.
 */
var StaticRegistrationOptions;
(function (StaticRegistrationOptions) {
    function hasId(value) {
        const candidate = value;
        return candidate && Is.string(candidate.id) && candidate.id.length > 0;
    }
    StaticRegistrationOptions.hasId = hasId;
})(StaticRegistrationOptions = exports.StaticRegistrationOptions || (exports.StaticRegistrationOptions = {}));
/**
 * The TextDocumentRegistrationOptions namespace provides helper functions to work with
 * [TextDocumentRegistrationOptions](#TextDocumentRegistrationOptions) literals.
 */
var TextDocumentRegistrationOptions;
(function (TextDocumentRegistrationOptions) {
    function is(value) {
        const candidate = value;
        return candidate && (candidate.documentSelector === null || DocumentSelector.is(candidate.documentSelector));
    }
    TextDocumentRegistrationOptions.is = is;
})(TextDocumentRegistrationOptions = exports.TextDocumentRegistrationOptions || (exports.TextDocumentRegistrationOptions = {}));
/**
 * The WorkDoneProgressOptions namespace provides helper functions to work with
 * [WorkDoneProgressOptions](#WorkDoneProgressOptions) literals.
 */
var WorkDoneProgressOptions;
(function (WorkDoneProgressOptions) {
    function is(value) {
        const candidate = value;
        return Is.objectLiteral(candidate) && (candidate.workDoneProgress === undefined || Is.boolean(candidate.workDoneProgress));
    }
    WorkDoneProgressOptions.is = is;
    function hasWorkDoneProgress(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.workDoneProgress);
    }
    WorkDoneProgressOptions.hasWorkDoneProgress = hasWorkDoneProgress;
})(WorkDoneProgressOptions = exports.WorkDoneProgressOptions || (exports.WorkDoneProgressOptions = {}));
/**
 * The initialize request is sent from the client to the server.
 * It is sent once as the request after starting up the server.
 * The requests parameter is of type [InitializeParams](#InitializeParams)
 * the response if of type [InitializeResult](#InitializeResult) of a Thenable that
 * resolves to such.
 */
var InitializeRequest;
(function (InitializeRequest) {
    InitializeRequest.type = new messages_1.ProtocolRequestType('initialize');
})(InitializeRequest = exports.InitializeRequest || (exports.InitializeRequest = {}));
/**
 * Known error codes for an `InitializeError`;
 */
var InitializeError;
(function (InitializeError) {
    /**
     * If the protocol version provided by the client can't be handled by the server.
     * @deprecated This initialize error got replaced by client capabilities. There is
     * no version handshake in version 3.0x
     */
    InitializeError.unknownProtocolVersion = 1;
})(InitializeError = exports.InitializeError || (exports.InitializeError = {}));
/**
 * The initialized notification is sent from the client to the
 * server after the client is fully initialized and the server
 * is allowed to send requests from the server to the client.
 */
var InitializedNotification;
(function (InitializedNotification) {
    InitializedNotification.type = new messages_1.ProtocolNotificationType('initialized');
})(InitializedNotification = exports.InitializedNotification || (exports.InitializedNotification = {}));
//---- Shutdown Method ----
/**
 * A shutdown request is sent from the client to the server.
 * It is sent once when the client decides to shutdown the
 * server. The only notification that is sent after a shutdown request
 * is the exit event.
 */
var ShutdownRequest;
(function (ShutdownRequest) {
    ShutdownRequest.type = new messages_1.ProtocolRequestType0('shutdown');
})(ShutdownRequest = exports.ShutdownRequest || (exports.ShutdownRequest = {}));
//---- Exit Notification ----
/**
 * The exit event is sent from the client to the server to
 * ask the server to exit its process.
 */
var ExitNotification;
(function (ExitNotification) {
    ExitNotification.type = new messages_1.ProtocolNotificationType0('exit');
})(ExitNotification = exports.ExitNotification || (exports.ExitNotification = {}));
/**
 * The configuration change notification is sent from the client to the server
 * when the client's configuration has changed. The notification contains
 * the changed configuration as defined by the language client.
 */
var DidChangeConfigurationNotification;
(function (DidChangeConfigurationNotification) {
    DidChangeConfigurationNotification.type = new messages_1.ProtocolNotificationType('workspace/didChangeConfiguration');
})(DidChangeConfigurationNotification = exports.DidChangeConfigurationNotification || (exports.DidChangeConfigurationNotification = {}));
//---- Message show and log notifications ----
/**
 * The message type
 */
var MessageType;
(function (MessageType) {
    /**
     * An error message.
     */
    MessageType.Error = 1;
    /**
     * A warning message.
     */
    MessageType.Warning = 2;
    /**
     * An information message.
     */
    MessageType.Info = 3;
    /**
     * A log message.
     */
    MessageType.Log = 4;
})(MessageType = exports.MessageType || (exports.MessageType = {}));
/**
 * The show message notification is sent from a server to a client to ask
 * the client to display a particular message in the user interface.
 */
var ShowMessageNotification;
(function (ShowMessageNotification) {
    ShowMessageNotification.type = new messages_1.ProtocolNotificationType('window/showMessage');
})(ShowMessageNotification = exports.ShowMessageNotification || (exports.ShowMessageNotification = {}));
/**
 * The show message request is sent from the server to the client to show a message
 * and a set of options actions to the user.
 */
var ShowMessageRequest;
(function (ShowMessageRequest) {
    ShowMessageRequest.type = new messages_1.ProtocolRequestType('window/showMessageRequest');
})(ShowMessageRequest = exports.ShowMessageRequest || (exports.ShowMessageRequest = {}));
/**
 * The log message notification is sent from the server to the client to ask
 * the client to log a particular message.
 */
var LogMessageNotification;
(function (LogMessageNotification) {
    LogMessageNotification.type = new messages_1.ProtocolNotificationType('window/logMessage');
})(LogMessageNotification = exports.LogMessageNotification || (exports.LogMessageNotification = {}));
//---- Telemetry notification
/**
 * The telemetry event notification is sent from the server to the client to ask
 * the client to log telemetry data.
 */
var TelemetryEventNotification;
(function (TelemetryEventNotification) {
    TelemetryEventNotification.type = new messages_1.ProtocolNotificationType('telemetry/event');
})(TelemetryEventNotification = exports.TelemetryEventNotification || (exports.TelemetryEventNotification = {}));
/**
 * Defines how the host (editor) should sync
 * document changes to the language server.
 */
var TextDocumentSyncKind;
(function (TextDocumentSyncKind) {
    /**
     * Documents should not be synced at all.
     */
    TextDocumentSyncKind.None = 0;
    /**
     * Documents are synced by always sending the full content
     * of the document.
     */
    TextDocumentSyncKind.Full = 1;
    /**
     * Documents are synced by sending the full content on open.
     * After that only incremental updates to the document are
     * send.
     */
    TextDocumentSyncKind.Incremental = 2;
})(TextDocumentSyncKind = exports.TextDocumentSyncKind || (exports.TextDocumentSyncKind = {}));
/**
 * The document open notification is sent from the client to the server to signal
 * newly opened text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri. Open in this sense means it is managed by the client. It doesn't necessarily
 * mean that its content is presented in an editor. An open notification must not
 * be sent more than once without a corresponding close notification send before.
 * This means open and close notification must be balanced and the max open count
 * is one.
 */
var DidOpenTextDocumentNotification;
(function (DidOpenTextDocumentNotification) {
    DidOpenTextDocumentNotification.method = 'textDocument/didOpen';
    DidOpenTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidOpenTextDocumentNotification.method);
})(DidOpenTextDocumentNotification = exports.DidOpenTextDocumentNotification || (exports.DidOpenTextDocumentNotification = {}));
var TextDocumentContentChangeEvent;
(function (TextDocumentContentChangeEvent) {
    /**
     * Checks whether the information describes a delta event.
     */
    function isIncremental(event) {
        let candidate = event;
        return candidate !== undefined && candidate !== null &&
            typeof candidate.text === 'string' && candidate.range !== undefined &&
            (candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number');
    }
    TextDocumentContentChangeEvent.isIncremental = isIncremental;
    /**
     * Checks whether the information describes a full replacement event.
     */
    function isFull(event) {
        let candidate = event;
        return candidate !== undefined && candidate !== null &&
            typeof candidate.text === 'string' && candidate.range === undefined && candidate.rangeLength === undefined;
    }
    TextDocumentContentChangeEvent.isFull = isFull;
})(TextDocumentContentChangeEvent = exports.TextDocumentContentChangeEvent || (exports.TextDocumentContentChangeEvent = {}));
/**
 * The document change notification is sent from the client to the server to signal
 * changes to a text document.
 */
var DidChangeTextDocumentNotification;
(function (DidChangeTextDocumentNotification) {
    DidChangeTextDocumentNotification.method = 'textDocument/didChange';
    DidChangeTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidChangeTextDocumentNotification.method);
})(DidChangeTextDocumentNotification = exports.DidChangeTextDocumentNotification || (exports.DidChangeTextDocumentNotification = {}));
/**
 * The document close notification is sent from the client to the server when
 * the document got closed in the client. The document's truth now exists where
 * the document's uri points to (e.g. if the document's uri is a file uri the
 * truth now exists on disk). As with the open notification the close notification
 * is about managing the document's content. Receiving a close notification
 * doesn't mean that the document was open in an editor before. A close
 * notification requires a previous open notification to be sent.
 */
var DidCloseTextDocumentNotification;
(function (DidCloseTextDocumentNotification) {
    DidCloseTextDocumentNotification.method = 'textDocument/didClose';
    DidCloseTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidCloseTextDocumentNotification.method);
})(DidCloseTextDocumentNotification = exports.DidCloseTextDocumentNotification || (exports.DidCloseTextDocumentNotification = {}));
/**
 * The document save notification is sent from the client to the server when
 * the document got saved in the client.
 */
var DidSaveTextDocumentNotification;
(function (DidSaveTextDocumentNotification) {
    DidSaveTextDocumentNotification.method = 'textDocument/didSave';
    DidSaveTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidSaveTextDocumentNotification.method);
})(DidSaveTextDocumentNotification = exports.DidSaveTextDocumentNotification || (exports.DidSaveTextDocumentNotification = {}));
/**
 * Represents reasons why a text document is saved.
 */
var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    /**
     * Manually triggered, e.g. by the user pressing save, by starting debugging,
     * or by an API call.
     */
    TextDocumentSaveReason.Manual = 1;
    /**
     * Automatic after a delay.
     */
    TextDocumentSaveReason.AfterDelay = 2;
    /**
     * When the editor lost focus.
     */
    TextDocumentSaveReason.FocusOut = 3;
})(TextDocumentSaveReason = exports.TextDocumentSaveReason || (exports.TextDocumentSaveReason = {}));
/**
 * A document will save notification is sent from the client to the server before
 * the document is actually saved.
 */
var WillSaveTextDocumentNotification;
(function (WillSaveTextDocumentNotification) {
    WillSaveTextDocumentNotification.method = 'textDocument/willSave';
    WillSaveTextDocumentNotification.type = new messages_1.ProtocolNotificationType(WillSaveTextDocumentNotification.method);
})(WillSaveTextDocumentNotification = exports.WillSaveTextDocumentNotification || (exports.WillSaveTextDocumentNotification = {}));
/**
 * A document will save request is sent from the client to the server before
 * the document is actually saved. The request can return an array of TextEdits
 * which will be applied to the text document before it is saved. Please note that
 * clients might drop results if computing the text edits took too long or if a
 * server constantly fails on this request. This is done to keep the save fast and
 * reliable.
 */
var WillSaveTextDocumentWaitUntilRequest;
(function (WillSaveTextDocumentWaitUntilRequest) {
    WillSaveTextDocumentWaitUntilRequest.method = 'textDocument/willSaveWaitUntil';
    WillSaveTextDocumentWaitUntilRequest.type = new messages_1.ProtocolRequestType(WillSaveTextDocumentWaitUntilRequest.method);
})(WillSaveTextDocumentWaitUntilRequest = exports.WillSaveTextDocumentWaitUntilRequest || (exports.WillSaveTextDocumentWaitUntilRequest = {}));
/**
 * The watched files notification is sent from the client to the server when
 * the client detects changes to file watched by the language client.
 */
var DidChangeWatchedFilesNotification;
(function (DidChangeWatchedFilesNotification) {
    DidChangeWatchedFilesNotification.type = new messages_1.ProtocolNotificationType('workspace/didChangeWatchedFiles');
})(DidChangeWatchedFilesNotification = exports.DidChangeWatchedFilesNotification || (exports.DidChangeWatchedFilesNotification = {}));
/**
 * The file event type
 */
var FileChangeType;
(function (FileChangeType) {
    /**
     * The file got created.
     */
    FileChangeType.Created = 1;
    /**
     * The file got changed.
     */
    FileChangeType.Changed = 2;
    /**
     * The file got deleted.
     */
    FileChangeType.Deleted = 3;
})(FileChangeType = exports.FileChangeType || (exports.FileChangeType = {}));
var WatchKind;
(function (WatchKind) {
    /**
     * Interested in create events.
     */
    WatchKind.Create = 1;
    /**
     * Interested in change events
     */
    WatchKind.Change = 2;
    /**
     * Interested in delete events
     */
    WatchKind.Delete = 4;
})(WatchKind = exports.WatchKind || (exports.WatchKind = {}));
/**
 * Diagnostics notification are sent from the server to the client to signal
 * results of validation runs.
 */
var PublishDiagnosticsNotification;
(function (PublishDiagnosticsNotification) {
    PublishDiagnosticsNotification.type = new messages_1.ProtocolNotificationType('textDocument/publishDiagnostics');
})(PublishDiagnosticsNotification = exports.PublishDiagnosticsNotification || (exports.PublishDiagnosticsNotification = {}));
/**
 * How a completion was triggered
 */
var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    /**
     * Completion was triggered by typing an identifier (24x7 code
     * complete), manual invocation (e.g Ctrl+Space) or via API.
     */
    CompletionTriggerKind.Invoked = 1;
    /**
     * Completion was triggered by a trigger character specified by
     * the `triggerCharacters` properties of the `CompletionRegistrationOptions`.
     */
    CompletionTriggerKind.TriggerCharacter = 2;
    /**
     * Completion was re-triggered as current completion list is incomplete
     */
    CompletionTriggerKind.TriggerForIncompleteCompletions = 3;
})(CompletionTriggerKind = exports.CompletionTriggerKind || (exports.CompletionTriggerKind = {}));
/**
 * Request to request completion at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response
 * is of type [CompletionItem[]](#CompletionItem) or [CompletionList](#CompletionList)
 * or a Thenable that resolves to such.
 *
 * The request can delay the computation of the [`detail`](#CompletionItem.detail)
 * and [`documentation`](#CompletionItem.documentation) properties to the `completionItem/resolve`
 * request. However, properties that are needed for the initial sorting and filtering, like `sortText`,
 * `filterText`, `insertText`, and `textEdit`, must not be changed during resolve.
 */
var CompletionRequest;
(function (CompletionRequest) {
    CompletionRequest.method = 'textDocument/completion';
    CompletionRequest.type = new messages_1.ProtocolRequestType(CompletionRequest.method);
})(CompletionRequest = exports.CompletionRequest || (exports.CompletionRequest = {}));
/**
 * Request to resolve additional information for a given completion item.The request's
 * parameter is of type [CompletionItem](#CompletionItem) the response
 * is of type [CompletionItem](#CompletionItem) or a Thenable that resolves to such.
 */
var CompletionResolveRequest;
(function (CompletionResolveRequest) {
    CompletionResolveRequest.method = 'completionItem/resolve';
    CompletionResolveRequest.type = new messages_1.ProtocolRequestType(CompletionResolveRequest.method);
})(CompletionResolveRequest = exports.CompletionResolveRequest || (exports.CompletionResolveRequest = {}));
/**
 * Request to request hover information at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response is of
 * type [Hover](#Hover) or a Thenable that resolves to such.
 */
var HoverRequest;
(function (HoverRequest) {
    HoverRequest.method = 'textDocument/hover';
    HoverRequest.type = new messages_1.ProtocolRequestType(HoverRequest.method);
})(HoverRequest = exports.HoverRequest || (exports.HoverRequest = {}));
/**
 * How a signature help was triggered.
 *
 * @since 3.15.0
 */
var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    /**
     * Signature help was invoked manually by the user or by a command.
     */
    SignatureHelpTriggerKind.Invoked = 1;
    /**
     * Signature help was triggered by a trigger character.
     */
    SignatureHelpTriggerKind.TriggerCharacter = 2;
    /**
     * Signature help was triggered by the cursor moving or by the document content changing.
     */
    SignatureHelpTriggerKind.ContentChange = 3;
})(SignatureHelpTriggerKind = exports.SignatureHelpTriggerKind || (exports.SignatureHelpTriggerKind = {}));
var SignatureHelpRequest;
(function (SignatureHelpRequest) {
    SignatureHelpRequest.method = 'textDocument/signatureHelp';
    SignatureHelpRequest.type = new messages_1.ProtocolRequestType(SignatureHelpRequest.method);
})(SignatureHelpRequest = exports.SignatureHelpRequest || (exports.SignatureHelpRequest = {}));
/**
 * A request to resolve the definition location of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the response is of either type [Definition](#Definition)
 * or a typed array of [DefinitionLink](#DefinitionLink) or a Thenable that resolves
 * to such.
 */
var DefinitionRequest;
(function (DefinitionRequest) {
    DefinitionRequest.method = 'textDocument/definition';
    DefinitionRequest.type = new messages_1.ProtocolRequestType(DefinitionRequest.method);
})(DefinitionRequest = exports.DefinitionRequest || (exports.DefinitionRequest = {}));
/**
 * A request to resolve project-wide references for the symbol denoted
 * by the given text document position. The request's parameter is of
 * type [ReferenceParams](#ReferenceParams) the response is of type
 * [Location[]](#Location) or a Thenable that resolves to such.
 */
var ReferencesRequest;
(function (ReferencesRequest) {
    ReferencesRequest.method = 'textDocument/references';
    ReferencesRequest.type = new messages_1.ProtocolRequestType(ReferencesRequest.method);
})(ReferencesRequest = exports.ReferencesRequest || (exports.ReferencesRequest = {}));
/**
 * Request to resolve a [DocumentHighlight](#DocumentHighlight) for a given
 * text document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the request response is of type [DocumentHighlight[]]
 * (#DocumentHighlight) or a Thenable that resolves to such.
 */
var DocumentHighlightRequest;
(function (DocumentHighlightRequest) {
    DocumentHighlightRequest.method = 'textDocument/documentHighlight';
    DocumentHighlightRequest.type = new messages_1.ProtocolRequestType(DocumentHighlightRequest.method);
})(DocumentHighlightRequest = exports.DocumentHighlightRequest || (exports.DocumentHighlightRequest = {}));
/**
 * A request to list all symbols found in a given text document. The request's
 * parameter is of type [TextDocumentIdentifier](#TextDocumentIdentifier) the
 * response is of type [SymbolInformation[]](#SymbolInformation) or a Thenable
 * that resolves to such.
 */
var DocumentSymbolRequest;
(function (DocumentSymbolRequest) {
    DocumentSymbolRequest.method = 'textDocument/documentSymbol';
    DocumentSymbolRequest.type = new messages_1.ProtocolRequestType(DocumentSymbolRequest.method);
})(DocumentSymbolRequest = exports.DocumentSymbolRequest || (exports.DocumentSymbolRequest = {}));
/**
 * A request to provide commands for the given text document and range.
 */
var CodeActionRequest;
(function (CodeActionRequest) {
    CodeActionRequest.method = 'textDocument/codeAction';
    CodeActionRequest.type = new messages_1.ProtocolRequestType(CodeActionRequest.method);
})(CodeActionRequest = exports.CodeActionRequest || (exports.CodeActionRequest = {}));
/**
 * Request to resolve additional information for a given code action.The request's
 * parameter is of type [CodeAction](#CodeAction) the response
 * is of type [CodeAction](#CodeAction) or a Thenable that resolves to such.
 */
var CodeActionResolveRequest;
(function (CodeActionResolveRequest) {
    CodeActionResolveRequest.method = 'codeAction/resolve';
    CodeActionResolveRequest.type = new messages_1.ProtocolRequestType(CodeActionResolveRequest.method);
})(CodeActionResolveRequest = exports.CodeActionResolveRequest || (exports.CodeActionResolveRequest = {}));
/**
 * A request to list project-wide symbols matching the query string given
 * by the [WorkspaceSymbolParams](#WorkspaceSymbolParams). The response is
 * of type [SymbolInformation[]](#SymbolInformation) or a Thenable that
 * resolves to such.
 */
var WorkspaceSymbolRequest;
(function (WorkspaceSymbolRequest) {
    WorkspaceSymbolRequest.method = 'workspace/symbol';
    WorkspaceSymbolRequest.type = new messages_1.ProtocolRequestType(WorkspaceSymbolRequest.method);
})(WorkspaceSymbolRequest = exports.WorkspaceSymbolRequest || (exports.WorkspaceSymbolRequest = {}));
/**
 * A request to provide code lens for the given text document.
 */
var CodeLensRequest;
(function (CodeLensRequest) {
    CodeLensRequest.method = 'textDocument/codeLens';
    CodeLensRequest.type = new messages_1.ProtocolRequestType(CodeLensRequest.method);
})(CodeLensRequest = exports.CodeLensRequest || (exports.CodeLensRequest = {}));
/**
 * A request to resolve a command for a given code lens.
 */
var CodeLensResolveRequest;
(function (CodeLensResolveRequest) {
    CodeLensResolveRequest.method = 'codeLens/resolve';
    CodeLensResolveRequest.type = new messages_1.ProtocolRequestType(CodeLensResolveRequest.method);
})(CodeLensResolveRequest = exports.CodeLensResolveRequest || (exports.CodeLensResolveRequest = {}));
/**
 * A request to refresh all code actions
 *
 * @since 3.16.0
 */
var CodeLensRefreshRequest;
(function (CodeLensRefreshRequest) {
    CodeLensRefreshRequest.method = `workspace/codeLens/refresh`;
    CodeLensRefreshRequest.type = new messages_1.ProtocolRequestType0(CodeLensRefreshRequest.method);
})(CodeLensRefreshRequest = exports.CodeLensRefreshRequest || (exports.CodeLensRefreshRequest = {}));
/**
 * A request to provide document links
 */
var DocumentLinkRequest;
(function (DocumentLinkRequest) {
    DocumentLinkRequest.method = 'textDocument/documentLink';
    DocumentLinkRequest.type = new messages_1.ProtocolRequestType(DocumentLinkRequest.method);
})(DocumentLinkRequest = exports.DocumentLinkRequest || (exports.DocumentLinkRequest = {}));
/**
 * Request to resolve additional information for a given document link. The request's
 * parameter is of type [DocumentLink](#DocumentLink) the response
 * is of type [DocumentLink](#DocumentLink) or a Thenable that resolves to such.
 */
var DocumentLinkResolveRequest;
(function (DocumentLinkResolveRequest) {
    DocumentLinkResolveRequest.method = 'documentLink/resolve';
    DocumentLinkResolveRequest.type = new messages_1.ProtocolRequestType(DocumentLinkResolveRequest.method);
})(DocumentLinkResolveRequest = exports.DocumentLinkResolveRequest || (exports.DocumentLinkResolveRequest = {}));
/**
 * A request to to format a whole document.
 */
var DocumentFormattingRequest;
(function (DocumentFormattingRequest) {
    DocumentFormattingRequest.method = 'textDocument/formatting';
    DocumentFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentFormattingRequest.method);
})(DocumentFormattingRequest = exports.DocumentFormattingRequest || (exports.DocumentFormattingRequest = {}));
/**
 * A request to to format a range in a document.
 */
var DocumentRangeFormattingRequest;
(function (DocumentRangeFormattingRequest) {
    DocumentRangeFormattingRequest.method = 'textDocument/rangeFormatting';
    DocumentRangeFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentRangeFormattingRequest.method);
})(DocumentRangeFormattingRequest = exports.DocumentRangeFormattingRequest || (exports.DocumentRangeFormattingRequest = {}));
/**
 * A request to format a document on type.
 */
var DocumentOnTypeFormattingRequest;
(function (DocumentOnTypeFormattingRequest) {
    DocumentOnTypeFormattingRequest.method = 'textDocument/onTypeFormatting';
    DocumentOnTypeFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentOnTypeFormattingRequest.method);
})(DocumentOnTypeFormattingRequest = exports.DocumentOnTypeFormattingRequest || (exports.DocumentOnTypeFormattingRequest = {}));
//---- Rename ----------------------------------------------
var PrepareSupportDefaultBehavior;
(function (PrepareSupportDefaultBehavior) {
    /**
     * The client's default behavior is to select the identifier
     * according the to language's syntax rule.
     */
    PrepareSupportDefaultBehavior.Identifier = 1;
})(PrepareSupportDefaultBehavior = exports.PrepareSupportDefaultBehavior || (exports.PrepareSupportDefaultBehavior = {}));
/**
 * A request to rename a symbol.
 */
var RenameRequest;
(function (RenameRequest) {
    RenameRequest.method = 'textDocument/rename';
    RenameRequest.type = new messages_1.ProtocolRequestType(RenameRequest.method);
})(RenameRequest = exports.RenameRequest || (exports.RenameRequest = {}));
/**
 * A request to test and perform the setup necessary for a rename.
 *
 * @since 3.16 - support for default behavior
 */
var PrepareRenameRequest;
(function (PrepareRenameRequest) {
    PrepareRenameRequest.method = 'textDocument/prepareRename';
    PrepareRenameRequest.type = new messages_1.ProtocolRequestType(PrepareRenameRequest.method);
})(PrepareRenameRequest = exports.PrepareRenameRequest || (exports.PrepareRenameRequest = {}));
/**
 * A request send from the client to the server to execute a command. The request might return
 * a workspace edit which the client will apply to the workspace.
 */
var ExecuteCommandRequest;
(function (ExecuteCommandRequest) {
    ExecuteCommandRequest.type = new messages_1.ProtocolRequestType('workspace/executeCommand');
})(ExecuteCommandRequest = exports.ExecuteCommandRequest || (exports.ExecuteCommandRequest = {}));
/**
 * A request sent from the server to the client to modified certain resources.
 */
var ApplyWorkspaceEditRequest;
(function (ApplyWorkspaceEditRequest) {
    ApplyWorkspaceEditRequest.type = new messages_1.ProtocolRequestType('workspace/applyEdit');
})(ApplyWorkspaceEditRequest = exports.ApplyWorkspaceEditRequest || (exports.ApplyWorkspaceEditRequest = {}));
//# sourceMappingURL=protocol.js.map

/***/ }),
/* 69 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.objectLiteral = exports.typedArray = exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
function boolean(value) {
    return value === true || value === false;
}
exports.boolean = boolean;
function string(value) {
    return typeof value === 'string' || value instanceof String;
}
exports.string = string;
function number(value) {
    return typeof value === 'number' || value instanceof Number;
}
exports.number = number;
function error(value) {
    return value instanceof Error;
}
exports.error = error;
function func(value) {
    return typeof value === 'function';
}
exports.func = func;
function array(value) {
    return Array.isArray(value);
}
exports.array = array;
function stringArray(value) {
    return array(value) && value.every(elem => string(elem));
}
exports.stringArray = stringArray;
function typedArray(value, check) {
    return Array.isArray(value) && value.every(check);
}
exports.typedArray = typedArray;
function objectLiteral(value) {
    // Strictly speaking class instances pass this check as well. Since the LSP
    // doesn't use classes we ignore this for now. If we do we need to add something
    // like this: `Object.getPrototypeOf(Object.getPrototypeOf(x)) === null`
    return value !== null && typeof value === 'object';
}
exports.objectLiteral = objectLiteral;
//# sourceMappingURL=is.js.map

/***/ }),
/* 70 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ImplementationRequest = void 0;
const messages_1 = __webpack_require__(67);
// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport;
/**
 * A request to resolve the implementation locations of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
var ImplementationRequest;
(function (ImplementationRequest) {
    ImplementationRequest.method = 'textDocument/implementation';
    ImplementationRequest.type = new messages_1.ProtocolRequestType(ImplementationRequest.method);
})(ImplementationRequest = exports.ImplementationRequest || (exports.ImplementationRequest = {}));
//# sourceMappingURL=protocol.implementation.js.map

/***/ }),
/* 71 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TypeDefinitionRequest = void 0;
const messages_1 = __webpack_require__(67);
// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport;
/**
 * A request to resolve the type definition locations of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
var TypeDefinitionRequest;
(function (TypeDefinitionRequest) {
    TypeDefinitionRequest.method = 'textDocument/typeDefinition';
    TypeDefinitionRequest.type = new messages_1.ProtocolRequestType(TypeDefinitionRequest.method);
})(TypeDefinitionRequest = exports.TypeDefinitionRequest || (exports.TypeDefinitionRequest = {}));
//# sourceMappingURL=protocol.typeDefinition.js.map

/***/ }),
/* 72 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * The `workspace/workspaceFolders` is sent from the server to the client to fetch the open workspace folders.
 */
var WorkspaceFoldersRequest;
(function (WorkspaceFoldersRequest) {
    WorkspaceFoldersRequest.type = new messages_1.ProtocolRequestType0('workspace/workspaceFolders');
})(WorkspaceFoldersRequest = exports.WorkspaceFoldersRequest || (exports.WorkspaceFoldersRequest = {}));
/**
 * The `workspace/didChangeWorkspaceFolders` notification is sent from the client to the server when the workspace
 * folder configuration changes.
 */
var DidChangeWorkspaceFoldersNotification;
(function (DidChangeWorkspaceFoldersNotification) {
    DidChangeWorkspaceFoldersNotification.type = new messages_1.ProtocolNotificationType('workspace/didChangeWorkspaceFolders');
})(DidChangeWorkspaceFoldersNotification = exports.DidChangeWorkspaceFoldersNotification || (exports.DidChangeWorkspaceFoldersNotification = {}));
//# sourceMappingURL=protocol.workspaceFolders.js.map

/***/ }),
/* 73 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ConfigurationRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * The 'workspace/configuration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 *
 * This pull model replaces the old push model were the client signaled configuration change via an
 * event. If the server still needs to react to configuration changes (since the server caches the
 * result of `workspace/configuration` requests) the server should register for an empty configuration
 * change event and empty the cache if such an event is received.
 */
var ConfigurationRequest;
(function (ConfigurationRequest) {
    ConfigurationRequest.type = new messages_1.ProtocolRequestType('workspace/configuration');
})(ConfigurationRequest = exports.ConfigurationRequest || (exports.ConfigurationRequest = {}));
//# sourceMappingURL=protocol.configuration.js.map

/***/ }),
/* 74 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ColorPresentationRequest = exports.DocumentColorRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A request to list all color symbols found in a given text document. The request's
 * parameter is of type [DocumentColorParams](#DocumentColorParams) the
 * response is of type [ColorInformation[]](#ColorInformation) or a Thenable
 * that resolves to such.
 */
var DocumentColorRequest;
(function (DocumentColorRequest) {
    DocumentColorRequest.method = 'textDocument/documentColor';
    DocumentColorRequest.type = new messages_1.ProtocolRequestType(DocumentColorRequest.method);
})(DocumentColorRequest = exports.DocumentColorRequest || (exports.DocumentColorRequest = {}));
/**
 * A request to list all presentation for a color. The request's
 * parameter is of type [ColorPresentationParams](#ColorPresentationParams) the
 * response is of type [ColorInformation[]](#ColorInformation) or a Thenable
 * that resolves to such.
 */
var ColorPresentationRequest;
(function (ColorPresentationRequest) {
    ColorPresentationRequest.type = new messages_1.ProtocolRequestType('textDocument/colorPresentation');
})(ColorPresentationRequest = exports.ColorPresentationRequest || (exports.ColorPresentationRequest = {}));
//# sourceMappingURL=protocol.colorProvider.js.map

/***/ }),
/* 75 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FoldingRangeRequest = exports.FoldingRangeKind = void 0;
const messages_1 = __webpack_require__(67);
/**
 * Enum of known range kinds
 */
var FoldingRangeKind;
(function (FoldingRangeKind) {
    /**
     * Folding range for a comment
     */
    FoldingRangeKind["Comment"] = "comment";
    /**
     * Folding range for a imports or includes
     */
    FoldingRangeKind["Imports"] = "imports";
    /**
     * Folding range for a region (e.g. `#region`)
     */
    FoldingRangeKind["Region"] = "region";
})(FoldingRangeKind = exports.FoldingRangeKind || (exports.FoldingRangeKind = {}));
/**
 * A request to provide folding ranges in a document. The request's
 * parameter is of type [FoldingRangeParams](#FoldingRangeParams), the
 * response is of type [FoldingRangeList](#FoldingRangeList) or a Thenable
 * that resolves to such.
 */
var FoldingRangeRequest;
(function (FoldingRangeRequest) {
    FoldingRangeRequest.method = 'textDocument/foldingRange';
    FoldingRangeRequest.type = new messages_1.ProtocolRequestType(FoldingRangeRequest.method);
})(FoldingRangeRequest = exports.FoldingRangeRequest || (exports.FoldingRangeRequest = {}));
//# sourceMappingURL=protocol.foldingRange.js.map

/***/ }),
/* 76 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DeclarationRequest = void 0;
const messages_1 = __webpack_require__(67);
// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport;
/**
 * A request to resolve the type definition locations of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Declaration](#Declaration)
 * or a typed array of [DeclarationLink](#DeclarationLink) or a Thenable that resolves
 * to such.
 */
var DeclarationRequest;
(function (DeclarationRequest) {
    DeclarationRequest.method = 'textDocument/declaration';
    DeclarationRequest.type = new messages_1.ProtocolRequestType(DeclarationRequest.method);
})(DeclarationRequest = exports.DeclarationRequest || (exports.DeclarationRequest = {}));
//# sourceMappingURL=protocol.declaration.js.map

/***/ }),
/* 77 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SelectionRangeRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A request to provide selection ranges in a document. The request's
 * parameter is of type [SelectionRangeParams](#SelectionRangeParams), the
 * response is of type [SelectionRange[]](#SelectionRange[]) or a Thenable
 * that resolves to such.
 */
var SelectionRangeRequest;
(function (SelectionRangeRequest) {
    SelectionRangeRequest.method = 'textDocument/selectionRange';
    SelectionRangeRequest.type = new messages_1.ProtocolRequestType(SelectionRangeRequest.method);
})(SelectionRangeRequest = exports.SelectionRangeRequest || (exports.SelectionRangeRequest = {}));
//# sourceMappingURL=protocol.selectionRange.js.map

/***/ }),
/* 78 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WorkDoneProgressCancelNotification = exports.WorkDoneProgressCreateRequest = exports.WorkDoneProgress = void 0;
const vscode_jsonrpc_1 = __webpack_require__(50);
const messages_1 = __webpack_require__(67);
var WorkDoneProgress;
(function (WorkDoneProgress) {
    WorkDoneProgress.type = new vscode_jsonrpc_1.ProgressType();
    function is(value) {
        return value === WorkDoneProgress.type;
    }
    WorkDoneProgress.is = is;
})(WorkDoneProgress = exports.WorkDoneProgress || (exports.WorkDoneProgress = {}));
/**
 * The `window/workDoneProgress/create` request is sent from the server to the client to initiate progress
 * reporting from the server.
 */
var WorkDoneProgressCreateRequest;
(function (WorkDoneProgressCreateRequest) {
    WorkDoneProgressCreateRequest.type = new messages_1.ProtocolRequestType('window/workDoneProgress/create');
})(WorkDoneProgressCreateRequest = exports.WorkDoneProgressCreateRequest || (exports.WorkDoneProgressCreateRequest = {}));
/**
 * The `window/workDoneProgress/cancel` notification is sent from  the client to the server to cancel a progress
 * initiated on the server side.
 */
var WorkDoneProgressCancelNotification;
(function (WorkDoneProgressCancelNotification) {
    WorkDoneProgressCancelNotification.type = new messages_1.ProtocolNotificationType('window/workDoneProgress/cancel');
})(WorkDoneProgressCancelNotification = exports.WorkDoneProgressCancelNotification || (exports.WorkDoneProgressCancelNotification = {}));
//# sourceMappingURL=protocol.progress.js.map

/***/ }),
/* 79 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallHierarchyOutgoingCallsRequest = exports.CallHierarchyIncomingCallsRequest = exports.CallHierarchyPrepareRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A request to result a `CallHierarchyItem` in a document at a given position.
 * Can be used as an input to a incoming or outgoing call hierarchy.
 *
 * @since 3.16.0
 */
var CallHierarchyPrepareRequest;
(function (CallHierarchyPrepareRequest) {
    CallHierarchyPrepareRequest.method = 'textDocument/prepareCallHierarchy';
    CallHierarchyPrepareRequest.type = new messages_1.ProtocolRequestType(CallHierarchyPrepareRequest.method);
})(CallHierarchyPrepareRequest = exports.CallHierarchyPrepareRequest || (exports.CallHierarchyPrepareRequest = {}));
/**
 * A request to resolve the incoming calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
var CallHierarchyIncomingCallsRequest;
(function (CallHierarchyIncomingCallsRequest) {
    CallHierarchyIncomingCallsRequest.method = 'callHierarchy/incomingCalls';
    CallHierarchyIncomingCallsRequest.type = new messages_1.ProtocolRequestType(CallHierarchyIncomingCallsRequest.method);
})(CallHierarchyIncomingCallsRequest = exports.CallHierarchyIncomingCallsRequest || (exports.CallHierarchyIncomingCallsRequest = {}));
/**
 * A request to resolve the outgoing calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
var CallHierarchyOutgoingCallsRequest;
(function (CallHierarchyOutgoingCallsRequest) {
    CallHierarchyOutgoingCallsRequest.method = 'callHierarchy/outgoingCalls';
    CallHierarchyOutgoingCallsRequest.type = new messages_1.ProtocolRequestType(CallHierarchyOutgoingCallsRequest.method);
})(CallHierarchyOutgoingCallsRequest = exports.CallHierarchyOutgoingCallsRequest || (exports.CallHierarchyOutgoingCallsRequest = {}));
//# sourceMappingURL=protocol.callHierarchy.js.map

/***/ }),
/* 80 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SemanticTokensRefreshRequest = exports.SemanticTokensRangeRequest = exports.SemanticTokensDeltaRequest = exports.SemanticTokensRequest = exports.SemanticTokensRegistrationType = exports.TokenFormat = void 0;
const messages_1 = __webpack_require__(67);
//------- 'textDocument/semanticTokens' -----
var TokenFormat;
(function (TokenFormat) {
    TokenFormat.Relative = 'relative';
})(TokenFormat = exports.TokenFormat || (exports.TokenFormat = {}));
var SemanticTokensRegistrationType;
(function (SemanticTokensRegistrationType) {
    SemanticTokensRegistrationType.method = 'textDocument/semanticTokens';
    SemanticTokensRegistrationType.type = new messages_1.RegistrationType(SemanticTokensRegistrationType.method);
})(SemanticTokensRegistrationType = exports.SemanticTokensRegistrationType || (exports.SemanticTokensRegistrationType = {}));
/**
 * @since 3.16.0
 */
var SemanticTokensRequest;
(function (SemanticTokensRequest) {
    SemanticTokensRequest.method = 'textDocument/semanticTokens/full';
    SemanticTokensRequest.type = new messages_1.ProtocolRequestType(SemanticTokensRequest.method);
})(SemanticTokensRequest = exports.SemanticTokensRequest || (exports.SemanticTokensRequest = {}));
/**
 * @since 3.16.0
 */
var SemanticTokensDeltaRequest;
(function (SemanticTokensDeltaRequest) {
    SemanticTokensDeltaRequest.method = 'textDocument/semanticTokens/full/delta';
    SemanticTokensDeltaRequest.type = new messages_1.ProtocolRequestType(SemanticTokensDeltaRequest.method);
})(SemanticTokensDeltaRequest = exports.SemanticTokensDeltaRequest || (exports.SemanticTokensDeltaRequest = {}));
/**
 * @since 3.16.0
 */
var SemanticTokensRangeRequest;
(function (SemanticTokensRangeRequest) {
    SemanticTokensRangeRequest.method = 'textDocument/semanticTokens/range';
    SemanticTokensRangeRequest.type = new messages_1.ProtocolRequestType(SemanticTokensRangeRequest.method);
})(SemanticTokensRangeRequest = exports.SemanticTokensRangeRequest || (exports.SemanticTokensRangeRequest = {}));
/**
 * @since 3.16.0
 */
var SemanticTokensRefreshRequest;
(function (SemanticTokensRefreshRequest) {
    SemanticTokensRefreshRequest.method = `workspace/semanticTokens/refresh`;
    SemanticTokensRefreshRequest.type = new messages_1.ProtocolRequestType0(SemanticTokensRefreshRequest.method);
})(SemanticTokensRefreshRequest = exports.SemanticTokensRefreshRequest || (exports.SemanticTokensRefreshRequest = {}));
//# sourceMappingURL=protocol.semanticTokens.js.map

/***/ }),
/* 81 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ShowDocumentRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A request to show a document. This request might open an
 * external program depending on the value of the URI to open.
 * For example a request to open `https://code.visualstudio.com/`
 * will very likely open the URI in a WEB browser.
 *
 * @since 3.16.0
*/
var ShowDocumentRequest;
(function (ShowDocumentRequest) {
    ShowDocumentRequest.method = 'window/showDocument';
    ShowDocumentRequest.type = new messages_1.ProtocolRequestType(ShowDocumentRequest.method);
})(ShowDocumentRequest = exports.ShowDocumentRequest || (exports.ShowDocumentRequest = {}));
//# sourceMappingURL=protocol.showDocument.js.map

/***/ }),
/* 82 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LinkedEditingRangeRequest = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A request to provide ranges that can be edited together.
 *
 * @since 3.16.0
 */
var LinkedEditingRangeRequest;
(function (LinkedEditingRangeRequest) {
    LinkedEditingRangeRequest.method = 'textDocument/linkedEditingRange';
    LinkedEditingRangeRequest.type = new messages_1.ProtocolRequestType(LinkedEditingRangeRequest.method);
})(LinkedEditingRangeRequest = exports.LinkedEditingRangeRequest || (exports.LinkedEditingRangeRequest = {}));
//# sourceMappingURL=protocol.linkedEditingRange.js.map

/***/ }),
/* 83 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WillDeleteFilesRequest = exports.DidDeleteFilesNotification = exports.DidRenameFilesNotification = exports.WillRenameFilesRequest = exports.DidCreateFilesNotification = exports.WillCreateFilesRequest = exports.FileOperationPatternKind = void 0;
const messages_1 = __webpack_require__(67);
/**
 * A pattern kind describing if a glob pattern matches a file a folder or
 * both.
 *
 * @since 3.16.0
 */
var FileOperationPatternKind;
(function (FileOperationPatternKind) {
    /**
     * The pattern matches a file only.
     */
    FileOperationPatternKind.file = 'file';
    /**
     * The pattern matches a folder only.
     */
    FileOperationPatternKind.folder = 'folder';
})(FileOperationPatternKind = exports.FileOperationPatternKind || (exports.FileOperationPatternKind = {}));
/**
 * The will create files request is sent from the client to the server before files are actually
 * created as long as the creation is triggered from within the client.
 *
 * @since 3.16.0
 */
var WillCreateFilesRequest;
(function (WillCreateFilesRequest) {
    WillCreateFilesRequest.method = 'workspace/willCreateFiles';
    WillCreateFilesRequest.type = new messages_1.ProtocolRequestType(WillCreateFilesRequest.method);
})(WillCreateFilesRequest = exports.WillCreateFilesRequest || (exports.WillCreateFilesRequest = {}));
/**
 * The did create files notification is sent from the client to the server when
 * files were created from within the client.
 *
 * @since 3.16.0
 */
var DidCreateFilesNotification;
(function (DidCreateFilesNotification) {
    DidCreateFilesNotification.method = 'workspace/didCreateFiles';
    DidCreateFilesNotification.type = new messages_1.ProtocolNotificationType(DidCreateFilesNotification.method);
})(DidCreateFilesNotification = exports.DidCreateFilesNotification || (exports.DidCreateFilesNotification = {}));
/**
 * The will rename files request is sent from the client to the server before files are actually
 * renamed as long as the rename is triggered from within the client.
 *
 * @since 3.16.0
 */
var WillRenameFilesRequest;
(function (WillRenameFilesRequest) {
    WillRenameFilesRequest.method = 'workspace/willRenameFiles';
    WillRenameFilesRequest.type = new messages_1.ProtocolRequestType(WillRenameFilesRequest.method);
})(WillRenameFilesRequest = exports.WillRenameFilesRequest || (exports.WillRenameFilesRequest = {}));
/**
 * The did rename files notification is sent from the client to the server when
 * files were renamed from within the client.
 *
 * @since 3.16.0
 */
var DidRenameFilesNotification;
(function (DidRenameFilesNotification) {
    DidRenameFilesNotification.method = 'workspace/didRenameFiles';
    DidRenameFilesNotification.type = new messages_1.ProtocolNotificationType(DidRenameFilesNotification.method);
})(DidRenameFilesNotification = exports.DidRenameFilesNotification || (exports.DidRenameFilesNotification = {}));
/**
 * The will delete files request is sent from the client to the server before files are actually
 * deleted as long as the deletion is triggered from within the client.
 *
 * @since 3.16.0
 */
var DidDeleteFilesNotification;
(function (DidDeleteFilesNotification) {
    DidDeleteFilesNotification.method = 'workspace/didDeleteFiles';
    DidDeleteFilesNotification.type = new messages_1.ProtocolNotificationType(DidDeleteFilesNotification.method);
})(DidDeleteFilesNotification = exports.DidDeleteFilesNotification || (exports.DidDeleteFilesNotification = {}));
/**
 * The did delete files notification is sent from the client to the server when
 * files were deleted from within the client.
 *
 * @since 3.16.0
 */
var WillDeleteFilesRequest;
(function (WillDeleteFilesRequest) {
    WillDeleteFilesRequest.method = 'workspace/willDeleteFiles';
    WillDeleteFilesRequest.type = new messages_1.ProtocolRequestType(WillDeleteFilesRequest.method);
})(WillDeleteFilesRequest = exports.WillDeleteFilesRequest || (exports.WillDeleteFilesRequest = {}));
//# sourceMappingURL=protocol.fileOperations.js.map

/***/ }),
/* 84 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = void 0;
const messages_1 = __webpack_require__(67);
/**
 * Moniker uniqueness level to define scope of the moniker.
 *
 * @since 3.16.0
 */
var UniquenessLevel;
(function (UniquenessLevel) {
    /**
     * The moniker is only unique inside a document
     */
    UniquenessLevel["document"] = "document";
    /**
     * The moniker is unique inside a project for which a dump got created
     */
    UniquenessLevel["project"] = "project";
    /**
     * The moniker is unique inside the group to which a project belongs
     */
    UniquenessLevel["group"] = "group";
    /**
     * The moniker is unique inside the moniker scheme.
     */
    UniquenessLevel["scheme"] = "scheme";
    /**
     * The moniker is globally unique
     */
    UniquenessLevel["global"] = "global";
})(UniquenessLevel = exports.UniquenessLevel || (exports.UniquenessLevel = {}));
/**
 * The moniker kind.
 *
 * @since 3.16.0
 */
var MonikerKind;
(function (MonikerKind) {
    /**
     * The moniker represent a symbol that is imported into a project
     */
    MonikerKind["import"] = "import";
    /**
     * The moniker represents a symbol that is exported from a project
     */
    MonikerKind["export"] = "export";
    /**
     * The moniker represents a symbol that is local to a project (e.g. a local
     * variable of a function, a class not visible outside the project, ...)
     */
    MonikerKind["local"] = "local";
})(MonikerKind = exports.MonikerKind || (exports.MonikerKind = {}));
/**
 * A request to get the moniker of a symbol at a given text document position.
 * The request parameter is of type [TextDocumentPositionParams](#TextDocumentPositionParams).
 * The response is of type [Moniker[]](#Moniker[]) or `null`.
 */
var MonikerRequest;
(function (MonikerRequest) {
    MonikerRequest.method = 'textDocument/moniker';
    MonikerRequest.type = new messages_1.ProtocolRequestType(MonikerRequest.method);
})(MonikerRequest = exports.MonikerRequest || (exports.MonikerRequest = {}));
//# sourceMappingURL=protocol.moniker.js.map

/***/ }),
/* 85 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createProtocolConnection = void 0;
const vscode_jsonrpc_1 = __webpack_require__(50);
function createProtocolConnection(input, output, logger, options) {
    if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
        options = { connectionStrategy: options };
    }
    return vscode_jsonrpc_1.createMessageConnection(input, output, logger, options);
}
exports.createProtocolConnection = createProtocolConnection;
//# sourceMappingURL=connection.js.map

/***/ }),
/* 86 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiagnosticRefreshRequest = exports.WorkspaceDiagnosticRequest = exports.DocumentDiagnosticRequest = exports.DocumentDiagnosticReportKind = exports.DiagnosticServerCancellationData = void 0;
const vscode_jsonrpc_1 = __webpack_require__(50);
const Is = __webpack_require__(69);
const messages_1 = __webpack_require__(67);
/**
 * @since 3.17.0 - proposed state
 */
var DiagnosticServerCancellationData;
(function (DiagnosticServerCancellationData) {
    function is(value) {
        const candidate = value;
        return candidate && Is.boolean(candidate.retriggerRequest);
    }
    DiagnosticServerCancellationData.is = is;
})(DiagnosticServerCancellationData = exports.DiagnosticServerCancellationData || (exports.DiagnosticServerCancellationData = {}));
/**
 * The document diagnostic report kinds.
 *
 * @since 3.17.0 - proposed state
 */
var DocumentDiagnosticReportKind;
(function (DocumentDiagnosticReportKind) {
    /**
     * A diagnostic report with a full
     * set of problems.
     */
    DocumentDiagnosticReportKind["full"] = "full";
    /**
     * A report indicating that the last
     * returned report is still accurate.
     */
    DocumentDiagnosticReportKind["unChanged"] = "unChanged";
})(DocumentDiagnosticReportKind = exports.DocumentDiagnosticReportKind || (exports.DocumentDiagnosticReportKind = {}));
/**
 * The document diagnostic request definition.
 *
 * @since 3.17.0 - proposed state
 */
var DocumentDiagnosticRequest;
(function (DocumentDiagnosticRequest) {
    DocumentDiagnosticRequest.method = 'textDocument/diagnostic';
    DocumentDiagnosticRequest.type = new messages_1.ProtocolRequestType(DocumentDiagnosticRequest.method);
    DocumentDiagnosticRequest.partialResult = new vscode_jsonrpc_1.ProgressType();
})(DocumentDiagnosticRequest = exports.DocumentDiagnosticRequest || (exports.DocumentDiagnosticRequest = {}));
/**
 * The workspace diagnostic request definition.
 *
 * @since 3.17.0 - proposed state
 */
var WorkspaceDiagnosticRequest;
(function (WorkspaceDiagnosticRequest) {
    WorkspaceDiagnosticRequest.method = 'workspace/diagnostic';
    WorkspaceDiagnosticRequest.type = new messages_1.ProtocolRequestType(WorkspaceDiagnosticRequest.method);
    WorkspaceDiagnosticRequest.partialResult = new vscode_jsonrpc_1.ProgressType();
})(WorkspaceDiagnosticRequest = exports.WorkspaceDiagnosticRequest || (exports.WorkspaceDiagnosticRequest = {}));
/**
 * The diagnostic refresh request definition.
 *
 * @since 3.17.0 - proposed state
 */
var DiagnosticRefreshRequest;
(function (DiagnosticRefreshRequest) {
    DiagnosticRefreshRequest.method = `workspace/diagnostic/refresh`;
    DiagnosticRefreshRequest.type = new messages_1.ProtocolRequestType0(DiagnosticRefreshRequest.method);
})(DiagnosticRefreshRequest = exports.DiagnosticRefreshRequest || (exports.DiagnosticRefreshRequest = {}));
//# sourceMappingURL=proposed.diagnostic.js.map

/***/ }),
/* 87 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.asPromise = exports.thenable = exports.typedArray = exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
function boolean(value) {
    return value === true || value === false;
}
exports.boolean = boolean;
function string(value) {
    return typeof value === 'string' || value instanceof String;
}
exports.string = string;
function number(value) {
    return typeof value === 'number' || value instanceof Number;
}
exports.number = number;
function error(value) {
    return value instanceof Error;
}
exports.error = error;
function func(value) {
    return typeof value === 'function';
}
exports.func = func;
function array(value) {
    return Array.isArray(value);
}
exports.array = array;
function stringArray(value) {
    return array(value) && value.every(elem => string(elem));
}
exports.stringArray = stringArray;
function typedArray(value, check) {
    return Array.isArray(value) && value.every(check);
}
exports.typedArray = typedArray;
function thenable(value) {
    return value && func(value.then);
}
exports.thenable = thenable;
function asPromise(value) {
    if (value instanceof Promise) {
        return value;
    }
    else if (thenable(value)) {
        return new Promise((resolve, reject) => {
            value.then((resolved) => resolve(resolved), (error) => reject(error));
        });
    }
    else {
        return Promise.resolve(value);
    }
}
exports.asPromise = asPromise;
//# sourceMappingURL=is.js.map

/***/ }),
/* 88 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const code = __webpack_require__(1);
class ProtocolCompletionItem extends code.CompletionItem {
    constructor(label) {
        super(label);
    }
}
exports["default"] = ProtocolCompletionItem;
//# sourceMappingURL=protocolCompletionItem.js.map

/***/ }),
/* 89 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const code = __webpack_require__(1);
class ProtocolCodeLens extends code.CodeLens {
    constructor(range) {
        super(range);
    }
}
exports["default"] = ProtocolCodeLens;
//# sourceMappingURL=protocolCodeLens.js.map

/***/ }),
/* 90 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const code = __webpack_require__(1);
class ProtocolDocumentLink extends code.DocumentLink {
    constructor(range, target) {
        super(range, target);
    }
}
exports["default"] = ProtocolDocumentLink;
//# sourceMappingURL=protocolDocumentLink.js.map

/***/ }),
/* 91 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const vscode = __webpack_require__(1);
class ProtocolCodeAction extends vscode.CodeAction {
    constructor(title, data) {
        super(title);
        this.data = data;
    }
}
exports["default"] = ProtocolCodeAction;
//# sourceMappingURL=protocolCodeAction.js.map

/***/ }),
/* 92 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProtocolDiagnostic = exports.DiagnosticCode = void 0;
const vscode = __webpack_require__(1);
const Is = __webpack_require__(87);
var DiagnosticCode;
(function (DiagnosticCode) {
    function is(value) {
        const candidate = value;
        return candidate !== undefined && candidate !== null && (Is.number(candidate.value) || Is.string(candidate.value)) && Is.string(candidate.target);
    }
    DiagnosticCode.is = is;
})(DiagnosticCode = exports.DiagnosticCode || (exports.DiagnosticCode = {}));
class ProtocolDiagnostic extends vscode.Diagnostic {
    constructor(range, message, severity, data) {
        super(range, message, severity);
        this.data = data;
        this.hasDiagnosticCode = false;
    }
}
exports.ProtocolDiagnostic = ProtocolDiagnostic;
//# sourceMappingURL=protocolDiagnostic.js.map

/***/ }),
/* 93 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
const code = __webpack_require__(1);
class ProtocolCallHierarchyItem extends code.CallHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange, data) {
        super(kind, name, detail, uri, range, selectionRange);
        if (data !== undefined) {
            this.data = data;
        }
    }
}
exports["default"] = ProtocolCallHierarchyItem;
//# sourceMappingURL=protocolCallHierarchyItem.js.map

/***/ }),
/* 94 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createConverter = void 0;
const code = __webpack_require__(1);
const proto = __webpack_require__(48);
const Is = __webpack_require__(87);
const protocolCompletionItem_1 = __webpack_require__(88);
const protocolCodeLens_1 = __webpack_require__(89);
const protocolDocumentLink_1 = __webpack_require__(90);
const protocolCodeAction_1 = __webpack_require__(91);
const protocolDiagnostic_1 = __webpack_require__(92);
const protocolCallHierarchyItem_1 = __webpack_require__(93);
const vscode_languageserver_protocol_1 = __webpack_require__(48);
var InsertReplaceRange;
(function (InsertReplaceRange) {
    function is(value) {
        const candidate = value;
        return candidate && !!candidate.inserting && !!candidate.replacing;
    }
    InsertReplaceRange.is = is;
})(InsertReplaceRange || (InsertReplaceRange = {}));
function createConverter(uriConverter) {
    const nullConverter = (value) => value.toString();
    const _uriConverter = uriConverter || nullConverter;
    function asUri(value) {
        return _uriConverter(value);
    }
    function asTextDocumentIdentifier(textDocument) {
        return {
            uri: _uriConverter(textDocument.uri)
        };
    }
    function asVersionedTextDocumentIdentifier(textDocument) {
        return {
            uri: _uriConverter(textDocument.uri),
            version: textDocument.version
        };
    }
    function asOpenTextDocumentParams(textDocument) {
        return {
            textDocument: {
                uri: _uriConverter(textDocument.uri),
                languageId: textDocument.languageId,
                version: textDocument.version,
                text: textDocument.getText()
            }
        };
    }
    function isTextDocumentChangeEvent(value) {
        let candidate = value;
        return !!candidate.document && !!candidate.contentChanges;
    }
    function isTextDocument(value) {
        let candidate = value;
        return !!candidate.uri && !!candidate.version;
    }
    function asChangeTextDocumentParams(arg) {
        if (isTextDocument(arg)) {
            let result = {
                textDocument: {
                    uri: _uriConverter(arg.uri),
                    version: arg.version
                },
                contentChanges: [{ text: arg.getText() }]
            };
            return result;
        }
        else if (isTextDocumentChangeEvent(arg)) {
            let document = arg.document;
            let result = {
                textDocument: {
                    uri: _uriConverter(document.uri),
                    version: document.version
                },
                contentChanges: arg.contentChanges.map((change) => {
                    let range = change.range;
                    return {
                        range: {
                            start: { line: range.start.line, character: range.start.character },
                            end: { line: range.end.line, character: range.end.character }
                        },
                        rangeLength: change.rangeLength,
                        text: change.text
                    };
                })
            };
            return result;
        }
        else {
            throw Error('Unsupported text document change parameter');
        }
    }
    function asCloseTextDocumentParams(textDocument) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument)
        };
    }
    function asSaveTextDocumentParams(textDocument, includeContent = false) {
        let result = {
            textDocument: asTextDocumentIdentifier(textDocument)
        };
        if (includeContent) {
            result.text = textDocument.getText();
        }
        return result;
    }
    function asTextDocumentSaveReason(reason) {
        switch (reason) {
            case code.TextDocumentSaveReason.Manual:
                return proto.TextDocumentSaveReason.Manual;
            case code.TextDocumentSaveReason.AfterDelay:
                return proto.TextDocumentSaveReason.AfterDelay;
            case code.TextDocumentSaveReason.FocusOut:
                return proto.TextDocumentSaveReason.FocusOut;
        }
        return proto.TextDocumentSaveReason.Manual;
    }
    function asWillSaveTextDocumentParams(event) {
        return {
            textDocument: asTextDocumentIdentifier(event.document),
            reason: asTextDocumentSaveReason(event.reason)
        };
    }
    function asDidCreateFilesParams(event) {
        return {
            files: event.files.map((fileUri) => ({
                uri: _uriConverter(fileUri),
            })),
        };
    }
    function asDidRenameFilesParams(event) {
        return {
            files: event.files.map((file) => ({
                oldUri: _uriConverter(file.oldUri),
                newUri: _uriConverter(file.newUri),
            })),
        };
    }
    function asDidDeleteFilesParams(event) {
        return {
            files: event.files.map((fileUri) => ({
                uri: _uriConverter(fileUri),
            })),
        };
    }
    function asWillCreateFilesParams(event) {
        return {
            files: event.files.map((fileUri) => ({
                uri: _uriConverter(fileUri),
            })),
        };
    }
    function asWillRenameFilesParams(event) {
        return {
            files: event.files.map((file) => ({
                oldUri: _uriConverter(file.oldUri),
                newUri: _uriConverter(file.newUri),
            })),
        };
    }
    function asWillDeleteFilesParams(event) {
        return {
            files: event.files.map((fileUri) => ({
                uri: _uriConverter(fileUri),
            })),
        };
    }
    function asTextDocumentPositionParams(textDocument, position) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument),
            position: asWorkerPosition(position)
        };
    }
    function asCompletionTriggerKind(triggerKind) {
        switch (triggerKind) {
            case code.CompletionTriggerKind.TriggerCharacter:
                return proto.CompletionTriggerKind.TriggerCharacter;
            case code.CompletionTriggerKind.TriggerForIncompleteCompletions:
                return proto.CompletionTriggerKind.TriggerForIncompleteCompletions;
            default:
                return proto.CompletionTriggerKind.Invoked;
        }
    }
    function asCompletionParams(textDocument, position, context) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument),
            position: asWorkerPosition(position),
            context: {
                triggerKind: asCompletionTriggerKind(context.triggerKind),
                triggerCharacter: context.triggerCharacter
            }
        };
    }
    function asSignatureHelpTriggerKind(triggerKind) {
        switch (triggerKind) {
            case code.SignatureHelpTriggerKind.Invoke:
                return proto.SignatureHelpTriggerKind.Invoked;
            case code.SignatureHelpTriggerKind.TriggerCharacter:
                return proto.SignatureHelpTriggerKind.TriggerCharacter;
            case code.SignatureHelpTriggerKind.ContentChange:
                return proto.SignatureHelpTriggerKind.ContentChange;
        }
    }
    function asParameterInformation(value) {
        // We leave the documentation out on purpose since it usually adds no
        // value for the server.
        return {
            label: value.label
        };
    }
    function asParameterInformations(values) {
        return values.map(asParameterInformation);
    }
    function asSignatureInformation(value) {
        // We leave the documentation out on purpose since it usually adds no
        // value for the server.
        return {
            label: value.label,
            parameters: asParameterInformations(value.parameters)
        };
    }
    function asSignatureInformations(values) {
        return values.map(asSignatureInformation);
    }
    function asSignatureHelp(value) {
        if (value === undefined) {
            return value;
        }
        return {
            signatures: asSignatureInformations(value.signatures),
            activeSignature: value.activeSignature,
            activeParameter: value.activeParameter
        };
    }
    function asSignatureHelpParams(textDocument, position, context) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument),
            position: asWorkerPosition(position),
            context: {
                isRetrigger: context.isRetrigger,
                triggerCharacter: context.triggerCharacter,
                triggerKind: asSignatureHelpTriggerKind(context.triggerKind),
                activeSignatureHelp: asSignatureHelp(context.activeSignatureHelp)
            }
        };
    }
    function asWorkerPosition(position) {
        return { line: position.line, character: position.character };
    }
    function asPosition(value) {
        if (value === undefined || value === null) {
            return value;
        }
        return { line: value.line > vscode_languageserver_protocol_1.uinteger.MAX_VALUE ? vscode_languageserver_protocol_1.uinteger.MAX_VALUE : value.line, character: value.character > vscode_languageserver_protocol_1.uinteger.MAX_VALUE ? vscode_languageserver_protocol_1.uinteger.MAX_VALUE : value.character };
    }
    function asPositions(value) {
        let result = [];
        for (let elem of value) {
            result.push(asPosition(elem));
        }
        return result;
    }
    function asRange(value) {
        if (value === undefined || value === null) {
            return value;
        }
        return { start: asPosition(value.start), end: asPosition(value.end) };
    }
    function asLocation(value) {
        if (value === undefined || value === null) {
            return value;
        }
        return proto.Location.create(asUri(value.uri), asRange(value.range));
    }
    function asDiagnosticSeverity(value) {
        switch (value) {
            case code.DiagnosticSeverity.Error:
                return proto.DiagnosticSeverity.Error;
            case code.DiagnosticSeverity.Warning:
                return proto.DiagnosticSeverity.Warning;
            case code.DiagnosticSeverity.Information:
                return proto.DiagnosticSeverity.Information;
            case code.DiagnosticSeverity.Hint:
                return proto.DiagnosticSeverity.Hint;
        }
    }
    function asDiagnosticTags(tags) {
        if (!tags) {
            return undefined;
        }
        let result = [];
        for (let tag of tags) {
            let converted = asDiagnosticTag(tag);
            if (converted !== undefined) {
                result.push(converted);
            }
        }
        return result.length > 0 ? result : undefined;
    }
    function asDiagnosticTag(tag) {
        switch (tag) {
            case code.DiagnosticTag.Unnecessary:
                return proto.DiagnosticTag.Unnecessary;
            case code.DiagnosticTag.Deprecated:
                return proto.DiagnosticTag.Deprecated;
            default:
                return undefined;
        }
    }
    function asRelatedInformation(item) {
        return {
            message: item.message,
            location: asLocation(item.location)
        };
    }
    function asRelatedInformations(items) {
        return items.map(asRelatedInformation);
    }
    function asDiagnosticCode(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (Is.number(value) || Is.string(value)) {
            return value;
        }
        return { value: value.value, target: asUri(value.target) };
    }
    function asDiagnostic(item) {
        const result = proto.Diagnostic.create(asRange(item.range), item.message);
        const protocolDiagnostic = item instanceof protocolDiagnostic_1.ProtocolDiagnostic ? item : undefined;
        if (protocolDiagnostic !== undefined && protocolDiagnostic.data !== undefined) {
            result.data = protocolDiagnostic.data;
        }
        const code = asDiagnosticCode(item.code);
        if (protocolDiagnostic_1.DiagnosticCode.is(code)) {
            if (protocolDiagnostic !== undefined && protocolDiagnostic.hasDiagnosticCode) {
                result.code = code;
            }
            else {
                result.code = code.value;
                result.codeDescription = { href: code.target };
            }
        }
        else {
            result.code = code;
        }
        if (Is.number(item.severity)) {
            result.severity = asDiagnosticSeverity(item.severity);
        }
        if (Array.isArray(item.tags)) {
            result.tags = asDiagnosticTags(item.tags);
        }
        if (item.relatedInformation) {
            result.relatedInformation = asRelatedInformations(item.relatedInformation);
        }
        if (item.source) {
            result.source = item.source;
        }
        return result;
    }
    function asDiagnostics(items) {
        if (items === undefined || items === null) {
            return items;
        }
        return items.map(asDiagnostic);
    }
    function asDocumentation(format, documentation) {
        switch (format) {
            case '$string':
                return documentation;
            case proto.MarkupKind.PlainText:
                return { kind: format, value: documentation };
            case proto.MarkupKind.Markdown:
                return { kind: format, value: documentation.value };
            default:
                return `Unsupported Markup content received. Kind is: ${format}`;
        }
    }
    function asCompletionItemTag(tag) {
        switch (tag) {
            case code.CompletionItemTag.Deprecated:
                return proto.CompletionItemTag.Deprecated;
        }
        return undefined;
    }
    function asCompletionItemTags(tags) {
        if (tags === undefined) {
            return tags;
        }
        const result = [];
        for (let tag of tags) {
            const converted = asCompletionItemTag(tag);
            if (converted !== undefined) {
                result.push(converted);
            }
        }
        return result;
    }
    function asCompletionItemKind(value, original) {
        if (original !== undefined) {
            return original;
        }
        return value + 1;
    }
    function asCompletionItem(item, labelDetailsSupport = false) {
        let labelDetails;
        let label;
        if (item.label2 !== undefined) {
            label = item.label2.name;
            if (labelDetailsSupport) {
                labelDetails = { parameters: item.label2.parameters, qualifier: item.label2.qualifier, type: item.label2.type };
            }
        }
        else {
            label = item.label;
        }
        let result = { label: label };
        if (labelDetails !== undefined) {
            result.labelDetails = labelDetails;
        }
        let protocolItem = item instanceof protocolCompletionItem_1.default ? item : undefined;
        if (item.detail) {
            result.detail = item.detail;
        }
        // We only send items back we created. So this can't be something else than
        // a string right now.
        if (item.documentation) {
            if (!protocolItem || protocolItem.documentationFormat === '$string') {
                result.documentation = item.documentation;
            }
            else {
                result.documentation = asDocumentation(protocolItem.documentationFormat, item.documentation);
            }
        }
        if (item.filterText) {
            result.filterText = item.filterText;
        }
        fillPrimaryInsertText(result, item);
        if (Is.number(item.kind)) {
            result.kind = asCompletionItemKind(item.kind, protocolItem && protocolItem.originalItemKind);
        }
        if (item.sortText) {
            result.sortText = item.sortText;
        }
        if (item.additionalTextEdits) {
            result.additionalTextEdits = asTextEdits(item.additionalTextEdits);
        }
        if (item.commitCharacters) {
            result.commitCharacters = item.commitCharacters.slice();
        }
        if (item.command) {
            result.command = asCommand(item.command);
        }
        if (item.preselect === true || item.preselect === false) {
            result.preselect = item.preselect;
        }
        const tags = asCompletionItemTags(item.tags);
        if (protocolItem) {
            if (protocolItem.data !== undefined) {
                result.data = protocolItem.data;
            }
            if (protocolItem.deprecated === true || protocolItem.deprecated === false) {
                if (protocolItem.deprecated === true && tags !== undefined && tags.length > 0) {
                    const index = tags.indexOf(code.CompletionItemTag.Deprecated);
                    if (index !== -1) {
                        tags.splice(index, 1);
                    }
                }
                result.deprecated = protocolItem.deprecated;
            }
            if (protocolItem.insertTextMode !== undefined) {
                result.insertTextMode = protocolItem.insertTextMode;
            }
        }
        if (tags !== undefined && tags.length > 0) {
            result.tags = tags;
        }
        if (result.insertTextMode === undefined && item.keepWhitespace === true) {
            result.insertTextMode = vscode_languageserver_protocol_1.InsertTextMode.adjustIndentation;
        }
        return result;
    }
    function fillPrimaryInsertText(target, source) {
        let format = proto.InsertTextFormat.PlainText;
        let text = undefined;
        let range = undefined;
        if (source.textEdit) {
            text = source.textEdit.newText;
            range = source.textEdit.range;
        }
        else if (source.insertText instanceof code.SnippetString) {
            format = proto.InsertTextFormat.Snippet;
            text = source.insertText.value;
        }
        else {
            text = source.insertText;
        }
        if (source.range) {
            range = source.range;
        }
        target.insertTextFormat = format;
        if (source.fromEdit && text !== undefined && range !== undefined) {
            target.textEdit = asCompletionTextEdit(text, range);
        }
        else {
            target.insertText = text;
        }
    }
    function asCompletionTextEdit(newText, range) {
        if (InsertReplaceRange.is(range)) {
            return proto.InsertReplaceEdit.create(newText, asRange(range.inserting), asRange(range.replacing));
        }
        else {
            return { newText, range: asRange(range) };
        }
    }
    function asTextEdit(edit) {
        return { range: asRange(edit.range), newText: edit.newText };
    }
    function asTextEdits(edits) {
        if (edits === undefined || edits === null) {
            return edits;
        }
        return edits.map(asTextEdit);
    }
    function asSymbolKind(item) {
        if (item <= code.SymbolKind.TypeParameter) {
            // Symbol kind is one based in the protocol and zero based in code.
            return (item + 1);
        }
        return proto.SymbolKind.Property;
    }
    function asSymbolTag(item) {
        return item;
    }
    function asSymbolTags(items) {
        return items.map(asSymbolTag);
    }
    function asReferenceParams(textDocument, position, options) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument),
            position: asWorkerPosition(position),
            context: { includeDeclaration: options.includeDeclaration }
        };
    }
    function asCodeAction(item) {
        let result = proto.CodeAction.create(item.title);
        if (item instanceof protocolCodeAction_1.default && item.data !== undefined) {
            result.data = item.data;
        }
        if (item.kind !== undefined) {
            result.kind = asCodeActionKind(item.kind);
        }
        if (item.diagnostics !== undefined) {
            result.diagnostics = asDiagnostics(item.diagnostics);
        }
        if (item.edit !== undefined) {
            throw new Error(`VS Code code actions can only be converted to a protocol code action without an edit.`);
        }
        if (item.command !== undefined) {
            result.command = asCommand(item.command);
        }
        if (item.isPreferred !== undefined) {
            result.isPreferred = item.isPreferred;
        }
        if (item.disabled !== undefined) {
            result.disabled = { reason: item.disabled.reason };
        }
        return result;
    }
    function asCodeActionContext(context) {
        if (context === undefined || context === null) {
            return context;
        }
        let only;
        if (context.only && Is.string(context.only.value)) {
            only = [context.only.value];
        }
        return proto.CodeActionContext.create(asDiagnostics(context.diagnostics), only);
    }
    function asCodeActionKind(item) {
        if (item === undefined || item === null) {
            return undefined;
        }
        return item.value;
    }
    function asCommand(item) {
        let result = proto.Command.create(item.title, item.command);
        if (item.arguments) {
            result.arguments = item.arguments;
        }
        return result;
    }
    function asCodeLens(item) {
        let result = proto.CodeLens.create(asRange(item.range));
        if (item.command) {
            result.command = asCommand(item.command);
        }
        if (item instanceof protocolCodeLens_1.default) {
            if (item.data) {
                result.data = item.data;
            }
        }
        return result;
    }
    function asFormattingOptions(options, fileOptions) {
        const result = { tabSize: options.tabSize, insertSpaces: options.insertSpaces };
        if (fileOptions.trimTrailingWhitespace) {
            result.trimTrailingWhitespace = true;
        }
        if (fileOptions.trimFinalNewlines) {
            result.trimFinalNewlines = true;
        }
        if (fileOptions.insertFinalNewline) {
            result.insertFinalNewline = true;
        }
        return result;
    }
    function asDocumentSymbolParams(textDocument) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument)
        };
    }
    function asCodeLensParams(textDocument) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument)
        };
    }
    function asDocumentLink(item) {
        let result = proto.DocumentLink.create(asRange(item.range));
        if (item.target) {
            result.target = asUri(item.target);
        }
        if (item.tooltip !== undefined) {
            result.tooltip = item.tooltip;
        }
        let protocolItem = item instanceof protocolDocumentLink_1.default ? item : undefined;
        if (protocolItem && protocolItem.data) {
            result.data = protocolItem.data;
        }
        return result;
    }
    function asDocumentLinkParams(textDocument) {
        return {
            textDocument: asTextDocumentIdentifier(textDocument)
        };
    }
    function asCallHierarchyItem(value) {
        const result = {
            name: value.name,
            kind: asSymbolKind(value.kind),
            uri: asUri(value.uri),
            range: asRange(value.range),
            selectionRange: asRange(value.selectionRange)
        };
        if (value.detail !== undefined && value.detail.length > 0) {
            result.detail = value.detail;
        }
        if (value.tags !== undefined) {
            result.tags = asSymbolTags(value.tags);
        }
        if (value instanceof protocolCallHierarchyItem_1.default && value.data !== undefined) {
            result.data = value.data;
        }
        return result;
    }
    return {
        asUri,
        asTextDocumentIdentifier,
        asVersionedTextDocumentIdentifier,
        asOpenTextDocumentParams,
        asChangeTextDocumentParams,
        asCloseTextDocumentParams,
        asSaveTextDocumentParams,
        asWillSaveTextDocumentParams,
        asDidCreateFilesParams,
        asDidRenameFilesParams,
        asDidDeleteFilesParams,
        asWillCreateFilesParams,
        asWillRenameFilesParams,
        asWillDeleteFilesParams,
        asTextDocumentPositionParams,
        asCompletionParams,
        asSignatureHelpParams,
        asWorkerPosition,
        asRange,
        asPosition,
        asPositions,
        asLocation,
        asDiagnosticSeverity,
        asDiagnosticTag,
        asDiagnostic,
        asDiagnostics,
        asCompletionItem,
        asTextEdit,
        asSymbolKind,
        asSymbolTag,
        asSymbolTags,
        asReferenceParams,
        asCodeAction,
        asCodeActionContext,
        asCommand,
        asCodeLens,
        asFormattingOptions,
        asDocumentSymbolParams,
        asCodeLensParams,
        asDocumentLink,
        asDocumentLinkParams,
        asCallHierarchyItem
    };
}
exports.createConverter = createConverter;
//# sourceMappingURL=codeConverter.js.map

/***/ }),
/* 95 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getExtensionApi = exports.getJavaExtension = exports.isLombokSupportEnabled = exports.getUserSettingsPath = exports.VM_ARGS_KEY = void 0;
const vscode = __webpack_require__(1);
const constants_1 = __webpack_require__(96);
exports.VM_ARGS_KEY = "java.jdt.ls.vmargs";
function getUserSettingsPath(platform) {
    const map = {
        win32: process.env.APPDATA + '\\Code\\User\\settings.json',
        darwin: process.env.HOME + '/Library/Application Support/Code/User/settings.json',
        linux: process.env.HOME + '/.config/Code/User/settings.json'
    };
    return map[platform];
}
exports.getUserSettingsPath = getUserSettingsPath;
function isLombokSupportEnabled() {
    return vscode.workspace.getConfiguration().get("java.jdt.ls.lombokSupport.enabled");
}
exports.isLombokSupportEnabled = isLombokSupportEnabled;
function getJavaExtension() {
    return vscode.extensions.getExtension(constants_1.JAVA_EXTENSION_ID);
}
exports.getJavaExtension = getJavaExtension;
function getExtensionApi() {
    return __awaiter(this, void 0, void 0, function* () {
        const extension = getJavaExtension();
        if (extension === undefined) {
            return undefined;
        }
        const extensionApi = yield extension.activate();
        if (extensionApi.getClasspaths === undefined) {
            throw undefined;
        }
        return extensionApi;
    });
}
exports.getExtensionApi = getExtensionApi;


/***/ }),
/* 96 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JAVA_EXTENSION_ID = void 0;
exports.JAVA_EXTENSION_ID = "redhat.java";


/***/ }),
/* 97 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isLombokExists = void 0;
const vscode = __webpack_require__(1);
const path = __webpack_require__(22);
const util_1 = __webpack_require__(95);
const commands_1 = __webpack_require__(46);
const lombokJarRegex = /lombok-\d+.*\.jar$/;
function isLombokExists() {
    return __awaiter(this, void 0, void 0, function* () {
        const projectUris = yield getAllJavaProjects();
        const extensionApi = yield (0, util_1.getExtensionApi)();
        if (!extensionApi) {
            return false;
        }
        for (const projectUri of projectUris) {
            const classpathResult = yield extensionApi.getClasspaths(projectUri, { scope: 'test' });
            for (const classpath of classpathResult.classpaths) {
                if (lombokJarRegex.test(classpath)) {
                    return true;
                }
            }
        }
        return false;
    });
}
exports.isLombokExists = isLombokExists;
function getAllJavaProjects(excludeDefaultProject = true) {
    return __awaiter(this, void 0, void 0, function* () {
        let projectUris = yield (0, commands_1.executeJavaLanguageServerCommand)(commands_1.Commands.GET_ALL_JAVA_PROJECTS);
        if (excludeDefaultProject) {
            projectUris = projectUris.filter((uriString) => {
                const projectPath = vscode.Uri.parse(uriString).fsPath;
                return path.basename(projectPath) !== "jdt.ls-java-project";
            });
        }
        return projectUris;
    });
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			0: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map