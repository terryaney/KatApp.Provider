// TODO
// - What are defaults for 'dropdowns' in asp.net (search, multiselect)
// - How do I check/handle for errors when I try to load view
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?

// Discussions with Tom
// - Templates run every calc?  Will that goof up slider config?  Need to read code closer
//      - NOTE: for issues below solved with data-kat-initialized attribute
//      - For example, arne't you hooking up events every time to carousel?  Since you aren't removing events?  WHere you said there were events hanging around?
//      - Seems like you need a way to only update the 'markup' of carousel vs rebuilding entire thing?  Otherwise, probably need/should hookup a 'calcstart event' in templates to remove event handlers
//      - Wondering if we are making multiple events on the carousel events and slider events
// - Adding/Removing classes...was ejs-markup and ejs-output rows, no longer processing ejs-output rows
// - Show how bunch of errors are happening in biscomb (missing source elements)
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calcengine, -inputname, etc.
// - Downfall to our paradigm of CMS managing KatAppProvider code is never caches script and loads it each time?
// - Talk to tom about how to check for events
//      - Wondering if events on charts are still there or if calling destroy on chart removes

// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
// 6. <div rbl-tid="chart-highcharts" data-name="BalanceChart" rbl-data="BalanceChart" rbl-options="BalanceChart"></div>

