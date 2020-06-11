const targetApplication = "#ControlHost, .KatApp, div.page-content.home";
const target = $(targetApplication + ":eq(0)");
const appJs = "http://localhost:8887/js/KatApp.js";
const serviceJs = "http://localhost:8887/js/KatApp.Service.LAW.js";

$('head').append('<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.12/css/bootstrap-select.min.css">')
$.getScript("https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.12/js/bootstrap-select.min.js", function() {
    console.log("bootstrap select loaded");
        
    if ( typeof $.fn.KatApp !== "function" ) {
        $.getScript(appJs).done(function() {
            console.log("kat controller loaded");
    
            if ( ( serviceJs || "" ) !== "" ) {
                $.getScript(serviceJs).done(function() {    
                    console.log("kat service controller loaded");
                    injectDebugger();
                });
            }
            else {
                injectDebugger();
            }
        });    
    }
    else {
        injectDebugger();
    }
})

const injectDebugger = function() {
    const debuggerApp = $("<div class='KatAppDebugger' rbl-view='Debugger' rbl-trace-id='Debugger' data-selector='" + targetApplication + "'>Loading KatApp Debugger...</div>");
    debuggerApp.insertBefore(target);

    var debuggerOptions = {
        debug: {
            debugResourcesDomain: KatApp.pageParameters[ "localdebugger" ] === "1" ? "http://localhost:8887/" : undefined
        }
    };
    $(".KatAppDebugger").KatApp(debuggerOptions);    
};
