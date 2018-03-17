(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.nise = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
"use strict";

// cache a reference to setTimeout, so that our reference won't be stubbed out
// when using fake timers and errors will still get logged
// https://github.com/cjohansen/Sinon.JS/issues/381
var realSetTimeout = setTimeout;

function configureLogger(config) {
    config = config || {};
    // Function which prints errors.
    if (!config.hasOwnProperty("logger")) {
        config.logger = function () { };
    }
    // When set to true, any errors logged will be thrown immediately;
    // If set to false, the errors will be thrown in separate execution frame.
    if (!config.hasOwnProperty("useImmediateExceptions")) {
        config.useImmediateExceptions = true;
    }
    // wrap realSetTimeout with something we can stub in tests
    if (!config.hasOwnProperty("setTimeout")) {
        config.setTimeout = realSetTimeout;
    }

    return function logError(label, e) {
        var msg = label + " threw exception: ";
        var err = { name: e.name || label, message: e.message || e.toString(), stack: e.stack };

        function throwLoggedError() {
            err.message = msg + err.message;
            throw err;
        }

        config.logger(msg + "[" + err.name + "] " + err.message);

        if (err.stack) {
            config.logger(err.stack);
        }

        if (config.useImmediateExceptions) {
            throwLoggedError();
        } else {
            config.setTimeout(throwLoggedError, 0);
        }
    };
}

module.exports = configureLogger;

},{}],2:[function(require,module,exports){
"use strict";

var Event = require("./event");

function CustomEvent(type, customData, target) {
    this.initEvent(type, false, false, target);
    this.detail = customData.detail || null;
}

CustomEvent.prototype = new Event();

CustomEvent.prototype.constructor = CustomEvent;

module.exports = CustomEvent;

},{"./event":4}],3:[function(require,module,exports){
"use strict";

function flattenOptions(options) {
    if (options !== Object(options)) {
        return {
            capture: Boolean(options),
            once: false,
            passive: false
        };
    }
    return {
        capture: Boolean(options.capture),
        once: Boolean(options.once),
        passive: Boolean(options.passive)
    };
}
function not(fn) {
    return function () {
        return !fn.apply(this, arguments);
    };
}
function hasListenerFilter(listener, capture) {
    return function (listenerSpec) {
        return listenerSpec.capture === capture
            && listenerSpec.listener === listener;
    };
}

var EventTarget = {
    // https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener
    addEventListener: function addEventListener(event, listener, providedOptions) {
        // 3. Let capture, passive, and once be the result of flattening more options.
        // Flatten property before executing step 2,
        // feture detection is usually based on registering handler with options object,
        // that has getter defined
        // addEventListener("load", () => {}, {
        //    get once() { supportsOnce = true; }
        // });
        var options = flattenOptions(providedOptions);

        // 2. If callback is null, then return.
        if (listener == null) {
            return;
        }

        this.eventListeners = this.eventListeners || {};
        this.eventListeners[event] = this.eventListeners[event] || [];

        // 4. If context object’s associated list of event listener
        //    does not contain an event listener whose type is type,
        //    callback is callback, and capture is capture, then append
        //    a new event listener to it, whose type is type, callback is
        //    callback, capture is capture, passive is passive, and once is once.
        if (!this.eventListeners[event].some(hasListenerFilter(listener, options.capture))) {
            this.eventListeners[event].push({
                listener: listener,
                capture: options.capture,
                once: options.once
            });
        }
    },

    // https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener
    removeEventListener: function removeEventListener(event, listener, providedOptions) {
        if (!this.eventListeners || !this.eventListeners[event]) {
            return;
        }

        // 2. Let capture be the result of flattening options.
        var options = flattenOptions(providedOptions);

        // 3. If there is an event listener in the associated list of
        //    event listeners whose type is type, callback is callback,
        //    and capture is capture, then set that event listener’s
        //    removed to true and remove it from the associated list of event listeners.
        this.eventListeners[event] = this.eventListeners[event]
            .filter(not(hasListenerFilter(listener, options.capture)));
    },

    dispatchEvent: function dispatchEvent(event) {
        if (!this.eventListeners || !this.eventListeners[event.type]) {
            return Boolean(event.defaultPrevented);
        }

        var self = this;
        var type = event.type;
        var listeners = self.eventListeners[type];

        // Remove listeners, that should be dispatched once
        // before running dispatch loop to avoid nested dispatch issues
        self.eventListeners[type] = listeners.filter(function (listenerSpec) {
            return !listenerSpec.once;
        });
        listeners.forEach(function (listenerSpec) {
            var listener = listenerSpec.listener;
            if (typeof listener === "function") {
                listener.call(self, event);
            } else {
                listener.handleEvent(event);
            }
        });

        return Boolean(event.defaultPrevented);
    }
};

module.exports = EventTarget;

},{}],4:[function(require,module,exports){
"use strict";

function Event(type, bubbles, cancelable, target) {
    this.initEvent(type, bubbles, cancelable, target);
}

Event.prototype = {
    initEvent: function (type, bubbles, cancelable, target) {
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
        this.target = target;
        this.currentTarget = target;
    },

    stopPropagation: function () {},

    preventDefault: function () {
        this.defaultPrevented = true;
    }
};

module.exports = Event;

},{}],5:[function(require,module,exports){
"use strict";

module.exports = {
    Event: require("./event"),
    ProgressEvent: require("./progress-event"),
    CustomEvent: require("./custom-event"),
    EventTarget: require("./event-target")
};

},{"./custom-event":2,"./event":4,"./event-target":3,"./progress-event":6}],6:[function(require,module,exports){
"use strict";

var Event = require("./event");

function ProgressEvent(type, progressEventRaw, target) {
    this.initEvent(type, false, false, target);
    this.loaded = typeof progressEventRaw.loaded === "number" ? progressEventRaw.loaded : null;
    this.total = typeof progressEventRaw.total === "number" ? progressEventRaw.total : null;
    this.lengthComputable = !!progressEventRaw.total;
}

ProgressEvent.prototype = new Event();

ProgressEvent.prototype.constructor = ProgressEvent;

module.exports = ProgressEvent;

},{"./event":4}],7:[function(require,module,exports){
"use strict";

var lolex = require("lolex");
var fakeServer = require("./index");

function Server() {}
Server.prototype = fakeServer;

var fakeServerWithClock = new Server();

fakeServerWithClock.addRequest = function addRequest(xhr) {
    if (xhr.async) {
        if (typeof setTimeout.clock === "object") {
            this.clock = setTimeout.clock;
        } else {
            this.clock = lolex.install();
            this.resetClock = true;
        }

        if (!this.longestTimeout) {
            var clockSetTimeout = this.clock.setTimeout;
            var clockSetInterval = this.clock.setInterval;
            var server = this;

            this.clock.setTimeout = function (fn, timeout) {
                server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                return clockSetTimeout.apply(this, arguments);
            };

            this.clock.setInterval = function (fn, timeout) {
                server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                return clockSetInterval.apply(this, arguments);
            };
        }
    }

    return fakeServer.addRequest.call(this, xhr);
};

fakeServerWithClock.respond = function respond() {
    var returnVal = fakeServer.respond.apply(this, arguments);

    if (this.clock) {
        this.clock.tick(this.longestTimeout || 0);
        this.longestTimeout = 0;

        if (this.resetClock) {
            this.clock.uninstall();
            this.resetClock = false;
        }
    }

    return returnVal;
};

fakeServerWithClock.restore = function restore() {
    if (this.clock) {
        this.clock.uninstall();
    }

    return fakeServer.restore.apply(this, arguments);
};

module.exports = fakeServerWithClock;

},{"./index":9,"lolex":15}],8:[function(require,module,exports){
"use strict";

var formatio = require("@sinonjs/formatio");

var formatter = formatio.configure({
    quoteStrings: false,
    limitChildrenCount: 250
});

module.exports = function format() {
    return formatter.ascii.apply(formatter, arguments);
};

},{"@sinonjs/formatio":12}],9:[function(require,module,exports){
"use strict";

var fakeXhr = require("../fake-xhr");
var push = [].push;
var format = require("./format");
var configureLogError = require("../configure-logger");
var pathToRegexp = require("path-to-regexp");

var supportsArrayBuffer = typeof ArrayBuffer !== "undefined";

function responseArray(handler) {
    var response = handler;

    if (Object.prototype.toString.call(handler) !== "[object Array]") {
        response = [200, {}, handler];
    }

    if (typeof response[2] !== "string") {
        if (!supportsArrayBuffer) {
            throw new TypeError("Fake server response body should be a string, but was " +
                                typeof response[2]);
        }
        else if (!(response[2] instanceof ArrayBuffer)) {
            throw new TypeError("Fake server response body should be a string or ArrayBuffer, but was " +
                                typeof response[2]);
        }
    }

    return response;
}

function getDefaultWindowLocation() {
    return { "host": "localhost", "protocol": "http" };
}

function getWindowLocation() {
    if (typeof window === "undefined") {
        // Fallback
        return getDefaultWindowLocation();
    }

    if (typeof window.location !== "undefined") {
        // Browsers place location on window
        return window.location;
    }

    if ((typeof window.window !== "undefined") && (typeof window.window.location !== "undefined")) {
        // React Native on Android places location on window.window
        return window.window.location;
    }

    return getDefaultWindowLocation();
}

function matchOne(response, reqMethod, reqUrl) {
    var rmeth = response.method;
    var matchMethod = !rmeth || rmeth.toLowerCase() === reqMethod.toLowerCase();
    var url = response.url;
    var matchUrl = !url || url === reqUrl || (typeof url.test === "function" && url.test(reqUrl));

    return matchMethod && matchUrl;
}

function match(response, request) {
    var wloc = getWindowLocation();

    var rCurrLoc = new RegExp("^" + wloc.protocol + "//" + wloc.host);

    var requestUrl = request.url;

    if (!/^https?:\/\//.test(requestUrl) || rCurrLoc.test(requestUrl)) {
        requestUrl = requestUrl.replace(rCurrLoc, "");
    }

    if (matchOne(response, this.getHTTPMethod(request), requestUrl)) {
        if (typeof response.response === "function") {
            var ru = response.url;
            var args = [request].concat(ru && typeof ru.exec === "function" ? ru.exec(requestUrl).slice(1) : []);
            return response.response.apply(response, args);
        }

        return true;
    }

    return false;
}

function incrementRequestCount() {
    var count = ++this.requestCount;

    this.requested = true;

    this.requestedOnce = count === 1;
    this.requestedTwice = count === 2;
    this.requestedThrice = count === 3;

    this.firstRequest = this.getRequest(0);
    this.secondRequest = this.getRequest(1);
    this.thirdRequest = this.getRequest(2);

    this.lastRequest = this.getRequest(count - 1);
}

var fakeServer = {
    create: function (config) {
        var server = Object.create(this);
        server.configure(config);
        this.xhr = fakeXhr.useFakeXMLHttpRequest();
        server.requests = [];
        server.requestCount = 0;
        server.queue = [];
        server.responses = [];


        this.xhr.onCreate = function (xhrObj) {
            xhrObj.unsafeHeadersEnabled = function () {
                return !(server.unsafeHeadersEnabled === false);
            };
            server.addRequest(xhrObj);
        };

        return server;
    },

    configure: function (config) {
        var self = this;
        var whitelist = {
            "autoRespond": true,
            "autoRespondAfter": true,
            "respondImmediately": true,
            "fakeHTTPMethods": true,
            "logger": true,
            "unsafeHeadersEnabled": true
        };

        config = config || {};

        Object.keys(config).forEach(function (setting) {
            if (setting in whitelist) {
                self[setting] = config[setting];
            }
        });

        self.logError = configureLogError(config);
    },

    addRequest: function addRequest(xhrObj) {
        var server = this;
        push.call(this.requests, xhrObj);

        incrementRequestCount.call(this);

        xhrObj.onSend = function () {
            server.handleRequest(this);

            if (server.respondImmediately) {
                server.respond();
            } else if (server.autoRespond && !server.responding) {
                setTimeout(function () {
                    server.responding = false;
                    server.respond();
                }, server.autoRespondAfter || 10);

                server.responding = true;
            }
        };
    },

    getHTTPMethod: function getHTTPMethod(request) {
        if (this.fakeHTTPMethods && /post/i.test(request.method)) {
            var matches = (request.requestBody || "").match(/_method=([^\b;]+)/);
            return matches ? matches[1] : request.method;
        }

        return request.method;
    },

    handleRequest: function handleRequest(xhr) {
        if (xhr.async) {
            push.call(this.queue, xhr);
        } else {
            this.processRequest(xhr);
        }
    },

    logger: function () {
        // no-op; override via configure()
    },

    logError: configureLogError({}),

    log: function log(response, request) {
        var str;

        str = "Request:\n" + format(request) + "\n\n";
        str += "Response:\n" + format(response) + "\n\n";

        if (typeof this.logger === "function") {
            this.logger(str);
        }
    },

    respondWith: function respondWith(method, url, body) {
        if (arguments.length === 1 && typeof method !== "function") {
            this.response = responseArray(method);
            return;
        }

        if (arguments.length === 1) {
            body = method;
            url = method = null;
        }

        if (arguments.length === 2) {
            body = url;
            url = method;
            method = null;
        }

        push.call(this.responses, {
            method: method,
            url: typeof url === "string" && url !== "" ? pathToRegexp(url) : url,
            response: typeof body === "function" ? body : responseArray(body)
        });
    },

    respond: function respond() {
        if (arguments.length > 0) {
            this.respondWith.apply(this, arguments);
        }

        var queue = this.queue || [];
        var requests = queue.splice(0, queue.length);
        var self = this;

        requests.forEach(function (request) {
            self.processRequest(request);
        });
    },

    processRequest: function processRequest(request) {
        try {
            if (request.aborted) {
                return;
            }

            var response = this.response || [404, {}, ""];

            if (this.responses) {
                for (var l = this.responses.length, i = l - 1; i >= 0; i--) {
                    if (match.call(this, this.responses[i], request)) {
                        response = this.responses[i].response;
                        break;
                    }
                }
            }

            if (request.readyState !== 4) {
                this.log(response, request);

                request.respond(response[0], response[1], response[2]);
            }
        } catch (e) {
            this.logError("Fake server request processing", e);
        }
    },

    restore: function restore() {
        return this.xhr.restore && this.xhr.restore.apply(this.xhr, arguments);
    },

    getRequest: function getRequest(index) {
        return this.requests[index] || null;
    },

    reset: function reset() {
        this.resetBehavior();
        this.resetHistory();
    },

    resetBehavior: function resetBehavior() {
        this.responses.length = this.queue.length = 0;
    },

    resetHistory: function resetHistory() {
        this.requests.length = this.requestCount = 0;

        this.requestedOnce = this.requestedTwice = this.requestedThrice = this.requested = false;

        this.firstRequest = this.secondRequest = this.thirdRequest = this.lastRequest = null;
    }
};

module.exports = fakeServer;

},{"../configure-logger":1,"../fake-xhr":10,"./format":8,"path-to-regexp":16}],10:[function(require,module,exports){
(function (global){
"use strict";

var configureLogError = require("../configure-logger");
var sinonEvent = require("../event");
var extend = require("just-extend");

function getWorkingXHR(globalScope) {
    var supportsXHR = typeof globalScope.XMLHttpRequest !== "undefined";
    if (supportsXHR) {
        return globalScope.XMLHttpRequest;
    }

    var supportsActiveX = typeof globalScope.ActiveXObject !== "undefined";
    if (supportsActiveX) {
        return function () {
            return new globalScope.ActiveXObject("MSXML2.XMLHTTP.3.0");
        };
    }

    return false;
}

var supportsProgress = typeof ProgressEvent !== "undefined";
var supportsCustomEvent = typeof CustomEvent !== "undefined";
var supportsFormData = typeof FormData !== "undefined";
var isReactNative = global.navigator && global.navigator.product === "ReactNative";
var sinonXhr = { XMLHttpRequest: global.XMLHttpRequest };
sinonXhr.GlobalXMLHttpRequest = global.XMLHttpRequest;
sinonXhr.GlobalActiveXObject = global.ActiveXObject;
sinonXhr.supportsActiveX = typeof sinonXhr.GlobalActiveXObject !== "undefined";
sinonXhr.supportsXHR = typeof sinonXhr.GlobalXMLHttpRequest !== "undefined";
sinonXhr.workingXHR = getWorkingXHR(global);
sinonXhr.supportsTimeout =
    (sinonXhr.supportsXHR && "timeout" in (new sinonXhr.GlobalXMLHttpRequest()));
sinonXhr.supportsCORS = isReactNative ||
    (sinonXhr.supportsXHR && "withCredentials" in (new sinonXhr.GlobalXMLHttpRequest()));

var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
};


function EventTargetHandler() {
    var self = this;
    var events = ["loadstart", "progress", "abort", "error", "load", "timeout", "loadend"];

    function addEventListener(eventName) {
        self.addEventListener(eventName, function (event) {
            var listener = self["on" + eventName];

            if (listener && typeof listener === "function") {
                listener.call(this, event);
            }
        });
    }

    events.forEach(addEventListener);
}

EventTargetHandler.prototype = sinonEvent.EventTarget;

// Note that for FakeXMLHttpRequest to work pre ES5
// we lose some of the alignment with the spec.
// To ensure as close a match as possible,
// set responseType before calling open, send or respond;
function FakeXMLHttpRequest(config) {
    EventTargetHandler.call(this);
    this.readyState = FakeXMLHttpRequest.UNSENT;
    this.requestHeaders = {};
    this.requestBody = null;
    this.status = 0;
    this.statusText = "";
    this.upload = new EventTargetHandler();
    this.responseType = "";
    this.response = "";
    this.logError = configureLogError(config);

    if (sinonXhr.supportsTimeout) {
        this.timeout = 0;
    }

    if (sinonXhr.supportsCORS) {
        this.withCredentials = false;
    }

    if (typeof FakeXMLHttpRequest.onCreate === "function") {
        FakeXMLHttpRequest.onCreate(this);
    }
}

function verifyState(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
        throw new Error("INVALID_STATE_ERR");
    }

    if (xhr.sendFlag) {
        throw new Error("INVALID_STATE_ERR");
    }
}

function getHeader(headers, header) {
    var foundHeader = Object.keys(headers).filter(function (h) {
        return h.toLowerCase() === header.toLowerCase();
    });

    return foundHeader[0] || null;
}

function excludeSetCookie2Header(header) {
    return !/^Set-Cookie2?$/i.test(header);
}

// largest arity in XHR is 5 - XHR#open
var apply = function (obj, method, args) {
    switch (args.length) {
        case 0: return obj[method]();
        case 1: return obj[method](args[0]);
        case 2: return obj[method](args[0], args[1]);
        case 3: return obj[method](args[0], args[1], args[2]);
        case 4: return obj[method](args[0], args[1], args[2], args[3]);
        case 5: return obj[method](args[0], args[1], args[2], args[3], args[4]);
        default: throw new Error("Unhandled case");
    }
};

FakeXMLHttpRequest.filters = [];
FakeXMLHttpRequest.addFilter = function addFilter(fn) {
    this.filters.push(fn);
};
FakeXMLHttpRequest.defake = function defake(fakeXhr, xhrArgs) {
    var xhr = new sinonXhr.workingXHR(); // eslint-disable-line new-cap

    [
        "open",
        "setRequestHeader",
        "send",
        "abort",
        "getResponseHeader",
        "getAllResponseHeaders",
        "addEventListener",
        "overrideMimeType",
        "removeEventListener"
    ].forEach(function (method) {
        fakeXhr[method] = function () {
            return apply(xhr, method, arguments);
        };
    });

    var copyAttrs = function (args) {
        args.forEach(function (attr) {
            fakeXhr[attr] = xhr[attr];
        });
    };

    var stateChange = function stateChange() {
        fakeXhr.readyState = xhr.readyState;
        if (xhr.readyState >= FakeXMLHttpRequest.HEADERS_RECEIVED) {
            copyAttrs(["status", "statusText"]);
        }
        if (xhr.readyState >= FakeXMLHttpRequest.LOADING) {
            copyAttrs(["responseText", "response"]);
        }
        if (xhr.readyState === FakeXMLHttpRequest.DONE) {
            copyAttrs(["responseXML"]);
        }
        if (fakeXhr.onreadystatechange) {
            fakeXhr.onreadystatechange.call(fakeXhr, { target: fakeXhr, currentTarget: fakeXhr });
        }
    };

    if (xhr.addEventListener) {
        Object.keys(fakeXhr.eventListeners).forEach(function (event) {
            /*eslint-disable no-loop-func*/
            fakeXhr.eventListeners[event].forEach(function (handler) {
                xhr.addEventListener(event, handler.listener, {
                    capture: handler.capture,
                    once: handler.once
                });
            });
            /*eslint-enable no-loop-func*/
        });

        xhr.addEventListener("readystatechange", stateChange);
    } else {
        xhr.onreadystatechange = stateChange;
    }
    apply(xhr, "open", xhrArgs);
};
FakeXMLHttpRequest.useFilters = false;

function verifyRequestOpened(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
        throw new Error("INVALID_STATE_ERR - " + xhr.readyState);
    }
}

function verifyRequestSent(xhr) {
    if (xhr.readyState === FakeXMLHttpRequest.DONE) {
        throw new Error("Request done");
    }
}

function verifyHeadersReceived(xhr) {
    if (xhr.async && xhr.readyState !== FakeXMLHttpRequest.HEADERS_RECEIVED) {
        throw new Error("No headers received");
    }
}

function verifyResponseBodyType(body, responseType) {
    var error = null;
    var isString = typeof body === "string";

    if (responseType === "arraybuffer") {

        if (!isString && !(body instanceof ArrayBuffer)) {
            error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                               body + ", which is not a string or ArrayBuffer.");
            error.name = "InvalidBodyException";
        }
    }
    else if (!isString) {
        error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                           body + ", which is not a string.");
        error.name = "InvalidBodyException";
    }

    if (error) {
        throw error;
    }
}

