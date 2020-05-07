"use strict";
// TODO
// - Need to remove slider events (https://refreshless.com/nouislider/events-callbacks/) before destroying and carousel (standard)
// - How do I check/handle for errors when I try to load view
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?
// Discussions with Tom
// - Templates run every calc?  Will that goof up slider config?  Need to read code closer
//      - For example, arne't you hooking up events every time to carousel?  Since you aren't removing events?  WHere you said there were events hanging around?
//      - Seems like you need a way to only update the 'markup' of carousel vs rebuilding entire thing?  Otherwise, probably need/should hookup a 'calcstart event' in templates to remove event handlers
// - Show how bunch of errors are happening in boscomb (missing source elements)
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calcengine, -inputname, etc.
// - Downfall to our paradigm of CMS managing KatAppProvider code is never caches script and loads it each time?
// - Talk to tom about how to check for events
//      - Wondering if events on charts are still there or if calling destroy on chart removes
//      - Wondering if we are making multiple events on the carousel events and slider events
// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
// 6. <div rbl-tid="chart-highcharts" data-name="BalanceChart" rbl-data="BalanceChart" rbl-options="BalanceChart"></div>
// Prototypes / polyfills
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
$(function () {
    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend({
        traceVerbosity: TraceVerbosity.None,
        registerDataWithService: false,
        shareDataWithOtherApplications: true,
        functionUrl: KatApp.functionUrl,
        corsUrl: KatApp.corsUrl,
        currentPage: "Unknown",
        inputSelector: "input",
        inputTab: "RBLInput",
        resultTabs: ["RBLResult"],
        runConfigureUICalculation: true,
        ajaxLoaderSelector: ".ajaxloader",
        useTestCalcEngine: KatApp.pageParameters["test"] === "1",
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
    }, KatApp.defaultOptions);
    var tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    var validInputSelector = ":not(.notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons + ")";
    var skipBindingInputSelector = ":not(.notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input" + tableInputsAndBootstrapButtons + ")";
    var _templatesUsedByAllApps = {};
    var _templateDelegates = [];
    // Get Global: put as prefix if missing
    function ensureGlobalPrefix(id) {
        if (id === undefined)
            return undefined;
        var idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    }
    ;
    $.fn.KatApp.templateOn = function (templateName, events, fn) {
        _templateDelegates.push({ Template: ensureGlobalPrefix(templateName), Delegate: fn, Events: events }); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        KatApp.trace(undefined, "Template event(s) [" + events + "] registered for [" + templateName + "].", TraceVerbosity.Normal);
    };
    var _sharedData = { requesting: false, callbacks: [] };
    var KatAppPlugIn /* implements KatAppPlugInInterface */ = /** @class */ (function () {
        function KatAppPlugIn(id, element, options) {
            // Helper classes, see comment in interfaces class
            this.rble = $.fn.KatApp.rble;
            this.ui = $.fn.KatApp.ui;
            this.options = {};
            this.id = id;
            this.element = element;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[0].KatApp = this;
            this.init(options);
        }
        KatAppPlugIn.prototype.init = function (options) {
            var _a, _b;
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
            // delegate assigned, then change the default value of this property
            { registerDataWithService: KatApp.defaultOptions.registerData !== undefined || (options === null || options === void 0 ? void 0 : options.registerData) !== undefined }, options // finally js options override all
            );
            this.element.attr("rbl-application-id", this.id);
            // Not sure I need this closure, but put it in anyway
            (function (that) {
                var _a, _b;
                that.trace("Started init", TraceVerbosity.Detailed);
                var pipeline = [];
                var pipelineIndex = 0;
                var next = function (offest) {
                    switch (pipelineIndex) {
                        case 1:
                            that.trace("init.pipeline.getView.finish", TraceVerbosity.Detailed);
                            break;
                        case 2:
                            that.trace("init.pipeline.downloadTemplates.finish", TraceVerbosity.Detailed);
                            break;
                        case 3:
                            that.trace("init.pipeline.injectTemplates.finish", TraceVerbosity.Detailed);
                            break;
                    }
                    pipelineIndex += offest;
                    if (pipelineIndex < pipeline.length) {
                        switch (pipelineIndex) {
                            case 0:
                                that.trace("init.pipeline.getView.start", TraceVerbosity.Detailed);
                                break;
                            case 1:
                                that.trace("init.pipeline.downloadTemplates.start", TraceVerbosity.Detailed);
                                break;
                            case 2:
                                that.trace("init.pipeline.injectTemplates.start", TraceVerbosity.Detailed);
                                break;
                            case 3:
                                that.trace("init.pipeline.processTemplates.start", TraceVerbosity.Detailed);
                                break;
                        }
                        pipeline[pipelineIndex++]();
                    }
                };
                var pipelineError = undefined;
                var useTestView = (_b = (_a = that.options.useTestView) !== null && _a !== void 0 ? _a : KatApp.pageParameters["testview"] === "1") !== null && _b !== void 0 ? _b : false;
                var functionUrl = that.options.functionUrl;
                var viewId = ensureGlobalPrefix(that.options.view);
                // Gather up all requested templates requested for the current application so I can bind up any
                // onTemplate() delegates.
                var requiredTemplates = that.options.viewTemplates != undefined
                    ? that.options.viewTemplates.split(",").map(function (r) { return ensureGlobalPrefix(r); }) // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
                pipeline.push(
                // First get the view *only*
                function () {
                    if (viewId !== undefined) {
                        that.trace(viewId + " requested from CMS.", TraceVerbosity.Detailed);
                        that.trace("CMS url is: " + functionUrl + ".", TraceVerbosity.Diagnostic);
                        KatApp.getResources(functionUrl, viewId, useTestView, false, function (errorMessage, results) {
                            var _a, _b, _c;
                            pipelineError = errorMessage;
                            if (pipelineError === undefined) {
                                that.trace(viewId + " returned from CMS.", TraceVerbosity.Normal);
                                var data = results[viewId]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                // Process as view - get info from rbl-config and inject markup
                                var view = $("<div>" + data.replace(/{thisView}/g, "[rbl-application-id='" + that.id + "']") + "</div>");
                                var rblConfig = $("rbl-config", view).first();
                                if (rblConfig.length !== 1) {
                                    that.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                                }
                                else {
                                    that.options.calcEngine = (_a = that.options.calcEngine) !== null && _a !== void 0 ? _a : rblConfig.attr("calcengine");
                                    var toFetch = rblConfig.attr("templates");
                                    if (toFetch !== undefined) {
                                        requiredTemplates =
                                            requiredTemplates
                                                .concat(toFetch.split(",").map(function (r) { return ensureGlobalPrefix(r); })) // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                                // unique templates only
                                                .filter(function (v, i, a) { return v !== undefined && v.length != 0 && a.indexOf(v) === i; });
                                    }
                                    that.options.inputTab = (_b = that.options.inputTab) !== null && _b !== void 0 ? _b : rblConfig.attr("input-tab");
                                    var attrResultTabs_1 = rblConfig.attr("result-tabs");
                                    that.options.resultTabs = (_c = that.options.resultTabs) !== null && _c !== void 0 ? _c : (attrResultTabs_1 != undefined ? attrResultTabs_1.split(",") : undefined);
                                    that.element.html(view.html());
                                }
                                next(0);
                            }
                            else {
                                pipelineError = errorMessage;
                                next(2); // jump to finish
                            }
                        });
                    }
                    else {
                        next(0);
                    }
                }, 
                // Get all templates needed for this view
                function () {
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
                                        next(0); // move to next step if not waiting for anything else
                                    }
                                    else {
                                        that.trace("Waiting for " + otherResourcesNeeded + " more templates.", TraceVerbosity.Diagnostic);
                                    }
                                }
                                else {
                                    that.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet);
                                    pipelineError = errorMessage;
                                    next(1); // jump to finish
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
                        that.trace("CMS url is: " + functionUrl + ".", TraceVerbosity.Diagnostic);
                        KatApp.getResources(functionUrl, toFetchList_1, useTestView, false, function (errorMessage, data) {
                            if (errorMessage === undefined) {
                                resourceResults = data;
                                that.trace(toFetchList_1 + " returned from CMS.", TraceVerbosity.Normal);
                                // Only move on if not waiting on any more resources from other apps
                                if (otherResourcesNeeded === 0) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                    next(0);
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
                                next(1); // jump to finish
                            }
                        });
                    }
                    else if (otherResourcesNeeded === 0) {
                        next(1); // jump to finish
                    }
                }, 
                // Inject templates returned from CMS
                function () {
                    if (resourceResults != null) {
                        // For the templates *this app* downloaded, inject them into markup                        
                        Object.keys(resourceResults).forEach(function (r) {
                            var data = resourceResults[r]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                            // TOM: create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                            // and this attribute used for checking(?)
                            // Remove extension if there is one, could be a problem if you do Standard.Templates, trying to get Standard.Templates.html.
                            var resourceParts = r.split(":");
                            var tId = (resourceParts.length > 1 ? resourceParts[1] : resourceParts[0]).replace(/\.[^/.]+$/, "");
                            var t = $("<rbl-templates style='display:none;' rbl-t='" + tId + "'>" + data.replace(/{thisTemplate}/g, r) + "</rbl-templates>");
                            t.appendTo("body");
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
                    next(0);
                }, 
                // Final processing (hook up template events and process templates that don't need RBL)
                function () {
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
                                that.trace("[" + d.Events + "] events registered for template [" + d.Template + "].", TraceVerbosity.Normal);
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
                        // uses data-* to create a dataobject generally used to create controls like sliders.                    
                        $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                            var templateId = $(this).attr('rbl-tid');
                            if (templateId !== undefined && templateId !== "inline") {
                                //Replace content with template processing, using data-* items in this pass
                                $(this).html(that.rble.processTemplate(that, templateId, $(this).data()));
                            }
                        });
                        that.ui.bindEvents(that);
                        that.ui.triggerEvent(that, "onInitialized", that);
                        if (that.options.runConfigureUICalculation) {
                            var customOptions = {
                                manualInputs: { iConfigureUI: 1 }
                            };
                            that.calculate(customOptions);
                        }
                    }
                    else {
                        that.trace("Error during Provider.init: " + pipelineError, TraceVerbosity.Quiet);
                    }
                    that.trace("Finished init", TraceVerbosity.Detailed);
                    next(0); // just to get the trace statement, can remove after all tested
                });
                // Start the pipeline
                next(0);
            })(this);
        };
        KatAppPlugIn.prototype.rebuild = function (options) {
            this.ui.unbindEvents(this);
            this.ui.triggerEvent(this, "onDestroyed", this);
            this.init(options);
        };
        KatAppPlugIn.prototype.calculate = function (customOptions) {
            var _a;
            // Shouldn't change 'share' option with a customOptions object
            var shareDataWithOtherApplications = (_a = this.options.shareDataWithOtherApplications) !== null && _a !== void 0 ? _a : false;
            if (shareDataWithOtherApplications) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options.sharedDataLastRequested = _sharedData.lastRequested;
            }
            this.exception = undefined; // Should I set results to undefined too?
            this.ui.triggerEvent(this, "onCalculateStart", this);
            (function (that) {
                // Build up complete set of options to use for this calculation call
                var currentOptions = KatApp.extend({}, // make a clone of the options
                that.options, // original options
                customOptions);
                var pipeline = [];
                var pipelineIndex = 0;
                var next = function (offset) {
                    pipelineIndex += offset;
                    if (pipelineIndex < pipeline.length) {
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
                pipeline.push(function () {
                    try {
                        that.rble.submitCalculation(that, currentOptions, 
                        // If failed, let it do next job (getData, register, resubmit), otherwise, jump to finish
                        function (errorMessage) {
                            pipelineError = errorMessage;
                            next(errorMessage !== undefined ? 0 : 3);
                        });
                    }
                    catch (error) {
                        pipelineError = "Submit.Pipeline exception: " + error;
                        next(3);
                    }
                }, 
                // Get Registration Data
                function () {
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
                                    next(1);
                                }
                                else {
                                    that.trace("Data retrieval failed in other application.", TraceVerbosity.Detailed);
                                    pipelineError = errorMessage;
                                    next(2); // If error, jump to finish
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
                            that.options.data = currentOptions.data = _sharedData.data;
                            that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                            that.options.sharedDataLastRequested = _sharedData.lastRequested;
                            next(1);
                        }
                        else {
                            try {
                                if (shareDataWithOtherApplications) {
                                    _sharedData.requesting = true;
                                    _sharedData.registeredToken = undefined;
                                    _sharedData.data = undefined;
                                }
                                that.options.data = currentOptions.data = undefined;
                                that.options.registeredToken = currentOptions.registeredToken = undefined;
                                that.rble.getData(that, currentOptions, 
                                // If failed, then I am unable to register data, so just jump to finish, 
                                // otherwise continue to registerData or submit
                                function (errorMessage, data) {
                                    if (errorMessage !== undefined) {
                                        pipelineError = errorMessage;
                                        if (shareDataWithOtherApplications) {
                                            callSharedCallbacks(errorMessage);
                                        }
                                        next(2); // If error, jump to finish
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
                                            next(1); // If not registering data, jump to submit
                                        }
                                        else {
                                            next(0); // Continue to register data
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
                        next(2); // If error, jump to finish
                    }
                }, 
                // Register Data
                function () {
                    try {
                        that.rble.registerData(that, currentOptions, that.options.data, 
                        // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                        function (errorMessage) {
                            if (errorMessage === undefined) {
                                if (shareDataWithOtherApplications) {
                                    _sharedData.registeredToken = that.options.registeredToken;
                                    callSharedCallbacks(undefined);
                                }
                                next(0);
                            }
                            else {
                                pipelineError = errorMessage;
                                if (shareDataWithOtherApplications) {
                                    callSharedCallbacks(errorMessage);
                                }
                                // If error, jump to finish
                                next(1);
                            }
                        });
                    }
                    catch (error) {
                        pipelineError = "Register.Pipeline exception: " + error;
                        if (shareDataWithOtherApplications) {
                            callSharedCallbacks(pipelineError);
                        }
                        next(1);
                    }
                }, 
                // Submit Again (if needed)
                function () {
                    try {
                        that.rble.submitCalculation(that, currentOptions, 
                        // If failed, let it do next job (getData), otherwise, jump to finish
                        function (errorMessage) {
                            pipelineError = errorMessage;
                            next(0);
                        });
                    }
                    catch (error) {
                        pipelineError = "ReSubmit.Pipeline exception: " + error;
                        next(0);
                    }
                }, 
                // Finish
                function () {
                    var _a;
                    try {
                        if (pipelineError === undefined) {
                            that.element.removeData("katapp-save-calcengine");
                            that.element.removeData("katapp-trace-calcengine");
                            that.element.removeData("katapp-refresh-calcengine");
                            that.rble.processResults(that);
                            if (((_a = that.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                                that.ui.triggerEvent(that, "onConfigureUICalculation", that.results, currentOptions, that);
                            }
                            that.ui.triggerEvent(that, "onCalculation", that.results, currentOptions, that);
                        }
                        else {
                            that.rble.setResults(that, undefined);
                            // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                            that.ui.triggerEvent(that, "onCalculationErrors", "RunCalculation", pipelineError, that.exception, currentOptions, that);
                        }
                    }
                    catch (error) {
                        that.trace("Error duing result processing: " + error, TraceVerbosity.Quiet);
                        that.ui.triggerEvent(that, "onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that);
                    }
                    finally {
                        that.ui.triggerEvent(that, "onCalculateEnd", that);
                    }
                });
                // Start the pipeline
                next(0);
            })(this);
        };
        KatAppPlugIn.prototype.configureUI = function (customOptions) {
            var manualInputs = { manualInputs: { iConfigureUI: 1 } };
            this.calculate(KatApp.extend({}, customOptions, manualInputs));
        };
        KatAppPlugIn.prototype.destroy = function () {
            this.element.removeAttr("rbl-application-id");
            this.element.off(".RBLe");
            this.ui.unbindEvents(this);
            this.ui.triggerEvent(this, "onDestroyed", this);
            delete this.element[0].KatApp;
        };
        KatAppPlugIn.prototype.updateOptions = function () {
            this.ui.unbindEvents(this);
            this.ui.bindEvents(this);
            this.ui.triggerEvent(this, "onOptionsUpdated", this);
        };
        // Result helper
        KatAppPlugIn.prototype.getResultTable = function (tableName) {
            return this.rble.getResultTable(this, tableName);
        };
        KatAppPlugIn.prototype.getResultRow = function (table, id, columnToSearch) {
            return this.rble.getResultRow(this, table, id, columnToSearch);
        };
        KatAppPlugIn.prototype.getResultValue = function (table, id, column, defautlValue) {
            return this.rble.getResultValue(this, table, id, column, defautlValue);
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
        function UIUtilities() {
        }
        UIUtilities.prototype.getInputName = function (input) {
            // Need to support : and $.  'Legacy' is : which is default mode a convert process has for VS, but Gu says to never use that, but it caused other issues that are documented in
            // 4.1 Validators.cs file so allowing both.
            // http://bytes.com/topic/asp-net/answers/433532-control-name-change-asp-net-2-0-generated-html
            // http://weblogs.asp.net/scottgu/gotcha-don-t-use-xhtmlconformance-mode-legacy-with-asp-net-ajax
            // data-input-name - Checkbox list items, I put the 'name' into a parent span (via attribute on ListItem)
            var htmlName = (input.parent().attr("data-input-name") || input.attr("name"));
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
        UIUtilities.prototype.getInputs = function (application, customOptions) {
            // const json = { inputs: {} };
            var inputs = {};
            var that = this;
            // skip table inputs b/c those are custom, and .dropdown-toggle b/c bootstrap select
            // puts a 'button input' inside of select in there
            jQuery.each($(customOptions.inputSelector + validInputSelector, application.element), function () {
                var input = $(this);
                // bootstrap selectpicker has some 'helper' inputs that I need to ignore
                if (input.parents(".bs-searchbox").length === 0) {
                    var value = that.getInputValue(input);
                    if (value !== undefined) {
                        var name_1 = that.getInputName(input);
                        inputs[name_1] = value;
                    }
                }
            });
            return inputs;
        };
        UIUtilities.prototype.getInputTables = function (application) {
            var that = this;
            var tables = [];
            var hasTables = false;
            jQuery.each($(".RBLe-input-table", application.element), function () {
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
        UIUtilities.prototype.triggerEvent = function (application, eventName) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var _a;
            (_a = application.options[eventName]) === null || _a === void 0 ? void 0 : _a.apply(application.element[0], args);
            application.element.trigger(eventName + ".RBLe", args);
        };
        UIUtilities.prototype.bindEvents = function (application) {
            if (application.options.inputSelector !== undefined) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {
                    $(this).bind("change.RBLe", function () {
                        var wizardInputSelector = $(this).data("input");
                        if (wizardInputSelector == undefined) {
                            application.calculate({ manualInputs: { iInputTrigger: $(this).attr("id") } });
                        }
                        else {
                            // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                            $("." + wizardInputSelector)
                                .val($(this).val())
                                .trigger("change.RBLe"); // trigger calculation
                        }
                    });
                });
            }
        };
        UIUtilities.prototype.unbindEvents = function (application) {
            var inputSelector = application.element.data("katapp-input-selector");
            if (inputSelector !== undefined) {
                $(inputSelector, application.element).off(".RBLe");
                application.element.removeData("katapp-input-selector");
            }
        };
        return UIUtilities;
    }());
    $.fn.KatApp.ui = new UIUtilities();
    var RBLeUtilities /* implements RBLeUtilitiesInterface */ = /** @class */ (function () {
        function RBLeUtilities() {
            this.ui = $.fn.KatApp.ui;
        }
        RBLeUtilities.prototype.setResults = function (application, results) {
            if (results !== undefined) {
                var propertyNames = results["@resultKeys"] = Object.keys(results).filter(function (k) { return !k.startsWith("@"); });
                // Ensure that all tables are an array
                propertyNames.forEach(function (k) {
                    var table = results[k];
                    if (!(table instanceof Array)) {
                        results[k] = [table];
                    }
                });
            }
            application.results = results;
            application.resultRowLookups = undefined;
        };
        RBLeUtilities.prototype.getData = function (application, currentOptions, next) {
            if (currentOptions.getData === undefined) {
                next("getData handler does not exist.");
                return;
            }
            currentOptions.getData(application, currentOptions, function (data) {
                next(undefined, data);
            }, function (_jqXHR, textStatus) {
                application.trace("getData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                next("getData AJAX Error Status: " + textStatus);
            });
        };
        RBLeUtilities.prototype.registerData = function (application, currentOptions, data, next) {
            var _a;
            var that = this;
            var register = (_a = currentOptions.registerData) !== null && _a !== void 0 ? _a : function (_app, _o, done, fail) {
                var _a, _b;
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
                        TestCE: (_a = currentOptions.useTestCalcEngine) !== null && _a !== void 0 ? _a : false,
                        CurrentPage: (_b = currentOptions.currentPage) !== null && _b !== void 0 ? _b : "Unknown",
                        RequestIP: "1.1.1.1",
                        CurrentUICulture: "en-US",
                        Environment: "PITT.PROD"
                    }
                };
                var json = {
                    Registration: KatApp.generateId(),
                    TransactionPackage: JSON.stringify(calculationOptions)
                };
                var jsonParams = {
                    url: KatApp.corsUrl,
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
                next("registerData AJAX Error Status: " + textStatus);
            };
            var registerDone = function (payload) {
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception == undefined) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.RegisteredToken;
                    application.options.data = currentOptions.data = undefined;
                    that.ui.triggerEvent(application, "onRegistration", currentOptions, application);
                    next();
                }
                else {
                    application.exception = payload;
                    application.trace("registerData Error Status: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    next("RBLe Register Data Error: " + payload.Exception.Message);
                }
            };
            register(application, currentOptions, registerDone, registerFailed);
        };
        RBLeUtilities.prototype.submitCalculation = function (application, currentOptions, next) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (currentOptions.registeredToken === undefined && currentOptions.data === undefined) {
                next("submitCalculation no registered token.");
                return;
            }
            var that = this;
            var saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            var traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            var refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";
            // Should make a helper that gets options (for both submit and register)
            // TODO: COnfirm all these options are right
            var calculationOptions = {
                Data: !((_a = currentOptions.registerDataWithService) !== null && _a !== void 0 ? _a : true) ? currentOptions.data : undefined,
                Inputs: application.inputs = KatApp.extend(this.ui.getInputs(application, currentOptions), currentOptions === null || currentOptions === void 0 ? void 0 : currentOptions.manualInputs),
                InputTables: this.ui.getInputTables(application),
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: ((_b = currentOptions.registerDataWithService) !== null && _b !== void 0 ? _b : true) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab,
                    ResultTabs: currentOptions.resultTabs,
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ((_c = currentOptions.refreshCalcEngine) !== null && _c !== void 0 ? _c : false),
                    PreCalcs: undefined,
                    // Non-session submission
                    AuthID: (_d = currentOptions.data) === null || _d === void 0 ? void 0 : _d.AuthID,
                    AdminAuthID: undefined,
                    Client: (_e = currentOptions.data) === null || _e === void 0 ? void 0 : _e.Client,
                    TestCE: (_f = currentOptions.useTestCalcEngine) !== null && _f !== void 0 ? _f : false,
                    CurrentPage: (_g = currentOptions.currentPage) !== null && _g !== void 0 ? _g : "Unknown",
                    RequestIP: "1.1.1.1",
                    CurrentUICulture: "en-US",
                    Environment: "PITT.PROD"
                }
            };
            var submitDone = function (payload) {
                var _a;
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception === undefined) {
                    that.setResults(application, (_a = payload.RBL) === null || _a === void 0 ? void 0 : _a.Profile.Data.TabDef);
                    next();
                }
                else {
                    application.exception = payload;
                    application.trace("RBLe Service Result Exception: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    next("RBLe Service Result Exception: " + payload.Exception.Message);
                }
            };
            var submitFailed = function (_jqXHR, textStatus) {
                application.trace("submitCalculation AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                next("submitCalculation AJAX Error Status: " + textStatus);
            };
            var submit = (_h = currentOptions.submitCalculation) !== null && _h !== void 0 ? _h : function (_app, o, done, fail) {
                $.ajax({
                    url: currentOptions.registerDataWithService ? currentOptions.corsUrl : currentOptions.functionUrl,
                    data: JSON.stringify(o),
                    method: "POST",
                    dataType: "json",
                    headers: currentOptions.registerDataWithService
                        ? { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                        : undefined
                })
                    .done(done)
                    .fail(fail);
            };
            submit(application, calculationOptions, submitDone, submitFailed);
        };
        RBLeUtilities.prototype.getResultRow = function (application, table, key, columnToSearch) {
            var _a;
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
        RBLeUtilities.prototype.getResultValue = function (application, table, key, column, defaultValue) {
            var _a, _b;
            return (_b = (_a = this.getResultRow(application, table, key)) === null || _a === void 0 ? void 0 : _a[column]) !== null && _b !== void 0 ? _b : defaultValue;
        };
        RBLeUtilities.prototype.getResultValueByColumn = function (application, table, keyColumn, key, column, defaultValue) {
            var _a, _b;
            return (_b = (_a = this.getResultRow(application, table, key, keyColumn)) === null || _a === void 0 ? void 0 : _a[column]) !== null && _b !== void 0 ? _b : defaultValue;
        };
        ;
        RBLeUtilities.prototype.getResultTable = function (application, tableName) {
            var _a;
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
        RBLeUtilities.prototype.processTemplate = function (application, templateId, data) {
            var template = $("rbl-template[tid=" + templateId + "]", application.element).first();
            if (template.length === 0) {
                template = $("rbl-template[tid=" + templateId + "]").first();
            }
            if (template.length === 0) {
                application.trace("Invalid template id: " + templateId, TraceVerbosity.Quiet);
                return "";
            }
            else {
                return template.html().format(data);
            }
        };
        RBLeUtilities.prototype.createHtmlFromResultRow = function (application, resultRow) {
            var _a, _b, _c, _d, _e;
            var view = application.element;
            var content = (_c = (_b = (_a = resultRow.content) !== null && _a !== void 0 ? _a : resultRow.html) !== null && _b !== void 0 ? _b : resultRow.value) !== null && _c !== void 0 ? _c : "";
            var selector = (_e = (_d = resultRow.selector) !== null && _d !== void 0 ? _d : resultRow["@id"]) !== null && _e !== void 0 ? _e : "";
            if (content.length > 0 && selector.length > 0) {
                //if selector contains no 'selector' characters (.#[:) , add a . in front (default is class; downside is no selecting plain element)
                if (selector === selector.replace(/#|:|\[|\./g, '')) {
                    selector = "." + selector;
                }
                var target = $(selector, view);
                if (target.length > 0) {
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
                                el.html(this.processTemplate(application, templateId, el.data()));
                            }
                            // Append 'tempalted' content to view
                            el.appendTo($(selector, view));
                        }
                        else {
                            target.append(content);
                        }
                    }
                }
            }
        };
        RBLeUtilities.prototype.processRblValues = function (application) {
            var that = this;
            //[rbl-value] inserts text value of referenced tabdef result into .html()
            $("[rbl-value]", application.element).each(function () {
                var el = $(this);
                var rblValueParts = el.attr('rbl-value').split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                var value = undefined;
                if (rblValueParts.length === 1)
                    value = that.getResultValue(application, "ejs-output", rblValueParts[0], "value");
                else if (rblValueParts.length === 3)
                    value = that.getResultValue(application, rblValueParts[0], rblValueParts[1], rblValueParts[2]);
                else if (rblValueParts.length === 4)
                    value = that.getResultValueByColumn(application, rblValueParts[0], rblValueParts[1], rblValueParts[2], rblValueParts[3]);
                if (value != undefined) {
                    $(this).html(value);
                }
                else {
                    application.trace("RBL WARNING: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Minimal);
                }
            });
        };
        RBLeUtilities.prototype.processRblSources = function (application) {
            var that = this;
            //[rbl-source] processing templates that use rbl results
            $("[rbl-source]", application.element).each(function () {
                var _a, _b;
                var el = $(this);
                // TOM - Need some flow documentation here
                if (el.attr("rbl-configui") === undefined || ((_a = application.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                    var elementData = el.data();
                    var tid = el.attr('rbl-tid');
                    // TOM - inline needed for first case?  What does it mean if rbl-tid is blank?  Need a variable name
                    var inlineTemplate = tid === undefined ? $("[rbl-tid]", el) : undefined;
                    var templateContent_1 = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $(inlineTemplate.prop("outerHTML").format(elementData)).removeAttr("rbl-tid").prop("outerHTML")
                        : that.processTemplate(application, tid, elementData);
                    var rblSourceParts_1 = (_b = el.attr('rbl-source')) === null || _b === void 0 ? void 0 : _b.split('.');
                    if (templateContent_1 === undefined) {
                        application.trace("RBL WARNING: Template content could not be found: [" + tid + "].", TraceVerbosity.Normal);
                    }
                    else if (rblSourceParts_1 === undefined || rblSourceParts_1.length === 0) {
                        application.trace("RBL WARNING: no rbl-source data", TraceVerbosity.Normal);
                    }
                    else if (rblSourceParts_1.length === 1 || rblSourceParts_1.length === 3) {
                        //table in array format.  Clear element, apply template to all table rows and .append
                        var table = that.getResultTable(application, rblSourceParts_1[0]);
                        if (table !== undefined && table.length > 0) {
                            el.children(":not(.rbl-preserve, [rbl-tid='inline'])").remove();
                            var i_1 = 1;
                            table.forEach(function (row) {
                                if (rblSourceParts_1.length === 1 || row[rblSourceParts_1[1]] === rblSourceParts_1[2]) {
                                    var templateData = KatApp.extend({}, row, { _index0: i_1 - 1, _index1: i_1++ });
                                    el.append(templateContent_1.format(templateData));
                                }
                            });
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                    else if (rblSourceParts_1.length === 2) {
                        var row = that.getResultRow(application, rblSourceParts_1[0], rblSourceParts_1[1]);
                        if (row !== undefined) {
                            el.html(templateContent_1.format(row));
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                    else if (rblSourceParts_1.length === 3) {
                        var value = that.getResultValue(application, rblSourceParts_1[0], rblSourceParts_1[1], rblSourceParts_1[2]);
                        if (value !== undefined) {
                            el.html(templateContent_1.format({ "value": value }));
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                }
            });
        };
        RBLeUtilities.prototype.processVisibilities = function (application) {
            var that = this;
            // toggle visibility
            //[rbl-display] controls display = none|block(flex?).  
            //Should this be rbl-state ? i.e. other states visibility, disabled, delete
            $("[rbl-display]", application.element).each(function () {
                var _a;
                var el = $(this);
                //legacy table is ejs-visibility but might work a little differently
                var rblDisplayParts = el.attr('rbl-display').split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                //check to see if there's an "=" for a simple equality expression
                var expressionParts = rblDisplayParts[rblDisplayParts.length - 1].split('=');
                rblDisplayParts[rblDisplayParts.length - 1] = expressionParts[0];
                var visibilityValue = undefined;
                if (rblDisplayParts.length == 1)
                    visibilityValue = that.getResultValue(application, "ejs-output", rblDisplayParts[0], "value");
                else if (rblDisplayParts.length == 3)
                    visibilityValue = that.getResultValue(application, rblDisplayParts[0], rblDisplayParts[1], rblDisplayParts[2]);
                else if (rblDisplayParts.length == 4)
                    visibilityValue = that.getResultValueByColumn(application, rblDisplayParts[0], rblDisplayParts[1], rblDisplayParts[2], rblDisplayParts[3]);
                if (visibilityValue != undefined) {
                    if (visibilityValue.length > 1) {
                        visibilityValue = (visibilityValue == expressionParts[1]); //allows table.row.value=10
                    }
                    if (visibilityValue === "0" || visibilityValue === false || ((_a = visibilityValue) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "false" || visibilityValue === "") {
                        el.hide();
                    }
                    else {
                        el.show();
                    }
                }
                else {
                    application.trace("RBL WARNING: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Normal);
                }
            });
        };
        RBLeUtilities.prototype.processResults = function (application) {
            var _this = this;
            var results = application.results;
            //processes the view with rbl results (render engine)
            //elements using templates have rbl-tid or rbl-source
            //templates: run once page build | run once after rbl call (not subsequent times)
            //element content can be preserved with a class flag
            //generated content append or prepend (only applicably when preserved content)
            if (results !== undefined) {
                // TODO Process results...implement appProcessResults
                var calcEngineName = results["@calcEngine"];
                var version = results["@version"];
                application.trace("Processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal);
                //need two passes to support "ejs-markup"
                // TOM - Why 2 passes needed?
                var markUpRows = this.getResultTable(application, "ejs-markup");
                markUpRows.forEach(function (r) { _this.createHtmlFromResultRow(application, r); });
                var outputRows = this.getResultTable(application, "ejs-output");
                outputRows.forEach(function (r) { _this.createHtmlFromResultRow(application, r); });
                this.processRblSources(application);
                this.processRblValues(application);
                // apply dynamic classes after all html updates (could this be done with 'non-template' build above)
                markUpRows.concat(outputRows).forEach(function (r) {
                    if (r.selector !== undefined) {
                        if (r.addclass !== undefined && r.addclass.length > 0) {
                            $(r.selector, application.element).addClass(r.addclass);
                        }
                        if (r.removeclass !== undefined && r.removeclass.length > 0) {
                            $(r.selector, application.element).removeClass(r.addclass);
                        }
                    }
                });
                this.processVisibilities(application);
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
    $.fn.KatApp.rble = new RBLeUtilities();
    var StandardTemplateBuilder /* implements StandardTemplateBuilderInterface*/ = /** @class */ (function () {
        function StandardTemplateBuilder(application) {
            // Associated code with this variable might belong in template html/js, but putting here for now.
            this.firstHighcharts = true;
            this.application = application;
        }
        StandardTemplateBuilder.prototype.buildSlider = function (el) {
            var _a, _b;
            var id = el.data("inputname");
            var that = this;
            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.s." + id) {
                debugger;
            }
            var config = this.application.getResultRow("ejs-sliders", id);
            if (config == undefined)
                return;
            var minValue = Number(config.min);
            var maxValue = Number(config.max);
            var defaultConfigValue = this.application.getResultValue("ejs-defaults", id, "value") || // what is in ejs-defaults
                config.default || // what was in ejs-slider/default
                $("." + id).val() || // what was put in the text box
                config.min; //could/should use this
            var stepValue = Number(config.step || "1");
            var format = config.format || "n";
            var decimals = Number(config.decimals || "0");
            var sliderJQuery = $(".slider-" + id, el);
            $("." + id, el).val(defaultConfigValue);
            if (sliderJQuery.length === 1) {
                var slider = sliderJQuery[0];
                sliderJQuery.data("min", minValue);
                sliderJQuery.data("max", maxValue);
                // Some modelers have 'wizards' with 'same' inputs as regular modeling page.  The 'wizard sliders'
                // actually just set the input value of the regular input and let all the other flow (main input's
                // change event) happen as normal.
                var targetInput_1 = sliderJQuery.data("input");
                var defaultSliderValue = targetInput_1 != undefined
                    ? $("." + targetInput_1, this.application.element).val()
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
                        $("." + id).val(value);
                        var v = format == "p" ? value / 100 : value;
                        $("." + id + "Label, .sv" + id).html(String.localeFormat("{0:" + format + decimals + "}", v));
                    });
                    // Check to see that the input isn't marked as a skip input and if so, run a calc when the value is 'set'.
                    // If targetInput is present, then this is a 'wizard' slider so I need to see if 'main'
                    // input has been marked as a 'skip'.
                    var sliderCalcId = targetInput_1 || id;
                    if ($("." + sliderCalcId + ".skipRBLe", this.application.element).length === 0 && $("." + sliderCalcId, this.application.element).parents(".skipRBLe").length === 0) {
                        if (targetInput_1 === undefined /* never trigger run from wizard sliders */) {
                            // Whenever 'regular' slider changes or is updated via set()...
                            instance.on('set.RBLe', function () {
                                var settingDefault = $(this.target).data("setting-default") === 1;
                                if (!settingDefault && that.application.options !== undefined) {
                                    var sliderCalcOptions = $.extend(true, {}, that.application.options, { Inputs: { iInputTrigger: id } });
                                    that.application.calculate(sliderCalcOptions);
                                }
                            });
                        }
                        else {
                            // When wizard slider changes, set matching 'regular slider' value with same value from wizard
                            instance.on('change.RBLe', function () {
                                var value = Number(this.get());
                                var targetSlider = $(".slider-" + targetInput_1, that.application.element);
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
        };
        StandardTemplateBuilder.prototype.buildCarousel = function (el) {
            var carouselName = el.attr("rbl-name");
            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.c." + carouselName) {
                debugger;
            }
            if (carouselName !== undefined && !carouselName.includes("{")) {
                this.application.trace("Processing carousel: " + carouselName, TraceVerbosity.Detailed);
                //add active class to carousel items
                $(".carousel-inner .item", el).first().addClass("active");
                //add 'target needed by indicators, referencing name of carousel
                $(".carousel-indicators li", el)
                    .attr("data-target", "#carousel-" + carouselName)
                    .first().addClass("active");
                var carousel_1 = $('.carousel', el);
                var carouselAll_1 = $('.carousel-all', el);
                //add buttons to show/hide
                $('<a class="list-btn"> Show More</a>')
                    .appendTo($(".carousel-indicators", el))
                    .click(function () {
                    carousel_1.hide();
                    carouselAll_1.show();
                });
                $('<div class="text-center"><a class="carousel-btn"> Show Less</a></div>')
                    .appendTo(carouselAll_1)
                    .click(function () {
                    carouselAll_1.hide();
                    carousel_1.show();
                });
                //show initial item, start carousel:
                carousel_1.carousel(0);
            }
        };
        StandardTemplateBuilder.prototype.stringCompare = function (strA, strB, ignoreCase) {
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
        StandardTemplateBuilder.prototype.getHighchartsConfigValue = function (configurationName) {
            var _this = this;
            var _a, _b, _c, _d, _e;
            // Look in override table first, then fall back to 'regular' options table
            return (_c = (_b = (_a = this.highchartsOverrides) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_e = (_d = this.highchartsOptions) === null || _d === void 0 ? void 0 : _d.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _e === void 0 ? void 0 : _e.value;
        };
        StandardTemplateBuilder.prototype.ensureHighchartsCulture = function () {
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
        StandardTemplateBuilder.prototype.removeRBLEncoding = function (value) {
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
        StandardTemplateBuilder.prototype.getHighChartsOptionValue = function (value) {
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
        StandardTemplateBuilder.prototype.setHighChartsOption = function (optionsContainer, name, value) {
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
                if (optionJson[optionName] === undefined || onPropertyValue) {
                    optionJson[optionName] = optionIndex > -1 ? [] : newValue;
                }
                // If property is an array and index isn't there yet, push a new element
                if (optionIndex > -1 && optionJson[optionName].length - 1 < optionIndex) { // eslint-disable-line @typescript-eslint/no-explicit-any
                    optionJson[optionName].push(newValue); // eslint-disable-line @typescript-eslint/no-explicit-any
                }
                // Reset my local variable to the most recently added/created object
                optionJson = optionIndex > -1
                    ? optionJson[optionName][optionIndex]
                    : optionJson[optionName];
            }
        };
        StandardTemplateBuilder.prototype.getHighChartsXAxisOptions = function (existingOptions, chartData) {
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
        StandardTemplateBuilder.prototype.getHighchartsTooltipOptions = function (seriesColumns, chartConfigurationRows) {
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
        StandardTemplateBuilder.prototype.getHighchartsOptions = function (firstDataRow) {
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
                var allChartColumns = Object.keys(firstDataRow);
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
        StandardTemplateBuilder.prototype.getHighChartsSeriesDataRow = function (row, allColumnNames, seriesName, isXAxisChart) {
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
        StandardTemplateBuilder.prototype.getHighChartsSeries = function (allColumns, seriesColumns, chartConfigurationRows, chartData, isXAxisChart) {
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
        StandardTemplateBuilder.prototype.buildHighcharts = function (el) {
            var _this = this;
            var _a, _b;
            this.highChartsDataName = el.attr("rbl-chartdata");
            this.highChartsOptionsName = (_a = el.attr("rbl-chartoptions")) !== null && _a !== void 0 ? _a : this.highChartsDataName;
            if (this.highChartsDataName !== undefined && this.highChartsOptionsName !== undefined) {
                this.ensureHighchartsCulture();
                this.highchartsOverrides = this.application.getResultTable("HighCharts-Overrides").filter(function (r) { return _this.stringCompare(r["@id"], _this.highChartsDataName, true) === 0; });
                this.highchartsOptions = this.application.getResultTable("HighCharts-" + this.highChartsOptionsName + "-Options");
                this.highchartsData = this.application.getResultTable("HighCharts-" + this.highChartsDataName + "-Data");
                var container = $(".chart", el);
                var renderStyle = (_b = container.attr("style")) !== null && _b !== void 0 ? _b : "";
                var configStyle = this.getHighchartsConfigValue("config-style");
                if (configStyle !== undefined) {
                    if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                        renderStyle += ";";
                    }
                    container.attr("style", renderStyle + configStyle);
                }
                var firstDataRow = this.highchartsData.filter(function (r) { return !(r.category || "").startsWith("config-"); }).shift();
                if (firstDataRow !== undefined) {
                    var chartOptions = this.getHighchartsOptions(firstDataRow);
                    var highchart = Highcharts.charts[container.data('highchartsChart')];
                    if (highchart !== undefined) {
                        highchart.destroy();
                    }
                    try {
                        container.highcharts(chartOptions);
                    }
                    catch (error) {
                        throw error;
                    }
                }
            }
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
    $.fn.KatApp.plugInShims.forEach(function (a) {
        $.fn.KatApp.applicationFactory(a.id, a.element, a.options);
    });
    // Destroy plugInShims
    delete $.fn.KatApp.plugInShims;
});
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js
//# sourceMappingURL=KatAppProvider.js.map