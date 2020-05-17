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
var KatApp = /** @class */ (function () {
    function KatApp() {
    }
    KatApp.stringCompare = function (strA, strB, ignoreCase) {
        if (strA === undefined && strB === undefined) {
            return 0;
        }
        else if (strA === undefined) {
            return -1;
        }
        else if (strB === undefined) {
            return 1;
        }
        else if (ignoreCase) {
            return strA.toUpperCase().localeCompare(strB.toUpperCase());
        }
        else {
            return strA.localeCompare(strB);
        }
    };
    ;
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
    // https://blog.logrocket.com/4-different-techniques-for-copying-objects-in-javascript-511e422ceb1e/
    // Wanted explicitly 'undefined' properties set to undefined and jquery .Extend() didn't do that
    KatApp.extend = function (target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        sources.forEach(function (source) {
            if (source === undefined)
                return;
            Object.keys(source).forEach(function (key) {
                // Always do deep copy
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
            console.log(item.text() /* remove any html formatting from message */);
            $(".rbl-logclass").append(item);
            $('.rbl-logclass:not(.rbl-do-not-scroll)').each(function () {
                this.scrollTop = this.scrollHeight;
            });
        }
    };
    KatApp.getResources = function (application, resources, useTestVersion, isScript, debugResourcesRoot, getResourcesHandler) {
        var _a, _b;
        var currentOptions = application.options;
        var url = (_b = (_a = currentOptions.functionUrl) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.functionUrl) !== null && _b !== void 0 ? _b : KatApp.functionUrl;
        var resourceArray = resources.split(",");
        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string, optional Version
        var pipeline = [];
        var pipelineIndex = 0;
        var getResourcesPipeline = function () {
            if (pipelineIndex < pipeline.length) {
                pipeline[pipelineIndex++]();
            }
        };
        var pipelineError = undefined;
        var resourceResults = {};
        // Build a pipeline of functions for each resource requested.
        // TODO: Figure out how to make this asynchronous
        pipeline = resourceArray.map(function (r) {
            return function () {
                var _a;
                if (pipelineError !== undefined) {
                    getResourcesPipeline();
                    return;
                }
                try {
                    var resourceParts = r.split(":");
                    var resource_1 = resourceParts[1];
                    var folder = resourceParts[0];
                    var version = resourceParts.length > 2 ? resourceParts[2] : (useTestVersion ? "Test" : "Live"); // can provide a version as third part of name if you want
                    // Template names often don't use .xhtml syntax
                    if (!resource_1.endsWith(".kaml") && !isScript) {
                        resource_1 += ".kaml";
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
                    var localFolder_1 = !isScript ? folder + "/" : "";
                    var submit = (_a = currentOptions.submitCalculation) !== null && _a !== void 0 ? _a : function (_app, o, done, fail) {
                        var ajaxConfig = {
                            url: debugResourcesRoot !== undefined ? debugResourcesRoot + "/" + localFolder_1 + resource_1 : url,
                            data: debugResourcesRoot === undefined ? JSON.stringify(o) : undefined,
                            method: debugResourcesRoot === undefined ? "POST" : undefined,
                            dataType: debugResourcesRoot === undefined ? "json" : undefined,
                            cache: false
                        };
                        // Need to use .ajax isntead of .getScript/.get to get around CORS problem
                        // and to also conform to using the submitCalculation wrapper by L@W.
                        $.ajax(ajaxConfig).done(done).fail(fail);
                    };
                    var submitFailed = function (_jqXHR, textStatus, _errorThrown) {
                        pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                        console.log(_errorThrown);
                        getResourcesPipeline();
                    };
                    var submitDone = function (data) {
                        var _a, _b;
                        if (data.payload !== undefined) {
                            data = JSON.parse(data.payload);
                        }
                        // data.Content when request from service, just data when local files
                        var resourceContent = (_b = (_a = data.Resources) === null || _a === void 0 ? void 0 : _a[0].Content) !== null && _b !== void 0 ? _b : data;
                        if (isScript) {
                            // If local script location is provided, doing the $.ajax code automatically 
                            // injects/executes the javascript, no need to do it again
                            var body = document.querySelector('body');
                            if (body !== undefined && body !== null && debugResourcesRoot === undefined && resourceContent !== undefined) {
                                // Just keeping the markup a bit cleaner by only having one copy of the code
                                $("script[rbl-script='true']").remove();
                                // https://stackoverflow.com/a/56509649/166231
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
                        getResourcesPipeline();
                    };
                    submit(application, params, submitDone, submitFailed);
                }
                catch (error) {
                    pipelineError = "getResources failed trying to request " + r + ":" + error;
                    getResourcesPipeline();
                }
            };
        }).concat([
            // Last function
            function () {
                if (pipelineError !== undefined) {
                    getResourcesHandler(pipelineError);
                }
                else {
                    getResourcesHandler(undefined, resourceResults);
                }
            }
        ]);
        // Start the pipeline
        getResourcesPipeline();
    };
    KatApp.functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    KatApp.corsUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";
    KatApp.pageParameters = KatApp.readPageParameters();
    // Default Options (shim, rest of the options/features added from server plugin)
    KatApp.defaultOptions = {
        debug: {
            traceVerbosity: TraceVerbosity.None,
            useTestPlugin: KatApp.pageParameters["testplugin"] === "1",
            useTestView: KatApp.pageParameters["testview"] === "1",
            saveFirstCalculationLocation: KatApp.pageParameters["save"]
        },
        functionUrl: KatApp.functionUrl,
    };
    // https://stackoverflow.com/a/2117523
    KatApp.generateId = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    return KatApp;
}());
(function ($, window, document, undefined) {
    var KatAppPlugInShim = /** @class */ (function () {
        function KatAppPlugInShim(id, element, options) {
            this.id = id;
            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend({}, KatApp.defaultOptions, options);
            this.element = element;
            this.element[0].KatApp = this;
        }
        KatAppPlugInShim.prototype.rebuild = function (options) {
            this.options = KatApp.extend(this.options, options);
        };
        KatAppPlugInShim.prototype.destroy = function () {
            // Remove from memory cache in case they call delete before the
            // real provider is loaded
            var shimIndex = -1;
            var applications = $.fn.KatApp.plugInShims;
            var id = this.id;
            // Wanted to use applications.findIndex( f() ) but ie doesn't support
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
    /*
    const privateMethod = function(this: KatAppPlugIn): void
    {
        // Private method not accessible outside plug in, however, if you want to call it from plug in implementation,
        // need to call via privateMethod.apply(this); so that the PlugIn is the 'this context'
    }
    */
    var allowedPropertyGetters = ['options', 'id'];
    // const autoInitMethods = ['calculate', 'updateOptions'];
    // Not a fan of these 'magic' strings to call methods:
    //
    //      $("selector").KatApp("destroy")
    //
    // But other libraries (selectpicker, datepicker) seem to do same.
    //
    // Highcharts - they always seem to want you to grab an element and work with object from there:
    //
    //      $("select").each( function() { $(this).highcharts().destroy() } );
    //
    //      This mechanism would work for ours too.  But I feel ours is better, you just have this.KatApp property
    //      not calling the 'plugin' again (which theirs only assumes to work with one element, in code they do this[0])
    //
    // noUiSlider - They aren't even a plugin, just a javascript library.
    //
    // MatchHeight - they allow you to register items correctly, but then allow you to hit methods via directly hitting prototype 
    //               global options.  So they are 'almost' just a javascript library.  You can 'initalize' it with jQuery plugin 
    //               style code, but then you have free reign to all their state and methods.
    //
    //      $.fn.matchHeight._beforeUpdate = function() { };
    //      $.fn.matchHeight._apply(elements, options); // manually apply options
    $.fn.KatApp = function (options) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (options === undefined || typeof options === 'object') {
            if (options == undefined && this.length > 0 && this.first()[0].KatApp !== undefined) {
                return this.first()[0].KatApp;
            }
            // Creates a new plugin instance, for each selected element, and
            // stores a reference within the element's data
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
            // Call a public pluguin method (not starting with an underscore) for each 
            // selected element.
            if (args.length == 0 && $.inArray(options, allowedPropertyGetters) != -1) {
                // If the user does not pass any arguments and the method allows to
                // work as a getter then break the chainability so we can return a value
                // instead the element reference.  this[0] should be the only item in selector and grab getter from it.
                var instance = this[0].KatApp;
                if (instance === undefined)
                    return undefined;
                return typeof instance[options] === 'function'
                    ? instance[options].apply(instance) // eslint-disable-line prefer-spread
                    : instance[options];
            }
            else {
                // Invoke the speficied method on each selected element
                return this.each(function () {
                    var _a;
                    var instance = this.KatApp;
                    // No longer supporting this, see comment for needsCalculation in KatAppPlugInInterfaces.ts.  Just don't see the
                    // need and given pattern of providing full blown 'app' after server loads script, don't want to have to 
                    // support 'anything' on .KatApp() until onInitialized is completed.
                    /*
                    // If plugin isn't created yet and they call a method, just auto init for them
                    if ( instance === undefined && typeof options === 'string' && $.inArray(options, autoInitMethods) != -1 ) {
                        const appOptions = ( args.length >= 1 && typeof args[ 0 ] === "object" ? args[ 0 ] : undefined ) as KatAppOptions;
                        instance = $.fn[pluginName].applicationFactory(KatApp.generateId(), $(this), appOptions);
                    }
                    */
                    var objectType = (_a = instance === null || instance === void 0 ? void 0 : instance.constructor) === null || _a === void 0 ? void 0 : _a.name;
                    if (instance !== undefined && (objectType === "KatAppPlugInShim" || objectType === "KatAppPlugIn") && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args); // eslint-disable-line prefer-spread
                    }
                });
            }
        }
    };
    // 'In memory' application list until the real KatAppProvider.js script can be loaded from 
    // the CMS to properly register the applications
    $.fn.KatApp.plugInShims = [];
    $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory = function (id, element, options) {
        var _a, _b, _c, _d, _e, _f, _g;
        var shim = new KatAppPlugInShim(id, element, options);
        shim.trace("Starting factory", TraceVerbosity.Diagnostic);
        var applications = $.fn.KatApp.plugInShims;
        applications.push(shim);
        // First time anyone has been called with .KatApp()
        if (applications.length === 1) {
            shim.trace("Loading KatAppProvider library...", TraceVerbosity.Detailed);
            var debugResourcesRoot = (_a = shim.options.debug) === null || _a === void 0 ? void 0 : _a.debugResourcesRoot;
            if (debugResourcesRoot !== undefined) {
                debugResourcesRoot += "/js";
            }
            shim.trace((_b = "Downloading KatAppProvider.js from " + debugResourcesRoot) !== null && _b !== void 0 ? _b : shim.options.functionUrl, TraceVerbosity.Diagnostic);
            var useTestService = (_g = (_e = (_d = (_c = shim.options) === null || _c === void 0 ? void 0 : _c.debug) === null || _d === void 0 ? void 0 : _d.useTestPlugin) !== null && _e !== void 0 ? _e : (_f = KatApp.defaultOptions.debug) === null || _f === void 0 ? void 0 : _f.useTestPlugin) !== null && _g !== void 0 ? _g : false;
            KatApp.getResources(shim, "Global:KatAppProvider.js", useTestService, true, debugResourcesRoot, function (errorMessage) {
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