function isXmlContentType(contentType) {
    return !contentType || /(text\/xml)|(application\/xml)|(\+xml)/.test(contentType);
}

function convertResponseBody(responseType, contentType, body) {
    if (responseType === "" || responseType === "text") {
        return body;
    } else if (responseType === "json") {
        try {
            return JSON.parse(body);
        } catch (e) {
            // Return parsing failure as null
            return null;
        }
    } else if (responseType === "document") {
        if (isXmlContentType(contentType)) {
            return FakeXMLHttpRequest.parseXML(body);
        }
        return null;
    }
    throw new Error("Invalid responseType " + responseType);
}

function clearResponse(xhr) {
    if (xhr.responseType === "" || xhr.responseType === "text") {
        xhr.response = xhr.responseText = "";
    } else {
        xhr.response = xhr.responseText = null;
    }
    xhr.responseXML = null;
}

/**
 * Steps to follow when there is an error, according to:
 * https://xhr.spec.whatwg.org/#request-error-steps
 */
function requestErrorSteps(xhr) {
    clearResponse(xhr);
    xhr.errorFlag = true;
    xhr.requestHeaders = {};
    xhr.responseHeaders = {};

    if (xhr.readyState !== FakeXMLHttpRequest.UNSENT && xhr.sendFlag
        && xhr.readyState !== FakeXMLHttpRequest.DONE) {
        xhr.readyStateChange(FakeXMLHttpRequest.DONE);
        xhr.sendFlag = false;
    }
}

