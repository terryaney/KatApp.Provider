"use strict";
$(function () {
    var KatAppProvider = /** @class */ (function () {
        function KatAppProvider(applications) {
            var _this = this;
            this.applications = new Map();
            var applicationCount = applications.size;
            console.log("Trigger " + applicationCount + " applications.");
            applications.forEach(function (application) {
                _this.addApplication(application);
            });
            applications.clear();
        }
        KatAppProvider.prototype.addApplication = function (application) {
            var _a;
            this.applications.set(application.id, application);
            var options = application.options();
            console.log("Trigger onProcessResults for " + application.element.attr("rbl-application-id") + ".");
            application.element.append("<div>Initialized</div>");
            (_a = options.onProcessResults) === null || _a === void 0 ? void 0 : _a.call(application.element[0], { "ceVersion": "1.0" });
        };
        return KatAppProvider;
    }());
    $.fn[pluginName].provider = new KatAppProvider($.fn[pluginName].applications);
});
// Needed this line to make sure that I could debug in VS Code since this 
// was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js
//# sourceMappingURL=KatAppProvider.js.map