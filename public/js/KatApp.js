"use strict";
var TraceVerbosity;
(function (TraceVerbosity) {
    TraceVerbosity[TraceVerbosity["None"] = 0] = "None";
    TraceVerbosity[TraceVerbosity["Quiet"] = 1] = "Quiet";
    TraceVerbosity[TraceVerbosity["Minimal"] = 2] = "Minimal";
    TraceVerbosity[TraceVerbosity["Normal"] = 3] = "Normal";
    TraceVerbosity[TraceVerbosity["Detailed"] = 4] = "Detailed";
    TraceVerbosity[TraceVerbosity["Diagnostic"] = 5] = "Diagnostic";
})(TraceVerbosity || (TraceVerbosity = {}));
var KatApp = (function () {
    function KatApp() {
    }
    KatApp.readPageParameters = function () {
        var params = {};
        var paramsArray = window.location.search.substr(1).split('&');
        for (var i = 0; i < paramsArray.length; ++i) {
            var param = paramsArray[i]
                .split('=', 2);
            if (param.length !== 2)
                continue;
            params[param[0].toLowerCase()] = decodeURIComponent(param[1].replace(/\+/g, " "));
        }
        return params;
    };
    KatApp.extend = function (target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        sources.forEach(function (source) {
            if (source === undefined)
                return;
            Object.keys(source).forEach(function (key) {
                if (typeof source[key] === "object" && target[key] != undefined) {
                    KatApp.extend(target[key], source[key]);
                }
                else {
                    target[key] = source[key];
                }
            });
        });
        return target;
    };
    ;
    KatApp.trace = function (application, message, verbosity) {
        if (verbosity === void 0) { verbosity = TraceVerbosity.Normal; }
        var _a, _b, _c, _d, _e, _f, _g;
        var verbosityOption = (_e = (_c = (_b = (_a = application === null || application === void 0 ? void 0 : application.options) === null || _a === void 0 ? void 0 : _a.debug) === null || _b === void 0 ? void 0 : _b.traceVerbosity) !== null && _c !== void 0 ? _c : (_d = KatApp.defaultOptions.debug) === null || _d === void 0 ? void 0 : _d.traceVerbosity) !== null && _e !== void 0 ? _e : TraceVerbosity.None;
        if (verbosityOption >= verbosity) {
            var item = undefined;
            var d = new Date(), year = d.getFullYear();
            var month = '' + (d.getMonth() + 1), day = '' + d.getDate(), hours = '' + d.getHours(), minutes = '' + d.getMinutes(), seconds = '' + d.getSeconds();
            if (month.length < 2)
                month = '0' + month;
            if (day.length < 2)
                day = '0' + day;
            if (hours.length < 2)
                hours = '0' + hours;
            if (minutes.length < 2)
                minutes = '0' + minutes;
            if (seconds.length < 2)
                seconds = '0' + seconds;
            var displayDate = [year, month, day].join('-') + " " + [hours, minutes, seconds].join(':');
            if (application !== undefined) {
                var traceId = application.element.attr("rbl-trace-id");
                var id = traceId !== null && traceId !== void 0 ? traceId : application.id;
                var className = (_f = application.element[0].className) !== null && _f !== void 0 ? _f : "No classes";
                var viewId = (_g = application.element.attr("rbl-view")) !== null && _g !== void 0 ? _g : "None";
                var markupDetails = verbosityOption === TraceVerbosity.Diagnostic ? " (class=" + className + ", view=" + viewId + ")" : "";
                item = $("<div class='applog" + (traceId !== null && traceId !== void 0 ? traceId : "") + "'>" + displayDate + " <b>Application " + id + "</b>" + markupDetails + ": " + message + "</div>");
            }
            else {
                item = $("<div>" + displayDate + ": " + message + "</div>");
            }
            console.log(item.text());
            $(".rbl-logclass").append(item);
        }
    };
    KatApp.getResources = function (application, resources, useTestVersion, isScript, pipelineDone) {
        (function () {
            var _a, _b;
            var currentOptions = application.options;
            var url = (_b = (_a = currentOptions.functionUrl) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.functionUrl) !== null && _b !== void 0 ? _b : KatApp.functionUrl;
            var resourceArray = resources.split(",");
            var pipeline = [];
            var pipelineIndex = 0;
            var next = function () {
                if (pipelineIndex < pipeline.length) {
                    pipeline[pipelineIndex++]();
                }
            };
            var pipelineError = undefined;
            var resourceResults = {};
            pipeline = resourceArray.map(function (r) {
                return function () {
                    var _a;
                    if (pipelineError !== undefined) {
                        next();
                        return;
                    }
                    try {
                        var resourceParts = r.split(":");
                        var resource_1 = resourceParts[1];
                        var folder = resourceParts[0];
                        var version = resourceParts.length > 2 ? resourceParts[2] : (useTestVersion ? "Test" : "Live");
                        if (!resource_1.endsWith(".html") && !isScript) {
                            resource_1 += ".html";
                        }
                        var params = {
                            Command: 'KatAppResource',
                            Resources: [
                                {
                                    Resource: resource_1,
                                    Folder: folder,
                                    Version: version
                                }
                            ]
                        };
                        var submit = (_a = currentOptions.submitCalculation) !== null && _a !== void 0 ? _a : function (_app, o, done, fail) {
                            var _a, _b, _c, _d, _e;
                            var ajaxConfig = {
                                url: isScript
                                    ? ((_a = currentOptions.debug) === null || _a === void 0 ? void 0 : _a.scriptLocation) !== undefined ? currentOptions.debug.scriptLocation + "/" + resource_1 : url
                                    : ((_b = currentOptions.debug) === null || _b === void 0 ? void 0 : _b.templateLocation) !== undefined ? currentOptions.debug.templateLocation + "/" + resource_1 : url,
                                data: ((_c = currentOptions.debug) === null || _c === void 0 ? void 0 : _c.scriptLocation) === undefined ? JSON.stringify(o) : undefined,
                                method: ((_d = currentOptions.debug) === null || _d === void 0 ? void 0 : _d.scriptLocation) === undefined ? "POST" : undefined,
                                dataType: ((_e = currentOptions.debug) === null || _e === void 0 ? void 0 : _e.scriptLocation) === undefined ? "json" : undefined,
                                cache: false
                            };
                            $.ajax(ajaxConfig).done(done).fail(fail);
                        };
                        var submitFailed = function (_jqXHR, textStatus, _errorThrown) {
                            pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                            console.log(_errorThrown);
                            next();
                        };
                        var submitDone = function (data) {
                            var _a, _b, _c;
                            if (data.payload !== undefined) {
                                data = JSON.parse(data.payload);
                            }
                            var resourceContent = (_b = (_a = data.Resources) === null || _a === void 0 ? void 0 : _a[0].Content) !== null && _b !== void 0 ? _b : data;
                            if (isScript) {
                                var body = document.querySelector('body');
                                if (body !== undefined && body !== null && ((_c = currentOptions.debug) === null || _c === void 0 ? void 0 : _c.scriptLocation) === undefined && resourceContent !== undefined) {
                                    $("script[rbl-script='true']").remove();
                                    var script = document.createElement('script');
                                    script.setAttribute("rbl-script", "true");
                                    var content = resourceContent;
                                    script.innerHTML = content;
                                    body.appendChild(script);
                                }
                            }
                            else {
                                resourceResults[r] = resourceContent;
                            }
                            next();
                        };
                        submit(application, params, submitDone, submitFailed);
                    }
                    catch (error) {
                        pipelineError = "getResources failed trying to request " + r + ":" + error;
                        next();
                    }
                };
            }).concat([
                function () {
                    if (pipelineError !== undefined) {
                        pipelineDone(pipelineError);
                    }
                    else {
                        pipelineDone(undefined, resourceResults);
                    }
                }
            ]);
            next();
        })();
    };
    KatApp.functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    KatApp.corsUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";
    KatApp.pageParameters = KatApp.readPageParameters();
    KatApp.defaultOptions = {
        debug: {
            traceVerbosity: TraceVerbosity.None,
            useTestPlugin: KatApp.pageParameters["testplugin"] === "1",
            useTestView: KatApp.pageParameters["testview"] === "1",
            saveFirstCalculationLocation: KatApp.pageParameters["save"]
        },
        functionUrl: KatApp.functionUrl,
    };
    KatApp.generateId = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    return KatApp;
}());
(function ($, window, document, undefined) {
    var KatAppPlugInShim = (function () {
        function KatAppPlugInShim(id, element, options) {
            this.id = id;
            this.options = KatApp.extend({}, KatApp.defaultOptions, options);
            this.element = element;
            this.element[0].KatApp = this;
        }
        KatAppPlugInShim.prototype.rebuild = function (options) {
            this.options = KatApp.extend(this.options, options);
        };
        KatAppPlugInShim.prototype.destroy = function () {
            var shimIndex = -1;
            var applications = $.fn.KatApp.plugInShims;
            var id = this.id;
            applications.forEach(function (a, index) {
                if (shimIndex === -1 && a.id == id) {
                    shimIndex = index;
                }
            });
            if (shimIndex > -1) {
                applications.splice(shimIndex, 1);
            }
            delete this.element[0].KatApp;
        };
        KatAppPlugInShim.prototype.trace = function (message, verbosity) {
            if (verbosity === void 0) { verbosity = TraceVerbosity.Normal; }
            KatApp.trace(this, message, verbosity);
        };
        return KatAppPlugInShim;
    }());
    var allowedPropertyGetters = ['options', 'id'];
    $.fn.KatApp = function (options) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (options === undefined || typeof options === 'object') {
            if (options == undefined && this.length > 0 && this.first()[0].KatApp !== undefined) {
                return this.first()[0].KatApp;
            }
            return this.each(function () {
                if (!this.KatApp) {
                    $.fn.KatApp.applicationFactory(KatApp.generateId(), $(this), options);
                }
                else if (options !== undefined) {
                    this.KatApp.rebuild(options);
                }
            });
        }
        else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            if (args.length == 0 && $.inArray(options, allowedPropertyGetters) != -1) {
                var instance = this[0].KatApp;
                if (instance === undefined)
                    return undefined;
                return typeof instance[options] === 'function'
                    ? instance[options].apply(instance)
                    : instance[options];
            }
            else {
                return this.each(function () {
                    var _a;
                    var instance = this.KatApp;
                    var objectType = (_a = instance === null || instance === void 0 ? void 0 : instance.constructor) === null || _a === void 0 ? void 0 : _a.name;
                    if (instance !== undefined && (objectType === "KatAppPlugInShim" || objectType === "KatAppPlugIn") && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args);
                    }
                });
            }
        }
    };
    $.fn.KatApp.plugInShims = [];
    $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory = function (id, element, options) {
        var _a, _b, _c, _d, _e, _f;
        var shim = new KatAppPlugInShim(id, element, options);
        shim.trace("Starting factory", TraceVerbosity.Diagnostic);
        var applications = $.fn.KatApp.plugInShims;
        applications.push(shim);
        if (applications.length === 1) {
            shim.trace("Loading KatAppProvider library...", TraceVerbosity.Detailed);
            shim.trace("Downloading KatAppProvider.js from " + (((_a = shim.options.debug) === null || _a === void 0 ? void 0 : _a.scriptLocation) !== undefined ? shim.options.debug.scriptLocation + "/KatAppProvider.js" : shim.options.functionUrl), TraceVerbosity.Diagnostic);
            var useTestService = (_f = (_d = (_c = (_b = shim.options) === null || _b === void 0 ? void 0 : _b.debug) === null || _c === void 0 ? void 0 : _c.useTestPlugin) !== null && _d !== void 0 ? _d : (_e = KatApp.defaultOptions.debug) === null || _e === void 0 ? void 0 : _e.useTestPlugin) !== null && _f !== void 0 ? _f : false;
            KatApp.getResources(shim, "Global:KatAppProvider.js", useTestService, true, function (errorMessage) {
                if (errorMessage !== undefined) {
                    shim.trace("KatAppProvider library could not be loaded.", TraceVerbosity.Quiet);
                }
                else {
                    shim.trace("KatAppProvider library loaded.", TraceVerbosity.Detailed);
                }
            });
        }
        shim.trace("Leaving factory", TraceVerbosity.Diagnostic);
        return shim;
    };
})(jQuery, window, document);
//# sourceMappingURL=KatApp.js.map