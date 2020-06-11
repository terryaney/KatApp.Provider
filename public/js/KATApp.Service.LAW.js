KatApp.defaultOptions.registerData = function( application, _data, done, fail ) {
    //no options (data) needed since server side data is registered and guid returned
    $.ajax({
        url: pURL('/rks/benefits/services/sharkfin/db/guid.htm'),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).done( function ( payload ) {
        var result = { registeredToken: payload.payload };
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
