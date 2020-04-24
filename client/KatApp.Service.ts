KatApp.defaultOptions.getData = function( application, _options, done, fail ): void {
    //this is a demo version that gets sample data from a REST API
    const authId = KatApp.pageParameters["btrrest_testid"] || "911000011";
    $.getJSON('https://qabtr.lifeatworkportal.com/services/rest/api/xds/TBOLoanPmtElection/' + authId )
        .done(  xDataDef =>
            {
                application.trace( xDataDef );
                application.trace( "Participant data retreived by BTR REST API" );
                done( xDataDef );
            }                         
        )
        .fail( fail );
};