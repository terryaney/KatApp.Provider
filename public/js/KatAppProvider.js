"use strict";
// TODO
// - Clean up init pipelines so that the 'adding' of the script is done in sep function()
// - How do I check/handle for errors when I try to load view
// - Do I want to call calculate in updateOptions?  They could bind and call if they need to I guess
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calc-engine tag on each input?
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
$(function () {
    var tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    var validInputSelector = ":not(.notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons + ")";
    var skipBindingInputSelector = ":not(.notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input" + tableInputsAndBootstrapButtons + ")";
    // All methods/classes before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure).  Could make another utility
    // class like I did in original service or KATApp beta, but wanted methods unreachable from javascript
    // outside my framework.  See if there is a way to pull that off and move these methods somewhere that
    // doesn't clutter up code flow here
    var UIUtilities = /** @class */ (function () {
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
        UIUtilities.prototype.bindEvents = function (provider, application) {
            if (application.options.inputSelector !== undefined) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {
                    $(this).bind("change.RBLe", function () {
                        var wizardInputSelector = $(this).data("input");
                        if (wizardInputSelector == undefined) {
                            provider.calculate(application, { manualInputs: { iInputTrigger: $(this).attr("id") } });
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
    var ui = new UIUtilities();
    var RBLeUtilities = /** @class */ (function () {
        function RBLeUtilities() {
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
        RBLeUtilities.prototype.getRegistrationData = function (application, currentOptions, next) {
            if (currentOptions.getRegistrationData === undefined) {
                next("getRegistrationData handler does not exist.");
                return;
            }
            currentOptions.getRegistrationData(application, currentOptions, function (data) { next(undefined, data); }, function (_jqXHR, textStatus) {
                application.trace("getRegistrationData AJAX Error Status: " + textStatus);
                next("getRegistrationData AJAX Error Status: " + textStatus);
            });
        };
        RBLeUtilities.prototype.registerData = function (application, currentOptions, data, next) {
            var _a;
            var register = (_a = currentOptions.registerData) !== null && _a !== void 0 ? _a : function (_app, _o, done, fail) {
                var _a, _b;
                var traceCalcEngine = application.element.data("katapp-trace-calc-engine") === "1";
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
                    Registration: "[guid]",
                    TransactionPackage: JSON.stringify(calculationOptions)
                };
                var jsonParams = {
                    url: KatApp.corsProxyUrl,
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
                application.trace("registerData AJAX Error Status: " + textStatus);
                next("registerData AJAX Error Status: " + textStatus);
            };
            var registerDone = function (payload) {
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception == undefined) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.RegisteredToken;
                    ui.triggerEvent(application, "onRegistration", currentOptions, application);
                    next();
                }
                else {
                    application.trace("registerData Error Status: " + payload.Exception.Message);
                    next("RBLe Register Data Error: " + payload.Exception.Message);
                }
            };
            register(application, currentOptions, registerDone, registerFailed);
        };
        RBLeUtilities.prototype.submitCalculation = function (application, currentOptions, next) {
            var _a, _b;
            if (currentOptions.registeredToken === undefined) {
                next("submitCalculation no registered token.");
                return;
            }
            var that = this;
            var saveCalcEngineLocation = application.element.data("katapp-save-calc-engine");
            var traceCalcEngine = application.element.data("katapp-trace-calc-engine") === "1";
            var refreshCalcEngine = application.element.data("katapp-refresh-calc-engine") === "1";
            // TODO: COnfirm all these options are right
            var calculationOptions = {
                Inputs: application.inputs = KatApp.extend(ui.getInputs(application, currentOptions), currentOptions === null || currentOptions === void 0 ? void 0 : currentOptions.manualInputs),
                InputTables: ui.getInputTables(application),
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: currentOptions.registeredToken,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab,
                    ResultTabs: currentOptions.resultTabs,
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ((_a = currentOptions.refreshCalcEngine) !== null && _a !== void 0 ? _a : false),
                    PreCalcs: undefined // TODO: search service for update-tp, need to get that logic in there
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
                    application.trace("RBLe Service Result Exception: " + payload.Exception.Message);
                    next("RBLe Service Result Exception: " + payload.Exception.Message);
                }
            };
            var submitFailed = function (_jqXHR, textStatus) {
                application.trace("submitCalculation AJAX Error Status: " + textStatus);
                next("submitCalculation AJAX Error Status: " + textStatus);
            };
            var submit = (_b = currentOptions === null || currentOptions === void 0 ? void 0 : currentOptions.submitCalculation) !== null && _b !== void 0 ? _b : function (_app, o, done, fail) {
                $.ajax({
                    url: KatApp.corsProxyUrl,
                    data: JSON.stringify(o),
                    method: "POST",
                    dataType: "json",
                    headers: { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                })
                    .done(done)
                    .fail(fail);
            };
            submit(application, calculationOptions, submitDone, submitFailed);
        };
        RBLeUtilities.prototype.getResultRow = function (application, table, key, columnToSearch) {
            var rows = this[table];
            if (rows === undefined)
                return undefined;
            var rowLookups = application.resultRowLookups;
            if (rowLookups === undefined) {
                application.resultRowLookups = rowLookups = [];
            }
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
            var row = this.getResultRow(application, table, key);
            if (row === undefined)
                return defaultValue;
            var col = row[column];
            if (col === undefined)
                return defaultValue;
            return col;
        };
        RBLeUtilities.prototype.getTable = function (application, tableName) {
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
                application.trace("Invalid template id: " + templateId);
                return "";
            }
            else {
                return template.html().format(data);
            }
        };
        RBLeUtilities.prototype.createHtmlFromResultRow = function (application, resultRow) {
            var _a, _b, _c, _d;
            var view = application.element;
            var content = (_c = (_b = (_a = resultRow.content) !== null && _a !== void 0 ? _a : resultRow.html) !== null && _b !== void 0 ? _b : resultRow.value) !== null && _c !== void 0 ? _c : "";
            var selector = (_d = resultRow.selector) !== null && _d !== void 0 ? _d : resultRow['@id'] + "";
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
                application.trace("Processing results for " + calcEngineName + "(" + version + ").");
                var markUpRows = this.getTable(application, "ejs-markup");
                markUpRows.forEach(function (r) { _this.createHtmlFromResultRow(application, r); });
                var outputRows = this.getTable(application, "ejs-output");
                outputRows.forEach(function (r) { _this.createHtmlFromResultRow(application, r); });
                application.trace("Finished processing results for " + calcEngineName + "(" + version + ").");
                return true;
            }
            else {
                application.trace("Results not available.");
                return false;
            }
        };
        return RBLeUtilities;
    }());
    var rble = new RBLeUtilities();
    var KatAppProvider = /** @class */ (function () {
        function KatAppProvider(applications) {
            var _this = this;
            // Template logic.. if no flag, get template, but then check flag again before inserting into DOM in case another processes loaded the template.
            this._templatesLoaded = {};
            this._templateClientScripts = {};
            applications.forEach(function (a) {
                _this.init(a.application);
                // a.needsCalculation is set if they explicitly call calculate(), but on this
                // initial transfer from Shim to real Provider, we don't want to double call
                // calculate if the options already has callCalculateOnInit because the call
                // above to init() will call calculate.
                if (a.needsCalculation && !a.application.options.runConfigureUICalculation) {
                    _this.calculate(a.application, a.calculateOptions);
                }
            });
        }
        KatAppProvider.prototype.getResultRow = function (application, table, id, columnToSearch) {
            return rble.getResultRow(application, table, id, columnToSearch);
        };
        KatAppProvider.prototype.getResultValue = function (application, table, id, column, defautlValue) {
            return rble.getResultValue(application, table, id, column, defautlValue);
        };
        KatAppProvider.prototype.init = function (application) {
            // re-assign the provider to replace shim with actual implementation
            application.provider = this;
            application.element.attr("rbl-application-id", application.id);
            var that = this;
            (function () {
                var _a, _b, _c;
                var pipeline = [];
                var pipelineIndex = 0;
                var next = function (offest) {
                    pipelineIndex += offest;
                    if (pipelineIndex < pipeline.length) {
                        pipeline[pipelineIndex++]();
                    }
                };
                var pipelineError = undefined;
                var resourcesToFetch = [application.options.viewTemplates, application.options.view].filter(function (r) { return r !== undefined; }).join(",");
                var useTestView = (_b = (_a = application.options.useTestView) !== null && _a !== void 0 ? _a : KatApp.pageParameters["testview"] === "1") !== null && _b !== void 0 ? _b : false;
                var serviceUrl = (_c = application.options.serviceUrl) !== null && _c !== void 0 ? _c : KatApp.serviceUrl;
                var viewId = application.options.view;
                var viewTemplates = undefined;
                // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                var requestedTemplates = application.options.viewTemplates != undefined
                    ? application.options.viewTemplates.split(",")
                    : [];
                // Build up the list of resources to get from KatApp Markup
                var resourceNames = resourcesToFetch.split(",").filter(function (r) { var _a; return !((_a = that._templatesLoaded[r]) !== null && _a !== void 0 ? _a : false); });
                resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                pipeline.push(
                // Get View and Templates configured on KatApp
                function () {
                    if (resourcesToFetch !== "") {
                        KatApp.getResources(serviceUrl, resourcesToFetch, useTestView, false, function (errorMessage, data) {
                            var resourceData = data;
                            if (errorMessage === undefined && resourceData !== undefined) {
                                application.trace(resourcesToFetch + " returned from CMS.");
                                resourceNames.forEach(function (r) {
                                    var _a, _b, _c, _d;
                                    var data = resourceData[r];
                                    if (r === viewId) {
                                        // Process as view
                                        var view = $("<div>" + data.replace("{thisview}", "[rbl-application-id='" + application.id + "']") + "</div>");
                                        var rblConfig = $("rbl-config", view).first();
                                        if (rblConfig.length !== 1) {
                                            application.trace("View " + viewId + " is missing rbl-config element.");
                                        }
                                        else {
                                            application.options.calcEngine = (_a = application.options.calcEngine) !== null && _a !== void 0 ? _a : rblConfig.attr("calc-engine");
                                            viewTemplates = rblConfig.attr("templates");
                                            application.options.inputTab = (_b = application.options.inputTab) !== null && _b !== void 0 ? _b : rblConfig.attr("input-tab");
                                            var attrResultTabs = rblConfig.attr("result-tabs");
                                            application.options.resultTabs = (_c = application.options.resultTabs) !== null && _c !== void 0 ? _c : (attrResultTabs != undefined ? attrResultTabs.split(",") : undefined);
                                            application.element.append(view.html());
                                        }
                                    }
                                    else if (!((_d = that._templatesLoaded[r]) !== null && _d !== void 0 ? _d : false)) {
                                        that._templatesLoaded[r] = true;
                                        // TOM: create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                                        // and this attribute used for checking(?)
                                        // Remove extension if there is one, could be a problem if you do Standard.Templates, trying to get
                                        // Standard.Templates.html.
                                        var resourceParts = r.split(":");
                                        var tId = (resourceParts.length > 1 ? resourceParts[1] : resourceParts[0]).replace(/\.[^/.]+$/, "");
                                        var t = $("<rbl-templates style='display:none;' rbl-t='" + tId + "'>" + data + "</rbl-templates>");
                                        var viewScript = $("script[rbl-script='view']", t);
                                        if (viewScript.length === 1) {
                                            that._templateClientScripts[r] = viewScript[0].outerHTML;
                                            viewScript.remove();
                                        }
                                        t.appendTo("body");
                                        application.trace("Loaded template [" + r + "] for [" + viewId + "].");
                                    }
                                });
                            }
                            else {
                                pipelineError = errorMessage;
                            }
                            // Now build up a list of templates that were specified inside the view markup
                            if (viewTemplates != undefined) {
                                // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                                requestedTemplates.concat(viewTemplates.split(","));
                                resourceNames = viewTemplates.split(",").filter(function (r) { var _a; return !((_a = that._templatesLoaded[r]) !== null && _a !== void 0 ? _a : false); });
                                resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                                if (resourcesToFetch !== "") {
                                    var currentTemplates = application.options.viewTemplates !== undefined ? application.options.viewTemplates + "," : "";
                                    application.options.viewTemplates = currentTemplates + resourcesToFetch;
                                    next(-1); // Do this step over again to load new resources
                                }
                                else {
                                    next(0); // move on to next if no new resources to load
                                }
                            }
                            else {
                                next(0); // move on to next if no viewTemplates specified
                            }
                        });
                    }
                    else {
                        next(0); // move on to next if no view/viewTemplates specified on KatApp
                    }
                }, 
                // Final processing
                function () {
                    if (pipelineError === undefined) {
                        // Now, for every unique template reqeusted by client, if the template had <script rbl-script="view"/> 
                        // associated with it, I can inject that view specific code (i.e. event handlers) for the currently
                        // processing application
                        requestedTemplates
                            .filter(function (v, i, a) { return v !== undefined && v.length != 0 && a.indexOf(v) === i && that._templateClientScripts[v] !== undefined; }) // unique
                            .forEach(function (t) {
                            var data = that._templateClientScripts[t];
                            var script = $(data.replace("{thisview}", "[rbl-application-id='" + application.id + "']"));
                            script.appendTo("body");
                        });
                        // Build up template content that DOES NOT use rbl results, but instead just 
                        // uses data-* to create a dataobject generally used to create controls like sliders.                    
                        $("[rbl-tid]:not([rbl-source])", application.element).each(function () {
                            var templateId = $(this).attr('rbl-tid');
                            if (templateId !== undefined) {
                                //Replace content with template processing, using data-* items in this pass
                                $(this).html(rble.processTemplate(application, templateId, $(this).data()));
                            }
                        });
                        ui.bindEvents(that, application);
                        ui.triggerEvent(application, "onInitialized", application);
                        if (application.options.runConfigureUICalculation) {
                            var customOptions = {
                                manualInputs: { iConfigureUI: 1 }
                            };
                            that.calculate(application, customOptions);
                        }
                    }
                    else {
                        application.trace("Error during Provider.init: " + pipelineError);
                    }
                });
                // Start the pipeline
                next(0);
            })();
        };
        KatAppProvider.prototype.calculate = function (application, customOptions) {
            var _a;
            var shareRegisterToken = (_a = application.options.shareRegisterToken) !== null && _a !== void 0 ? _a : false;
            if (shareRegisterToken) {
                application.options.registeredToken = this._sharedRegisteredToken;
            }
            // Build up complete set of options to use for this calculation call
            var currentOptions = KatApp.extend({}, // make a clone of the options
            application.options, // original options
            customOptions);
            ui.triggerEvent(application, "onCalculateStart", application);
            var that = this;
            (function () {
                var pipeline = [];
                var pipelineIndex = 0;
                var next = function (offset) {
                    pipelineIndex += offset;
                    if (pipelineIndex < pipeline.length) {
                        pipeline[pipelineIndex++]();
                    }
                };
                var pipelineError = undefined;
                var registrationData = undefined;
                pipeline.push(
                // Attempt First Submit
                function () {
                    rble.submitCalculation(application, currentOptions, 
                    // If failed, let it do next job (getRegistrationData), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        next(errorMessage !== undefined ? 0 : 3);
                    });
                }, 
                // Get Registration Data
                function () {
                    rble.getRegistrationData(application, currentOptions, 
                    // If failed, then I am unable to register data, so just jump to finish, otherwise continue to registerData
                    function (errorMessage, data) {
                        pipelineError = errorMessage;
                        registrationData = data;
                        next(errorMessage !== undefined ? 2 : 0);
                    });
                }, 
                // Register Data
                function () {
                    rble.registerData(application, currentOptions, registrationData, 
                    // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        if (errorMessage === undefined && shareRegisterToken) {
                            that._sharedRegisteredToken = application.options.registeredToken;
                        }
                        next(errorMessage !== undefined ? 1 : 0);
                    });
                }, 
                // Submit Again (if needed)
                function () {
                    rble.submitCalculation(application, currentOptions, 
                    // If failed, let it do next job (getRegistrationData), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        next(0);
                    });
                }, 
                // Finish
                function () {
                    var _a;
                    if (pipelineError === undefined) {
                        rble.processResults(application);
                        if (((_a = application.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                            ui.triggerEvent(application, "onConfigureUICalculation", application.results, currentOptions, application);
                        }
                        ui.triggerEvent(application, "onCalculation", application.results, currentOptions, application);
                        application.element.removeData("katapp-save-calc-engine");
                        application.element.removeData("katapp-trace-calc-engine");
                        application.element.removeData("katapp-refresh-calc-engine");
                    }
                    else {
                        rble.setResults(application, undefined);
                        // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                        ui.triggerEvent(application, "onCalculationError", "RunCalculation", currentOptions, application);
                    }
                    ui.triggerEvent(application, "onCalculateEnd", application);
                });
                // Start the pipeline
                next(0);
            })();
        };
        KatAppProvider.prototype.destroy = function (application) {
            application.element.removeAttr("rbl-application-id");
            $(application.element).off(".RBLe");
            ui.unbindEvents(application);
            ui.triggerEvent(application, "onDestroyed", application);
        };
        KatAppProvider.prototype.updateOptions = function (application) {
            ui.unbindEvents(application);
            ui.bindEvents(this, application);
            ui.triggerEvent(application, "onOptionsUpdated", application);
        };
        KatAppProvider.prototype.saveCalcEngine = function (application, location) {
            // Save next calculation to location
            application.element.data("katapp-save-calc-engine", location);
        };
        KatAppProvider.prototype.refreshCalcEngine = function (application) {
            // Trace CalcEngine on next calculation
            application.element.data("katapp-refresh-calc-engine", "1");
        };
        KatAppProvider.prototype.traceCalcEngine = function (application) {
            // Trace CalcEngine on next calculation
            application.element.data("katapp-trace-calc-engine", "1");
        };
        return KatAppProvider;
    }());
    var providerShim = $.fn[pluginName].provider;
    $.fn[pluginName].provider = new KatAppProvider(providerShim.applications);
});
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js
//# sourceMappingURL=KatAppProvider.js.map