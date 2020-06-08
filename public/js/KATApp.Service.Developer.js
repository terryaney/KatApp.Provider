KatApp.defaultOptions.environmentMode = 2
/*KatApp.defaultOptions.environmentMode
1: ASP.NET.ESS.Legacy
2: LAW
3: ASP.NET.ESS.2020
4: DST/Demo
5: POC injection into host ?
6: View Designer (Template Designer)
7: Developer
*/



// global/defaults

//this gets sample data from a demo REST API
KatApp.defaultOptions.getData_off = function( application, _options, done, fail ) {
    application.trace("Data retrieved from demo rest service");
    console.log("Data retrieved from demo rest service");
    KatApp.defaultOptions.registerDataWithService = false;

    const authId = KatApp.pageParameters["btrrest_testid"] || "157-911000011";
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

//sample for LAW calc
KatApp.defaultOptions.getData = function( application, _options, done ) {    
    application.trace("Data set locally", TraceVerbosity.Normal);
    console.log("Data set locally");
    //this data is just hard coded to whatever you want the CE to use
    done({
        AuthID: "911007346",
        Client: "LAW-DEV",
        Profile: {
            "RequestID": 0,
            "SocialSecurityNumber":	"911007346",
            "BirthDate": "19660301",
            "Status": "A",
            "ParticipantName": "Sample LAW",
            "OriginalHireDate":	"20181130",
            "MostRecentHireDate": "20181130",

            "savedRetAge": "65",
            "savedReplaceRatio": "100",
            "savedLifeExp": "90",
            "savedReturn": "6",
            "savedBonusTarget": "0",
            "savedSalaryIncrease": "2",
            "savedPersonalSavings": "2000000",
            "savedPersonalContrib": "5",
            "savedAnnuities": "12000",
            "savedSSRetAge": "65"
        },
        History: { 
            DC: [
                {index: "01Salary", fieldName: "Salary", fieldValue: "225000"},
                {index: "01balance-Plan", fieldName: "balance-Plan", fieldValue: "14010.14"},
                {index: "01balance-roth", fieldName: "balance-roth", fieldValue: "14010.14"},
                {index: "01date-data-dc", fieldName: "date-data-dc", fieldValue: "20200515"},
                {index: "01dc-cont_elig", fieldName: "dc-cont_elig", fieldValue: "Y"},
                {index: "01pay_freq", fieldName: "pay_freq", fieldValue: "B"},
                {index: "01plan-entry", fieldName: "plan-entry", fieldValue: "20181130"},
                {index: "01stat-401k", fieldName: "stat-401k", fieldValue: "10"},
                {index: "01vestbal-Plan", fieldName: "vestbal-Plan", fieldValue: "14010.14"},
                {index: "01ytd-ro", fieldName: "ytd-ro", fieldValue: "6231.14"},
                {index: "98HCEF", fieldName: "HCEF", fieldValue: "Y"}
            ]
        }
    });
};


//environment setups
if (KatApp.defaultOptions.environmentMode == 7) {

    KatApp.defaultOptions.registerDataWithService = false;
    //need to discuss 'url' setting w terry.  CORS vs Function is not exactly right
    KatApp.defaultOptions.functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    //whatever else to use local sources for provider, views, templates

    KatApp.defaultOptions.getData_off = function( application, _options, done ) {    
        application.trace("Data set locally");
        console.log("Data set locally");
        //this data is just hard coded to whatever you want the CE to use
        done({
            AuthID: "0",
            Client: "DEV",
            Profile: {
                "name-last": "Sample (dev)",
                "name-first": "Steve",
                "date-birth": "1970-07-15"
            },
            History: { 
                Pay: [
                    {id: "2019", w2: 75000},
                    {id: "2018", w2: 74000},
                    {id: "2017", w2: 73000}
                ]
            }
        });
    };
}


if (KatApp.defaultOptions.environmentMode == 4) {
    //DST or static data demo
    KatApp.defaultOptions.registerDataWithService = false;
    KatApp.defaultOptions.functionUrl = "https://qabtr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    //whatever setting to use service for resources

    KatApp.defaultOptions.getData = function( application, _options, done ) {    
        //empty data
        done({
            AuthID: "0",
            Client: "DST Sample",
            Profile: {},
            History: { Pay: [] }
        });
    };
}

//KatApp.defaultOptions.getData
//KatApp.defaultOptions.registerData

if (KatApp.defaultOptions.environmentMode == 2) {
    //LAW service
    KatApp.defaultOptions.registerDataWithService = true; //whas is this doing?

    KatApp.defaultOptions.registerData = function( application, _data, done, fail ) {
        //no options (data) needed since server side data is registered and guid returned
        $.ajax({
            url: pURL('/rks/benefits/services/sharkfin/db/guid.htm'),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).done( function ( payload ) {
            var result = { RegisteredToken: payload.payload };
            done( result );
        } ).fail( fail );

    };    

    KatApp.defaultOptions.submitCalculation = function( application, data, process, fail ) {
        $.ajax({
            url: pURL('/rks/benefits/services/sharkfin/db/data.htm'),
            data: JSON.stringify(data),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).done( process ).fail( fail );
    }

    /* actual LAW service has these ajax calls to save assumptions and recalc data:
        
        callKatAppSaveData: function (data, successCallback) {
            $.ajax({
                url: pURL('/rks/benefits/services/sharkfin/db/save.htm'),
                data: data,
                method: 'POST'
            }).done(successCallback);
        },
        callKatAppRecalculateData: function (data, successCallback) {
            $.ajax({
                url: pURL('/rks/benefits/services/sharkfin/db/reregister.htm'),
                data: JSON.stringify(data),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).done(successCallback);
        }

    */
}


KatApp.defaultOptions.submitCalculation_off = function( application, data, process, fail ) {
    $.ajax({
        url: "https://qabtr.lifeatworkportal.com/services/evolution/calculationfunction.ashx",
        data: JSON.stringify(data),
        method: "POST",
        dataType: "json",
        headers: { 'x-rble-session': data.Configuration.Token, 'Content-Type': undefined }
    })
    .fail( fail )
    .done( process )
};



