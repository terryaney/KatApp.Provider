"use strict";
$(function () {
    var invalidInputSelector = ":not(.notRBLe, .RBLe-input-table :input, .dropdown-toggle, button)";
    var skipBindingInputSelector = ":not(.notRBLe, .skipRBLe, .skipRBLe :input, .RBLe-input-table :input, .dropdown-toggle, button)";
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
            var that = this;
            // re-assign the provider to replace shim with actual implementation
            application.provider = this;
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
            application.element.append("<div>Application initialized.</div>");
            if (application.options.runConfigureUICalculation) {
                var calculationOptions = {
                    inputs: { iConfigureUI: 1 }
                };
                this.calculate(application, calculationOptions);
            }
        };
        KatAppProvider.prototype.destroy = function (application) {
            // Remove all event handlers
            application.element.append("<div>Application destroyed.</div>");
            $(application.element).off(".RBLe");
            $(application.options.inputSelector, application.element).off(".RBLe"); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        };
        KatAppProvider.prototype.updateOptions = function (application) {
            // Remove and re-add handlers?
            // Call calculate?
            application.element.append("<div>Application options updated.</div>");
        };
        KatAppProvider.prototype.calculate = function (application, options) {
            var _a, _b, _c, _d;
            var calcOptions = options !== undefined
                ? KatApp.extend(/* true, */ {}, application.options, options)
                : application.options;
            KatApp.extend(calcOptions, getInputs(application));
            // Pretend to get calculation results
            var calculationResults = { "ceVersion": "1.0", "time": new Date().getTime() };
            application.calculationResults = calculationResults;
            if ((_b = (_a = calcOptions.inputs) === null || _a === void 0 ? void 0 : _a.iConfigureUI) !== null && _b !== void 0 ? _b : false) {
                (_c = calcOptions.onConfigureUICalculation) === null || _c === void 0 ? void 0 : _c.call(application.element[0], calculationResults, calcOptions, application);
                application.element.trigger("onConfigureUICalculation.RBLe", [calculationResults, calcOptions, application]);
            }
            (_d = calcOptions.onCalculate) === null || _d === void 0 ? void 0 : _d.call(application.element[0], calculationResults, calcOptions, application);
            application.element.trigger("onCalculate.RBLe", [calculationResults, calcOptions, application]);
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