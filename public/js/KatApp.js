"use strict";
var pluginName = 'katapp';
// Static options available in js via
var KatApp = /** @class */ (function () {
    function KatApp() {
    }
    KatApp.getInputName = function (input) {
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
    KatApp.getInputValue = function (input) {
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
    // Default Options
    KatApp.defaultOptions = {
        inputSelector: "input",
        runConfigureUICalculation: true,
        onConfigureUICalculation: function () { },
        onCalculate: function () { },
        onCalculationErrors: function () { }
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
    return KatApp;
}());
var ApplicationShim = /** @class */ (function () {
    function ApplicationShim(application) {
        this.needsCalculation = false;
        this.application = application;
    }
    return ApplicationShim;
}());
var KatAppProviderShim = /** @class */ (function () {
    function KatAppProviderShim() {
        this.applications = [];
    }
    KatAppProviderShim.prototype.init = function (application) {
        if (this.applications.length === 0) {
            console.log("sleep...");
            setTimeout(function () {
                $.getScript("js/KatAppProvider.js", function () {
                    console.log("Get Script worked.");
                });
            }, 7000);
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
    KatAppProviderShim.prototype.updateOptions = function () {
        // Do nothing until real provider loads
    };
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
            this.id = id;
            this.options = KatApp.extend(/*true, */ {}, undefined, KatApp.defaultOptions, options);
            this.element = element;
            this.element.attr("rbl-application-id", id);
            this.element[0][pluginName] = this;
            this.provider = provider;
            this.provider.init(this);
        }
        KatAppPlugIn.prototype.calculate = function (options) {
            this.provider.calculate(this, options);
        };
        KatAppPlugIn.prototype.destroy = function () {
            this.provider.destroy(this);
            delete this.element[0][pluginName];
        };
        KatAppPlugIn.prototype.updateOptions = function (options) {
            this.options = KatApp.extend(/* true, */ this.options, options);
            this.provider.updateOptions(this);
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
            if (options == undefined && this.first()[0][pluginName] != null) {
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