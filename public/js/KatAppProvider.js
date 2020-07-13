"use strict";
KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);
(function ($, window, document, undefined) {
    var tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    var validInputSelector = ".notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons;
    var skipBindingInputSelector = ".notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;
    KatApp.defaultOptions = KatApp.extend({
        debug: {
            traceVerbosity: TraceVerbosity.None,
            saveFirstCalculationLocation: KatApp.pageParameters["save"],
            useTestCalcEngine: KatApp.pageParameters["test"] === "1",
            refreshCalcEngine: KatApp.pageParameters["expirece"] === "1"
        },
        shareDataWithOtherApplications: true,
        functionUrl: KatApp.functionUrl,
        sessionUrl: KatApp.sessionUrl,
        currentPage: "Unknown1",
        inputSelector: "input, textarea, select",
        inputTab: "RBLInput",
        resultTabs: ["RBLResult"],
        runConfigureUICalculation: true,
        ajaxLoaderSelector: ".ajaxloader",
        onCalculateStart: function (application) {
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).show();
            }
            var inputSelector = application.element.data("katapp-input-selector");
            if (inputSelector !== undefined) {
                $(".slider-control, " + inputSelector, application.element)
                    .filter(":not(" + skipBindingInputSelector + ", :disabled)")
                    .attr("disabled", "disabled")
                    .attr("kat-disabled", "true");
                if (typeof $.fn.selectpicker === "function") {
                    $("select.bootstrap-select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
                }
            }
        },
        onCalculateEnd: function (application) {
            if (application.options.ajaxLoaderSelector !== undefined) {
                $(application.options.ajaxLoaderSelector, application.element).fadeOut();
            }
            if (typeof $.fn.selectpicker === "function") {
                $("select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']", application.element).removeAttr("disabled").selectpicker("refresh");
            }
            $("[kat-disabled='true']", application.element).removeAttr("disabled kat-disabled");
        },
        getData: function (appilcation, options, done, _fail) {
            done({
                AuthID: "Empty",
                Client: "Empty",
                Profile: {},
                History: {}
            });
        }
    }, KatApp.defaultOptions);
    var KatAppPlugIn = (function () {
        function KatAppPlugIn(id, element, options) {
            var _a;
            this.options = {};
            this.id = id;
            this.element = element;
            this.displayId = (_a = element.attr("rbl-trace-id")) !== null && _a !== void 0 ? _a : id;
            this.element[0].KatApp = this;
            this.ui = $.fn.KatApp.ui(this);
            this.rble = $.fn.KatApp.rble(this, this.ui);
            this.init(options);
        }
        KatAppPlugIn.prototype.init = function (options) {
            var _a, _b, _c, _d, _e, _f;
            var attrResultTabs = this.element.attr("rbl-result-tabs");
            var attributeOptions = {
                calcEngine: (_a = this.element.attr("rbl-calcengine")) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.calcEngine,
                inputTab: (_b = this.element.attr("rbl-input-tab")) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: this.element.attr("rbl-view"),
                viewTemplates: this.element.attr("rbl-view-templates")
            };
            this.options = KatApp.extend({}, KatApp.defaultOptions, attributeOptions, {
                registerDataWithService: KatApp.defaultOptions.registerData !== undefined || (options === null || options === void 0 ? void 0 : options.registerData) !== undefined || ((options === null || options === void 0 ? void 0 : options.registeredToken) !== undefined),
                shareDataWithOtherApplications: (options === null || options === void 0 ? void 0 : options.registeredToken) === undefined
            }, options);
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
            var requiredTemplates = that.options.viewTemplates != undefined
                ? that.options.viewTemplates.split(",").map(function (r) { return r.ensureGlobalPrefix(); })
                : [];
            var resourceResults = undefined;
            var _templatesUsedByAllApps = $.fn.KatApp.templatesUsedByAllApps;
            var _templateDelegates = $.fn.KatApp.templateDelegates;
            var loadView = function () {
                var _a, _b;
                if (viewId !== undefined) {
                    that.trace(viewId + " requested from CMS.", TraceVerbosity.Detailed);
                    var debugResourcesDomain = (_a = that.options.debug) === null || _a === void 0 ? void 0 : _a.debugResourcesDomain;
                    if (debugResourcesDomain !== undefined) {
                        debugResourcesDomain += "views/";
                    }
                    that.trace((_b = "Downloading " + viewId + " from " + debugResourcesDomain) !== null && _b !== void 0 ? _b : functionUrl, TraceVerbosity.Diagnostic);
                    KatApp.getResources(that, viewId, useTestView, false, debugResourcesDomain, function (errorMessage, results) {
                        var _a, _b, _c;
                        pipelineError = errorMessage;
                        if (pipelineError === undefined) {
                            that.trace(viewId + " returned from CMS.", TraceVerbosity.Normal);
                            var data = results[viewId];
                            var view = $("<div class='katapp-css'>" + data.format({ thisView: "[rbl-application-id='" + that.id + "']", id: that.id, thisClass: ".katapp-" + that.id }) + "</div>");
                            var rblConfig = $("rbl-config", view).first();
                            if (rblConfig.length !== 1) {
                                that.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                            }
                            that.options.calcEngine = (_a = that.options.calcEngine) !== null && _a !== void 0 ? _a : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("calcengine");
                            var toFetch = rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("templates");
                            if (toFetch !== undefined) {
                                requiredTemplates =
                                    requiredTemplates
                                        .concat(toFetch.split(",").map(function (r) { return r.ensureGlobalPrefix(); }))
                                        .filter(function (v, i, a) { return v !== undefined && v.length != 0 && a.indexOf(v) === i; });
                            }
                            that.options.inputTab = (_b = that.options.inputTab) !== null && _b !== void 0 ? _b : rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("input-tab");
                            var attrResultTabs_1 = rblConfig === null || rblConfig === void 0 ? void 0 : rblConfig.attr("result-tabs");
                            that.options.resultTabs = (_c = that.options.resultTabs) !== null && _c !== void 0 ? _c : (attrResultTabs_1 != undefined ? attrResultTabs_1.split(",") : undefined);
                            that.element.empty().append(view);
                            initPipeline(0);
                        }
                        else {
                            pipelineError = errorMessage;
                            initPipeline(2);
                        }
                    });
                }
                else {
                    initPipeline(0);
                }
            };
            var loadTemplates = function () {
                var _a, _b;
                var otherResourcesNeeded = 0;
                requiredTemplates.filter(function (r) { var _a, _b; return ((_b = (_a = _templatesUsedByAllApps[r]) === null || _a === void 0 ? void 0 : _a.requested) !== null && _b !== void 0 ? _b : false); })
                    .forEach(function (r) {
                    otherResourcesNeeded++;
                    that.trace("Need to wait for already requested template: " + r, TraceVerbosity.Detailed);
                    _templatesUsedByAllApps[r].callbacks.push(function (errorMessage) {
                        that.trace("Template: " + r + " is now ready.", TraceVerbosity.Detailed);
                        if (pipelineError === undefined) {
                            if (errorMessage === undefined) {
                                otherResourcesNeeded--;
                                if (otherResourcesNeeded === 0) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                    initPipeline(0);
                                }
                                else {
                                    that.trace("Waiting for " + otherResourcesNeeded + " more templates.", TraceVerbosity.Diagnostic);
                                }
                            }
                            else {
                                that.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet);
                                pipelineError = errorMessage;
                                initPipeline(1);
                            }
                        }
                    });
                });
                var toFetch = [];
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
                    if (debugResourcesDomain !== undefined) {
                        debugResourcesDomain += "templates/";
                    }
                    that.trace((_b = "Downloading " + toFetchList_1 + " from " + debugResourcesDomain) !== null && _b !== void 0 ? _b : functionUrl, TraceVerbosity.Diagnostic);
                    KatApp.getResources(that, toFetchList_1, useTestView, false, debugResourcesDomain, function (errorMessage, data) {
                        if (errorMessage === undefined) {
                            resourceResults = data;
                            that.trace(toFetchList_1 + " returned from CMS.", TraceVerbosity.Normal);
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
                                var currentCallback = undefined;
                                while ((currentCallback = _templatesUsedByAllApps[r].callbacks.pop()) !== undefined) {
                                    currentCallback(errorMessage);
                                }
                                _templatesUsedByAllApps[r].requested = false;
                            });
                            pipelineError = errorMessage;
                            initPipeline(1);
                        }
                    });
                }
                else if (otherResourcesNeeded === 0) {
                    initPipeline(1);
                }
            };
            var injectTemplates = function () {
                if (resourceResults != null) {
                    Object.keys(resourceResults).forEach(function (r) {
                        var data = resourceResults[r];
                        var rblKatApps = $("rbl-katapps");
                        var t = $("<rbl-templates rbl-t='" + r.toLowerCase() + "'>" + data.replace(/{thisTemplate}/g, r) + "</rbl-templates>");
                        t.appendTo(rblKatApps);
                        that.trace(r + " injected into markup.", TraceVerbosity.Normal);
                        _templatesUsedByAllApps[r].data = data;
                        _templatesUsedByAllApps[r].requested = false;
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
                    requiredTemplates
                        .forEach(function (t) {
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
                    that.options.viewTemplates = requiredTemplates.join(",");
                    $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                        var templateId = $(this).attr('rbl-tid');
                        if (templateId !== undefined && templateId !== "inline") {
                            that.rble.injectTemplate($(this), that.rble.getTemplate(templateId, $(this).data()));
                        }
                    });
                    var templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory(that);
                    templateBuilder.processUI();
                    that.ui.bindCalculationInputs();
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
                initPipeline(0);
            };
            pipeline.push(loadView, loadTemplates, injectTemplates, finalizeInit);
            pipelineNames.push("initPipeline.loadView", "initPipeline.loadTemplates", "initPipeline.injectTemplates", "initPipeline.finalizeInit");
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
            var shareDataWithOtherApplications = (_a = this.options.shareDataWithOtherApplications) !== null && _a !== void 0 ? _a : false;
            if (shareDataWithOtherApplications) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options.sharedDataLastRequested = _sharedData.lastRequested;
            }
            if (this.options.calcEngine === undefined) {
                return;
            }
            this.exception = undefined;
            this.ui.triggerEvent("onCalculateStart", this);
            var that = this;
            var currentOptions = KatApp.extend({}, that.options, customOptions);
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
            var submitCalculation = function () {
                try {
                    that.rble.submitCalculation(currentOptions, function (errorMessage) {
                        pipelineError = errorMessage;
                        calculatePipeline(errorMessage !== undefined ? 0 : 3);
                    });
                }
                catch (error) {
                    pipelineError = "Submit.Pipeline exception: " + error;
                    calculatePipeline(3);
                }
            };
            var getCalculationData = function () {
                try {
                    pipelineError = undefined;
                    if (shareDataWithOtherApplications && _sharedData.requesting) {
                        that.trace("Need to wait for already requested data.", TraceVerbosity.Detailed);
                        _sharedData.callbacks.push(function (errorMessage) {
                            if (errorMessage === undefined) {
                                that.trace("Data is now ready.", TraceVerbosity.Detailed);
                                that.options.data = currentOptions.data = _sharedData.data;
                                that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                                that.options.sharedDataLastRequested = _sharedData.lastRequested;
                                calculatePipeline(1);
                            }
                            else {
                                that.trace("Data retrieval failed in other application.", TraceVerbosity.Detailed);
                                pipelineError = errorMessage;
                                calculatePipeline(2);
                            }
                        });
                    }
                    else if (shareDataWithOtherApplications && _sharedData.lastRequested != null && (that.options.sharedDataLastRequested === undefined || _sharedData.lastRequested > that.options.sharedDataLastRequested)) {
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
                            that.rble.getData(currentOptions, function (errorMessage, data) {
                                if (errorMessage !== undefined) {
                                    pipelineError = errorMessage;
                                    if (shareDataWithOtherApplications) {
                                        callSharedCallbacks(errorMessage);
                                    }
                                    calculatePipeline(2);
                                }
                                else {
                                    that.options.data = currentOptions.data = data;
                                    if (shareDataWithOtherApplications) {
                                        _sharedData.data = that.options.data;
                                        if (!that.options.registerDataWithService) {
                                            callSharedCallbacks(undefined);
                                        }
                                    }
                                    if (!that.options.registerDataWithService) {
                                        calculatePipeline(1);
                                    }
                                    else {
                                        calculatePipeline(0);
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
                    calculatePipeline(2);
                }
            };
            var registerData = function () {
                try {
                    that.rble.registerData(currentOptions, that.options.data, function (errorMessage) {
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
            var resubmitCalculation = function () {
                try {
                    that.rble.submitCalculation(currentOptions, function (errorMessage) {
                        pipelineError = errorMessage;
                        calculatePipeline(0);
                    });
                }
                catch (error) {
                    pipelineError = "ReSubmit.Pipeline exception: " + error;
                    calculatePipeline(0);
                }
            };
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
                        $(".needsRBLeConfig", that.element).removeClass("needsRBLeConfig");
                    }
                    else {
                        that.rble.setResults(undefined);
                        that.ui.triggerEvent("onCalculationErrors", "RunCalculation", pipelineError, that.exception, currentOptions, that);
                    }
                }
                catch (error) {
                    that.trace("Error during result processing: " + error, TraceVerbosity.None);
                    that.ui.triggerEvent("onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that);
                }
                finally {
                    that.ui.triggerEvent("onCalculateEnd", that);
                }
            };
            pipeline.push(submitCalculation, getCalculationData, registerData, resubmitCalculation, processResults);
            pipelineNames.push("calculatePipeline.submitCalculation", "calculatePipeline.getCalculationData", "calculatePipeline.registerData", "calculatePipeline.resubmitCalculation", "calculatePipeline.processResults");
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
        KatAppPlugIn.prototype.getResultTable = function (tableName) {
            return this.rble.getResultTable(tableName);
        };
        KatAppPlugIn.prototype.getResultRow = function (table, id, columnToSearch) {
            return this.rble.getResultRow(table, id, columnToSearch);
        };
        KatAppPlugIn.prototype.getResultValue = function (table, id, column, defautlValue) {
            return this.rble.getResultValue(table, id, column, defautlValue);
        };
        KatAppPlugIn.prototype.saveCalcEngine = function (location) {
            this.element.data("katapp-save-calcengine", location);
        };
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
    var UIUtilities = (function () {
        function UIUtilities(application) {
            this.application = application;
        }
        UIUtilities.prototype.getInputName = function (input) {
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
            var inputs = {};
            var that = this;
            if (customOptions.inputSelector !== undefined) {
                var validInputs = $(customOptions.inputSelector, this.application.element).not(validInputSelector);
                jQuery.each(validInputs, function () {
                    var input = $(this);
                    if (input.parents(".bs-searchbox").length === 0) {
                        var value = that.getInputValue(input);
                        if (value !== undefined) {
                            var name_1 = that.getInputName(input);
                            inputs[name_1] = value;
                        }
                    }
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
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var _a;
            var application = this.application;
            try {
                application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
                (_a = application.options[eventName]) === null || _a === void 0 ? void 0 : _a.apply(application.element[0], args);
                application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            }
            catch (error) {
                application.trace("Error calling " + eventName + ": " + error, TraceVerbosity.None);
            }
            try {
                application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
                application.element.trigger(eventName + ".RBLe", args);
                application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);
            }
            catch (error) {
                application.trace("Error triggering " + eventName + ": " + error, TraceVerbosity.None);
            }
        };
        UIUtilities.prototype.changeRBLe = function (element) {
            var wizardInputSelector = element.data("input");
            if (wizardInputSelector == undefined) {
                this.application.calculate({ manualInputs: { iInputTrigger: this.getInputName(element) } });
            }
            else {
                $("." + wizardInputSelector)
                    .val(element.val())
                    .trigger("change.RBLe");
            }
        };
        UIUtilities.prototype.bindCalculationInputs = function () {
            var application = this.application;
            if (application.options.inputSelector !== undefined && application.options.calcEngine !== undefined) {
                application.element.data("katapp-input-selector", application.options.inputSelector);
                var that_1 = this;
                $(application.options.inputSelector, application.element).not(skipBindingInputSelector).each(function () {
                    $(this).bind("change.RBLe", function () {
                        that_1.changeRBLe($(this));
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
            return (input.length === 1 && $("label", input).length === 1 && $("input[type=checkbox]", input).length === 1);
        };
        UIUtilities.prototype.getAspNetCheckboxLabel = function (input) {
            return this.isAspNetCheckbox(input)
                ? $("label", input)
                : undefined;
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
            if (id === id.replace(/#|:|\[|\./g, '')) {
                id = "." + id;
            }
            return id;
        };
        return UIUtilities;
    }());
    $.fn.KatApp.ui = function (application) {
        return new UIUtilities(application);
    };
    var RBLeUtilities = (function () {
        function RBLeUtilities(application, uiUtilities) {
            this.application = application;
            this.ui = uiUtilities;
        }
        RBLeUtilities.prototype.setResults = function (results) {
            if (results !== undefined) {
                var propertyNames = results["@resultKeys"] = Object.keys(results).filter(function (k) { return !k.startsWith("@"); });
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
                var _a, _b, _c;
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
                    that.ui.triggerEvent("onRegistration", currentOptions, application);
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            if (currentOptions.registeredToken === undefined && currentOptions.data === undefined) {
                submitCalculationHandler("submitCalculation no registered token.");
                return;
            }
            var application = this.application;
            var saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            var traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            var refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";
            if (currentOptions.defaultInputs !== undefined) {
                delete currentOptions.defaultInputs.iInputTrigger;
            }
            var calculationOptions = {
                Data: !((_a = currentOptions.registerDataWithService) !== null && _a !== void 0 ? _a : true) ? currentOptions.data : undefined,
                Inputs: application.calculationInputs = KatApp.extend(this.ui.getInputs(currentOptions), currentOptions.defaultInputs, currentOptions === null || currentOptions === void 0 ? void 0 : currentOptions.manualInputs),
                InputTables: this.ui.getInputTables(),
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: ((_b = currentOptions.registerDataWithService) !== null && _b !== void 0 ? _b : true) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab,
                    ResultTabs: currentOptions.resultTabs,
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ((_d = (_c = currentOptions.debug) === null || _c === void 0 ? void 0 : _c.refreshCalcEngine) !== null && _d !== void 0 ? _d : false),
                    PreCalcs: undefined,
                    AuthID: (_e = currentOptions.data) === null || _e === void 0 ? void 0 : _e.AuthID,
                    AdminAuthID: undefined,
                    Client: (_f = currentOptions.data) === null || _f === void 0 ? void 0 : _f.Client,
                    TestCE: (_h = (_g = currentOptions.debug) === null || _g === void 0 ? void 0 : _g.useTestCalcEngine) !== null && _h !== void 0 ? _h : false,
                    CurrentPage: (_j = currentOptions.currentPage) !== null && _j !== void 0 ? _j : "Unknown",
                    RequestIP: "1.1.1.1",
                    CurrentUICulture: "en-US",
                    Environment: "PITT.PROD"
                }
            };
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
            var submit = (_k = currentOptions.submitCalculation) !== null && _k !== void 0 ? _k : function (_app, o, done, fail) {
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
        RBLeUtilities.prototype.getTemplate = function (templateId, data) {
            var application = this.application;
            var template = $("rbl-template[tid=" + templateId + "]", application.element).first();
            if (application.options.viewTemplates != undefined) {
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
                return {
                    Type: template.attr("type"),
                    Content: template
                        .html()
                        .format(KatApp.extend({}, data, { id: application.id }))
                        .replace(" _id", " id")
                };
            }
        };
        RBLeUtilities.prototype.createHtmlFromResultRow = function (resultRow, processBlank) {
            var _a, _b, _c, _d, _e, _f;
            var view = this.application.element;
            var content = (_c = (_b = (_a = resultRow.content) !== null && _a !== void 0 ? _a : resultRow.html) !== null && _b !== void 0 ? _b : resultRow.value) !== null && _c !== void 0 ? _c : "";
            var selector = (_e = (_d = this.ui.getJQuerySelector(resultRow.selector)) !== null && _d !== void 0 ? _d : this.ui.getJQuerySelector(resultRow["@id"])) !== null && _e !== void 0 ? _e : "";
            if ((processBlank || content.length > 0) && selector.length > 0) {
                var target = $(selector, view);
                if (target.length > 0) {
                    if (target.length === 1) {
                        target = (_f = this.ui.getAspNetCheckboxLabel(target)) !== null && _f !== void 0 ? _f : target;
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
                                this.injectTemplate(el, this.getTemplate(templateId, el.data()));
                            }
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
            $("[rbl-value]", application.element).each(function () {
                var el = $(this);
                var rblValueParts = el.attr('rbl-value').split('.');
                var value = that.getRblSelectorValue("ejs-output", rblValueParts);
                if (value != undefined) {
                    $(this).html(value);
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Minimal);
                }
            });
        };
        RBLeUtilities.prototype.processRblSources = function () {
            var that = this;
            var application = this.application;
            $("[rbl-source], [rbl-source-table]", application.element).each(function () {
                var _a, _b, _c, _d, _e, _f;
                var el = $(this);
                if (el.attr("rbl-configui") === undefined || ((_a = application.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                    var elementData = el.data();
                    var tid = el.attr('rbl-tid');
                    var rblSourceTableParts = (_b = el.attr('rbl-source-table')) === null || _b === void 0 ? void 0 : _b.split('.');
                    var rblSourceParts_1 = rblSourceTableParts === undefined
                        ? (_c = el.attr('rbl-source')) === null || _c === void 0 ? void 0 : _c.split('.') : rblSourceTableParts.length === 3
                        ? [(_d = that.getResultValue(rblSourceTableParts[0], rblSourceTableParts[1], rblSourceTableParts[2])) !== null && _d !== void 0 ? _d : "unknown"]
                        : [(_e = that.getResultValueByColumn(rblSourceTableParts[0], rblSourceTableParts[1], rblSourceTableParts[2], rblSourceTableParts[3])) !== null && _e !== void 0 ? _e : "unknown"];
                    var inlineTemplate = tid === undefined ? $("[rbl-tid]", el) : undefined;
                    var templateContent_1 = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $(inlineTemplate.prop("outerHTML").format(elementData)).removeAttr("rbl-tid").prop("outerHTML")
                        : (_f = that.getTemplate(tid, elementData)) === null || _f === void 0 ? void 0 : _f.Content;
                    if (templateContent_1 === undefined) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found: [" + tid + "].", TraceVerbosity.Minimal);
                    }
                    else if (rblSourceParts_1 === undefined || rblSourceParts_1.length === 0) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no rbl-source data", TraceVerbosity.Quiet);
                    }
                    else if (rblSourceParts_1.length === 1 || rblSourceParts_1.length === 3) {
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
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                    else if (rblSourceParts_1.length === 2) {
                        var row = that.getResultRow(rblSourceParts_1[0], rblSourceParts_1[1]);
                        if (row !== undefined) {
                            el.html(templateContent_1.format(row));
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                    else if (rblSourceParts_1.length === 3) {
                        var value = that.getResultValue(rblSourceParts_1[0], rblSourceParts_1[1], rblSourceParts_1[2]);
                        if (value !== undefined) {
                            el.html(templateContent_1.format({ "value": value }));
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }
                    }
                }
            });
        };
        RBLeUtilities.prototype.processVisibilities = function () {
            var _this = this;
            var that = this;
            var application = this.application;
            $("[rbl-display]", application.element).each(function () {
                var el = $(this);
                var rblDisplayParts = el.attr('rbl-display').split('.');
                var expressionParts = rblDisplayParts[rblDisplayParts.length - 1].split('=');
                rblDisplayParts[rblDisplayParts.length - 1] = expressionParts[0];
                var visibilityValue = that.getRblSelectorValue("ejs-output", rblDisplayParts);
                if (visibilityValue != undefined) {
                    if (expressionParts.length > 1) {
                        visibilityValue = (visibilityValue == expressionParts[1]) ? "1" : "0";
                    }
                    if (visibilityValue === "0" || visibilityValue.toLowerCase() === "false" || visibilityValue === "") {
                        el.hide();
                    }
                    else {
                        el.show();
                    }
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Diagnostic);
                }
            });
            var visibilityRows = this.getResultTable("ejs-visibility");
            visibilityRows.forEach(function (row) {
                var selector = _this.ui.getJQuerySelector(row["@id"]);
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
            var _this = this;
            var dataRows = this.getResultTable("ejs-rbl-data");
            var application = this.application;
            if (dataRows.length > 0) {
                var propertyNames_1 = Object.keys(dataRows[0]).filter(function (k) { return !k.startsWith("@"); });
                dataRows.forEach(function (row) {
                    var selector = _this.ui.getJQuerySelector(row["@id"]);
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
            var _this = this;
            var skipRows = this.getResultTable("skip-RBLe");
            var application = this.application;
            skipRows.forEach(function (row) {
                var _a;
                var selector = _this.ui.getJQuerySelector(row["key"] || row["@id"]);
                if (selector !== undefined) {
                    var el = $(selector, application.element);
                    el.addClass("skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");
                    (_a = _this.ui.getNoUiSlider(selector.substring(1), application.element)) === null || _a === void 0 ? void 0 : _a.off('set.RBLe');
                }
            });
        };
        RBLeUtilities.prototype.setDefaultValue = function (id, value) {
            var _this = this;
            var selector = this.ui.getJQuerySelector(id);
            if (selector !== undefined) {
                value = value !== null && value !== void 0 ? value : "";
                var input = $(selector, this.application.element).not("div");
                var isCheckboxList = input.hasClass("checkbox-list-horizontal");
                var aspCheckbox = this.ui.getAspNetCheckboxInput(input);
                var radioButton = input.find("input[value='" + value + "']");
                var noUiSlider_1 = this.ui.getNoUiSlider(id, this.application.element);
                if (noUiSlider_1 !== undefined) {
                    var sliderContainer = this.ui.getNoUiSliderContainer(id, this.application.element);
                    if (sliderContainer !== undefined) {
                        sliderContainer.data("setting-default", 1);
                    }
                    input.val(value);
                    noUiSlider_1.set(Number(value));
                    if (sliderContainer !== undefined) {
                        sliderContainer.removeData("setting-default");
                    }
                }
                else if (isCheckboxList) {
                    $("input", input).each(function (_index, element) {
                        var cb = _this.ui.getAspNetCheckboxInput($(element).parent());
                        if (cb !== undefined) {
                            cb.prop("checked", false);
                        }
                    });
                    var values = value.split(",");
                    for (var k = 0; k < values.length; k++) {
                        var checkKey = values[k].trim();
                        var checkbox = $("*[data-input-name='" + id + checkKey + "']", this.application.element);
                        var cb = this.ui.getAspNetCheckboxInput(checkbox);
                        if (cb !== undefined) {
                            cb.prop("checked", true);
                        }
                    }
                }
                else if (radioButton.length === 1) {
                    radioButton.prop("checked", true);
                }
                else if (aspCheckbox !== undefined) {
                    aspCheckbox.prop("checked", value === "1");
                }
                else {
                    input.val(value);
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
                var selector = _this.ui.getJQuerySelector(row["@id"]);
                if (selector !== undefined) {
                    var value = (_a = row.value) !== null && _a !== void 0 ? _a : "";
                    var input = $(selector + ", " + selector + " input", application.element);
                    var slider = _this.ui.getNoUiSliderContainer(row["@id"], application.element);
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
                nameClose: elementName.split(" ")[0]
            });
        };
        RBLeUtilities.prototype.getResultTableValue = function (row, columnName) {
            var _a, _b;
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
            $("[rbl-tid='result-table']", view).each(function (i, r) {
                var tableName = r.getAttribute("rbl-tablename");
                if (tableName !== null) {
                    var configRow = application.getResultTable("contents").filter(function (r) { return r.section === "1" && KatApp.stringCompare(r.type, "table", true) === 0 && r.item === tableName; }).shift();
                    var configCss = configRow === null || configRow === void 0 ? void 0 : configRow.class;
                    var tableCss = configCss === undefined
                        ? "table table-striped table-bordered table-condensed rbl " + tableName
                        : "rbl " + tableName + " " + configCss;
                    var tableRows = application.getResultTable(tableName);
                    if (tableRows.length === 0) {
                        return;
                    }
                    var tableConfigRow_1 = tableRows[0];
                    var includeAllColumns_1 = false;
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
                    var colGroupDef_1 = undefined;
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
                            needBootstrapWidthsOnEveryRow_1 = needBootstrapWidthsOnEveryRow_1 || i === 0;
                            var hClass = (columnConfiguration_1[headerSpanCellName].isTextColumn ? "text" : "value") + " span-" + headerSpanCellName;
                            rowHtml += that.getCellMarkup(row, headerSpanCellName, element, hClass, tableColumns_1.length);
                        }
                        else if (span !== "") {
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
                                    rowHtml += that.getCellMarkup(row, colSpanName, element, sClass, colSpan);
                                }
                            }
                        }
                        else {
                            tableColumns_1.forEach(function (c) {
                                var _a;
                                var cClass = (_a = c.cssClass) !== null && _a !== void 0 ? _a : "";
                                cClass += (c.isTextColumn ? " text" : " value");
                                rowHtml += that.getCellMarkup(row, c.name, element, cClass);
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
                summary.append("<br/><ul></ul>");
                ul = $("ul", summary);
            }
            var inputName = input !== undefined ? this.ui.getInputName(input) : "undefined";
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
            $("ul li.rble", summary).remove();
            if (errors.length > 0) {
                errors.forEach(function (r) {
                    var selector = _this.ui.getJQuerySelector(r["@id"]);
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
                summary.hide();
                $("div:first", summary).hide();
            }
        };
        RBLeUtilities.prototype.processValidations = function () {
            var _a;
            var view = this.application.element;
            var warnings = this.getResultTable("warnings");
            var errors = this.getResultTable("errors");
            var errorSummary = $(".ModelerValidationTable", view);
            var warningSummary = $(".ModelerWarnings", view);
            if (warnings.length > 0 && warningSummary.length === 0 && errorSummary.length > 0) {
                warningSummary = $("<div class=\"ModelerWarnings\"><div class=\"alert alert-warning\" role=\"alert\"><p><span class=\"glyphicon glyphicon glyphicon-warning-sign\" aria-hidden=\"true\"></span> <span class=\"sr-only\">Warnings</span> Please review the following warnings: </p></div></div>");
                $(warningSummary).insertBefore(errorSummary);
            }
            $('.validator-container.error:not(.server)', view).removeClass('error');
            $('.validator-container.warning:not(.server)', view).removeClass('warning');
            this.processValidationRows(warningSummary, warnings);
            this.processValidationRows(errorSummary, errors);
            if (((_a = this.application.calculationInputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
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
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider configuration can be found for " + r.getAttribute("data-inputname") + ".", TraceVerbosity.None);
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
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id + ".", TraceVerbosity.Minimal);
                }
                else {
                    var minValue = Number(config.min);
                    var maxValue = Number(config.max);
                    var input_1 = $("." + id, application.element);
                    var defaultConfigValue = _this.getResultValue("ejs-defaults", id, "value") ||
                        config.default ||
                        input_1.val() ||
                        config.min;
                    var stepValue = Number(config.step || "1");
                    var format_1 = config.format || "n";
                    var decimals_1 = Number(config.decimals || "0");
                    input_1.val(defaultConfigValue);
                    var slider = sliderJQuery[0];
                    sliderJQuery.data("min", minValue);
                    sliderJQuery.data("max", maxValue);
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
                        $(slider).data("setting-default", 1);
                        instance.updateOptions(sliderOptions, false);
                        $(slider).removeData("setting-default");
                    }
                    else {
                        instance = noUiSlider.create(slider, sliderOptions);
                        instance.on('update.RBLe', function () {
                            var value = Number(this.get());
                            input_1.val(value);
                            var v = format_1 == "p" ? value / 100 : value;
                            $("." + id + "Label, .sv" + id, application.element).html(String.localeFormat("{0:" + format_1 + decimals_1 + "}", v));
                        });
                        if (!input_1.is(".skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input")) {
                            if (targetInput_1 === undefined) {
                                instance.on('set.RBLe', function () {
                                    var settingDefault = $(this.target).data("setting-default") === 1;
                                    if (!settingDefault && application.options !== undefined) {
                                        application.calculate({ manualInputs: { iInputTrigger: id } });
                                    }
                                });
                            }
                            else {
                                instance.on('change.RBLe', function () {
                                    var value = Number(this.get());
                                    var targetSlider = $(".slider-" + targetInput_1, application.element);
                                    var targetSliderInstance = targetSlider.length === 1 ? targetSlider[0] : undefined;
                                    if ((targetSliderInstance === null || targetSliderInstance === void 0 ? void 0 : targetSliderInstance.noUiSlider) !== undefined) {
                                        targetSliderInstance.noUiSlider.set(value);
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
            var ui = this.ui;
            var configRows = this.getResultTable("ejs-listcontrol");
            configRows.forEach(function (row) {
                var _a;
                var tableName = row.table;
                var controlName = row["@id"];
                var listControl = $("." + controlName + ":not(div)", application.element);
                var isCheckboxList = $("." + controlName, application.element).hasClass("checkbox-list-horizontal");
                var isSelectPicker = !isCheckboxList && listControl.attr("data-kat-bootstrap-select-initialized") !== undefined;
                var selectPicker = isSelectPicker ? listControl : undefined;
                var currentValue = isCheckboxList
                    ? undefined
                    : (_a = selectPicker === null || selectPicker === void 0 ? void 0 : selectPicker.selectpicker('val')) !== null && _a !== void 0 ? _a : listControl.val();
                var listRows = _this.getResultTable(tableName);
                listRows.forEach(function (ls) {
                    var listItem = isCheckboxList
                        ? $(".v" + controlName + "_" + ls.key, application.element).parent()
                        : $("." + controlName + " option[value='" + ls.key + "']", application.element);
                    if (ls.visible === "0") {
                        listItem.hide();
                        if (!isCheckboxList) {
                            if (currentValue === ls.key) {
                                if (selectPicker !== undefined) {
                                    selectPicker.selectpicker("val", "");
                                }
                                else {
                                    listControl.val("");
                                }
                            }
                        }
                    }
                    else {
                        if (listItem.length !== 0) {
                            listItem.show();
                        }
                        else if (!isCheckboxList) {
                            listControl.append($("<option/>", {
                                value: ls.key,
                                text: ls.text
                            }));
                        }
                    }
                });
                if (selectPicker !== undefined) {
                    selectPicker.selectpicker('refresh');
                    listControl.not(skipBindingInputSelector).off(".RBLe").bind("change.RBLe", function () {
                        ui.changeRBLe($(this));
                    });
                }
            });
        };
        RBLeUtilities.prototype.processResults = function () {
            var _this = this;
            var application = this.application;
            var results = application.results;
            if (results !== undefined) {
                var calcEngineName = results["@calcEngine"];
                var version = results["@version"];
                application.trace("Processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal);
                var markUpRows = this.getResultTable("ejs-markup");
                markUpRows.forEach(function (r) { _this.createHtmlFromResultRow(r, false); });
                var outputRows = this.getResultTable("ejs-output");
                outputRows.forEach(function (r) { _this.createHtmlFromResultRow(r, true); });
                this.processRblSources();
                this.processRblValues();
                markUpRows.forEach(function (r) {
                    var _a;
                    if (r.selector !== undefined) {
                        if (r.addclass !== undefined && r.addclass.length > 0) {
                            var el = $(r.selector, application.element);
                            el.addClass(r.addclass);
                            if (r.addclass.indexOf("skipRBLe") > -1 || r.addclass.indexOf("rbl-nocalc") > -1) {
                                el.off(".RBLe");
                                $(":input", el).off(".RBLe");
                                (_a = _this.ui.getNoUiSlider(r.selector.substring(1), application.element)) === null || _a === void 0 ? void 0 : _a.off('set.RBLe');
                            }
                        }
                        if (r.removeclass !== undefined && r.removeclass.length > 0) {
                            $(r.selector, application.element).removeClass(r.addclass);
                        }
                    }
                });
                var templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory(this.application);
                templateBuilder.processUI();
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
    var HighchartsBuilder = (function () {
        function HighchartsBuilder(application) {
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
            return (_c = (_b = (_a = this.highchartsOverrides) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_e = (_d = this.highchartsOptions) === null || _d === void 0 ? void 0 : _d.filter(function (r) { return _this.stringCompare(r.key, configurationName, true) === 0; }).shift()) === null || _e === void 0 ? void 0 : _e.value;
        };
        HighchartsBuilder.prototype.ensureHighchartsCulture = function () {
            var _a;
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
                return function () { return eval(v_1); };
            }
            else if (value.startsWith("function ")) {
                var f_1 = this.removeRBLEncoding("function f() {value} f.call(this);".format({ value: value.substring(value.indexOf("{")) }));
                return function () { return eval(f_1); };
            }
            else
                return this.removeRBLEncoding(value);
        };
        HighchartsBuilder.prototype.setHighChartsOption = function (optionsContainer, name, value) {
            var optionJson = optionsContainer;
            var optionNames = name.split(".");
            var optionValue = this.getHighChartsOptionValue(value);
            for (var k = 0; k < optionNames.length; k++) {
                var optionName = optionNames[k];
                var optionIndex = -1;
                if (optionName.endsWith("]")) {
                    var nameParts = optionName.split("[");
                    optionName = nameParts[0];
                    optionIndex = parseInt(nameParts[1].substring(0, nameParts[1].length - 1));
                }
                var onPropertyValue = k === optionNames.length - 1;
                var newValue = onPropertyValue
                    ? optionValue
                    : {};
                if (optionJson[optionName] === undefined || onPropertyValue) {
                    optionJson[optionName] = optionIndex > -1 ? [] : newValue;
                }
                if (optionIndex > -1 && optionJson[optionName].length - 1 < optionIndex) {
                    optionJson[optionName].push(newValue);
                }
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
            var configFormat = chartConfigurationRows.filter(function (c) { return c.category === "config-format"; }).shift();
            var seriesFormats = seriesColumns
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
            if (this.highchartsData !== undefined && this.highchartsOptions !== undefined && this.highchartsOverrides !== undefined) {
                var overrideProperties = this.highchartsOverrides.filter(function (r) { return !r.key.startsWith("config-"); });
                this.highchartsOptions.concat(overrideProperties).forEach(function (optionRow) {
                    _this.setHighChartsOption(chartOptions, optionRow.key, optionRow.value);
                });
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
        HighchartsBuilder.prototype.getHighChartsSeriesDataRow = function (row, allColumnNames, seriesName, isXAxisChart) {
            var _this = this;
            var dataRow = { y: +row[seriesName], id: seriesName + "." + row.category };
            if (!isXAxisChart) {
                dataRow.name = row.category;
            }
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
            return el;
        };
        return HighchartsBuilder;
    }());
    $.fn.KatApp.highchartsBuilderFactory = function (application) {
        return new HighchartsBuilder(application);
    };
    var StandardTemplateBuilder = (function () {
        function StandardTemplateBuilder(application) {
            this.application = application;
        }
        StandardTemplateBuilder.prototype.buildCarousel = function (el) {
            var carouselName = el.attr("rbl-name");
            if (carouselName !== undefined && !carouselName.includes("{")) {
                this.application.trace("Processing carousel: " + carouselName, TraceVerbosity.Detailed);
                $(".carousel-inner .item, .carousel-indicators li", el).removeClass("active");
                $(".carousel-inner .item", el).first().addClass("active");
                $(".carousel-indicators li", el)
                    .attr("data-target", "#carousel-" + carouselName)
                    .first().addClass("active");
                var carousel = $('.carousel', el);
                carousel.carousel(0);
            }
            return el;
        };
        StandardTemplateBuilder.prototype.processCarousels = function () {
            var that = this;
            var view = this.application.element;
            $('.carousel-control-group:not([data-katapp-initialized="true"])', view).each(function () {
                var el = $(this);
                var carousel = $('.carousel', el);
                var carouselAll = $('.carousel-all', el);
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
                var checked = el.data("checked");
                var css = el.data("css");
                if (css !== undefined) {
                    $(".v" + id, el).addClass(css);
                }
                if (label !== undefined) {
                    $("span.l" + id + " label", el).html(label);
                }
                if (checked) {
                    $("span." + id + " input", el).prop("checked", true);
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildTextBoxes = function (view) {
            $('[rbl-tid="input-textbox"],[rbl-template-type="katapp-textbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b;
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
                var inputCss = el.data("inputcss");
                var labelCss = el.data("labelcss");
                var displayOnly = el.data("displayonly") === true;
                if (css !== undefined) {
                    $(".v" + id, el).addClass(css);
                }
                if (label !== undefined) {
                    $("span.l" + id, el).html(label);
                }
                if (labelCss !== undefined) {
                    $("span.l" + id, el).addClass(labelCss);
                }
                var input = $("input[name='" + id + "']", el);
                var displayOnlyLabel = $("div." + id + "DisplayOnly", el);
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
                    var rows = (_b = el.data("rows")) !== null && _b !== void 0 ? _b : "4";
                    input.replaceWith($('<textarea name="' + id + '" rows="' + rows + '" _id="' + id + '" class="form-control ' + id + '"></textarea>'));
                    input = $("textarea[name='" + id + "']", el);
                }
                if (!autoComplete || inputType === "password") {
                    input.attr("autocomplete", "off");
                }
                if (value !== undefined) {
                    input.val(value);
                }
                var validatorContainer = $(".validator-container", el);
                if (!displayOnly) {
                    displayOnlyLabel.remove();
                    if (inputType === "date") {
                        validatorContainer.addClass("input-group date");
                        validatorContainer.append($("<span class='input-group-addon'><i class='glyphicon glyphicon-calendar'></i></span>"));
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
                            zIndexOffset: 2000
                        })
                            .on("show", function () {
                            var dp = $(this);
                            if (dp.data("datepicker-show") != undefined) {
                                dp.datepicker('hide');
                            }
                            else {
                                dp.data("datepicker-show", true);
                                var dateInput_1 = $("input", $(this));
                                $(".datepicker-days .clear", view).bind("click", function () {
                                    dateInput_1.val("");
                                    dateInput_1.change();
                                });
                            }
                        })
                            .on("hide", function () {
                            var dp = $(this);
                            dp.removeData("datepicker-show");
                            $(".datepicker-days .clear", view).unbind("click");
                        })
                            .on('show.bs.modal', function (event) {
                            event.stopPropagation();
                        });
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
                            var dateInput = $(this);
                            dateInput.removeData("datepicker-paste");
                        });
                    }
                    else if (prefix !== undefined) {
                        validatorContainer.addClass("input-group");
                        validatorContainer.prepend($("<span class='input-group-addon input-group-text'>" + prefix + "</span>"));
                    }
                    else if (suffix !== undefined) {
                        validatorContainer.addClass("input-group");
                        validatorContainer.append($("<span class='input-group-addon input-group-text'>" + suffix + "</span>"));
                    }
                }
                else {
                    input.css("display", "none");
                    displayOnlyLabel.html(value);
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildDropdowns = function (view) {
            var dropdowns = $('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', view);
            var selectPickerAvailable = typeof $.fn.selectpicker === "function";
            if (!selectPickerAvailable && dropdowns.length > 0) {
                this.application.trace("bootstrap-select javascript is not present.", TraceVerbosity.None);
            }
            dropdowns.not('[data-katapp-initialized="true"]').each(function () {
                var _a, _b;
                var el = $(this);
                var id = el.data("inputname");
                var label = el.data("label");
                var multiSelect = el.data("multiselect");
                var liveSearch = (_a = el.data("livesearch")) !== null && _a !== void 0 ? _a : "true";
                var size = (_b = el.data("size")) !== null && _b !== void 0 ? _b : "15";
                var lookuptable = el.data("lookuptable");
                var css = el.data("css");
                if (css !== undefined) {
                    $(".v" + id, el).addClass(css);
                }
                if (label !== undefined) {
                    $("span.l" + id, el).html(label);
                }
                var input = $(".form-control", el);
                input.attr("data-size", size);
                if (multiSelect === "true") {
                    input.addClass("select-all");
                    input.attr("data-selected-text-format", "count > 2");
                }
                if (liveSearch === "true") {
                    input.attr("data-live-search", "true");
                }
                if (lookuptable !== undefined) {
                    var options = $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                        .map(function (index, ti) { return $("<option value='" + ti.getAttribute("key") + "'>" + ti.getAttribute("name") + "</option>"); });
                    options[0].attr("selected", "true");
                    options.each(function () {
                        input.append($(this));
                    });
                }
                if (selectPickerAvailable) {
                    $(".bootstrap-select", el).selectpicker();
                }
                $(".bootstrap-select", el)
                    .attr("data-kat-bootstrap-select-initialized", "true")
                    .next(".error-msg")
                    .addClass("selectpicker");
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.buildSliders = function (view) {
            $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', view).not('[data-katapp-initialized="true"]').each(function () {
                var el = $(this);
                var id = el.data("inputname");
                if (el.attr("data-katapp-initialized") !== "true") {
                    var label = el.data("label");
                    var css = el.data("css");
                    if (css !== undefined) {
                        $(".v" + id, el).addClass(css);
                    }
                    if (label !== undefined) {
                        $("span.l" + id, el).html(label);
                    }
                }
                el.attr("data-katapp-initialized", "true");
            });
        };
        StandardTemplateBuilder.prototype.processUI = function () {
            this.processInputs();
            this.processCarousels();
            this.processHelpTips();
        };
        StandardTemplateBuilder.prototype.processHelpTips = function () {
            var selector = "[data-toggle='tooltip'], [data-toggle='popover'], .tooltip-trigger, .tooltip-text-trigger, .error-trigger";
            var application = this.application;
            if (typeof $.fn.popover !== "function" && $(selector, application.element).length > 0) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present.", TraceVerbosity.None);
                return;
            }
            $(selector, application.element)
                .not(".rbl-help, [data-katapp-initialized='true']")
                .each(function () {
                var isErrorValidator = $(this).hasClass('error-msg');
                var placement = $(this).data('placement') || "top";
                var trigger = $(this).data('trigger') || "hover";
                var container = $(this).data('container') || "body";
                var options = {
                    html: true,
                    trigger: trigger,
                    container: container,
                    template: isErrorValidator
                        ? '<div class="tooltip error katapp-css" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
                        : '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
                    placement: function (tooltip, trigger) {
                        var dataClass = $(trigger).data('class');
                        if (dataClass != undefined) {
                            $(tooltip).addClass(dataClass);
                        }
                        dataClass = $(trigger).data('width');
                        if (dataClass != undefined) {
                            $(tooltip).add($(".tooltip-inner", tooltip))
                                .css("width", dataClass)
                                .css("max-width", dataClass);
                        }
                        return placement;
                    },
                    title: function () {
                        var titleSelector = $(this).data('content-selector');
                        return titleSelector != undefined
                            ? $(titleSelector + "Title").text()
                            : "";
                    },
                    content: function () {
                        var dataContent = $(this).data('content');
                        var dataContentSelector = $(this).data('content-selector');
                        var content = dataContent == undefined
                            ? dataContentSelector == undefined ? $(this).next().html() : $(dataContentSelector).html()
                            : dataContent;
                        var labelFix = $(this).data("label-fix");
                        if (labelFix != undefined) {
                            content = content.replace(/\{Label}/g, $("." + labelFix).html());
                        }
                        return content;
                    }
                };
                if (isErrorValidator) {
                    $(this).tooltip(options)
                        .on('inserted.bs.tooltip', function (e) {
                        var isWarning = $("label.warning", $(e.target)).length == 1;
                        if (isWarning) {
                            var templateId = "#" + $(e.target).attr("aria-describedby");
                            $(templateId, application.element).removeClass("error").addClass("warning");
                        }
                    });
                }
                else {
                    $(this).popover(options);
                }
            })
                .attr("data-katapp-initialized", "true");
            if (application.element.attr("data-katapp-initialized-tooltip") != "true") {
                var visiblePopover_1 = undefined;
                var hideVisiblePopover_1 = function () {
                    if (visiblePopover_1 === undefined || $(visiblePopover_1).data("bs.popover") === undefined)
                        return;
                    $(visiblePopover_1).data("bs.popover").inState.click = false;
                    $(visiblePopover_1).popover("hide");
                };
                application.element
                    .on("shown.bs.popover.RBLe", function (e) { visiblePopover_1 = e.target; })
                    .on("hide.bs.popover.RBLe", function () { visiblePopover_1 = undefined; })
                    .on("keyup.RBLe", function (e) {
                    if (e.keyCode != 27)
                        return;
                    hideVisiblePopover_1();
                    e.preventDefault();
                })
                    .on("click.RBLe", function (e) {
                    if ($(e.target).is(".popover-title, .popover-content"))
                        return;
                    hideVisiblePopover_1();
                })
                    .attr("data-katapp-initialized-tooltip", "true");
            }
        };
        StandardTemplateBuilder.prototype.processInputs = function () {
            var view = this.application.element;
            this.buildDropdowns(view);
            this.buildTextBoxes(view);
            this.buildCheckboxes(view);
            this.buildSliders(view);
        };
        return StandardTemplateBuilder;
    }());
    $.fn.KatApp.standardTemplateBuilderFactory = function (application) {
        return new StandardTemplateBuilder(application);
    };
    $.fn.KatApp.applicationFactory = function (id, element, options) {
        return new KatAppPlugIn(id, element, options);
    };
    String.prototype.ensureGlobalPrefix = function () {
        var id = this.toString();
        var idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    };
    String.prototype.format = function (json) {
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
    if ($.fn.KatApp.templatesUsedByAllApps == undefined) {
        $('<rbl-katapps>\
            <style>\
                rbl-katapps, rbl-templates, rbl-template { display: none; }\
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
    delete $.fn.KatApp.plugInShims;
})(jQuery, window, document);
//# sourceMappingURL=KatAppProvider.js.map