// Need this function format to allow for me to reload script over and over (during debugging)
(function($, window, document, undefined?: undefined): void {
    // Prototypes / polyfills
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

    console.log("running provider code");
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
            registerDataWithService: false,
            shareDataWithOtherApplications: true,
            functionUrl: KatApp.functionUrl,
            corsUrl: KatApp.corsUrl,
            currentPage: "Unknown",
            inputSelector: "input",
            inputTab: "RBLInput",
            resultTabs: ["RBLResult"],
            runConfigureUICalculation: true,
            ajaxLoaderSelector: ".ajaxloader",
    
            onCalculateStart: function( application: KatAppPlugIn ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).show();
                }
                $( ".RBLe .slider-control, .RBLe input", application.element ).attr("disabled", "true");
            },
            onCalculateEnd: function( application: KatAppPlugIn ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).fadeOut();
                }
                $( ".RBLe .slider-control, .RBLe input", application.element ).removeAttr("disabled");
            },

            // Default to just an empty (non-data) package
            getData: function( appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback ): void {
                done( {
                    AuthID: "Empty",
                    Client: "Empty",
                    Profile: {} as JSON,
                    History: {} as JSON
                });
            }
        } as KatAppOptions, KatApp.defaultOptions );

    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const validInputSelector = ":not(.notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons + ")";
    const skipBindingInputSelector = ".notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input" + tableInputsAndBootstrapButtons;

    // Get Global: put as prefix if missing
    function ensureGlobalPrefix( id: string | undefined ): string | undefined {
        if ( id === undefined ) return undefined;

        const idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    };

    // If this is undefined, it is the first time through, so set up templates container and shared template state
    if ( $.fn.KatApp.templatesUsedByAllApps == undefined ) {
        $("<rbl-katapps />").appendTo("body");
        
        $.fn.KatApp.templatesUsedByAllApps = {};
        $.fn.KatApp.templateDelegates = [];

        $.fn.KatApp.templateOn = function( templateName: string, events: string, fn: TemplateOnDelegate ): void {
            $.fn.KatApp.templateDelegates.push( { Template: ensureGlobalPrefix( templateName )!, Delegate: fn, Events: events } ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            KatApp.trace( undefined, "Template event(s) [" + events + "] registered for [" + templateName + "].", TraceVerbosity.Normal );
        };

        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
    }

    class KatAppPlugIn /* implements KatAppPlugInInterface */ {
        // Helper classes, see comment in interfaces class
        private rble: RBLeUtilities/*Interface*/ = $.fn.KatApp.rble;
        private ui: UIUtilities/*Interface*/ = $.fn.KatApp.ui;

        // Fields
        element: JQuery;
        options: KatAppOptions = { };
        id: string;
        displayId: string;
        calculationResults?: JSON;
        exception?: RBLeServiceResults | undefined;
        results?: JSON | undefined;
        resultRowLookups?: ResultRowLookupsInterface;
        inputs?: CalculationInputs | undefined;
        
        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = id;
            this.element = element;
            this.displayId = element.attr("rbl-trace-id") ?? id;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[ 0 ].KatApp = this;
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
                // delegate assigned, then change the default value of this property
                { registerDataWithService: KatApp.defaultOptions.registerData !== undefined || options?.registerData !== undefined } as KatAppOptions,                
                options // finally js options override all
            );

            const saveFirstCalculationLocation = this.options.debug?.saveFirstCalculationLocation;
            if ( saveFirstCalculationLocation !== undefined && saveFirstCalculationLocation !== "1" ) {
                this.element.data("katapp-save-calcengine", saveFirstCalculationLocation);
            }

            this.element.attr("rbl-application-id", this.id);

            // Not sure I need this closure, but put it in anyway
            (function( application: KatAppPlugIn ): void {
                application.trace( "Started init", TraceVerbosity.Detailed );
                const pipeline: Array<()=> void> = [];
                let pipelineIndex = 0;
    
                const next = function(offest: number ): void {
                    switch (pipelineIndex) {
                        case 1:
                            application.trace( "init.pipeline.getView.finish", TraceVerbosity.Detailed );
                            break;
                        case 2:
                            application.trace( "init.pipeline.downloadTemplates.finish", TraceVerbosity.Detailed );
                            break;
                        case 3:
                            application.trace( "init.pipeline.injectTemplates.finish", TraceVerbosity.Detailed );
                            break;
                    }

                    pipelineIndex += offest;

                    if ( pipelineIndex < pipeline.length ) {

                        switch (pipelineIndex) {
                            case 0:
                                application.trace( "init.pipeline.getView.start", TraceVerbosity.Detailed );
                                break;
                            case 1:
                                application.trace( "init.pipeline.downloadTemplates.start", TraceVerbosity.Detailed );
                                break;
                            case 2:
                                application.trace( "init.pipeline.injectTemplates.start", TraceVerbosity.Detailed );
                                break;
                            case 3:
                                application.trace( "init.pipeline.processTemplates.start", TraceVerbosity.Detailed );
                                break;
                        }
    
                        pipeline[ pipelineIndex++ ]();
                    }
                };
    
                let pipelineError: string | undefined = undefined;

                const useTestView = application.options.debug?.useTestView ?? false;
                const functionUrl = application.options.functionUrl;
                const viewId = ensureGlobalPrefix( application.options.view ); 
                                
                // Gather up all requested templates requested for the current application so I can bind up any
                // onTemplate() delegates.
                let requiredTemplates: string[] = application.options.viewTemplates != undefined
                    ? application.options.viewTemplates.split( "," ).map( r => ensureGlobalPrefix( r )! ) // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
                const getApplicationView = function(): void { 
                    if ( viewId !== undefined ) {
                        application.trace(viewId + " requested from CMS.", TraceVerbosity.Detailed);
                        application.trace("Downloading " + viewId + " from " + ( application.options.debug?.templateLocation !== undefined ? application.options.debug.templateLocation + "/" + viewId : functionUrl ), TraceVerbosity.Diagnostic );

                        KatApp.getResources( application, application.options, viewId, useTestView, false,
                            ( errorMessage, results ) => {                                

                                pipelineError = errorMessage;

                                if ( pipelineError === undefined ) {
                                    application.trace(viewId + " returned from CMS.", TraceVerbosity.Normal);

                                    const data = results![ viewId! ]; // eslint-disable-line @typescript-eslint/no-non-null-assertion

                                    // Process as view - get info from rbl-config and inject markup
                                    const view = $("<div>" + data.replace( /{thisView}/g, "[rbl-application-id='" + application.id + "']" ) + "</div>");
                                    const rblConfig = $("rbl-config", view).first();
            
                                    if ( rblConfig.length !== 1 ) {
                                        application.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                                    }

                                    application.options.calcEngine = application.options.calcEngine ?? rblConfig?.attr("calcengine");
                                    const toFetch = rblConfig?.attr("templates");
                                    if ( toFetch !== undefined ) {
                                        requiredTemplates = 
                                            requiredTemplates
                                                .concat( toFetch.split(",").map( r => ensureGlobalPrefix( r )! ) ) // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                                // unique templates only
                                                .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i );

                                    }
                                    application.options.inputTab = application.options.inputTab ?? rblConfig?.attr("input-tab");
                                    const attrResultTabs = rblConfig?.attr("result-tabs");
                                    application.options.resultTabs = application.options.resultTabs ?? ( attrResultTabs != undefined ? attrResultTabs.split( "," ) : undefined );
                                    
                                    application.element.empty().append( view );
                                    
                                    next( 0 );
                                }
                                else {
                                    pipelineError = errorMessage;
                                    next( 2 ); // jump to finish
                                }
                            }
                        );
                    }
                    else {
                        next( 0 );
                    }
                };
                const getApplicationTemplates = function(): void { 
                    // Total number of resources already requested that I have to wait for
                    let otherResourcesNeeded = 0;
                    
                    // For all templates that are already being fetched, create a callback to move on when 
                    // not waiting for any more resources
                    requiredTemplates.filter( r => ( _templatesUsedByAllApps[ r ]?.requested ?? false ) )
                        .forEach( function( r ) {                                
                            otherResourcesNeeded++;

                            application.trace("Need to wait for already requested template: " + r, TraceVerbosity.Detailed);

                            _templatesUsedByAllApps[ r ].callbacks.push(
                                function( errorMessage ) {
                                    application.trace("Template: " + r + " is now ready.", TraceVerbosity.Detailed);

                                    // only process (moving to finish or next step) if not already assigned an error
                                    if ( pipelineError === undefined ) {
                                        if ( errorMessage === undefined ) {
                                            otherResourcesNeeded--;
                                            if ( otherResourcesNeeded === 0 ) {
                                                application.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                                next( 0 ); // move to next step if not waiting for anything else
                                            }
                                            else {
                                                application.trace("Waiting for " + otherResourcesNeeded + " more templates.", TraceVerbosity.Diagnostic);
                                            }
                                        }
                                        else {
                                            application.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet );
                                            pipelineError = errorMessage;
                                            next( 1 ); // jump to finish
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
                        application.trace(toFetchList + " requested from CMS.", TraceVerbosity.Detailed);
                        application.trace("Downloading " + toFetchList + " from " + ( application.options.debug?.templateLocation !== undefined ? application.options.debug.templateLocation + "/" : functionUrl ), TraceVerbosity.Diagnostic );
                        KatApp.getResources( application, application.options, toFetchList, useTestView, false,
                            ( errorMessage, data ) => {                                

                                if ( errorMessage === undefined ) {
                                    resourceResults = data as ResourceResults;
                                    application.trace(toFetchList + " returned from CMS.", TraceVerbosity.Normal);
                                    
                                    // Only move on if not waiting on any more resources from other apps
                                    if ( otherResourcesNeeded === 0 ) {
                                        application.trace("No more templates needed, process 'inject templates' pipeline.", TraceVerbosity.Diagnostic);
                                        next( 0 );
                                    }
                                    else {
                                        application.trace("Can't move to next step because waiting on templates.", TraceVerbosity.Diagnostic);
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
                                    next( 1 ); // jump to finish
                                }
                            }
                        );
                    }
                    else if ( otherResourcesNeeded === 0 ) {
                        next( 1 ); // jump to finish
                    }
                };
                const injectApplicationTemplates = function(): void {
                        
                    if ( resourceResults != null ) {
                        // For the templates *this app* downloaded, inject them into markup                        
                        Object.keys(resourceResults).forEach( r => { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                            const data = resourceResults![ r ]; // eslint-disable-line @typescript-eslint/no-non-null-assertion

                            // TOM (your comment, but do we need that container?): create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                            // and this attribute used for checking(?)
                            
                            let rblKatApps = $("rbl-katapps");
                            const t = $("<rbl-templates style='display:none;' rbl-t='" + r.toLowerCase() + "'>" + data.replace( /{thisTemplate}/g, r ) + "</rbl-templates>");

                            t.appendTo(rblKatApps);

                            application.trace( r + " injected into markup.", TraceVerbosity.Normal );

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

                    next( 0 );
                };
                const initializeApplication = function(): void {
                    
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
                                        application.trace( "[" + d.Events + "] events from template [" + d.Template + "] hooked up.", TraceVerbosity.Normal );
                                        application.element.on( d.Events, function( ...args ): void {
                                            d.Delegate.apply( this, args );
                                        } );
                                    });
                            });

                        // Update options.viewTemplates just in case someone is looking at them
                        application.options.viewTemplates = requiredTemplates.join( "," );

                        // Build up template content that DOES NOT use rbl results, but instead just 
                        // uses data-* to create a dataobject.  Normally just making controls with templates here
                        $("[rbl-tid]:not([rbl-source])", application.element).each(function () {
                            const templateId = $(this).attr('rbl-tid');
                            if (templateId !== undefined && templateId !== "inline") {
                                //Replace content with template processing, using data-* items in this pass
                                $(this).html(application.rble.processTemplate( application, templateId, $(this).data()));
                            }
                        });

                        if ( requiredTemplates.length > 0 ) {
                            application.ui.triggerEvent( application, "onTemplatesProcessed", application, requiredTemplates );
                        }

                        application.ui.bindEvents( application );
            
                        application.ui.triggerEvent( application, "onInitialized", application );

                        if ( application.options.runConfigureUICalculation ) {
                            application.configureUI();
                        }
                    }
                    else {
                        application.trace( "Error during Provider.init: " + pipelineError, TraceVerbosity.Quiet );
                    }

                    application.trace( "Finished init", TraceVerbosity.Detailed );
                    next( 0 ); // just to get the trace statement, can remove after all tested

                };

                pipeline.push( 
                    getApplicationView,
                    getApplicationTemplates,
                    injectApplicationTemplates,
                    initializeApplication
                );
    
                // Start the pipeline
                next( 0 );
            })( this );
        }

        rebuild( options: KatAppOptions ): void {
            this.ui.unbindEvents( this );
            this.ui.triggerEvent( this, "onDestroyed", this );
            this.init( options );
        }

        calculate( customOptions?: KatAppOptions ): void {
            const _sharedData = $.fn.KatApp.sharedData;

            // Shouldn't change 'share' option with a customOptions object
            const shareDataWithOtherApplications = this.options.shareDataWithOtherApplications ?? false;
            if ( shareDataWithOtherApplications ) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options.sharedDataLastRequested = _sharedData.lastRequested;
            }

            this.exception = undefined; // Should I set results to undefined too?

            this.ui.triggerEvent( this, "onCalculateStart", this );

            (function( that: KatAppPlugIn ): void {
                // Build up complete set of options to use for this calculation call
                const currentOptions = KatApp.extend(
                    {}, // make a clone of the options
                    that.options, // original options
                    customOptions, // override options
                ) as KatAppOptions;

                const pipeline: Array<()=> void> = [];
                let pipelineIndex = 0;
    
                const next = function( offset: number ): void {
                    pipelineIndex += offset;
    
                    if ( pipelineIndex < pipeline.length ) {                    
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
                            that, currentOptions, 
                            // If failed, let it do next job (getData, register, resubmit), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; 
                                next( errorMessage !== undefined ? 0 : 3 );
                            } 
                        );
                    } catch (error) {
                        pipelineError = "Submit.Pipeline exception: " + error;
                        next( 3 );
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
                                    next( 1 ); 
                                }
                                else {
                                    that.trace("Data retrieval failed in other application.", TraceVerbosity.Detailed);
                                    pipelineError = errorMessage;
                                    next( 2 ); // If error, jump to finish
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
                            that.options.data = currentOptions.data = _sharedData.data;
                            that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                            that.options.sharedDataLastRequested = _sharedData.lastRequested;
                            next( 1 ); 
                        }
                        else {
                            try {
                                if ( shareDataWithOtherApplications ) {
                                    _sharedData.requesting = true;
                                    _sharedData.registeredToken = undefined;
                                    _sharedData.data = undefined;
                                }
                                that.options.data = currentOptions.data = undefined;
                                that.options.registeredToken = currentOptions.registeredToken = undefined;
                    
                                that.rble.getData( 
                                    that, currentOptions, 
                                    // If failed, then I am unable to register data, so just jump to finish, 
                                    // otherwise continue to registerData or submit
                                    ( errorMessage, data ) => { 
                                        if ( errorMessage !== undefined ) {
                                            pipelineError = errorMessage;

                                            if ( shareDataWithOtherApplications ) {
                                                callSharedCallbacks( errorMessage );
                                            }

                                            next( 2 ); // If error, jump to finish
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
                                                next( 1 ); // If not registering data, jump to submit
                                            }
                                            else {
                                                next( 0 ); // Continue to register data
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
                        next( 2 ); // If error, jump to finish
                    }
                };
                const registerData = function(): void {

                    try {
                        that.rble.registerData( 
                            that, currentOptions, that.options.data as RBLeRESTServiceResult,
                            // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                            errorMessage => { 

                                if ( errorMessage === undefined ) {
                                    if ( shareDataWithOtherApplications ) {
                                        _sharedData.registeredToken = that.options.registeredToken;
                                        callSharedCallbacks( undefined );
                                    }
                                    next( 0 );
                                }
                                else {
                                    pipelineError = errorMessage; 
                                    if ( shareDataWithOtherApplications ) {
                                        callSharedCallbacks( errorMessage );
                                    }
                                    // If error, jump to finish
                                    next( 1 );
                                }
                            } 
                        );
                    } catch (error) {
                        pipelineError = "Register.Pipeline exception: " + error;
                        if ( shareDataWithOtherApplications ) {
                            callSharedCallbacks( pipelineError );
                        }
                        next( 1 );                            
                    }
                };
                const resubmitCalculation = function(): void {
                    try {
                        that.rble.submitCalculation( 
                            that, currentOptions,
                            // If failed, let it do next job (getData), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; 
                                next( 0 );
                            } 
                        );
                    } catch (error) {
                        pipelineError = "ReSubmit.Pipeline exception: " + error;
                        next( 0 );
                    }
                };
                const processResults = function(): void {

                    try {
                        if ( pipelineError === undefined ) {
                            that.element.removeData("katapp-save-calcengine");
                            that.element.removeData("katapp-trace-calcengine");
                            that.element.removeData("katapp-refresh-calcengine");

                            that.rble.processResults( that );
    
                            if ( that.inputs?.iConfigureUI === 1 ) {
                                that.ui.triggerEvent( that, "onConfigureUICalculation", that.results, currentOptions, that );
                            }

                            that.ui.triggerEvent( that, "onCalculation", that.results, currentOptions, that );
            
                        }
                        else {
                            that.rble.setResults( that, undefined );
                            // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                            that.ui.triggerEvent( that, "onCalculationErrors", "RunCalculation", pipelineError, that.exception, currentOptions, that );
                        }
                    } catch (error) {
                        that.trace( "Error duing result processing: " + error, TraceVerbosity.Quiet );
                        that.ui.triggerEvent( that, "onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that );
                    }
                    finally {
                        that.ui.triggerEvent( that, "onCalculateEnd", that );
                    }
                };

                pipeline.push( 
                    submitCalculation,
                    getCalculationData,
                    registerData,
                    resubmitCalculation,
                    processResults
                )
    
                // Start the pipeline
                next( 0 );
            })( this );
        }

        configureUI( customOptions?: KatAppOptions ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1, iDataBind: 1 } };
            this.calculate( KatApp.extend( {}, customOptions, manualInputs ) );
        }

        destroy(): void {
            this.element.removeAttr("rbl-application-id");
            this.element.off(".RBLe");
            this.ui.unbindEvents( this );
            this.ui.triggerEvent( this, "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        updateOptions( options: KatAppOptions ): void { 
            this.options = KatApp.extend( {}, this.options, options )
            this.ui.unbindEvents( this );
            this.ui.bindEvents( this );
            this.ui.triggerEvent( this, "onOptionsUpdated", this );
        }

        // Result helper
        getResultTable<T>( tableName: string): Array<T> {
            return this.rble.getResultTable<T>( this, tableName );
        }
        getResultRow<T>(table: string, id: string, columnToSearch?: string ): T | undefined { 
            return this.rble.getResultRow<T>( this, table, id, columnToSearch ); 
        }
        getResultValue( table: string, id: string, column: string, defautlValue?: string ): string | undefined { 
            return this.rble.getResultValue( this, table, id, column, defautlValue ); 
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
        getInputName(input: JQuery): string {
            // Need to support : and $.  'Legacy' is : which is default mode a convert process has for VS, but Gu says to never use that, but it caused other issues that are documented in
            // 4.1 Validators.cs file so allowing both.
            // http://bytes.com/topic/asp-net/answers/433532-control-name-change-asp-net-2-0-generated-html
            // http://weblogs.asp.net/scottgu/gotcha-don-t-use-xhtmlconformance-mode-legacy-with-asp-net-ajax

            // data-input-name - Checkbox list items, I put the 'name' into a parent span (via attribute on ListItem)
            const htmlName = (input.parent().attr("data-input-name") || input.attr("name")) as string;

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

        getInputs(application: KatAppPlugIn, customOptions: KatAppOptions ): JSON {
            // const json = { inputs: {} };
            const inputs = {};
            const that = this;

            // skip table inputs b/c those are custom, and .dropdown-toggle b/c bootstrap select
            // puts a 'button input' inside of select in there
            jQuery.each($(customOptions.inputSelector + validInputSelector, application.element), function () {
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

            return inputs as unknown as JSON;
        }

        getInputTables(application: KatAppPlugIn): CalculationInputTable[] | undefined {
            const that = this;
            const tables: CalculationInputTable[] = [];
            let hasTables = false;

            jQuery.each($(".RBLe-input-table", application.element), function () {
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

        triggerEvent(application: KatAppPlugIn, eventName: string, ...args: ( object | string | undefined )[]): void {
            application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
            application.options[ eventName ]?.apply(application.element[0], args );
            application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
            application.element.trigger( eventName + ".RBLe", args);
            application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);
        }

        changeRBLe(application: KatAppPlugIn, element: JQuery<HTMLElement>): void {
            const wizardInputSelector = element.data("input");
        
            if (wizardInputSelector == undefined) {
                application.calculate( { manualInputs: { iInputTrigger: this.getInputName(element) } } );
            }
            else {
                // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                $("." + wizardInputSelector)
                    .val(element.val() as string)
                    .trigger("change.RBLe"); // trigger calculation
            }        
        }

        bindEvents( application: KatAppPlugIn ): void {
            if ( application.options.inputSelector !== undefined ) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                
                const that = this;

                $(application.options.inputSelector + ":not(" + skipBindingInputSelector + ")", application.element).each(function () {        
                    $(this).bind("change.RBLe", function () {
                        that.changeRBLe( application, $(this));
                    });
                });
            }
        }

        unbindEvents( application: KatAppPlugIn ): void {
            const inputSelector = application.element.data("katapp-input-selector");

            if ( inputSelector !== undefined ) {
                $(inputSelector, application.element).off(".RBLe");
                application.element.removeData("katapp-input-selector")
            }
        }
    }
    $.fn.KatApp.ui = new UIUtilities();

    class RBLeUtilities /* implements RBLeUtilitiesInterface */ {
        ui: UIUtilities/*Interface*/ = $.fn.KatApp.ui;

        setResults( application: KatAppPlugIn, results: JSON | undefined ): void {
            if ( results !== undefined ) {
                const propertyNames = results["@resultKeys"] = Object.keys(results).filter( k => !k.startsWith( "@" ) );

                // Ensure that all tables are an array
                propertyNames.forEach( k => {
                    const table = results[ k ];

                    if (!(table instanceof Array)) {
                        results[ k ] = [table];
                    }
                });
            }

            application.results = results;
            application.resultRowLookups = undefined;
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
            
            const firstChar = id.substr(0, 1);
            const selector = firstChar !== "." && firstChar !== "#" ? "." + id : id;
        
            /* Tom's original code
            //if selector contains no 'selector' characters (.#[:) , add a . in front (default is class; downside is no selecting plain element)
            if ( selector === selector.replace( /#|:|\[|\./g ,'') ) {
                selector = "." + selector;
            }
            */

            return selector;
        }

        getData( application: KatAppPlugIn, currentOptions: KatAppOptions, next: PipelineCallback ): void {
        
            if ( currentOptions.getData === undefined ) 
            {
                next( "getData handler does not exist." );
                return;
            }
    
            currentOptions.getData( 
                application,
                currentOptions, 
                data => { 
                    next( undefined, data ); 
                },
                ( _jqXHR, textStatus ) => {
                    application.trace("getData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                    next( "getData AJAX Error Status: " + textStatus );
                }
            );  
        }
    
        registerData( application: KatAppPlugIn, currentOptions: KatAppOptions, data: RBLeRESTServiceResult, next: PipelineCallback ): void {
            const that = this;

            const register =
                currentOptions.registerData ??
                function( _app, _o, done, fail ): void {
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
                        url: KatApp.corsUrl,
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
                next( "registerData AJAX Error Status: " + textStatus );
            };
        
            const registerDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception == undefined ) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.RegisteredToken;
                    application.options.data = currentOptions.data = undefined;

                    that.ui.triggerEvent( application, "onRegistration", currentOptions, application );
                    next();
                }
                else {
                    application.exception = payload;
                    application.trace("registerData Error Status: " + payload.Exception.Message, TraceVerbosity.Quiet);
                    next( "RBLe Register Data Error: " + payload.Exception.Message );
                }
            }
    
            register( application, currentOptions, registerDone, registerFailed );
        }
    
        submitCalculation( application: KatAppPlugIn, currentOptions: KatAppOptions, next: PipelineCallback ): void {

            if ( currentOptions.registeredToken === undefined && currentOptions.data === undefined ) {
                next( "submitCalculation no registered token." );
                return;
            }
            
            const that = this;
            const saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            const refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";

            // Should make a helper that gets options (for both submit and register)
            // TODO: COnfirm all these options are right
            const calculationOptions: SubmitCalculationOptions = {
                Data: !( currentOptions.registerDataWithService ?? true ) ? currentOptions.data : undefined,
                Inputs: application.inputs = KatApp.extend( this.ui.getInputs( application, currentOptions ), currentOptions?.manualInputs ),
                InputTables: this.ui.getInputTables( application ), 
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
    
            const submitDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception === undefined ) {
                    that.setResults( application, payload.RBL?.Profile.Data.TabDef );
                    next();
                }
                else {
                    application.exception = payload;
                    application.trace( "RBLe Service Result Exception: " + payload.Exception.Message, TraceVerbosity.Quiet )
                    next( "RBLe Service Result Exception: " + payload.Exception.Message );
                }
            };
    
            const submitFailed: JQueryFailCallback = function( _jqXHR, textStatus ): void {
                application.trace("submitCalculation AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                next( "submitCalculation AJAX Error Status: " + textStatus );
            };
    
            const submit =
                currentOptions.submitCalculation ??
                function( _app, o, done, fail ): void {
                    $.ajax({
                        url: currentOptions.registerDataWithService ? currentOptions.corsUrl : currentOptions.functionUrl,
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

        getResultRow<T>( application: KatAppPlugIn, table: string, key: string, columnToSearch?: string ): T | undefined { 
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

        getResultValue( application: KatAppPlugIn, table: string, key: string, column: string, defaultValue?: string ): string | undefined { 
            return this.getResultRow<JSON>( application, table, key )?.[ column ] ?? defaultValue;
        }

        getResultValueByColumn( application: KatAppPlugIn, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined {
            return this.getResultRow<JSON>( application, table, key, keyColumn)?.[ column ] ?? defaultValue;
        };

		getResultTable<T>( application: KatAppPlugIn, tableName: string): Array<T> {
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

        processTemplate( application: KatAppPlugIn, templateId: string, data: JQuery.PlainObject ): string {
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
                return "";
            }
            else {
                return template.html().format(data);
            }
        }
    
        createHtmlFromResultRow( application: KatAppPlugIn, resultRow: HtmlContentRow ): void {
            const view = application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            let selector = resultRow.selector ?? this.getJQuerySelector( resultRow["@id"] ) ?? "";

            if (content.length > 0 && selector.length > 0) {

                let target = $(selector, view);

                if ( target.length > 0 ) {

                    if ( target.length === 1 ) {
                        target = this.getAspNetCheckboxLabel( target ) ?? target;
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
                                el.html(this.processTemplate(application, templateId, el.data() ));
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

        getRblSelectorValue( application: KatAppPlugIn, tableName: string, selectorParts: string[] ): string | undefined {
            if ( selectorParts.length === 1 ) return this.getResultValue( application, tableName, selectorParts[0], "value");
            else if (selectorParts.length === 3) return this.getResultValue( application, selectorParts[0], selectorParts[1], selectorParts[2]);
            else if (selectorParts.length === 4) return this.getResultValueByColumn( application, selectorParts[0], selectorParts[1], selectorParts[2], selectorParts[3]);
            else {
                application.trace( "Invalid selector length for [" + selectorParts.join(".") + "].", TraceVerbosity.Quiet );
                return undefined;
            }
        }
        
        processRblValues( application: KatAppPlugIn ): void {
            const that = this;

            //[rbl-value] inserts text value of referenced tabdef result into .html()
            $("[rbl-value]", application.element).each(function () {
                const el = $(this);
                const rblValueParts = el.attr('rbl-value')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                const value = that.getRblSelectorValue( application, "ejs-output", rblValueParts );

                if ( value != undefined ) {
                    $(this).html( value );
                }
                else {
                    application.trace("RBL WARNING: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Minimal);
                }
            });
        }

        processRblSources( application: KatAppPlugIn ): void {
            const that = this;

            //[rbl-source] processing templates that use rbl results
            $("[rbl-source], [rbl-source-table]", application.element).each(function () {
                const el = $(this);

                // TOM - Need some flow documentation here
                if ( el.attr("rbl-configui") === undefined || application.inputs?.iConfigureUI === 1 ) {
                    const elementData = el.data();
                    const tid = el.attr('rbl-tid');

                    // TOM (don't follow this code) - inline needed for first case?  What does it mean if rbl-tid is blank?  Need a variable name
                    const inlineTemplate = tid === undefined ? $("[rbl-tid]", el ) : undefined;
                    const templateContent = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $( inlineTemplate.prop("outerHTML").format( elementData) ).removeAttr("rbl-tid").prop("outerHTML")
                        : that.processTemplate( application, tid, elementData ); 

                    const rblSourceTableParts = el.attr('rbl-source-table')?.split('.');

                    const rblSourceParts = rblSourceTableParts === undefined
                        ? el.attr('rbl-source')?.split('.')
                        : rblSourceTableParts.length === 3
                            ? [ that.getResultValue( application, rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ] ) ?? "unknown" ]
                            : [ that.getResultValueByColumn( application, rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ], rblSourceTableParts[ 3 ] ) ?? "unknown" ];

                    if ( templateContent === undefined ) {
                        application.trace("RBL WARNING: Template content could not be found: [" + tid + "].", TraceVerbosity.Minimal);
                    }
                    else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                        application.trace("RBL WARNING: no rbl-source data", TraceVerbosity.Quiet);
                    }
                    else if ( rblSourceParts.length === 1 || rblSourceParts.length === 3 ) {
                        
                        //table in array format.  Clear element, apply template to all table rows and .append
                        const table = that.getResultTable<JSON>( application, rblSourceParts[0] );
                        
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
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    } else if ( rblSourceParts.length === 2 ) {

                        const row = that.getResultRow( application, rblSourceParts[0], rblSourceParts[1] );
                        
                        if ( row !== undefined ) {
                            el.html( templateContent.format( row ) );
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    }
                    else if ( rblSourceParts.length === 3 ) {
                        
                        const value = that.getResultValue( application, rblSourceParts[0], rblSourceParts[1], rblSourceParts[2]);
                        
                        if ( value !== undefined ) {
                            el.html( templateContent.format( { "value": value } ) );                                    
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Normal);
                        }

                    }
            
                }
            });
        }

        processVisibilities(application: KatAppPlugIn): void {
            const that = this;
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
                
                let visibilityValue: string | boolean | undefined = that.getRblSelectorValue( application, "ejs-output", rblDisplayParts );

                if (visibilityValue != undefined) {
                    if ( expressionParts.length > 1) {
                        visibilityValue = ( visibilityValue == expressionParts[1] ); //allows table.row.value=10
                    }

                    if (visibilityValue === "0" || visibilityValue === false || ( visibilityValue as string )?.toLowerCase() === "false" || visibilityValue === "") {
                        el.hide();
                    }
                    else {
                        el.show();
                    }
                }
                else {
                    application.trace("RBL WARNING: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Normal);
                }
            });

            // Legacy, might not be needed
            const visibilityRows = this.getResultTable<RBLeDefaultRow>( application, "ejs-visibility" );
            visibilityRows.forEach( row => {
                const selector = this.getJQuerySelector( row["@id"] );
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

        processRblDatas( application: KatAppPlugIn ): void {
            // Legacy, might not be needed
            const dataRows = this.getResultTable<RBLeRowWithId>( application, "ejs-rbl-data" );

            if ( dataRows.length > 0 ) {
                var propertyNames = Object.keys(dataRows[ 0 ]).filter( k => !k.startsWith( "@" ) );

                dataRows.forEach( row => {
                    const selector = this.getJQuerySelector( row["@id"] );

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

        processRBLSkips( application: KatAppPlugIn ): void {
            // Legacy, might not be needed (what class do you want me to drop in there)
            const skipRows = this.getResultTable<RBLeRowWithId>( application, "skip-RBLe" );

            skipRows.forEach( row => {
                const selector = this.getJQuerySelector( row["@id"] );
                if ( selector !== undefined ) {
                    const el = $(selector, application.element);
                    
                    el.addClass("skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");

                    this.getNoUiSlider(selector.substring(1), application.element)?.off('set.RBLe');
                }
            });
        }

        processDefaults( application: KatAppPlugIn ): void {
            const defaultRows = this.getResultTable<RBLeDefaultRow>( application, "ejs-defaults" );

            defaultRows.forEach( row => {
                const selector = this.getJQuerySelector( row["@id"] );

                if ( selector !== undefined ) {
                    const value = row.value ?? "";
                    const input = $(selector, application.element);
					const isCheckboxList = input.hasClass("checkbox-list-horizontal");
                    const aspCheckbox = this.getAspNetCheckboxInput(input);
                    const radioButton = input.find("input[value='" + value + "']");
                    const noUiSlider = this.getNoUiSlider(row["@id"], application.element);
                    const sliderContainer = this.getNoUiSliderContainer(row["@id"], application.element);

                    if ( noUiSlider !== undefined && sliderContainer !== undefined ) {
                        sliderContainer.data("setting-default", 1); // No way to set slider without triggering calc, so setting flag
                        input.val(value);
                        noUiSlider.set(Number(value));
                        sliderContainer.removeData("setting-default");
                    }
                    else if ( isCheckboxList ) {
						// turn all off first
						$("input", input).each((_index, element) => {
							const cb = this.getAspNetCheckboxInput($(element).parent() /* containing span from asp.net checkbox */);
							if (cb !== undefined) {
								cb.prop("checked", false);
							}
						});

						const values = value.split(",");
						for (let k = 0; k < values.length; k++) {
							const checkKey = values[k].trim();
							const checkbox = $("*[data-input-name='" + row["@id"] + checkKey + "']", application.element); // selects span from asp.net checkbox
							const cb = this.getAspNetCheckboxInput(checkbox);
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
                    else {
                        input.val( value );

						// In case it is bootstrap-select
						const isSelectPicker = input.hasClass("bootstrap-select") && input.selectpicker !== undefined;
						if (isSelectPicker) {
							input.selectpicker("refresh");
						}
                    }
                }
            });
        }

        processDisabled( application: KatAppPlugIn ): void {
            const disabledRows = this.getResultTable<RBLeDefaultRow>( application, "ejs-disabled" );

            disabledRows.forEach( row => {
                const selector = this.getJQuerySelector( row["@id"] );

                if ( selector !== undefined ) {
                    // @id - regular input
                    // @id input - checkbox
                    // slider-@id - noUiSlider
                    const value = row.value ?? "";
                    const input = $(selector + ", " + selector + " input", application.element);
                    const slider = this.getNoUiSliderContainer( row["@id"], application.element );

                    if (slider !== undefined) {
                        if (row.value === "1") {
                            slider.attr("disabled", "true");
                        }
                        else {
                            slider.removeAttr("disabled");
                        }
                    }
                    else {
                        if (row.value === "1") {
                            input.prop("disabled", true);
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

        processSliders( application: KatAppPlugIn ): void {
            const sliderRows = this.getResultTable<SliderConfigurationRow>( application, "ejs-sliders" );
            
            if ( typeof noUiSlider !== "object" && sliderRows.length > 0 ) {
                application.trace("noUiSlider javascript is not present.", TraceVerbosity.None);
                return;
            }

            sliderRows.forEach( config => {
                const id = config["@id"];

                const sliderJQuery = $(".slider-" + id, application.element);

                if ( sliderJQuery.length !== 1 ) {
                    application.trace("RBL WARNING: No slider div can be found for " + id + ".", TraceVerbosity.Minimal);
                }
                else {
                    const minValue = Number( config.min );
                    const maxValue = Number( config.max );
        
                    const input = $("." + id, application.element);
        
                    const defaultConfigValue =
                        application.getResultValue("ejs-defaults", id, "value") || // what is in ejs-defaults
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
        
                            $("." + id).val(value);
                            const v = format == "p" ? value / 100 : value;
                            $("." + id + "Label, .sv" + id).html( String.localeFormat("{0:" + format + decimals + "}", v) );
                        });
        
                        // Check to see that the input isn't marked as a skip input and if so, run a calc when the value is 'set'.
                        // If targetInput is present, then this is a 'wizard' slider so I need to see if 'main'
                        // input has been marked as a 'skip'.
                        const sliderCalcId = targetInput || id;
        
                        if ($("." + sliderCalcId + ".skipRBLe", application.element).length === 0 && $("." + sliderCalcId, application.element).parents(".skipRBLe").length === 0) {
        
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

        processListControls( application: KatAppPlugIn ): void {
            const configRows = this.getResultTable<ListControlRow>( application, "ejs-listcontrol" );

            configRows.forEach( row => {
				const tableName = row.table;
				const controlName = row["@id"];
				const listControl = $("." + controlName + ":not(div)", application.element);
				const isCheckboxList = $("." + controlName, application.element).hasClass("checkbox-list-horizontal");
				const isSelectPicker = !isCheckboxList && listControl.hasClass("bootstrap-select");
				const selectPicker = isSelectPicker ? listControl : undefined;
				const currentValue = isCheckboxList
					? undefined
					: selectPicker?.selectpicker('val') ?? listControl.val();

                const listRows = this.getResultTable<ListRow>( application, tableName );

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
                            listControl.append($("<option/>", {
                                value: ls.key,
                                text: ls.text
                            }));
                        }
                    }
                });

				if (selectPicker !== undefined) {
                    selectPicker.selectpicker('refresh');
                    
                    // Need to re-bind the event handler for some reason
                    const ui = this.ui;                    
                    listControl.not(skipBindingInputSelector).off(".RBLe").bind("change.RBLe", function () {
                        ui.changeRBLe( application, $(this));
                    });
				}
            });
        }

        processResults( application: KatAppPlugIn ): boolean {
            const results = application.results;

			// TOM (what does this comment mean): element content can be preserved with a class flag
			// TOM (what does this comment mean): generated content append or prepend (only applicably when preserved content)

            if ( results !== undefined ) {
                const calcEngineName = results["@calcEngine"];
                const version = results["@version"];
                application.trace( "Processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal );

                // Need two passes to support "ejs-markup" because the markup might render something that is then
                // processed by subsequent flow controls (ouput, sources, or values)
                const markUpRows = this.getResultTable<HtmlContentRow>( application, "ejs-markup" )
                markUpRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });
                
                const outputRows = this.getResultTable<HtmlContentRow>( application, "ejs-output" )
                outputRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });

                this.processRblSources( application );
                this.processRblValues( application );

                // apply dynamic classes after all html updates (TOM: (this was your comment...) could this be done with 'non-template' build above)
                markUpRows.forEach( r => {
                    if ( r.selector !== undefined ) {
                        if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                            $(r.selector, application.element).addClass(r.addclass);
                        }
    
                        if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                            $(r.selector, application.element).removeClass(r.addclass);
                        }
                    }
                });

                this.processRblDatas( application );

                this.processVisibilities( application );

                this.processSliders( application )

                this.processRBLSkips( application );

                this.processListControls( application );
                
                this.processDefaults( application );

                this.processDisabled( application );

                application.trace( "Finished processing results for " + calcEngineName + "(" + version + ").", TraceVerbosity.Normal );

                return true;
            }
            else {
                application.trace( "Results not available.", TraceVerbosity.Quiet );
                return false;
            }
        }
    }
    $.fn.KatApp.rble = new RBLeUtilities();

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

                this.highchartsOverrides = this.application.getResultTable<HighChartsOverrideRow>("HighCharts-Overrides").filter( r => this.stringCompare(r["@id"], this.highChartsDataName, true) === 0);
                this.highchartsOptions = this.application.getResultTable<HighChartsOptionRow>("HighCharts-" + this.highChartsOptionsName + "-Options");
                this.highchartsData = this.application.getResultTable<HighChartsDataRow>("HighCharts-" + this.highChartsDataName + "-Data");

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

                if ( firstDataRow !== undefined ) {
                    const chartOptions = this.getHighchartsOptions( firstDataRow );

                    const highchart = Highcharts.charts[ container.data('highchartsChart') ] as unknown as HighchartsChartObject;

                    if ( highchart !== undefined ) {
                        highchart.destroy();                    
                    }

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

        processCarousels(): void {
            const that = this;
            const view = this.application.element;

            // Hook up event handlers only when *not* already initialized
            $('.carousel-control-group:not([data-kat-initialized="true"])', view).each(function () {
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

                el.attr("data-kat-initialized", "true");
            });

            $('.carousel-control-group', view).each(function () {
                const el = $(this);
                that.buildCarousel( el );
            });
        }

        processHighcharts(): void {
            const view = this.application.element;
            const highchartsBuilder: HighchartsBuilder = $.fn.KatApp.highchartsBuilderFactory( this.application );

            $("[rbl-tid='chart-highcharts']", view).each(function () {
                highchartsBuilder.buildChart( $(this) );
            });
        }

        buildTextBoxes( view: JQuery<HTMLElement> ): void {
            $('[rbl-tid="input-textbox"]:not([data-kat-initialized="true"])', view).each(function () {
                const el = $(this);
                
                const id = el.data("inputname");
                const inputType = el.data("type")?.toLowerCase();
                const label = el.data("label");
                const prefix = el.data("prefix");
                const suffix = el.data("suffix");
                const placeholder = el.data("placeholder");
                const maxlength = el.data("maxlength");
                const autocomplete = el.data("autocomplete");
                const value = el.data("value");

                if ( label !== undefined ) {
                    $("span.l" + id, el).html(label);
                }

                let input = $("input[name='" + id + "']", el);

                if ( placeholder !== undefined ) {
                    input.attr("placeholder", placeholder);
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

                if ( autocomplete === "false" || inputType === "password" ) {
                    input.attr("autocomplete", "off");
                }
                
                if ( value !== undefined ) {
                    input.val(value);
                }

                const validatorContainer = $(".validator-container", el);

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

                el.attr("data-kat-initialized", "true");
            });
        }

        buildDropdowns( view: JQuery<HTMLElement> ): void {
            this.application.trace("Processing onTemplatesProcessed.RBLe: " + $('[rbl-tid="input-dropdown"]:not([data-kat-initialized="true"]) .selectpicker', view).length + " selectpicker controls.", TraceVerbosity.Diagnostic);

            $('[rbl-tid="input-dropdown"]:not([data-kat-initialized="true"])', view).each( function() {
                const el = $(this);

                // Do all data-* attributes that we support
                const id = el.data("inputname");
                const label = el.data("label");
                const multiSelect = el.data("multiselect");
                const liveSearch = el.data("livesearch");
                const size = el.data("size") ?? "15";

                if ( label !== undefined ) {
                    $("span.l" + id, el).html(label);
                }
                
                const input = $(".form-control", el);

                input.attr("data-size", size);

                if ( multiSelect === "true" ) {
                    input.addClass("select-all");
                    input.attr("data-selected-text-format", "count > 2");
                }
                
                if ( liveSearch === "true" ) {
                    input.attr("data-live-search", "true");
                }

                // changed this from .selectpicker because selectpicker initialization removes it so can't launch it again
                $(".bootstrap-select", el).selectpicker()
                    .next(".error-msg")
                    .addClass("selectpicker"); /* aid in css styling */ /* TODO: Don't think this is matching and adding class */
                
                el.attr("data-kat-initialized", "true");
            });
        }

        buildSliders( view: JQuery<HTMLElement> ): void {
            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            $('[rbl-tid="input-slider"]:not([data-kat-initialized="true"])', view).each(function () {
                const el = $(this);

                const id = el.data("inputname");

                if ( el.attr("data-kat-initialized") !== "true" ) {
                    // Do all data-* attributes that we support
                    const label = el.data("label");
    
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

                el.attr("data-kat-initialized", "true");
            });
        }

        processInputs(): void {
            const view = this.application.element;

            this.buildDropdowns( view );
            this.buildTextBoxes( view );
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

    ( $.fn.KatApp.plugInShims as KatAppPlugInShimInterface[] ).forEach( a => { 
        $.fn.KatApp.applicationFactory( a.id, a.element, a.options );
    });

    // Destroy plugInShims
    delete $.fn.KatApp.plugInShims;
})(jQuery, window, document);
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js