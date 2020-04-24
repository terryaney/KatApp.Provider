"use strict";
KatApp.defaultOptions.getData = function (application, _options, done) {
    application.trace("Debug data.");
    done({
        AuthID: "91111111",
        Client: "Boeing",
        Profile: {},
        History: {}
    });
};
//# sourceMappingURL=KatApp.Service.Test.js.map