"use strict";
var pluginName = 'KatApp';
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
    KatApp.getResources = function (serviceUrl, resources, useTestVersion, isScript, pipelineDone) {
        var _a;
        var url = (_a = serviceUrl !== null && serviceUrl !== void 0 ? serviceUrl : KatApp.defaultOptions.serviceUrl) !== null && _a !== void 0 ? _a : KatApp.serviceUrl;
        var resourceArray = resources.split(",");
        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string
        var pipeline = [];
        var pipelineIndex = 0;
        var next = function () {
            if (pipelineIndex < pipeline.length) {
                pipeline[pipelineIndex++]();
            }
        };
        (function () {
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
                    var resource = resourceParts.length > 1 ? resourceParts[1] : resourceParts[0];
                    var folder = resourceParts.length > 1 ? resourceParts[0] : "Global"; // if no folder provided, default to global
                    var version = resourceParts.length > 2 ? resourceParts[2] : (useTestVersion ? "Test" : "Live"); // can provide a version as third part of name if you want
                    // Template names often don't use .html syntax
                    if (!resource.endsWith(".html") && !isScript) {
                        resource += ".html";
                    }
                    var params = "?{Command:'KatAppResource',Resource:'" + resource + "',Folder:'" + folder + "',Version:'" + version + "'}";
                    if (isScript) {
                        // $.getScript(url + params);                    
                        // Debug version without having to upload to MgmtSite
                        $.getScript("js/" + resource)
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
    KatApp.serviceUrl = "https://btr.lifeatworkportal.com/services/evolution/Calculation.ashx";
    KatApp.corsProxyUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";
    KatApp.pageParameters = KatApp.readPageParameters();
    // Default Options
    KatApp.defaultOptions = {
        enableTrace: false,
        shareRegisterToken: true,
        serviceUrl: KatApp.serviceUrl,
        currentPage: "Unknown",
        inputSelector: "input",
        inputTab: "RBLInput",
        resultTabs: ["RBLResult"],
        runConfigureUICalculation: true,
        ajaxLoaderSelector: ".ajaxloader",
        useTestCalcEngine: KatApp.pageParameters["save"] === "1",
        onCalculateStart: function (application) {
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).show();
            }
            $(".RBLe .slider-control, .RBLe input", application.element).attr("disabled", "true");
        },
        onCalculateEnd: function (application) {
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).fadeOut();
            }
            $(".RBLe .slider-control, .RBLe input", application.element).removeAttr("disabled");
        }
    };
    return KatApp;
}());
// In 'memory' application references until the real KatAppProvider.js is loaded and can 
// register them with the service.
var ApplicationShim = /** @class */ (function () {
    function ApplicationShim(application) {
        this.needsCalculation = false;
        this.application = application;
    }
    return ApplicationShim;
}());
// 'In memory' KatApp Provider that stores any attempted .KatApp() initializations until the
// real KatAppProvider.js script can be loaded from the CMS to properly register the applications
var KatAppProviderShim = /** @class */ (function () {
    function KatAppProviderShim() {
        this.applications = [];
    }
    KatAppProviderShim.prototype.init = function (application) {
        var _a, _b;
        if (this.applications.length === 0) {
            // First time anyone has been called with .KatApp()
            var useTestService = (_b = (_a = application.options.useTestPlugin) !== null && _a !== void 0 ? _a : KatApp.pageParameters["testplugin"] === "1") !== null && _b !== void 0 ? _b : false;
            KatApp.getResources(undefined, "Global:KatAppProvider.js", useTestService, true, function (errorMessage) {
                if (errorMessage !== undefined) {
                    application.trace("KatAppProvider library could not be loaded.");
                }
                else {
                    application.trace("KatAppProvider library loaded.");
                }
            });
        }
        this.applications.push(new ApplicationShim(application));
    };
    KatAppProviderShim.prototype.calculate = function (application, options) {
        var shim = this.applications.filter(function (a) { return a.application.id === application.id; }).shift();
        if (shim) {
            shim.calculateOptions = options;
            shim.needsCalculation = true;
        }
    };
    KatAppProviderShim.prototype.updateOptions = function () { };
    KatAppProviderShim.prototype.saveCalcEngine = function () { };
    KatAppProviderShim.prototype.traceCalcEngine = function () { };
    KatAppProviderShim.prototype.refreshCalcEngine = function () { };
    KatAppProviderShim.prototype.getResultValue = function () { return undefined; }; // Do nothing until real provider loads
    KatAppProviderShim.prototype.getResultRow = function () { return undefined; }; // Do nothing until real provider loads
    KatAppProviderShim.prototype.destroy = function (application) {
        // Remove from memory cache in case they call delete before the
        // real provider is loaded
        var shimIndex = -1;
        // Wanted to use applications.findIndex( f() ) but ie doesn't support
        this.applications.forEach(function (a, index) {
            if (shimIndex === -1 && a.application.id == application.id) {
                shimIndex = index;
            }
        });
        if (shimIndex > -1) {
            this.applications.splice(shimIndex, 1);
        }
    };
    return KatAppProviderShim;
}());
(function ($, window, document, undefined) {
    var KatAppPlugIn = /** @class */ (function () {
        function KatAppPlugIn(id, element, options, provider) {
            var _a, _b;
            this.id = id;
            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            // Transfer data attributes over if present...
            var attrResultTabs = element.attr("rbl-result-tabs");
            var attributeOptions = {
                calcEngine: (_a = element.attr("rbl-calc-engine")) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.calcEngine,
                inputTab: (_b = element.attr("rbl-input-tab")) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: element.attr("rbl-view"),
                viewTemplates: element.attr("rbl-view-templates")
            };
            this.options = KatApp.extend({}, // make a clone (so we don't have all plugin targets using same reference)
            KatApp.defaultOptions, // start with default options
            attributeOptions, // data attribute options have next precedence
            options // finally js options override all
            );
            this.element = element;
            this.element[0][pluginName] = this;
            this.provider = provider;
            this.provider.init(this);
        }
        KatAppPlugIn.prototype.calculate = function (options) {
            this.provider.calculate(this, options);
        };
        KatAppPlugIn.prototype.saveCalcEngine = function (location) {
            this.provider.saveCalcEngine(this, location);
        };
        KatAppPlugIn.prototype.traceCalcEngine = function () {
            this.provider.traceCalcEngine(this);
        };
        KatAppPlugIn.prototype.refreshCalcEngine = function () {
            this.provider.refreshCalcEngine(this);
        };
        KatAppPlugIn.prototype.configureUI = function (customOptions) {
            var manualInputs = { manualInputs: { iConfigureUI: 1 } };
            this.provider.calculate(this, KatApp.extend({}, customOptions, manualInputs));
        };
        KatAppPlugIn.prototype.destroy = function () {
            this.provider.destroy(this);
            delete this.element[0][pluginName];
        };
        KatAppPlugIn.prototype.updateOptions = function (options) {
            this.options = KatApp.extend(/* true, */ this.options, options);
            this.provider.updateOptions(this);
        };
        KatAppPlugIn.prototype.getResultRow = function (table, id, columnToSearch) {
            return this.provider.getResultRow(this, table, id, columnToSearch);
        };
        KatAppPlugIn.prototype.getResultValue = function (table, id, column, defaultValue) {
            return this.provider.getResultValue(this, table, id, column, defaultValue);
        };
        KatAppPlugIn.prototype.trace = function (message) {
            var _a, _b, _c, _d;
            if ((_a = this.options.enableTrace) !== null && _a !== void 0 ? _a : false) {
                var id = (_b = this.element.attr("rbl-trace-id")) !== null && _b !== void 0 ? _b : this.id;
                var className = (_c = this.element[0].className) !== null && _c !== void 0 ? _c : "No classes";
                var viewId = (_d = this.element.attr("rbl-view")) !== null && _d !== void 0 ? _d : "None";
                var item = $("<div>Application " + id + " (class=" + className + ", view=" + viewId + "): " + message + "</div>");
                console.log(item.text());
                $(".rbl-logclass").append(item);
            }
        };
        return KatAppPlugIn;
    }());
    /*
    const privateMethod = function(this: KatAppPlugIn): void
    {
        // Private method not accessible outside plug in, however, if you want to call it from plug in implementation,
        // need to call via privateMethod.apply(this); so that the PlugIn is the 'this context'
    }
    */
    var allowedPropertyGetters = ['options'];
    var autoInitMethods = ['calculate', 'updateOptions'];
    // https://stackoverflow.com/a/2117523
    var getId = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
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
    $.fn[pluginName] = function (options) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (options === undefined || typeof options === 'object') {
            if (options == undefined && this.length > 0 && this.first()[0][pluginName] != null) {
                return this.first()[0][pluginName];
            }
            // Creates a new plugin instance, for each selected element, and
            // stores a reference within the element's data
            return this.each(function () {
                if (!this[pluginName]) {
                    var provider = $.fn[pluginName].provider;
                    new KatAppPlugIn(getId(), $(this), options, provider);
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
                var instance = this[0][pluginName];
                return typeof instance[options] === 'function'
                    ? instance[options].apply(instance) // eslint-disable-line prefer-spread
                    : instance[options];
            }
            else {
                // Invoke the speficied method on each selected element
                return this.each(function () {
                    var instance = this[pluginName];
                    // If plugin isn't created yet and they call a method, just auto init for them
                    if (instance === undefined && typeof options === 'string' && $.inArray(options, autoInitMethods) != -1) {
                        var provider = $.fn[pluginName].provider;
                        var appOptions = (args.length >= 1 && typeof args[0] === "object" ? args[0] : undefined);
                        instance = new KatAppPlugIn(getId(), $(this), appOptions, provider);
                    }
                    if (instance instanceof KatAppPlugIn && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args); // eslint-disable-line prefer-spread
                    }
                });
            }
        }
    };
    $.fn[pluginName].provider = new KatAppProviderShim();
})(jQuery, window, document);
//# sourceMappingURL=KatApp.js.map