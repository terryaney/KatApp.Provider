// TODO
// - How do I check/handle for errors when I try to load view
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?

// Discussions with Tom
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?

// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
// 6. <div rbl-tid="chart-highcharts" data-name="BalanceChart" rbl-data="BalanceChart" rbl-options="BalanceChart"></div>

/*
Debug Issues
1. If I set tsconfig-base.json removeComments: true, it removes my //# sourceURL=KatAppProvider.js at the bottom of the file
   and debugging/finding the file in Chrome is not possible.  Need to figure out how to get that in there or manually put in
   after I build.

2. Trouble debugging KatAppProvider with breakpoints. The only way it seemed I could put breakpoints into KatAppProvider.ts 
   was to modify the sourceMappingURL declaration in the generated file (KatAppProvider.js) to sourceMappingURL=js/KatAppProvider.js.map.
   If it didn't have the js/ folder, Chrome said it couldn't find the file and breakpoints were never hit.

   If I did change to js/, breakpoints hit, but then Chrome would display an error (in the Source file view, not the console) like:
   
   Could not load content for http://localhost:8887/client/KatAppProvider.ts (HTTP error: status code 404, net::ERR_HTTP_RESPONSE_CODE_FAILURE)

   Maybe that is expected, but just documenting.

*/

const providerVersion = 8.35; // eslint-disable-line @typescript-eslint/no-unused-vars

KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);

