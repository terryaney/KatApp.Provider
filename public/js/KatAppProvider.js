"use strict";
// TODO
// - How do I check/handle for errors when I try to load view
// - Do I want to call calculate in updateOptions?  They could bind and call if they need to I guess
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?
// Discussions with Tom
// - Templates run every calc?  Will that goof up slider config?  Need to read code closer
//      - For example, arne't you hooking up events every time to carousel?  Since you aren't removing events?  WHere you said there were events hanging around?
//      - Seems like you need a way to only update the 'markup' of carousel vs rebuilding entire thing?  Otherwise, probably need/should hookup a 'calcstart event' in templates to remove event handlers
/*
    - Yours
        - Pro
            - Passed templated element in function call (don't have to .each() within template code)
        - Con
            - Diff/non-standard mechanism of registering functions.
            - If 4 distinct templates are loaded with one or more register control fucntions for two views on a page,
                every view calculation you'll loop all (4+) control functions and 'try' to run it

                Every time view1 triggers calc, will call all four functions below, but template 2 & 4 have namespace/selector
                conflict b/c both use same thing.

                view1
                    template1 - reg selector: [unique1]
                    teamplte2 - reg selector: [carousel]
                view2
                    template3 - reg selector: [unique2]
                    template4 - reg, selector: [carousel]

    - templateOn() way
        - Pro
            - 'looks' like jquery/bootstrap on() syntax, so less jarring hopefully
            - No duplicated code snippets for each view containing template
            - No namespace issue b/c ran once
            - Register an 'event' instead of a 'function' then don't have to make two calls like yours
        - Con
            - $.fn.KatApp.templateOn() - I'm familiar with using $.fn.* calls but not sure if just because of the libraries I currently use. To me more clear that you are just calling
                a global function vs $().RBL() ... which $() I haven't seen used before and confused me
            - Need to use {thisTemplate}, so code will always be $.fn.KatApp.templateOn("{thisTemplate}", "onCalculation.RBLe", function() { });
            - Still (by choice) making them do selector and foreach themselves, think it keeps code consistent (onCalculation this is 'always' app/view) but could change if required
*/
// - Show how bunch of errors are happening in boscomb (missing source elements)
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calcengine, -inputname, etc.
// - Downfall to our paradigm of CMS managing KatAppProvider code is never caches script and loads it each time?
// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Changed calcengine to calcengine in <rbl-config calcengine="Conduent_BiscombPOC_SE" templates="nonstandard_templates"></rbl-config> to match others
// 6. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
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
$(function () {
    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend({
        enableTrace: false,
        registerDataWithService: true,
        shareRegistrationData: true,
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
    // Template logic.. if no flag, get template, but then check flag again before inserting into DOM in case another processes loaded the template.
    var _templatesLoaded = {};
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
        KatApp.trace(undefined, "Template event(s) registered [" + events + "] for [" + templateName + "].");
    };
    var _sharedRegisteredToken = undefined;
    var _sharedData = undefined;
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
        RBLeUtilities.prototype.getData = function (application, currentOptions, next) {
            if (currentOptions.getData === undefined) {
                next("getData handler does not exist.");
                return;
            }
            currentOptions.getData(application, currentOptions, function (data) {
                application.options.data = currentOptions.data = data;
                application.options.registeredToken = currentOptions.registeredToken = undefined;
                next(undefined, data);
            }, function (_jqXHR, textStatus) {
                application.trace("getData AJAX Error Status: " + textStatus);
                next("getData AJAX Error Status: " + textStatus);
            });
        };
        RBLeUtilities.prototype.registerData = function (application, currentOptions, data, next) {
            var _a;
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
                    Registration: "[guid]",
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
                application.trace("registerData AJAX Error Status: " + textStatus);
                next("registerData AJAX Error Status: " + textStatus);
            };
            var registerDone = function (payload) {
                if (payload.payload !== undefined) {
                    payload = JSON.parse(payload.payload);
                }
                if (payload.Exception == undefined) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.RegisteredToken;
                    application.options.data = currentOptions.data = undefined;
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
                Inputs: application.inputs = KatApp.extend(ui.getInputs(application, currentOptions), currentOptions === null || currentOptions === void 0 ? void 0 : currentOptions.manualInputs),
                InputTables: ui.getInputTables(application),
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
                    application.trace("RBLe Service Result Exception: " + payload.Exception.Message);
                    next("RBLe Service Result Exception: " + payload.Exception.Message);
                }
            };
            var submitFailed = function (_jqXHR, textStatus) {
                application.trace("submitCalculation AJAX Error Status: " + textStatus);
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
                    application.trace("RBL ERROR: no data returned for rbl-value=" + el.attr('rbl-value'));
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
                        application.trace("RBL ERROR: Template content could not be found: [" + tid + "].");
                    }
                    else if (rblSourceParts_1 === undefined || rblSourceParts_1.length === 0) {
                        application.trace("RBL ERROR: no rbl-source data");
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
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }
                    }
                    else if (rblSourceParts_1.length === 2) {
                        var row = that.getResultRow(application, rblSourceParts_1[0], rblSourceParts_1[1]);
                        if (row !== undefined) {
                            el.html(templateContent_1.format(row));
                        }
                        else {
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }
                    }
                    else if (rblSourceParts_1.length === 3) {
                        var value = that.getResultValue(application, rblSourceParts_1[0], rblSourceParts_1[1], rblSourceParts_1[2]);
                        if (value !== undefined) {
                            el.html(templateContent_1.format({ "value": value }));
                        }
                        else {
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
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
                    application.trace("RBL ERROR: no data returned for rbl-display=" + el.attr('rbl-display'));
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
                application.trace("Processing results for " + calcEngineName + "(" + version + ").");
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
    var KatAppPlugIn = /** @class */ (function () {
        function KatAppPlugIn(id, element, options) {
            var _a, _b;
            this.id = id;
            // Transfer data attributes over if present...
            var attrResultTabs = element.attr("rbl-result-tabs");
            var attributeOptions = {
                calcEngine: (_a = element.attr("rbl-calcengine")) !== null && _a !== void 0 ? _a : KatApp.defaultOptions.calcEngine,
                inputTab: (_b = element.attr("rbl-input-tab")) !== null && _b !== void 0 ? _b : KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: element.attr("rbl-view"),
                viewTemplates: element.attr("rbl-view-templates")
            };
            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend({}, // make a clone (so we don't have all plugin targets using same reference)
            KatApp.defaultOptions, // start with default options
            attributeOptions, // data attribute options have next precedence
            options // finally js options override all
            );
            this.element = element;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[0].KatApp = this;
            this.init();
        }
        KatAppPlugIn.prototype.init = function () {
            this.element.attr("rbl-application-id", this.id);
            (function (that) {
                var _a, _b, _c;
                that.trace("Started init");
                var pipeline = [];
                var pipelineIndex = 0;
                var next = function (offest) {
                    pipelineIndex += offest;
                    if (pipelineIndex < pipeline.length) {
                        pipeline[pipelineIndex++]();
                    }
                };
                var pipelineError = undefined;
                var optionTemplates = (_a = that.options.viewTemplates) === null || _a === void 0 ? void 0 : _a.split(",").map(function (i) { return ensureGlobalPrefix(i); }).join(",");
                var resourcesToFetch = [optionTemplates, ensureGlobalPrefix(that.options.view)].filter(function (r) { return r !== undefined; }).join(",");
                var useTestView = (_c = (_b = that.options.useTestView) !== null && _b !== void 0 ? _b : KatApp.pageParameters["testview"] === "1") !== null && _c !== void 0 ? _c : false;
                var functionUrl = that.options.functionUrl;
                var viewId = ensureGlobalPrefix(that.options.view);
                var templatesFromRblConfig = undefined;
                // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                var requestedTemplates = optionTemplates != undefined
                    ? optionTemplates.split(",")
                    : [];
                // Build up the list of resources to get from KatApp Markup
                var resourceNames = resourcesToFetch.split(",").filter(function (r) { var _a; return !((_a = _templatesLoaded[r]) !== null && _a !== void 0 ? _a : false); });
                resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                var resourceData = undefined;
                pipeline.push(
                // Get View and Templates resources on KatApp
                function () {
                    if (resourcesToFetch !== "") {
                        KatApp.getResources(functionUrl, resourcesToFetch, useTestView, false, function (errorMessage, data) {
                            if (errorMessage === undefined && data !== undefined) {
                                resourceData = data;
                                that.trace(resourcesToFetch + " returned from CMS (" + functionUrl + ").");
                                next(0);
                            }
                            else {
                                pipelineError = errorMessage;
                                next(2); // jump to finish
                            }
                        });
                    }
                    else {
                        next(2); // jump to finish
                    }
                }, 
                // Inject the view and templates from resources
                function () {
                    resourceNames.forEach(function (r) {
                        var _a, _b, _c, _d;
                        var data = resourceData[r]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        if (r === viewId) {
                            // Process as view
                            var view = $("<div>" + data.replace(/{thisView}/g, "[rbl-application-id='" + that.id + "']") + "</div>");
                            var rblConfig = $("rbl-config", view).first();
                            if (rblConfig.length !== 1) {
                                that.trace("View " + viewId + " is missing rbl-config element.");
                            }
                            else {
                                that.options.calcEngine = (_a = that.options.calcEngine) !== null && _a !== void 0 ? _a : rblConfig.attr("calcengine");
                                templatesFromRblConfig = rblConfig.attr("templates");
                                that.options.inputTab = (_b = that.options.inputTab) !== null && _b !== void 0 ? _b : rblConfig.attr("input-tab");
                                var attrResultTabs = rblConfig.attr("result-tabs");
                                that.options.resultTabs = (_c = that.options.resultTabs) !== null && _c !== void 0 ? _c : (attrResultTabs != undefined ? attrResultTabs.split(",") : undefined);
                                that.element.html(view.html());
                            }
                        }
                        else if (!((_d = _templatesLoaded[r]) !== null && _d !== void 0 ? _d : false)) {
                            _templatesLoaded[r] = true;
                            // TOM: create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                            // and this attribute used for checking(?)
                            // Remove extension if there is one, could be a problem if you do Standard.Templates, trying to get
                            // Standard.Templates.html.
                            var resourceParts = r.split(":");
                            var tId = (resourceParts.length > 1 ? resourceParts[1] : resourceParts[0]).replace(/\.[^/.]+$/, "");
                            var t = $("<rbl-templates style='display:none;' rbl-t='" + tId + "'>" + data.replace(/{thisTemplate}/g, r) + "</rbl-templates>");
                            t.appendTo("body");
                            that.trace("Loaded template [" + r + "] for [" + viewId + "].");
                        }
                    });
                    next(0);
                }, 
                // Get Templates configured on <rbl-config/>
                function () {
                    // Now build up a list of templates that were specified inside the view markup
                    if (templatesFromRblConfig != undefined) {
                        // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                        requestedTemplates = requestedTemplates.concat(templatesFromRblConfig.split(",").map(function (i) { return ensureGlobalPrefix(i); })); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        resourceNames = templatesFromRblConfig.split(",").filter(function (r) { var _a; return !((_a = _templatesLoaded[r]) !== null && _a !== void 0 ? _a : false); }).map(function (i) { return ensureGlobalPrefix(i); }); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                        templatesFromRblConfig = undefined; // clear out so that we don't process this again
                        if (resourcesToFetch !== "") {
                            var currentTemplates = optionTemplates !== undefined ? optionTemplates + "," : "";
                            that.options.viewTemplates = currentTemplates + resourcesToFetch;
                            next(-3); // Go to start now that I've reset resources to fetch
                        }
                        else {
                            next(0); // no *new* resources to load
                        }
                    }
                    else {
                        next(0); // no viewTemplates specified
                    }
                }, 
                // Final processing (hook up template events and process templates that don't need RBL)
                function () {
                    if (pipelineError === undefined) {
                        // Now, for every unique template reqeusted by client, if the template had <script rbl-script="view"/> 
                        // associated with it, I can inject that view specific code (i.e. event handlers) for the currently
                        // processing application
                        requestedTemplates
                            .filter(function (v, i, a) { return v !== undefined && v.length != 0 && a.indexOf(v) === i; }) // unique
                            .forEach(function (t) {
                            // Loop every template event handler that was called when template loaded
                            // and register a handler to call the delegate
                            _templateDelegates
                                .filter(function (d) { return d.Template.toLowerCase() == t.toLowerCase(); })
                                .forEach(function (d) {
                                that.element.on(d.Events, function () {
                                    var args = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        args[_i] = arguments[_i];
                                    }
                                    d.Delegate.apply(this, args);
                                });
                            });
                        });
                        // Build up template content that DOES NOT use rbl results, but instead just 
                        // uses data-* to create a dataobject generally used to create controls like sliders.                    
                        $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                            var templateId = $(this).attr('rbl-tid');
                            if (templateId !== undefined && templateId !== "inline") {
                                //Replace content with template processing, using data-* items in this pass
                                $(this).html(rble.processTemplate(that, templateId, $(this).data()));
                            }
                        });
                        ui.bindEvents(that);
                        ui.triggerEvent(that, "onInitialized", that);
                        if (that.options.runConfigureUICalculation) {
                            var customOptions = {
                                manualInputs: { iConfigureUI: 1 }
                            };
                            that.calculate(customOptions);
                        }
                    }
                    else {
                        that.trace("Error during Provider.init: " + pipelineError);
                    }
                    that.trace("Finished init");
                });
                // Start the pipeline
                next(0);
            })(this);
        };
        KatAppPlugIn.prototype.calculate = function (customOptions) {
            var _a;
            var shareRegistrationData = (_a = this.options.shareRegistrationData) !== null && _a !== void 0 ? _a : false;
            if (shareRegistrationData) {
                this.options.registeredToken = _sharedRegisteredToken;
                this.options.data = _sharedData;
            }
            ui.triggerEvent(this, "onCalculateStart", this);
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
                var pipelineError = undefined;
                var registrationData = undefined;
                pipeline.push(
                // Attempt First Submit
                function () {
                    rble.submitCalculation(that, currentOptions, 
                    // If failed, let it do next job (getData), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        next(errorMessage !== undefined ? 0 : 3);
                    });
                }, 
                // Get Registration Data
                function () {
                    rble.getData(that, currentOptions, 
                    // If failed, then I am unable to register data, so just jump to finish, otherwise continue to registerData
                    function (errorMessage, data) {
                        pipelineError = errorMessage;
                        registrationData = data;
                        if (errorMessage !== undefined) {
                            next(2); // If error, jump to finish
                        }
                        else if (!that.options.registerDataWithService) {
                            if (shareRegistrationData) {
                                _sharedRegisteredToken = undefined;
                                _sharedData = registrationData;
                            }
                            next(1); // If not registering data, jump to submit
                        }
                        else {
                            next(0); // Continue to register data
                        }
                    });
                }, 
                // Register Data
                function () {
                    rble.registerData(that, currentOptions, registrationData, 
                    // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        if (errorMessage === undefined && shareRegistrationData) {
                            _sharedRegisteredToken = that.options.registeredToken;
                            _sharedData = undefined;
                        }
                        // If error, jump to finish
                        next(errorMessage !== undefined ? 1 : 0);
                    });
                }, 
                // Submit Again (if needed)
                function () {
                    rble.submitCalculation(that, currentOptions, 
                    // If failed, let it do next job (getData), otherwise, jump to finish
                    function (errorMessage) {
                        pipelineError = errorMessage;
                        next(0);
                    });
                }, 
                // Finish
                function () {
                    var _a;
                    if (pipelineError === undefined) {
                        rble.processResults(that);
                        if (((_a = that.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                            ui.triggerEvent(that, "onConfigureUICalculation", that.results, currentOptions, that);
                        }
                        ui.triggerEvent(that, "onCalculation", that.results, currentOptions, that);
                        that.element.removeData("katapp-save-calcengine");
                        that.element.removeData("katapp-trace-calcengine");
                        that.element.removeData("katapp-refresh-calcengine");
                    }
                    else {
                        rble.setResults(that, undefined);
                        // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                        ui.triggerEvent(that, "onCalculationError", "RunCalculation", currentOptions, that);
                    }
                    ui.triggerEvent(that, "onCalculateEnd", that);
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
            ui.unbindEvents(this);
            ui.triggerEvent(this, "onDestroyed", this);
            delete this.element[0].KatApp;
        };
        KatAppPlugIn.prototype.updateOptions = function () {
            ui.unbindEvents(this);
            ui.bindEvents(this);
            ui.triggerEvent(this, "onOptionsUpdated", this);
        };
        KatAppPlugIn.prototype.getResultTable = function (tableName) {
            return rble.getResultTable(this, tableName);
        };
        KatAppPlugIn.prototype.getResultRow = function (table, id, columnToSearch) {
            return rble.getResultRow(this, table, id, columnToSearch);
        };
        KatAppPlugIn.prototype.getResultValue = function (table, id, column, defautlValue) {
            return rble.getResultValue(this, table, id, column, defautlValue);
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
        KatAppPlugIn.prototype.trace = function (message) {
            KatApp.trace(this, message);
        };
        return KatAppPlugIn;
    }());
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
    // Replace the applicationFactory to create real KatAppPlugIn implementations
    $.fn.KatApp.applicationFactory = function (id, element, options) {
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