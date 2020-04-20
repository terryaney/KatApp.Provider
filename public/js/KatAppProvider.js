"use strict";
// TODO
// - Should maybe have a configureUI method so I could 're-call' that for debug is only thing I see it helpful, if you want to toggle savece
//      - Added a configureUI method...do I need one in Provider?  Or can I just call Calculate with params?  Should it look at options?
// - How do I check/handle for errors when I try to load view
// - Do I want to call calculate in updateOptions?  They could bind and call if they need to I guess
$(function () {
    var invalidInputSelector = ":not(.notRBLe, .RBLe-input-table :input, .dropdown-toggle, button)";
    var skipBindingInputSelector = ":not(.notRBLe, .skipRBLe, .skipRBLe :input, .RBLe-input-table :input, .dropdown-toggle, button)";
    // All methods before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure)
    var getInputs = function (application) {
        var json = { inputs: {} };
        var inputs = json.inputs;
        // skip table inputs b/c those are custom, and .dropdown-toggle b/c bootstrap select
        // puts a 'button input' inside of select in there
        jQuery.each($(application.options.inputSelector + invalidInputSelector, application.element), function () {
            var input = $(this);
            // bootstrap selectpicker has some 'helper' inputs that I need to ignore
            if (input.parents(".bs-searchbox").length === 0) {
                var value = KatApp.getInputValue(input);
                if (value !== undefined) {
                    var name_1 = KatApp.getInputName(input);
                    inputs[name_1] = value;
                }
            }
        });
        return json;
    };
    var triggerEvent = function (application, eventName) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var _a;
        // DEBUG var id = application.element.attr("rbl-debug-id");
        // DEBUG $(".katappLog").append("<div><b style='color: Red;'>DEBUG: Application " + id + "</b>: Before handler:" + eventName + "</div>");
        (_a = application.options[eventName]) === null || _a === void 0 ? void 0 : _a.apply(application.element[0], args);
        // DEBUG $(".katappLog").append("<div><b style='color: Red;'>DEBUG: Application " + id + "</b>: Before trigger:" + eventName + ".RBLe</div>");
        application.element.trigger(eventName + ".RBLe", args);
        // DEBUG $(".katappLog").append("<div><b style='color: Red;'>DEBUG: Application " + id + "</b>: After trigger:" + eventName + ".RBLe</div>");
    };
    var bindEvents = function (application) {
        var that = this;
        if (application.options.inputSelector !== undefined) {
            // Store for later so I can unregister no matter what the selector is at time of 'destroy'
            application.element.data("rbl-inputSelector", application.options.inputSelector);
            $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {
                $(this).bind("change.RBLe", function () {
                    var wizardInputSelector = $(this).data("input");
                    if (wizardInputSelector == undefined) {
                        that.calculate(application, { inputs: { iInputTrigger: $(this).attr("id") } });
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
    var unbindEvents = function (application) {
        var inputSelector = application.element.data("rbl-inputSelector");
        if (inputSelector !== undefined) {
            $(inputSelector, application.element).off(".RBLe");
            application.element.removeData("rbl-inputSelector");
        }
    };
    var KatAppProvider = /** @class */ (function () {
        function KatAppProvider(applications) {
            var _this = this;
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
        KatAppProvider.prototype.init = function (application) {
            var _a;
            var that = this;
            // re-assign the provider to replace shim with actual implementation
            application.provider = this;
            application.element.attr("rbl-application-id", application.id);
            var initApp = function () {
                bindEvents.call(that, application);
                triggerEvent(application, "onInitialized", application);
                if (application.options.runConfigureUICalculation) {
                    var calculationOptions = {
                        inputs: { iConfigureUI: 1 }
                    };
                    this.calculate(application, calculationOptions);
                }
            };
            var viewId = application.element.attr("rbl-view");
            if (viewId != undefined) {
                var serviceUrl = (_a = application.options.serviceUrl) !== null && _a !== void 0 ? _a : KatApp.serviceUrl;
                var viewParts_1 = viewId.split(":");
                KatApp.getResource(serviceUrl, viewParts_1[0], viewParts_1[1], false, function (data) {
                    console.log(viewParts_1[1] + " loaded.");
                    if (data != undefined) {
                        application.element.append(data.replace("{katapp}", "[rbl-application-id='" + application.id + "']"));
                    }
                    initApp.apply(that);
                });
            }
            else {
                initApp.apply(this);
            }
        };
        KatAppProvider.prototype.destroy = function (application) {
            // Remove all event handlers
            application.element.removeAttr("rbl-application-id");
            $(application.element).off(".RBLe");
            unbindEvents.call(this, application);
            triggerEvent(application, "onDestroyed", application);
        };
        KatAppProvider.prototype.updateOptions = function (application, originalOptions) {
            unbindEvents.call(this, application);
            bindEvents.call(this, application);
            triggerEvent(application, "onOptionsUpdated", application);
        };
        KatAppProvider.prototype.calculate = function (application, options) {
            var _a;
            var calcOptions = options !== undefined
                ? KatApp.extend(/* true, */ {}, application.options, options)
                : application.options;
            KatApp.extend(calcOptions, getInputs(application));
            // Pretend to get calculation results
            var calculationResults = { "ceVersion": "1.0", "time": new Date().getTime() };
            application.calculationResults = calculationResults;
            if (((_a = calcOptions.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) === 1) {
                triggerEvent(application, "onConfigureUICalculation", calculationResults, calcOptions, application);
            }
            triggerEvent(application, "onCalculation", calculationResults, calcOptions, application);
        };
        return KatAppProvider;
    }());
    var providerShim = $.fn[pluginName].provider;
    $.fn[pluginName].provider = new KatAppProvider(providerShim.applications);
});
// Needed this line to make sure that I could debug in VS Code since this 
// was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js
//# sourceMappingURL=KatAppProvider.js.map