FakeXMLHttpRequest.parseXML = function parseXML(text) {
    // Treat empty string as parsing failure
    if (text !== "") {
        try {
            if (typeof DOMParser !== "undefined") {
                var parser = new DOMParser();
                return parser.parseFromString(text, "text/xml");
            }
            var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(text);
            return xmlDoc;
        } catch (e) {
            // Unable to parse XML - no biggie
        }
    }

    return null;
};

FakeXMLHttpRequest.statusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi-Status",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
};

extend(FakeXMLHttpRequest.prototype, sinonEvent.EventTarget, {
    async: true,

    open: function open(method, url, async, username, password) {
        this.method = method;
        this.url = url;
        this.async = typeof async === "boolean" ? async : true;
        this.username = username;
        this.password = password;
        clearResponse(this);
        this.requestHeaders = {};
        this.sendFlag = false;

        if (FakeXMLHttpRequest.useFilters === true) {
            var xhrArgs = arguments;
            var defake = FakeXMLHttpRequest.filters.some(function (filter) {
                return filter.apply(this, xhrArgs);
            });
            if (defake) {
                FakeXMLHttpRequest.defake(this, arguments);
                return;
            }
        }
        this.readyStateChange(FakeXMLHttpRequest.OPENED);
    },

    readyStateChange: function readyStateChange(state) {
        this.readyState = state;

        var readyStateChangeEvent = new sinonEvent.Event("readystatechange", false, false, this);
        var event, progress;

        if (typeof this.onreadystatechange === "function") {
            try {
                this.onreadystatechange(readyStateChangeEvent);
            } catch (e) {
                this.logError("Fake XHR onreadystatechange handler", e);
            }
        }

        if (this.readyState === FakeXMLHttpRequest.DONE) {
            if (this.timedOut || this.aborted || this.status === 0) {
                progress = {loaded: 0, total: 0};
                event = (this.timedOut && "timeout") || (this.aborted && "abort") || "error";
            } else {
                progress = {loaded: 100, total: 100};
                event = "load";
            }

            if (supportsProgress) {
                this.upload.dispatchEvent(new sinonEvent.ProgressEvent("progress", progress, this));
                this.upload.dispatchEvent(new sinonEvent.ProgressEvent(event, progress, this));
                this.upload.dispatchEvent(new sinonEvent.ProgressEvent("loadend", progress, this));
            }

            this.dispatchEvent(new sinonEvent.ProgressEvent("progress", progress, this));
            this.dispatchEvent(new sinonEvent.ProgressEvent(event, progress, this));
            this.dispatchEvent(new sinonEvent.ProgressEvent("loadend", progress, this));
        }

        this.dispatchEvent(readyStateChangeEvent);
    },

    setRequestHeader: function setRequestHeader(header, value) {
        verifyState(this);

        var checkUnsafeHeaders = true;
        if (typeof this.unsafeHeadersEnabled === "function") {
            checkUnsafeHeaders = this.unsafeHeadersEnabled();
        }

        if (checkUnsafeHeaders && (getHeader(unsafeHeaders, header) !== null || /^(Sec-|Proxy-)/i.test(header))) {
            throw new Error("Refused to set unsafe header \"" + header + "\"");
        }

        var existingHeader = getHeader(this.requestHeaders, header);
        if (existingHeader) {
            this.requestHeaders[existingHeader] += "," + value;
        } else {
            this.requestHeaders[header] = value;
        }
    },

    setStatus: function setStatus(status) {
        var sanitizedStatus = typeof status === "number" ? status : 200;

        verifyRequestOpened(this);
        this.status = sanitizedStatus;
        this.statusText = FakeXMLHttpRequest.statusCodes[sanitizedStatus];
    },

    // Helps testing
    setResponseHeaders: function setResponseHeaders(headers) {
        verifyRequestOpened(this);

        var responseHeaders = this.responseHeaders = {};

        Object.keys(headers).forEach(function (header) {
            responseHeaders[header] = headers[header];
        });

        if (this.async) {
            this.readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
        } else {
            this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
        }
    },

    // Currently treats ALL data as a DOMString (i.e. no Document)
    send: function send(data) {
        verifyState(this);

        if (!/^(head)$/i.test(this.method)) {
            var contentType = getHeader(this.requestHeaders, "Content-Type");
            if (this.requestHeaders[contentType]) {
                var value = this.requestHeaders[contentType].split(";");
                this.requestHeaders[contentType] = value[0] + ";charset=utf-8";
            } else if (supportsFormData && !(data instanceof FormData)) {
                this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";
            }

            this.requestBody = data;
        }

        this.errorFlag = false;
        this.sendFlag = this.async;
        clearResponse(this);
        this.readyStateChange(FakeXMLHttpRequest.OPENED);

        if (typeof this.onSend === "function") {
            this.onSend(this);
        }

        // Only listen if setInterval and Date are a stubbed.
        if (sinonXhr.supportsTimeout && typeof setInterval.clock === "object" && typeof Date.clock === "object") {
            var initiatedTime = Date.now();
            var self = this;

            // Listen to any possible tick by fake timers and check to see if timeout has
            // been exceeded. It's important to note that timeout can be changed while a request
            // is in flight, so we must check anytime the end user forces a clock tick to make
            // sure timeout hasn't changed.
            // https://xhr.spec.whatwg.org/#dfnReturnLink-2
            var clearIntervalId = setInterval(function () {
                // Check if the readyState has been reset or is done. If this is the case, there
                // should be no timeout. This will also prevent aborted requests and
                // fakeServerWithClock from triggering unnecessary responses.
                if (self.readyState === FakeXMLHttpRequest.UNSENT
                  || self.readyState === FakeXMLHttpRequest.DONE) {
                    clearInterval(clearIntervalId);
                } else if (typeof self.timeout === "number" && self.timeout > 0) {
                    if (Date.now() >= (initiatedTime + self.timeout)) {
                        self.triggerTimeout();
                        clearInterval(clearIntervalId);
                    }
                }
            }, 1);
        }

        this.dispatchEvent(new sinonEvent.Event("loadstart", false, false, this));
    },

    abort: function abort() {
        this.aborted = true;
        requestErrorSteps(this);
        this.readyState = FakeXMLHttpRequest.UNSENT;
    },

    error: function () {
        clearResponse(this);
        this.errorFlag = true;
        this.requestHeaders = {};
        this.responseHeaders = {};

        this.readyStateChange(FakeXMLHttpRequest.DONE);
    },

    triggerTimeout: function triggerTimeout() {
        if (sinonXhr.supportsTimeout) {
            this.timedOut = true;
            requestErrorSteps(this);
        }
    },

    getResponseHeader: function getResponseHeader(header) {
        if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
            return null;
        }

        if (/^Set-Cookie2?$/i.test(header)) {
            return null;
        }

        header = getHeader(this.responseHeaders, header);

        return this.responseHeaders[header] || null;
    },

    getAllResponseHeaders: function getAllResponseHeaders() {
        if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
            return "";
        }

        var responseHeaders = this.responseHeaders;
        var headers = Object.keys(responseHeaders)
            .filter(excludeSetCookie2Header)
            .reduce(function (prev, header) {
                var value = responseHeaders[header];

                return prev + (header + ": " + value + "\r\n");
            }, "");

        return headers;
    },

    setResponseBody: function setResponseBody(body) {
        verifyRequestSent(this);
        verifyHeadersReceived(this);
        verifyResponseBodyType(body, this.responseType);
        var contentType = this.overriddenMimeType || this.getResponseHeader("Content-Type");

        var isTextResponse = this.responseType === "" || this.responseType === "text";
        clearResponse(this);
        if (this.async) {
            var chunkSize = this.chunkSize || 10;
            var index = 0;

            do {
                this.readyStateChange(FakeXMLHttpRequest.LOADING);

                if (isTextResponse) {
                    this.responseText = this.response += body.substring(index, index + chunkSize);
                }
                index += chunkSize;
            } while (index < body.length);
        }

        this.response = convertResponseBody(this.responseType, contentType, body);
        if (isTextResponse) {
            this.responseText = this.response;
        }

        if (this.responseType === "document") {
            this.responseXML = this.response;
        } else if (this.responseType === "" && isXmlContentType(contentType)) {
            this.responseXML = FakeXMLHttpRequest.parseXML(this.responseText);
        }
        this.readyStateChange(FakeXMLHttpRequest.DONE);
    },

    respond: function respond(status, headers, body) {
        this.setStatus(status);
        this.setResponseHeaders(headers || {});
        this.setResponseBody(body || "");
    },

    uploadProgress: function uploadProgress(progressEventRaw) {
        if (supportsProgress) {
            this.upload.dispatchEvent(new sinonEvent.ProgressEvent("progress", progressEventRaw, this.upload));
        }
    },

    downloadProgress: function downloadProgress(progressEventRaw) {
        if (supportsProgress) {
            this.dispatchEvent(new sinonEvent.ProgressEvent("progress", progressEventRaw, this));
        }
    },

    uploadError: function uploadError(error) {
        if (supportsCustomEvent) {
            this.upload.dispatchEvent(new sinonEvent.CustomEvent("error", {detail: error}));
        }
    },

    overrideMimeType: function overrideMimeType(type) {
        if (this.readyState >= FakeXMLHttpRequest.LOADING) {
            throw new Error("INVALID_STATE_ERR");
        }
        this.overriddenMimeType = type;
    }
});

