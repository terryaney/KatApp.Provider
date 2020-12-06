"use strict";
var providerVersion = 8.35; // eslint-disable-line @typescript-eslint/no-unused-vars
KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);
// Need this function format to allow for me to reload script over and over (during debugging/rebuilding)
(function ($, window, document, undefined) {
    var tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    var validInputSelector = "[data-itemtype='checkbox'] :input, .notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;
    var skipBindingInputSelector = ".notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;
    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend({
        debug: {
            traceVerbosity: TraceVerbosity.None,
            saveFirstCalculationLocation: KatApp.pageParameters["save"],
            useTestCalcEngine: KatApp.pageParameters["test"] === "1",
            refreshCalcEngine: KatApp.pageParameters["expirece"] === "1"
            // Set in KatApp.ts
            // useTestView: KatApp.pageParameters[ "testview"] === "1",
            // useTestPlugin: KatApp.pageParameters[ "testplugin"] === "1",
        },
        shareDataWithOtherApplications: true,
        functionUrl: KatApp.functionUrl,
        sessionUrl: KatApp.sessionUrl,
        currentPage: "Unknown1",
        inputSelector: "input, textarea, select",
        runConfigureUICalculation: true,
        ajaxLoaderSelector: ".ajaxloader",
        onCalculateStart: function (application) {
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).show();
            }
            var inputSelector = application.element.data("katapp-input-selector");
            if (inputSelector !== undefined) {
                $(".slider-control, " + inputSelector, application.element)
                    // .not(skipBindingInputSelector)
                    .filter(":not(" + skipBindingInputSelector + ", :disabled)")
                    // .not(":disabled")
                    .attr("disabled", "disabled")
                    .attr("kat-disabled", "true");
                if (typeof $.fn.selectpicker === "function") {
                    $("select.bootstrap-select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
                }
            }
            /*
            $( ".slider-control, input:enabled, select:enabled", application.element ).attr("disabled", "disabled").attr("kat-disabled", "true");

            if ( typeof $.fn.selectpicker === "function" ) {
                $("select.bootstrap-select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
            }
            */
        },
        onCalculateEnd: function (application) {
            $(".needsRBLeConfig", application.element).removeClass("needsRBLeConfig");
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).fadeOut();
            }
            if (typeof $.fn.selectpicker === "function") {
                $("select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']", application.element).removeAttr("disabled").selectpicker("refresh");
            }
            $("[kat-disabled='true']", application.element).removeAttr("disabled kat-disabled");
        },
        // Default to just an empty (non-data) package
        getData: function (appilcation, options, done, _fail) {
            done({
                AuthID: "Empty",
                Client: "Empty",
                Profile: {},
                History: {}
            });
        }
    }, KatApp.defaultOptions /* default options already set */);
    var KatAppPlugIn /* implements KatAppPlugInInterface */ = /** @class */ (function () {
        function KatAppPlugIn(id, element, options) {
            var _a;
            this.options = {};
            this.id = "ka" + id; // Some BS elements weren't working if ID started with #
            this.element = element;
            this.displayId = (_a = element.attr("rbl-trace-id")) !== null && _a !== void 0 ? _a : id;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[0].KatApp = this;
            this.ui = $.fn.KatApp.ui(this);
            this.rble = $.fn.KatApp.rble(this, this.ui);
            this.templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory(this);
            this.init(options);
        }
        KatAppPlugIn.prototype.init = function (options) {
            var _a, _b, _c, _d, _e, _f;
            // Transfer data attributes over if present...
            var attrResultTabs = this.element.attr("rbl-result-tabs");
            var attributeOptions = {
                calcEngine: (_a = this.element.attr("rbl-calcengine")) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.calcEngine,
                inputTab: (_b = this.element.attr("rbl-input-tab")) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: this.element.attr("rbl-view"),
                viewTemplates: this.element.attr("rbl-view-templates")
            };
            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend({}, // make a clone (so we don't have all plugin targets using same reference)
            KatApp.defaultOptions, // start with default options
            attributeOptions, // data attribute options have next precedence
            // If at time of constructor call the default options or options passed in has a registerData 
            // delegate assigned, then change the default value of this property (Not sure of my logic
            // to set shareDataWithOtherApplications to false if there is a registeredToken, but maybe ok
            // to require caller to explicitly set that option if they are passing in an already
            // registered token)
            {
                // Set this property so that provider knows which URL to call to RBLe service (session/function)
                // and whether to pass in token/data appropriately.  Could probably eliminate this property and
                // have logic that figured out when needed, but this just made it easier
                registerDataWithService: KatApp.defaultOptions.registerData !== undefined || (options === null || options === void 0 ? void 0 : options.registerData) !== undefined || ((options === null || options === void 0 ? void 0 : options.registeredToken) !== undefined),
                shareDataWithOtherApplications: (options === null || options === void 0 ? void 0 : options.registeredToken) === undefined
            }, options // finally js options override all
            );
            var saveFirstCalculationLocation = (_c = this.options.debug) === null || _c === void 0 ? void 0 : _c.saveFirstCalculationLocation;
            if (saveFirstCalculationLocation !== undefined && saveFirstCalculationLocation !== "1") {
                this.element.data("katapp-save-calcengine", saveFirstCalculationLocation);
            }
            this.element.attr("rbl-application-id", this.id);
            this.element.addClass("katapp-" + this.id);
            this.trace("Started init", TraceVerbosity.Detailed);
            var pipeline = [];
            var pipelineNames = [];
            var pipelineIndex = 0;
            var that = this;
            var initPipeline = function (offset) {
                if (pipelineIndex > 0) {
                    that.trace(pipelineNames[pipelineIndex - 1] + ".finish", TraceVerbosity.Detailed);
                }
                pipelineIndex += offset;
                if (pipelineIndex < pipeline.length) {
                    that.trace(pipelineNames[pipelineIndex] + ".start", TraceVerbosity.Detailed);
                    pipeline[pipelineIndex++]();
                }
            };
            var pipelineError = undefined;
            var useTestView = (_e = (_d = that.options.debug) === null || _d === void 0 ? void 0 : _d.useTestView) !== null && _e !== void 0 ? _e : false;
            var functionUrl = that.options.functionUrl;
            var viewId = (_f = that.options.view) === null || _f === void 0 ? void 0 : _f.ensureGlobalPrefix();
            // Gather up all requested templates requested for the current application so I can bind up any
            // onTemplate() delegates.
            var requiredTemplates = that.options.viewTemplates != undefined
                ? that.options.viewTemplates.split(",").map(function (r) { return r.ensureGlobalPrefix(); })
                : [];
            var resourceResults = undefined;
            //#region - Pipeline Flow Documentation
            /*
                1. Get View (will release flow control when ajax.get() called)
                    When View is returned...
                        a. If error, set pipelineError and jump to finish
                        b. If no error
                            1. Inject view into markup
                            2. If any templates specified on <rbl-config/>, append it to requiredTemplates list.
                2. Get all requiredTemplates ...
                    a. For any required templates *already* requested...
                        1. Can not leave this pipeline step until notified for each template
                        2. Register callbacks that will be called with template is ready. Each callback...
                            a. If error occurred on any previous template callback, exit function doing nothing
                            b. If not waiting for any more templates, continue to next pipeline
                            c. If waiting for more, set flag and continue to wait
                    b. For any required templates *not* already requested *or* downloaded...
                        1. Initialize the _templatesUsedByAllApps variable for template so other apps know it is requested
                        2. Get templates (will release flow control when ajax.get() called)
                            When templates are returned...
                                a. If error, set pipelineError, call all template callbacks (of other apps) signalling error, and jump to finish
                                b. If no error
                                    1. If not waiting for other templates, continue to next pipeline
                                    2. If waiting for other templates, exit function, the template delegates will move pipeline along
                3. Inject templates ...
                    a. For all templates downloaded by *this* application...
                        1. Inject the template into markup
                        2. Set the _templatesUsedByAllApps.data property
                        3. For all registered template callbacks, call the template callback signalling success.
                4. Process templates ...
                    1. If any error during pipeline, log error
                    2. If no errors...
                        a. For every template needed by this application (downloaded by *any* application)...
                            1. Hook up all event handlers registered with onTemplate()
                        b. Process templates that do *not* use RBL results
                        c. Bind all change.RBLe events to all application inputs
                        d. Trigger onInitialized event.
                        e. Call configureUI calculation if needed (will release flow control when I call $ajax() method to RBLe service)
            */
            //#endregion
            var _templatesUsedByAllApps = $.fn.KatApp.templatesUsedByAllApps;
            var _templateDelegates = $.fn.KatApp.templateDelegates;
            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            var loadView = function () {
                var _a;
                if (viewId !== undefined) {
                    that.trace(viewId + " requested from CMS.", TraceVerbosity.Detailed);
                    var debugResourcesDomain = (_a = that.options.debug) === null || _a === void 0 ? void 0 : _a.debugResourcesDomain;
                    KatApp.getResources(that, viewId, useTestView, false, debugResourcesDomain, function (errorMessage, results) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                        pipelineError = errorMessage;
                        if (pipelineError === undefined) {
                            that.trace(viewId + " returned from CMS.", TraceVerbosity.Normal);
                            var thisClassCss = ".katapp-" + that.id;
                            var data = results[viewId] // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                .format({ thisView: "[rbl-application-id='" + that.id + "']", id: that.id, thisClass: thisClassCss });
                            // Process as view - get info from rbl-config and inject markup
                            var view = $("<div class='katapp-css'>" + data.replace(/\.thisClass/g, thisClassCss).replace(/thisClass/g, thisClassCss) + "</div>");
                            var rblConfig = $("rbl-config", view).first();
                            if (rblConfig.length !== 1) {
                                that.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                            }
                            that.options.calcEngine = (_a = that.options.calcEngine) !== null && _a !== void 0 ? _a : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("calcengine");
                            that.options.inputTab = (_c = (_b = that.options.inputTab) !== null && _b !== void 0 ? _b : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("input-tab")) !== null && _c !== void 0 ? _c : "RBLInput";
                            that.options.resultTabs = (_f = (_d = that.options.resultTabs) !== null && _d !== void 0 ? _d : (_e = rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("result-tabs")) === null || _e === void 0 ? void 0 : _e.split(",")) !== null && _f !== void 0 ? _f : ["RBLResult"];
                            that.options.preCalcs = (_g = that.options.preCalcs) !== null && _g !== void 0 ? _g : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("precalcs");
                            var toFetch = rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("templates");
                            if (toFetch !== undefined) {
                                requiredTemplates =
                                    requiredTemplates
                                        .concat(toFetch.split(",").map(function (r) { return r.ensureGlobalPrefix(); }))
                                        // unique templates only
                                        .filter(function (v, i, a) { return v !== undefined && v.length != 0 && a.indexOf(v) === i; });
                            }
                            that.options.inputTab = (_h = that.options.inputTab) !== null && _h !== void 0 ? _h : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("input-tab");
                            var attrResultTabs_1 = rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("result-tabs");
                            that.options.resultTabs = (_j = that.options.resultTabs) !== null && _j !== void 0 ? _j : (attrResultTabs_1 != undefined ? attrResultTabs_1.split(",") : undefined);
                            that.element.empty().append(view);
                            initPipeline(0);
                        }
                        else {
                            pipelineError = errorMessage;
                            initPipeline(2); // jump to finish
                        }
                    });
                }
                else {
                    initPipeline(0);
                }
            };
            var loadTemplates = function () {
                var _a, _b;
                // Total number of resources already requested that I have to wait for
                var otherResourcesNeeded = 0;
                // For all templates that are already being fetched, create a callback to move on when 
                // not waiting for any more resources
                requiredTemplates.filter(function (r) { var _a, _b; return ((_b = (_a = _templatesUsedByAllApps[r]) === null || _a === void 0 ? void 0 : _a.requested) !== null && _b !== void 0 ? _b : false); })
                    .forEach(function (r) {
                    otherResourcesNeeded++;
                    that.trace("Need to wait for already requested template: " + r, TraceVerbosity.Detailed);
                    _templatesUsedByAllApps[r].callbacks.push(function (errorMessage) {
                        that.trace("Template: " + r + " is now ready.", TraceVerbosity.Detailed);
                        // only process (moving to finish or next step) if not already assigned an error
                        if (pipelineError === undefined) {
                            if (errorMessage === undefined) {
                                otherResourcesNeeded--;
                                if (otherResourcesNeeded === 0) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                    initPipeline(0); // move to next step if not waiting for anything else
                                }
                                else {
                                    that.trace("Waiting for " + otherResourcesNeeded + " more templates.", TraceVerbosity.Diagnostic);
                                }
                            }
                            else {
                                that.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet);
                                pipelineError = errorMessage;
                                initPipeline(1); // jump to finish
                            }
                        }
                    });
                });
                // Array of items this app will fetch because not requested yet
                var toFetch = [];
                // For every template this app needs that is *NOT* already requested for download
                // or finished, add it to the fetch list and set the state to 'requesting'
                requiredTemplates
                    .filter(function (r) { var _a, _b, _c; return !((_b = (_a = _templatesUsedByAllApps[r]) === null || _a === void 0 ? void 0 : _a.requested) !== null && _b !== void 0 ? _b : false) && ((_c = _templatesUsedByAllApps[r]) === null || _c === void 0 ? void 0 : _c.data) === undefined; })
                    .forEach(function (r) {
                    _templatesUsedByAllApps[r] = { requested: true, callbacks: [] };
                    toFetch.push(r);
                });
                if (toFetch.length > 0) {
                    var toFetchList_1 = toFetch.join(",");
                    that.trace(toFetchList_1 + " requested from CMS.", TraceVerbosity.Detailed);
                    var debugResourcesDomain = (_a = that.options.debug) === null || _a === void 0 ? void 0 : _a.debugResourcesDomain;
                    that.trace((_b = "Downloading " + toFetchList_1 + " from " + debugResourcesDomain) !== null && _b !== void 0 ? _b : functionUrl, TraceVerbosity.Diagnostic);
                    KatApp.getResources(that, toFetchList_1, useTestView, false, debugResourcesDomain, function (errorMessage, data) {
                        if (errorMessage === undefined) {
                            resourceResults = data;
                            that.trace(toFetchList_1 + " returned from CMS.", TraceVerbosity.Normal);
                            // Only move on if not waiting on any more resources from other apps
                            if (otherResourcesNeeded === 0) {
                                that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                initPipeline(0);
                            }
                            else {
                                that.trace("Can't move to next step because waiting on templates.", TraceVerbosity.Diagnostic);
                            }
                        }
                        else {
                            toFetch.forEach(function (r) {
                                // call all registered callbacks from other apps
                                var currentCallback = undefined;
                                while ((currentCallback = _templatesUsedByAllApps[r].callbacks.pop()) !== undefined) {
                                    currentCallback(errorMessage);
                                }
                                _templatesUsedByAllApps[r].requested = false; // remove it so someone else might try to download again
                            });
                            pipelineError = errorMessage;
                            initPipeline(1); // jump to finish
                        }
                    });
                }
                else if (otherResourcesNeeded === 0) {
                    initPipeline(1); // jump to finish
                }
            };
            var injectTemplates = function () {
                if (resourceResults != null) {
                    // For the templates *this app* downloaded, inject them into markup                        
                    Object.keys(resourceResults).forEach(function (r) {
                        var data = resourceResults[r]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        // TOM (your comment, but do we need that container?): create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                        // and this attribute used for checking(?)
                        var rblKatApps = $("rbl-katapps");
                        var t = $("<rbl-templates rbl-t='" + r.toLowerCase() + "'>" + data.replace(/{thisTemplate}/g, r) + "</rbl-templates>");
                        t.appendTo(rblKatApps);
                        that.trace(r + " injected into markup.", TraceVerbosity.Normal);
                        // Should only ever get template results for templates that I can request
                        _templatesUsedByAllApps[r].data = data;
                        _templatesUsedByAllApps[r].requested = false;
                        // call all registered callbacks from other apps
                        var currentCallback = undefined;
                        while ((currentCallback = _templatesUsedByAllApps[r].callbacks.pop()) !== undefined) {
                            currentCallback(undefined);
                        }
                    });
                }
                initPipeline(0);
            };
            var finalizeInit = function () {
                if (pipelineError === undefined) {
                    // Now, for every unique template reqeusted by client, see if any template delegates were
                    // registered for the template using templateOn().  If so, hook up the 'real' event requested
                    // to the currently running application.  Need to use templateOn() because the template is
                    // only injected once into the markup but we need to hook up events for each event that
                    // wants to use this template.
                    requiredTemplates
                        .forEach(function (t) {
                        // Loop every template event handler that was called when template loaded
                        // and register a handler to call the delegate
                        _templateDelegates
                            .filter(function (d) { return d.Template.toLowerCase() == t.toLowerCase(); })
                            .forEach(function (d) {
                            that.trace("[" + d.Events + "] events from template [" + d.Template + "] hooked up.", TraceVerbosity.Normal);
                            that.element.on(d.Events, function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                d.Delegate.apply(this, args);
                            });
                        });
                    });
                    // Update options.viewTemplates just in case someone is looking at them
                    that.options.viewTemplates = requiredTemplates.join(",");
                    // Build up template content that DOES NOT use rbl results, but instead just 
                    // uses data-* to create a dataobject.  Normally just making controls with templates here
                    $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                        var templateId = $(this).attr('rbl-tid');
                        if (templateId !== undefined && templateId !== "inline") {
                            //Replace content with template processing, using data-* items in this pass
                            that.rble.injectTemplate($(this), that.ui.getTemplate(templateId, $(this).data()));
                        }
                    });
                    // This used to be inside Standard_Template.templateOn, but since it is standard and so common, just moved it here.
                    // Original code:
                    /*
                        $.fn.KatApp.templateOn("{thisTemplate}", "onInitialized.RBLe", function (event, application) {
                            application.trace("Processing onInitialized.RBLe for Template [{thisTemplate}]...", TraceVerbosity.Normal);

                            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.onInitialized") {
                                debugger;
                            }

                            const templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory( application );
                            templateBuilder.processInputs();
                            templateBuilder.processCarousels();
                        });
                    */
                    // Process data-* attributes and bind events
                    that.templateBuilder.processUI();
                    that.ui.bindCalculationInputs();
                    that.ui.initializeConfirmLinks();
                    that.ui.triggerEvent("onInitialized", that);
                    if (that.options.runConfigureUICalculation) {
                        that.trace("Calling configureUI calculation...", TraceVerbosity.Detailed);
                        that.configureUI();
                    }
                }
                else {
                    that.trace("Error during Provider.init: " + pipelineError, TraceVerbosity.Quiet);
                }
                that.trace("Finished init", TraceVerbosity.Detailed);
                initPipeline(0); // just to get the trace statement, can remove after all tested
            };
            pipeline.push(loadView, loadTemplates, injectTemplates, finalizeInit);
            pipelineNames.push("initPipeline.loadView", "initPipeline.loadTemplates", "initPipeline.injectTemplates", "initPipeline.finalizeInit");
            // Start the pipeline
            initPipeline(0);
        };
        KatAppPlugIn.prototype.rebuild = function (options) {
            var o = KatApp.extend({}, this.options, options);
            this.ui.unbindCalculationInputs();
            this.ui.triggerEvent("onDestroyed", this);
            this.init(o);
        };
        KatAppPlugIn.prototype.setRegisteredToken = function (token) {
            var _a;
            this.options.registeredToken = token;
            if ((_a = this.options.shareDataWithOtherApplications) !== null && _a !== void 0 ? _a : false) {
                var _sharedData = $.fn.KatApp.sharedData;
                _sharedData.registeredToken = token;
                this.options.sharedDataLastRequested = _sharedData.lastRequested = Date.now();
            }
        };
        KatAppPlugIn.prototype.calculate = function (customOptions) {
            var _a;
            var _sharedData = $.fn.KatApp.sharedData;
            // Shouldn't change 'share' option with a customOptions object, so just use original options to check
            var shareDataWithOtherApplications = (_a = this.options.shareDataWithOtherApplications) !== null && _a !== void 0 ? _a : false;
            if (shareDataWithOtherApplications) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options.sharedDataLastRequested = _sharedData.lastRequested;
            }
            if (this.options.calcEngine === undefined) {
                return;
            }
            this.exception = undefined; // Should I set results to undefined too?
            var cancelCalculation = !this.ui.triggerEvent("onCalculateStart", this);
            if (cancelCalculation) {
                this.ui.triggerEvent("onCalculateEnd", this);
                return;
            }
            var that = this;
            // Build up complete set of options to use for this calculation call
            var currentOptions = KatApp.extend({}, // make a clone of the options
            that.options, // original options
            customOptions);
            var pipeline = [];
            var pipelineNames = [];
            var pipelineIndex = 0;
            var calculatePipeline = function (offset) {
                if (pipelineIndex > 0) {
                    that.trace(pipelineNames[pipelineIndex - 1] + ".finish", TraceVerbosity.Detailed);
                }
                pipelineIndex += offset;
                if (pipelineIndex < pipeline.length) {
                    that.trace(pipelineNames[pipelineIndex] + ".start", TraceVerbosity.Detailed);
                    pipeline[pipelineIndex++]();
                }
            };
            var callSharedCallbacks = function (errorMessage) {
                var currentCallback = undefined;
                while ((currentCallback = _sharedData.callbacks.pop()) !== undefined) {
                    currentCallback(errorMessage);
                }
                _sharedData.requesting = false;
                _sharedData.lastRequested = Date.now();
            };
            var pipelineError = undefined;
            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            // Calc Failed - 0, Success - 3, Unhandled Error - 3
            var submitCalculation = function () {
                try {
                    that.rble.submitCalculation(currentOptions, 
                    // If failed, let it do next job (getData, register, resubmit), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        var offset = currentOptions.registeredToken === undefined && currentOptions.data === undefined
                            ? 0
                            : 3;
                        calculatePipeline(offset);
                    });
                }
                catch (error) {
                    pipelineError = "Submit.Pipeline exception: " + error;
                    calculatePipeline(3);
                }
            };
            // Success = 1, Error - 2, Need Register - 0
            var getCalculationData = function () {
                try {
                    pipelineError = undefined; // Was set in previous pipeline calculate attempt, but clear out and try flow again
                    if (shareDataWithOtherApplications && _sharedData.requesting) {
                        that.trace("Need to wait for already requested data.", TraceVerbosity.Detailed);
                        // Wait for callback...
                        _sharedData.callbacks.push(function (errorMessage) {
                            if (errorMessage === undefined) {
                                // When called back, it'll be after getting data *or* after
                                // registration if options call for it, so just jump to resubmit
                                that.trace("Data is now ready.", TraceVerbosity.Detailed);
                                that.options.data = currentOptions.data = _sharedData.data;
                                that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                                that.options.sharedDataLastRequested = _sharedData.lastRequested;
                                calculatePipeline(1);
                            }
                            else {
                                that.trace("Data retrieval failed in other application.", TraceVerbosity.Detailed);
                                pipelineError = errorMessage;
                                calculatePipeline(2); // If error, jump to finish
                            }
                        });
                    }
                    else if (shareDataWithOtherApplications && _sharedData.lastRequested != null && (that.options.sharedDataLastRequested === undefined || _sharedData.lastRequested > that.options.sharedDataLastRequested)) {
                        // Protecting against following scenario:
                        // Two applications registered data on server and timed out due to inactivity.  Then both
                        // applications triggered calculations at 'similar times' and both submit to server.  
                        // Both throw an error because they can not find registered transaction package.
                        // 1. Application 1 returns from error and enters *this* pipeline to get data.
                        // 2. Application 1 gets data and successfully registers it, then sets 'requesting'=false.
                        // 3. Application 1 submits calculation again.
                        // 4. Application 2 returns from first calculation attempt with error of no registered data.
                        // 5. Application 2 enters *this* pipeline, but requesting is no longer true.
                        //      - Normally, it would then think it has to get/register data itself, but with this
                        //        logic, it'll first check to see if there is 'new' data, and use that if possible.
                        //
                        // So, if Sharing data, and the shared request date > application.shared request date, then
                        // just grab the data from _shared and move on to resubmit.
                        that.trace("Using existing shared data.", TraceVerbosity.Detailed);
                        that.options.data = currentOptions.data = _sharedData.data;
                        that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                        that.options.sharedDataLastRequested = _sharedData.lastRequested;
                        calculatePipeline(1);
                    }
                    else {
                        that.trace("Requesting data.", TraceVerbosity.Detailed);
                        try {
                            if (shareDataWithOtherApplications) {
                                _sharedData.requesting = true;
                                _sharedData.registeredToken = undefined;
                                _sharedData.data = undefined;
                            }
                            that.options.data = currentOptions.data = undefined;
                            that.options.registeredToken = currentOptions.registeredToken = undefined;
                            that.rble.getData(currentOptions, 
                            // If failed, then I am unable to register data, so just jump to finish, 
                            // otherwise continue to registerData or submit
                            function (errorMessage, data) {
                                if (errorMessage !== undefined) {
                                    pipelineError = errorMessage;
                                    if (shareDataWithOtherApplications) {
                                        callSharedCallbacks(errorMessage);
                                    }
                                    calculatePipeline(2); // If error, jump to finish
                                }
                                else {
                                    that.options.data = currentOptions.data = data;
                                    if (shareDataWithOtherApplications) {
                                        _sharedData.data = that.options.data;
                                        // If don't need to register, then let any applications waiting for data know that it is ready
                                        if (!that.options.registerDataWithService) {
                                            callSharedCallbacks(undefined);
                                        }
                                    }
                                    if (!that.options.registerDataWithService) {
                                        calculatePipeline(1); // If not registering data, jump to submit
                                    }
                                    else {
                                        calculatePipeline(0); // Continue to register data
                                    }
                                }
                            });
                        }
                        catch (error) {
                            if (shareDataWithOtherApplications) {
                                callSharedCallbacks(error);
                            }
                            throw error;
                        }
                    }
                }
                catch (error) {
                    pipelineError = "GetData.Pipeline exception: " + error;
                    calculatePipeline(2); // If error, jump to finish
                }
            };
            // Success = 0, Error - 1
            var registerData = function () {
                try {
                    that.rble.registerData(currentOptions, that.options.data, 
                    // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                    function (errorMessage) {
                        if (errorMessage === undefined) {
                            if (shareDataWithOtherApplications) {
                                _sharedData.registeredToken = that.options.registeredToken;
                                callSharedCallbacks(undefined);
                            }
                            calculatePipeline(0);
                        }
                        else {
                            pipelineError = errorMessage;
                            if (shareDataWithOtherApplications) {
                                callSharedCallbacks(errorMessage);
                            }
                            // If error, jump to finish
                            calculatePipeline(1);
                        }
                    });
                }
                catch (error) {
                    pipelineError = "Register.Pipeline exception: " + error;
                    if (shareDataWithOtherApplications) {
                        callSharedCallbacks(pipelineError);
                    }
                    calculatePipeline(1);
                }
            };
            // Always go 0
            var resubmitCalculation = function () {
                try {
                    that.rble.submitCalculation(currentOptions, 
                    // If failed, let it do next job (getData), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        calculatePipeline(0);
                    });
                }
                catch (error) {
                    pipelineError = "ReSubmit.Pipeline exception: " + error;
                    calculatePipeline(0);
                }
            };
            // Success - 1, Error - 1 (checks pipeline error before processing)
            var processResults = function () {
                var _a;
                that.trace("Processing results from calculation.", TraceVerbosity.Detailed);
                try {
                    if (pipelineError === undefined) {
                        that.element.removeData("katapp-save-calcengine");
                        that.element.removeData("katapp-trace-calcengine");
                        that.element.removeData("katapp-refresh-calcengine");
                        that.options.defaultInputs = undefined;
                        that.ui.triggerEvent("onResultsProcessing", that.results, currentOptions, that);
                        that.rble.processResults();
                        if (((_a = that.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                            that.ui.triggerEvent("onConfigureUICalculation", that.results, currentOptions, that);
                        }
                        that.ui.triggerEvent("onCalculation", that.results, currentOptions, that);
                        calculatePipeline(0);
                    }
                    else {
                        throw new Error(pipelineError);
                    }
                }
                catch (error) {
                    that.rble.setResults(undefined);
                    that.trace("Error during result processing: " + error, TraceVerbosity.None);
                    that.ui.triggerEvent("onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that);
                    calculatePipeline(1);
                }
            };
            // Always go 0
            var updateData = function () {
                that.trace("Posting jwt update data from results.", TraceVerbosity.Detailed);
                try {
                    var uploadUrl = that.options.rbleUpdatesUrl;
                    var jwtToken = {
                        Tokens: that.getResultTable("jwt-data").map(function (r) { return ({ Name: r["@id"], Token: r["value"] }); })
                    };
                    if (jwtToken.Tokens.filter(function (t) { return t.Name == "data-updates"; }).length > 0 && uploadUrl !== undefined) {
                        var jsonParams = {
                            url: uploadUrl,
                            type: "POST",
                            processData: false,
                            data: JSON.stringify(jwtToken),
                            dataType: "json"
                        };
                        $.ajax(jsonParams)
                            .done(function (data) {
                            if (data.Status != 1) {
                                console.log("Unable to save data: " + data.Message);
                                that.ui.triggerEvent("onDataUpdateErrors", data.Message, that.exception, currentOptions, that);
                            }
                            else {
                                that.ui.triggerEvent("onDataUpdate", that.results, currentOptions, that);
                            }
                            calculatePipeline(0);
                        })
                            .fail(function (_jqXHR, textStatus) {
                            console.log("Unable to save data: " + textStatus);
                            that.ui.triggerEvent("onDataUpdateErrors", textStatus, that.exception, currentOptions, that);
                            calculatePipeline(0);
                        });
                    }
                    else {
                        calculatePipeline(0);
                    }
                }
                catch (error) {
                    that.trace("Error during jwd update data processing: " + error, TraceVerbosity.None);
                    that.ui.triggerEvent("onDataUpdateErrors", error, that.exception, currentOptions, that);
                    calculatePipeline(0);
                }
            };
            var calculateEnd = function () {
                that.ui.triggerEvent("onCalculateEnd", that);
                calculatePipeline(0);
            };
            pipeline.push(submitCalculation, getCalculationData, registerData, resubmitCalculation, processResults, updateData, calculateEnd);
            pipelineNames.push("calculatePipeline.submitCalculation", "calculatePipeline.getCalculationData", "calculatePipeline.registerData", "calculatePipeline.resubmitCalculation", "calculatePipeline.processResults", "calculatePipeline.updateData", "calculatePipeline.calculateEnd");
            // Start the pipeline
            calculatePipeline(0);
        };
        KatAppPlugIn.prototype.configureUI = function (customOptions) {
            var manualInputs = { manualInputs: { iConfigureUI: 1, iDataBind: 1 } };
            this.calculate(KatApp.extend({}, customOptions, manualInputs));
        };
        KatAppPlugIn.prototype.destroy = function () {
            this.element.removeAttr("rbl-application-id");
            this.element.removeClass("katapp-" + this.id);
            this.element.removeData("katapp-save-calcengine");
            this.element.removeData("katapp-refresh-calcengine");
            this.element.removeData("katapp-trace-calcengine");
            this.element.off(".RBLe");
            this.ui.unbindCalculationInputs();
            this.ui.triggerEvent("onDestroyed", this);
            delete this.element[0].KatApp;
        };
        KatAppPlugIn.prototype.updateOptions = function (options) {
            this.options = KatApp.extend({}, this.options, options);
            this.ui.unbindCalculationInputs();
            // When calling this method, presummably all the inputs are available
            // and caller wants the input (html element) to be updated.  When passed
            // in on a rebuild/init I don't apply them until a calculation is ran.
            if (this.options.defaultInputs !== undefined) {
                this.setInputs(this.options.defaultInputs);
                this.options.defaultInputs = undefined;
            }
            this.ui.bindCalculationInputs();
            this.ui.triggerEvent("onOptionsUpdated", this);
        };
        KatAppPlugIn.prototype.setInputs = function (inputs, calculate) {
            var _this = this;
            if (calculate === void 0) { calculate = true; }
            // When called publicly, want to trigger a calculation, when called from init() we don't
            Object.keys(inputs).forEach(function (i) {
                _this.rble.setDefaultValue(i, inputs[i]);
            });
            if (calculate) {
                this.calculate();
            }
        };
        KatAppPlugIn.prototype.getInputs = function () {
            return this.ui.getInputs(this.options);
        };
        ;
        KatAppPlugIn.prototype.serverCalculation = function (customInputs) {
            var calculationConfiguration = {
                currentPage: this.options.currentPage,
                calcEngine: this.options.calcEngine,
                inputTab: this.options.inputTab,
                resultTabs: this.options.resultTabs,
                preCalcs: this.options.preCalcs
            };
            var actionParameters = {
                "KatAppCalculationConfiguration": JSON.stringify(calculationConfiguration),
                "KatAppCustomInputs": JSON.stringify(customInputs !== null && customInputs !== void 0 ? customInputs : {})
            };
            this.apiAction("ServerCalculation", false, actionParameters);
        };
        KatAppPlugIn.prototype.apiAction = function (commandName, isDownload, parametersJson) {
            var _a;
            var url = this.options.rbleUpdatesUrl;
            if (url != undefined) {
                var fd = new FormData();
                fd.append("KatAppCommand", commandName);
                fd.append("KatAppView", (_a = this.options.view) !== null && _a !== void 0 ? _a : "Unknown");
                fd.append("KatAppInputs", JSON.stringify(this.getInputs()));
                if (parametersJson != undefined && Object.keys(parametersJson).length > 0) {
                    for (var propertyName in parametersJson) {
                        fd.append(propertyName, parametersJson[propertyName]);
                    }
                }
                var errors_1 = [];
                // Can't use 'view' in selector for validation summary b/c view could be a 'container' instead of entire view
                // if caller only wants to initialize a newly generated container's html                        
                var errorSummary_1 = $("#" + this.id + "_ModelerValidationTable", this.element);
                $('.validator-container.error:not(.server)', this.element).removeClass('error');
                $(".ajaxloader", this.element).show();
                var xhr_1 = new XMLHttpRequest();
                xhr_1.open('POST', url, true);
                xhr_1.onreadystatechange = function () {
                    // https://stackoverflow.com/a/29039823/166231
                    /*
                    if (xhr.readyState == 4) {
                        if (xhr.status == 200) {
                            console.log(typeof xhr.response); // should be a blob
                        }
                    } else */
                    if (xhr_1.readyState == 2) {
                        if (isDownload && xhr_1.status == 200) {
                            xhr_1.responseType = "blob";
                        }
                        else {
                            xhr_1.responseType = "text";
                        }
                    }
                };
                var that_1 = this;
                xhr_1.onload = function () {
                    if (xhr_1.responseType == "text") {
                        var jsonResponse = JSON.parse(xhr_1.responseText);
                        if (xhr_1.status == 500) {
                            if (jsonResponse["Validations"] != undefined && errorSummary_1.length > 0) {
                                jsonResponse.Validations.forEach(function (v) {
                                    errors_1.push({ "@id": v["ID"], text: v["Message"] });
                                });
                            }
                            if (errors_1.length == 0) {
                                that_1.ui.triggerEvent("onActionFailed", commandName, jsonResponse, that_1);
                                console.log("Show error: " + jsonResponse.Message);
                                errors_1.push({ "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
                            }
                        }
                        else {
                            that_1.ui.triggerEvent("onActionResult", commandName, jsonResponse, that_1);
                        }
                    }
                    else {
                        var blob = xhr_1.response;
                        that_1.ui.triggerEvent("onActionResult", commandName, undefined, that_1);
                        var filename = "Download.pdf";
                        var disposition = xhr_1.getResponseHeader('Content-Disposition');
                        if (disposition && disposition.indexOf('attachment') !== -1) {
                            filename = disposition.split('filename=')[1].split(';')[0];
                        }
                        var tempEl = document.createElement("a");
                        $(tempEl).addClass("d-none hidden");
                        url = window.URL.createObjectURL(blob);
                        tempEl.href = url;
                        tempEl.download = filename;
                        tempEl.click();
                        window.URL.revokeObjectURL(url);
                    }
                    that_1.ui.triggerEvent("onActionComplete", commandName, that_1);
                    that_1.rble.processValidationRows(errorSummary_1, errors_1);
                    $(".ajaxloader", that_1.element).hide();
                }; // don't think I need this .bind(actionLink);
                this.ui.triggerEvent("onActionStart", commandName, this);
                xhr_1.send(fd);
            }
        };
        // Result helper
        KatAppPlugIn.prototype.getResultTable = function (tableName) {
            return this.rble.getResultTable(tableName);
        };
        KatAppPlugIn.prototype.getResultRow = function (table, id, columnToSearch) {
            return this.rble.getResultRow(table, id, columnToSearch);
        };
        KatAppPlugIn.prototype.getResultValue = function (table, id, column, defautlValue) {
            return this.rble.getResultValue(table, id, column, defautlValue);
        };
        KatAppPlugIn.prototype.getResultValueByColumn = function (table, keyColumn, key, column, defautlValue) {
            return this.rble.getResultValueByColumn(table, keyColumn, key, column, defautlValue);
        };
        KatAppPlugIn.prototype.setDefaultValue = function (id, value) {
            this.rble.setDefaultValue(id, value);
        };
        KatAppPlugIn.prototype.saveCalcEngine = function (location) {
            this.element.data("katapp-save-calcengine", location);
        };
        // Debug helpers
        KatAppPlugIn.prototype.refreshCalcEngine = function () {
            this.element.data("katapp-refresh-calcengine", "1");
        };
        KatAppPlugIn.prototype.traceCalcEngine = function () {
            this.element.data("katapp-trace-calcengine", "1");
        };
        KatAppPlugIn.prototype.trace = function (message, verbosity) {
            if (verbosity === void 0) { verbosity = TraceVerbosity.Normal; }
            KatApp.trace(this, message, verbosity);
        };
        return KatAppPlugIn;
    }());
    // All methods/classes before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure).  Could make another utility
    // class like I did in original service or KATApp beta, but wanted methods unreachable from javascript
    // outside my framework.  See if there is a way to pull that off and move these methods somewhere that
    // doesn't clutter up code flow here
    var UIUtilities /* implements UIUtilitiesInterface */ = /** @class */ (function () {
        function UIUtilities(application) {
            this.application = application;
        }
        UIUtilities.prototype.initializeConfirmLinks = function () {
            var that = this;
            this.application.element.on('onConfirmCancelled.RBLe', function () {
                $(".SubmitButton", that.application.element).removeClass("disabled");
                $(".ajaxloader", that.application.element).css("display", "none");
            });
            $("a[data-confirm], a[data-confirm-selector]", this.application.element)
                .not(".confirm-bound, .jquery-validate, .skip-confirm")
                .addClass("confirm-bound")
                .on("click", function () {
                var link = $(this);
                var confirm = link.data("confirm") ||
                    $(link.data("confirm-selector"), that.application.element).html() || "";
                return that.onConfirmLinkClick(link, confirm);
            });
        };
        UIUtilities.prototype.onConfirmLinkClick = function (link, confirm, confirmAction) {
            if (link.data("confirmed") == "true") {
                return true;
            }
            var that = this;
            this.createConfirmDialog(confirm, 
            // onConfirm
            function () {
                link.data("confirmed", "true");
                if (confirmAction != undefined) {
                    confirmAction();
                }
                else {
                    var submitKey = link.data("submit-key");
                    if (submitKey != undefined) {
                        $(submitKey)[0].click();
                    }
                    else {
                        link[0].click();
                    }
                }
                link.data("confirmed", "false");
            }, 
            // onCancel
            function () {
                link.data("confirmed", "false");
                that.triggerEvent("onConfirmCancelled", link);
            });
            return false;
        };
        UIUtilities.prototype.createConfirmDialog = function (confirm, onConfirm, onCancel) {
            if (confirm == "") {
                onConfirm(); // If no confirm on link (called from validation modules), just call onConfirm
                return;
            }
            if (!$('.linkConfirmModal', this.application.element).length) {
                var sCancel = "Cancel";
                var sContinue = "Continue";
                this.application.element.append('<div class="modal fade linkConfirmModal" tabindex="-1" role="dialog" data-keyboard="false" data-backdrop="static">' +
                    '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                    '<div class="modal-body"></div>' +
                    '<div class="modal-footer">' +
                    '<button class="btn btn-default cancelButton" data-dismiss="modal" aria-hidden="true">' + sCancel + '</button>' +
                    '<button type="button" class="btn btn-primary continueButton" data-dismiss="modal">' + sContinue + '</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>');
            }
            $('.linkConfirmModal .modal-body', this.application.element).html(confirm);
            $('.linkConfirmModal .continueButton', this.application.element).off("click").on("click", function () {
                onConfirm();
            });
            $('.linkConfirmModal .cancelButton', this.application.element).off("click").on("click", function () {
                if (onCancel != undefined) {
                    onCancel();
                }
            });
            $('.linkConfirmModal', this.application.element).modal({ show: true });
        };
        UIUtilities.prototype.processDropdownItems = function (dropdown, rebuild, dropdownItems) {
            var _a;
            if (dropdown.length === 0)
                return;
            var controlName = this.getInputName(dropdown);
            var selectPicker = dropdown.attr("data-kat-bootstrap-select-initialized") !== undefined
                ? dropdown
                : undefined;
            var currentValue = (_a = selectPicker === null || selectPicker === void 0 ? void 0 : selectPicker.selectpicker('val')) !== null && _a !== void 0 ? _a : dropdown.val();
            if (rebuild) {
                $("." + controlName + " option", this.application.element).remove();
                currentValue = undefined;
            }
            var that = this;
            dropdownItems.forEach(function (ls) {
                // checkbox list
                // $(".v" + controlName + "_" + ls.key, application.element).parent()
                var currentItem = $("." + controlName + " option[value='" + ls.Value + "']", that.application.element);
                // Always add so it is in order of CE even if visible is false...
                if (currentItem.length === 0) {
                    if (ls.Text == "/data-divider") {
                        currentItem = $("<option/>", {
                            "data-divider": true
                        });
                        dropdown.append(currentItem);
                    }
                    else {
                        currentItem = $("<option/>", {
                            value: ls.Value,
                            text: ls.Text
                        });
                        if ((ls.Class || "") != "") {
                            currentItem.attr("class", ls.Class || "");
                        }
                        // selectpicker specific features
                        if ((ls.Subtext || "") != "") {
                            currentItem.attr("data-subtext", ls.Subtext || "");
                        }
                        if ((ls.Html || "") != "") {
                            currentItem.attr("data-content", ls.Html || "");
                        }
                        dropdown.append(currentItem);
                    }
                }
                if (!ls.Visible) {
                    // Hide the item...
                    currentItem.hide();
                    // If selected item from dropdown was hidden, need to clear the value
                    if (currentValue === ls.Value) {
                        if (selectPicker !== undefined) {
                            selectPicker.selectpicker("val", "");
                        }
                        else {
                            dropdown.val("");
                        }
                    }
                }
                else {
                    currentItem.show();
                }
            });
            if (selectPicker !== undefined) {
                selectPicker.selectpicker('refresh');
                // Need to re-bind the event handler for some reason.  Only had to bind once in .NET, but
                // could be some side affect of .net loading list control on the server and everything is 'ready'
                // before calling original bind.
                dropdown.not(skipBindingInputSelector).off(".RBLe").on("change.RBLe", function () {
                    that.changeRBLe($(this));
                });
            }
        };
        UIUtilities.prototype.getTemplate = function (templateId, data) {
            var application = this.application;
            // Look first for template overriden directly in markup of view
            var template = $("rbl-template[tid=" + templateId + "]", application.element).first();
            // Now try to find template given precedence of views provided (last template file given highest)
            if (template.length === 0 && application.options.viewTemplates != undefined) {
                application.options.viewTemplates
                    .split(",")
                    .reverse()
                    .forEach(function (tid) {
                    if (template.length === 0) {
                        template = $("rbl-templates[rbl-t='" + tid.toLowerCase() + "'] rbl-template[tid='" + templateId + "']").first();
                    }
                });
            }
            if (template.length === 0) {
                application.trace("Invalid template id: " + templateId, TraceVerbosity.Quiet);
                return undefined;
            }
            else {
                var contentSelector = template.attr("content-selectorx");
                return {
                    Type: template.attr("type"),
                    Content: (contentSelector != undefined ? $(contentSelector, template) : template)
                        .html()
                        .format(KatApp.extend({}, data, { id: application.id }))
                        .replace(/ _id=/g, " id=") // Legacy support
                        .replace(/ id_=/g, " id=") // changed templates to have id_ so I didn't get browser warning about duplicate IDs inside *template markup*
                        .replace(/tr_/g, "tr").replace(/td_/g, "td") // tr/td were *not* contained in a table in the template, browsers would just remove them when the template was injected into application, so replace here before injecting template
                };
            }
        };
        UIUtilities.prototype.processListItems = function (container, rebuild, listItems) {
            var _a, _b, _c, _d, _e, _f, _g;
            var isBootstrap3 = $("rbl-config", this.application.element).attr("bootstrap") == "3";
            var inputName = container.data("inputname");
            var id = container.data("id");
            var horizontal = (_a = container.data("horizontal")) !== null && _a !== void 0 ? _a : false;
            var itemType = container.data("itemtype");
            var isRadio = itemType === "radio";
            if (itemType == "checkbox") {
                /*
                Find checkboxlist in ess for example rendering.
                    - Look at SetCheckboxListInputNames method as well

                Current provider code seems to assume checkbox list if has checkbox-list-horizontal class
                    - if ess version is NOT horizontal, don't think defaults would be working in here because it is
                        not flagged as a isCheckboxList?
                    - Search for isCheck, checkbox, checkbox-list to see how I'm using it
                        Make sure I can support CheckboxList items when needed
                    - Make sure templates are right

                    - Evo ess Framework

                    iCheckList, with items of

                    a:Item A
                    b:Item B
                    c:Item C

                    When you set default values, you do: iCheckList: a,c (comma delim list)

                    But when 'getting values' you make inputs named: iCheckLista, iCheckListb, iCheckListc (input for each item)

                    How hard would it be have one input (iCheckList) and the value is comma delim of vlaues selected...Harder to work with or no?

                    * Currently checkbox lists don't work in ESS (DST OOPBasic)
                    - note, all oop's are going to MBM early next year
                    - note, no one uses bootstrapcheckbox control (bsc), only manual markup
                    - bsc removes col-* attribute from container, so then 'label' is offset wrong (radio and check lists when horizontal - katapp works b/c col class is on template container element)
                        - manual works because don't have new 'bs-listcontrol' class for identification
                    - vertical manual ones do not look good because 'checkbox abc-checkbox' isn't present in markup (should be on span containing the input/label)
                    - both bsc/manual fail if vertical, it adds 'options' to the table, results has ejs-list table in it again for visiblity
                        - code doesn't know how to handle/hide items b/c it is hardcoded (RBLe) to only handle 'horizontal' ones

                */
                // throw new Error("CheckboxList is not supported yet.");
            }
            var itemsContainer = horizontal
                ? container
                : $(".items-container", container);
            var itemTypeClass = isRadio ? "radio abc-radio" : "checkbox abc-checkbox";
            if (horizontal) {
                container.parent().addClass("bs-listcontrol form-inline form-inline-vtop");
            }
            else if (itemsContainer.length === 0) {
                var itemType_1 = container.data("itemtype");
                var temlpateContent = (_c = (_b = this.getTemplate(isRadio ? "input-radiobuttonlist-vertical-container" : "input-checkboxlist-vertical-container", {})) === null || _b === void 0 ? void 0 : _b.Content) !== null && _c !== void 0 ? _c : "<table class='" + itemTypeClass + " bs-listcontrol' border='0'><tbody class='items-container'></tbody></table>";
                container.append($(temlpateContent));
                itemsContainer = $(".items-container", container);
            }
            var that = this;
            var helpIconClass = isBootstrap3 ? "glyphicon glyphicon-info-sign" : "fa fa-question-circle";
            var configureHelp = false;
            var inputTemplate = isRadio
                ? "<input id='{itemId}' type='radio' name='{id}:{inputName}' value='{value}' />"
                : "<input id_='{itemId}' type='checkbox' name='{id}:{inputName}:{value}' data-value='{value}' data-input-name='{inputName}' />";
            var verticalItemTemplate = (_e = (_d = this.getTemplate(isRadio ? "input-radiobuttonlist-vertical-item" : "input-checkboxlist-vertical-item", {})) === null || _d === void 0 ? void 0 : _d.Content) !== null && _e !== void 0 ? _e : "<tr rbl-display='{visibleSelector}'>\
                    <td>\
                        <span class='" + itemTypeClass + "'>\
                            " + inputTemplate + "\
                            <label for='{itemId}'>{text}</label>\
                            <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' data-toggle='popover' data-trigger='click' data-content-selector='#{id}_{helpSelector}' data-placement='top'><span class='{helpIconCss} help-icon'></span></a>\
                            <div rbl-value='{helpSelector}' id='{id}_{helpSelector}' style='display: none;'>{help}</div>\
                            <div rbl-value='{helpSelector}Title' id='{id}_{helpSelector}Title' style='display: none;'></div>\
                        </span>\
                    </td>\
                </tr>";
            var horizontalItemTemplate = (_g = (_f = this.getTemplate(isRadio ? "input-radiobuttonlist-horizontal-item" : "input-checkboxlist-horizontal-item", {})) === null || _f === void 0 ? void 0 : _f.Content) !== null && _g !== void 0 ? _g : "<div class='form-group " + itemTypeClass + "' rbl-display='{visibleSelector}'>\
                    " + inputTemplate + "\
                    <label for='{itemId}'>{text}</label>\
                    <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' data-toggle='popover' data-trigger='click' data-content-selector='#{id}_{helpSelector}' data-placement='top'><span class='{helpIconCss} help-icon'></span></a>\
                    <div rbl-value='{helpSelector}' id='{id}_{helpSelector}' style='display: none;'>{help}</div>\
                    <div rbl-value='{helpSelector}Title' id='{id}_{helpSelector}Title' style='display: none;'></div>\
                </div>";
            if (rebuild) {
                itemsContainer.empty();
            }
            listItems.forEach(function (li) {
                var currentItemId = id + "_" + inputName + "_" + li.Value;
                var currentVisibleSelector = "v" + inputName + "_" + li.Value;
                var currentHelpSelector = "h" + inputName + "_" + li.Value;
                var currentHelpIconSelector = currentHelpSelector + "Icon";
                var text = li.Text || "";
                var help = li.Help || "";
                var itemData = {
                    id: id,
                    inputName: inputName,
                    itemId: currentItemId,
                    visibleSelector: currentVisibleSelector,
                    helpSelector: currentHelpSelector,
                    helpIconSelector: currentHelpIconSelector,
                    helpIconCss: helpIconClass,
                    text: text,
                    value: li.Value,
                    help: help
                };
                var currentItem = $("[rbl-display='" + currentVisibleSelector + "']", itemsContainer);
                var currentInput = $("input", currentItem);
                // Always add so it is in order of CE even if visible is false...
                if (currentItem.length === 0) {
                    if (horizontal) {
                        itemsContainer.append($(horizontalItemTemplate.format(itemData)));
                    }
                    else {
                        itemsContainer.append($(verticalItemTemplate.format(itemData)));
                    }
                    currentItem = $("[rbl-display='" + currentVisibleSelector + "']", itemsContainer);
                    currentInput = $("input", currentItem);
                    currentInput.not(skipBindingInputSelector).on("change.RBLe", function () {
                        that.changeRBLe(currentInput);
                    });
                }
                if (li.Selected) {
                    currentInput.prop("checked", true);
                }
                if (!li.Visible) {
                    currentItem.hide();
                    currentInput.prop("checked", false);
                }
                else {
                    if (text != "") {
                        $("label", currentItem).html(text);
                    }
                    if (help != "") {
                        $("[rbl-value='" + currentHelpSelector + "']", currentItem).html(help);
                        $("[rbl-display='" + currentHelpIconSelector + "']", currentItem).show();
                        configureHelp = true;
                    }
                    currentItem.show();
                    if (li.Disabled) {
                        currentInput.prop("disabled", true).removeAttr("kat-disabled");
                        currentInput.prop("checked", false);
                    }
                    else {
                        currentInput.prop("disabled", false);
                    }
                }
            });
            if (configureHelp) {
                // Run one more time to catch any help items
                this.application.templateBuilder.processHelpTips();
            }
        };
        UIUtilities.prototype.getInputName = function (input) {
            // Need to support : and $.  'Legacy' is : which is default mode a convert process has for VS, but Gu says to never use that, but it caused other issues that are documented in
            // 4.1 Validators.cs file so allowing both.
            // http://bytes.com/topic/asp-net/answers/433532-control-name-change-asp-net-2-0-generated-html
            // http://weblogs.asp.net/scottgu/gotcha-don-t-use-xhtmlconformance-mode-legacy-with-asp-net-ajax
            // data-input-name - Checkbox list items, I put the 'name' into a parent span (via attribute on ListItem)
            var htmlName = input.parent().attr("data-input-name") || input.attr("name");
            if (htmlName === undefined) {
                var id_1 = input.attr("id");
                if (id_1 !== undefined) {
                    var idParts = id_1.split("_");
                    htmlName = idParts[idParts.length - 1];
                }
            }
            if (htmlName === undefined)
                return "UnknownId";
            var nameParts = htmlName.split(htmlName.indexOf("$") === -1 ? ":" : "$");
            var id = nameParts[nameParts.length - 1];
            if (id.startsWith("__")) {
                id = id.substring(2);
            }
            return id;
        };
        UIUtilities.prototype.getInputValue = function (input) {
            var value = input.val();
            if (Array.isArray(value)) {
                value = value.join("^");
            }
            var skipAssignment = false;
            if (input.attr("type") === "radio") {
                if (!input.is(':checked')) {
                    skipAssignment = true;
                }
            }
            else if (input.is(':checkbox')) {
                value = input.prop("checked") ? "1" : "0";
            }
            return (!skipAssignment ? value !== null && value !== void 0 ? value : '' : undefined);
        };
        UIUtilities.prototype.getInputs = function (customOptions) {
            // const json = { inputs: {} };
            var inputs = {};
            var that = this;
            if (customOptions.inputSelector !== undefined) {
                var validInputs = $(customOptions.inputSelector, this.application.element).not(validInputSelector);
                jQuery.each(validInputs, function () {
                    var input = $(this);
                    var value = that.getInputValue(input);
                    if (value !== undefined) {
                        var name_1 = that.getInputName(input);
                        inputs[name_1] = value;
                    }
                });
                $("[data-itemtype='checkbox']", this.application.element).each(function () {
                    var cbl = $(this);
                    var name = cbl.data("inputname");
                    var value = $("input:checked", cbl).toArray().map(function (chk) { return $(chk).data("value"); }).join(",");
                    inputs[name] = value;
                });
            }
            return inputs;
        };
        UIUtilities.prototype.getInputTables = function () {
            var that = this;
            var tables = [];
            var hasTables = false;
            jQuery.each($(".RBLe-input-table", this.application.element), function () {
                hasTables = true;
                var table = {
                    Name: $(this).data("table"),
                    Rows: []
                };
                jQuery.each($("[data-index]", this), function () {
                    var row = {
                        index: $(this).data("index")
                    };
                    jQuery.each($("[data-column]", this), function () {
                        var input = $(this);
                        var value = that.getInputValue(input);
                        if (value !== undefined) {
                            row[input.data("column")] = value;
                        }
                    });
                    table.Rows.push(row);
                });
                tables.push(table);
            });
            return hasTables ? tables : undefined;
        };
        UIUtilities.prototype.triggerEvent = function (eventName) {
            var _a;
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var application = this.application;
            var eventCancelled = false;
            try {
                application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
                var handlerResult = (_a = application.options[eventName]) === null || _a === void 0 ? void 0 : _a.apply(application.element[0], args);
                if (handlerResult != undefined && !handlerResult) {
                    eventCancelled = true;
                }
                application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            }
            catch (error) {
                application.trace("Error calling " + eventName + ": " + error, TraceVerbosity.None);
            }
            if (!eventCancelled) {
                try {
                    application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
                    var event_1 = jQuery.Event(eventName + ".RBLe");
                    application.element.trigger(event_1, args);
                    application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);
                    if (event_1.isDefaultPrevented()) {
                        eventCancelled = false;
                    }
                }
                catch (error) {
                    application.trace("Error triggering " + eventName + ": " + error, TraceVerbosity.None);
                }
            }
            return !eventCancelled;
        };
        UIUtilities.prototype.changeRBLe = function (element) {
            var wizardInputSelector = element.data("input");
            if (wizardInputSelector == undefined) {
                this.application.calculate({ manualInputs: { iInputTrigger: this.getInputName(element) } });
            }
            else {
                // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                $("." + wizardInputSelector)
                    .val(element.val())
                    .trigger("change.RBLe"); // trigger calculation
            }
        };
        UIUtilities.prototype.bindCalculationInputs = function () {
            var application = this.application;
            if (application.options.inputSelector !== undefined && application.options.calcEngine !== undefined) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                var that_2 = this;
                $(application.options.inputSelector, application.element).not(skipBindingInputSelector).each(function () {
                    $(this).on("change.RBLe", function () {
                        that_2.changeRBLe($(this));
                    });
                });
            }
        };
        UIUtilities.prototype.unbindCalculationInputs = function () {
            var element = this.application.element;
            var inputSelector = element.data("katapp-input-selector");
            if (inputSelector !== undefined) {
                $(inputSelector, element).off(".RBLe");
                element.removeData("katapp-input-selector");
            }
        };
        UIUtilities.prototype.isAspNetCheckbox = function (input) {
            // If assigning a asp.net checkbox label, need to search this way, should probably make it work for methods described
            // http://stackoverflow.com/questions/6293588/how-to-create-an-html-checkbox-with-a-clickable-label
            // This only supports asp.net checkboxes, was going to support 'regular' checkboxes input.is(':checkbox') but
            // not sure there is a standard for label, so would have to find the label appropriately but sometimes the 'input' is inside the
            // label it appears.  So would have to come up with a standard 'html checkbox' layout.
            /*
                Have seen...
                <label><input type="checkbox"> Check me out</label>

                <input id="boxid" type="checkbox"><label for="boxid"> Check me out</label>

                <label id="lboxid"><input type="checkbox" id="boxid" /><span> Check me out</span></label>
            */
            return (input.length === 1 && $("label", input).length === 1 && $("input[type=checkbox]", input).length === 1);
        };
        UIUtilities.prototype.getAspNetCheckboxLabel = function (input) {
            if (this.isAspNetCheckbox(input)) {
                // Moved the help icons inside the label so if label is ever too long and wraps, the icon stays at the end of the text.
                var label = $("label > span.checkbox-label", input);
                return label.length ? label : $("label", input);
            }
            return undefined;
        };
        UIUtilities.prototype.getAspNetCheckboxInput = function (input) {
            return this.isAspNetCheckbox(input)
                ? $("input", input)
                : undefined;
        };
        UIUtilities.prototype.getNoUiSlider = function (id, view) {
            var _a;
            var sliderJQuery = $(".slider-" + id, view);
            if (sliderJQuery.length === 1) {
                return (_a = sliderJQuery[0]) === null || _a === void 0 ? void 0 : _a.noUiSlider;
            }
            return undefined;
        };
        UIUtilities.prototype.getNoUiSliderContainer = function (id, view) {
            var sliderJQuery = $(".slider-" + id, view);
            if (sliderJQuery.length === 1) {
                return sliderJQuery;
            }
            return undefined;
        };
        UIUtilities.prototype.getJQuerySelector = function (id) {
            if (id === undefined)
                return undefined;
            //if selector contains no 'selector' characters (.#[:) , add a . in front (default is class; downside is no selecting plain element)
            if (id === id.replace(/#|:|\[|\./g, '')) {
                id = "." + id;
            }
            return id;
            /*
            const firstChar = id.substr(0, 1);
            const selector = firstChar !== "." && firstChar !== "#" ? "." + id : id;

            return selector;
            */
        };
        return UIUtilities;
    }());
    $.fn.KatApp.ui = function (application) {
        return new UIUtilities(application);
    };
    var RBLeUtilities /* implements RBLeUtilitiesInterface */ = /** @class */ (function () {
        function RBLeUtilities(application, uiUtilities) {
            this.application = application;
        }
        RBLeUtilities.prototype.setResults = function (results) {
            if (results !== undefined) {
                var propertyNames = results["@resultKeys"] = Object.keys(results).filter(function (k) { return !k.startsWith("@"); });
                // Ensure that all tables are an array
                propertyNames.forEach(function (k) {
                    var table = results[k];
                    if (!(table instanceof Array) && table != null) {
                        results[k] = [table];
                    }
                });
            }
            this.application.results = results;
            this.application.resultRowLookups = undefined;
        };
        RBLeUtilities.prototype.getData = function (currentOptions, getDataHandler) {
            var _this = this;
            if (currentOptions.getData === undefined) {
                getDataHandler("getData handler does not exist.");
                return;
            }
            currentOptions.getData(this.application, currentOptions, function (data) {
                getDataHandler(undefined, data);
            }, function (_jqXHR, textStatus) {
                _this.application.trace("getData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                getDataHandler("getData AJAX Error Status: " + textStatus);
            });
        };
        RBLeUtilities.prototype.registerData = function (currentOptions, data, registerDataHandler) {
            var _a;
            var that = this;
            var application = this.application;
            ;
            var register = (_a = currentOptions.registerData) !== null && _a !== void 0 ? _a : function (_app, _o, done, fail) {
                var _a, _b, _c, _d, _e, _f;
                var traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
                var calculationOptions = {
                    Data: data,
                    Configuration: {
                        AuthID: data.AuthID,
                        AdminAuthID: undefined,
                        Client: data.Client,
                        CalcEngine: currentOptions.calcEngine,
                        TraceEnabled: traceCalcEngine ? 1 : 0,
                        InputTab: currentOptions.inputTab,
                        ResultTabs: currentOptions.resultTabs,
                        TestCE: (_b = (_a = currentOptions.debug) === null || _a === void 0 ? void 0 : _a.useTestCalcEngine) !== null && _b !== void 0 ? _b : false,
                        CurrentPage: (_c = currentOptions.currentPage) !== null && _c !== void 0 ? _c : "Unknown",
                        RequestIP: (_d = currentOptions.requestIP) !== null && _d !== void 0 ? _d : "1.1.1.1",
                        CurrentUICulture: (_e = currentOptions.currentUICulture) !== null && _e !== void 0 ? _e : "en-US",
                        Environment: (_f = currentOptions.environment) !== null && _f !== void 0 ? _f : "PITT.PROD"
                    }
                };
                var json = {
                    Registration: KatApp.generateId(),
                    TransactionPackage: JSON.stringify(calculationOptions)
                };
                var jsonParams = {
                    url: KatApp.sessionUrl,
                    type: "POST",
                    processData: false,
                    data: JSON.stringify(json),
                    dataType: "json"
                };
                $.ajax(jsonParams)
                    .done(done)
                    .fail(fail);
            };
            var registerFailed = function (_jqXHR, textStatus) {
                application.trace("registerData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                registerDataHandler("registerData AJAX Error Status: " + textStatus);
            };
            var registerDone = function (payload) {
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception === undefined) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.registeredToken;
                    application.options.data = currentOptions.data = undefined;
                    that.application.ui.triggerEvent("onRegistration", currentOptions, application);
                    registerDataHandler();
                }
                else {
                    application.exception = payload;
                    application.trace("registerData Error Status: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    registerDataHandler("RBLe Register Data Error: " + payload.Exception.Message);
                }
            };
            register(application, currentOptions, registerDone, registerFailed);
        };
        RBLeUtilities.prototype.submitCalculation = function (currentOptions, submitCalculationHandler) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            if (currentOptions.registeredToken === undefined && currentOptions.data === undefined) {
                submitCalculationHandler("submitCalculation no registered token.");
                return;
            }
            var application = this.application;
            var saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            var traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            var refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";
            // TODO Should make a helper that gets options (for both submit and register)            
            if (currentOptions.defaultInputs !== undefined) {
                // Currently can't pass this in.  Not sure ever needed, but if so, multi page
                // KatApps (i.e. LifeInputs and Life) sometimes pass all the inputs through to 
                // a secondary load of KatApps based on proper conditions in onCalculation.  For
                // the problem I saw, it was loading secondary app when iInputTrigger was a specific
                // value.  But then it just turned into a recursive call because this input stayed
                // in the inputs and it just called a load over and over
                delete currentOptions.defaultInputs.iInputTrigger;
            }
            var inputs = application.calculationInputs = KatApp.extend(this.application.ui.getInputs(currentOptions), currentOptions.defaultInputs, currentOptions.manualInputs);
            var preCalcs = currentOptions.preCalcs;
            if (inputs.iInputTrigger !== undefined) {
                var rblOnChange = (_a = $("." + inputs.iInputTrigger).data("rbl-on-change")) !== null && _a !== void 0 ? _a : "";
                var triggerPreCalc = rblOnChange.indexOf("update-tp") > -1;
                preCalcs = triggerPreCalc ? $("." + inputs.iInputTrigger).data("rbl-update-tp-params") || preCalcs : preCalcs;
            }
            var calculationOptions = {
                Data: !((_b = currentOptions.registerDataWithService) !== null && _b !== void 0 ? _b : true) ? currentOptions.data : undefined,
                Inputs: inputs,
                InputTables: this.application.ui.getInputTables(),
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: ((_c = currentOptions.registerDataWithService) !== null && _c !== void 0 ? _c : true) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab,
                    ResultTabs: currentOptions.resultTabs,
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ((_e = (_d = currentOptions.debug) === null || _d === void 0 ? void 0 : _d.refreshCalcEngine) !== null && _e !== void 0 ? _e : false),
                    PreCalcs: preCalcs,
                    // Non-session submission
                    AuthID: (_f = currentOptions.data) === null || _f === void 0 ? void 0 : _f.AuthID,
                    AdminAuthID: undefined,
                    Client: (_g = currentOptions.data) === null || _g === void 0 ? void 0 : _g.Client,
                    TestCE: (_j = (_h = currentOptions.debug) === null || _h === void 0 ? void 0 : _h.useTestCalcEngine) !== null && _j !== void 0 ? _j : false,
                    CurrentPage: (_k = currentOptions.currentPage) !== null && _k !== void 0 ? _k : "Unknown",
                    RequestIP: "1.1.1.1",
                    CurrentUICulture: "en-US",
                    Environment: "PITT.PROD"
                }
            };
            this.application.ui.triggerEvent("onCalculationOptions", calculationOptions, this);
            var that = this;
            var submitDone = function (payload) {
                var _a;
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception === undefined) {
                    that.setResults((_a = payload.RBL) === null || _a === void 0 ? void 0 : _a.Profile.Data.TabDef);
                    submitCalculationHandler();
                }
                else {
                    application.exception = payload;
                    application.trace("RBLe Service Result Exception: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    submitCalculationHandler("RBLe Service Result Exception: " + payload.Exception.Message);
                }
            };
            var submitFailed = function (_jqXHR, textStatus) {
                application.trace("submitCalculation AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                submitCalculationHandler("submitCalculation AJAX Error Status: " + textStatus);
            };
            var submit = (_l = currentOptions.submitCalculation) !== null && _l !== void 0 ? _l : function (_app, o, done, fail) {
                $.ajax({
                    url: currentOptions.registerDataWithService ? currentOptions.sessionUrl : currentOptions.functionUrl,
                    data: JSON.stringify(o),
                    method: "POST",
                    dataType: "json",
                    headers: currentOptions.registerDataWithService
                        ? { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                        : undefined
                })
                    .done(done).fail(fail);
            };
            submit(application, calculationOptions, submitDone, submitFailed);
        };
        RBLeUtilities.prototype.getResultRow = function (table, key, columnToSearch) {
            var _a;
            var application = this.application;
            var rows = (_a = application.results) === null || _a === void 0 ? void 0 : _a[table];
            if (rows === undefined)
                return undefined;
            var rowLookups = application.resultRowLookups || (application.resultRowLookups = {});
            var lookupKey = table + (columnToSearch !== null && columnToSearch !== void 0 ? columnToSearch : "");
            var lookupColumn = columnToSearch !== null && columnToSearch !== void 0 ? columnToSearch : "@id";
            var lookupInfo = rowLookups[lookupKey];
            if (lookupInfo === undefined) {
                rowLookups[lookupKey] = lookupInfo = {
                    LastRowSearched: 0,
                    Mapping: {}
                };
            }
            var rowIndex = lookupInfo.Mapping[key];
            if (rowIndex === undefined) {
                for (var i = lookupInfo.LastRowSearched; i < rows.length; i++) {
                    var rowId = rows[i][lookupColumn];
                    lookupInfo.Mapping[rowId] = i;
                    lookupInfo.LastRowSearched++;
                    if (rowId === key) {
                        rowIndex = i;
                        break;
                    }
                }
            }
            if (rowIndex !== undefined) {
                return rows[rowIndex];
            }
            return undefined;
        };
        RBLeUtilities.prototype.getResultValue = function (table, key, column, defaultValue) {
            var _a, _b;
            return (_b = (_a = this.getResultRow(table, key)) === null || _a === void 0 ? void 0 : _a[column]) !== null && _b !== void 0 ? _b : defaultValue;
        };
        RBLeUtilities.prototype.getResultValueByColumn = function (table, keyColumn, key, column, defaultValue) {
            var _a, _b;
            return (_b = (_a = this.getResultRow(table, key, keyColumn)) === null || _a === void 0 ? void 0 : _a[column]) !== null && _b !== void 0 ? _b : defaultValue;
        };
        ;
        RBLeUtilities.prototype.getResultTable = function (tableName) {
            var _a;
            var application = this.application;
            if ((application === null || application === void 0 ? void 0 : application.results) === undefined)
                return [];
            var tableKey = tableName;
            var resultKeys = application.results["@resultKeys"];
            if (tableKey === "*") {
                var result_1 = [];
                resultKeys.forEach(function (key) {
                    var _a;
                    var table = (_a = application.results) === null || _a === void 0 ? void 0 : _a[key];
                    if (table instanceof Array) {
                        table = $.merge(result_1, table);
                    }
                });
                return result_1;
            }
            if (application.results[tableKey] === undefined) {
                // Find property name case insensitive
                resultKeys.forEach(function (key) {
                    if (key.toUpperCase() === tableName.toUpperCase()) {
                        tableKey = key;
                        return false;
                    }
                });
            }
            return (_a = application.results[tableKey]) !== null && _a !== void 0 ? _a : [];
        };
        RBLeUtilities.prototype.injectTemplate = function (target, template) {
            // rbl-template-type is to enable the creation of templates with different ids/names but still
            // fall in a category of type.  For example, you may want to make a certain style/template of
            // sliders (while still keeping main slider template usable) that is then capable of applying
            // all the KatApp programming (data-* attributes applying ranges, and configurations).
            target.removeAttr("rbl-template-type");
            if (template === undefined) {
                target.html("");
            }
            else {
                target.html(template.Content);
                if (template.Type !== undefined) {
                    target.attr("rbl-template-type", template.Type);
                }
            }
        };
        RBLeUtilities.prototype.createHtmlFromResultRow = function (resultRow, processBlank) {
            var _a, _b, _c, _d, _e, _f;
            var view = this.application.element;
            var content = (_c = (_b = (_a = resultRow.content) !== null && _a !== void 0 ? _a : resultRow.html) !== null && _b !== void 0 ? _b : resultRow.value) !== null && _c !== void 0 ? _c : "";
            var selector = (_e = (_d = this.application.ui.getJQuerySelector(resultRow.selector)) !== null && _d !== void 0 ? _d : this.application.ui.getJQuerySelector(resultRow["@id"])) !== null && _e !== void 0 ? _e : "";
            if ((processBlank || content.length > 0) && selector.length > 0) {
                var target = $(selector, view);
                if (target.length > 0) {
                    if (target.length === 1) {
                        target = (_f = this.application.ui.getAspNetCheckboxLabel(target)) !== null && _f !== void 0 ? _f : target;
                    }
                    if (content.startsWith("&")) {
                        content = content.substr(1);
                    }
                    else {
                        target.empty();
                    }
                    if (content.length > 0) {
                        if (content.startsWith("<")) {
                            var el = $(content);
                            var templateId = el.attr("rbl-tid");
                            if (templateId !== undefined) {
                                //Replace content with template processing, using data-* items in this pass
                                this.injectTemplate(el, this.application.ui.getTemplate(templateId, el.data()));
                            }
                            // Append 'templated' content to view
                            el.appendTo($(selector, view));
                        }
                        else {
                            target.append(content);
                        }
                    }
                }
            }
        };
        RBLeUtilities.prototype.getRblSelectorValue = function (tableName, selectorParts) {
            var _a, _b, _c;
            if (selectorParts.length === 1) {
                return (_a = this.getResultValue(tableName, selectorParts[0], "value")) !== null && _a !== void 0 ? _a : (this.getResultRow(tableName, selectorParts[0]) !== undefined ? "" : undefined);
            }
            else if (selectorParts.length === 3) {
                return (_b = this.getResultValue(selectorParts[0], selectorParts[1], selectorParts[2])) !== null && _b !== void 0 ? _b : (this.getResultRow(selectorParts[0], selectorParts[1]) !== undefined ? "" : undefined);
            }
            else if (selectorParts.length === 4) {
                return (_c = this.getResultValueByColumn(selectorParts[0], selectorParts[1], selectorParts[2], selectorParts[3])) !== null && _c !== void 0 ? _c : (this.getResultRow(selectorParts[0], selectorParts[2], selectorParts[1]) !== undefined ? "" : undefined);
            }
            else {
                this.application.trace("Invalid selector length for [" + selectorParts.join(".") + "].", TraceVerbosity.Quiet);
                return undefined;
            }
        };
        RBLeUtilities.prototype.processRblValues = function () {
            var that = this;
            var application = this.application;
            //[rbl-value] inserts text value of referenced tabdef result into .html()
            $("[rbl-value]", application.element).not("rbl-template [rbl-value]").each(function () {
                var _a;
                var el = $(this);
                var rblValueParts = el.attr('rbl-value').split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                var value = that.getRblSelectorValue("ejs-output", rblValueParts);
                if (value != undefined) {
                    var target = $(this);
                    if (target.length === 1) {
                        target = (_a = application.ui.getAspNetCheckboxLabel(target)) !== null && _a !== void 0 ? _a : target;
                    }
                    target.html(value);
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Detailed);
                }
            });
        };
        RBLeUtilities.prototype.processRblSources = function () {
            var that = this;
            var application = this.application;
            //[rbl-source] processing templates that use rbl results
            $("[rbl-source], [rbl-source-table]", application.element).not("rbl-template [rbl-source], rbl-template [rbl-source-table]").each(function () {
                var _a, _b, _c, _d, _e, _f;
                var el = $(this);
                // TOM - Need some flow documentation here, can't really picture entire thing in my head
                if (el.attr("rbl-configui") === undefined || ((_a = application.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                    var elementData = el.data();
                    var tid = el.attr('rbl-tid');
                    var rblSourceTableParts = (_b = el.attr('rbl-source-table')) === null || _b === void 0 ? void 0 : _b.split('.');
                    var rblSourceParts_1 = rblSourceTableParts === undefined
                        ? (_c = el.attr('rbl-source')) === null || _c === void 0 ? void 0 : _c.split('.') : rblSourceTableParts.length === 3
                        ? [(_d = that.getResultValue(rblSourceTableParts[0], rblSourceTableParts[1], rblSourceTableParts[2])) !== null && _d !== void 0 ? _d : "unknown"]
                        : [(_e = that.getResultValueByColumn(rblSourceTableParts[0], rblSourceTableParts[1], rblSourceTableParts[2], rblSourceTableParts[3])) !== null && _e !== void 0 ? _e : "unknown"];
                    // TOM (don't follow this code) - inline needed for first case?  What does it mean if rbl-tid is blank?  Need a better attribute name instead of magic 'empty' value
                    var inlineTemplate = tid === undefined ? $("[rbl-tid]", el) : undefined;
                    var templateContent_1 = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $(inlineTemplate.prop("outerHTML").format(elementData)).removeAttr("rbl-tid").prop("outerHTML")
                        : (_f = application.ui.getTemplate(tid, elementData)) === null || _f === void 0 ? void 0 : _f.Content;
                    if (templateContent_1 === undefined) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found: [" + tid + "].", TraceVerbosity.Detailed);
                    }
                    else if (rblSourceParts_1 === undefined || rblSourceParts_1.length === 0) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no rbl-source data", TraceVerbosity.Detailed);
                    }
                    else if (rblSourceParts_1.length === 1 || rblSourceParts_1.length === 3) {
                        //table in array format.  Clear element, apply template to all table rows and .append
                        var table = that.getResultTable(rblSourceParts_1[0]);
                        if (table !== undefined && table.length > 0) {
                            el.children(":not(.rbl-preserve, [rbl-tid='inline'])").remove();
                            var prepend_1 = el.attr('rbl-prepend') === "true";
                            var i_1 = 1;
                            table.forEach(function (row) {
                                if (rblSourceParts_1.length === 1 || row[rblSourceParts_1[1]] === rblSourceParts_1[2]) {
                                    var templateData = KatApp.extend({}, row, { _index0: i_1 - 1, _index1: i_1++ });
                                    if (prepend_1) {
                                        el.prepend(templateContent_1.format(templateData));
                                    }
                                    else {
                                        el.append(templateContent_1.format(templateData));
                                    }
                                }
                            });
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                        }
                    }
                    else if (rblSourceParts_1.length === 2) {
                        var row = that.getResultRow(rblSourceParts_1[0], rblSourceParts_1[1]);
                        if (row !== undefined) {
                            el.html(templateContent_1.format(row));
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                        }
                    }
                    else if (rblSourceParts_1.length === 3) {
                        var value = that.getResultValue(rblSourceParts_1[0], rblSourceParts_1[1], rblSourceParts_1[2]);
                        if (value !== undefined) {
                            el.html(templateContent_1.format({ "value": value }));
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                        }
                    }
                }
            });
        };
        RBLeUtilities.prototype.processVisibilities = function () {
            var that = this;
            var application = this.application;
            // toggle visibility
            //[rbl-display] controls display = none|block(flex?).  
            //Should this be rbl-state ? i.e. other states visibility, disabled, delete
            $("[rbl-display]", application.element).not("rbl-template [rbl-display]").each(function () {
                var _a;
                var el = $(this);
                //legacy table is ejs-visibility but might work a little differently
                var rblDisplayParts = el.attr('rbl-display').split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                //check to see if there's an "=" for a simple equality expression
                var expressionParts = rblDisplayParts[rblDisplayParts.length - 1].split('=');
                rblDisplayParts[rblDisplayParts.length - 1] = expressionParts[0];
                var visibilityValue = (_a = that.getRblSelectorValue("ejs-visibility", rblDisplayParts)) !== null && _a !== void 0 ? _a : that.getRblSelectorValue("ejs-output", rblDisplayParts); // Should remove this and only check ejs-visibility as the 'default'
                if (visibilityValue != undefined) {
                    if (expressionParts.length > 1) {
                        visibilityValue = (visibilityValue == expressionParts[1]) ? "1" : "0"; //allows table.row.value=10
                    }
                    if (visibilityValue === "0" || visibilityValue.toLowerCase() === "false" || visibilityValue === "") {
                        el.hide();
                    }
                    else {
                        el.show();
                    }
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Detailed);
                }
            });
            // Legacy, might not be needed
            var visibilityRows = this.getResultTable("ejs-visibility");
            visibilityRows.forEach(function (row) {
                var selector = application.ui.getJQuerySelector(row["@id"]);
                if (selector !== undefined) {
                    if (row.value === "1") {
                        $(selector, application.element).show();
                    }
                    else {
                        $(selector, application.element).hide();
                    }
                }
            });
        };
        RBLeUtilities.prototype.processRblDatas = function () {
            // Legacy, might not be needed
            var dataRows = this.getResultTable("ejs-rbl-data");
            var application = this.application;
            if (dataRows.length > 0) {
                var propertyNames_1 = Object.keys(dataRows[0]).filter(function (k) { return !k.startsWith("@"); });
                dataRows.forEach(function (row) {
                    var selector = application.ui.getJQuerySelector(row["@id"]);
                    if (selector !== undefined) {
                        var el_1 = $(selector, application.element);
                        propertyNames_1.forEach(function (a) {
                            var value = row[a];
                            if (value !== null && value !== void 0 ? value : "" !== "") {
                                el_1.data("rbl-" + a, value);
                            }
                            else {
                                el_1.removeData("rbl-" + a);
                            }
                        });
                    }
                });
            }
        };
        RBLeUtilities.prototype.processRBLSkips = function () {
            // Legacy, might not be needed (what class do you want me to drop in there)
            var skipRows = this.getResultTable("skip-RBLe");
            var application = this.application;
            skipRows.forEach(function (row) {
                var _a;
                var selector = application.ui.getJQuerySelector(row["key"] || row["@id"]);
                if (selector !== undefined) {
                    var el = $(selector, application.element);
                    el.addClass("skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");
                    (_a = application.ui.getNoUiSlider(selector.substring(1), application.element)) === null || _a === void 0 ? void 0 : _a.off('set.RBLe');
                }
            });
        };
        RBLeUtilities.prototype.setDefaultValue = function (id, value) {
            var selector = this.application.ui.getJQuerySelector(id);
            if (selector !== undefined) {
                value = value !== null && value !== void 0 ? value : "";
                $(selector + "DisplayOnly", this.application.element).html(value);
                var input = $(selector, this.application.element).not("div");
                var listControl = $(selector + "[data-itemtype]", this.application.element);
                var isCheckboxList = listControl.data("itemtype") == "checkbox"; // input.hasClass("checkbox-list-horizontal");
                var isRadioList = listControl.data("itemtype") == "radio"; // input.hasClass("checkbox-list-horizontal");
                var aspCheckbox = this.application.ui.getAspNetCheckboxInput(input);
                var radioButtons = isRadioList ? $("input", listControl) : $("input[type='radio']", input);
                var noUiSlider_1 = this.application.ui.getNoUiSlider(id, this.application.element);
                if (noUiSlider_1 !== undefined) {
                    var sliderContainer = this.application.ui.getNoUiSliderContainer(id, this.application.element);
                    if (sliderContainer !== undefined) {
                        sliderContainer.data("setting-default", 1); // No way to set slider without triggering calc, so setting flag
                    }
                    input.val(value);
                    noUiSlider_1.set(Number(value));
                    if (sliderContainer !== undefined) {
                        sliderContainer.removeData("setting-default");
                    }
                }
                else if (isCheckboxList) {
                    // turn all off first
                    $("input", listControl).prop("checked", false);
                    var values = value.split(",");
                    for (var k = 0; k < values.length; k++) {
                        var checkKey = values[k].trim();
                        var checkbox = $("[data-value='" + checkKey + "']", listControl); // selects span from asp.net checkbox
                        checkbox.prop("checked", true);
                    }
                }
                else if (radioButtons.length > 0) {
                    radioButtons.prop("checked", false);
                    radioButtons.filter(function (i, o) { return $(o).val() == value; }).prop("checked", true);
                    // radioButtons.find("input[value='" + value + "']").prop("checked", true);
                }
                else if (aspCheckbox !== undefined) {
                    aspCheckbox.prop("checked", value === "1");
                }
                else if (input.length > 0) {
                    input.val(input[0].hasAttribute("multiple") ? value.split("^") : value);
                    // In case it is bootstrap-select
                    var isSelectPicker = input.attr("data-kat-bootstrap-select-initialized") !== undefined;
                    if (isSelectPicker) {
                        input.selectpicker("refresh");
                    }
                }
            }
        };
        RBLeUtilities.prototype.processDefaults = function () {
            var _this = this;
            var defaultRows = this.getResultTable("ejs-defaults");
            defaultRows.forEach(function (row) {
                var id = row["@id"];
                _this.setDefaultValue(id, row.value);
            });
        };
        RBLeUtilities.prototype.processDisabled = function () {
            var _this = this;
            var disabledRows = this.getResultTable("ejs-disabled");
            var application = this.application;
            disabledRows.forEach(function (row) {
                var _a;
                var selector = _this.application.ui.getJQuerySelector(row["@id"]);
                if (selector !== undefined) {
                    // @id - regular input
                    // @id input - checkbox and list controls
                    // slider-@id - noUiSlider
                    var value = (_a = row.value) !== null && _a !== void 0 ? _a : "";
                    var input = $(selector + ", " + selector + " input", application.element);
                    var slider = _this.application.ui.getNoUiSliderContainer(row["@id"], application.element);
                    if (slider !== undefined) {
                        if (value === "1") {
                            slider.attr("disabled", "true").removeAttr("kat-disabled");
                        }
                        else {
                            slider.removeAttr("disabled");
                        }
                    }
                    else {
                        if (value === "1") {
                            input.prop("disabled", true).removeAttr("kat-disabled");
                        }
                        else {
                            input.prop("disabled", false);
                        }
                        if (input.hasClass("bootstrap-select")) {
                            input.selectpicker('refresh');
                        }
                    }
                }
            });
        };
        RBLeUtilities.prototype.createResultTableElement = function (value, elementName, cssClass) {
            return "<{name}{class}>{value}</{nameClose}>".format({
                name: elementName,
                class: (cssClass !== undefined && cssClass !== "" ? " class=\"" + cssClass + "\"" : ""),
                value: value,
                // Not sure what would be in elementName with a space in it, but just bringing over legacy code
                nameClose: elementName.split(" ")[0]
            });
        };
        RBLeUtilities.prototype.getResultTableValue = function (row, columnName) {
            var _a, _b;
            // For the first row of a table, if there was a width row in CE, then each 'column' has text and @width attribute,
            // so row[columnName] is no longer a string but a { #text: someText, @width: someWidth }.  This happens during process
            // turning the calculation into json.  http://www.newtonsoft.com/json/help/html/convertingjsonandxml.htm
            return typeof (row[columnName]) === "object"
                ? (_a = row[columnName]["#text"]) !== null && _a !== void 0 ? _a : "" : (_b = row[columnName]) !== null && _b !== void 0 ? _b : "";
        };
        RBLeUtilities.prototype.getCellMarkup = function (row, columnName, element, columnClass, colSpan) {
            var value = this.getResultTableValue(row, columnName);
            if (colSpan !== undefined) {
                element += " colspan=\"" + colSpan + "\"";
            }
            return this.createResultTableElement(value, element, columnClass);
        };
        ;
        // If only one cell with value and it is header, span entire row
        RBLeUtilities.prototype.getHeaderSpanCellName = function (row) {
            var _this = this;
            var keys = Object.keys(row);
            var values = keys
                .filter(function (k) { return k.startsWith("text") || k.startsWith("value"); })
                .map(function (k) { return ({ Name: k, Value: _this.getResultTableValue(row, k) }); })
                .filter(function (c) { return c.Value !== ""; });
            return values.length === 1 ? values[0].Name : undefined;
        };
        ;
        RBLeUtilities.prototype.processTables = function () {
            var application = this.application;
            var view = application.element;
            var that = this;
            $("[rbl-tid='result-table']", view).not("rbl-template [rbl-tid='result-table']").each(function (i, r) {
                var _a;
                var tableName = (_a = r.getAttribute("rbl-tablename")) !== null && _a !== void 0 ? _a : r.getAttribute("rbl-source");
                var templateCss = r.getAttribute("data-css");
                if (tableName !== null) {
                    var configRow = application.getResultTable("contents").filter(function (r) { return r.section === "1" && KatApp.stringCompare(r.type, "table", true) === 0 && r.item === tableName; }).shift();
                    var configCss = configRow === null || configRow === void 0 ? void 0 : configRow.class;
                    var tableCss = configCss != undefined ? "rbl " + tableName + " " + configCss :
                        templateCss != undefined ? "rbl " + tableName + " " + templateCss :
                            "table table-striped table-bordered table-condensed rbl " + tableName;
                    var tableRows = application.getResultTable(tableName);
                    if (tableRows.length === 0) {
                        return;
                    }
                    var tableConfigRow_1 = tableRows[0];
                    var includeAllColumns_1 = false; // This is a param in RBLe.js
                    var hasResponsiveTable_1 = tableCss.indexOf("table-responsive") > -1;
                    tableCss = tableCss.replace("table-responsive", "");
                    var tableColumns_1 = Object.keys(tableConfigRow_1)
                        .filter(function (k) { return k.startsWith("text") || k.startsWith("value") || (includeAllColumns_1 && k !== "@name"); })
                        .map(function (k) { return ({
                        Name: k,
                        Element: tableConfigRow_1[k],
                        Width: tableConfigRow_1[k][hasResponsiveTable_1 ? "@r-width" : "@width"]
                    }); })
                        .map(function (e) { return ({
                        name: e.Name,
                        isTextColumn: e.Name.startsWith("text"),
                        cssClass: e.Element["@class"],
                        width: e.Width !== undefined && !e.Width.endsWith("%") ? +e.Width : undefined,
                        widthPct: e.Width !== undefined && e.Width.endsWith("%") ? e.Width : undefined,
                        xsColumns: e.Element["@xs-width"] || (hasResponsiveTable_1 ? e.Element["@width"] : undefined),
                        smColumns: e.Element["@sm-width"],
                        mdColumns: e.Element["@md-width"],
                        lgColumns: e.Element["@lg-width"]
                    }); });
                    var columnConfiguration_1 = {};
                    tableColumns_1.forEach(function (c) {
                        columnConfiguration_1[c.name] = c;
                    });
                    var hasBootstrapTableWidths_1 = tableColumns_1.filter(function (c) { return c.xsColumns !== undefined || c.smColumns !== undefined || c.mdColumns !== undefined || c.lgColumns !== undefined; }).length > 0;
                    var colGroupDef_1 = undefined; // This was an optional param in RBLe
                    if (colGroupDef_1 === undefined) {
                        colGroupDef_1 = "";
                        tableColumns_1.forEach(function (c) {
                            var isFixedWidth = !hasBootstrapTableWidths_1 || hasResponsiveTable_1;
                            var width = isFixedWidth && (c.width !== undefined || c.widthPct !== undefined)
                                ? " width=\"{width}\"".format({ width: c.widthPct || (c.width + "px") })
                                : "";
                            var bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
                            bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
                            bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
                            bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";
                            colGroupDef_1 += "<col class=\"{table}-{column}{bsClass}\"{width} />".format({
                                table: tableName,
                                column: c.name,
                                bsClass: !isFixedWidth ? bsClass : "",
                                width: width
                            });
                        });
                    }
                    var colGroup = that.createResultTableElement(colGroupDef_1, "colgroup");
                    var headerHtml_1 = "";
                    var bodyHtml_1 = "";
                    var needBootstrapWidthsOnEveryRow_1 = false;
                    // const includeBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;
                    tableRows.forEach(function (row) {
                        var _a, _b, _c, _d;
                        var code = (_a = row["code"]) !== null && _a !== void 0 ? _a : "";
                        var id = (_b = row["@id"]) !== null && _b !== void 0 ? _b : "";
                        var isHeaderRow = (code === "h" || code.startsWith("header") || code.startsWith("hdr")) ||
                            (id === "h" || id.startsWith("header") || id.startsWith("hdr"));
                        var element = isHeaderRow ? "th" : "td";
                        var rowClass = (_c = row["@class"]) !== null && _c !== void 0 ? _c : row["class"];
                        var span = that.getResultTableValue(row, "span");
                        var rowHtml = "";
                        var headerSpanCellName = "";
                        if (isHeaderRow && span === "" && (headerSpanCellName = that.getHeaderSpanCellName(row)) !== undefined) {
                            // Need bootstraps on every row if already set or this is first row
                            needBootstrapWidthsOnEveryRow_1 = needBootstrapWidthsOnEveryRow_1 || i === 0;
                            var hClass = (columnConfiguration_1[headerSpanCellName].isTextColumn ? "text" : "value") + " span-" + headerSpanCellName;
                            rowHtml += that.getCellMarkup(row, headerSpanCellName, element, hClass, tableColumns_1.length);
                        }
                        else if (span !== "") {
                            // Need bootstraps on every row if already set or this is first row
                            needBootstrapWidthsOnEveryRow_1 = needBootstrapWidthsOnEveryRow_1 || i === 0;
                            var parts = span.split(":");
                            for (var p = 0; p < parts.length; p++) {
                                if (p % 2 === 0) {
                                    var colSpan = +parts[p + 1];
                                    var colSpanName = parts[p];
                                    var spanConfig = columnConfiguration_1[colSpanName];
                                    var textCol = spanConfig.isTextColumn;
                                    var sClass = (_d = spanConfig.cssClass) !== null && _d !== void 0 ? _d : "";
                                    sClass += (textCol ? " text" : " value ");
                                    rowHtml += that.getCellMarkup(row, colSpanName, element, sClass, /* includeBootstrapColumnWidths, */ colSpan);
                                }
                            }
                        }
                        else {
                            tableColumns_1.forEach(function (c) {
                                var _a;
                                var cClass = (_a = c.cssClass) !== null && _a !== void 0 ? _a : "";
                                cClass += (c.isTextColumn ? " text" : " value");
                                rowHtml += that.getCellMarkup(row, c.name, element, cClass /*, includeBootstrapColumnWidths && (needBootstrapWidthsOnEveryRow || i === 0) */);
                            });
                        }
                        if (isHeaderRow && bodyHtml_1 === "") {
                            headerHtml_1 += that.createResultTableElement(rowHtml, "tr", rowClass);
                        }
                        else {
                            bodyHtml_1 += that.createResultTableElement(rowHtml, "tr", rowClass);
                        }
                    });
                    var tableHtml = that.createResultTableElement(colGroup +
                        (headerHtml_1 !== ""
                            ? that.createResultTableElement(headerHtml_1, "thead")
                            : "") + that.createResultTableElement(bodyHtml_1, "tbody"), "table border=\"0\" cellspacing=\"0\" cellpadding=\"0\"", tableCss);
                    var html = hasResponsiveTable_1
                        ? that.createResultTableElement(tableHtml, "div", "table-responsive")
                        : tableHtml;
                    $(r).empty().append($(html));
                }
            });
        };
        RBLeUtilities.prototype.processCharts = function () {
            var view = this.application.element;
            var highchartsBuilder = $.fn.KatApp.highchartsBuilderFactory(this.application);
            if (typeof Highcharts !== "object" && $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view).length > 0) {
                this.application.trace("Highcharts javascript is not present.", TraceVerbosity.None);
                return;
            }
            $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view).each(function () {
                highchartsBuilder.buildChart($(this));
            });
        };
        RBLeUtilities.prototype.addValidationItem = function (summary, input, message) {
            var ul = $("ul", summary);
            if (ul.length === 0) {
                summary.append("<ul></ul>");
                ul = $("ul", summary);
            }
            // Backward compat to remove validation with same id as input, but have changed it to 
            // id + Error so that $(id) doesn't get confused picking the li item.
            var inputName = input !== undefined ? this.application.ui.getInputName(input) : "undefined";
            $("ul li." + inputName + ", ul li." + inputName + "Error", summary).remove();
            ul.append("<li class=\"rble " + inputName + "Error\">" + message + "</li>");
            if (input !== undefined) {
                var isWarning = summary.hasClass("ModelerWarnings");
                var validationClass = isWarning ? "warning" : "error";
                var valContainer = input.closest('.validator-container').addClass(validationClass);
                var errorSpan = valContainer.find('.error-msg')
                    .attr('data-original-title', message)
                    .empty();
                $("<label/>").css("display", "inline-block")
                    .addClass(validationClass)
                    .text(message)
                    .appendTo(errorSpan);
            }
        };
        ;
        RBLeUtilities.prototype.processValidationRows = function (summary, errors) {
            var _this = this;
            // Remove all RBLe client side created errors since they would be added back
            $("ul li.rble", summary).remove();
            if (errors.length > 0) {
                errors.forEach(function (r) {
                    var selector = _this.application.ui.getJQuerySelector(r["@id"]);
                    var input = selector !== undefined ? $(selector, _this.application.element) : undefined;
                    _this.addValidationItem(summary, input, r.text);
                });
                if ($("ul li", summary).length === 0) {
                    summary.hide();
                }
                else {
                    summary.show();
                    $("div:first", summary).show();
                }
            }
            else if ($("ul li:not(.rble)", summary).length === 0) {
                // Some server side calcs add error messages..if only errors are those from client calcs, I can remove them here
                summary.hide();
                $("div:first", summary).hide();
            }
        };
        RBLeUtilities.prototype.processValidations = function () {
            var _a;
            var view = this.application.element;
            var warnings = this.getResultTable("warnings");
            var errors = this.getResultTable("errors");
            var errorSummary = $("#" + this.application.id + "_ModelerValidationTable", view);
            var warningSummary = $("#" + this.application.id + "_ModelerWarnings", view);
            // TODO: See Bootstrap.Validation.js - need to process server side validation errors to highlight the input correctly
            if (warnings.length > 0 && warningSummary.length === 0 && errorSummary.length > 0) {
                // Warning display doesn't exist yet, so add it right before the error display...shouldn't have errors and warnings at same time currently...
                warningSummary = $("<div class=\"ModelerWarnings\"><div class=\"alert alert-warning\" role=\"alert\"><p><span class=\"glyphicon glyphicon glyphicon-warning-sign\" aria-hidden=\"true\"></span> <span class=\"sr-only\">Warnings</span> Please review the following warnings: </p></div></div>");
                $(warningSummary).insertBefore(errorSummary);
            }
            $('.validator-container.error:not(.server)', view).removeClass('error');
            $('.validator-container.warning:not(.server)', view).removeClass('warning');
            this.processValidationRows(warningSummary, warnings);
            this.processValidationRows(errorSummary, errors);
            if (((_a = this.application.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                /*
                    // Scroll target will probably need some work
                    if ($(".ModelerWarnings.alert ul li", view).length > 0 && warnings.length > 0) {
                        $('html, body').animate({
                            scrollTop: $(".ModelerWarnings.alert", view).offset().top - 30
                        }, 1000);
                    }
                    else if ($("#" + this.application.id + "_ModelerValidationTable.alert ul li", view).length > 0 && errors.length > 0) {
                        $('html, body').animate({
                            scrollTop: $("#" + this.application.id + "_ModelerValidationTable.alert", view).offset().top - 30
                        }, 1000);
                    }
                */
            }
        };
        RBLeUtilities.prototype.processSliders = function () {
            var _this = this;
            var _a;
            var sliderRows = this.getResultTable("ejs-sliders");
            var application = this.application;
            if (((_a = application.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                var configIds_1 = sliderRows.map(function (r) { return r["@id"]; });
                $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', application.element)
                    .filter(function (i, r) {
                    return configIds_1.indexOf(r.getAttribute("data-inputname")) < 0;
                })
                    .each(function (i, r) {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider configuration can be found for " + r.getAttribute("data-inputname") + ".", TraceVerbosity.Detailed);
                });
            }
            if (typeof noUiSlider !== "object" && sliderRows.length > 0) {
                application.trace("noUiSlider javascript is not present.", TraceVerbosity.None);
                return;
            }
            sliderRows.forEach(function (config) {
                var _a, _b;
                var id = config["@id"];
                var sliderJQuery = $(".slider-" + id, application.element);
                if (sliderJQuery.length !== 1) {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id + ".", TraceVerbosity.Detailed);
                }
                else {
                    var minValue = Number(config.min);
                    var maxValue = Number(config.max);
                    var input_1 = $("." + id, application.element);
                    var defaultConfigValue = _this.getResultValue("ejs-defaults", id, "value") || // what is in ejs-defaults
                        config.default || // what was in ejs-slider/default
                        input_1.val() || // what was put in the text box
                        config.min; //could/should use this
                    var stepValue = Number(config.step || "1");
                    var format_1 = config.format || "n";
                    var decimals_1 = Number(config.decimals || "0");
                    // Set hidden textbox value
                    input_1.val(defaultConfigValue);
                    var slider = sliderJQuery[0];
                    sliderJQuery.data("min", minValue);
                    sliderJQuery.data("max", maxValue);
                    // Some modelers have 'wizards' with 'same' inputs as regular modeling page.  The 'wizard sliders'
                    // actually just set the input value of the regular input and let all the other flow (main input's
                    // change event) happen as normal.
                    var targetInput_1 = sliderJQuery.data("input");
                    var defaultSliderValue = targetInput_1 != undefined
                        ? $("." + targetInput_1, application.element).val()
                        : defaultConfigValue;
                    var pipsMode = (_a = config["pips-mode"]) !== null && _a !== void 0 ? _a : "";
                    var pipValuesString = (_b = config["pips-values"]) !== null && _b !== void 0 ? _b : "";
                    var pipsLargeValues = pipValuesString !== "" ? pipValuesString.split(',').map(Number) : [0, 25, 50, 75, 100];
                    var pipsDensity = Number(config["pips-density"] || "5");
                    var pips = pipsMode !== ""
                        ? {
                            mode: pipsMode,
                            values: pipsLargeValues,
                            density: pipsDensity,
                            stepped: true
                        }
                        : undefined;
                    var sliderOptions = {
                        start: Number(defaultSliderValue),
                        step: stepValue * 1,
                        behaviour: 'tap',
                        connect: 'lower',
                        pips: pips,
                        range: {
                            min: minValue,
                            max: maxValue
                        },
                        animate: true
                    };
                    var instance = slider.noUiSlider;
                    if (instance !== undefined) {
                        // No way to update options triggering calc in old noUiSlider library, so setting flag.
                        // Latest library code (10.0+) solves problem, but leaving this code in for clients
                        // who don't get updated and published with new library.
                        $(slider).data("setting-default", 1);
                        instance.updateOptions(sliderOptions, false);
                        $(slider).removeData("setting-default");
                    }
                    else {
                        instance = noUiSlider.create(slider, sliderOptions);
                        // Hook up this event so that the label associated with the slider updates *whenever* there is a change.
                        // https://refreshless.com/nouislider/events-callbacks/
                        instance.on('update.RBLe', function () {
                            var value = Number(this.get());
                            input_1.val(value);
                            var v = format_1 == "p" ? value / 100 : value;
                            $("." + id + "Label, .sv" + id, application.element).html(String.localeFormat("{0:" + format_1 + decimals_1 + "}", v));
                        });
                        if (!input_1.is(".skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input")) {
                            if (targetInput_1 === undefined /* never trigger run from wizard sliders */) {
                                // Whenever 'regular' slider changes or is updated via set()...
                                instance.on('set.RBLe', function () {
                                    var settingDefault = $(this.target).data("setting-default") === 1;
                                    if (!settingDefault && application.options !== undefined) {
                                        application.calculate({ manualInputs: { iInputTrigger: id } });
                                    }
                                });
                            }
                            else {
                                // When wizard slider changes, set matching 'regular slider' value with same value from wizard
                                instance.on('change.RBLe', function () {
                                    var value = Number(this.get());
                                    var targetSlider = $(".slider-" + targetInput_1, application.element);
                                    var targetSliderInstance = targetSlider.length === 1 ? targetSlider[0] : undefined;
                                    if ((targetSliderInstance === null || targetSliderInstance === void 0 ? void 0 : targetSliderInstance.noUiSlider) !== undefined) {
                                        targetSliderInstance.noUiSlider.set(value); // triggers calculation
                                    }
                                });
                            }
                        }
                    }
                    if (sliderOptions.pips !== undefined) {
                        sliderJQuery.parent().addClass("has-pips");
                    }
                    else {
                        sliderJQuery.parent().removeClass("has-pips");
                    }
                }
            });
        };
        RBLeUtilities.prototype.processListControls = function () {
            var _this = this;
            var application = this.application;
            var ui = this.application.ui;
            var configRows = this.getResultTable("ejs-listcontrol");
            configRows.forEach(function (row) {
                var tableName = row.table;
                var controlName = row["@id"];
                var dropdown = $("." + controlName + ":not(div)", application.element);
                var listControl = $("div." + controlName + "[data-itemtype]", application.element);
                var listRows = _this.getResultTable(tableName);
                if (listControl.length === 1) {
                    ui.processListItems(listControl, row.rebuild == "1", listRows.map(function (r) { return ({ Value: r.key, Text: r.text, Class: r.class, Help: r.html, Selected: false, Visible: r.visible != "0", Disabled: r.disabled == "1" }); }));
                }
                else {
                    ui.processDropdownItems(dropdown, row.rebuild == "1", listRows.map(function (r) { return ({ Value: r.key, Text: r.text, Class: r.class, Subtext: r.subtext, Html: r.html, Selected: false, Visible: r.visible != "0" }); }));
                }
            });
        };
        RBLeUtilities.prototype.processResults = function () {
            var _this = this;
            var application = this.application;
            var results = application.results;
            // TOM (what does this comment mean): element content can be preserved with a class flag
            // TOM (what does this comment mean): generated content append or prepend (only applicably when preserved content)
            if (results !== undefined) {
                var calcEngineName = results["@calcEngine"];
                var version = results["@version"];
                application.trace("Processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal);
                // Need two passes to support "ejs-markup" because the markup might render something that is then
                // processed by subsequent flow controls (ouput, sources, or values)
                var markUpRows = this.getResultTable("ejs-markup");
                markUpRows.forEach(function (r) { _this.createHtmlFromResultRow(r, false); });
                var outputRows = this.getResultTable("ejs-output");
                outputRows.forEach(function (r) { _this.createHtmlFromResultRow(r, true); });
                this.processRblSources();
                this.processRblValues();
                // apply dynamic classes after all html updates (TOM: (this was your comment...) could this be done with 'non-template' build above)
                markUpRows.forEach(function (r) {
                    var _a;
                    if (r.selector !== undefined) {
                        if (r.addclass !== undefined && r.addclass.length > 0) {
                            var el = $(r.selector, application.element);
                            el.addClass(r.addclass);
                            if (r.addclass.indexOf("skipRBLe") > -1 || r.addclass.indexOf("rbl-nocalc") > -1) {
                                el.off(".RBLe");
                                $(":input", el).off(".RBLe");
                                (_a = _this.application.ui.getNoUiSlider(r.selector.substring(1), application.element)) === null || _a === void 0 ? void 0 : _a.off('set.RBLe');
                            }
                        }
                        if (r.removeclass !== undefined && r.removeclass.length > 0) {
                            $(r.selector, application.element).removeClass(r.removeclass);
                        }
                    }
                });
                // Need to re-run processUI here in case any 'templates' were injected from results and need their initial
                // data-* attributes/events processed.
                this.application.templateBuilder.processUI();
                this.processRblDatas();
                this.processVisibilities();
                this.processSliders();
                this.processRBLSkips();
                this.processListControls();
                this.processDefaults();
                this.processDisabled();
                this.processCharts();
                this.processTables();
                this.processValidations();
                application.trace("Finished processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal);
                return true;
            }
            else {
                application.trace("Results not available.", TraceVerbosity.Quiet);
                return false;
            }
        };
        return RBLeUtilities;
    }());
    $.fn.KatApp.rble = function (application, uiUtilities) {
        return new RBLeUtilities(application, uiUtilities);
    };
    var HighchartsBuilder = /** @class */ (function () {
        function HighchartsBuilder(application) {
            // Associated code with this variable might belong in template html/js, but putting here for now.
            this.firstHighcharts = true;
            this.application = application;
        }
        HighchartsBuilder.prototype.stringCompare = function (strA, strB, ignoreCase) {
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
        HighchartsBuilder.prototype.getHighchartsConfigValue = function (configurationName) {
            var _this = this;
            var _a, _b, _c, _d, _e;
            // Look in override table first, then fall back to 'regular' options table
            return (_c = (_b = (_a = this.highchartsOverrides) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_e = (_d = this.highchartsOptions) === null || _d === void 0 ? void 0 : _d.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _e === void 0 ? void 0 : _e.value;
        };
        HighchartsBuilder.prototype.ensureHighchartsCulture = function () {
            var _a;
            // Set some default highcharts culture options globally if this is the first chart I'm processing
            if (this.firstHighcharts) {
                this.firstHighcharts = false;
                var culture = (_a = this.application.getResultValue("variable", "culture", "value")) !== null && _a !== void 0 ? _a : "en-";
                if (!culture.startsWith("en-")) {
                    Highcharts.setOptions({
                        yAxis: {
                            labels: {
                                formatter: function () {
                                    return String.localeFormat("{0:c0}", this.value);
                                }
                            },
                            stackLabels: {
                                formatter: function () {
                                    return String.localeFormat("{0:c0}", this.value);
                                }
                            }
                        }
                    });
                }
            }
        };
        HighchartsBuilder.prototype.removeRBLEncoding = function (value) {
            if (value === undefined)
                return value;
            // http://stackoverflow.com/a/1144788/166231
            /*
            function escapeRegExp(string) {
                return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
            }
            */
            return value.replace(/<</g, "<")
                .replace(/&lt;&lt;/g, "<")
                .replace(/>>/g, ">")
                .replace(/&gt;&gt;/g, ">")
                .replace(/&quot;/g, "\"")
                .replace(/&amp;nbsp;/g, "&nbsp;");
        };
        HighchartsBuilder.prototype.getHighChartsOptionValue = function (value) {
            var d = Number(value);
            if (value === undefined || this.stringCompare(value, "null", true) === 0)
                return undefined;
            else if (!isNaN(d) && value !== "")
                return d;
            else if (this.stringCompare(value, "true", true) === 0)
                return true;
            else if (this.stringCompare(value, "false", true) === 0)
                return false;
            else if (value.startsWith("json:"))
                return JSON.parse(value.substring(5));
            else if (value.startsWith("var ")) {
                var v_1 = value.substring(4);
                return function () { return eval(v_1); }; // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            else if (value.startsWith("function ")) {
                var f_1 = this.removeRBLEncoding("function f() {value} f.call(this);".format({ value: value.substring(value.indexOf("{")) }));
                return function () { return eval(f_1); }; // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
            }
            else
                return this.removeRBLEncoding(value);
        };
        HighchartsBuilder.prototype.setHighChartsOption = function (optionsContainer, name, value) {
            var optionJson = optionsContainer;
            var optionNames = name.split(".");
            var optionValue = this.getHighChartsOptionValue(value);
            // Build up a json object...
            // chart.title.text, Hello = { chart: { title: { text: "Hello } } }
            // annotations[0].labels[0], { point: 'series1.69', text: 'Life Exp' } = { annotations: [ { labels: [ { point: 'series1.69', text: 'Life Exp' } ] } ] }
            for (var k = 0; k < optionNames.length; k++) {
                var optionName = optionNames[k];
                var optionIndex = -1;
                if (optionName.endsWith("]")) {
                    var nameParts = optionName.split("[");
                    optionName = nameParts[0];
                    optionIndex = parseInt(nameParts[1].substring(0, nameParts[1].length - 1));
                }
                var onPropertyValue = k === optionNames.length - 1;
                // When you are on the last name part, instead of setting it
                // to new {} object, set it appropriately to the value passed in CE
                var newValue = onPropertyValue
                    ? optionValue
                    : {};
                // If doesn't exist, set it to new object or array
                if (optionJson[optionName] === undefined) {
                    optionJson[optionName] = optionIndex > -1 ? [newValue] : newValue;
                }
                else if (onPropertyValue) {
                    if (optionIndex > -1) {
                        var propertyArray = optionJson[optionName]; // eslint-disable-line @typescript-eslint/no-explicit-any
                        // If property is an array and index isn't there yet, push a new element
                        while (propertyArray.length - 1 < optionIndex) {
                            propertyArray.push(undefined);
                        }
                        propertyArray[optionIndex] = newValue;
                    }
                    else {
                        // If on property value and exists, this is an override, so just replace the value
                        optionJson[optionName] = newValue;
                    }
                }
                else if (optionIndex > -1 && optionJson[optionName].length - 1 < optionIndex) { // eslint-disable-line @typescript-eslint/no-explicit-any
                    var propertyArray = optionJson[optionName]; // eslint-disable-line @typescript-eslint/no-explicit-any
                    // If property is an array and index isn't there yet, push a new element
                    while (propertyArray.length - 1 < optionIndex) {
                        propertyArray.push(undefined);
                    }
                    propertyArray[optionIndex] = newValue;
                }
                // Reset my local variable to the most recently added/created object
                optionJson = optionIndex > -1
                    ? optionJson[optionName][optionIndex]
                    : optionJson[optionName];
            }
        };
        HighchartsBuilder.prototype.getHighChartsXAxisOptions = function (existingOptions, chartData) {
            var _this = this;
            var _a;
            var xAxis = (_a = existingOptions) !== null && _a !== void 0 ? _a : {};
            xAxis.categories = chartData.map(function (d) { var _a; return (_a = _this.removeRBLEncoding(d.category)) !== null && _a !== void 0 ? _a : ""; });
            var plotInformation = chartData
                .map(function (d, index) { var _a, _b; return ({ Index: index, PlotLine: (_a = d.plotLine) !== null && _a !== void 0 ? _a : "", PlotBand: (_b = d.plotBand) !== null && _b !== void 0 ? _b : "" }); })
                .filter(function (r) { return r.PlotLine !== "" || r.PlotBand !== ""; });
            var plotLines = [];
            var plotBands = [];
            // Offset should be zero unless you want to adjust the line/band to draw between categories.  If you want to draw before the category, use -0.5.  If you want to draw after category, use 0.5
            // i.e. if you had a column at age 65 and wanted to plot band from there to end of chart, the band would start half way in column starting band 'between' 64 and 65 (i.e. 64.5) will make it so
            // whole bar is in span.
            plotInformation.forEach(function (row) {
                if (row.PlotLine !== "") {
                    var info = row.PlotLine.split("|");
                    var color = info[0];
                    var width = Number(info[1]);
                    var offset = info.length > 2 ? Number(info[2]) : 0;
                    var plotLine = {
                        color: color,
                        value: row.Index + offset,
                        width: width,
                        zIndex: 1
                    };
                    plotLines.push(plotLine);
                }
                if (row.PlotBand !== "") {
                    var info = row.PlotBand.split("|");
                    var color = info[0];
                    var span = info[1];
                    var offset = info.length > 2 ? Number(info[2]) : 0;
                    var from = _this.stringCompare(span, "lower", true) === 0 ? -1 : row.Index + offset;
                    var to = _this.stringCompare(span, "lower", true) === 0 ? row.Index + offset :
                        _this.stringCompare(span, "higher", true) === 0 ? chartData.length :
                            row.Index + Number(span) + offset;
                    var plotBand = {
                        color: color,
                        from: from,
                        to: to
                    };
                    plotBands.push(plotBand);
                }
            });
            if (plotLines.length > 0) {
                xAxis.plotLines = plotLines;
            }
            if (plotBands.length > 0) {
                xAxis.plotBands = plotBands;
            }
            return xAxis;
        };
        HighchartsBuilder.prototype.getHighchartsTooltipOptions = function (seriesColumns, chartConfigurationRows) {
            var tooltipFormat = this.removeRBLEncoding(this.getHighchartsConfigValue("config-tooltipFormat"));
            if (tooltipFormat === undefined) {
                return undefined;
            }
            // Get the 'format' configuration row to look for specified format, otherwise return c0 as default
            var configFormat = chartConfigurationRows.filter(function (c) { return c.category === "config-format"; }).shift();
            var seriesFormats = seriesColumns
                // Ensure the series/column is visible
                .filter(function (seriesName) { return chartConfigurationRows.filter(function (c) { return c.category === "config-visible" && c[seriesName] === "0"; }).length === 0; })
                .map(function (seriesName) { return (configFormat === null || configFormat === void 0 ? void 0 : configFormat[seriesName]) || "c0"; });
            return {
                formatter: function () {
                    var s = "";
                    var t = 0;
                    var template = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
                        ? "<br/>{name} : {value}"
                        : "<br/>{name}: {value}";
                    this.points.forEach(function (point) {
                        if (point.y > 0) {
                            s += template.format({ name: point.series.name, value: String.localeFormat("{0:" + seriesFormats[0] + "}", point.y) });
                            t += point.y;
                        }
                    });
                    return tooltipFormat
                        .replace(new RegExp("\\{x\\}", "g"), String(this.x))
                        .replace(new RegExp("\\{stackTotal\\}", "g"), String.localeFormat("{0:" + seriesFormats[0] + "}", t))
                        .replace(new RegExp("\\{seriesDetail\\}", "g"), s);
                },
                shared: true
            };
        };
        HighchartsBuilder.prototype.getHighchartsOptions = function (firstDataRow) {
            var _this = this;
            var _a;
            var chartOptions = {};
            // If chart has at least 1 data row and options/overrides arrays have been initialized
            if (this.highchartsData !== undefined && this.highchartsOptions !== undefined && this.highchartsOverrides !== undefined) {
                // First set all properties from the options/overrides rows
                var overrideProperties = this.highchartsOverrides.filter(function (r) { return !r.key.startsWith("config-"); });
                this.highchartsOptions.concat(overrideProperties).forEach(function (optionRow) {
                    _this.setHighChartsOption(chartOptions, optionRow.key, optionRow.value);
                });
                // Get series data
                var allChartColumns = firstDataRow != undefined ? Object.keys(firstDataRow) : [];
                var seriesColumns = allChartColumns.filter(function (k) { return k.startsWith("series"); });
                var chartConfigurationRows = this.highchartsData.filter(function (e) { return e.category.startsWith("config-"); });
                var chartData = this.highchartsData.filter(function (e) { return !e.category.startsWith("config-"); });
                var chartType = this.getHighchartsConfigValue("chart.type");
                var isXAxisChart = chartType !== "pie" && chartType !== "solidgauge" && chartType !== "scatter3d" && chartType !== "scatter3d";
                chartOptions.series = this.getHighChartsSeries(allChartColumns, seriesColumns, chartConfigurationRows, chartData, isXAxisChart);
                if (isXAxisChart) {
                    chartOptions.xAxis = this.getHighChartsXAxisOptions(chartOptions.xAxis, chartData);
                }
                chartOptions.tooltip = (_a = this.getHighchartsTooltipOptions(seriesColumns, chartConfigurationRows)) !== null && _a !== void 0 ? _a : chartOptions.tooltip;
            }
            return chartOptions;
        };
        HighchartsBuilder.prototype.getHighChartsSeriesDataRow = function (row, allColumnNames, seriesName, isXAxisChart) {
            // id: is for annotations so that points can reference a 'point name/id'
            // name: is for pie chart's built in highcharts label formatter and it looks for '.name' on the point
            var _this = this;
            var dataRow = { y: +row[seriesName], id: seriesName + "." + row.category };
            if (!isXAxisChart) {
                dataRow.name = row.category;
            }
            // Get all the 'data point' configuration values for the current chart data row
            // TODO: Get documentation here of some samples of when this is needed
            var pointColumnHeader = "point." + seriesName + ".";
            allColumnNames.filter(function (k) { return k.startsWith(pointColumnHeader); }).forEach(function (k) {
                dataRow[k.substring(pointColumnHeader.length)] = _this.getHighChartsOptionValue(row[k]);
            });
            return dataRow;
        };
        HighchartsBuilder.prototype.getHighChartsSeries = function (allColumns, seriesColumns, chartConfigurationRows, chartData, isXAxisChart) {
            var _this = this;
            var seriesInfo = [];
            seriesColumns.forEach(function (seriesName) {
                var _a;
                var isVisible = chartConfigurationRows.filter(function (c) { return c.category === "config-visible" && c[seriesName] === "0"; }).length === 0;
                // Don't want series on chart or legend but want it in tooltip/chart data
                var isHidden = chartConfigurationRows.filter(function (c) { return c.category === "config-hidden" && c[seriesName] === "1"; }).length > 0;
                if (isVisible) {
                    var series_1 = {};
                    var properties = chartConfigurationRows
                        .filter(function (c) { return ["config-visible", "config-hidden", "config-format"].indexOf(c.category) === -1 && c[seriesName] !== undefined; })
                        .map(function (c) { return ({ key: c.category.substring(7), value: c[seriesName] }); });
                    series_1.data = chartData.map(function (d) { return _this.getHighChartsSeriesDataRow(d, allColumns, seriesName, isXAxisChart); });
                    properties.forEach(function (c) {
                        _this.setHighChartsOption(series_1, c.key, c.value);
                    });
                    if (isHidden) {
                        series_1.visible = false;
                        series_1.showInLegend = (_a = series_1.showInLegend) !== null && _a !== void 0 ? _a : false;
                    }
                    seriesInfo.push(series_1);
                }
            });
            return seriesInfo;
        };
        HighchartsBuilder.prototype.buildChart = function (el) {
            var _this = this;
            var _a, _b;
            this.highChartsDataName = el.attr("rbl-chartdata");
            this.highChartsOptionsName = (_a = el.attr("rbl-chartoptions")) !== null && _a !== void 0 ? _a : this.highChartsDataName;
            if (this.highChartsDataName !== undefined && this.highChartsOptionsName !== undefined) {
                this.ensureHighchartsCulture();
                var application = this.application;
                this.highchartsOverrides = application.getResultTable("HighCharts-Overrides").filter(function (r) { return _this.stringCompare(r["@id"], _this.highChartsDataName, true) === 0; });
                this.highchartsOptions = application.getResultTable("HighCharts-" + this.highChartsOptionsName + "-Options");
                this.highchartsData = application.getResultTable("HighCharts-" + this.highChartsDataName + "-Data");
                var firstDataRow = this.highchartsData.filter(function (r) { return !(r.category || "").startsWith("config-"); }).shift();
                if (this.highchartsData.length > 0) {
                    var container = $(".chart", el);
                    var renderStyle = (_b = container.attr("style")) !== null && _b !== void 0 ? _b : "";
                    var configStyle = this.getHighchartsConfigValue("config-style");
                    if (configStyle !== undefined) {
                        if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                            renderStyle += ";";
                        }
                        container.attr("style", renderStyle + configStyle);
                    }
                    var highchartKey = container.attr('data-highcharts-chart');
                    var highchart = Highcharts.charts[highchartKey !== null && highchartKey !== void 0 ? highchartKey : -1];
                    if (highchart !== undefined) {
                        highchart.destroy();
                    }
                    var chartOptions = this.getHighchartsOptions(firstDataRow);
                    try {
                        container.highcharts(chartOptions);
                    }
                    catch (error) {
                        this.application.trace("Error during highchart creation.", TraceVerbosity.None);
                        throw error;
                    }
                }
            }
            return el;
        };
        return HighchartsBuilder;
    }());
    $.fn.KatApp.highchartsBuilderFactory = function (application) {
        return new HighchartsBuilder(application);
    };
    var StandardTemplateBuilder = /** @class */ (function () {
        function StandardTemplateBuilder(application) {
            this.application = application;
        }
        StandardTemplateBuilder.prototype.buildCarousel = function (el) {
            var carouselName = el.attr("rbl-name");
            if (carouselName !== undefined && !carouselName.includes("{")) {
                this.application.trace("Processing carousel: " + carouselName, TraceVerbosity.Detailed);
                $(".carousel-inner .item, .carousel-indicators li", el).removeClass("active");
                //add active class to carousel items
                $(".carousel-inner .item", el).first().addClass("active");
                //add 'target needed by indicators, referencing name of carousel
                $(".carousel-indicators li", el)
                    .attr("data-target", "#carousel-" + carouselName)
                    .first().addClass("active");
                var carousel = $('.carousel', el);
                //show initial item, start carousel:
                carousel.carousel(0);
            }
            return el;
        };
        StandardTemplateBuilder.prototype.processCarousels = function (container) {
            var that = this;
            var view = container !== null && container !== void 0 ? container : this.application.element;
            // Hook up event handlers only when *not* already initialized
            $('.carousel-control-group:not([data-katapp-initialized="true"])', view).each(function () {
                var el = $(this);
                var carousel = $('.carousel', el);
                var carouselAll = $('.carousel-all', el);
                //add buttons to show/hide
                $(".carousel-indicators .list-btn", el)
                    .click(function () {
                    carousel.hide();
                    carouselAll.show();
                });
                $(".carousel-btn", carouselAll)
                    .click(function () {
                    carouselAll.hide();
                    carousel.show();
                });
                el.attr("data-katapp-initialized", "true");
            });
            $('.carousel-control-group', view).each(function () {
                var el = $(this);
                that.buildCarousel(el);
            });
        };
        StandardTemplateBuilder.prototype.buildCheckboxes = function (view) {
            $('[rbl-tid="input-checkbox"],[rbl-template-type="katapp-checkbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var el = $(this);
                var id = el.data("inputname");
                var label = el.data("label");
                var help = el.data("help");
                var checked = el.data("checked");
                var css = el.data("css");
                var inputCss = el.data("inputcss");
                if (css !== undefined) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if (help !== undefined) {
                    $("div[rbl-value='h" + id + "']", el).html(help);
                    $("a[rbl-display='vh" + id + "']", el).show();
                }
                if (label !== undefined) {
                    var target = $("span[rbl-value='l" + id + "'] label span.checkbox-label", el);
                    if (target.length === 0) {
                        target = $("span[rbl-value='l" + id + "'] label", el);
                    }
                    target.html(label);
                }
                if (checked) {
                    $("span." + id + " input", el).prop("checked", true);
                }
                if (inputCss !== undefined) {
                    $("span." + id + " input", el).addClass(inputCss);
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.incrementProgressBars = function () {
            var progressBarValue = 0;
            var that = this;
            var progressBarInterval = setInterval(function () {
                progressBarValue += 1;
                $(".progress-bar", that.application.element)
                    .css("width", progressBarValue + "%")
                    .attr("aria-valuenow", progressBarValue);
                if (progressBarValue >= 100) {
                    clearInterval(progressBarInterval);
                }
            }, 185);
        };
        StandardTemplateBuilder.prototype.processActionLinks = function (container) {
            var view = container !== null && container !== void 0 ? container : this.application.element;
            var that = this;
            var application = this.application;
            $('[rbl-action-link]', view).not('[data-katapp-initialized="true"]').each(function () {
                $(this).on("click", function (e) {
                    var _a;
                    var actionLink = $(this);
                    e.preventDefault();
                    var katAppCommand = (_a = actionLink.attr("rbl-action-link")) !== null && _a !== void 0 ? _a : "NotSupported";
                    // Couldn't use data-confirm-selector because then two click events would have been
                    // created and not work in, need entire flow to happen here in one click...
                    var confirmSelector = actionLink.attr("rbl-action-confirm-selector");
                    var action = function () {
                        // JWT Support
                        // https://stackoverflow.com/a/49725482/166231 (comment about jwt, probably use XMLHttpRequest.setRequestHeader() in my implementation)
                        var _a;
                        // Implementation based off of these questions
                        // https://stackoverflow.com/a/44435573/166231 (Using XMLHttpRequest to download)
                        // https://stackoverflow.com/a/29039823/166231 (dynamically changing response type)
                        // Failed Attempts
                        // https://stackoverflow.com/a/11520119/166231 (dynamically append/remove a form and post that)
                        //	Page navigated when error was returned.  Didn't try target=_blank or anything because in current
                        //	ESS, not used.  The <a/> does postback and if success, response is set to 'content' and it downloads
                        //	the data and all is good.  If it fails, the entire page rerenders (since just navigating to self).
                        //	Also, I didn't even try a valid file return with this yet
                        /*
                            var inputs =
                                '<input type="hidden" name="KatAppCommand" value="DocGenDownload" />' +
                                '<input type="hidden" name="KatAppView" value="' + (application.options.view || "Unknown") + '" />' +
                                '<input type="hidden" name="KatAppInputs" />';
            
                            //send request
                            var form = $('<form action="' + url + '" method="post">' + inputs + '</form>');
                            form.appendTo('body');
            
                            $("[name='KatAppInputs']", form).val(JSON.stringify(application.getInputs()));
            
                            form.submit().remove();
                        */
                        // https://gist.github.com/domharrington/884346cc04c30eeb1237
                        //	Didn't try this one, but has some 'browser compatability' code that I might want/need
                        // https://stackoverflow.com/a/28002215/166231 (looks promising with full source)
                        //	Actually didn't attempt this one.
                        // https://storiknow.com/download-file-with-jquery-and-web-api-2-0-ihttpactionresult/ (most recent answer I could find)
                        //	This one didn't work (left a comment) because of needing to return text (error) or file (success).
                        var actionParameters = [].slice.call(actionLink.get(0).attributes).filter(function (attr) {
                            return attr && attr.name && attr.name.indexOf("data-param-") === 0;
                        }).map(function (a) { return a.name; });
                        var parametersJson = {};
                        actionParameters.forEach(function (a) {
                            var value = actionLink.attr(a);
                            if (value !== undefined) {
                                parametersJson[a.substring(11)] = value;
                            }
                        });
                        var isDownload = ((_a = actionLink.attr("rbl-action-download")) !== null && _a !== void 0 ? _a : "false") == "true";
                        application.apiAction(katAppCommand, isDownload, parametersJson);
                    };
                    // .on("click", function() { return that.onConfirmLinkClick( $(this)); })
                    if (confirmSelector != undefined) {
                        var confirm_1 = $(confirmSelector, that.application.element).html() || "";
                        return that.application.ui.onConfirmLinkClick($(this), confirm_1, action);
                    }
                    else {
                        action();
                        return true;
                    }
                }).attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildFileUploads = function (view) {
            var that = this;
            var application = this.application;
            $('[rbl-tid="input-fileupload"],[rbl-template-type="katapp-fileupload"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b;
                var el = $(this);
                var id = el.data("inputname");
                var label = el.data("label");
                var css = el.data("css");
                var formCss = el.data("formcss");
                var inputCss = el.data("inputcss");
                var labelCss = el.data("labelcss");
                var hideLabel = (_a = el.data("hidelabel")) !== null && _a !== void 0 ? _a : false;
                var katAppCommand = (_b = el.data("command")) !== null && _b !== void 0 ? _b : "UploadFile";
                if (css !== undefined) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if (formCss !== undefined) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }
                if (hideLabel) {
                    $("label", el).remove();
                }
                else {
                    if (label !== undefined) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                    if (labelCss !== undefined) {
                        $("span[rbl-value='l" + id + "']", el).addClass(labelCss);
                    }
                }
                var input = $("input", el);
                if (inputCss !== undefined) {
                    input.addClass(inputCss);
                }
                $(".btn-file-remove", el).on("click", function () {
                    var file = $(this).parents('.input-group').find(':file');
                    file.val("").trigger("change");
                });
                $(".btn-file-upload", el).on("click", function () {
                    var _a;
                    var uploadUrl = that.application.options.rbleUpdatesUrl;
                    if (uploadUrl !== undefined) {
                        $(".ajaxloader", that.application.element).show();
                        $(".file-upload .btn", el).addClass("disabled");
                        that.incrementProgressBars();
                        $(".file-upload-progress", that.application.element).show();
                        var fileUpload_1 = $(".file-data", $(this).parent());
                        var fd_1 = new FormData();
                        var files = fileUpload_1[0].files;
                        $.each(files, function (key, value) {
                            fd_1.append(key, value);
                        });
                        fd_1.append("KatAppCommand", katAppCommand);
                        fd_1.append("KatAppView", (_a = that.application.options.view) !== null && _a !== void 0 ? _a : "Unknown");
                        fd_1.append("KatAppInputs", JSON.stringify(that.application.getInputs()));
                        var errors_2 = [];
                        // Can't use 'view' in selector for validation summary b/c view could be a 'container' instead of entire view
                        // if caller only wants to initialize a newly generated container's html                        
                        var errorSummary_2 = $("#" + that.application.id + "_ModelerValidationTable", that.application.element);
                        $('.validator-container.error:not(.server)', that.application.element).removeClass('error');
                        fileUpload_1.trigger("onUploadStart", application);
                        $.ajax({
                            url: uploadUrl,
                            type: 'POST',
                            data: fd_1,
                            cache: false,
                            contentType: false,
                            processData: false
                        }).done(function ( /* payLoad */) {
                            fileUpload_1.trigger("onUploaded", application);
                        })
                            .fail(function (_jqXHR) {
                            var responseText = _jqXHR.responseText || "{}";
                            var jsonResponse = JSON.parse(responseText);
                            if (jsonResponse["Validations"] != undefined && errorSummary_2.length > 0) {
                                jsonResponse.Validations.forEach(function (v) {
                                    errors_2.push({ "@id": v["ID"], text: v["Message"] });
                                });
                                return;
                            }
                            fileUpload_1.trigger("onUploadFailed", [jsonResponse, application]);
                        })
                            .always(function () {
                            fileUpload_1.trigger("onUploadComplete", application);
                            application.rble.processValidationRows(errorSummary_2, errors_2);
                            fileUpload_1.val("").trigger("change");
                            $(".file-upload .btn", el).removeClass("disabled");
                            $(".file-upload-progress", that.application.element).hide();
                            $(".ajaxloader", that.application.element).hide();
                        });
                    }
                });
                $(".btn-file :file", el).on("change", function () {
                    var _a;
                    var fileUpload = $(this), files = fileUpload[0].files, numFiles = (_a = files === null || files === void 0 ? void 0 : files.length) !== null && _a !== void 0 ? _a : 1, label = numFiles > 1 ? numFiles + ' files selected' : fileUpload.val().replace(/\\/g, '/').replace(/.*\//, ''), // remove c:\fakepath
                    display = $(this).parents('.input-group').find(':text'), upload = $(this).parents('.input-group').find('.btn-file-upload'), remove = $(this).parents('.input-group').find('.btn-file-remove');
                    display.val(label);
                    if (numFiles > 0) {
                        upload.add(remove).removeClass("hidden d-none");
                    }
                    else {
                        upload.add(remove).addClass("hidden d-none");
                    }
                });
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildTextBoxes = function (view) {
            var isBootstrap3 = $("rbl-config", view).attr("bootstrap") == "3";
            $('[rbl-tid="input-textbox"],[rbl-template-type="katapp-textbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b, _c;
                var el = $(this);
                var id = el.data("inputname");
                var inputType = (_a = el.data("type")) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                var label = el.data("label");
                var prefix = el.data("prefix");
                var suffix = el.data("suffix");
                var placeHolder = el.data("placeholder");
                var maxlength = el.data("maxlength");
                var autoComplete = el.data("autocomplete") !== false;
                var value = el.data("value");
                var css = el.data("css");
                var formCss = el.data("formcss");
                var inputCss = el.data("inputcss");
                var labelCss = el.data("labelcss");
                var displayOnly = el.data("displayonly") === true;
                var hideLabel = (_b = el.data("hidelabel")) !== null && _b !== void 0 ? _b : false;
                if (css !== undefined) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if (formCss !== undefined) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }
                if (hideLabel) {
                    $("label", el).remove();
                }
                else {
                    if (label !== undefined) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                    if (labelCss !== undefined) {
                        $("span[rbl-value='l" + id + "']", el).addClass(labelCss);
                    }
                }
                var input = $("input", el);
                if (inputCss !== undefined) {
                    input.addClass(inputCss);
                }
                if (placeHolder !== undefined) {
                    input.attr("placeholder", placeHolder);
                }
                if (maxlength !== undefined) {
                    input.attr("maxlength", maxlength);
                }
                if (inputType === "password") {
                    input.attr("type", "password");
                }
                else if (inputType === "multiline") {
                    // Replace textbox with a textarea
                    var rows = (_c = el.data("rows")) !== null && _c !== void 0 ? _c : "4";
                    input.replaceWith($('<textarea name="' + id + '" rows="' + rows + '" id_="' + id + '" class="form-control ' + id + '"></textarea>'));
                    input = $("textarea[name='" + id + "']", el);
                }
                if (!autoComplete || inputType === "password") {
                    input.attr("autocomplete", "off");
                }
                if (value !== undefined) {
                    // Don't use 'input' variable here because some templates are 
                    // 2 column templates and I want all the styling to apply (i.e. RTX:PensionEstimate)
                    // to all inputs but default value should only apply to current value
                    $("input[name='" + id + "']", el).val(value);
                }
                var validatorContainer = $(".validator-container", el);
                if (!displayOnly) {
                    $(".form-control-display-only", el).remove();
                    var datePickerAvailable = typeof $.fn.datepicker === "function";
                    if (inputType === "date" && datePickerAvailable) {
                        validatorContainer.addClass("input-group date");
                        $(".error-msg", validatorContainer).addClass("addon-suffix"); // css aid
                        var addOnContainer = validatorContainer;
                        if (!isBootstrap3) {
                            addOnContainer = $("<div class='input-group-append'></div>");
                            addOnContainer.append($("<i class='input-group-text fa fa-calendar-day'></i>"));
                            validatorContainer.append(addOnContainer);
                        }
                        else {
                            addOnContainer.append($("<span class='input-group-addon'><i class='glyphicon glyphicon-calendar'></i></span>"));
                        }
                        $('.input-group.date', el)
                            .datepicker({
                            componentSelector: "i.fa-calendar-day, i.glyphicon-th, i.glyphicon-calendar",
                            clearBtn: true,
                            showOnFocus: false,
                            autoclose: true,
                            enableOnReadonly: false,
                            forceParse: false,
                            language: $(".bootstrapLocale").html(),
                            format: $(".bootstrapLocaleFormat").html(),
                            zIndexOffset: 2000 /* admin site sticky bar */
                        })
                            .on("show", function () {
                            // To prevent the datepicker from being 'stuck' open if they are trying
                            // to click icon *AGAIN* in an attempt to toggle/close the picker.  I
                            // first check to see if my own custom data is added and if not I inject
                            // some custom data.  If it is present (meaning it was already shown, I hide
                            // the datepicker.  Then in the hide event I always remove this custom data.
                            var dp = $(this);
                            if (dp.data("datepicker-show") != undefined) {
                                dp.datepicker('hide');
                            }
                            else {
                                dp.data("datepicker-show", true);
                                var dateInput_1 = $("input", $(this));
                                // Originally, I had an .on("clearDate", ... ) event handler that simply
                                // called dateInput.change() to trigger a calc.  But clearing input with keyboard
                                // also triggered this, so if I cleared with keyboard, it triggered change, then when
                                // I lost focus on input, it triggered 'normal' change event resulting in two calcs.
                                // So now I attach click on clear button as well and call change still
                                // so that works, but problem is that input isn't cleared before change event happens
                                // so I also clear the input myself.
                                $(".datepicker-days .clear", view).on("click", function () {
                                    dateInput_1.val("");
                                    dateInput_1.change();
                                });
                            }
                        })
                            .on("hide", function () {
                            var dp = $(this);
                            dp.removeData("datepicker-show");
                            $(".datepicker-days .clear", view).off("click");
                        })
                            .on('show.bs.modal', function (event) {
                            // https://stackoverflow.com/questions/30113228/why-does-bootstrap-datepicker-trigger-show-bs-modal-when-it-is-displayed/31199817
                            // prevent datepicker from firing bootstrap modal "show.bs.modal"
                            event.stopPropagation();
                        });
                        // Hack for https://github.com/uxsolutions/bootstrap-datepicker/issues/2402
                        // Still have an issue if they open date picker, then paste (date picker updates) then try to
                        // click a date...since the input then blurs, it fires a calc and the 'click' into the date picker (a specific day)
                        // seems to be ignored, but rare case I guess.
                        $('.input-group.date input', el)
                            .on("blur", function () {
                            var dateInput = $(this);
                            if (dateInput.data("datepicker-paste") != undefined) {
                                dateInput.trigger("change");
                            }
                            dateInput.removeData("datepicker-paste");
                        })
                            .on("paste", function () {
                            var dateInput = $(this);
                            dateInput.data("datepicker-paste", true);
                        })
                            .on("keypress change", function () {
                            // If they paste, then type keyboard before blurring, it would calc twice
                            var dateInput = $(this);
                            dateInput.removeData("datepicker-paste");
                        });
                    }
                    else if (prefix !== undefined) {
                        validatorContainer.addClass("input-group");
                        var addOnContainer = validatorContainer;
                        if (!isBootstrap3) {
                            addOnContainer = $("<div class='input-group-prepend'></div>");
                            validatorContainer.prepend(addOnContainer);
                        }
                        addOnContainer.prepend($("<span class='input-group-addon input-group-text'>" + prefix + "</span>"));
                    }
                    else if (suffix !== undefined) {
                        validatorContainer.addClass("input-group");
                        $(".error-msg", validatorContainer).addClass("addon-suffix"); // css aid
                        var addOnContainer = validatorContainer;
                        if (!isBootstrap3) {
                            addOnContainer = $("<div class='input-group-append'></div>");
                            validatorContainer.append(addOnContainer);
                        }
                        addOnContainer.append($("<span class='input-group-addon input-group-text'>" + suffix + "</span>"));
                    }
                }
                else {
                    input.css("display", "none");
                    $("div." + id + "DisplayOnly", el).html(value);
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildListControls = function (view) {
            var listControls = $('[rbl-tid="input-radiobuttonlist"],[rbl-template-type="radiobuttonlist"]', view);
            var that = this;
            listControls.not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b;
                var el = $(this);
                // Do all data-* attributes that we support
                var id = el.data("inputname");
                var label = el.data("label");
                var horizontal = (_a = el.data("horizontal")) !== null && _a !== void 0 ? _a : false;
                var hideLabel = (_b = el.data("hidelabel")) !== null && _b !== void 0 ? _b : false;
                var lookuptable = el.data("lookuptable");
                var css = el.data("css");
                var formCss = el.data("formcss");
                var container = $("." + id, el);
                // To make it easier during RBL processing to determine what to do
                container.attr("data-horizontal", horizontal);
                if (horizontal) {
                    container.addClass("form-group");
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group");
                }
                if (css !== undefined) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if (formCss !== undefined) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }
                if (hideLabel) {
                    $("label", el).remove();
                }
                else if (label !== undefined) {
                    $("span[rbl-value='l" + id + "']", el).html(label);
                }
                if (lookuptable !== undefined) {
                    // Need to fix this
                    var options = $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                        .map(function (index, ti) { return ({ Value: ti.getAttribute("key"), Text: ti.getAttribute("name"), Class: undefined, Help: undefined, Selected: index == 0, Visible: true, Disabled: false }); });
                    that.application.ui.processListItems(container, false, options.toArray());
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildDropdowns = function (view) {
            var dropdowns = $('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', view);
            var selectPickerAvailable = typeof $.fn.selectpicker === "function";
            var that = this;
            if (!selectPickerAvailable && dropdowns.length > 0) {
                this.application.trace("bootstrap-select javascript is not present.", TraceVerbosity.None);
            }
            dropdowns.not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b, _c;
                var el = $(this);
                // Do all data-* attributes that we support
                var id = el.data("inputname");
                var label = el.data("label");
                var multiSelect = (_a = el.data("multiselect")) !== null && _a !== void 0 ? _a : false;
                var liveSearch = (_b = el.data("livesearch")) !== null && _b !== void 0 ? _b : true;
                var size = (_c = el.data("size")) !== null && _c !== void 0 ? _c : "15";
                var lookuptable = el.data("lookuptable");
                var css = el.data("css");
                if (css !== undefined) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if (label !== undefined) {
                    $("span[rbl-value='l" + id + "']", el).html(label);
                }
                var input = $(".form-control", el);
                input.attr("data-size", size);
                if (multiSelect) {
                    input.addClass("select-all");
                    input.attr("multiple", "multiple");
                    input.attr("data-actions-box", "true");
                    input.attr("data-selected-text-format", "count > 2");
                }
                if (liveSearch) {
                    input.attr("data-live-search", "true");
                }
                if (lookuptable !== undefined) {
                    that.application.ui.processDropdownItems(input, false, $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                        .map(function (index, r) { return ({ Value: r.getAttribute("key"), Text: r.getAttribute("name"), Class: undefined, Subtext: undefined, Html: undefined, Selected: index === 0, Visible: true }); })
                        .toArray());
                }
                // Merge all other data-* attributes they might want to pass through
                $.each(this.attributes, function (i, attrib) {
                    var name = attrib.name;
                    if (name.startsWith("data-")) {
                        input.attr(name, attrib.value);
                    }
                });
                if (selectPickerAvailable) {
                    $(".bootstrap-select", el).selectpicker();
                    $(".bootstrap-select", el)
                        .attr("data-kat-bootstrap-select-initialized", "true")
                        .next(".error-msg")
                        .addClass("selectpicker"); /* aid in css styling */ /* TODO: Don't think this is matching and adding class */
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildSliders = function (view) {
            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var el = $(this);
                var id = el.data("inputname");
                if (el.attr("data-katapp-initialized") !== "true") {
                    // Do all data-* attributes that we support
                    var label = el.data("label");
                    var css = el.data("css");
                    if (css !== undefined) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }
                    if (label !== undefined) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                }
                // May need to build slider anyway if enough information is provided in the data-* values?
                /* Don't think I need this since I push out info from CE
                const config = this.application.getResultRow<SliderConfigurationRow>("ejs-sliders", id);
    
                if (config == undefined) return el;
    
                this.processSliderConfiguration( el, id, config );
                */
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.processUI = function (container) {
            this.processInputs(container);
            this.processCarousels(container);
            this.processHelpTips(container);
            this.processActionLinks(container);
        };
        StandardTemplateBuilder.prototype.processHelpTips = function (container) {
            // Couldn't include the Bootstrap.Tooltips.js file b/c it's selector hits entire page, and we want to be localized to our view.
            var selector = "[data-toggle='tooltip'], [data-toggle='popover'], .tooltip-trigger, .tooltip-text-trigger, .error-trigger";
            var application = this.application;
            var isBootstrap3 = $("rbl-config", this.application.element).attr("bootstrap") == "3";
            var view = container !== null && container !== void 0 ? container : application.element;
            if (typeof $.fn.popover !== "function" && $(selector, view).length > 0) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present.", TraceVerbosity.None);
                return;
            }
            $(selector, view)
                .not(".rbl-help, [data-katapp-initialized='true']")
                .each(function () {
                var isErrorValidator = $(this).hasClass('error-msg');
                var placement = $(this).data('placement') || "top";
                var trigger = $(this).data('trigger') || "hover";
                var container = $(this).data('container') || "body";
                var options = {
                    html: true,
                    sanitize: false,
                    trigger: trigger,
                    container: container,
                    template: isErrorValidator && isBootstrap3
                        ? '<div class="tooltip error katapp-css" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>' :
                        isBootstrap3
                            ? '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>' :
                            isErrorValidator
                                ? '<div class="tooltip error katapp-css" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
                                : '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
                    placement: function (tooltip, trigger) {
                        // Add a class to the .popover element
                        // http://stackoverflow.com/a/19875813/166231
                        var dataClass = $(trigger).data('class');
                        if (dataClass != undefined) {
                            $(tooltip).addClass(dataClass);
                        }
                        // Did they specify a data-width?
                        dataClass = $(trigger).data('width');
                        if (dataClass != undefined) {
                            // context is for popups, tooltip-inner is for tooltips (bootstrap css has max-width in css)
                            $(tooltip).add($(".tooltip-inner", tooltip))
                                .css("width", dataClass)
                                .css("max-width", dataClass);
                        }
                        if (!isBootstrap3) {
                            // Bootstrap 4 no longer supports 'left auto' (two placements) so just in case any markup has that still
                            // remove it (unless it is only thing specified - which 'popper' supports.)
                            var autoToken = /\s?auto?\s?/i;
                            var autoPlace = autoToken.test(placement);
                            if (autoPlace)
                                placement = placement.replace(autoToken, '') || 'auto';
                        }
                        return placement;
                    },
                    title: function () {
                        var titleSelector = $(this).data('content-selector');
                        if (titleSelector != undefined) {
                            var title = $(titleSelector + "Title").text();
                            if (title != undefined) {
                                return title;
                            }
                        }
                        return "";
                    },
                    content: function () {
                        // See if they specified data-content directly on trigger element.
                        var dataContent = $(this).data('content');
                        var dataContentSelector = $(this).data('content-selector');
                        var content = dataContent == undefined
                            ? dataContentSelector == undefined ? $(this).next().html() : $(dataContentSelector).html()
                            : dataContent;
                        // Replace {Label} in content with the trigger provided...used in Error Messages
                        var labelFix = $(this).data("label-fix");
                        if (labelFix != undefined) {
                            content = content.replace(/\{Label}/g, $("." + labelFix).html());
                        }
                        return content;
                    }
                };
                if (isErrorValidator) {
                    // Hover for this one...
                    $(this).tooltip(options)
                        .on('inserted.bs.tooltip', function (e) {
                        var isWarning = $("label.warning", $(e.target)).length == 1;
                        if (isWarning) {
                            var templateId = "#" + $(e.target).attr("aria-describedby");
                            $(templateId, view).removeClass("error").addClass("warning");
                        }
                    });
                }
                else {
                    $(this).popover(options);
                }
            })
                .attr("data-katapp-initialized", "true");
            // Code to hide tooltips if you click anywhere outside the tooltip
            if (application.element.attr("data-katapp-initialized-tooltip") != "true") {
                // Combo of http://stackoverflow.com/a/17375353/166231 and https://stackoverflow.com/a/21007629/166231 (and 3rd comment)
                // This one looked interesting too: https://stackoverflow.com/a/24289767/166231 but I didn't test this one yet
                var visiblePopover_1 = undefined;
                var hideVisiblePopover_1 = function () {
                    // Just in case the tooltip hasn't been configured
                    if (visiblePopover_1 === undefined || $(visiblePopover_1).data("bs.popover") === undefined)
                        return;
                    // Call this first b/c popover 'hide' event sets visiblePopover = undefined
                    if (isBootstrap3) {
                        $(visiblePopover_1).data("bs.popover").inState.click = false;
                    }
                    $(visiblePopover_1).popover("hide");
                };
                var app_1 = application;
                application.element
                    .on("show.bs.popover.RBLe", function () { hideVisiblePopover_1(); })
                    .on("shown.bs.popover.RBLe", function (e) {
                    visiblePopover_1 = e.target;
                    $("div.katapp-css[role='tooltip'] [rbl-action-link]").attr("data-katapp-initialized", "false");
                    app_1.templateBuilder.processActionLinks($("div.katapp-css[role='tooltip']"));
                })
                    .on("hide.bs.popover.RBLe", function () { visiblePopover_1 = undefined; })
                    .on("keyup.RBLe", function (e) {
                    if (e.keyCode != 27) // esc
                        return;
                    hideVisiblePopover_1();
                    e.preventDefault();
                })
                    .on("click.RBLe", function (e) {
                    if ($(e.target).is(".popover-title, .popover-content"))
                        return; // BS3
                    if ($(e.target).is(".popover-header, .popover-body"))
                        return; // BS4                        
                    hideVisiblePopover_1();
                })
                    .attr("data-katapp-initialized-tooltip", "true");
            }
            // When helptip <a/> for checkboxes were  moved inside <label/>, attempting to click the help icon simply toggled
            // the radio/check.  This stops that toggle and lets the help icon simply trigger it's own click to show or hide the help.
            $('.checkbox label a[data-toggle], .abc-checkbox label a[data-toggle]', view)
                .not("[data-katapp-checkbox-tips-initialized='true']")
                .on('click', function (e) {
                e.stopPropagation();
                return false;
            })
                .attr("data-katapp-checkbox-tips-initialized", "true");
        };
        StandardTemplateBuilder.prototype.processInputs = function (container) {
            var view = container !== null && container !== void 0 ? container : this.application.element;
            this.buildDropdowns(view);
            this.buildTextBoxes(view);
            this.buildFileUploads(view);
            this.buildListControls(view);
            this.buildCheckboxes(view);
            this.buildSliders(view);
        };
        return StandardTemplateBuilder;
    }());
    $.fn.KatApp.standardTemplateBuilderFactory = function (application) {
        return new StandardTemplateBuilder(application);
    };
    // Replace the applicationFactory to create real KatAppPlugIn implementations
    $.fn.KatApp.applicationFactory = function (id, element, options) {
        // Timing concerns at all?
        //      $("selector").KatApp() - two returned
        //          first one starts to load, triggering a get script (that takes a while)
        //          second one is waiting to init (get put into shim memory list)
        //          script loads
        //              - grabs all from shim memory list (only first one)
        //              - script, replaces factory and destroys memory list
        //          second one processes - still in original shim code, adds to memory list and errors or is never processed by real impl code
        //      Can this happen?
        //
        //      Not sure if this could happen or not, but could maybe make new factory always check cache and process any that
        //      might have been added after initial processing (do to thread races) ... of course can't destroy the cache at bottom
        //      of this file if I am going to do that.
        return new KatAppPlugIn(id, element, options);
    };
    // Get Global: put as prefix if missing
    // Prototypes / polyfills
    String.prototype.ensureGlobalPrefix = function () {
        var id = this.toString();
        var idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    };
    String.prototype.format = function (json) {
        //"{greeting} {who}!".format({greeting: "Hello", who: "world"})
        var that = this;
        if (Object.keys(json).length > 0) {
            for (var propertyName in json) {
                var re = new RegExp('{' + propertyName + '}', 'gm');
                that = that.replace(re, json[propertyName]);
            }
        }
        return that.replace("_", "_");
    };
    if (typeof String.prototype.startsWith !== 'function') {
        String.prototype.startsWith = function (str) {
            return this.slice(0, str.length) === str;
        };
    }
    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function (searchString, position) {
            var subjectString = this.toString();
            if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        };
    }
    // If this is undefined, it is the first time through, so set up templates container and shared template state
    // NOTE: This script could be dynamically reloaded (via debugger KatApp) and this variable remains intact so that
    // it doesn't blow away existing shared data, so leave the if statement even though it seems like it shouldn't be
    // needed since when script is ran for 'first time' (which could be the 'only' time) obviously tempaltesUsedByAllApps
    // is undefined.
    if ($.fn.KatApp.templatesUsedByAllApps == undefined) {
        $('<rbl-katapps>\
            <style>\
                rbl-katapps, rbl-templates, rbl-template, [rbl-tid="inline"] { display: none; }\
            </style>\
        </rbl-katapps>').appendTo("body");
        $.fn.KatApp.templatesUsedByAllApps = {};
        $.fn.KatApp.templateDelegates = [];
        $.fn.KatApp.templateOn = function (templateName, events, fn) {
            $.fn.KatApp.templateDelegates.push({ Template: templateName.ensureGlobalPrefix(), Delegate: fn, Events: events });
            KatApp.trace(undefined, "Template event(s) [" + events + "] registered for [" + templateName + "].", TraceVerbosity.Normal);
        };
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
    }
    $.fn.KatApp.plugInShims.forEach(function (a) {
        $.fn.KatApp.applicationFactory(a.id, a.element, a.options);
    });
    // Destroy plugInShims
    delete $.fn.KatApp.plugInShims;
})(jQuery, window, document);
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded 
// with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=DataLocker\Global\KatAppProvider.js
//# sourceMappingURL=KatAppProvider.js.map