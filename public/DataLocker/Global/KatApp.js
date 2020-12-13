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
        var _this = this;
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        sources.forEach(function (source) {
            if (source === undefined)
                return;
            _this.copyProperties(target, source);
        });
        return target;
    };
    ;
    KatApp.clone = function (source, replacer) {
        return this.copyProperties({}, source, replacer);
    };
    ;
    KatApp.copyProperties = function (target, source, replacer) {
        var _this = this;
        Object.keys(source).forEach(function (key) {
            var value = replacer != null
                ? replacer(key, source[key])
                : source[key];
            // Always do deep copy
            if (typeof value === "object" && target[key] != undefined) {
                _this.copyProperties(target[key], value);
            }
            else {
                target[key] = value;
            }
        });
        return target;
    };
    ;
    KatApp.ping = function (url, callback) {
        var ip = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
        $.ajax({
            url: "http://" + ip + "/DataLocker/Global/ping.js",
            timeout: 1000,
            success: function ( /* result */) {
                callback(true);
            },
            error: function ( /* result */) {
                callback(false);
            }
        });
        /*
        // https://stackoverflow.com/a/11941783/166231
        let inUse = true;
        const img = new Image();
        img.onload = function (): void {
            inUse = false;
            callback(true);
        };
        // onerror is also success, because this means the domain/ip is found, only the image not;
        img.onerror = function (e): void {
            if (inUse) {
                inUse = false;
                callback(true, e);
            }
        };
        img.src = "http://" + ip;
        
        setTimeout(function () {
            if (inUse) {
                inUse = false;
                callback(false);
            }
        }, 1000);
        */
    };
    KatApp.trace = function (application, message, verbosity) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (verbosity === void 0) { verbosity = TraceVerbosity.Normal; }
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
    // obsolete, this is managed in KatAppProvider now...
    KatApp.getResources = function (application, resources, useTestVersion, isScript, debugResourcesDomain, getResourcesHandler) {
        var _a, _b;
        var currentOptions = application.options;
        var url = (_b = (_a = currentOptions.functionUrl) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.functionUrl) !== null && _b !== void 0 ? _b : KatApp.functionUrl;
        var resourceArray = resources.split(",");
        var localDomain = debugResourcesDomain !== null && debugResourcesDomain !== void 0 ? debugResourcesDomain : "http://localhost:8887/DataLocker/";
        var useLocalResources = localDomain !== undefined; // global value for all requested resources
        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string, optional Version
        var pipeline = [];
        var pipelineNames = [];
        var pipelineIndex = 0;
        var getResourcesPipeline = function () {
            if (pipelineIndex > 0) {
                application.trace(pipelineNames[pipelineIndex - 1] + ".finish", TraceVerbosity.Detailed);
            }
            if (pipelineIndex < pipeline.length) {
                application.trace(pipelineNames[pipelineIndex] + ".start", TraceVerbosity.Detailed);
                pipeline[pipelineIndex++]();
            }
        };
        var pipelineError = undefined;
        var resourceResults = {};
        // Build a pipeline of functions for each resource requested.
        // TODO: Figure out how to make this asynchronous
        pipeline =
            [
                function () {
                    if (localDomain !== undefined) {
                        if (application.element.data("kat-local-domain-reachable") == undefined) {
                            KatApp.ping(localDomain, function (responded) {
                                if (!responded) {
                                    localDomain = undefined;
                                    useLocalResources = false;
                                    application.element.data("kat-local-domain-reachable", false);
                                }
                                else {
                                    application.element.data("kat-local-domain-reachable", true);
                                }
                                getResourcesPipeline(); // Now start downloading resources
                            });
                        }
                        else {
                            if (!application.element.data("kat-local-domain-reachable")) {
                                // Already pinged and no return
                                localDomain = undefined;
                                useLocalResources = false;
                            }
                            getResourcesPipeline(); // Now start downloading resources
                        }
                    }
                    else {
                        getResourcesPipeline(); // Now start downloading resources
                    }
                }
            ].concat(resourceArray.map(function (r) {
                return function () {
                    var _a;
                    if (pipelineError !== undefined) {
                        getResourcesPipeline();
                        return;
                    }
                    var useLocalResource = useLocalResources; // value for current requested resource
                    try {
                        var resourceParts = r.split(":");
                        var resource_1 = resourceParts[1];
                        var folder = resourceParts[0];
                        var currentFolder_1 = 0;
                        var folders_1 = folder.split("|");
                        var version = resourceParts.length > 2 ? resourceParts[2] : (useTestVersion ? "Test" : "Live"); // can provide a version as third part of name if you want
                        // Template names often don't use .xhtml syntax
                        if (!resource_1.endsWith(".kaml") && !isScript) {
                            resource_1 += ".kaml";
                        }
                        var params_1 = {
                            Command: 'KatAppResource',
                            Resources: [
                                {
                                    Resource: resource_1,
                                    Folder: folder,
                                    Version: version
                                }
                            ]
                        };
                        var localFolder_1 = folders_1[currentFolder_1] + "/";
                        var isRelativePath_1 = KatApp.stringCompare(localFolder_1, "Rel/", true) == 0;
                        var submit_1 = (_a = (!useLocalResource ? currentOptions.submitCalculation : undefined)) !== null && _a !== void 0 ? _a : function (_app, o, done, fail) {
                            var resourceUrl = useLocalResource ? localDomain + localFolder_1 + resource_1 : url; // + JSON.stringify( params )
                            if (isRelativePath_1) {
                                resourceUrl = resource_1;
                            }
                            KatApp.trace(application, "Downloading " + resource_1 + " from " + resourceUrl, TraceVerbosity.Diagnostic);
                            var ajaxConfig = {
                                url: resourceUrl,
                                data: !useLocalResource && !isRelativePath_1 ? JSON.stringify(o) : undefined,
                                method: !useLocalResource && !isRelativePath_1 ? "POST" : undefined,
                                dataType: !useLocalResource && !isRelativePath_1 ? "json" : undefined,
                                // async: true, // NO LONGER ALLOWED TO BE FALSE BY BROWSER
                                cache: false
                            };
                            // Need to use .ajax isntead of .getScript/.get to get around CORS problem
                            // and to also conform to using the submitCalculation wrapper by L@W.
                            $.ajax(ajaxConfig).done(done).fail(fail);
                        };
                        var submitDone_1 = function (data) {
                            var _a, _b;
                            if (data == null) {
                                // Bad return from L@W
                                pipelineError = "getResources failed requesting " + r + " from L@W.";
                                getResourcesPipeline();
                            }
                            else {
                                if (data.payload !== undefined) {
                                    data = JSON.parse(data.payload);
                                }
                                // data.Content when request from service, just data when local files
                                var resourceContent = (_b = (_a = data.Resources) === null || _a === void 0 ? void 0 : _a[0].Content) !== null && _b !== void 0 ? _b : data;
                                if (isScript) {
                                    // If local script location is provided, doing the $.ajax code automatically 
                                    // injects/executes the javascript, no need to do it again
                                    var body = document.querySelector('body');
                                    // Still trying to figure out how to best determine if I inject or not, might have to make a variable
                                    // at top of code in KatAppProvider, but if it 'ran', then $.fn.KatApp.plugInShims should be undefined.
                                    // Originally, I just looked to see if debugResourcesDomain was undefined...but if that is set and the domain
                                    // does NOT match domain of site running (i.e. debugging site in asp.net that uses KatApps and I want it to
                                    // hit development KatApp resources) then it doesn't inject it.  So can't just check undefined or not.
                                    if (body !== undefined && body !== null && $.fn.KatApp.plugInShims !== undefined && resourceContent !== undefined) {
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
                            }
                        };
                        var submitFailed_1 = function (_jqXHR, textStatus, _errorThrown) {
                            // If local resources, syntax like LAW.CLIENT|LAW:sharkfin needs to try client first, then
                            // if not found, try generic.
                            if (useLocalResource && currentFolder_1 < folders_1.length - 1) {
                                currentFolder_1++;
                                localFolder_1 = !isScript ? folders_1[currentFolder_1] + "/" : "";
                                submit_1(application, params_1, submitDone_1, submitFailed_1);
                            }
                            else if (useLocalResource && !isRelativePath_1 && currentFolder_1 >= folders_1.length - 1) {
                                useLocalResource = false; // If I had useLocalResource but it couldn't find it, try real site
                                submit_1(application, params_1, submitDone_1, submitFailed_1);
                            }
                            else {
                                pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                                console.log(_errorThrown);
                                getResourcesPipeline();
                            }
                        };
                        submit_1(application, params_1, submitDone_1, submitFailed_1);
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
            ]));
        pipelineNames = ["getResourcesPipeline.ping"].concat(resourceArray.map(function (r) { return "getResourcesPipeline." + r; }).concat(["getResourcesPipeline.finalize"]));
        // Start the pipeline
        getResourcesPipeline();
    };
    KatApp.functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    KatApp.sessionUrl = "https://btr.lifeatworkportal.com/services/evolution/Calculation.ashx";
    KatApp.pageParameters = KatApp.readPageParameters();
    // Default Options (shim, rest of the options/features added from server plugin)
    KatApp.defaultOptions = {
        debug: {
            traceVerbosity: TraceVerbosity.None,
            useTestPlugin: KatApp.pageParameters["testplugin"] === "1",
            useTestView: KatApp.pageParameters["testview"] === "1",
            saveFirstCalculationLocation: KatApp.pageParameters["save"]
        },
        functionUrl: KatApp.functionUrl
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
        KatAppPlugInShim.prototype.calculate = function ( /* options?: KatAppOptions */) {
            // do nothing, only 'provider' does a calculate
        };
        KatAppPlugInShim.prototype.updateOptions = function (options) {
            this.options = KatApp.extend(this.options, options);
        };
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
                    var instance = this.KatApp;
                    if (options == "ensure") {
                        var appOptions = (args.length >= 1 && typeof args[0] === "object" ? args[0] : undefined);
                        if (instance === undefined) {
                            $.fn.KatApp.applicationFactory(KatApp.generateId(), $(this), appOptions);
                        }
                        else if (appOptions !== undefined) {
                            instance.updateOptions(appOptions);
                            if (appOptions.defaultInputs !== undefined) {
                                instance.calculate();
                            }
                        }
                    }
                    else if (instance !== undefined && typeof instance[options] === 'function') {
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
        var _a, _b, _c, _d, _e, _f;
        var shim = new KatAppPlugInShim(id, element, options);
        shim.trace("Starting factory", TraceVerbosity.Diagnostic);
        var applications = $.fn.KatApp.plugInShims;
        applications.push(shim);
        // First time anyone has been called with .KatApp()
        if (applications.length === 1) {
            shim.trace("Loading KatAppProvider library...", TraceVerbosity.Detailed);
            var debugProviderDomain = (_a = shim.options.debug) === null || _a === void 0 ? void 0 : _a.debugProviderDomain;
            if (debugProviderDomain !== undefined) {
                debugProviderDomain += "js/";
            }
            var useTestService = (_f = (_d = (_c = (_b = shim.options) === null || _b === void 0 ? void 0 : _b.debug) === null || _c === void 0 ? void 0 : _c.useTestPlugin) !== null && _d !== void 0 ? _d : (_e = KatApp.defaultOptions.debug) === null || _e === void 0 ? void 0 : _e.useTestPlugin) !== null && _f !== void 0 ? _f : false;
            KatApp.getResources(shim, "Global:KatAppProvider.js", useTestService, true, debugProviderDomain, function (errorMessage) {
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