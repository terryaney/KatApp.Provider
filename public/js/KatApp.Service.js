"use strict";
KatApp.defaultOptions.getData = function (application, _options, done, fail) {
    var authId = KatApp.pageParameters["btrrest_testid"] || "157-911000011";
    $.getJSON('https://qabtr.lifeatworkportal.com/services/rest/api/xds/TBOLoanPmtElection/' + authId)
        .done(function (xDataDef) {
        application.trace(JSON.stringify(xDataDef), TraceVerbosity.Detailed);
        application.trace("Participant data retreived by BTR REST API", TraceVerbosity.Normal);
        done(xDataDef);
    })
        .fail(fail);
};
//# sourceMappingURL=KatApp.Service.js.map