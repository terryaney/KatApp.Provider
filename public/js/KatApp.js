"use strict";
var pluginName = 'KatApp';
// Static Methods
var KatApp = /** @class */ (function () {
    function KatApp() {
    }
    // Default Options
    KatApp.defaultOptions = {
        color: '#F00',
        backgroundColor: '#00F',
        skipConfigureUI: false,
        onProcessResults: function () { },
        onProcessErrors: function () { }
    };
    return KatApp;
}());
(function ($, window, document, undefined) {
    var PlugIn = /** @class */ (function () {
        function PlugIn(id, element, options) {
            this.id = id;
            this._options = $.extend(KatApp.defaultOptions, options);
            this.element = element;
            this.element.attr("rbl-application-id", id);
            this.container = element[0];
            this.container[pluginName] = this;
            this.calculate();
        }
        PlugIn.prototype.calculate = function () {
            // this._options.onProcessResults?.call(this);
        };
        PlugIn.prototype.destroy = function () {
            delete this.container[pluginName];
            // this.element.removeData();
        };
        PlugIn.prototype.updateOptions = function (options) {
            this._options = $.extend(this._options, options);
        };
        PlugIn.prototype.options = function () {
            return this._options;
        };
        return PlugIn;
    }());
    // Private method not accessible outside plug in, need to call via privateMethod.apply(this);
    var privateMethod = function () {
        this.element
            .css('color', this._options.color)
            .css('background-color', this._options.backgroundColor);
    };
    // Allowed 'property get' statements
    var getters = ['options'];
    $.fn[pluginName] = function (options) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (options === undefined || typeof options === 'object') {
            // Creates a new plugin instance, for each selected element, and
            // stores a reference withint the element's data
            return this.each(function () {
                if (!this[pluginName]) {
                    // https://stackoverflow.com/a/2117523
                    var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                    var provider = $.fn[pluginName].provider;
                    var applications = $.fn[pluginName].applications;
                    if (!provider && applications.size === 0) {
                        $.getScript("js/KatAppProvider.js", function (_data) {
                            console.log("Get Script worked.");
                        });
                    }
                    var plugIn = new PlugIn(id, $(this), options);
                    if (!provider) {
                        applications.set(plugIn.id, plugIn);
                    }
                    else {
                        provider.addApplication(plugIn);
                    }
                }
            });
        }
        else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            // Call a public pluguin method (not starting with an underscore) for each 
            // selected element.
            if (args.length == 0 && $.inArray(options, getters) != -1) {
                // If the user does not pass any arguments and the method allows to
                // work as a getter then break the chainability so we can return a value
                // instead the element reference.  this[0] should be the only item in selector and grab getter from it.
                var instance = this[0][pluginName];
                return instance[options].apply(instance, args);
            }
            else {
                // Invoke the speficied method on each selected element
                return this.each(function () {
                    var instance = this[pluginName];
                    if (instance instanceof PlugIn && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args);
                    }
                });
            }
        }
    };
    // Collection of registered PlugIn controllers
    $.fn[pluginName].applications = new Map();
})(jQuery, window, document);
//# sourceMappingURL=KatApp.js.map