var states = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
};

extend(FakeXMLHttpRequest, states);
extend(FakeXMLHttpRequest.prototype, states);

function useFakeXMLHttpRequest() {
    FakeXMLHttpRequest.restore = function restore(keepOnCreate) {
        if (sinonXhr.supportsXHR) {
            global.XMLHttpRequest = sinonXhr.GlobalXMLHttpRequest;
        }

        if (sinonXhr.supportsActiveX) {
            global.ActiveXObject = sinonXhr.GlobalActiveXObject;
        }

        delete FakeXMLHttpRequest.restore;

        if (keepOnCreate !== true) {
            delete FakeXMLHttpRequest.onCreate;
        }
    };
    if (sinonXhr.supportsXHR) {
        global.XMLHttpRequest = FakeXMLHttpRequest;
    }

    if (sinonXhr.supportsActiveX) {
        global.ActiveXObject = function ActiveXObject(objId) {
            if (objId === "Microsoft.XMLHTTP" || /^Msxml2\.XMLHTTP/i.test(objId)) {

                return new FakeXMLHttpRequest();
            }

            return new sinonXhr.GlobalActiveXObject(objId);
        };
    }

    return FakeXMLHttpRequest;
}

module.exports = {
    xhr: sinonXhr,
    FakeXMLHttpRequest: FakeXMLHttpRequest,
    useFakeXMLHttpRequest: useFakeXMLHttpRequest
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../configure-logger":1,"../event":5,"just-extend":14}],11:[function(require,module,exports){
"use strict";

module.exports = {
    fakeServer: require("./fake-server"),
    fakeServerWithClock: require("./fake-server/fake-server-with-clock"),
    fakeXhr: require("./fake-xhr")
};

},{"./fake-server":9,"./fake-server/fake-server-with-clock":7,"./fake-xhr":10}],12:[function(require,module,exports){
(function (global){
(function (root, factory) {
    "use strict";

    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["samsam"], factory);
    } else if (typeof module === "object" && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("samsam"));
    } else {
        // Browser globals (root is window)
        root.formatio = factory(root.samsam);
    }
}(typeof self !== "undefined" ? self : this, function (samsam) {
    "use strict";

    var formatio = {
        excludeConstructors: ["Object", /^.$/],
        quoteStrings: true,
        limitChildrenCount: 0
    };

    var specialObjects = [];
    if (typeof global !== "undefined") {
        specialObjects.push({ object: global, value: "[object global]" });
    }
    if (typeof document !== "undefined") {
        specialObjects.push({
            object: document,
            value: "[object HTMLDocument]"
        });
    }
    if (typeof window !== "undefined") {
        specialObjects.push({ object: window, value: "[object Window]" });
    }

    function functionName(func) {
        if (!func) { return ""; }
        if (func.displayName) { return func.displayName; }
        if (func.name) { return func.name; }
        var matches = func.toString().match(/function\s+([^\(]+)/m);
        return (matches && matches[1]) || "";
    }

    function constructorName(f, object) {
        var name = functionName(object && object.constructor);
        var excludes = f.excludeConstructors ||
                formatio.excludeConstructors || [];

        var i, l;
        for (i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] === "string" && excludes[i] === name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    }

    function isCircular(object, objects) {
        if (typeof object !== "object") { return false; }
        var i, l;
        for (i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) { return true; }
        }
        return false;
    }

    function ascii(f, object, processed, indent) {
        if (typeof object === "string") {
            if (object.length === 0) { return "(empty string)"; }
            var qs = f.quoteStrings;
            var quote = typeof qs !== "boolean" || qs;
            return processed || quote ? "\"" + object + "\"" : object;
        }

        if (typeof object === "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) { return "[Circular]"; }

        if (Object.prototype.toString.call(object) === "[object Array]") {
            return ascii.array.call(f, object, processed);
        }

        if (!object) { return String((1 / object) === -Infinity ? "-0" : object); }
        if (samsam.isElement(object)) { return ascii.element(object); }

        if (typeof object.toString === "function" &&
                object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        var i, l;
        for (i = 0, l = specialObjects.length; i < l; i++) {
            if (object === specialObjects[i].object) {
                return specialObjects[i].value;
            }
        }

        if (typeof Set !== "undefined" && object instanceof Set) {
            return ascii.set.call(f, object, processed);
        }

        return ascii.object.call(f, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + functionName(func) + "() {}";
    };

    function delimit(str, delimiters) {
        delimiters = delimiters || ["[", "]"];
        return delimiters[0] + str + delimiters[1];
    }

    ascii.array = function (array, processed, delimiters) {
        processed = processed || [];
        processed.push(array);
        var pieces = [];
        var i, l;
        l = (this.limitChildrenCount > 0) ?
            Math.min(this.limitChildrenCount, array.length) : array.length;

        for (i = 0; i < l; ++i) {
            pieces.push(ascii(this, array[i], processed));
        }

        if (l < array.length) {
            pieces.push("[... " + (array.length - l) + " more elements]");
        }

        return delimit(pieces.join(", "), delimiters);
    };

    ascii.set = function (set, processed) {
        return ascii.array.call(this, Array.from(set), processed, ["Set {", "}"]);
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [];
        var properties = samsam.keys(object).sort();
        var length = 3;
        var prop, str, obj, i, k, l;
        l = (this.limitChildrenCount > 0) ?
            Math.min(this.limitChildrenCount, properties.length) : properties.length;

        for (i = 0; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? "\"" + prop + "\"" : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = constructorName(this, object);
        var prefix = cons ? "[" + cons + "] " : "";
        var is = "";
        for (i = 0, k = indent; i < k; ++i) { is += " "; }

        if (l < properties.length)
        {pieces.push("[... " + (properties.length - l) + " more elements]");}

        if (length + indent > 80) {
            return prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" +
                is + "}";
        }
        return prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes;
        var pairs = [];
        var attr, attrName, i, l, val;

        for (i = 0, l = attrs.length; i < l; ++i) {
            attr = attrs.item(i);
            attrName = attr.nodeName.toLowerCase().replace("html:", "");
            val = attr.nodeValue;
            if (attrName !== "contenteditable" || val !== "inherit") {
                if (val) { pairs.push(attrName + "=\"" + val + "\""); }
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        // SVG elements have undefined innerHTML
        var content = element.innerHTML || "";

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content +
                "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    function Formatio(options) {
        // eslint-disable-next-line guard-for-in
        for (var opt in options) {
            this[opt] = options[opt];
        }
    }

    Formatio.prototype = {
        functionName: functionName,

        configure: function (options) {
            return new Formatio(options);
        },

        constructorName: function (object) {
            return constructorName(this, object);
        },

        ascii: function (object, processed, indent) {
            return ascii(this, object, processed, indent);
        }
    };

    return Formatio.prototype;
}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"samsam":17}],13:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],14:[function(require,module,exports){
module.exports = extend;

/*
  var obj = {a: 3, b: 5};
  extend(obj, {a: 4, c: 8}); // {a: 4, b: 5, c: 8}
  obj; // {a: 4, b: 5, c: 8}

  var obj = {a: 3, b: 5};
  extend({}, obj, {a: 4, c: 8}); // {a: 4, b: 5, c: 8}
  obj; // {a: 3, b: 5}

  var arr = [1, 2, 3];
  var obj = {a: 3, b: 5};
  extend(obj, {c: arr}); // {a: 3, b: 5, c: [1, 2, 3]}
  arr.push(4);
  obj; // {a: 3, b: 5, c: [1, 2, 3, 4]}

  var arr = [1, 2, 3];
  var obj = {a: 3, b: 5};
  extend(true, obj, {c: arr}); // {a: 3, b: 5, c: [1, 2, 3]}
  arr.push(4);
  obj; // {a: 3, b: 5, c: [1, 2, 3]}

  extend({a: 4, b: 5}); // {a: 4, b: 5}
  extend({a: 4, b: 5}, 3); {a: 4, b: 5}
  extend({a: 4, b: 5}, true); {a: 4, b: 5}
  extend('hello', {a: 4, b: 5}); // throws
  extend(3, {a: 4, b: 5}); // throws
*/

function extend(/* [deep], obj1, obj2, [objn] */) {
  var args = [].slice.call(arguments);
  var deep = false;
  if (typeof args[0] == 'boolean') {
    deep = args.shift();
  }
  var result = args[0];
  if (!result || (typeof result != 'object' && typeof result != 'function')) {
    throw new Error('extendee must be an object');
  }
  var extenders = args.slice(1);
  var len = extenders.length;
  for (var i = 0; i < len; i++) {
    var extender = extenders[i];
    for (var key in extender) {
      // include prototype properties
      var value = extender[key];
      if (deep && value && (typeof value == 'object' || typeof value == 'function')) {
        var base = Array.isArray(value) ? [] : {};
        result[key] = extend(true, result[key] || base, value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

},{}],15:[function(require,module,exports){
(function (global){
"use strict";

var userAgent = global.navigator && global.navigator.userAgent;
var isRunningInIE = userAgent && userAgent.indexOf("MSIE ") > -1;
var maxTimeout = Math.pow(2, 31) - 1; //see https://heycam.github.io/webidl/#abstract-opdef-converttoint

// Make properties writable in IE, as per
// http://www.adequatelygood.com/Replacing-setTimeout-Globally.html
if (isRunningInIE) {
    global.setTimeout = global.setTimeout;
    global.clearTimeout = global.clearTimeout;
    global.setInterval = global.setInterval;
    global.clearInterval = global.clearInterval;
    global.Date = global.Date;
}

// setImmediate is not a standard function
// avoid adding the prop to the window object if not present
if (global.setImmediate !== undefined) {
    global.setImmediate = global.setImmediate;
    global.clearImmediate = global.clearImmediate;
}

// node expects setTimeout/setInterval to return a fn object w/ .ref()/.unref()
// browsers, a number.
// see https://github.com/cjohansen/Sinon.JS/pull/436

var NOOP = function () { return undefined; };
var timeoutResult = setTimeout(NOOP, 0);
var addTimerReturnsObject = typeof timeoutResult === "object";
var hrtimePresent = (global.process && typeof global.process.hrtime === "function");
var nextTickPresent = (global.process && typeof global.process.nextTick === "function");
var performancePresent = (global.performance && typeof global.performance.now === "function");
var requestAnimationFramePresent = (global.requestAnimationFrame && typeof global.requestAnimationFrame === "function");
var cancelAnimationFramePresent = (global.cancelAnimationFrame && typeof global.cancelAnimationFrame === "function");

clearTimeout(timeoutResult);

var NativeDate = Date;
var uniqueTimerId = 1;

/**
 * Parse strings like "01:10:00" (meaning 1 hour, 10 minutes, 0 seconds) into
 * number of milliseconds. This is used to support human-readable strings passed
 * to clock.tick()
 */
function parseTime(str) {
    if (!str) {
        return 0;
    }

    var strings = str.split(":");
    var l = strings.length;
    var i = l;
    var ms = 0;
    var parsed;

    if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
        throw new Error("tick only understands numbers, 'm:s' and 'h:m:s'. Each part must be two digits");
    }

    while (i--) {
        parsed = parseInt(strings[i], 10);

        if (parsed >= 60) {
            throw new Error("Invalid time " + str);
        }

        ms += parsed * Math.pow(60, (l - i - 1));
    }

    return ms * 1000;
}

/**
 * Floor function that also works for negative numbers
 */
function fixedFloor(n) {
    return (n >= 0 ? Math.floor(n) : Math.ceil(n));
}

/**
 * % operator that also works for negative numbers
 */
function fixedModulo(n, m) {
    return ((n % m) + m) % m;
}

/**
 * Used to grok the `now` parameter to createClock.
 * @param epoch {Date|number} the system time
 */
function getEpoch(epoch) {
    if (!epoch) { return 0; }
    if (typeof epoch.getTime === "function") { return epoch.getTime(); }
    if (typeof epoch === "number") { return epoch; }
    throw new TypeError("now should be milliseconds since UNIX epoch");
}

function inRange(from, to, timer) {
    return timer && timer.callAt >= from && timer.callAt <= to;
}

function mirrorDateProperties(target, source) {
    var prop;
    for (prop in source) {
        if (source.hasOwnProperty(prop)) {
            target[prop] = source[prop];
        }
    }

    // set special now implementation
    if (source.now) {
        target.now = function now() {
            return target.clock.now;
        };
    } else {
        delete target.now;
    }

    // set special toSource implementation
    if (source.toSource) {
        target.toSource = function toSource() {
            return source.toSource();
        };
    } else {
        delete target.toSource;
    }

    // set special toString implementation
    target.toString = function toString() {
        return source.toString();
    };

    target.prototype = source.prototype;
    target.parse = source.parse;
    target.UTC = source.UTC;
    target.prototype.toUTCString = source.prototype.toUTCString;

    return target;
}

function createDate() {
    function ClockDate(year, month, date, hour, minute, second, ms) {
        // Defensive and verbose to avoid potential harm in passing
        // explicit undefined when user does not pass argument
        switch (arguments.length) {
            case 0:
                return new NativeDate(ClockDate.clock.now);
            case 1:
                return new NativeDate(year);
            case 2:
                return new NativeDate(year, month);
            case 3:
                return new NativeDate(year, month, date);
            case 4:
                return new NativeDate(year, month, date, hour);
            case 5:
                return new NativeDate(year, month, date, hour, minute);
            case 6:
                return new NativeDate(year, month, date, hour, minute, second);
            default:
                return new NativeDate(year, month, date, hour, minute, second, ms);
        }
    }

    return mirrorDateProperties(ClockDate, NativeDate);
}


function enqueueJob(clock, job) {
    // enqueues a microtick-deferred task - ecma262/#sec-enqueuejob
    if (!clock.jobs) {
        clock.jobs = [];
    }
    clock.jobs.push(job);
}

function runJobs(clock) {
    // runs all microtick-deferred tasks - ecma262/#sec-runjobs
    if (!clock.jobs) {
        return;
    }
    for (var i = 0; i < clock.jobs.length; i++) {
        var job = clock.jobs[i];
        job.func.apply(null, job.args);
    }
    clock.jobs = [];
}

function addTimer(clock, timer) {
    if (timer.func === undefined) {
        throw new Error("Callback must be provided to timer calls");
    }

    timer.type = timer.immediate ? "Immediate" : "Timeout";

    if (timer.hasOwnProperty("delay")) {
        timer.delay = timer.delay > maxTimeout ? 1 : timer.delay;
        timer.delay = Math.max(0, timer.delay);
    }

    if (timer.hasOwnProperty("interval")) {
        timer.type = "Interval";
        timer.interval = timer.interval > maxTimeout ? 1 : timer.interval;
    }

    if (timer.hasOwnProperty("animation")) {
        timer.type = "AnimationFrame";
        timer.animation = true;
    }

    if (!clock.timers) {
        clock.timers = {};
    }

    timer.id = uniqueTimerId++;
    timer.createdAt = clock.now;
    timer.callAt = clock.now + (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));

    clock.timers[timer.id] = timer;

    if (addTimerReturnsObject) {
        return {
            id: timer.id,
            ref: NOOP,
            unref: NOOP
        };
    }

    return timer.id;
}


/* eslint consistent-return: "off" */
function compareTimers(a, b) {
    // Sort first by absolute timing
    if (a.callAt < b.callAt) {
        return -1;
    }
    if (a.callAt > b.callAt) {
        return 1;
    }

    // Sort next by immediate, immediate timers take precedence
    if (a.immediate && !b.immediate) {
        return -1;
    }
    if (!a.immediate && b.immediate) {
        return 1;
    }

    // Sort next by creation time, earlier-created timers take precedence
    if (a.createdAt < b.createdAt) {
        return -1;
    }
    if (a.createdAt > b.createdAt) {
        return 1;
    }

    // Sort next by id, lower-id timers take precedence
    if (a.id < b.id) {
        return -1;
    }
    if (a.id > b.id) {
        return 1;
    }

    // As timer ids are unique, no fallback `0` is necessary
}

function firstTimerInRange(clock, from, to) {
    var timers = clock.timers;
    var timer = null;
    var id, isInRange;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            isInRange = inRange(from, to, timers[id]);

            if (isInRange && (!timer || compareTimers(timer, timers[id]) === 1)) {
                timer = timers[id];
            }
        }
    }

    return timer;
}

function firstTimer(clock) {
    var timers = clock.timers;
    var timer = null;
    var id;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            if (!timer || compareTimers(timer, timers[id]) === 1) {
                timer = timers[id];
            }
        }
    }

    return timer;
}

function lastTimer(clock) {
    var timers = clock.timers;
    var timer = null;
    var id;

    for (id in timers) {
        if (timers.hasOwnProperty(id)) {
            if (!timer || compareTimers(timer, timers[id]) === -1) {
                timer = timers[id];
            }
        }
    }

    return timer;
}

function callTimer(clock, timer) {
    if (typeof timer.interval === "number") {
        clock.timers[timer.id].callAt += timer.interval;
    } else {
        delete clock.timers[timer.id];
    }

    if (typeof timer.func === "function") {
        timer.func.apply(null, timer.args);
    } else {
        /* eslint no-eval: "off" */
        eval(timer.func);
    }
}

function clearTimer(clock, timerId, ttype) {
    if (!timerId) {
        // null appears to be allowed in most browsers, and appears to be
        // relied upon by some libraries, like Bootstrap carousel
        return;
    }

    if (!clock.timers) {
        clock.timers = [];
    }

    // in Node, timerId is an object with .ref()/.unref(), and
    // its .id field is the actual timer id.
    if (typeof timerId === "object") {
        timerId = timerId.id;
    }

    if (clock.timers.hasOwnProperty(timerId)) {
        // check that the ID matches a timer of the correct type
        var timer = clock.timers[timerId];
        if (timer.type === ttype) {
            delete clock.timers[timerId];
        } else {
            var clear = ttype === "AnimationFrame" ? "cancelAnimationFrame" : "clear" + ttype;
            var schedule = timer.type === "AnimationFrame" ? "requestAnimationFrame" : "set" + timer.type;
            throw new Error("Cannot clear timer: timer created with " + schedule
                            + "() but cleared with " + clear + "()");
        }
    }
}

function uninstall(clock, target, config) {
    var method,
        i,
        l;
    var installedHrTime = "_hrtime";
    var installedNextTick = "_nextTick";

    for (i = 0, l = clock.methods.length; i < l; i++) {
        method = clock.methods[i];
        if (method === "hrtime" && target.process) {
            target.process.hrtime = clock[installedHrTime];
        } else if (method === "nextTick" && target.process) {
            target.process.nextTick = clock[installedNextTick];
        } else {
            if (target[method] && target[method].hadOwnProperty) {
                target[method] = clock["_" + method];
                if (method === "clearInterval" && config.shouldAdvanceTime === true) {
                    target[method](clock.attachedInterval);
                }
            } else {
                try {
                    delete target[method];
                } catch (ignore) { /* eslint empty-block: "off" */ }
            }
        }
    }

    // Prevent multiple executions which will completely remove these props
    clock.methods = [];

    // return pending timers, to enable checking what timers remained on uninstall
    if (!clock.timers) {
        return [];
    }
    return Object.keys(clock.timers).map(function mapper(key) {
        return clock.timers[key];
    });
}

function hijackMethod(target, method, clock) {
    var prop;
    clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(target, method);
    clock["_" + method] = target[method];

    if (method === "Date") {
        var date = mirrorDateProperties(clock[method], target[method]);
        target[method] = date;
    } else {
        target[method] = function () {
            return clock[method].apply(clock, arguments);
        };

        for (prop in clock[method]) {
            if (clock[method].hasOwnProperty(prop)) {
                target[method][prop] = clock[method][prop];
            }
        }
    }

    target[method].clock = clock;
}

function doIntervalTick(clock, advanceTimeDelta) {
    clock.tick(advanceTimeDelta);
}

var timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: global.setImmediate,
    clearImmediate: global.clearImmediate,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

if (hrtimePresent) {
    timers.hrtime = global.process.hrtime;
}

if (nextTickPresent) {
    timers.nextTick = global.process.nextTick;
}

if (performancePresent) {
    timers.performance = global.performance;
}

if (requestAnimationFramePresent) {
    timers.requestAnimationFrame = global.requestAnimationFrame;
}

if (cancelAnimationFramePresent) {
    timers.cancelAnimationFrame = global.cancelAnimationFrame;
}

var keys = Object.keys || function (obj) {
    var ks = [];
    var key;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            ks.push(key);
        }
    }

    return ks;
};

exports.timers = timers;

/**
 * @param start {Date|number} the system time
 * @param loopLimit {number}  maximum number of timers that will be run when calling runAll()
 */
function createClock(start, loopLimit) {
    start = start || 0;
    loopLimit = loopLimit || 1000;

    var clock = {
        now: getEpoch(start),
        hrNow: 0,
        timeouts: {},
        Date: createDate(),
        loopLimit: loopLimit
    };

    clock.Date.clock = clock;

    function getTimeToNextFrame() {
        return 16 - ((clock.now - start) % 16);
    }

    clock.setTimeout = function setTimeout(func, timeout) {
        return addTimer(clock, {
            func: func,
            args: Array.prototype.slice.call(arguments, 2),
            delay: timeout
        });
    };

    clock.clearTimeout = function clearTimeout(timerId) {
        return clearTimer(clock, timerId, "Timeout");
    };
    clock.nextTick = function nextTick(func) {
        return enqueueJob(clock, {
            func: func,
            args: Array.prototype.slice.call(arguments, 1)
        });
    };
    clock.setInterval = function setInterval(func, timeout) {
        return addTimer(clock, {
            func: func,
            args: Array.prototype.slice.call(arguments, 2),
            delay: timeout,
            interval: timeout
        });
    };

    clock.clearInterval = function clearInterval(timerId) {
        return clearTimer(clock, timerId, "Interval");
    };

    clock.setImmediate = function setImmediate(func) {
        return addTimer(clock, {
            func: func,
            args: Array.prototype.slice.call(arguments, 1),
            immediate: true
        });
    };

    clock.clearImmediate = function clearImmediate(timerId) {
        return clearTimer(clock, timerId, "Immediate");
    };

    clock.requestAnimationFrame = function requestAnimationFrame(func) {
        var result = addTimer(clock, {
            func: func,
            delay: getTimeToNextFrame(),
            args: [clock.now + getTimeToNextFrame()],
            animation: true
        });

        return result.id || result;
    };

    clock.cancelAnimationFrame = function cancelAnimationFrame(timerId) {
        return clearTimer(clock, timerId, "AnimationFrame");
    };

    function updateHrTime(newNow) {
        clock.hrNow += (newNow - clock.now);
    }

    clock.tick = function tick(ms) {
        ms = typeof ms === "number" ? ms : parseTime(ms);
        var tickFrom = clock.now;
        var tickTo = clock.now + ms;
        var previous = clock.now;
        var timer, firstException, oldNow;

        clock.duringTick = true;

        // perform process.nextTick()s
        oldNow = clock.now;
        runJobs(clock);
        if (oldNow !== clock.now) {
            // compensate for any setSystemTime() call during process.nextTick() callback
            tickFrom += clock.now - oldNow;
            tickTo += clock.now - oldNow;
        }

        // perform each timer in the requested range
        timer = firstTimerInRange(clock, tickFrom, tickTo);
        while (timer && tickFrom <= tickTo) {
            if (clock.timers[timer.id]) {
                updateHrTime(timer.callAt);
                tickFrom = timer.callAt;
                clock.now = timer.callAt;
                oldNow = clock.now;
                try {
                    runJobs(clock);
                    callTimer(clock, timer);
                } catch (e) {
                    firstException = firstException || e;
                }

                // compensate for any setSystemTime() call during timer callback
                if (oldNow !== clock.now) {
                    tickFrom += clock.now - oldNow;
                    tickTo += clock.now - oldNow;
                    previous += clock.now - oldNow;
                }
            }

            timer = firstTimerInRange(clock, previous, tickTo);
            previous = tickFrom;
        }

        // perform process.nextTick()s again
        oldNow = clock.now;
        runJobs(clock);
        if (oldNow !== clock.now) {
            // compensate for any setSystemTime() call during process.nextTick() callback
            tickFrom += clock.now - oldNow;
            tickTo += clock.now - oldNow;
        }
        clock.duringTick = false;

        // corner case: during runJobs, new timers were scheduled which could be in the range [clock.now, tickTo]
        timer = firstTimerInRange(clock, tickFrom, tickTo);
        if (timer) {
            try {
                clock.tick(tickTo - clock.now); // do it all again - for the remainder of the requested range
            } catch (e) {
                firstException = firstException || e;
            }
        } else {
            // no timers remaining in the requested range: move the clock all the way to the end
            updateHrTime(tickTo);
            clock.now = tickTo;
        }
        if (firstException) {
            throw firstException;
        }
        return clock.now;
    };

    clock.next = function next() {
        runJobs(clock);
        var timer = firstTimer(clock);
        if (!timer) {
            return clock.now;
        }

        clock.duringTick = true;
        try {
            updateHrTime(timer.callAt);
            clock.now = timer.callAt;
            callTimer(clock, timer);
            runJobs(clock);
            return clock.now;
        } finally {
            clock.duringTick = false;
        }
    };

    clock.runAll = function runAll() {
        var numTimers, i;
        runJobs(clock);
        for (i = 0; i < clock.loopLimit; i++) {
            if (!clock.timers) {
                return clock.now;
            }

            numTimers = keys(clock.timers).length;
            if (numTimers === 0) {
                return clock.now;
            }

            clock.next();
        }

        throw new Error("Aborting after running " + clock.loopLimit + " timers, assuming an infinite loop!");
    };

    clock.runToFrame = function runToFrame() {
        return clock.tick(getTimeToNextFrame());
    };

    clock.runToLast = function runToLast() {
        var timer = lastTimer(clock);
        if (!timer) {
            runJobs(clock);
            return clock.now;
        }

        return clock.tick(timer.callAt);
    };

    clock.reset = function reset() {
        clock.timers = {};
    };

    clock.setSystemTime = function setSystemTime(systemTime) {
        // determine time difference
        var newNow = getEpoch(systemTime);
        var difference = newNow - clock.now;
        var id, timer;

        // update 'system clock'
        clock.now = newNow;

        // update timers and intervals to keep them stable
        for (id in clock.timers) {
            if (clock.timers.hasOwnProperty(id)) {
                timer = clock.timers[id];
                timer.createdAt += difference;
                timer.callAt += difference;
            }
        }
    };

    if (performancePresent) {
        clock.performance = Object.create(global.performance);
        clock.performance.now = function lolexNow() {
            return clock.hrNow;
        };
    }
    if (hrtimePresent) {
        clock.hrtime = function (prev) {
            if (Array.isArray(prev)) {
                var oldSecs = (prev[0] + prev[1] / 1e9);
                var newSecs = (clock.hrNow / 1000);
                var difference = (newSecs - oldSecs);
                var secs = fixedFloor(difference);
                var nanosecs = fixedModulo(difference * 1e9, 1e9);
                return [
                    secs,
                    nanosecs
                ];
            }
            return [
                fixedFloor(clock.hrNow / 1000),
                fixedModulo(clock.hrNow * 1e6, 1e9)
            ];
        };
    }

    return clock;
}
exports.createClock = createClock;

/**
 * @param config {Object} optional config
 * @param config.target {Object} the target to install timers in (default `window`)
 * @param config.now {number|Date}  a number (in milliseconds) or a Date object (default epoch)
 * @param config.toFake {string[]} names of the methods that should be faked.
 * @param config.loopLimit {number} the maximum number of timers that will be run when calling runAll()
 * @param config.shouldAdvanceTime {Boolean} tells lolex to increment mocked time automatically (default false)
 * @param config.advanceTimeDelta {Number} increment mocked time every <<advanceTimeDelta>> ms (default: 20ms)
 */
exports.install = function install(config) {
    if ( arguments.length > 1 || config instanceof Date || Array.isArray(config) || typeof config === "number") {
        throw new TypeError("lolex.install called with " + String(config) +
            " lolex 2.0+ requires an object parameter - see https://github.com/sinonjs/lolex");
    }
    config = typeof config !== "undefined" ? config : {};
    config.shouldAdvanceTime = config.shouldAdvanceTime || false;
    config.advanceTimeDelta = config.advanceTimeDelta || 20;

    var i, l;
    var target = config.target || global;
    var clock = createClock(config.now, config.loopLimit);

    clock.uninstall = function () {
        return uninstall(clock, target, config);
    };

    clock.methods = config.toFake || [];

    if (clock.methods.length === 0) {
        // do not fake nextTick by default - GitHub#126
        clock.methods = keys(timers).filter(function (key) {return key !== "nextTick";});
    }

    for (i = 0, l = clock.methods.length; i < l; i++) {
        if (clock.methods[i] === "hrtime") {
            if (target.process && typeof target.process.hrtime === "function") {
                hijackMethod(target.process, clock.methods[i], clock);
            }
        } else if (clock.methods[i] === "nextTick") {
            if (target.process && typeof target.process.nextTick === "function") {
                hijackMethod(target.process, clock.methods[i], clock);
            }
        } else {
            if (clock.methods[i] === "setInterval" && config.shouldAdvanceTime === true) {
                var intervalTick = doIntervalTick.bind(null, clock, config.advanceTimeDelta);
                var intervalId = target[clock.methods[i]](
                    intervalTick,
                    config.advanceTimeDelta);
                clock.attachedInterval = intervalId;
            }
            hijackMethod(target, clock.methods[i], clock);
        }
    }

    return clock;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var defaultDelimiter = options && options.delimiter || '/'
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    var next = str[index]
    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var modifier = res[6]
    var asterisk = res[7]

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var partial = prefix != null && next != null && next !== prefix
    var repeat = modifier === '+' || modifier === '*'
    var optional = modifier === '?' || modifier === '*'
    var delimiter = res[2] || defaultDelimiter
    var pattern = capture || group

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      asterisk: !!asterisk,
      pattern: pattern ? escapeGroup(pattern) : (asterisk ? '.*' : '[^' + escapeString(delimiter) + ']+?')
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
function compile (str, options) {
  return tokensToFunction(parse(str, options))
}

/**
 * Prettier encoding of URI path segments.
 *
 * @param  {string}
 * @return {string}
 */
function encodeURIComponentPretty (str) {
  return encodeURI(str).replace(/[\/?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
 *
 * @param  {string}
 * @return {string}
 */
function encodeAsterisk (str) {
  return encodeURI(str).replace(/[?#]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$')
    }
  }

  return function (obj, opts) {
    var path = ''
    var data = obj || {}
    var options = opts || {}
    var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) {
            path += token.prefix
          }

          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = token.asterisk ? encodeAsterisk(value) : encode(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {!RegExp} re
 * @param  {Array}   keys
 * @return {!RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {!Array}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array}   keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {!Array}  keys
 * @param  {!Object} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  return tokensToRegExp(parse(path, options), keys, options)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}          tokens
 * @param  {(Array|Object)=} keys
 * @param  {Object=}         options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  if (!isarray(keys)) {
    options = /** @type {!Object} */ (keys || options)
    keys = []
  }

  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = '(?:' + token.pattern + ')'

      keys.push(token)

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (!token.partial) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = prefix + '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  var delimiter = escapeString(options.delimiter || '/')
  var endsWithDelimiter = route.slice(-delimiter.length) === delimiter

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + '(?:' + delimiter + '(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithDelimiter ? '' : '(?=' + delimiter + '|$)'
  }

  return attachKeys(new RegExp('^' + route, flags(options)), keys)
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {(Array|Object)=}       keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  if (!isarray(keys)) {
    options = /** @type {!Object} */ (keys || options)
    keys = []
  }

  options = options || {}

  if (path instanceof RegExp) {
    return regexpToRegexp(path, /** @type {!Array} */ (keys))
  }

  if (isarray(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), /** @type {!Array} */ (keys), options)
  }

  return stringToRegexp(/** @type {string} */ (path), /** @type {!Array} */ (keys), options)
}

},{"isarray":13}],17:[function(require,module,exports){
((typeof define === "function" && define.amd && function (m) { define("samsam", m); }) ||
 (typeof module === "object" &&
      function (m) { module.exports = m(); }) || // Node
 function (m) { this.samsam = m(); } // Browser globals
)(function () {
    var o = Object.prototype;
    var div = typeof document !== "undefined" && document.createElement("div");

    function isNaN(value) {
        // Unlike global isNaN, this avoids type coercion
        // typeof check avoids IE host object issues, hat tip to
        // lodash
        var val = value; // JsLint thinks value !== value is "weird"
        return typeof value === "number" && value !== val;
    }

    function getClass(value) {
        // Returns the internal [[Class]] by calling Object.prototype.toString
        // with the provided value as this. Return value is a string, naming the
        // internal class, e.g. "Array"
        return o.toString.call(value).split(/[ \]]/)[1];
    }

    /**
     * @name samsam.isArguments
     * @param Object object
     *
     * Returns ``true`` if ``object`` is an ``arguments`` object,
     * ``false`` otherwise.
     */
    function isArguments(object) {
        if (getClass(object) === 'Arguments') { return true; }
        if (typeof object !== "object" || typeof object.length !== "number" ||
                getClass(object) === "Array") {
            return false;
        }
        if (typeof object.callee == "function") { return true; }
        try {
            object[object.length] = 6;
            delete object[object.length];
        } catch (e) {
            return true;
        }
        return false;
    }

    /**
     * @name samsam.isElement
     * @param Object object
     *
     * Returns ``true`` if ``object`` is a DOM element node. Unlike
     * Underscore.js/lodash, this function will return ``false`` if ``object``
     * is an *element-like* object, i.e. a regular object with a ``nodeType``
     * property that holds the value ``1``.
     */
    function isElement(object) {
        if (!object || object.nodeType !== 1 || !div) { return false; }
        try {
            object.appendChild(div);
            object.removeChild(div);
        } catch (e) {
            return false;
        }
        return true;
    }

    /**
     * @name samsam.keys
     * @param Object object
     *
     * Return an array of own property names.
     */
    function keys(object) {
        var ks = [], prop;
        for (prop in object) {
            if (o.hasOwnProperty.call(object, prop)) { ks.push(prop); }
        }
        return ks;
    }

    /**
     * @name samsam.isDate
     * @param Object value
     *
     * Returns true if the object is a ``Date``, or *date-like*. Duck typing
     * of date objects work by checking that the object has a ``getTime``
     * function whose return value equals the return value from the object's
     * ``valueOf``.
     */
    function isDate(value) {
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    /**
     * @name samsam.isNegZero
     * @param Object value
     *
     * Returns ``true`` if ``value`` is ``-0``.
     */
    function isNegZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    /**
     * @name samsam.equal
     * @param Object obj1
     * @param Object obj2
     *
     * Returns ``true`` if two objects are strictly equal. Compared to
     * ``===`` there are two exceptions:
     *
     *   - NaN is considered equal to NaN
     *   - -0 and +0 are not considered equal
     */
    function identical(obj1, obj2) {
        if (obj1 === obj2 || (isNaN(obj1) && isNaN(obj2))) {
            return obj1 !== 0 || isNegZero(obj1) === isNegZero(obj2);
        }
    }

    function isSet(val) {
        if (typeof Set !== 'undefined' && val instanceof Set) {
            return true;
        }
    }

    function isSubset(s1, s2, compare) {
        var values1 = Array.from(s1);
        var values2 = Array.from(s2);

        for (var i = 0; i < values1.length; i++) {
            var includes = false;

            for (var j = 0; j < values2.length; j++) {
                if (compare(values2[j], values1[i])) {
                    includes = true;
                    break;
                }
            }

            if (!includes) {
                return false;
            }
        }

        return true;
    }

    /**
     * @name samsam.deepEqual
     * @param Object obj1
     * @param Object obj2
     *
     * Deep equal comparison. Two values are "deep equal" if:
     *
     *   - They are equal, according to samsam.identical
     *   - They are both date objects representing the same time
     *   - They are both arrays containing elements that are all deepEqual
     *   - They are objects with the same set of properties, and each property
     *     in ``obj1`` is deepEqual to the corresponding property in ``obj2``
     *
     * Supports cyclic objects.
     */
    function deepEqualCyclic(obj1, obj2) {

        // used for cyclic comparison
        // contain already visited objects
        var objects1 = [],
            objects2 = [],
        // contain pathes (position in the object structure)
        // of the already visited objects
        // indexes same as in objects arrays
            paths1 = [],
            paths2 = [],
        // contains combinations of already compared objects
        // in the manner: { "$1['ref']$2['ref']": true }
            compared = {};

        /**
         * used to check, if the value of a property is an object
         * (cyclic logic is only needed for objects)
         * only needed for cyclic logic
         */
        function isObject(value) {

            if (typeof value === 'object' && value !== null &&
                    !(value instanceof Boolean) &&
                    !(value instanceof Date)    &&
                    !(value instanceof Number)  &&
                    !(value instanceof RegExp)  &&
                    !(value instanceof String)) {

                return true;
            }

            return false;
        }

        /**
         * returns the index of the given object in the
         * given objects array, -1 if not contained
         * only needed for cyclic logic
         */
        function getIndex(objects, obj) {

            var i;
            for (i = 0; i < objects.length; i++) {
                if (objects[i] === obj) {
                    return i;
                }
            }

            return -1;
        }

        // does the recursion for the deep equal check
        return (function deepEqual(obj1, obj2, path1, path2) {
            var type1 = typeof obj1;
            var type2 = typeof obj2;

            // == null also matches undefined
            if (obj1 === obj2 ||
                    isNaN(obj1) || isNaN(obj2) ||
                    obj1 == null || obj2 == null ||
                    type1 !== "object" || type2 !== "object") {

                return identical(obj1, obj2);
            }

            // Elements are only equal if identical(expected, actual)
            if (isElement(obj1) || isElement(obj2)) { return false; }

            var isDate1 = isDate(obj1), isDate2 = isDate(obj2);
            if (isDate1 || isDate2) {
                if (!isDate1 || !isDate2 || obj1.getTime() !== obj2.getTime()) {
                    return false;
                }
            }

            if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
                if (obj1.toString() !== obj2.toString()) { return false; }
            }

            var class1 = getClass(obj1);
            var class2 = getClass(obj2);
            var keys1 = keys(obj1);
            var keys2 = keys(obj2);

            if (isArguments(obj1) || isArguments(obj2)) {
                if (obj1.length !== obj2.length) { return false; }
            } else {
                if (type1 !== type2 || class1 !== class2 ||
                        keys1.length !== keys2.length) {
                    return false;
                }
            }

            if (isSet(obj1) || isSet(obj2)) {
                if (!isSet(obj1) || !isSet(obj2) || obj1.size !== obj2.size) {
                    return false;
                }

                return isSubset(obj1, obj2, deepEqual);
            }

            var key, i, l,
                // following vars are used for the cyclic logic
                value1, value2,
                isObject1, isObject2,
                index1, index2,
                newPath1, newPath2;

            for (i = 0, l = keys1.length; i < l; i++) {
                key = keys1[i];
                if (!o.hasOwnProperty.call(obj2, key)) {
                    return false;
                }

                // Start of the cyclic logic

                value1 = obj1[key];
                value2 = obj2[key];

                isObject1 = isObject(value1);
                isObject2 = isObject(value2);

                // determine, if the objects were already visited
                // (it's faster to check for isObject first, than to
                // get -1 from getIndex for non objects)
                index1 = isObject1 ? getIndex(objects1, value1) : -1;
                index2 = isObject2 ? getIndex(objects2, value2) : -1;

                // determine the new pathes of the objects
                // - for non cyclic objects the current path will be extended
                //   by current property name
                // - for cyclic objects the stored path is taken
                newPath1 = index1 !== -1
                    ? paths1[index1]
                    : path1 + '[' + JSON.stringify(key) + ']';
                newPath2 = index2 !== -1
                    ? paths2[index2]
                    : path2 + '[' + JSON.stringify(key) + ']';

                // stop recursion if current objects are already compared
                if (compared[newPath1 + newPath2]) {
                    return true;
                }

                // remember the current objects and their pathes
                if (index1 === -1 && isObject1) {
                    objects1.push(value1);
                    paths1.push(newPath1);
                }
                if (index2 === -1 && isObject2) {
                    objects2.push(value2);
                    paths2.push(newPath2);
                }

                // remember that the current objects are already compared
                if (isObject1 && isObject2) {
                    compared[newPath1 + newPath2] = true;
                }

                // End of cyclic logic

                // neither value1 nor value2 is a cycle
                // continue with next level
                if (!deepEqual(value1, value2, newPath1, newPath2)) {
                    return false;
                }
            }

            return true;

        }(obj1, obj2, '$1', '$2'));
    }

    function arrayContains(array, subset, compare) {
        if (subset.length === 0) { return true; }
        var i, l, j, k;
        for (i = 0, l = array.length; i < l; ++i) {
            if (compare(array[i], subset[0])) {
                for (j = 0, k = subset.length; j < k; ++j) {
                    if ((i + j) >= l) { return false; }
                    if (!compare(array[i + j], subset[j])) { return false; }
                }
                return true;
            }
        }
        return false;
    }

    /**
     * @name samsam.match
     * @param Object object
     * @param Object matcher
     *
     * Compare arbitrary value ``object`` with matcher.
     */
    function match(object, matcher) {
        if (matcher && typeof matcher.test === "function") {
            return matcher.test(object);
        }

        if (typeof matcher === "function") {
            return matcher(object) === true;
        }

        if (typeof matcher === "string") {
            matcher = matcher.toLowerCase();
            var notNull = typeof object === "string" || !!object;
            return notNull &&
                (String(object)).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher === "number") {
            return matcher === object;
        }

        if (typeof matcher === "boolean") {
            return matcher === object;
        }

        if (typeof(matcher) === "undefined") {
            return typeof(object) === "undefined";
        }

        if (matcher === null) {
            return object === null;
        }

        if (isSet(object)) {
            return isSubset(matcher, object, match);
        }

        if (getClass(object) === "Array" && getClass(matcher) === "Array") {
            return arrayContains(object, matcher, match);
        }

        if (isDate(matcher)) {
            return isDate(object) && object.getTime() === matcher.getTime();
        }

        if (matcher && typeof matcher === "object") {
            if (matcher === object) {
                return true;
            }
            var prop;
            for (prop in matcher) {
                var value = object[prop];
                if (typeof value === "undefined" &&
                        typeof object.getAttribute === "function") {
                    value = object.getAttribute(prop);
                }
                if (matcher[prop] === null || typeof matcher[prop] === 'undefined') {
                    if (value !== matcher[prop]) {
                        return false;
                    }
                } else if (typeof  value === "undefined" || !match(value, matcher[prop])) {
                    return false;
                }
            }
            return true;
        }

        throw new Error("Matcher was not a string, a number, a " +
                        "function, a boolean or an object");
    }

    return {
        isArguments: isArguments,
        isElement: isElement,
        isDate: isDate,
        isNegZero: isNegZero,
        identical: identical,
        deepEqual: deepEqualCyclic,
        match: match,
        keys: keys
    };
});

},{}]},{},[11])(11)
});