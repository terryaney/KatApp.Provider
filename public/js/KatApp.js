"use strict";
// const pluginName = 'KatApp';
// Static options available in js via KatApp.*
var KatApp = /** @class */ (function () {
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
    KatApp.trace = function (application, message) {
        var _a, _b, _c, _d, _e;
        if ((_c = (_b = (_a = application === null || application === void 0 ? void 0 : application.options) === null || _a === void 0 ? void 0 : _a.enableTrace) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.enableTrace) !== null && _c !== void 0 ? _c : false) {
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
                var className = (_d = application.element[0].className) !== null && _d !== void 0 ? _d : "No classes";
                var viewId = (_e = application.element.attr("rbl-view")) !== null && _e !== void 0 ? _e : "None";
                item = $("<div class='applog" + (traceId !== null && traceId !== void 0 ? traceId : "") + "'>" + displayDate + " <b>Application " + id + "</b> (class=" + className + ", view=" + viewId + "): " + message + "</div>");
            }
            else {
                item = $("<div>" + displayDate + ": " + message + "</div>");
            }
            console.log(item.text() /* remove any html formatting from message */);
            $(".rbl-logclass").append(item);
        }
    };
    KatApp.getResources = function (functionUrl, resources, useTestVersion, isScript, pipelineDone) {
        (function () {
            var _a;
            var url = (_a = functionUrl !== null && functionUrl !== void 0 ? functionUrl : KatApp.defaultOptions.functionUrl) !== null && _a !== void 0 ? _a : KatApp.functionUrl;
            var resourceArray = resources.split(",");
            // viewParts[ 0 ], viewParts[ 1 ]
            // folder: string, resource: string, optional Version
            var pipeline = [];
            var pipelineIndex = 0;
            var next = function () {
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
                    if (pipelineError !== undefined) {
                        next();
                        return;
                    }
                    var resourceParts = r.split(":");
                    var resource = resourceParts[1];
                    var folder = resourceParts[0];
                    var version = resourceParts.length > 2 ? resourceParts[2] : (useTestVersion ? "Test" : "Live"); // can provide a version as third part of name if you want
                    // Template names often don't use .html syntax
                    if (!resource.endsWith(".html") && !isScript) {
                        resource += ".html";
                    }
                    var params = "?{Command:'KatAppResource',Resource:'" + resource + "',Folder:'" + folder + "',Version:'" + version + "'}";
                    if (isScript) {
                        // $.getScript(url + params) // Production version
                        $.getScript("js/" + resource) // Debug version without having to upload to MgmtSite
                            // $.ajax({ url: "js/" + resource, dataType: "script", cache: true }) // Trying to get browser caching working
                            .done(function () { next(); })
                            .fail(function (_jqXHR, textStatus) {
                            pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                            next();
                        });
                    }
                    else {
                        // $.get(url + params)
                        // Debug version without having to upload to MgmtSite
                        $.get("templates/" + resource)
                            .done(function (data) {
                            resourceResults[r] = data;
                            next();
                        })
                            .fail(function (_jqXHR, textStatus) {
                            pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                            next();
                        });
                    }
                };
            }).concat([
                // Last function
                function () {
                    if (pipelineError !== undefined) {
                        pipelineDone(pipelineError);
                    }
                    else {
                        pipelineDone(undefined, resourceResults);
                    }
                }
            ]);
            // Start the pipeline
            next();
        })();
    };
    KatApp.functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    KatApp.corsUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";
    KatApp.pageParameters = KatApp.readPageParameters();
    // Default Options (shim, rest of the options/features added from server plugin)
    KatApp.defaultOptions = {
        enableTrace: false,
        functionUrl: KatApp.functionUrl,
        useTestPlugin: KatApp.pageParameters["testplugin"] === "1",
        useTestCalcEngine: KatApp.pageParameters["test"] === "1"
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
            this.options = KatApp.extend({}, options);
            this.element = element;
            this.element[0].KatApp = this;
        }
        KatAppPlugInShim.prototype.rebuild = function (options) {
            this.options = KatApp.extend({}, options);
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
        KatAppPlugInShim.prototype.trace = function (message) {
            KatApp.trace(this, message);
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
                    if (options == "rebuild" && instance === undefined) {
                        $.fn.KatApp.applicationFactory(KatApp.generateId(), $(this), args[0]);
                    }
                    else {
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
                    }
                });
            }
        }
    };
    // 'In memory' application list until the real KatAppProvider.js script can be loaded from 
    // the CMS to properly register the applications
    $.fn.KatApp.plugInShims = [];
    $.fn.KatApp.applicationFactory = function (id, element, options) {
        var _a, _b, _c;
        var shim = new KatAppPlugInShim(id, element, options);
        var applications = $.fn.KatApp.plugInShims;
        applications.push(shim);
        shim.trace("Starting factory");
        // First time anyone has been called with .KatApp()
        if (applications.length === 1) {
            shim.trace("Loading KatAppProvider library...");
            var useTestService = (_c = (_b = (_a = shim.options) === null || _a === void 0 ? void 0 : _a.useTestPlugin) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.useTestPlugin) !== null && _c !== void 0 ? _c : false;
            KatApp.getResources(undefined, "Global:KatAppProvider.js", useTestService, true, function (errorMessage) {
                if (errorMessage !== undefined) {
                    shim.trace("KatAppProvider library could not be loaded.");
                }
                else {
                    shim.trace("KatAppProvider library loaded.");
                }
            });
        }
        shim.trace("Leaving factory");
        return shim;
    };
})(jQuery, window, document);
//# sourceMappingURL=KatApp.js.map