// Need this function format to allow for me to reload script over and over (during debugging/rebuilding)
(function($, window, document, undefined?: undefined): void {
    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const validInputSelector = ".notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons;
    const skipBindingInputSelector = ".notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;

    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend(
        {
            debug: {
                traceVerbosity: TraceVerbosity.None,
                saveFirstCalculationLocation: KatApp.pageParameters[ "save" ],
                useTestCalcEngine: KatApp.pageParameters[ "test" ] === "1",
                refreshCalcEngine: KatApp.pageParameters[ "expirece" ] === "1"
                // Set in KatApp.ts
                // useTestView: KatApp.pageParameters[ "testview"] === "1",
                // useTestPlugin: KatApp.pageParameters[ "testplugin"] === "1",
            },
            shareDataWithOtherApplications: true,
            functionUrl: KatApp.functionUrl,
            sessionUrl: KatApp.sessionUrl,
            currentPage: "Unknown1",
            inputSelector: "input, textarea, select",
            inputTab: "RBLInput",
            resultTabs: ["RBLResult"],
            runConfigureUICalculation: true,
            ajaxLoaderSelector: ".ajaxloader",
                        
            onCalculateStart: function( application: KatAppPlugIn ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).show();
                }

                const inputSelector = application.element.data("katapp-input-selector");
                if ( inputSelector !== undefined ) {
                    $(".slider-control, " + inputSelector, application.element)
                        // .not(skipBindingInputSelector)
                        .filter(":not(" + skipBindingInputSelector + ", :disabled)")
                        // .not(":disabled")
                        .attr("disabled", "disabled")
                        .attr("kat-disabled", "true");

                    if ( typeof $.fn.selectpicker === "function" ) {
                        $("select.bootstrap-select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
                    }
                }

                /*
                $( ".slider-control, input:enabled, select:enabled", application.element ).attr("disabled", "disabled").attr("kat-disabled", "true");

                if ( typeof $.fn.selectpicker === "function" ) {
                    $("select.bootstrap-select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
                }
                */
            },
            onCalculateEnd: function( application: KatAppPlugIn ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).fadeOut();
                }
                if ( typeof $.fn.selectpicker === "function" ) {
                    $( "select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']", application.element ).removeAttr("disabled").selectpicker("refresh");
                }
                $( "[kat-disabled='true']", application.element ).removeAttr("disabled kat-disabled");
            },

            // Default to just an empty (non-data) package
            getData: function( appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, _fail: JQueryFailCallback ): void { // eslint-disable-line @typescript-eslint/no-unused-vars
                done( {
                    AuthID: "Empty",
                    Client: "Empty",
                    Profile: {} as JSON,
                    History: {} as JSON
                });
            }
        } as KatAppOptions, KatApp.defaultOptions /* default options already set */ );


    class KatAppPlugIn /* implements KatAppPlugInInterface */ {
        // Helper classes, see comment in interfaces class
        private rble: RBLeUtilities/*Interface*/;
        private ui: UIUtilities/*Interface*/;

        // Fields
        element: JQuery;
        options: KatAppOptions = { };
        id: string;
        displayId: string;
        calculationResults?: JSON;
        exception?: RBLeServiceResults | undefined;
        results?: JSON | undefined;
        resultRowLookups?: ResultRowLookupsInterface;
        calculationInputs?: CalculationInputs | undefined;
        
        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = id;
            this.element = element;
            this.displayId = element.attr("rbl-trace-id") ?? id;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[ 0 ].KatApp = this;
            this.ui = $.fn.KatApp.ui( this );
            this.rble = $.fn.KatApp.rble( this, this.ui );
            this.init( options );
        }
    
        init( options: KatAppOptions ): void {
            // Transfer data attributes over if present...
            const attrResultTabs = this.element.attr("rbl-result-tabs");

            const attributeOptions: KatAppOptions = {
                calcEngine: this.element.attr("rbl-calcengine") ?? KatApp.defaultOptions.calcEngine,
                inputTab: this.element.attr("rbl-input-tab") ?? KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: this.element.attr("rbl-view"),
                viewTemplates: this.element.attr("rbl-view-templates")
            };

            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend(
                {}, // make a clone (so we don't have all plugin targets using same reference)
                KatApp.defaultOptions, // start with default options
                attributeOptions, // data attribute options have next precedence

                // If at time of constructor call the default options or options passed in has a registerData 
                // delegate assigned, then change the default value of this property (Not sure of my logic
                // to set shareDataWithOtherApplications to false if there is a registeredToken, but maybe ok
                // to require caller to explicitly set that option if they are passing in an already
                // registered token)
                { 
                    // Set this property so that provider knows which URL to call to RBLe service (session/function)
                    // and whether to pass in token/data appropriately.  Could probably eliminate this property and
                    // have logic that figured out when needed, but this just made it easier
                    registerDataWithService: KatApp.defaultOptions.registerData !== undefined || options?.registerData !== undefined || ( options?.registeredToken !== undefined ),
                    shareDataWithOtherApplications: options?.registeredToken === undefined
                } as KatAppOptions,
                options // finally js options override all
            );
            
            const saveFirstCalculationLocation = this.options.debug?.saveFirstCalculationLocation;
            if ( saveFirstCalculationLocation !== undefined && saveFirstCalculationLocation !== "1" ) {
                this.element.data("katapp-save-calcengine", saveFirstCalculationLocation);
            }

            this.element.attr("rbl-application-id", this.id);
            this.element.addClass("katapp-" + this.id);

            this.trace( "Started init", TraceVerbosity.Detailed );
            const pipeline: Array<()=> void> = [];
            const pipelineNames: Array<string> = [];
            let pipelineIndex = 0;

            const that: KatAppPlugIn = this;

            const initPipeline = function(offset: number ): void {
                if ( pipelineIndex > 0 ) {
                    that.trace( pipelineNames[ pipelineIndex - 1 ] + ".finish", TraceVerbosity.Detailed );
                }

                pipelineIndex += offset;

                if ( pipelineIndex < pipeline.length ) {
                    that.trace( pipelineNames[ pipelineIndex ] + ".start", TraceVerbosity.Detailed );
                    pipeline[ pipelineIndex++ ]();
                }
            };

            let pipelineError: string | undefined = undefined;

            const useTestView = that.options.debug?.useTestView ?? false;
            const functionUrl = that.options.functionUrl;
            const viewId = that.options.view?.ensureGlobalPrefix(); 
                            
            // Gather up all requested templates requested for the current application so I can bind up any
            // onTemplate() delegates.
            let requiredTemplates: string[] = that.options.viewTemplates != undefined
                ? that.options.viewTemplates.split( "," ).map( r => r.ensureGlobalPrefix() )
                : [];

            let resourceResults: ResourceResults | undefined = undefined;

            //#region - Pipeline Flow Documentation
            /*
                1. Get View (will release flow control when ajax.get() called)
                    When View is returned...
                        a. If error, set pipelineError and jump to finish
                        b. If no error
                            1. Inject view into markup
                            2. If any templates specified on <rbl-config/>, append it to requiredTemplates list.
                2. Get all requiredTemplates ...
                    a. For any required templates *already* requested...
                        1. Can not leave this pipeline step until notified for each template
                        2. Register callbacks that will be called with template is ready. Each callback...
                            a. If error occurred on any previous template callback, exit function doing nothing
                            b. If not waiting for any more templates, continue to next pipeline
                            c. If waiting for more, set flag and continue to wait
                    b. For any required templates *not* already requested *or* downloaded...
                        1. Initialize the _templatesUsedByAllApps variable for template so other apps know it is requested
                        2. Get templates (will release flow control when ajax.get() called)
                            When templates are returned...
                                a. If error, set pipelineError, call all template callbacks (of other apps) signalling error, and jump to finish
                                b. If no error
                                    1. If not waiting for other templates, continue to next pipeline
                                    2. If waiting for other templates, exit function, the template delegates will move pipeline along
                3. Inject templates ...
                    a. For all templates downloaded by *this* application...
                        1. Inject the template into markup
                        2. Set the _templatesUsedByAllApps.data property
                        3. For all registered template callbacks, call the template callback signalling success.
                4. Process templates ...
                    1. If any error during pipeline, log error
                    2. If no errors...
                        a. For every template needed by this application (downloaded by *any* application)...
                            1. Hook up all event handlers registered with onTemplate()
                        b. Process templates that do *not* use RBL results
                        c. Bind all change.RBLe events to all application inputs
                        d. Trigger onInitialized event.
                        e. Call configureUI calculation if needed (will release flow control when I call $ajax() method to RBLe service)
            */
            //#endregion

            const _templatesUsedByAllApps = $.fn.KatApp.templatesUsedByAllApps;
            const _templateDelegates = $.fn.KatApp.templateDelegates;

            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            const loadView = function(): void { 
                if ( viewId !== undefined ) {
                    that.trace(viewId + " requested from CMS.", TraceVerbosity.Detailed);
                    
                    let debugResourcesDomain = that.options.debug?.debugResourcesDomain;
                    if ( debugResourcesDomain !== undefined ) {
                        debugResourcesDomain += "views/";
                    }
                    that.trace("Downloading " + viewId + " from " + debugResourcesDomain ?? functionUrl, TraceVerbosity.Diagnostic );

                    KatApp.getResources( that, viewId, useTestView, false, debugResourcesDomain,
                        ( errorMessage, results ) => {                                

                            pipelineError = errorMessage;

                            if ( pipelineError === undefined ) {
                                that.trace(viewId + " returned from CMS.", TraceVerbosity.Normal);

                                const thisClassCss = ".katapp-" + that.id;
                                const data = 
                                    results![ viewId! ] // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                        .format( { thisView: "[rbl-application-id='" + that.id + "']", id: that.id, thisClass: thisClassCss });

                                        // Process as view - get info from rbl-config and inject markup
                                const view = $("<div class='katapp-css'>" + data.replace( /thisClass/g, thisClassCss )  + "</div>");
                                const rblConfig = $("rbl-config", view).first();
        
                                if ( rblConfig.length !== 1 ) {
                                    that.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                                }

                                that.options.calcEngine = that.options.calcEngine ?? rblConfig?.attr("calcengine");
                                const toFetch = rblConfig?.attr("templates");
                                if ( toFetch !== undefined ) {
                                    requiredTemplates = 
                                        requiredTemplates
                                            .concat( toFetch.split(",").map( r => r.ensureGlobalPrefix() ) )
                                            // unique templates only
                                            .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i );

                                }
                                that.options.inputTab = that.options.inputTab ?? rblConfig?.attr("input-tab");
                                const attrResultTabs = rblConfig?.attr("result-tabs");
                                that.options.resultTabs = that.options.resultTabs ?? ( attrResultTabs != undefined ? attrResultTabs.split( "," ) : undefined );
                                
                                that.element.empty().append( view );
                                
                                initPipeline( 0 );
                            }
                            else {
                                pipelineError = errorMessage;
                                initPipeline( 2 ); // jump to finish
                            }
                        }
                    );
                }
                else {
                    initPipeline( 0 );
                }
            };
            const loadTemplates = function(): void { 
                // Total number of resources already requested that I have to wait for
                let otherResourcesNeeded = 0;
                
                // For all templates that are already being fetched, create a callback to move on when 
                // not waiting for any more resources
                requiredTemplates.filter( r => ( _templatesUsedByAllApps[ r ]?.requested ?? false ) )
                    .forEach( function( r ) {                                
                        otherResourcesNeeded++;

                        that.trace("Need to wait for already requested template: " + r, TraceVerbosity.Detailed);

                        _templatesUsedByAllApps[ r ].callbacks.push(
                            function( errorMessage ) {
                                that.trace("Template: " + r + " is now ready.", TraceVerbosity.Detailed);

                                // only process (moving to finish or next step) if not already assigned an error
                                if ( pipelineError === undefined ) {
                                    if ( errorMessage === undefined ) {
                                        otherResourcesNeeded--;
                                        if ( otherResourcesNeeded === 0 ) {
                                            that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                            initPipeline( 0 ); // move to next step if not waiting for anything else
                                        }
                                        else {
                                            that.trace("Waiting for " + otherResourcesNeeded + " more templates.", TraceVerbosity.Diagnostic);
                                        }
                                    }
                                    else {
                                        that.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet );
                                        pipelineError = errorMessage;
                                        initPipeline( 1 ); // jump to finish
                                    }
                                }
                            }
                        );
                    });

                // Array of items this app will fetch because not requested yet
                const toFetch: string[] = [];

                // For every template this app needs that is *NOT* already requested for download
                // or finished, add it to the fetch list and set the state to 'requesting'
                requiredTemplates
                    .filter( r => !( _templatesUsedByAllApps[ r ]?.requested ?? false ) && _templatesUsedByAllApps[ r ]?.data === undefined )
                    .forEach( function( r ) {
                        _templatesUsedByAllApps[ r ] = { requested: true, callbacks: [] };
                        toFetch.push(r);
                    });

                if ( toFetch.length > 0 ) {

                    const toFetchList = toFetch.join(",");
                    that.trace(toFetchList + " requested from CMS.", TraceVerbosity.Detailed);

                    let debugResourcesDomain = that.options.debug?.debugResourcesDomain;
                    if ( debugResourcesDomain !== undefined ) {
                        debugResourcesDomain += "templates/";
                    }
                    that.trace("Downloading " + toFetchList + " from " + debugResourcesDomain ?? functionUrl, TraceVerbosity.Diagnostic );
                    KatApp.getResources( that, toFetchList, useTestView, false, debugResourcesDomain,
                        ( errorMessage, data ) => {                                

                            if ( errorMessage === undefined ) {
                                resourceResults = data as ResourceResults;
                                that.trace(toFetchList + " returned from CMS.", TraceVerbosity.Normal);
                                
                                // Only move on if not waiting on any more resources from other apps
                                if ( otherResourcesNeeded === 0 ) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                    initPipeline( 0 );
                                }
                                else {
                                    that.trace("Can't move to next step because waiting on templates.", TraceVerbosity.Diagnostic);
                                }
                            }
                            else {
                                toFetch.forEach( r => {
                                    // call all registered callbacks from other apps
                                    let currentCallback: ( ( errorMessage: string )=> void ) | undefined = undefined;
                                    while( ( currentCallback = _templatesUsedByAllApps[ r ].callbacks.pop() ) !== undefined )
                                    {
                                        currentCallback( errorMessage );
                                    }
                                    _templatesUsedByAllApps[ r ].requested = false; // remove it so someone else might try to download again
                                });

                                pipelineError = errorMessage;
                                initPipeline( 1 ); // jump to finish
                            }
                        }
                    );
                }
                else if ( otherResourcesNeeded === 0 ) {
                    initPipeline( 1 ); // jump to finish
                }
            };
            const injectTemplates = function(): void {
                    
                if ( resourceResults != null ) {
                    // For the templates *this app* downloaded, inject them into markup                        
                    Object.keys(resourceResults).forEach( r => { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        const data = resourceResults![ r ]; // eslint-disable-line @typescript-eslint/no-non-null-assertion

                        // TOM (your comment, but do we need that container?): create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                        // and this attribute used for checking(?)
                        
                        const rblKatApps = $("rbl-katapps");
                        const t = $("<rbl-templates rbl-t='" + r.toLowerCase() + "'>" + data.replace( /{thisTemplate}/g, r ) + "</rbl-templates>");

                        t.appendTo(rblKatApps);

                        that.trace( r + " injected into markup.", TraceVerbosity.Normal );

                        // Should only ever get template results for templates that I can request
                        _templatesUsedByAllApps[ r ].data = data;
                        _templatesUsedByAllApps[ r ].requested = false;
                        
                        // call all registered callbacks from other apps
                        let currentCallback: ( ( errorMessage: string | undefined )=> void ) | undefined = undefined;
                        while( ( currentCallback = _templatesUsedByAllApps[ r ].callbacks.pop() ) !== undefined )
                        {
                            currentCallback( undefined );
                        }
                    });
                }

                initPipeline( 0 );
            };
            const finalizeInit = function(): void {
                
                if ( pipelineError === undefined ) {
                    
                    // Now, for every unique template reqeusted by client, see if any template delegates were
                    // registered for the template using templateOn().  If so, hook up the 'real' event requested
                    // to the currently running application.  Need to use templateOn() because the template is
                    // only injected once into the markup but we need to hook up events for each event that
                    // wants to use this template.
                    requiredTemplates
                        .forEach( t => {
                            // Loop every template event handler that was called when template loaded
                            // and register a handler to call the delegate
                            _templateDelegates
                                .filter( d => d.Template.toLowerCase() == t.toLowerCase() )
                                .forEach( d => {
                                    that.trace( "[" + d.Events + "] events from template [" + d.Template + "] hooked up.", TraceVerbosity.Normal );
                                    that.element.on( d.Events, function( ...args ): void {
                                        d.Delegate.apply( this, args );
                                    } );
                                });
                        });

                    // Update options.viewTemplates just in case someone is looking at them
                    that.options.viewTemplates = requiredTemplates.join( "," );

                    // Build up template content that DOES NOT use rbl results, but instead just 
                    // uses data-* to create a dataobject.  Normally just making controls with templates here
                    $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                        const templateId = $(this).attr('rbl-tid');
                        if (templateId !== undefined && templateId !== "inline") {
                            //Replace content with template processing, using data-* items in this pass
                            that.rble.injectTemplate( $(this), that.rble.getTemplate( templateId, $(this).data() ) );
                        }
                    });

                    // This used to be inside Standard_Template.templateOn, but since it is standard and so common, just moved it here.
                    // Original code:
                    /*
                        $.fn.KatApp.templateOn("{thisTemplate}", "onInitialized.RBLe", function (event, application) {
                            application.trace("Processing onInitialized.RBLe for Template [{thisTemplate}]...", TraceVerbosity.Normal);

                            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.onInitialized") {
                                debugger;
                            }

                            const templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory( application );
                            templateBuilder.processInputs();
                            templateBuilder.processCarousels();
                        });
                    */
                    const templateBuilder: StandardTemplateBuilder = $.fn.KatApp.standardTemplateBuilderFactory( that );
                    // Process data-* attributes and bind events
                    templateBuilder.processUI();

                    that.ui.bindCalculationInputs();

                    that.ui.triggerEvent( "onInitialized", that );

                    if ( that.options.runConfigureUICalculation ) {
                        that.trace( "Calling configureUI calculation...", TraceVerbosity.Detailed );
                        that.configureUI();
                    }
                }
                else {
                    that.trace( "Error during Provider.init: " + pipelineError, TraceVerbosity.Quiet );
                }

                that.trace( "Finished init", TraceVerbosity.Detailed );
                initPipeline( 0 ); // just to get the trace statement, can remove after all tested

            };

            pipeline.push( 
                loadView,
                loadTemplates,
                injectTemplates,
                finalizeInit
            );
            pipelineNames.push( 
                "initPipeline.loadView",
                "initPipeline.loadTemplates",
                "initPipeline.injectTemplates",
                "initPipeline.finalizeInit"
            );

            // Start the pipeline
            initPipeline( 0 );
        }

        rebuild( options: KatAppOptions ): void {
            const o = KatApp.extend({}, this.options, options);
            this.ui.unbindCalculationInputs();
            this.ui.triggerEvent( "onDestroyed", this );
            this.init( o );
        }

        setRegisteredToken( token: string ): void {
            this.options.registeredToken = token;

            if ( this.options.shareDataWithOtherApplications ?? false ) {
                const _sharedData = $.fn.KatApp.sharedData;
                _sharedData.registeredToken = token;
                this.options.sharedDataLastRequested = _sharedData.lastRequested = Date.now();                
            }
        }

        calculate( customOptions?: KatAppOptions ): void {
            const _sharedData = $.fn.KatApp.sharedData;

            // Shouldn't change 'share' option with a customOptions object, so just use original options to check
            const shareDataWithOtherApplications = this.options.shareDataWithOtherApplications ?? false;
            if ( shareDataWithOtherApplications ) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options.sharedDataLastRequested = _sharedData.lastRequested;
            }

            if ( this.options.calcEngine === undefined ) {
                return;
            }

            this.exception = undefined; // Should I set results to undefined too?

            this.ui.triggerEvent( "onCalculateStart", this );

            const that: KatAppPlugIn = this;

            // Build up complete set of options to use for this calculation call
            const currentOptions = KatApp.extend(
                {}, // make a clone of the options
                that.options, // original options
                customOptions, // override options
            ) as KatAppOptions;

            const pipeline: Array<()=> void> = [];
            const pipelineNames: Array<string> = [];
            let pipelineIndex = 0;

            const calculatePipeline = function( offset: number ): void {
                if ( pipelineIndex > 0 ) {
                    that.trace( pipelineNames[ pipelineIndex - 1 ] + ".finish", TraceVerbosity.Detailed );
                }
            
                pipelineIndex += offset;
            
                if ( pipelineIndex < pipeline.length ) {
                    that.trace( pipelineNames[ pipelineIndex ] + ".start", TraceVerbosity.Detailed );
                    pipeline[ pipelineIndex++ ]();
                }
            };

            const callSharedCallbacks = function( errorMessage: string | undefined ): void {
                let currentCallback: ( ( em: string | undefined )=> void ) | undefined = undefined;
                while( ( currentCallback = _sharedData.callbacks.pop() ) !== undefined )
                {
                    currentCallback( errorMessage );
                }
                _sharedData.requesting = false;
                _sharedData.lastRequested = Date.now();
            };

            let pipelineError: string | undefined = undefined;

            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            const submitCalculation = function(): void { 
                try {
                    that.rble.submitCalculation( 
                        currentOptions, 
                        // If failed, let it do next job (getData, register, resubmit), otherwise, jump to finish
                        errorMessage => { 
                            pipelineError = errorMessage; 
                            calculatePipeline( errorMessage !== undefined ? 0 : 3 );
                        } 
                    );
                } catch (error) {
                    pipelineError = "Submit.Pipeline exception: " + error;
                    calculatePipeline( 3 );
                }
            };
            const getCalculationData = function(): void {
                try {
                    pipelineError = undefined; // Was set in previous pipeline calculate attempt, but clear out and try flow again

                    if ( shareDataWithOtherApplications && _sharedData.requesting ) {
                        that.trace("Need to wait for already requested data.", TraceVerbosity.Detailed);
                        // Wait for callback...

                        _sharedData.callbacks.push( function( errorMessage ) {
                            if ( errorMessage === undefined ) {
                                // When called back, it'll be after getting data *or* after
                                // registration if options call for it, so just jump to resubmit
                                that.trace("Data is now ready.", TraceVerbosity.Detailed);
                                that.options.data = currentOptions.data = _sharedData.data;
                                that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                                that.options.sharedDataLastRequested = _sharedData.lastRequested;
                                calculatePipeline( 1 ); 
                            }
                            else {
                                that.trace("Data retrieval failed in other application.", TraceVerbosity.Detailed);
                                pipelineError = errorMessage;
                                calculatePipeline( 2 ); // If error, jump to finish
                            }                  
                        });
                    }
                    else if ( shareDataWithOtherApplications && _sharedData.lastRequested != null && ( that.options.sharedDataLastRequested === undefined || _sharedData.lastRequested > that.options.sharedDataLastRequested ) ) {
                        // Protecting against following scenario:
                        // Two applications registered data on server and timed out due to inactivity.  Then both
                        // applications triggered calculations at 'similar times' and both submit to server.  
                        // Both throw an error because they can not find registered transaction package.
                        // 1. Application 1 returns from error and enters *this* pipeline to get data.
                        // 2. Application 1 gets data and successfully registers it, then sets 'requesting'=false.
                        // 3. Application 1 submits calculation again.
                        // 4. Application 2 returns from first calculation attempt with error of no registered data.
                        // 5. Application 2 enters *this* pipeline, but requesting is no longer true.
                        //      - Normally, it would then think it has to get/register data itself, but with this
                        //        logic, it'll first check to see if there is 'new' data, and use that if possible.
                        //
                        // So, if Sharing data, and the shared request date > application.shared request date, then
                        // just grab the data from _shared and move on to resubmit.
                        that.trace("Using existing shared data.", TraceVerbosity.Detailed);
                        that.options.data = currentOptions.data = _sharedData.data;
                        that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                        that.options.sharedDataLastRequested = _sharedData.lastRequested;
                        calculatePipeline( 1 ); 
                    }
                    else {
                        that.trace("Requesting data.", TraceVerbosity.Detailed);
                        try {
                            if ( shareDataWithOtherApplications ) {
                                _sharedData.requesting = true;
                                _sharedData.registeredToken = undefined;
                                _sharedData.data = undefined;
                            }
                            that.options.data = currentOptions.data = undefined;
                            that.options.registeredToken = currentOptions.registeredToken = undefined;
                
                            that.rble.getData( 
                                currentOptions, 
                                // If failed, then I am unable to register data, so just jump to finish, 
                                // otherwise continue to registerData or submit
                                ( errorMessage, data ) => { 
                                    if ( errorMessage !== undefined ) {
                                        pipelineError = errorMessage;

                                        if ( shareDataWithOtherApplications ) {
                                            callSharedCallbacks( errorMessage );
                                        }

                                        calculatePipeline( 2 ); // If error, jump to finish
                                    }
                                    else {
                                        that.options.data = currentOptions.data = data as RBLeRESTServiceResult;

                                        if ( shareDataWithOtherApplications ) {
                                            _sharedData.data = that.options.data;

                                            // If don't need to register, then let any applications waiting for data know that it is ready
                                            if ( !that.options.registerDataWithService ) {
                                                callSharedCallbacks( undefined );
                                            }
                                        }

                                        if ( !that.options.registerDataWithService ) {
                                            calculatePipeline( 1 ); // If not registering data, jump to submit
                                        }
                                        else {
                                            calculatePipeline( 0 ); // Continue to register data
                                        }                                        
                                    }
                                } 
                            );                                        
                        } catch (error) {
                            if ( shareDataWithOtherApplications ) {
                                callSharedCallbacks( error );
                            }
                            throw error;
                        }
                    }
                } catch (error) {
                    pipelineError = "GetData.Pipeline exception: " + error;
                    calculatePipeline( 2 ); // If error, jump to finish
                }
            };
            const registerData = function(): void {
                try {
                    that.rble.registerData( 
                        currentOptions, that.options.data as RBLeRESTServiceResult,
                        // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                        errorMessage => { 

                            if ( errorMessage === undefined ) {
                                if ( shareDataWithOtherApplications ) {
                                    _sharedData.registeredToken = that.options.registeredToken;
                                    callSharedCallbacks( undefined );
                                }
                                calculatePipeline( 0 );
                            }
                            else {
                                pipelineError = errorMessage; 
                                if ( shareDataWithOtherApplications ) {
                                    callSharedCallbacks( errorMessage );
                                }
                                // If error, jump to finish
                                calculatePipeline( 1 );
                            }
                        } 
                    );
                } catch (error) {
                    pipelineError = "Register.Pipeline exception: " + error;
                    if ( shareDataWithOtherApplications ) {
                        callSharedCallbacks( pipelineError );
                    }
                    calculatePipeline( 1 );                            
                }
            };
            const resubmitCalculation = function(): void {
                try {
                    that.rble.submitCalculation( 
                        currentOptions,
                        // If failed, let it do next job (getData), otherwise, jump to finish
                        errorMessage => { 
                            pipelineError = errorMessage; 
                            calculatePipeline( 0 );
                        } 
                    );
                } catch (error) {
                    pipelineError = "ReSubmit.Pipeline exception: " + error;
                    calculatePipeline( 0 );
                }
            };
            const processResults = function(): void {
                that.trace("Processing results from calculation.", TraceVerbosity.Detailed);

                try {
                    if ( pipelineError === undefined ) {
                        that.element.removeData("katapp-save-calcengine");
                        that.element.removeData("katapp-trace-calcengine");
                        that.element.removeData("katapp-refresh-calcengine");
                        that.options.defaultInputs = undefined;


                        that.ui.triggerEvent( "onResultsProcessing", that.results, currentOptions, that );
                        that.rble.processResults();

                       if ( that.calculationInputs?.iConfigureUI === 1 ) {
                            that.ui.triggerEvent( "onConfigureUICalculation", that.results, currentOptions, that );
                        }

                        that.ui.triggerEvent( "onCalculation", that.results, currentOptions, that );
        
                        $(".needsRBLeConfig", that.element).removeClass("needsRBLeConfig");
                    }
                    else {
                        that.rble.setResults( undefined );
                        // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                        that.ui.triggerEvent( "onCalculationErrors", "RunCalculation", pipelineError, that.exception, currentOptions, that );
                    }
                } catch (error) {
                    that.trace( "Error during result processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that );
                }
                finally {
                    that.ui.triggerEvent( "onCalculateEnd", that );
                }
            };

            pipeline.push( 
                submitCalculation,
                getCalculationData,
                registerData,
                resubmitCalculation,
                processResults
            )
            pipelineNames.push( 
                "calculatePipeline.submitCalculation",
                "calculatePipeline.getCalculationData",
                "calculatePipeline.registerData",
                "calculatePipeline.resubmitCalculation",
                "calculatePipeline.processResults"
            )

            // Start the pipeline
            calculatePipeline( 0 );
        }

        configureUI( customOptions?: KatAppOptions ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1, iDataBind: 1 } };
            this.calculate( KatApp.extend( {}, customOptions, manualInputs ) );
        }

        destroy(): void {
            this.element.removeAttr("rbl-application-id");
            this.element.removeClass("katapp-" + this.id);
            this.element.removeData("katapp-save-calcengine");
            this.element.removeData("katapp-refresh-calcengine");
            this.element.removeData("katapp-trace-calcengine");
            this.element.off(".RBLe");
            this.ui.unbindCalculationInputs();
            this.ui.triggerEvent( "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        updateOptions( options: KatAppOptions ): void { 
            this.options = KatApp.extend( {}, this.options, options )
            this.ui.unbindCalculationInputs();

            // When calling this method, presummably all the inputs are available
            // and caller wants the input (html element) to be updated.  When passed
            // in on a rebuild/init I don't apply them until a calculation is ran.
            if ( this.options.defaultInputs !== undefined ) {
                this.setInputs( this.options.defaultInputs );
                this.options.defaultInputs = undefined;
            }

            this.ui.bindCalculationInputs();
            this.ui.triggerEvent( "onOptionsUpdated", this );
        }

        setInputs( inputs: JSON | CalculationInputs, calculate = true ): void {
            // When called publicly, want to trigger a calculation, when called from init() we don't
            Object.keys( inputs ).forEach( i => {
                this.rble.setDefaultValue( i, inputs[ i ]);
            });

            if ( calculate ) {
                this.calculate();
            }
        }

        getInputs(): JSON {
            return this.ui.getInputs( this.options );
        };

        // Result helper
        getResultTable<T>( tableName: string): Array<T> {
            return this.rble.getResultTable<T>( tableName );
        }
        getResultRow<T>(table: string, id: string, columnToSearch?: string ): T | undefined { 
            return this.rble.getResultRow<T>( table, id, columnToSearch ); 
        }
        getResultValue( table: string, id: string, column: string, defautlValue?: string ): string | undefined { 
            return this.rble.getResultValue( table, id, column, defautlValue ); 
        }
        getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defautlValue?: string ): string | undefined { 
            return this.rble.getResultValueByColumn( table, keyColumn, key, column, defautlValue ); 
        }
        setDefaultValue( id: string, value: string | undefined): void {
            this.rble.setDefaultValue(id, value);
        }
        saveCalcEngine( location: string ): void {
            this.element.data("katapp-save-calcengine", location);
        }

        // Debug helpers
        refreshCalcEngine(): void {
            this.element.data("katapp-refresh-calcengine", "1");
        }
        traceCalcEngine(): void {
            this.element.data("katapp-trace-calcengine", "1");
        }
        trace( message: string, verbosity: TraceVerbosity = TraceVerbosity.Normal ): void {
            KatApp.trace( this, message, verbosity );
        }
    }
    
    // All methods/classes before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure).  Could make another utility
    // class like I did in original service or KATApp beta, but wanted methods unreachable from javascript
    // outside my framework.  See if there is a way to pull that off and move these methods somewhere that
    // doesn't clutter up code flow here
    class UIUtilities /* implements UIUtilitiesInterface */ {
        application: KatAppPlugIn;

        constructor( application: KatAppPlugIn ) {
            this.application = application;    
        }

        getInputName(input: JQuery): string {
            // Need to support : and $.  'Legacy' is : which is default mode a convert process has for VS, but Gu says to never use that, but it caused other issues that are documented in
            // 4.1 Validators.cs file so allowing both.
            // http://bytes.com/topic/asp-net/answers/433532-control-name-change-asp-net-2-0-generated-html
            // http://weblogs.asp.net/scottgu/gotcha-don-t-use-xhtmlconformance-mode-legacy-with-asp-net-ajax

            // data-input-name - Checkbox list items, I put the 'name' into a parent span (via attribute on ListItem)
            let htmlName = input.parent().attr("data-input-name") || input.attr("name");

            if ( htmlName === undefined ) {
                const id = input.attr("id");
                if ( id !== undefined ) {
                    const idParts = id.split("_");
                    htmlName = idParts[ idParts.length - 1 ];
                }
            }

            if (htmlName === undefined) return "UnknownId";

            const nameParts = htmlName.split(htmlName.indexOf("$") === -1 ? ":" : "$");

            let id = nameParts[nameParts.length - 1];

            if (id.startsWith("__")) {
                id = id.substring(2);
            }

            return id;
        }

        getInputValue(input: JQuery): string {
            let value = input.val();

            if ( Array.isArray( value ) ) {
                value = ( value as Array<unknown> ).join("^");
            }

            let skipAssignment = false;

            if (input.attr("type") === "radio") {

                if (!input.is(':checked')) {
                    skipAssignment = true;
                }

            }
            else if (input.is(':checkbox')) {
                value = input.prop("checked") ? "1" : "0";
            }

            return ( !skipAssignment ? value ?? '' : undefined ) as string;
        }

        getInputs(customOptions: KatAppOptions ): JSON {
            // const json = { inputs: {} };
            const inputs = {};
            const that: UIUtilities = this;

            // skip table inputs b/c those are custom, and .dropdown-toggle b/c bootstrap select
            // puts a 'button input' inside of select in there
            if ( customOptions.inputSelector !== undefined ) {
                const validInputs = $(customOptions.inputSelector, this.application.element).not(validInputSelector);

                jQuery.each(validInputs, function () {
                    const input = $(this);
    
                    // bootstrap selectpicker has some 'helper' inputs that I need to ignore
                    if (input.parents(".bs-searchbox").length === 0) {
                        const value = that.getInputValue(input);
    
                        if (value !== undefined) {
                            const name = that.getInputName(input);
                            inputs[name] = value;
                        }
                    }
                });
            }

            return inputs as unknown as JSON;
        }

        getInputTables(): CalculationInputTable[] | undefined {
            const that: UIUtilities = this;
            const tables: CalculationInputTable[] = [];
            let hasTables = false;

            jQuery.each($(".RBLe-input-table", this.application.element), function () {
                hasTables = true;

                const table: CalculationInputTable = {
                    Name: $(this).data("table"),
                    Rows: []
                };

                jQuery.each($("[data-index]", this), function () {
                    const row: CalculationInputTableRow = {
                        index: $(this).data("index")
                    };

                    jQuery.each($("[data-column]", this), function () {
                        const input = $(this);
                        const value = that.getInputValue(input);

                        if (value !== undefined) {
                            row[input.data("column")] = value;
                        }
                    });

                    table.Rows.push(row);
                });

                tables.push(table);
            });

            return hasTables ? tables : undefined;
        }

        triggerEvent(eventName: string, ...args: ( object | string | undefined )[]): void {
            const application = this.application;
            try {
                application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
                application.options[ eventName ]?.apply(application.element[0], args );
                application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            } catch (error) {
                application.trace("Error calling " + eventName + ": " + error, TraceVerbosity.None);
            }
            try {
                application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
                application.element.trigger( eventName + ".RBLe", args);
                application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);
            } catch (error) {
                application.trace("Error triggering " + eventName + ": " + error, TraceVerbosity.None);
            }
        }

        changeRBLe(element: JQuery<HTMLElement>): void {
            const wizardInputSelector = element.data("input");
        
            if (wizardInputSelector == undefined) {
                this.application.calculate( { manualInputs: { iInputTrigger: this.getInputName(element) } } );
            }
            else {
                // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                $("." + wizardInputSelector)
                    .val(element.val() as string)
                    .trigger("change.RBLe"); // trigger calculation
            }        
        }

        bindCalculationInputs(): void {
            const application = this.application;
            if ( application.options.inputSelector !== undefined && application.options.calcEngine !== undefined ) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                
                const that: UIUtilities = this;

                $(application.options.inputSelector, application.element).not(skipBindingInputSelector).each(function () {        
                    $(this).bind("change.RBLe", function () {
                        that.changeRBLe($(this));
                    });
                });
            }
        }

        unbindCalculationInputs(): void {
            const element = this.application.element;
            const inputSelector = element.data("katapp-input-selector");

            if ( inputSelector !== undefined ) {
                $(inputSelector, element).off(".RBLe");
                element.removeData("katapp-input-selector")
            }
        }

		isAspNetCheckbox(input: JQuery<HTMLElement>): boolean {
			// If assigning a asp.net checkbox label, need to search this way, should probably make it work for methods described
			// http://stackoverflow.com/questions/6293588/how-to-create-an-html-checkbox-with-a-clickable-label

			// This only supports asp.net checkboxes, was going to support 'regular' checkboxes input.is(':checkbox') but
			// not sure there is a standard for label, so would have to find the label appropriately but sometimes the 'input' is inside the
			// label it appears.  So would have to come up with a standard 'html checkbox' layout.
			/*
				Have seen...
				<label><input type="checkbox"> Check me out</label>

				<input id="boxid" type="checkbox"><label for="boxid"> Check me out</label>

				<label id="lboxid"><input type="checkbox" id="boxid" /><span> Check me out</span></label>
			*/
			return (input.length === 1 && $("label", input).length === 1 && $("input[type=checkbox]", input).length === 1);
		}
        getAspNetCheckboxLabel(input: JQuery<HTMLElement>): JQuery<HTMLElement> | undefined {
			return this.isAspNetCheckbox(input)
				? $("label", input)
				: undefined;
        }
        getAspNetCheckboxInput(input: JQuery<HTMLElement>): JQuery<HTMLElement> | undefined {
			return this.isAspNetCheckbox(input)
                ? $("input", input)
                : undefined;
        }
        getNoUiSlider(id: string, view: JQuery<HTMLElement>): noUiSlider.noUiSlider | undefined {
            const sliderJQuery = $(".slider-" + id, view);
            if ( sliderJQuery.length === 1 ) {
                return ( sliderJQuery[0] as noUiSlider.Instance )?.noUiSlider;
            }
            return undefined;
        }
        getNoUiSliderContainer(id: string, view: JQuery<HTMLElement>): JQuery<HTMLElement> | undefined {
            const sliderJQuery = $(".slider-" + id, view);
            if ( sliderJQuery.length === 1 ) {
                return sliderJQuery;
            }
            return undefined;
        }

        getJQuerySelector(id: string | undefined): string | undefined {
            if ( id === undefined ) return undefined;

            //if selector contains no 'selector' characters (.#[:) , add a . in front (default is class; downside is no selecting plain element)
            if ( id === id.replace( /#|:|\[|\./g ,'') ) {
                id = "." + id;
            }

            return id;
            
            /*
            const firstChar = id.substr(0, 1);
            const selector = firstChar !== "." && firstChar !== "#" ? "." + id : id;

            return selector;
            */
        }
    }
    $.fn.KatApp.ui = function( application: KatAppPlugIn ): UIUtilities {
        return new UIUtilities( application );
    };

    class RBLeUtilities /* implements RBLeUtilitiesInterface */ {
        private application: KatAppPlugIn;
        private ui: UIUtilities;

        constructor( application: KatAppPlugIn, uiUtilities: UIUtilities ) {
            this.application = application;  
            this.ui = uiUtilities;  
        }

        setResults( results: JSON | undefined ): void {
            if ( results !== undefined ) {
                const propertyNames = results["@resultKeys"] = Object.keys(results).filter( k => !k.startsWith( "@" ) );

                // Ensure that all tables are an array
                propertyNames.forEach( k => {
                    const table = results[ k ];

                    if (!(table instanceof Array) && table != null ) {
                        results[ k ] = [table];
                    }
                });
            }

            this.application.results = results;
            this.application.resultRowLookups = undefined;
        }

        getData( currentOptions: KatAppOptions, getDataHandler: PipelineCallback ): void {
        
            if ( currentOptions.getData === undefined ) 
            {
                getDataHandler( "getData handler does not exist." );
                return;
            }
    
            currentOptions.getData( 
                this.application,
                currentOptions, 
                data => { 
                    getDataHandler( undefined, data ); 
                },
                ( _jqXHR, textStatus ) => {
                    this.application.trace("getData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                    getDataHandler( "getData AJAX Error Status: " + textStatus );
                }
            );  
        }
    
        registerData( currentOptions: KatAppOptions, data: RBLeRESTServiceResult, registerDataHandler: PipelineCallback ): void {
            const that: RBLeUtilities = this;
            const application = this.application;;

            const register: RegisterDataDelegate =
                currentOptions.registerData ??
                function( _app, _o, done, fail ): void
                {
                    const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
                    const calculationOptions: SubmitCalculationOptions = {
                        Data: data,
                        Configuration: {
                            AuthID: data.AuthID as string,
                            AdminAuthID: undefined,
                            Client: data.Client as string,
                            CalcEngine: currentOptions.calcEngine,
                            TraceEnabled: traceCalcEngine ? 1 : 0,
                            InputTab: currentOptions.inputTab as string,
                            ResultTabs: currentOptions.resultTabs as string[],
                            TestCE: currentOptions.debug?.useTestCalcEngine ?? false,
                            CurrentPage: currentOptions.currentPage ?? "Unknown",
                            RequestIP: "1.1.1.1",
                            CurrentUICulture: "en-US",
                            Environment: "PITT.PROD"                                
                        }
                    };
                
                    const json = {
                        Registration: KatApp.generateId(),
                        TransactionPackage: JSON.stringify(calculationOptions)
                    };
    
                    const jsonParams = {
                        url: KatApp.sessionUrl,
                        type: "POST",
                        processData: false,
                        data: JSON.stringify(json),
                        dataType: "json"
                    };
    
                    $.ajax(jsonParams)
                        .done( done )
                        .fail( fail );
                };
    
            const registerFailed: JQueryFailCallback = function( _jqXHR, textStatus ): void {
                application.trace("registerData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                registerDataHandler( "registerData AJAX Error Status: " + textStatus );
            };
        
            const registerDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception === undefined ) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.registeredToken;
                    application.options.data = currentOptions.data = undefined;

                    that.ui.triggerEvent( "onRegistration", currentOptions, application );
                    registerDataHandler();
                }
                else {
                    application.exception = payload;
                    application.trace("registerData Error Status: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    registerDataHandler( "RBLe Register Data Error: " + payload.Exception.Message );
                }
            }
    
            register( application, currentOptions, registerDone, registerFailed );
        }
    
        submitCalculation( currentOptions: KatAppOptions, submitCalculationHandler: PipelineCallback ): void {

            if ( currentOptions.registeredToken === undefined && currentOptions.data === undefined ) {
                submitCalculationHandler( "submitCalculation no registered token." );
                return;
            }
            
            const application = this.application;
            const saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            const refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";

            // TODO Should make a helper that gets options (for both submit and register)            

            if ( currentOptions.defaultInputs !== undefined )
            {
                // Currently can't pass this in.  Not sure ever needed, but if so, multi page
                // KatApps (i.e. LifeInputs and Life) sometimes pass all the inputs through to 
                // a secondary load of KatApps based on proper conditions in onCalculation.  For
                // the problem I saw, it was loading secondary app when iInputTrigger was a specific
                // value.  But then it just turned into a recursive call because this input stayed
                // in the inputs and it just called a load over and over
                delete currentOptions.defaultInputs.iInputTrigger;
            }

            const calculationOptions: SubmitCalculationOptions = {
                Data: !( currentOptions.registerDataWithService ?? true ) ? currentOptions.data : undefined,
                Inputs: application.calculationInputs = KatApp.extend( this.ui.getInputs( currentOptions ), currentOptions.defaultInputs, currentOptions?.manualInputs ),
                InputTables: this.ui.getInputTables(), 
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: ( currentOptions.registerDataWithService ?? true ) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab as string,
                    ResultTabs: currentOptions.resultTabs as string[],
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ( currentOptions.debug?.refreshCalcEngine ?? false ),
                    PreCalcs: undefined, // TODO: search service for update-tp, need to get that logic in there
                    
                    // Non-session submission
                    AuthID: currentOptions.data?.AuthID,
                    AdminAuthID: undefined,
                    Client: currentOptions.data?.Client,
                    TestCE: currentOptions.debug?.useTestCalcEngine ?? false,
                    CurrentPage: currentOptions.currentPage ?? "Unknown",
                    RequestIP: "1.1.1.1",
                    CurrentUICulture: "en-US",
                    Environment: "PITT.PROD"
                }
            };

            const that: RBLeUtilities = this;

            const submitDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception === undefined ) {
                    that.setResults( payload.RBL?.Profile.Data.TabDef );
                    submitCalculationHandler();
                }
                else {
                    application.exception = payload;
                    application.trace( "RBLe Service Result Exception: " + payload.Exception.Message, TraceVerbosity.Quiet )
                    submitCalculationHandler( "RBLe Service Result Exception: " + payload.Exception.Message );
                }
            };
    
            const submitFailed: JQueryFailCallback = function( _jqXHR, textStatus ): void {
                application.trace("submitCalculation AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                submitCalculationHandler( "submitCalculation AJAX Error Status: " + textStatus );
            };
    
            const submit: SubmitCalculationDelegate =
                currentOptions.submitCalculation ??
                function( _app, o, done, fail ): void {
                    $.ajax({
                        url: currentOptions.registerDataWithService ? currentOptions.sessionUrl : currentOptions.functionUrl,
                        data: JSON.stringify(o),
                        method: "POST",
                        dataType: "json",
                        headers: currentOptions.registerDataWithService 
                            ? { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                            : undefined
                    })
                    .done( done ).fail( fail )
                };
    
            submit( application, calculationOptions, submitDone, submitFailed );
        }

        getResultRow<T>( table: string, key: string, columnToSearch?: string ): T | undefined { 
            const application = this.application;
            const rows = application.results?.[table];

            if (rows === undefined) return undefined;

            const rowLookups = application.resultRowLookups || ( application.resultRowLookups = {} );

            const lookupKey = table + (columnToSearch ?? "");
            const lookupColumn = columnToSearch ?? "@id";
            
            let lookupInfo = rowLookups[ lookupKey ];

            if (lookupInfo === undefined) {
                rowLookups[lookupKey] = lookupInfo = {
                    LastRowSearched: 0,
                    Mapping: {}
                };
            }

            let rowIndex = lookupInfo.Mapping[key];

            if (rowIndex === undefined) {
                for (let i = lookupInfo.LastRowSearched; i < rows.length; i++) {
                    const rowId = rows[i][lookupColumn];
                    lookupInfo.Mapping[rowId] = i;
                    lookupInfo.LastRowSearched++;

                    if (rowId === key) {
                        rowIndex = i;
                        break;
                    }
                }
            }

            if (rowIndex !== undefined) {
                return rows[ rowIndex ];
            }

            return undefined;
        }

        getResultValue( table: string, key: string, column: string, defaultValue?: string ): string | undefined { 
            return this.getResultRow<JSON>( table, key )?.[ column ] ?? defaultValue;
        }

        getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined {
            return this.getResultRow<JSON>( table, key, keyColumn)?.[ column ] ?? defaultValue;
        };

		getResultTable<T>( tableName: string): Array<T> {
            const application = this.application;
            if ( application?.results === undefined ) return [];

            let tableKey = tableName;

			const resultKeys = application.results["@resultKeys"] as string[];

			if (tableKey === "*") {
				const result: T[] = [];

				resultKeys.forEach(key => {
					let table = application.results?.[key];

					if (table instanceof Array) {
						table = $.merge(result, table);
					}
				});

				return result;
			}

			if (application.results[tableKey] === undefined) {
				// Find property name case insensitive
				resultKeys.forEach(key => {
					if (key.toUpperCase() === tableName.toUpperCase()) {
						tableKey = key;
						return false;
					}
				});
			}

			return application.results[tableKey] as Array<T> ?? [];
		}

        injectTemplate( target: JQuery<HTMLElement>, template: { Content: string; Type: string | undefined } | undefined ): void {
            target.removeAttr("rbl-template-type");

            if ( template === undefined ) {
                target.html("");
            }
            else {
                target.html( template.Content );
                if ( template.Type !== undefined ) {
                    target.attr("rbl-template-type", template.Type);
                }
            }
        }

        getTemplate( templateId: string, data: JQuery.PlainObject ): { Content: string; Type: string | undefined } | undefined {
            const application = this.application;
            // Look first for template overriden directly in markup of view
            let template = $("rbl-template[tid=" + templateId + "]", application.element).first();

            // Now try to find template given precedence of views provided (last template file given highest)
            if ( application.options.viewTemplates != undefined ) {
                application.options.viewTemplates
                    .split(",")
                    .reverse()
                    .forEach( tid => {
                        if ( template.length === 0 ) {
                            template = $("rbl-templates[rbl-t='" + tid.toLowerCase() + "'] rbl-template[tid='" + templateId + "']").first();
                        }    
                    })
            }

            if ( template.length === 0 ) {
                application.trace( "Invalid template id: " + templateId, TraceVerbosity.Quiet);
                return undefined;
            }
            else {
                return {
                    Type: template.attr("type"),
                    Content: 
                        template
                            .html()
                            .format( KatApp.extend({}, data, { id: application.id } ) )
                            .replace( " _id", " id" ) // changed templates to have _id so I didn't get browser warning about duplicate IDs inside *template markup*
                }
            }
        }
    
        createHtmlFromResultRow( resultRow: HtmlContentRow, processBlank: boolean ): void {
            const view = this.application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            const selector = this.ui.getJQuerySelector( resultRow.selector ) ?? this.ui.getJQuerySelector( resultRow["@id"] ) ?? "";

            if (( processBlank || content.length > 0 ) && selector.length > 0) {

                let target = $(selector, view);

                if ( target.length > 0 ) {

                    if ( target.length === 1 ) {
                        target = this.ui.getAspNetCheckboxLabel( target ) ?? target;
                    }

                    if ( content.startsWith("&") ) {
                        content = content.substr(1);
                    }
                    else {
                        target.empty();
                    }
    
                    if ( content.length > 0 ) {
                        if ( content.startsWith("<") ) {
                            const el = $(content);
                            const templateId = el.attr("rbl-tid");
                            
                            if (templateId !== undefined) {
                                //Replace content with template processing, using data-* items in this pass
                                this.injectTemplate( el, this.getTemplate( templateId, el.data() ) );
                            }
                            
                            // Append 'templated' content to view
                            el.appendTo($( selector, view ));    
                        }
                        else {
                            target.append(content);
                        }
                    }
                }
            }
        }

        getRblSelectorValue( tableName: string, selectorParts: string[] ): string | undefined {
            if ( selectorParts.length === 1 ) 
            {
                return this.getResultValue( tableName, selectorParts[0], "value") ??
                    ( this.getResultRow<JSON>( tableName, selectorParts[0] ) !== undefined ? "" : undefined );
            }
            else if (selectorParts.length === 3) 
            {
                return this.getResultValue( selectorParts[0], selectorParts[1], selectorParts[2]) ??
                    ( this.getResultRow<JSON>( selectorParts[0], selectorParts[1] ) !== undefined ? "" : undefined );
            }
            else if (selectorParts.length === 4) 
            {
                return this.getResultValueByColumn( selectorParts[0], selectorParts[1], selectorParts[2], selectorParts[3]) ??
                    ( this.getResultRow<JSON>( selectorParts[0], selectorParts[2], selectorParts[1] ) !== undefined ? "" : undefined );
            }
            else {
                this.application.trace( "Invalid selector length for [" + selectorParts.join(".") + "].", TraceVerbosity.Quiet );
                return undefined;
            }
        }
        
        processRblValues(): void {
            const that: RBLeUtilities = this;
            const application = this.application;

            //[rbl-value] inserts text value of referenced tabdef result into .html()
            $("[rbl-value]", application.element).each(function () {
                const el = $(this);
                const rblValueParts = el.attr('rbl-value')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                const value = that.getRblSelectorValue( "ejs-output", rblValueParts );

                if ( value != undefined ) {
                    $(this).html( value );
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Minimal);
                }
            });
        }

        processRblSources(): void {
            const that: RBLeUtilities = this;
            const application = this.application;
            
            //[rbl-source] processing templates that use rbl results
            $("[rbl-source], [rbl-source-table]", application.element).each(function () {
                const el = $(this);

                // TOM - Need some flow documentation here, can't really picture entire thing in my head
                if ( el.attr("rbl-configui") === undefined || application.calculationInputs?.iConfigureUI === 1 ) {

                    const elementData = el.data();
                    const tid = el.attr('rbl-tid');
                    const rblSourceTableParts = el.attr('rbl-source-table')?.split('.');
                    const rblSourceParts = rblSourceTableParts === undefined
                        ? el.attr('rbl-source')?.split('.')
                        : rblSourceTableParts.length === 3
                            ? [ that.getResultValue( rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ] ) ?? "unknown" ]
                            : [ that.getResultValueByColumn( rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ], rblSourceTableParts[ 3 ] ) ?? "unknown" ];

                    // TOM (don't follow this code) - inline needed for first case?  What does it mean if rbl-tid is blank?  Need a better attribute name instead of magic 'empty' value
                    const inlineTemplate = tid === undefined ? $("[rbl-tid]", el ) : undefined;
                    const templateContent = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $( inlineTemplate.prop("outerHTML").format( elementData) ).removeAttr("rbl-tid").prop("outerHTML")
                        : that.getTemplate( tid, elementData )?.Content; 

                    if ( templateContent === undefined ) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found: [" + tid + "].", TraceVerbosity.Minimal);
                    }
                    else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no rbl-source data", TraceVerbosity.Quiet);
                    }
                    else if ( rblSourceParts.length === 1 || rblSourceParts.length === 3 ) {
                        
                        //table in array format.  Clear element, apply template to all table rows and .append
                        const table = that.getResultTable<JSON>( rblSourceParts[0] );
                        
                        if ( table !== undefined && table.length > 0 ) {
                            
                            el.children( ":not(.rbl-preserve, [rbl-tid='inline'])" ).remove();
                            const prepend = el.attr('rbl-prepend') === "true";

                            let i = 1;

                            table.forEach( row => {
                                
                                if ( rblSourceParts.length === 1 || row[ rblSourceParts[ 1 ] ] === rblSourceParts[ 2 ] ) {
                                    const templateData = KatApp.extend( {}, row, { _index0: i - 1, _index1: i++ } )

                                    if ( prepend ) {
                                        el.prepend( templateContent.format( templateData ) );    
                                    }
                                    else {
                                        el.append( templateContent.format( templateData ) );    
                                    }
                                }

                            })

                        } else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    } else if ( rblSourceParts.length === 2 ) {

                        const row = that.getResultRow( rblSourceParts[0], rblSourceParts[1] );
                        
                        if ( row !== undefined ) {
                            el.html( templateContent.format( row ) );
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    }
                    else if ( rblSourceParts.length === 3 ) {
                        
                        const value = that.getResultValue( rblSourceParts[0], rblSourceParts[1], rblSourceParts[2]);
                        
                        if ( value !== undefined ) {
                            el.html( templateContent.format( { "value": value } ) );                                    
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    }
            
                }
            });
        }

        processVisibilities(): void {
            const that: RBLeUtilities = this;
            const application = this.application;

            // toggle visibility
            //[rbl-display] controls display = none|block(flex?).  
            //Should this be rbl-state ? i.e. other states visibility, disabled, delete
            $("[rbl-display]", application.element).each(function () {
                const el = $(this);

                //legacy table is ejs-visibility but might work a little differently
                const rblDisplayParts = el.attr('rbl-display')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                //check to see if there's an "=" for a simple equality expression
                const expressionParts = rblDisplayParts[ rblDisplayParts.length - 1].split('=');
                rblDisplayParts[ rblDisplayParts.length - 1] = expressionParts[0];
                
                let visibilityValue: string | undefined = that.getRblSelectorValue( "ejs-output", rblDisplayParts );

                if (visibilityValue != undefined) {
                    if ( expressionParts.length > 1) {
                        visibilityValue = ( visibilityValue == expressionParts[1] ) ? "1" : "0"; //allows table.row.value=10
                    }

                    if (visibilityValue === "0" || visibilityValue.toLowerCase() === "false" || visibilityValue === "") {
                        el.hide();
                    }
                    else {
                        el.show();
                    }
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Diagnostic);
                }
            });

            // Legacy, might not be needed
            const visibilityRows = this.getResultTable<RBLeDefaultRow>( "ejs-visibility" );
            visibilityRows.forEach( row => {
                const selector = this.ui.getJQuerySelector( row["@id"] );
                if ( selector !== undefined ) {
                    if (row.value === "1") {
                        $(selector, application.element).show();
                    }
                    else {
                        $(selector, application.element).hide();
                    }
                }
            });
        }

        processRblDatas(): void {
            // Legacy, might not be needed
            const dataRows = this.getResultTable<RBLeRowWithId>( "ejs-rbl-data" );
            const application = this.application;

            if ( dataRows.length > 0 ) {
                const propertyNames = Object.keys(dataRows[ 0 ]).filter( k => !k.startsWith( "@" ) );

                dataRows.forEach( row => {
                    const selector = this.ui.getJQuerySelector( row["@id"] );

                    if ( selector !== undefined ) {
                        const el = $(selector, application.element);
                        propertyNames.forEach( a => {
                            const value = row[ a ];

                            if (value ?? "" !== "") {
                                el.data("rbl-" + a, value);
                            }
                            else {
                                el.removeData("rbl-" + a);
                            }
                        });
                    }
                });
            }
        }

        processRBLSkips(): void {
            // Legacy, might not be needed (what class do you want me to drop in there)
            const skipRows = this.getResultTable<RBLeRowWithId>( "skip-RBLe" );
            const application = this.application;

            skipRows.forEach( row => {
                const selector = this.ui.getJQuerySelector( row["key"] || row["@id"] );
                if ( selector !== undefined ) {
                    const el = $(selector, application.element);
                    
                    el.addClass("skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");

                    this.ui.getNoUiSlider(selector.substring(1), application.element)?.off('set.RBLe');
                }
            });
        }

        setDefaultValue( id: string, value: string | undefined ): void {
            const selector = this.ui.getJQuerySelector( id );

            if ( selector !== undefined ) {
                value = value ?? "";
                const input = $(selector, this.application.element).not("div");
                const isCheckboxList = input.hasClass("checkbox-list-horizontal");
                const aspCheckbox = this.ui.getAspNetCheckboxInput(input);
                const radioButton = input.find("input[value='" + value + "']");
                const noUiSlider = this.ui.getNoUiSlider(id, this.application.element);

                if ( noUiSlider !== undefined ) {
                    const sliderContainer = this.ui.getNoUiSliderContainer(id, this.application.element);
                    if ( sliderContainer !== undefined )
                    {
                        sliderContainer.data("setting-default", 1); // No way to set slider without triggering calc, so setting flag
                    }
                    input.val(value);
                    noUiSlider.set(Number(value));
                    if ( sliderContainer !== undefined )
                    {
                        sliderContainer.removeData("setting-default");
                    }
                }
                else if ( isCheckboxList ) {
                    // turn all off first
                    $("input", input).each((_index, element) => {
                        const cb = this.ui.getAspNetCheckboxInput($(element).parent() /* containing span from asp.net checkbox */);
                        if (cb !== undefined) {
                            cb.prop("checked", false);
                        }
                    });

                    const values = value.split(",");
                    for (let k = 0; k < values.length; k++) {
                        const checkKey = values[k].trim();
                        const checkbox = $("*[data-input-name='" + id + checkKey + "']", this.application.element); // selects span from asp.net checkbox
                        const cb = this.ui.getAspNetCheckboxInput(checkbox);
                        if (cb !== undefined) {
                            cb.prop("checked", true);
                        }
                    }
                }
                else if ( radioButton.length === 1 ) {
                    radioButton.prop("checked", true);
                }
                else if ( aspCheckbox !== undefined ) {
                    aspCheckbox.prop("checked", value === "1");
                }
                else if ( input.length > 0 ) {
                    input.val( input[ 0 ].hasAttribute( "multiple" ) ? value.split("^") : value );

                    // In case it is bootstrap-select
                    const isSelectPicker = input.attr("data-kat-bootstrap-select-initialized") !== undefined;
                    if (isSelectPicker) {
                        input.selectpicker("refresh");
                    }
                }
            }
        }
    
        processDefaults(): void {
            const defaultRows = this.getResultTable<RBLeDefaultRow>( "ejs-defaults" );

            defaultRows.forEach( row => {
                const id = row["@id"];
                this.setDefaultValue(id, row.value);
            });
        }

        processDisabled(): void {
            const disabledRows = this.getResultTable<RBLeDefaultRow>( "ejs-disabled" );
            const application = this.application;

            disabledRows.forEach( row => {
                const selector = this.ui.getJQuerySelector( row["@id"] );

                if ( selector !== undefined ) {
                    // @id - regular input
                    // @id input - checkbox
                    // slider-@id - noUiSlider
                    const value = row.value ?? "";
                    const input = $(selector + ", " + selector + " input", application.element);
                    const slider = this.ui.getNoUiSliderContainer( row["@id"], application.element );

                    if (slider !== undefined) {
                        if (value === "1") {
                            slider.attr("disabled", "true").removeAttr("kat-disabled");
                        }
                        else {
                            slider.removeAttr("disabled");
                        }
                    }
                    else {
                        if (value === "1") {
                            input.prop("disabled", true).removeAttr("kat-disabled");
                        }
                        else {
                            input.prop("disabled", false);
                        }
    
                        if (input.hasClass("bootstrap-select")) {
                            input.selectpicker('refresh');
                        }
                    }
                }
            });
        }

        private createResultTableElement(value: string, elementName: string, cssClass?: string): string {
            return "<{name}{class}>{value}</{nameClose}>".format(
                {
                    name: elementName,
                    class: (cssClass !== undefined && cssClass !== "" ? " class=\"" + cssClass + "\"" : ""),
                    value: value, 
                    // Not sure what would be in elementName with a space in it, but just bringing over legacy code
                    nameClose: elementName.split(" ")[0]
                }
            );
        }

        private getResultTableValue( row: ResultTableRow, columnName: string ): string {
            // For the first row of a table, if there was a width row in CE, then each 'column' has text and @width attribute,
            // so row[columnName] is no longer a string but a { #text: someText, @width: someWidth }.  This happens during process
            // turning the calculation into json.  http://www.newtonsoft.com/json/help/html/convertingjsonandxml.htm
            return typeof (row[columnName]) === "object"
                ? row[columnName]["#text"] ?? ""
                : row[columnName] ?? ""
        }

        private getCellMarkup(row: ResultTableRow, columnName: string, element: string, columnClass: string, colSpan?: number): string {
            const value = this.getResultTableValue( row, columnName );

            if (colSpan !== undefined) {
                element += " colspan=\"" + colSpan + "\"";
            }
            return this.createResultTableElement(value, element, columnClass);
        };

        // If only one cell with value and it is header, span entire row
        private getHeaderSpanCellName(row: ResultTableRow): string | undefined {
            const keys = Object.keys(row);
            const values = keys
                .filter(k => k.startsWith("text") || k.startsWith("value"))
                .map(k => ({ Name: k, Value: this.getResultTableValue(row, k) }))
                .filter(c => c.Value !== "");

            return values.length === 1 ? values[0].Name : undefined;
        };

        processTables(): void {
            const application = this.application;
            const view = application.element;
            const that: RBLeUtilities = this;

            $("[rbl-tid='result-table']", view).each(function ( i, r ) {
                const tableName = r.getAttribute( "rbl-tablename" );

                if ( tableName !== null ) {
                    const configRow = application.getResultTable<ContentsRow>( "contents" ).filter( r => r.section === "1" && KatApp.stringCompare( r.type, "table", true ) === 0 && r.item === tableName ).shift();
                    const configCss = configRow?.class;
                    let tableCss = configCss === undefined
                        ? "table table-striped table-bordered table-condensed rbl " + tableName
                        : "rbl " + tableName + " " + configCss;
    
                    const tableRows = application.getResultTable<ResultTableRow>( tableName );

                    if ( tableRows.length === 0 ) {
                        return;
                    }

                    const tableConfigRow = tableRows[ 0 ];
                    const includeAllColumns = false; // This is a param in RBLe.js
                    const hasResponsiveTable = tableCss.indexOf("table-responsive") > -1;
                    tableCss = tableCss.replace("table-responsive", "");

                    const tableColumns = 
                        Object.keys(tableConfigRow)
                            .filter(k => k.startsWith("text") || k.startsWith("value") || (includeAllColumns && k !== "@name"))
                            .map(k => (
                                { 
                                    Name: k, 
                                    Element: tableConfigRow[k], 
                                    Width: tableConfigRow[k][hasResponsiveTable ? "@r-width" : "@width"] 
                                })
                            )
                            .map(e => ({
                                name: e.Name,
                                isTextColumn: e.Name.startsWith("text"),
                                cssClass: e.Element["@class"],
                                width: e.Width !== undefined && !e.Width.endsWith("%") ? + e.Width : undefined,
                                widthPct: e.Width !== undefined && e.Width.endsWith("%") ? e.Width : undefined,
                                xsColumns: e.Element["@xs-width"] || (hasResponsiveTable ? e.Element["@width"] : undefined),
                                smColumns: e.Element["@sm-width"],
                                mdColumns: e.Element["@md-width"],
                                lgColumns: e.Element["@lg-width"]
                            }) as ResultTableColumnConfiguration );
                    
                    const columnConfiguration: { 
                        [ key: string ]: ResultTableColumnConfiguration;
                    } = {};
                
                    tableColumns.forEach( c => {
                        columnConfiguration[ c.name ] = c;
                    });

                    const hasBootstrapTableWidths = tableColumns.filter(c => c.xsColumns !== undefined || c.smColumns !== undefined || c.mdColumns !== undefined || c.lgColumns !== undefined).length > 0;

                    let colGroupDef: string | undefined = undefined; // This was an optional param in RBLe

                    if ( colGroupDef === undefined ) {
                        colGroupDef = "";

                        tableColumns.forEach(c => {
                            const isFixedWidth = !hasBootstrapTableWidths || hasResponsiveTable;
    
                            const width = isFixedWidth && (c.width !== undefined || c.widthPct !== undefined)
                                ? " width=\"{width}\"".format( { width: c.widthPct || (c.width + "px") })
                                : "";
    
                            let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
                            bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
                            bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
                            bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";
    
                            colGroupDef += "<col class=\"{table}-{column}{bsClass}\"{width} />".format(
                                {
                                    table: tableName,
                                    column: c.name,
                                    bsClass: !isFixedWidth ? bsClass : "",
                                    width: width
                                }
                            );
                        });
                    }

                    const colGroup = that.createResultTableElement(colGroupDef, "colgroup");

                    let headerHtml = "";
                    let bodyHtml = "";

                    let needBootstrapWidthsOnEveryRow = false;
                    // const includeBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;

                    tableRows.forEach( row => {
                        const code = row["code"] ?? "";
                        const id = row["@id"] ?? "";
                        const isHeaderRow = 
                            (code === "h" || code.startsWith("header") || code.startsWith("hdr") ) ||
                            (id === "h" || id.startsWith("header") || id.startsWith("hdr"));

                        const element = isHeaderRow ? "th" : "td";
                        const rowClass = row["@class"] ?? row["class"];
                        const span = that.getResultTableValue(row, "span");

                        let rowHtml = "";
                        let headerSpanCellName: string | undefined = "";
    
                        if (isHeaderRow && span === "" && (headerSpanCellName = that.getHeaderSpanCellName(row)) !== undefined) {
                            // Need bootstraps on every row if already set or this is first row
                            needBootstrapWidthsOnEveryRow = needBootstrapWidthsOnEveryRow || i === 0;
    
                            const hClass = (columnConfiguration[headerSpanCellName].isTextColumn ? "text" : "value") + " span-" + headerSpanCellName;
                            rowHtml += that.getCellMarkup(row, headerSpanCellName, element, hClass, tableColumns.length);
                        }
                        else if (span !== "") {
                            // Need bootstraps on every row if already set or this is first row
                            needBootstrapWidthsOnEveryRow = needBootstrapWidthsOnEveryRow || i === 0;

                            const parts = span.split(":");
                            
                            for (let p = 0; p < parts.length; p++) {
                                if (p % 2 === 0) {
                                    const colSpan = +parts[p + 1];
    
                                    const colSpanName = parts[p];
                                    const spanConfig = columnConfiguration[colSpanName];
                                    const textCol = spanConfig.isTextColumn;
    
                                    let sClass = spanConfig.cssClass ?? "";
                                    sClass += (textCol ? " text" : " value ");
    
                                    rowHtml += that.getCellMarkup(row, colSpanName, element, sClass, /* includeBootstrapColumnWidths, */ colSpan);
                                }
                            }
                        }
    					else {
                            tableColumns.forEach(c => {
                                let cClass = c.cssClass ?? "";
                                cClass += (c.isTextColumn ? " text" : " value");
                                rowHtml += that.getCellMarkup(row, c.name, element, cClass /*, includeBootstrapColumnWidths && (needBootstrapWidthsOnEveryRow || i === 0) */ );
                            });
                        }    

                        if (isHeaderRow && bodyHtml === "") {
                            headerHtml += that.createResultTableElement(rowHtml, "tr", rowClass);
                        }
                        else {
                            bodyHtml += that.createResultTableElement(rowHtml, "tr", rowClass);
                        }
                    });
                    
                    const tableHtml = that.createResultTableElement(
                        colGroup + 
                        ( headerHtml !== "" 
                            ? that.createResultTableElement(headerHtml, "thead") 
                            : ""
                        ) + that.createResultTableElement(bodyHtml, "tbody"),
                        "table border=\"0\" cellspacing=\"0\" cellpadding=\"0\"",
                        tableCss
                    );
    
                    const html = hasResponsiveTable
                        ? that.createResultTableElement(tableHtml, "div", "table-responsive")
                        : tableHtml;

                    $(r).empty().append($(html));
                }
            });
        }

        processCharts(): void {
            const view = this.application.element;
            const highchartsBuilder: HighchartsBuilder = $.fn.KatApp.highchartsBuilderFactory( this.application );

            if ( typeof Highcharts !== "object" && $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view).length > 0 ) {
                this.application.trace("Highcharts javascript is not present.", TraceVerbosity.None);
                return;
            }            

            $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view).each(function () {
                highchartsBuilder.buildChart( $(this) );
            });
        }

        private addValidationItem(summary: JQuery<HTMLElement>, input: JQuery<HTMLElement> | undefined, message: string): void {
            let ul = $("ul", summary);
            if (ul.length === 0) {
                summary.append("<br/><ul></ul>");
                ul = $("ul", summary);
            }

            // Backward compat to remove validation with same id as input, but have changed it to 
            // id + Error so that $(id) doesn't get confused picking the li item.
            const inputName = input !== undefined ? this.ui.getInputName(input) : "undefined";
            $("ul li." + inputName + ", ul li." + inputName + "Error", summary).remove();
            ul.append("<li class=\"rble " + inputName + "Error\">" + message + "</li>");

            if ( input !== undefined ) {
                const isWarning = summary.hasClass("ModelerWarnings");
                const validationClass = isWarning ? "warning" : "error";
                const valContainer = input.closest('.validator-container').addClass(validationClass);
    
                const errorSpan = valContainer.find('.error-msg')
                    .attr('data-original-title', message)
                    .empty();
    
                $("<label/>").css("display", "inline-block")
                    .addClass(validationClass)
                    .text(message)
                    .appendTo(errorSpan);
            }
        };

        private processValidationRows(summary: JQuery<HTMLElement>, errors: ValidationRow[]): void {
			// Remove all RBLe client side created errors since they would be added back
			$("ul li.rble", summary).remove();

			if (errors.length > 0) {
                errors.forEach( r => {
                    const selector = this.ui.getJQuerySelector( r["@id"] );
                    const input = selector !== undefined ? $(selector, this.application.element) : undefined;
					this.addValidationItem(summary, input, r.text);
                });

				if ($("ul li", summary).length === 0) {
					summary.hide();
				}
				else {
                    summary.show();
					$("div:first", summary).show();
				}
			}
			else if ($("ul li:not(.rble)", summary).length === 0) {
                // Some server side calcs add error messages..if only errors are those from client calcs, I can remove them here
                summary.hide();
                $("div:first", summary).hide();
			}
        }

        processValidations(): void {
            const view = this.application.element;
            const warnings = this.getResultTable<ValidationRow>( "warnings" );
            const errors = this.getResultTable<ValidationRow>( "errors" );
            const errorSummary = $(".ModelerValidationTable", view);
            let warningSummary = $(".ModelerWarnings", view);

            // TODO: See Bootstrap.Validation.js - need to process server side validation errors to highlight the input correctly

            if (warnings.length > 0 && warningSummary.length === 0 && errorSummary.length > 0 ) {
                    // Warning display doesn't exist yet, so add it right before the error display...shouldn't have errors and warnings at same time currently...
                    warningSummary = $("<div class=\"ModelerWarnings\"><div class=\"alert alert-warning\" role=\"alert\"><p><span class=\"glyphicon glyphicon glyphicon-warning-sign\" aria-hidden=\"true\"></span> <span class=\"sr-only\">Warnings</span> Please review the following warnings: </p></div></div>");
                    $(warningSummary).insertBefore(errorSummary);
            }            

            $('.validator-container.error:not(.server)', view).removeClass('error');
            $('.validator-container.warning:not(.server)', view).removeClass('warning');

            this.processValidationRows(warningSummary, warnings);
            this.processValidationRows(errorSummary, errors);

            if ( this.application.calculationInputs?.iConfigureUI === 1 ) {
            /*
                // Scroll target will probably need some work
				if ($(".ModelerWarnings.alert ul li", view).length > 0 && warnings.length > 0) {
					$('html, body').animate({
						scrollTop: $(".ModelerWarnings.alert", view).offset().top - 30
					}, 1000);
				}
				else if ($(".ModelerValidationTable.alert ul li", view).length > 0 && errors.length > 0) {
					$('html, body').animate({
						scrollTop: $(".ModelerValidationTable.alert", view).offset().top - 30
					}, 1000);
				}
            */
            }
        }

        processSliders(): void {
            const sliderRows = this.getResultTable<SliderConfigurationRow>( "ejs-sliders" );
            const application = this.application;
            
            if ( application.calculationInputs?.iConfigureUI === 1 ) {
                const configIds: ( string | null )[] = sliderRows.map( r => r["@id"]);
                $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', application.element)
                    .filter( ( i, r ) => {
                        return configIds.indexOf( r.getAttribute( "data-inputname" ) ) < 0;
                    })
                    .each( ( i, r ) => {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider configuration can be found for " + r.getAttribute( "data-inputname" ) + ".", TraceVerbosity.None);
                    });
            }

            if ( typeof noUiSlider !== "object" && sliderRows.length > 0 ) {
                application.trace("noUiSlider javascript is not present.", TraceVerbosity.None);
                return;
            }

            sliderRows.forEach( config => {
                const id = config["@id"];

                const sliderJQuery = $(".slider-" + id, application.element);

                if ( sliderJQuery.length !== 1 ) {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id + ".", TraceVerbosity.Minimal);
                }
                else {
                    const minValue = Number( config.min );
                    const maxValue = Number( config.max );
        
                    const input = $("." + id, application.element);
        
                    const defaultConfigValue =
                        this.getResultValue("ejs-defaults", id, "value") || // what is in ejs-defaults
                        config.default || // what was in ejs-slider/default
                        input.val() || // what was put in the text box
                        config.min; //could/should use this
        
                    const stepValue = Number( config.step || "1" );
                    const format = config.format || "n";
                    const decimals = Number( config.decimals || "0");
        
                    // Set hidden textbox value
                    input.val(defaultConfigValue);
        
                    const slider = sliderJQuery[0] as noUiSlider.Instance;
        
                    sliderJQuery.data("min", minValue);
                    sliderJQuery.data("max", maxValue);
        
                    // Some modelers have 'wizards' with 'same' inputs as regular modeling page.  The 'wizard sliders'
                    // actually just set the input value of the regular input and let all the other flow (main input's
                    // change event) happen as normal.
                    const targetInput = sliderJQuery.data("input");
        
                    const defaultSliderValue = targetInput != undefined
                        ? $("." + targetInput, application.element).val() as string
                        : defaultConfigValue;
        
                    const pipsMode = config["pips-mode"] ?? "";
                    const pipValuesString = config["pips-values"] ?? "";
                    const pipsLargeValues = pipValuesString !== "" ? pipValuesString.split(',').map(Number) : [0, 25, 50, 75, 100];
                    const pipsDensity = Number(config["pips-density"] || "5");
        
                    const pips = pipsMode !== ""
                        ? {
                            mode: pipsMode,
                            values: pipsLargeValues,
                            density: pipsDensity,
                            stepped: true
                        } as noUiSlider.PipsOptions
                        : undefined;
        
                    const sliderOptions: noUiSlider.Options = {
                        start: Number( defaultSliderValue ),
                        step: stepValue * 1,
                        behaviour: 'tap',
                        connect: 'lower',
                        pips: pips,
                        range: {
                            min: minValue,
                            max: maxValue
                        },
                        animate: true
                    };
        
                    let instance = slider.noUiSlider;
                    
                    if (instance !== undefined) {
                        // No way to update options triggering calc in old noUiSlider library, so setting flag.
                        // Latest library code (10.0+) solves problem, but leaving this code in for clients
                        // who don't get updated and published with new library.
                        $(slider).data("setting-default", 1);
                        instance.updateOptions(sliderOptions, false);
                        $(slider).removeData("setting-default");
                    }
                    else {
                        instance = noUiSlider.create(
                            slider,
                            sliderOptions
                        );
        
                        // Hook up this event so that the label associated with the slider updates *whenever* there is a change.
                        // https://refreshless.com/nouislider/events-callbacks/

                        instance.on('update.RBLe', function ( this: noUiSlider.noUiSlider ) {
                            const value = Number( this.get() as string );
        
                            input.val(value);
                            const v = format == "p" ? value / 100 : value;
                            $("." + id + "Label, .sv" + id, application.element).html( String.localeFormat("{0:" + format + decimals + "}", v) );
                        });
        
                        if ( !input.is(".skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input") ) {
                            if (targetInput === undefined /* never trigger run from wizard sliders */) {
        
                                // Whenever 'regular' slider changes or is updated via set()...
                                instance.on('set.RBLe', function ( this: noUiSlider.noUiSlider ) {
        
                                    const settingDefault = $(this.target).data("setting-default") === 1;
        
                                    if (!settingDefault && application.options !== undefined) {
                                        application.calculate( { manualInputs: { iInputTrigger: id } });
                                    }
        
                                });
                            }
                            else {
                                // When wizard slider changes, set matching 'regular slider' value with same value from wizard
                                instance.on('change.RBLe', function ( this: noUiSlider.noUiSlider ) {
                                    const value = Number( this.get() as string );
                                    const targetSlider = $(".slider-" + targetInput, application.element);
                                    const targetSliderInstance = targetSlider.length === 1 ? targetSlider[0] as noUiSlider.Instance : undefined;
        
                                    if (targetSliderInstance?.noUiSlider !== undefined ) {
                                        targetSliderInstance.noUiSlider.set(value); // triggers calculation
                                    }
                                });
                            }
                        }
                    }
        
                    if (sliderOptions.pips !== undefined) {
                        sliderJQuery.parent().addClass("has-pips");
                    }
                    else {
                        sliderJQuery.parent().removeClass("has-pips");
                    }
                }
            });
        }

        processListControls(): void {
            const application = this.application;
            const ui = this.ui;
            const configRows = this.getResultTable<ListControlRow>( "ejs-listcontrol" );

            configRows.forEach( row => {
				const tableName = row.table;
				const controlName = row["@id"];
				const listControl = $("." + controlName + ":not(div)", application.element);
				const isCheckboxList = $("." + controlName, application.element).hasClass("checkbox-list-horizontal");
				const isSelectPicker = !isCheckboxList && listControl.attr("data-kat-bootstrap-select-initialized") !== undefined;
				const selectPicker = isSelectPicker ? listControl : undefined;
				const currentValue = isCheckboxList
					? undefined
					: selectPicker?.selectpicker('val') ?? listControl.val();

                const listRows = this.getResultTable<ListRow>( tableName );

                listRows.forEach( ls => {
					const listItem = isCheckboxList
						? $(".v" + controlName + "_" + ls.key, application.element).parent()
                        : $("." + controlName + " option[value='" + ls.key + "']", application.element);
                        
                    if (ls.visible === "0") {
                        listItem.hide();

                        if (!isCheckboxList /* leave in same state */) {
                            if (currentValue === ls.key) {
                                if (selectPicker !== undefined) {
                                    selectPicker.selectpicker("val", "");
                                }
                                else {
                                    listControl.val("");
                                }
                            }
                        }
                    }
                    else {
                        if (listItem.length !== 0) {
                            listItem.show();
                        }
                        else if (!isCheckboxList /* for now they have to add all during iDataBind if checkbox list */) {
                            // This doesn't work in our normal asp: server controls b/c we get a invalid postback error since
                            // we added items only during client side.  I followed this post but as the comment says, the input will
                            // then have no value when posted back to server. So leaving it in, but only supports 'client side only' UIs
                            // https://stackoverflow.com/a/5144268/166231
                            const option = $("<option/>", {
                                value: ls.key,
                                text: ls.text
                            });
                            
                            if ( ( ls.class || "" ) != "" ) {
                                option.attr("class", ls.class || "");
                            }
                            if ( ( ls.subtext || "" ) != "" ) {
                                option.attr("data-subtext", ls.subtext || "");
                            }
                            if ( ( ls.html || "" ) != "" ) {
                                option.attr("data-content", ls.html || "");
                            }

                            listControl.append(option);
                        }
                    }
                });

				if (selectPicker !== undefined) {
                    selectPicker.selectpicker('refresh');
                    
                    // Need to re-bind the event handler for some reason.  Only had to bind once in .NET, but
                    // could be some side affect of .net loading list control on the server and everything is 'ready'
                    // before calling original bind.
                    listControl.not(skipBindingInputSelector).off(".RBLe").bind("change.RBLe", function () {
                        ui.changeRBLe($(this));
                    });
				}
            });
        }

        processResults(): boolean {
            const application = this.application;
            const results = application.results;

			// TOM (what does this comment mean): element content can be preserved with a class flag
			// TOM (what does this comment mean): generated content append or prepend (only applicably when preserved content)

            if ( results !== undefined ) {
                const calcEngineName = results["@calcEngine"];
                const version = results["@version"];
                application.trace( "Processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal );

                // Need two passes to support "ejs-markup" because the markup might render something that is then
                // processed by subsequent flow controls (ouput, sources, or values)
                const markUpRows = this.getResultTable<HtmlContentRow>( "ejs-markup" )
                markUpRows.forEach( r => { this.createHtmlFromResultRow( r, false ); });
                
                const outputRows = this.getResultTable<HtmlContentRow>( "ejs-output" )
                outputRows.forEach( r => { this.createHtmlFromResultRow( r, true ); });

                this.processRblSources();
                this.processRblValues();

                // apply dynamic classes after all html updates (TOM: (this was your comment...) could this be done with 'non-template' build above)
                markUpRows.forEach( r => {
                    if ( r.selector !== undefined ) {
                        if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                            const el = $(r.selector, application.element);
                            el.addClass(r.addclass);

                            if ( r.addclass.indexOf("skipRBLe") > -1 || r.addclass.indexOf("rbl-nocalc") > -1 ) {
                                el.off(".RBLe");
                                $(":input", el).off(".RBLe");
                                this.ui.getNoUiSlider(r.selector.substring(1), application.element)?.off('set.RBLe');
                            }
                        }
    
                        if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                            $(r.selector, application.element).removeClass(r.removeclass);
                        }
                    }
                });

                // Need to re-run processUI here in case any 'templates' were injected from results and need their initial
                // data-* attributes/events processed.
                const templateBuilder: StandardTemplateBuilder = $.fn.KatApp.standardTemplateBuilderFactory( this.application );
                templateBuilder.processUI();

                this.processRblDatas();

                this.processVisibilities();

                this.processSliders()

                this.processRBLSkips();

                this.processListControls();
                
                this.processDefaults();

                this.processDisabled();

                this.processCharts();

                this.processTables();

                this.processValidations();

                application.trace( "Finished processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal );

                return true;
            }
            else {
                application.trace( "Results not available.", TraceVerbosity.Quiet );
                return false;
            }
        }
    }
    $.fn.KatApp.rble = function( application: KatAppPlugIn, uiUtilities: UIUtilities ): RBLeUtilities {
        return new RBLeUtilities( application, uiUtilities );
    };
    class HighchartsBuilder
    {
        highchartsOptions?: HighChartsOptionRow[];
        highchartsOverrides?: HighChartsOverrideRow[];
        highchartsData?: HighChartsDataRow[];
        highChartsDataName?: string;
        highChartsOptionsName?: string;

        application: KatAppPlugIn;

        constructor( application: KatAppPlugIn ) {
            this.application = application;    
        }

        stringCompare(strA: string | undefined, strB: string | undefined, ignoreCase: boolean): number {
            if (strA === undefined && strB === undefined) {
                return 0;
            }
            else if (strA === undefined) {
                return -1;
            }
            else if (strB === undefined) {
                return 1;
            }
            else if (ignoreCase) {
                return strA.toUpperCase().localeCompare(strB.toUpperCase());
            }
            else {
                return strA.localeCompare(strB);
            }
        };

        getHighchartsConfigValue( configurationName: string ): string | undefined {            
            // Look in override table first, then fall back to 'regular' options table
            return this.highchartsOverrides?.filter(r => this.stringCompare(r.key, configurationName, true) === 0).shift()?.value ??
                   this.highchartsOptions?.filter(r => this.stringCompare(r.key, configurationName, true) === 0).shift()?.value;
        }

        // Associated code with this variable might belong in template html/js, but putting here for now.
        firstHighcharts = true;
        ensureHighchartsCulture(): void {
            // Set some default highcharts culture options globally if this is the first chart I'm processing
            if ( this.firstHighcharts ){
                this.firstHighcharts = false;

                const culture = this.application.getResultValue("variable","culture","value") ?? "en-";
                if ( !culture.startsWith( "en-" ) ) {
                    Highcharts.setOptions(
                        {
                            yAxis: {
                                labels: {
                                    formatter: function ( this: HighchartsDataPoint ): string {
                                        return String.localeFormat("{0:c0}", this.value);
                                    }
                                },
                                stackLabels: {
                                    formatter: function ( this: HighchartsDataPoint ): string {
                                        return String.localeFormat("{0:c0}", this.value);
                                    }
                                }
                            }
                        } as HighchartsGlobalOptions );    
                }
            }
        }

		removeRBLEncoding(value: string | undefined): string | undefined {
			if (value === undefined) return value;

			// http://stackoverflow.com/a/1144788/166231
			/*
			function escapeRegExp(string) {
				return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
			}
			*/
			return value.replace(/<</g, "<")
				.replace(/&lt;&lt;/g, "<")
				.replace(/>>/g, ">")
				.replace(/&gt;&gt;/g, ">")
				.replace(/&quot;/g, "\"")
				.replace(/&amp;nbsp;/g, "&nbsp;");
		}


		getHighChartsOptionValue(value: string): string | boolean | number | (()=> void) | undefined {
			const d = Number(value);

			if (value === undefined || this.stringCompare(value, "null", true) === 0) return undefined;
			else if (!isNaN(d) && value !== "") return d;
			else if (this.stringCompare(value, "true", true) === 0) return true;
			else if (this.stringCompare(value, "false", true) === 0) return false;
			else if (value.startsWith("json:")) return JSON.parse(value.substring(5));
			else if (value.startsWith("var ")) {
				const v = value.substring(4);
				return function (): any { return eval(v); } // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			else if (value.startsWith("function ")) {
				const f = this.removeRBLEncoding("function f() {value} f.call(this);".format( { value: value.substring(value.indexOf("{")) } ));
				return function (): any { return eval(f!); } // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
			}
			else return this.removeRBLEncoding(value);
		}

        setHighChartsOption(optionsContainer: HighchartsOptions | HighchartsSeriesOptions, name: string, value: string): void {
			let optionJson = optionsContainer;
			const optionNames = name.split(".");
			const optionValue = this.getHighChartsOptionValue(value);

			// Build up a json object...
			// chart.title.text, Hello = { chart: { title: { text: "Hello } } }
			// annotations[0].labels[0], { point: 'series1.69', text: 'Life Exp' } = { annotations: [ { labels: [ { point: 'series1.69', text: 'Life Exp' } ] } ] }
			for (let k = 0; k < optionNames.length; k++) {
				let optionName = optionNames[k];
				let optionIndex = -1;

				if (optionName.endsWith("]")) {
					const nameParts = optionName.split("[");
					optionName = nameParts[0];
					optionIndex = parseInt(nameParts[1].substring(0, nameParts[1].length - 1));
				}

				const onPropertyValue = k === optionNames.length - 1;

				// When you are on the last name part, instead of setting it
				// to new {} object, set it appropriately to the value passed in CE
				const newValue = onPropertyValue
					? optionValue
					: {};

				// If doesn't exist, set it to new object or array
				if (optionJson[optionName] === undefined || onPropertyValue) {
					optionJson[optionName] = optionIndex > -1 ? [] : newValue;
				}
				// If property is an array and index isn't there yet, push a new element
				if (optionIndex > -1 && (optionJson[optionName] as Array<any>).length - 1 < optionIndex) { // eslint-disable-line @typescript-eslint/no-explicit-any
					(optionJson[optionName] as Array<any>).push(newValue); // eslint-disable-line @typescript-eslint/no-explicit-any
				}

				// Reset my local variable to the most recently added/created object
				optionJson = optionIndex > -1
					? optionJson[optionName][optionIndex]
					: optionJson[optionName];
			}
		}

        getHighChartsXAxisOptions( existingOptions: HighchartsAxisOptions | undefined, chartData: HighChartsDataRow[] ): HighchartsAxisOptions {
            const xAxis = existingOptions as HighchartsAxisOptions ?? {};
            xAxis.categories = chartData.map(d => this.removeRBLEncoding(d.category) ?? "");

            const plotInformation =
                chartData
                    .map((d, index) => ({ Index: index, PlotLine: d.plotLine ?? "", PlotBand: d.plotBand ?? "" }) as HighChartsPlotConfigurationRow)
                    .filter(r => r.PlotLine !== "" || r.PlotBand !== "");

            const plotLines: HighchartsPlotLines[] = [];
            const plotBands: HighchartsPlotBands[] = [];

            // Offset should be zero unless you want to adjust the line/band to draw between categories.  If you want to draw before the category, use -0.5.  If you want to draw after category, use 0.5
            // i.e. if you had a column at age 65 and wanted to plot band from there to end of chart, the band would start half way in column starting band 'between' 64 and 65 (i.e. 64.5) will make it so
            // whole bar is in span.
            plotInformation.forEach(row => {
                if (row.PlotLine !== "") {
                    const info = row.PlotLine.split("|");
                    const color = info[0];
                    const width = Number(info[1]);
                    const offset = info.length > 2 ? Number(info[2]) : 0;

                    const plotLine: HighchartsPlotLines = {
                        color: color,
                        value: row.Index + offset,
                        width: width,
                        zIndex: 1
                    };

                    plotLines.push(plotLine);
                }

                if (row.PlotBand !== "") {
                    const info = row.PlotBand.split("|");
                    const color = info[0];
                    const span = info[1];
                    const offset = info.length > 2 ? Number(info[2]) : 0;

                    const from = this.stringCompare(span, "lower", true) === 0 ? -1 : row.Index + offset;
                    const to =
                        this.stringCompare(span, "lower", true) === 0 ? row.Index + offset :
                        this.stringCompare(span, "higher", true) === 0 ? chartData.length :
                            row.Index + Number(span) + offset;

                    const plotBand: HighchartsPlotBands = {
                        color: color,
                        from: from,
                        to: to
                    };

                    plotBands.push(plotBand);
                }
            });

            if (plotLines.length > 0) {
                xAxis.plotLines = plotLines;
            }
            if (plotBands.length > 0) {
                xAxis.plotBands = plotBands;
            }
            return xAxis;
        }

        getHighchartsTooltipOptions( seriesColumns: string[], chartConfigurationRows: HighChartsDataRow[] ): HighchartsTooltipOptions | undefined {
            const tooltipFormat = this.removeRBLEncoding(this.getHighchartsConfigValue("config-tooltipFormat"));
            
            if ( tooltipFormat === undefined ) {
                return undefined;
            }

            // Get the 'format' configuration row to look for specified format, otherwise return c0 as default
            const configFormat = chartConfigurationRows.filter(c => c.category === "config-format").shift();

            const seriesFormats = seriesColumns
                        // Ensure the series/column is visible
                        .filter( seriesName => chartConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0 )
                        .map( seriesName => configFormat?.[seriesName] as string || "c0" );

            return {
                formatter: function ( this: HighchartsTooltipFormatterContextObject ) {
                    let s = "";
                    let t = 0;
                    const template = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
                        ? "<br/>{name} : {value}"
                        : "<br/>{name}: {value}";

                    this.points.forEach(point => {
                        if (point.y > 0) {

                            s += template.format( { name: point.series.name, value: String.localeFormat("{0:" + seriesFormats[0] + "}", point.y) });
                            t += point.y;
                        }
                    });
                    return tooltipFormat
                        .replace(new RegExp("\\{x\\}", "g"), String(this.x))
                        .replace(new RegExp("\\{stackTotal\\}", "g"), String.localeFormat("{0:" + seriesFormats[0] + "}", t))
                        .replace(new RegExp("\\{seriesDetail\\}", "g"), s);

                },
                shared: true
            } as HighchartsTooltipOptions;
        }

        getHighchartsOptions( firstDataRow: HighChartsDataRow ): HighchartsOptions {            
            const chartOptions: HighchartsOptions = {};

            // If chart has at least 1 data row and options/overrides arrays have been initialized
            if ( this.highchartsData !== undefined && this.highchartsOptions !== undefined && this.highchartsOverrides !== undefined ) {

                // First set all properties from the options/overrides rows
                const overrideProperties = this.highchartsOverrides.filter( r => !r.key.startsWith("config-"));
                this.highchartsOptions.concat(overrideProperties).forEach(optionRow => {
                    this.setHighChartsOption(chartOptions, optionRow.key, optionRow.value);
                });

                // Get series data
                const allChartColumns = Object.keys(firstDataRow);
                const seriesColumns = allChartColumns.filter( k => k.startsWith( "series" ) );
                const chartConfigurationRows = this.highchartsData.filter(e => e.category.startsWith("config-"));
                const chartData = this.highchartsData.filter(e => !e.category.startsWith("config-"));

                const chartType = this.getHighchartsConfigValue("chart.type");
                const isXAxisChart = chartType !== "pie" && chartType !== "solidgauge" && chartType !== "scatter3d" && chartType !== "scatter3d";

                chartOptions.series = this.getHighChartsSeries(allChartColumns, seriesColumns, chartConfigurationRows, chartData, isXAxisChart);

                if (isXAxisChart) {
                    chartOptions.xAxis = this.getHighChartsXAxisOptions( chartOptions.xAxis as HighchartsAxisOptions | undefined, chartData );
                }

                chartOptions.tooltip = this.getHighchartsTooltipOptions( seriesColumns, chartConfigurationRows ) ?? chartOptions.tooltip;
            }

            return chartOptions;
        }

        getHighChartsSeriesDataRow(row: HighChartsDataRow, allColumnNames: string[], seriesName: string, isXAxisChart: boolean): HighchartsDataPoint {
			// id: is for annotations so that points can reference a 'point name/id'
			// name: is for pie chart's built in highcharts label formatter and it looks for '.name' on the point

			const dataRow = { y: +row[seriesName], id: seriesName + "." + row.category } as HighchartsDataPoint;

			if (!isXAxisChart) {
				dataRow.name = row.category;
			}

            // Get all the 'data point' configuration values for the current chart data row
            // TODO: Get documentation here of some samples of when this is needed
			const pointColumnHeader = "point." + seriesName + ".";
            allColumnNames.filter( k => k.startsWith(pointColumnHeader) ).forEach( k => {
                dataRow[k.substring(pointColumnHeader.length)] = this.getHighChartsOptionValue(row[k]);
			});

			return dataRow;
		}

		getHighChartsSeries(allColumns: string[], seriesColumns: string[], chartConfigurationRows: HighChartsDataRow[], chartData: HighChartsDataRow[], isXAxisChart: boolean): HighchartsSeriesOptions[] {
			const seriesInfo: HighchartsSeriesOptions[] = [];

			seriesColumns.forEach(seriesName => {
				const isVisible = chartConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0;
				// Don't want series on chart or legend but want it in tooltip/chart data
				const isHidden = chartConfigurationRows.filter(c => c.category === "config-hidden" && c[seriesName] === "1").length > 0;

				if (isVisible) {
					const series: HighchartsSeriesOptions = {};
					const properties = chartConfigurationRows
						.filter(c => ["config-visible", "config-hidden", "config-format"].indexOf(c.category) === -1 && c[seriesName] !== undefined)
						.map(c => ({ key: c.category.substring(7), value: c[seriesName] } as HighChartsOptionRow));

					series.data = chartData.map(d => this.getHighChartsSeriesDataRow(d, allColumns, seriesName, isXAxisChart));

					properties.forEach(c => {
						this.setHighChartsOption(series, c.key, c.value);
					});

					if (isHidden) {
						series.visible = false;
						series.showInLegend = series.showInLegend ?? false;
					}

					seriesInfo.push(series);
				}
			});

			return seriesInfo;
		}

        buildChart(el: JQuery<HTMLElement>): JQuery {
            this.highChartsDataName = el.attr("rbl-chartdata");
            this.highChartsOptionsName = el.attr("rbl-chartoptions") ?? this.highChartsDataName;

            if ( this.highChartsDataName !== undefined && this.highChartsOptionsName !== undefined ) {
                this.ensureHighchartsCulture();
                const application = this.application;
                this.highchartsOverrides = application.getResultTable<HighChartsOverrideRow>("HighCharts-Overrides").filter( r => this.stringCompare(r["@id"], this.highChartsDataName, true) === 0);
                this.highchartsOptions = application.getResultTable<HighChartsOptionRow>("HighCharts-" + this.highChartsOptionsName + "-Options");
                this.highchartsData = application.getResultTable<HighChartsDataRow>("HighCharts-" + this.highChartsDataName + "-Data");

                const container = $(".chart", el);

                let renderStyle = container.attr("style") ?? "";
                const configStyle = this.getHighchartsConfigValue("config-style");
    
                if (configStyle !== undefined) {
                    if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                        renderStyle += ";";
                    }
                    container.attr("style", renderStyle + configStyle);
                }
                
                const firstDataRow = this.highchartsData.filter(r => !(r.category || "").startsWith("config-")).shift();
                const highchartKey = container.attr('data-highcharts-chart');
                const highchart = Highcharts.charts[ highchartKey ?? -1 ] as unknown as HighchartsChartObject;

                if ( highchart !== undefined ) {
                    highchart.destroy();                    
                }

                if ( firstDataRow !== undefined ) {
                    const chartOptions = this.getHighchartsOptions( firstDataRow );

                    try {
                        container.highcharts(chartOptions);
                    } catch (error) {
                        throw error;                        
                    }
                }
            }

            return el;
        }
    }
    $.fn.KatApp.highchartsBuilderFactory = function( application: KatAppPlugIn ): HighchartsBuilder {
        return new HighchartsBuilder( application );
    };

    class StandardTemplateBuilder /* implements StandardTemplateBuilderInterface*/
    {
        application: KatAppPlugIn;

        constructor( application: KatAppPlugIn ) {
            this.application = application;    
        }
        
        buildCarousel(el: JQuery): JQuery {
            const carouselName = el.attr("rbl-name");

            if (carouselName !== undefined && !carouselName.includes("{")) {
                this.application.trace("Processing carousel: " + carouselName, TraceVerbosity.Detailed);

                $(".carousel-inner .item, .carousel-indicators li", el).removeClass("active");

                //add active class to carousel items
                $(".carousel-inner .item", el).first().addClass("active");

                //add 'target needed by indicators, referencing name of carousel
                $(".carousel-indicators li", el)
                    .attr("data-target", "#carousel-" + carouselName)
                    .first().addClass("active");

                const carousel = $('.carousel', el);

                //show initial item, start carousel:
                carousel.carousel(0);
            }

            return el;
        }

        private processCarousels(): void {
            const that: StandardTemplateBuilder = this;
            const view = this.application.element;

            // Hook up event handlers only when *not* already initialized
            $('.carousel-control-group:not([data-katapp-initialized="true"])', view).each(function () {
                const el = $(this);
                const carousel = $('.carousel', el);
                const carouselAll = $('.carousel-all', el);

                //add buttons to show/hide
                $(".carousel-indicators .list-btn", el)
                    .click(function () {
                        carousel.hide();
                        carouselAll.show();
                    });

                $(".carousel-btn", carouselAll)
                    .click(function () {
                        carouselAll.hide();
                        carousel.show();
                    });

                el.attr("data-katapp-initialized", "true");
            });

            $('.carousel-control-group', view).each(function () {
                const el = $(this);
                that.buildCarousel( el );
            });
        }

        buildCheckboxes( view: JQuery<HTMLElement> ): void {
            $('[rbl-tid="input-checkbox"],[rbl-template-type="katapp-checkbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                const el = $(this);
                
                const id = el.data("inputname");
                const label = el.data("label");
                const checked = el.data("checked");
                const css = el.data("css");

                if ( css !== undefined ) {
                    $(".v" + id, el).addClass(css);
                }

                if ( label !== undefined ) {
                    $("span.l" + id + " label", el).html(label);
                }
                if ( checked ) {
                    $("span." + id + " input", el).prop("checked", true);
                }

                el.attr("data-katapp-initialized", "true");
            });
        }

        buildTextBoxes( view: JQuery<HTMLElement> ): void {
            $('[rbl-tid="input-textbox"],[rbl-template-type="katapp-textbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                const el = $(this);
                
                const id = el.data("inputname");
                const inputType = el.data("type")?.toLowerCase();
                const label = el.data("label");
                const prefix = el.data("prefix");
                const suffix = el.data("suffix");
                const placeHolder = el.data("placeholder");
                const maxlength = el.data("maxlength");
                const autoComplete = el.data("autocomplete") !== false;
                const value = el.data("value");
                const css = el.data("css");
                const inputCss = el.data("inputcss");
                const labelCss = el.data("labelcss");
                const displayOnly = el.data("displayonly") === true;

                if ( css !== undefined ) {
                    $(".v" + id, el).addClass(css);
                }

                if ( label !== undefined ) {
                    $("span.l" + id, el).html(label);
                }
                if ( labelCss !== undefined ) {
                    $("span.l" + id, el).addClass(labelCss);
                }

                let input = $("input[name='" + id + "']", el);
                const displayOnlyLabel = $("div." + id + "DisplayOnly", el);

                if ( inputCss !== undefined ) {
                    input.addClass(inputCss);
                }

                if ( placeHolder !== undefined ) {
                    input.attr("placeholder", placeHolder);
                }

                if ( maxlength !== undefined ) {
                    input.attr("maxlength", maxlength);
                }

                if ( inputType === "password" ) {
                    input.attr("type", "password");
                }
                else if ( inputType === "multiline" ) {
                    // Replace textbox with a textarea
                    const rows = el.data("rows") ?? "4";
                    input.replaceWith($('<textarea name="' + id + '" rows="' + rows + '" _id="' + id + '" class="form-control ' + id + '"></textarea>'))
                    input = $("textarea[name='" + id + "']", el);
                }

                if ( !autoComplete || inputType === "password" ) {
                    input.attr("autocomplete", "off");
                }
                
                if ( value !== undefined ) {
                    input.val(value);
                }

                const validatorContainer = $(".validator-container", el);

                if ( !displayOnly ) {
                    displayOnlyLabel.remove();
                    if ( inputType === "date" ) {
                        validatorContainer.addClass("input-group date");
                        validatorContainer.append($("<span class='input-group-addon'><i class='glyphicon glyphicon-calendar'></i></span>"));
    
                        $('.input-group.date', el)
                            .datepicker({
                                componentSelector: "i.fa-calendar-day, i.glyphicon-th, i.glyphicon-calendar",
                                clearBtn: true,
                                showOnFocus: false,
                                autoclose: true,
                                enableOnReadonly: false,
                                forceParse: false,
                                language: $(".bootstrapLocale").html(),
                                format: $(".bootstrapLocaleFormat").html(),
                                zIndexOffset: 2000 /* admin site sticky bar */
                            })
                            .on("show", function () {
                                // To prevent the datepicker from being 'stuck' open if they are trying
                                // to click icon *AGAIN* in an attempt to toggle/close the picker.  I
                                // first check to see if my own custom data is added and if not I inject
                                // some custom data.  If it is present (meaning it was already shown, I hide
                                // the datepicker.  Then in the hide event I always remove this custom data.
                                const dp = $(this);
                                if (dp.data("datepicker-show") != undefined) {
                                    dp.datepicker('hide');
                                }
                                else {
                                    dp.data("datepicker-show", true);
    
                                    const dateInput = $("input", $(this));
    
                                    // Originally, I had an .on("clearDate", ... ) event handler that simply
                                    // called dateInput.change() to trigger a calc.  But clearing input with keyboard
                                    // also triggered this, so if I cleared with keyboard, it triggered change, then when
                                    // I lost focus on input, it triggered 'normal' change event resulting in two calcs.
                                    // So now I attach click on clear button as well and call change still
                                    // so that works, but problem is that input isn't cleared before change event happens
                                    // so I also clear the input myself.
                                    $(".datepicker-days .clear", view).bind("click", function () {
                                        dateInput.val("");
                                        dateInput.change();
                                    });
                                }
                            })
                            .on("hide", function () {
                                const dp = $(this);
                                dp.removeData("datepicker-show");
    
                                $(".datepicker-days .clear", view).unbind("click");
                            })
                            .on('show.bs.modal', function (event) {
                                // https://stackoverflow.com/questions/30113228/why-does-bootstrap-datepicker-trigger-show-bs-modal-when-it-is-displayed/31199817
                                // prevent datepicker from firing bootstrap modal "show.bs.modal"
                                event.stopPropagation();
                            });
    
                        // Hack for https://github.com/uxsolutions/bootstrap-datepicker/issues/2402
                        // Still have an issue if they open date picker, then paste (date picker updates) then try to
                        // click a date...since the input then blurs, it fires a calc and the 'click' into the date picker (a specific day)
                        // seems to be ignored, but rare case I guess.
                        $('.input-group.date input', el)
                            .on("blur", function () {
                                const dateInput = $(this);
                                if (dateInput.data("datepicker-paste") != undefined) {
                                    dateInput.trigger("change");
                                }
                                dateInput.removeData("datepicker-paste");
                            })
                            .on("paste", function () {
                                const dateInput = $(this);
                                dateInput.data("datepicker-paste", true);
                            })
                            .on("keypress change", function () {
                                // If they paste, then type keyboard before blurring, it would calc twice
                                const dateInput = $(this);
                                dateInput.removeData("datepicker-paste");
                            });
                    }
                    else if ( prefix !== undefined ) {
                        validatorContainer.addClass("input-group");
                        validatorContainer.prepend($("<span class='input-group-addon input-group-text'>" + prefix + "</span>"));
                    }
                    else if ( suffix !== undefined ) {
                        validatorContainer.addClass("input-group");
                        validatorContainer.append($("<span class='input-group-addon input-group-text'>" + suffix + "</span>"));
                    }
                }
                else {
                    input.css("display", "none");
                    displayOnlyLabel.html(value);
                }

                el.attr("data-katapp-initialized", "true");
            });
        }

        buildDropdowns( view: JQuery<HTMLElement> ): void {
            const dropdowns = $('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', view);
            const selectPickerAvailable = typeof $.fn.selectpicker === "function";

            if ( !selectPickerAvailable && dropdowns.length > 0 ) {
                this.application.trace("bootstrap-select javascript is not present.", TraceVerbosity.None);
            }

            dropdowns.not('[data-katapp-initialized="true"]').each( function() {
                const el = $(this);

                // Do all data-* attributes that we support
                const id = el.data("inputname");
                const label = el.data("label");
                const multiSelect = el.data("multiselect") ?? false;
                const liveSearch = el.data("livesearch") ?? true;
                const size = el.data("size") ?? "15";
                const lookuptable = el.data("lookuptable");
                const css = el.data("css");

                if ( css !== undefined ) {
                    $(".v" + id, el).addClass(css);
                }

                if ( label !== undefined ) {
                    $("span.l" + id, el).html(label);
                }
                
                const input = $(".form-control", el);

                input.attr("data-size", size);

                if ( multiSelect ) {
                    input.addClass("select-all");
                    input.attr("multiple", "multiple");
                    input.attr("data-actions-box", "true");
                    input.attr("data-selected-text-format", "count > 2");
                }
                
                if ( liveSearch ) {
                    input.attr("data-live-search", "true");
                }

                if ( lookuptable !== undefined ) {
                    const options =
                        $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                            .map( ( index, ti ) => $("<option value='" + ti.getAttribute("key") + "'>" + ti.getAttribute( "name") + "</option>"));

                    options[ 0 ].attr("selected", "true");
                    
                    options.each( function() {
                        input.append( $(this) );
                    });
                }

                // Merge all other data-* attributes they might want to pass through
                $.each(this.attributes, function(i, attrib){
                    const name = attrib.name;
                    if ( name.startsWith( "data-") ) {
                        input.attr(name, attrib.value);
                    }
                 });

                // changed this from .selectpicker because selectpicker initialization removes it so can't launch it again
                if ( selectPickerAvailable ) {
                    $(".bootstrap-select", el).selectpicker();
                }

                $(".bootstrap-select", el)
                    .attr("data-kat-bootstrap-select-initialized", "true")
                    .next(".error-msg")
                    .addClass("selectpicker"); /* aid in css styling */ /* TODO: Don't think this is matching and adding class */
        
                el.attr("data-katapp-initialized", "true");
            });
        }

        buildSliders( view: JQuery<HTMLElement> ): void {
            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', view).not('[data-katapp-initialized="true"]').each( function() {
                const el = $(this);

                const id = el.data("inputname");

                if ( el.attr("data-katapp-initialized") !== "true" ) {
                    // Do all data-* attributes that we support
                    const label = el.data("label");
                    const css = el.data("css");
                    
                    if ( css !== undefined ) {
                        $(".v" + id, el).addClass(css);
                    }
        
                    if ( label !== undefined ) {
                        $("span.l" + id, el).html(label);
                    }
                }
    
                // May need to build slider anyway if enough information is provided in the data-* values?
    
                /* Don't think I need this since I push out info from CE
                const config = this.application.getResultRow<SliderConfigurationRow>("ejs-sliders", id);
    
                if (config == undefined) return el;
    
                this.processSliderConfiguration( el, id, config );
                */

                el.attr("data-katapp-initialized", "true");
            });
        }

        processUI(): void {
            this.processInputs();
            this.processCarousels();
            this.processHelpTips();
        }

        private processHelpTips(): void {
            // Couldn't include the Bootstrap.Tooltips.js file b/c it's selector hits entire page, and we want to be localized to our view.
            const selector = "[data-toggle='tooltip'], [data-toggle='popover'], .tooltip-trigger, .tooltip-text-trigger, .error-trigger";
            const application = this.application;

            if ( typeof $.fn.popover !== "function" && $(selector, application.element).length > 0 ) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present.", TraceVerbosity.None);
                return;
            }

            $(selector, application.element)
                .not(".rbl-help, [data-katapp-initialized='true']")
                .each( function() {
                    const isErrorValidator = $(this).hasClass('error-msg');
                    const placement = $(this).data('placement') || "top";
                    const trigger = $(this).data('trigger') || "hover";
                    const container = $(this).data('container') || "body";

                    const options: Bootstrap.PopoverOptions = {
                        html: true,
                        trigger: trigger,
                        container: container,
                        template:
                            isErrorValidator
                                ? '<div class="tooltip error katapp-css" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
                                : '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
                        placement: function (tooltip, trigger) {
                            // Add a class to the .popover element
            
                            // http://stackoverflow.com/a/19875813/166231
                            let dataClass = $(trigger).data('class');
                            if (dataClass != undefined) {
                                $(tooltip).addClass(dataClass);
                            }
            
                            // Did they specify a data-width?
                            dataClass = $(trigger).data('width');
                            if (dataClass != undefined) {
                                // context is for popups, tooltip-inner is for tooltips (bootstrap css has max-width in css)
                                $(tooltip).add($(".tooltip-inner", tooltip))
                                            .css("width", dataClass)
                                            .css("max-width", dataClass);
            
                            }
            
                            return placement;
                        },
                        title: function () {
                            const titleSelector = $(this).data('content-selector');
                            return titleSelector != undefined
                                ? $(titleSelector + "Title").text()
                                : "";
                        },
                        content: function () {
                            // See if they specified data-content directly on trigger element.
                            const dataContent = $(this).data('content');
                            const dataContentSelector = $(this).data('content-selector');
                            let content = dataContent == undefined
                                ? dataContentSelector == undefined ? $(this).next().html() : $(dataContentSelector).html()
                                : dataContent;
            
                            // Replace {Label} in content with the trigger provided...used in Error Messages
                            const labelFix = $(this).data("label-fix");
            
                            if (labelFix != undefined) {
                                content = content.replace(/\{Label}/g, $("." + labelFix).html());
                            }
            
                            return content;
                        }
                    };   

                    if (isErrorValidator) {
                        $(this).tooltip(options)
                            .on('inserted.bs.tooltip', function (e) {
                                const isWarning = $("label.warning", $(e.target)).length == 1;
                                if (isWarning) {
                                    const templateId = "#" + $(e.target).attr("aria-describedby");
                                    $(templateId, application.element).removeClass("error").addClass("warning");
                                }
                            });
                    }
                    else {
                        $(this).popover(options);
                    }
                                
                })
                .attr("data-katapp-initialized", "true");

            if ( application.element.attr("data-katapp-initialized-tooltip") != "true" ) {
                // Combo of http://stackoverflow.com/a/17375353/166231 and https://stackoverflow.com/a/21007629/166231 (and 3rd comment)
                // This one looked interesting too: https://stackoverflow.com/a/24289767/166231 but I didn't test this one yet
                let visiblePopover: Element | undefined = undefined;
                
                const hideVisiblePopover = function(): void {
                    // Just in case the tooltip hasn't been configured
                    if ( visiblePopover === undefined || $(visiblePopover).data("bs.popover") === undefined ) return;

                    // Call this first b/c popover 'hide' event sets visiblePopover = undefined
                    $(visiblePopover).data("bs.popover").inState.click = false
                    $(visiblePopover).popover("hide");
                };

                application.element
                    .on("shown.bs.popover.RBLe", function( e ) { visiblePopover = e.target; })
                    .on("hide.bs.popover.RBLe", function() { visiblePopover = undefined; })
                    .on("keyup.RBLe", function( e ) {
                        if (e.keyCode != 27) // esc
                            return;

                        hideVisiblePopover();
                        e.preventDefault();
                    })
                    .on("click.RBLe", function( e ) {
                        if ($(e.target).is(".popover-title, .popover-content")) return;
                        hideVisiblePopover();
                    })
                    .attr("data-katapp-initialized-tooltip", "true");
            }
        }

        private processInputs(): void {
            const view = this.application.element;

            this.buildDropdowns( view );
            this.buildTextBoxes( view );
            this.buildCheckboxes( view );
            this.buildSliders( view );
        }
    }
    $.fn.KatApp.standardTemplateBuilderFactory = function( application: KatAppPlugIn ): StandardTemplateBuilder/*Interface*/ {
        return new StandardTemplateBuilder( application );
    };

    // Replace the applicationFactory to create real KatAppPlugIn implementations
    $.fn.KatApp.applicationFactory = function( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface {
        // Timing concerns at all?
        //      $("selector").KatApp() - two returned
        //          first one starts to load, triggering a get script (that takes a while)
        //          second one is waiting to init (get put into shim memory list)
        //          script loads
        //              - grabs all from shim memory list (only first one)
        //              - script, replaces factory and destroys memory list
        //          second one processes - still in original shim code, adds to memory list and errors or is never processed by real impl code
        //      Can this happen?
        //
        //      Not sure if this could happen or not, but could maybe make new factory always check cache and process any that
        //      might have been added after initial processing (do to thread races) ... of course can't destroy the cache at bottom
        //      of this file if I am going to do that.
        
        return new KatAppPlugIn(id, element, options);
    };

    // Get Global: put as prefix if missing
    // Prototypes / polyfills
    String.prototype.ensureGlobalPrefix = function (): string {
        const id = this.toString();
        const idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    };
    String.prototype.format = function (json): string {
        //"{greeting} {who}!".format({greeting: "Hello", who: "world"})
        let that = this;
        if (Object.keys(json).length > 0) {
            for (const propertyName in json) {
                const re = new RegExp('{' + propertyName + '}', 'gm');
                that = that.replace(re, json[propertyName]);
            }
        }
        return that.replace("_", "_");
    };
    if (typeof String.prototype.startsWith !== 'function') {
        String.prototype.startsWith = function (str: string): boolean {
            return this.slice(0, str.length) === str;
        };
    }
    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function (searchString: string, position?: number): boolean {
            const subjectString = this.toString();
            if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            const lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        };
    }

    // If this is undefined, it is the first time through, so set up templates container and shared template state
    // NOTE: This script could be dynamically reloaded (via debugger KatApp) and this variable remains intact so that
    // it doesn't blow away existing shared data, so leave the if statement even though it seems like it shouldn't be
    // needed since when script is ran for 'first time' (which could be the 'only' time) obviously tempaltesUsedByAllApps
    // is undefined.
    if ( $.fn.KatApp.templatesUsedByAllApps == undefined ) {
        $('<rbl-katapps>\
            <style>\
                rbl-katapps, rbl-templates, rbl-template { display: none; }\
            </style>\
        </rbl-katapps>').appendTo("body");
        
        $.fn.KatApp.templatesUsedByAllApps = {};
        $.fn.KatApp.templateDelegates = [];

        $.fn.KatApp.templateOn = function( templateName: string, events: string, fn: TemplateOnDelegate ): void {
            $.fn.KatApp.templateDelegates.push( { Template: templateName.ensureGlobalPrefix(), Delegate: fn, Events: events } );
            KatApp.trace( undefined, "Template event(s) [" + events + "] registered for [" + templateName + "].", TraceVerbosity.Normal );
        };

        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
    }

    ( $.fn.KatApp.plugInShims as KatAppPlugInShimInterface[] ).forEach( a => { 
        $.fn.KatApp.applicationFactory( a.id, a.element, a.options );
    });

    // Destroy plugInShims
    delete $.fn.KatApp.plugInShims;
})(jQuery, window, document);
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded 
// with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js