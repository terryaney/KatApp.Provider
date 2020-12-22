const providerVersion = 8.35; // eslint-disable-line @typescript-eslint/no-unused-vars

KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);

// Need this function format to allow for me to reload script over and over (during debugging/rebuilding)
(function($, window, document, undefined?: undefined): void {
    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const validInputSelector = "[data-itemtype='checkbox'] :input, .notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;
    const skipBindingInputSelector = ".notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;

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
            runConfigureUICalculation: true,
            ajaxLoaderSelector: ".ajaxloader",
                        
            onCalculateStart: function( application: KatAppPlugIn ) {
                application.showAjaxBlocker();

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
                $(".needsRBLeConfig", application.element).removeClass("needsRBLeConfig");

                application.hideAjaxBlocker();

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
        rble: RBLeUtilities/*Interface*/;
        ui: UIUtilities/*Interface*/;
        templateBuilder: StandardTemplateBuilder;

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
            this.id = "ka" + id; // Some BS elements weren't working if ID started with #
            this.element = element;
            this.displayId = element.attr("rbl-trace-id") ?? id;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[ 0 ].KatApp = this;
            this.ui = $.fn.KatApp.ui( this );
            this.rble = $.fn.KatApp.rble( this );
            this.templateBuilder = $.fn.KatApp.standardTemplateBuilderFactory( this );

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
                    
                    const debugResourcesDomain = that.options.debug?.debugResourcesDomain;

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
                                const view = $("<div class='katapp-css'>" + data.replace( /\.thisClass/g, thisClassCss ).replace( /thisClass/g, thisClassCss )  + "</div>");
                                const rblConfig = $("rbl-config", view).first();
        
                                if ( rblConfig.length !== 1 ) {
                                    that.trace("View " + viewId + " is missing rbl-config element.", TraceVerbosity.Quiet);
                                }

                                that.options.calcEngine = that.options.calcEngine ?? rblConfig?.attr("calcengine");
                                that.options.inputTab = that.options.inputTab ?? rblConfig?.attr("input-tab") ?? "RBLInput";
                                that.options.resultTabs = that.options.resultTabs ?? rblConfig?.attr("result-tabs")?.split(",") ?? ["RBLResult"];
                                that.options.preCalcs = that.options.preCalcs ?? rblConfig?.attr("precalcs");
                                
                                const toFetch = rblConfig?.attr("templates");
                                if ( toFetch !== undefined ) {
                                    requiredTemplates = 
                                        requiredTemplates
                                            .concat( toFetch.split(",").map( r => r.ensureGlobalPrefix() ) )
                                            // unique templates only
                                            .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i );

                                }
                                
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

                    const debugResourcesDomain = that.options.debug?.debugResourcesDomain;

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
                            that.rble.injectTemplate( $(this), that.ui.getTemplate( templateId, $(this).data() ) );
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
                    // Process data-* attributes and bind events
                    that.templateBuilder.processUI();

                    that.ui.bindCalculationInputs();

                    that.ui.initializeConfirmLinks();
                    
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

        rebuild( options: KatAppOptions ): KatAppOptions {
            const o = KatApp.extend({}, this.options, options);
            this.ui.unbindCalculationInputs();
            this.ui.triggerEvent( "onDestroyed", this );
            this.init( o );
            return o;
        }

        pushNotification(name: string, information: {} | undefined): void {
            this.ui.pushNotification(this, name, information);
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

            const cancelCalculation = !this.ui.triggerEvent( "onCalculateStart", this );

            if ( cancelCalculation ) {
                this.ui.triggerEvent( "onCalculateEnd", this );
                return;
            }

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

            // Calc Failed - 0, Success - 3, Unhandled Error - 3
            const submitCalculation = function(): void { 
                try {
                    that.rble.submitCalculation( 
                        currentOptions, 
                        // If failed, let it do next job (getData, register, resubmit), otherwise, jump to finish
                        errorMessage => { 
                            pipelineError = errorMessage; 

                            const offset = currentOptions.registeredToken === undefined && currentOptions.data === undefined 
                                ? 0 
                                : 3;

                            calculatePipeline( offset );
                        } 
                    );
                } catch (error) {
                    pipelineError = "Submit.Pipeline exception: " + error;
                    calculatePipeline( 3 );
                }
            };

            // Success = 1, Error - 2, Need Register - 0
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

            // Success = 0, Error - 1
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

            // Always go 0
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

            // Success - 1, Error - 1 (checks pipeline error before processing)
            const processResults = function(): void {
                that.trace("Processing results from calculation.", TraceVerbosity.Detailed);
                
                try {
                    if ( pipelineError === undefined ) {
                        that.processResults( currentOptions );
                        calculatePipeline( 0 );
                    }
                    else {
                        throw new Error(pipelineError);
                    }
                } catch (error) {
                    that.rble.setResults( undefined );
                    that.trace( "Error during result processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that );
                    calculatePipeline( 1 );
                }
            };

            // Always go 0
            const updateData = function(): void {
                that.trace("Posting jwt update data from results.", TraceVerbosity.Detailed);

                try {
                    const uploadUrl = that.options.rbleUpdatesUrl;
                    const jwtToken = {
                        Tokens: that.getResultTable<JSON>( "jwt-data").map( r => ({ Name: r[ "@id"], Token: r[ "value" ] }) )
                    };

					if (jwtToken.Tokens.filter( t => t.Name == "data-updates" ).length > 0 && uploadUrl !== undefined ) {
						const jsonParams = {
							url: uploadUrl,
							type: "POST",
							processData: false,
							data: JSON.stringify(jwtToken),
							dataType: "json"
						};

						$.ajax(jsonParams)
							.done(function (data) {
								if (data.Status != 1) {
									console.log("Unable to save data: " + data.Message);
                                    that.ui.triggerEvent( "onDataUpdateErrors", data.Message, that.exception, currentOptions, that );
                                }
                                else {
                                    that.ui.triggerEvent( "onDataUpdate", that.results, currentOptions, that );
                                }
                                calculatePipeline( 0 );
							})
							.fail(function (_jqXHR, textStatus) {
								console.log("Unable to save data: " + textStatus);
                                that.ui.triggerEvent( "onDataUpdateErrors", textStatus, that.exception, currentOptions, that );
                                calculatePipeline( 0 );
							});
                    }
                    else
                    {
                        calculatePipeline( 0 );
                    }
                } catch (error) {
                    that.trace( "Error during jwd update data processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onDataUpdateErrors", error, that.exception, currentOptions, that );
                    calculatePipeline( 0 );
                }
            };

            const calculateEnd = function(): void {
                that.ui.triggerEvent( "onCalculateEnd", that );
                calculatePipeline( 0 );
            };

            pipeline.push( 
                submitCalculation,
                getCalculationData,
                registerData,
                resubmitCalculation,
                processResults,
                updateData,
                calculateEnd
            )
            pipelineNames.push( 
                "calculatePipeline.submitCalculation",
                "calculatePipeline.getCalculationData",
                "calculatePipeline.registerData",
                "calculatePipeline.resubmitCalculation",
                "calculatePipeline.processResults",
                "calculatePipeline.updateData",
                "calculatePipeline.calculateEnd"
            )

            // Start the pipeline
            calculatePipeline( 0 );
        }

        private processResults( calculationOptions: KatAppOptions ): void {
            this.element.removeData("katapp-save-calcengine");
            this.element.removeData("katapp-trace-calcengine");
            this.element.removeData("katapp-refresh-calcengine");
            this.options.defaultInputs = undefined;


            this.ui.triggerEvent( "onResultsProcessing", this.results, calculationOptions, this );
            this.rble.processResults();
           
            if ( this.calculationInputs?.iConfigureUI === 1 ) {
                this.ui.triggerEvent( "onConfigureUICalculation", this.results, calculationOptions, this );
            }

            this.ui.triggerEvent( "onCalculation", this.results, calculationOptions, this );
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

        serverCalculation( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> ): void {
            this.apiAction(
                "ServerCalculation", 
                {
                    customInputs: customInputs
                },
                actionLink );
        }
    
        blockerCount = 0;
        showAjaxBlocker(): void {
            this.blockerCount++;

            if ( this.blockerCount == 1 ) {
                const selector = this.options.ajaxLoaderSelector;
                if ( selector != undefined ) {
                    $(selector, this.element).show();
                }
            }
        }
        hideAjaxBlocker(): void {
            this.blockerCount--;

            if ( this.blockerCount == 0 ) {
                const selector = this.options.ajaxLoaderSelector;
                if ( selector != undefined ) {
                    $(selector, this.element).fadeOut();
                }
            }

            if ( this.blockerCount < 0 ) {
                this.blockerCount = 0;
            }
        }

        apiAction( commandName: string, customOptions?: KatAppActionOptions, actionLink?: JQuery<HTMLElement> ): void {
            let url = this.options.rbleUpdatesUrl;
            
            if (url != undefined) {
                const isDownload = customOptions?.isDownload ?? false;

                // Build up complete set of options to use for this calculation call
                const currentOptions = KatApp.extend(
                    {}, // make a clone of the options
                    KatApp.clone( 
                        this.options,
                        function( _key, value ) {
                            if ( typeof value === "function" ) {
                                return; // don't want any functions passed along to api
                            }
                            return value; 
                        }
                    ), // original options
                    customOptions, // override options
                ) as KatAppOptions;

                const fd = new FormData();
                fd.append("KatAppCommand", commandName);
                fd.append("KatAppInputs", JSON.stringify(this.getInputs()));
                fd.append("KatAppConfiguration", JSON.stringify(currentOptions));

                const errors: ValidationRow[] = [];
                // Can't use 'view' in selector for validation summary b/c view could be a 'container' instead of entire view
                // if caller only wants to initialize a newly generated container's html                        
                const errorSummary = $("#" + this.id + "_ModelerValidationTable", this.element);
                $('.validator-container.error:not(.server)', this.element).removeClass('error');

                this.showAjaxBlocker();

                const xhr = new XMLHttpRequest();
                xhr.open('POST', url, true);

                xhr.onreadystatechange = function (): void {
                    // https://stackoverflow.com/a/29039823/166231
                    /*
                    if (xhr.readyState == 4) {
                        if (xhr.status == 200) {
                            console.log(typeof xhr.response); // should be a blob
                        }
                    } else */
                    if (xhr.readyState == 2) {
                        if (isDownload && xhr.status == 200) {
                            xhr.responseType = "blob";
                        } else {
                            xhr.responseType = "text";
                        }
                    }
                };

                const that = this;
                xhr.onload = function (): void {
                    if (xhr.responseType == "text") {
                        const jsonResponse = JSON.parse( xhr.responseText );

                        if ( xhr.status == 500 ) {
                            if ( jsonResponse[ "Validations" ] != undefined && errorSummary.length > 0 ) {
                                jsonResponse.Validations.forEach((v: { [x: string]: string }) => {
                                    errors.push( { "@id": v[ "ID" ], text: v[ "Message" ] });
                                });
                            }
    
                            if ( errors.length == 0 ) {
                                that.ui.triggerEvent( "onActionFailed", commandName, jsonResponse, that, actionLink );
                                console.log("Show error: " + jsonResponse.Message);
                                errors.push( { "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
                            }
                        }
                        else {
                            that.ui.triggerEvent( "onActionResult", commandName, jsonResponse, that, actionLink );
                        }
                    }
                    else {
                        const blob = xhr.response;

                        that.ui.triggerEvent( "onActionResult", commandName, undefined, that, actionLink );

                        let filename = "Download.pdf";
                        const disposition = xhr.getResponseHeader('Content-Disposition');
                        if (disposition && disposition.indexOf('attachment') !== -1) {
                            filename = disposition.split('filename=')[1].split(';')[0];
                        }

                        const tempEl = document.createElement("a");
                        $(tempEl).addClass( "d-none hidden" );
                        url = window.URL.createObjectURL(blob);
                        tempEl.href = url;
                        tempEl.download = filename;
                        tempEl.click();
                        window.URL.revokeObjectURL(url);
                    }
                    that.ui.triggerEvent( "onActionComplete", commandName, that, actionLink );

                    that.rble.processValidationRows(
                        errorSummary, 
                        errors
                    );

                    that.hideAjaxBlocker();
                }; // don't think I need this .bind(actionLink);

                this.ui.triggerEvent( "onActionStart", commandName, this, actionLink );
                xhr.send(fd);
            }
        }

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
        redraw( readViewOptions: boolean | undefined ): void {
            // Need to reset these so updated views are downloaded
            $("rbl-katapps > rbl-templates").remove(); // remove templates
            $.fn.KatApp.templatesUsedByAllApps = {};
            $.fn.KatApp.templateDelegates = [];

            // Remove all event handlers on view because they'll be reset
            this.element.off(".RBLe");

            if ( readViewOptions || true ) {
                // Clear these out and read from the view
                this.options.calcEngine = undefined;
                this.options.viewTemplates = undefined;
                this.options.preCalcs = undefined;
                this.options.inputTab = undefined;
                this.options.resultTabs = undefined;
            }
            
            const that = this;
            let rebuildOptions: KatAppOptions;

            var redrawInit = function() {
                // From here down, some duplication from calculate(), not sure if make one
                // private method that is used with optional param to 'use existing results'
                // is better, but for now just putting this.
                //
                // NOTE: Below in error handler, I don't clear out results because if developer
                // is calling this, presummably results worked previously and they just updated
                // their view and want to test that.

                that.exception = undefined; // Should I set results to undefined too?

                const cancelCalculation = !that.ui.triggerEvent( "onCalculateStart", that );

                if ( cancelCalculation ) {
                    that.ui.triggerEvent( "onCalculateEnd", that );
                    return;
                }

                try {
                    that.processResults(rebuildOptions);
                } catch (error) {
                    // this.rble.setResults( undefined );
                    that.trace( "Error during result processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onCalculationErrors", "RunCalculation", error, that.exception, that.options, that );
                }
                that.ui.triggerEvent( "onCalculateEnd", that );
                that.element.off( "onInitialized.RBLe", redrawInit);
            };
            this.element.on( "onInitialized.RBLe", redrawInit);

            // This returns right away, so need to hook up the event handler above to process everything 
            // after view is loaded
            rebuildOptions = this.rebuild( { runConfigureUICalculation: false } ); // Don't run new calcs b/c need to just use existing results
        }

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

        initializeConfirmLinks(): void {
            const that = this;
            
            this.application.element.on('onConfirmCancelled.RBLe', function () {
                $(".SubmitButton", that.application.element).removeClass("disabled");
                that.application.hideAjaxBlocker();
            });
        
            $("a[data-confirm], a[data-confirm-selector]", this.application.element)
                .not(".confirm-bound, .jquery-validate, .skip-confirm")
                .addClass("confirm-bound")
                .on("click", function() { 
                    const link = $(this);
                    const confirm = 
                        link.data("confirm") || 
                        $(link.data("confirm-selector"), that.application.element).html() || "";
    
                    return that.onConfirmLinkClick( link, confirm ); 
                });
        }

        onConfirmLinkClick( link: JQuery<HTMLElement>, confirm: string, confirmAction?: ()=> void ): boolean {

            if (link.data("confirmed") == "true") {
                return true;
            }
            const that = this;

            this.createConfirmDialog(
                confirm,

                // onConfirm
                function () {
                    link.data("confirmed", "true");

                    if ( confirmAction != undefined ) {
                        confirmAction();
                    }
                    else {
                        const submitKey = link.data("submit-key");

                        if (submitKey != undefined) {
                            $(submitKey)[0].click();
                        }
                        else {
                            link[0].click();
                        }
                    }

                    link.data("confirmed", "false");
                },
                
                // onCancel
                function () {
                    link.data("confirmed", "false");
                    that.triggerEvent( "onConfirmCancelled", link );
                });

            return false;
        }

        createConfirmDialog(confirm: string, onConfirm: ()=> void, onCancel: ()=> void | undefined): void {
            if (confirm == "") {
                onConfirm(); // If no confirm on link (called from validation modules), just call onConfirm
                return;
            }

            if (!$('.linkConfirmModal', this.application.element).length) {
                const sCancel = "Cancel";
                const sContinue = "Continue";

                this.application.element.append(
                    '<div class="modal fade linkConfirmModal" tabindex="-1" role="dialog" data-keyboard="false" data-backdrop="static">' +
                        '<div class="modal-dialog">' +
                            '<div class="modal-content">' +
                                '<div class="modal-body"></div>' +
                                '<div class="modal-footer">' +
                                    '<button class="btn btn-default cancelButton" data-dismiss="modal" aria-hidden="true">' + sCancel + '</button>' +
                                    '<button type="button" class="btn btn-primary continueButton" data-dismiss="modal">' + sContinue + '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
            }

            $('.linkConfirmModal .modal-body', this.application.element).html(confirm);

            $('.linkConfirmModal .continueButton', this.application.element).off("click").on("click", function () {
                onConfirm();
            });
        
            $('.linkConfirmModal .cancelButton', this.application.element).off("click").on("click", function () {
                if (onCancel != undefined) {
                    onCancel();
                }
            });            
    
            $('.linkConfirmModal', this.application.element).modal({ show: true });
        }

        processDropdownItems(dropdown: JQuery<HTMLElement>, rebuild: boolean, dropdownItems: { Value: string | null; Text: string | null; Class: string | undefined; Subtext: string | undefined; Html: string | undefined; Selected: boolean; Visible: boolean }[]): void {
            if ( dropdown.length === 0 ) return;

            const controlName = this.getInputName(dropdown);
            const selectPicker = dropdown.attr("data-kat-bootstrap-select-initialized") !== undefined
                ? dropdown
                : undefined;

            let currentValue = selectPicker?.selectpicker('val') ?? dropdown.val();

            if ( rebuild ) {
                $("." + controlName + " option", this.application.element).remove();
                currentValue = undefined;
            }
    
            const that = this;

            dropdownItems.forEach( ls => {
                // checkbox list
                // $(".v" + controlName + "_" + ls.key, application.element).parent()
                let currentItem = $("." + controlName + " option[value='" + ls.Value + "']", that.application.element);

                // Always add so it is in order of CE even if visible is false...
                if ( currentItem.length === 0) {
                    if ( ls.Text == "/data-divider" ) {
                        currentItem = $("<option/>", {
                            "data-divider": true
                        });
                        dropdown.append(currentItem);
                    }
                    else {
                        currentItem = $("<option/>", {
                            value: ls.Value,
                            text: ls.Text
                        });
                        
                        if ( ( ls.Class || "" ) != "" ) {
                            currentItem.attr("class", ls.Class || "");
                        }

                        // selectpicker specific features
                        if ( ( ls.Subtext || "" ) != "" ) {
                            currentItem.attr("data-subtext", ls.Subtext || "");
                        }
                        if ( ( ls.Html || "" ) != "" ) {
                            currentItem.attr("data-content", ls.Html || "");
                        }

                        dropdown.append(currentItem);
                    }
                }

                if (!ls.Visible) {
                    // Hide the item...
                    currentItem.hide();

                    // If selected item from dropdown was hidden, need to clear the value
                    if (currentValue === ls.Value) {
                        if (selectPicker !== undefined) {
                            selectPicker.selectpicker("val", "");
                        }
                        else {
                            dropdown.val("");
                        }
                    }
                }
                else {
                    currentItem.show();
                }
            });

            if (selectPicker !== undefined) {
                selectPicker.selectpicker('refresh');
                
                // Need to re-bind the event handler for some reason.  Only had to bind once in .NET, but
                // could be some side affect of .net loading list control on the server and everything is 'ready'
                // before calling original bind.
                dropdown.not(skipBindingInputSelector).off(".RBLe").on("change.RBLe", function () {
                    that.changeRBLe($(this));
                });
            }
        }

        getTemplate( templateId: string, data: JQuery.PlainObject ): { Content: string; Type: string | undefined } | undefined {
            const application = this.application;
            // Look first for template overriden directly in markup of view
            let template = $("rbl-template[tid=" + templateId + "]", application.element).first();

            // Now try to find template given precedence of views provided (last template file given highest)
            if ( template.length === 0 && application.options.viewTemplates != undefined ) {
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
                const contentSelector = template.attr("content-selectorx");

                return {
                    Type: template.attr("type"),
                    Content:
                        ( contentSelector != undefined ? $(contentSelector, template) : template )
                            .html()
                            .format( KatApp.extend({}, data, { id: application.id } ) )
                            .replace( / _id=/g, " id=") // Legacy support
                            .replace( / id_=/g, " id=") // changed templates to have id_ so I didn't get browser warning about duplicate IDs inside *template markup*
                            .replace( /tr_/g, "tr" ).replace( /td_/g, "td" ) // tr/td were *not* contained in a table in the template, browsers would just remove them when the template was injected into application, so replace here before injecting template
                }
            }
        }

        processListItems(container: JQuery<HTMLElement>, rebuild: boolean, listItems: { Value: string | null | undefined; Text: string | null | undefined; Help: string | undefined; Class: string | undefined; Selected: boolean; Visible: boolean; Disabled: boolean }[] ): void {
            const isBootstrap3 = $("rbl-config", this.application.element).attr("bootstrap") == "3";
            const inputName: string = container.data( "inputname" );
            const id: string = container.data( "id" );
            const horizontal = container.data("horizontal") ?? false;
            const itemType: string = container.data("itemtype" );
            const isRadio = itemType === "radio";

            if ( itemType == "checkbox" ) {
                /*                
                Find checkboxlist in ess for example rendering.
                    - Look at SetCheckboxListInputNames method as well

                Current provider code seems to assume checkbox list if has checkbox-list-horizontal class
                    - if ess version is NOT horizontal, don't think defaults would be working in here because it is
                        not flagged as a isCheckboxList?
                    - Search for isCheck, checkbox, checkbox-list to see how I'm using it
                        Make sure I can support CheckboxList items when needed
                    - Make sure templates are right

                    - Evo ess Framework

                    iCheckList, with items of

                    a:Item A
                    b:Item B
                    c:Item C

                    When you set default values, you do: iCheckList: a,c (comma delim list)

                    But when 'getting values' you make inputs named: iCheckLista, iCheckListb, iCheckListc (input for each item)

                    How hard would it be have one input (iCheckList) and the value is comma delim of vlaues selected...Harder to work with or no?

                    * Currently checkbox lists don't work in ESS (DST OOPBasic)
                    - note, all oop's are going to MBM early next year
                    - note, no one uses bootstrapcheckbox control (bsc), only manual markup
                    - bsc removes col-* attribute from container, so then 'label' is offset wrong (radio and check lists when horizontal - katapp works b/c col class is on template container element)
                        - manual works because don't have new 'bs-listcontrol' class for identification
                    - vertical manual ones do not look good because 'checkbox abc-checkbox' isn't present in markup (should be on span containing the input/label)
                    - both bsc/manual fail if vertical, it adds 'options' to the table, results has ejs-list table in it again for visiblity
                        - code doesn't know how to handle/hide items b/c it is hardcoded (RBLe) to only handle 'horizontal' ones

                */
                // throw new Error("CheckboxList is not supported yet.");
            }

            let itemsContainer = horizontal
                ? container
                : $(".items-container", container);

            const itemTypeClass: string = isRadio ? "radio abc-radio" : "checkbox abc-checkbox";

            if ( horizontal ) {
                container.parent().addClass( "bs-listcontrol form-inline form-inline-vtop" );
            }
            else if ( itemsContainer.length === 0 ) {
                const temlpateContent = 
                    this.getTemplate( isRadio ? "input-radiobuttonlist-vertical-container" : "input-checkboxlist-vertical-container", {} )?.Content ??
                    "<table class='" + itemTypeClass + " bs-listcontrol' border='0'><tbody class='items-container'></tbody></table>"
                container.append($(temlpateContent));
                itemsContainer = $(".items-container", container);
            }

            const that = this;
            const helpIconClass = isBootstrap3 ? "glyphicon glyphicon-info-sign" : "fa fa-question-circle";
            let configureHelp = false;

            const inputTemplate = isRadio
                ? "<input id='{itemId}' type='radio' name='{id}:{inputName}' value='{value}' />"
                : "<input id_='{itemId}' type='checkbox' name='{id}:{inputName}:{value}' data-value='{value}' data-input-name='{inputName}' />";

            const verticalItemTemplate = 
                this.getTemplate( isRadio ? "input-radiobuttonlist-vertical-item" : "input-checkboxlist-vertical-item", {} )?.Content ??
                "<tr rbl-display='{visibleSelector}'>\
                    <td>\
                        <span class='" + itemTypeClass + "'>\
                            " + inputTemplate + "\
                            <label for='{itemId}'>{text}</label>\
                            <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' data-toggle='popover' data-trigger='click' data-content-selector='#{id}_{helpSelector}' data-placement='top'><span class='{helpIconCss} help-icon'></span></a>\
                            <div rbl-value='{helpSelector}' id='{id}_{helpSelector}' style='display: none;'>{help}</div>\
                            <div rbl-value='{helpSelector}Title' id='{id}_{helpSelector}Title' style='display: none;'></div>\
                        </span>\
                    </td>\
                </tr>";

            const horizontalItemTemplate =
                this.getTemplate( isRadio ? "input-radiobuttonlist-horizontal-item" : "input-checkboxlist-horizontal-item", {} )?.Content ??
                "<div class='form-group " + itemTypeClass + "' rbl-display='{visibleSelector}'>\
                    " + inputTemplate + "\
                    <label for='{itemId}'>{text}</label>\
                    <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' data-toggle='popover' data-trigger='click' data-content-selector='#{id}_{helpSelector}' data-placement='top'><span class='{helpIconCss} help-icon'></span></a>\
                    <div rbl-value='{helpSelector}' id='{id}_{helpSelector}' style='display: none;'>{help}</div>\
                    <div rbl-value='{helpSelector}Title' id='{id}_{helpSelector}Title' style='display: none;'></div>\
                </div>";

            if ( rebuild ) {
                itemsContainer.empty();
            }

            listItems.forEach( li => {                
                const currentItemId = id + "_" + inputName + "_" + li.Value;
                const currentVisibleSelector = "v" + inputName + "_" + li.Value;
                const currentHelpSelector = "h" + inputName + "_" + li.Value;
                const currentHelpIconSelector = currentHelpSelector + "Icon";
                const text = li.Text || "";
                const help = li.Help || "";
                
                const itemData = {
                    id: id,
                    inputName: inputName,
                    itemId: currentItemId,
                    visibleSelector: currentVisibleSelector,
                    helpSelector: currentHelpSelector,
                    helpIconSelector: currentHelpIconSelector,
                    helpIconCss: helpIconClass,
                    text: text,
                    value: li.Value,
                    help: help
                }
                let currentItem = $("[rbl-display='" + currentVisibleSelector + "']", itemsContainer);
                let currentInput = $("input", currentItem);

                // Always add so it is in order of CE even if visible is false...
                if ( currentItem.length === 0) {
                    if ( horizontal ) {
                        itemsContainer.append($(horizontalItemTemplate.format( itemData )));
                    }
                    else {
                        itemsContainer.append($(verticalItemTemplate.format( itemData )));
                    }

                    currentItem = $("[rbl-display='" + currentVisibleSelector + "']", itemsContainer);
                    currentInput = $("input", currentItem);

                    currentInput.not(skipBindingInputSelector).on("change.RBLe", function () {
                        that.changeRBLe(currentInput);
                    });
                }

                if ( li.Selected ) {
                    currentInput.prop("checked", true);
                }

                if ( !li.Visible ){
                    currentItem.hide();
                    currentInput.prop("checked", false);
                }
                else {
                    if ( text != "" ) {
                        $("label", currentItem).html(text);
                    }
                    if ( help != "" ) {
                        $("[rbl-value='" + currentHelpSelector + "']", currentItem).html(help);
                        $("[rbl-display='" + currentHelpIconSelector + "']", currentItem).show();
                        configureHelp = true;
                    }
                    currentItem.show();

                    if ( li.Disabled ) {
                        currentInput.prop("disabled", true).removeAttr("kat-disabled");
                        currentInput.prop("checked", false);
                    }
                    else {
                        currentInput.prop("disabled", false);
                    }
                }
            });

            if ( configureHelp ) {
                // Run one more time to catch any help items
                this.application.templateBuilder.processHelpTips();
            }
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

            if ( customOptions.inputSelector !== undefined ) {
                const validInputs = $(customOptions.inputSelector, this.application.element).not(validInputSelector);

                jQuery.each(validInputs, function () {
                    const input = $(this);
                    const value = that.getInputValue(input);
    
                    if (value !== undefined) {
                        const name = that.getInputName(input);
                        inputs[name] = value;
                    }
                });

                $("[data-itemtype='checkbox']", this.application.element).each(function() {
                    const cbl = $(this);
                    const name = cbl.data("inputname");
                    const value = $("input:checked", cbl).toArray().map( chk => $(chk).data("value")).join(",");
                    inputs[name] = value;
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

        pushNotification(from: KatAppPlugIn, name: string, information: {} | undefined): void {
            ( $.fn.KatApp.applications as KatAppPlugIn[] ).forEach( a => { 
                if ( from.id != a.id ) {
                    this.triggerApplicationEvent( a, "onKatAppNotification", name, information, a );
                }
            });        
        }

        triggerEvent(eventName: string, ...args: ( object | string | undefined )[]): boolean {
            const application = this.application;
            return this.triggerApplicationEvent( application, eventName, ...args );
        }

        private triggerApplicationEvent(application: KatAppPlugIn, eventName: string, ...args: ( object | string | undefined )[]): boolean {
            let eventCancelled = false;
            try {
                application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
                
                const handlerResult = application.options[ eventName ]?.apply(application.element[0], args );

                if ( handlerResult != undefined && !handlerResult ) {
                    eventCancelled = true;
                }

                application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            } catch (error) {
                application.trace("Error calling " + eventName + ": " + error, TraceVerbosity.None);
            }

            if ( !eventCancelled ) {
                try {
                    application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
                    const event = jQuery.Event( eventName + ".RBLe" );
                    application.element.trigger( event, args);                    
                    application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);

                    if ( event.isDefaultPrevented() ) {
                        eventCancelled = false;
                    }

                } catch (error) {
                    application.trace("Error triggering " + eventName + ": " + error, TraceVerbosity.None);
                }
            }

            return !eventCancelled;
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
                    $(this).on("change.RBLe", function () {
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
			if ( this.isAspNetCheckbox(input) ) {
                // Moved the help icons inside the label so if label is ever too long and wraps, the icon stays at the end of the text.
                const label = $("label > span.checkbox-label", input);
                return label.length ? label : $("label", input);
            }
            return undefined;
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

        constructor( application: KatAppPlugIn ) {
            this.application = application;  
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
                            RequestIP: currentOptions.requestIP ?? "1.1.1.1",
                            CurrentUICulture: currentOptions.currentUICulture ?? "en-US",
                            Environment: currentOptions.environment ?? "PITT.PROD"                                
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

                    that.application.ui.triggerEvent( "onRegistration", currentOptions, application );
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

            const inputs: CalculationInputs = application.calculationInputs = KatApp.extend( this.application.ui.getInputs( currentOptions ), currentOptions.defaultInputs, currentOptions.manualInputs );

            let preCalcs = currentOptions.preCalcs;

			if (inputs.iInputTrigger !== undefined) {
				const rblOnChange = $("." + inputs.iInputTrigger).data("rbl-on-change") as string ?? "";
				const triggerPreCalc = rblOnChange.indexOf("update-tp") > -1;
                preCalcs = triggerPreCalc 
                    ? $("." + inputs.iInputTrigger).data("rbl-update-tp-params") || preCalcs 
                    : preCalcs;
			}

            const calculationOptions: SubmitCalculationOptions = {
                Data: !( currentOptions.registerDataWithService ?? true ) ? currentOptions.data : undefined,
                Inputs: inputs,
                InputTables: this.application.ui.getInputTables(), 
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: ( currentOptions.registerDataWithService ?? true ) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab as string,
                    ResultTabs: currentOptions.resultTabs as string[],
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ( currentOptions.debug?.refreshCalcEngine ?? false ),
                    PreCalcs: preCalcs,
                    
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

            this.application.ui.triggerEvent( "onCalculationOptions", calculationOptions, this );

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
            // rbl-template-type is to enable the creation of templates with different ids/names but still
            // fall in a category of type.  For example, you may want to make a certain style/template of
            // sliders (while still keeping main slider template usable) that is then capable of applying
            // all the KatApp programming (data-* attributes applying ranges, and configurations).
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
    
        createHtmlFromResultRow( resultRow: HtmlContentRow, processBlank: boolean ): void {
            const view = this.application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            const selector = this.application.ui.getJQuerySelector( resultRow.selector ) ?? this.application.ui.getJQuerySelector( resultRow["@id"] ) ?? "";

            if (( processBlank || content.length > 0 ) && selector.length > 0) {

                let target = $(selector, view);

                if ( target.length > 0 ) {

                    if ( target.length === 1 ) {
                        target = this.application.ui.getAspNetCheckboxLabel( target ) ?? target;
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
                                this.injectTemplate( el, this.application.ui.getTemplate( templateId, el.data() ) );
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
            $("[rbl-value]", application.element).not("rbl-template [rbl-value]").each(function () {
                const el = $(this);
                const rblValueParts = el.attr('rbl-value')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                const value = that.getRblSelectorValue( "ejs-output", rblValueParts );

                if ( value != undefined ) {
                    let target = $(this);

                    if ( target.length === 1 ) {
                        target = application.ui.getAspNetCheckboxLabel( target ) ?? target;
                    }

                    target.html( value );
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Detailed);
                }
            });
        }

        processRblSources(): void {
            const that: RBLeUtilities = this;
            const application = this.application;
            
            //[rbl-source] processing templates that use rbl results
            $("[rbl-source], [rbl-source-table]", application.element).not("rbl-template [rbl-source], rbl-template [rbl-source-table]").each(function () {
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
                            : $( inlineTemplate.prop("outerHTML").format( elementData ) ).removeAttr("rbl-tid").prop("outerHTML")
                        : application.ui.getTemplate( tid, elementData )?.Content; 

                    if ( templateContent === undefined ) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found: [" + tid + "].", TraceVerbosity.Detailed);
                    }
                    else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no rbl-source data", TraceVerbosity.Detailed);
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

                            });
                        } else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                        }

                    } else if ( rblSourceParts.length === 2 ) {

                        const row = that.getResultRow( rblSourceParts[0], rblSourceParts[1] );
                        
                        if ( row !== undefined ) {
                            el.html( templateContent.format( row ) );
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                        }

                    }
                    else if ( rblSourceParts.length === 3 ) {
                        
                        const value = that.getResultValue( rblSourceParts[0], rblSourceParts[1], rblSourceParts[2]);
                        
                        if ( value !== undefined ) {
                            el.html( templateContent.format( { "value": value } ) );                                    
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
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
            $("[rbl-display]", application.element).not("rbl-template [rbl-display]").each(function () {
                const el = $(this);

                //legacy table is ejs-visibility but might work a little differently
                const rblDisplayParts = el.attr('rbl-display')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                //check to see if there's an "=" for a simple equality expression
                const expressionParts = rblDisplayParts[ rblDisplayParts.length - 1].split('=');
                rblDisplayParts[ rblDisplayParts.length - 1] = expressionParts[0];
                
                let visibilityValue = 
                    that.getRblSelectorValue( "ejs-visibility", rblDisplayParts ) ??
                    that.getRblSelectorValue( "ejs-output", rblDisplayParts ); // Should remove this and only check ejs-visibility as the 'default'

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
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for rbl-display=" + el.attr('rbl-display'), TraceVerbosity.Detailed);
                }
            });

            // Legacy, might not be needed
            const visibilityRows = this.getResultTable<RBLeDefaultRow>( "ejs-visibility" );
            visibilityRows.forEach( row => {
                const selector = application.ui.getJQuerySelector( row["@id"] );
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
                    const selector = application.ui.getJQuerySelector( row["@id"] );

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
                const selector = application.ui.getJQuerySelector( row["key"] || row["@id"] );
                if ( selector !== undefined ) {
                    const el = $(selector, application.element);
                    
                    el.addClass("skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");

                    application.ui.getNoUiSlider(selector.substring(1), application.element)?.off('set.RBLe');
                }
            });
        }

        setDefaultValue( id: string, value: string | undefined ): void {
            const selector = this.application.ui.getJQuerySelector( id );

            if ( selector !== undefined ) {
                value = value ?? "";
                $(selector + "DisplayOnly", this.application.element).html(value);
                const input = $(selector, this.application.element).not("div");
                const listControl = $(selector + "[data-itemtype]", this.application.element);
                const isCheckboxList = listControl.data("itemtype") == "checkbox"; // input.hasClass("checkbox-list-horizontal");
                const isRadioList = listControl.data("itemtype") == "radio"; // input.hasClass("checkbox-list-horizontal");
                const aspCheckbox = this.application.ui.getAspNetCheckboxInput(input);
                const radioButtons = isRadioList ? $("input", listControl) : $("input[type='radio']", input);
                const noUiSlider = this.application.ui.getNoUiSlider(id, this.application.element);

                if ( noUiSlider !== undefined ) {
                    const sliderContainer = this.application.ui.getNoUiSliderContainer(id, this.application.element);
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
                    $("input", listControl).prop("checked", false);

                    const values = value.split(",");
                    for (let k = 0; k < values.length; k++) {
                        const checkKey = values[k].trim();
                        const checkbox = $("[data-value='" + checkKey + "']", listControl); // selects span from asp.net checkbox
                        checkbox.prop("checked", true);
                    }
                }
                else if ( radioButtons.length > 0 ) {
                    radioButtons.prop("checked", false);
                    radioButtons.filter( ( i, o ) => $(o).val() == value).prop("checked", true);
                    // radioButtons.find("input[value='" + value + "']").prop("checked", true);
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
                const selector = this.application.ui.getJQuerySelector( row["@id"] );

                if ( selector !== undefined ) {
                    // @id - regular input
                    // @id input - checkbox and list controls
                    // slider-@id - noUiSlider
                    const value = row.value ?? "";
                    const input = $(selector + ", " + selector + " input", application.element);
                    const slider = this.application.ui.getNoUiSliderContainer( row["@id"], application.element );

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

            $("[rbl-tid='result-table']", view).not("rbl-template [rbl-tid='result-table']").each(function ( i, r ) {
                const tableName = r.getAttribute( "rbl-tablename" ) ?? r.getAttribute( "rbl-source" );
                const templateCss = r.getAttribute( "data-css" );

                if ( tableName !== null ) {
                    const configRow = application.getResultTable<ContentsRow>( "contents" ).filter( r => r.section === "1" && KatApp.stringCompare( r.type, "table", true ) === 0 && r.item === tableName ).shift();
                    const configCss = configRow?.class;
                    let tableCss = 
                        configCss != undefined ? "rbl " + tableName + " " + configCss :
                        templateCss != undefined ? "rbl " + tableName + " " + templateCss :
                        "table table-striped table-bordered table-condensed rbl " + tableName;
                        
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
    
                            const hClass =
                                "{valueClass} span-{table}-{column}".format(
                                    {
                                        table: tableName,
                                        column: headerSpanCellName,
                                        valueClass: columnConfiguration[headerSpanCellName].isTextColumn ? "text" : "value"
                                    }
                                );
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

                                    const sClass =
                                        "{valueClass} {columnClass} span-{table}-{column}".format(
                                            {
                                                table: tableName,
                                                column: colSpan,
                                                valueClass: textCol ? "text" : "value",
                                                columnClass: spanConfig.cssClass ?? ""
                                            }
                                        );

                                    rowHtml += that.getCellMarkup(row, colSpanName, element, sClass, /* includeBootstrapColumnWidths, */ colSpan);
                                }
                            }
                        }
    					else {
                            tableColumns.forEach(c => {
                                const cClass =
                                    "{valueClass} {columnClass} {table}-{column}".format(
                                        {
                                            table: tableName,
                                            column: c.name,
                                            valueClass: c.isTextColumn ? "text" : "value",
                                            columnClass: c.cssClass ?? ""
                                        }
                                    );

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
                summary.append("<ul></ul>");
                ul = $("ul", summary);
            }

            // Backward compat to remove validation with same id as input, but have changed it to 
            // id + Error so that $(id) doesn't get confused picking the li item.
            const inputName = input !== undefined ? this.application.ui.getInputName(input) : "undefined";
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

        processValidationRows(summary: JQuery<HTMLElement>, errors: ValidationRow[]): void {
			// Remove all RBLe client side created errors since they would be added back
			$("ul li.rble", summary).remove();

			if (errors.length > 0) {
                errors.forEach( r => {
                    const selector = this.application.ui.getJQuerySelector( r["@id"] );
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
            const errorSummary = $("#" + this.application.id + "_ModelerValidationTable", view);
            let warningSummary = $("#" + this.application.id + "_ModelerWarnings", view);

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
				else if ($("#" + this.application.id + "_ModelerValidationTable.alert ul li", view).length > 0 && errors.length > 0) {
					$('html, body').animate({
						scrollTop: $("#" + this.application.id + "_ModelerValidationTable.alert", view).offset().top - 30
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
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider configuration can be found for " + r.getAttribute( "data-inputname" ) + ".", TraceVerbosity.Detailed);
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
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id + ".", TraceVerbosity.Detailed);
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
            const ui = this.application.ui;
            const configRows = this.getResultTable<ListControlRow>( "ejs-listcontrol" );

            configRows.forEach( row => {
				const tableName = row.table;
                const controlName = row["@id"];
                
				const dropdown = $("." + controlName + ":not(div)", application.element);
                const listControl = $("div." + controlName + "[data-itemtype]", application.element);
                const listRows = this.getResultTable<ListRow>( tableName );

                if ( listControl.length === 1 ) {
                    ui.processListItems(
                        listControl,
                        row.rebuild == "1",
                        listRows.map( r => ({ Value:  r.key, Text: r.text, Class: r.class, Help: r.html, Selected: false, Visible: r.visible != "0", Disabled: r.disabled == "1" }))
                    );
                }
                else {
                    ui.processDropdownItems(
                        dropdown, 
                        row.rebuild == "1",
                        listRows.map( r => ({ Value:  r.key, Text: r.text, Class: r.class, Subtext: r.subtext, Html: r.html, Selected: false, Visible: r.visible != "0" }))
                    );
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

                // apply dynamic classes after all html updates 
                // (TOM: (this was your comment...could this be done with 'non-template' build above)
                markUpRows.forEach( r => {
                    if ( r.selector !== undefined ) {
                        if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                            const el = $(r.selector, application.element);
                            el.addClass(r.addclass);

                            if ( r.addclass.indexOf("skipRBLe") > -1 || r.addclass.indexOf("rbl-nocalc") > -1 ) {
                                el.off(".RBLe");
                                $(":input", el).off(".RBLe");
                                this.application.ui.getNoUiSlider(r.selector.substring(1), application.element)?.off('set.RBLe');
                            }
                        }
    
                        if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                            $(r.selector, application.element).removeClass(r.removeclass);
                        }
                    }
                });

                this.processRblDatas();
                this.processTables();
                this.processCharts();

                // Need to re-run processUI here in case any 'templates/inputs' were injected from 
                // results and need their initial data-* attributes/events processed.
                this.application.templateBuilder.processUI();

                // These all need to be after processUI so if any inputs are built
                // from results, they are done by the time these run (i.e. after processUI)
                this.processVisibilities();
                this.processSliders()
                this.processRBLSkips();
                this.processListControls();
                this.processDefaults();
                this.processDisabled();
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
    $.fn.KatApp.rble = function( application: KatAppPlugIn ): RBLeUtilities {
        return new RBLeUtilities( application );
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
				if (optionJson[optionName] === undefined) {
					optionJson[optionName] = optionIndex > -1 ? [newValue] : newValue;
				}
				else if (onPropertyValue) {
					if (optionIndex > -1) {
						const propertyArray = optionJson[optionName] as Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
						// If property is an array and index isn't there yet, push a new element
						while (propertyArray.length - 1 < optionIndex) {
							propertyArray.push(undefined);
						}
						propertyArray[optionIndex] = newValue;
					}
					else {
						// If on property value and exists, this is an override, so just replace the value
						optionJson[optionName] = newValue;
					}
				}
				else if (optionIndex > -1 && (optionJson[optionName] as Array<any> ).length - 1 < optionIndex) { // eslint-disable-line @typescript-eslint/no-explicit-any
					const propertyArray = optionJson[optionName] as Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
					// If property is an array and index isn't there yet, push a new element
					while (propertyArray.length - 1 < optionIndex) {
						propertyArray.push(undefined);
					}
					propertyArray[optionIndex] = newValue;
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

        getHighchartsOptions( firstDataRow: HighChartsDataRow | undefined ): HighchartsOptions {            
            const chartOptions: HighchartsOptions = {};

            // If chart has at least 1 data row and options/overrides arrays have been initialized
            if ( this.highchartsData !== undefined && this.highchartsOptions !== undefined && this.highchartsOverrides !== undefined ) {

                // First set all properties from the options/overrides rows
                const overrideProperties = this.highchartsOverrides.filter( r => !r.key.startsWith("config-"));
                this.highchartsOptions.concat(overrideProperties).forEach(optionRow => {
                    this.setHighChartsOption(chartOptions, optionRow.key, optionRow.value);
                });

                // Get series data
                const allChartColumns = firstDataRow != undefined ? Object.keys(firstDataRow) : [];
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

                const firstDataRow = this.highchartsData.filter(r => !(r.category || "").startsWith("config-")).shift();

                if ( this.highchartsData.length > 0 ) {
                    const container = $(".chart", el);

                    let renderStyle = container.attr("style") ?? "";
                    const configStyle = this.getHighchartsConfigValue("config-style");
        
                    if (configStyle !== undefined) {
                        if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                            renderStyle += ";";
                        }
                        container.attr("style", renderStyle + configStyle);
                    }
                    
                    const highchartKey = container.attr('data-highcharts-chart');
                    const highchart = Highcharts.charts[ highchartKey ?? -1 ] as unknown as HighchartsChartObject;
    
                    if ( highchart !== undefined ) {
                        highchart.destroy();                    
                    }
    
                    const chartOptions = this.getHighchartsOptions( firstDataRow );
    
                    try {
                        container.highcharts(chartOptions);
                    } catch (error) {
                        this.application.trace("Error during highchart creation.", TraceVerbosity.None);
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

    class StandardTemplateBuilder implements StandardTemplateBuilderInterface
    {
        application: KatAppPlugIn;
        isBootstrap3: boolean;

        constructor( application: KatAppPlugIn ) {
            this.application = application;   
            this.isBootstrap3 = $("rbl-config", this.application.element).attr("bootstrap") == "3";
        }
        
        private buildCarousel(el: JQuery): JQuery {
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

        private processCarousels( container?: JQuery<HTMLElement> ): void {
            const that: StandardTemplateBuilder = this;
            const view = container ?? this.application.element;

            // Hook up event handlers only when *not* already initialized
            
            $('.carousel-control-group', view).not('[data-katapp-initialized="true"], rbl-template .carousel-control-group, [rbl-tid="inline"] .carousel-control-group').each(function () {
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

        private buildCheckboxes( view: JQuery<HTMLElement> ): void {
            $('[rbl-tid="input-checkbox"],[rbl-template-type="katapp-checkbox"]', view).not('[data-katapp-initialized="true"]').each(function () {
                const el = $(this);
                
                const id = el.data("inputname");
                const label = el.data("label");
                const help = el.data("help");
                const checked = el.data("checked");
                const css = el.data("css");
                const inputCss = el.data("inputcss");

                if ( css !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }

                if ( help !== undefined ) {
                    $("div[rbl-value='h" + id + "']", el).html(help);
                    $("a[rbl-display='vh" + id + "']", el).show();
                }

                if ( label !== undefined ) {
                    let target = $("span[rbl-value='l" + id + "'] label span.checkbox-label", el);

                    if ( target.length === 0 ) {
                        target = $("span[rbl-value='l" + id + "'] label", el);
                    }
                    target.html(label);
                }
                if ( checked ) {
                    $("span." + id + " input", el).prop("checked", true);
                }
                if ( inputCss !== undefined ) {
                    $("span." + id + " input", el).addClass(inputCss);
                }

                el.attr("data-katapp-initialized", "true");
            });
        }

        private incrementProgressBars(): void {
            let progressBarValue = 0;
            const that = this;
            const progressBarInterval = setInterval(function () {
                progressBarValue += 1;
        
                $(".progress-bar", that.application.element)
                    .css("width", progressBarValue + "%")
                    .attr("aria-valuenow", progressBarValue);
        
                if (progressBarValue >= 100) {
                    clearInterval(progressBarInterval);
                }
            }, 185);
        }
        
        processActionLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const that = this;
            const application = this.application;

            $('[rbl-action-link]', view).not('[data-katapp-initialized="true"], rbl-template [rbl-action-link], [rbl-tid="inline"] [rbl-action-link]').each(function () {
                $(this).on("click", function(e) {
                    const actionLink = $(this);
                    e.preventDefault();

                    const katAppCommand = actionLink.attr("rbl-action-link") ?? "NotSupported";
                    // Couldn't use data-confirm-selector because then two click events would have been
                    // created and not work in, need entire flow to happen here in one click...
                    const confirmSelector = actionLink.attr("rbl-action-confirm-selector");

                    const action = function (): void {
                        // JWT Support
                        // https://stackoverflow.com/a/49725482/166231 (comment about jwt, probably use XMLHttpRequest.setRequestHeader() in my implementation)
            
                        // Implementation based off of these questions
                        // https://stackoverflow.com/a/44435573/166231 (Using XMLHttpRequest to download)
                        // https://stackoverflow.com/a/29039823/166231 (dynamically changing response type)
            
                        // Failed Attempts
                        // https://stackoverflow.com/a/11520119/166231 (dynamically append/remove a form and post that)
                        //	Page navigated when error was returned.  Didn't try target=_blank or anything because in current
                        //	ESS, not used.  The <a/> does postback and if success, response is set to 'content' and it downloads
                        //	the data and all is good.  If it fails, the entire page rerenders (since just navigating to self).
                        //	Also, I didn't even try a valid file return with this yet
                        /*
                            var inputs =
                                '<input type="hidden" name="KatAppCommand" value="DocGenDownload" />' +
                                '<input type="hidden" name="KatAppView" value="' + (application.options.view || "Unknown") + '" />' +
                                '<input type="hidden" name="KatAppInputs" />';
            
                            //send request
                            var form = $('<form action="' + url + '" method="post">' + inputs + '</form>');
                            form.appendTo('body');
            
                            $("[name='KatAppInputs']", form).val(JSON.stringify(application.getInputs()));
            
                            form.submit().remove();
                        */
                        // https://gist.github.com/domharrington/884346cc04c30eeb1237
                        //	Didn't try this one, but has some 'browser compatability' code that I might want/need
                        // https://stackoverflow.com/a/28002215/166231 (looks promising with full source)
                        //	Actually didn't attempt this one.
                        // https://storiknow.com/download-file-with-jquery-and-web-api-2-0-ihttpactionresult/ (most recent answer I could find)
                        //	This one didn't work (left a comment) because of needing to return text (error) or file (success).
                        
                        const actionParameters = 
                            [].slice.call(actionLink.get(0).attributes).filter(function(attr: Attr) {
                                return attr && attr.name && attr.name.indexOf("data-param-") === 0
                            }).map( function( a: Attr ) { return a.name; } );

                        const parametersJson = {};

                        actionParameters.forEach( a => {
                            const value = actionLink.attr(a);

                            if ( value !== undefined ) {
                                parametersJson[ a.substring(11) ] = value;
                            }
                        });

                        const actionInputs = 
                            [].slice.call(actionLink.get(0).attributes).filter(function(attr: Attr) {
                                return attr && attr.name && attr.name.indexOf("data-input-") === 0
                            }).map( function( a: Attr ) { return a.name; } );
                        const inputsJson = {};

                        actionInputs.forEach( a => {
                            const value = actionLink.attr(a);

                            if ( value !== undefined ) {
                                inputsJson[ a.substring(11) ] = value;
                            }
                        });

                        application.apiAction(
                            katAppCommand, 
                            { 
                                isDownload: ( actionLink.attr("rbl-action-download") ?? "false" ) == "true",
                                customParameters: parametersJson,
                                customInputs: inputsJson
                            },
                            actionLink );
                    };
                        
                    // .on("click", function() { return that.onConfirmLinkClick( $(this)); })
                    if ( confirmSelector != undefined ) {
                        const confirm = $(confirmSelector, that.application.element).html() || "";
                        return that.application.ui.onConfirmLinkClick($(this), confirm, action);
                    }
                    else {
                        action();
                        return true;
                    }
                }).attr("data-katapp-initialized", "true");
            });
        }

        private buildFileUploads( view: JQuery<HTMLElement> ): void {
            const that = this;
            const application = this.application;

            $('[rbl-tid="input-fileupload"],[rbl-template-type="katapp-fileupload"]', view).not('[data-katapp-initialized="true"]').each(function () {
                const el = $(this);
                
                const id = el.data("inputname");
                const label = el.data("label");
                const css = el.data("css");
                const formCss = el.data("formcss");
                const inputCss = el.data("inputcss");
                const labelCss = el.data("labelcss");
                const hideLabel = el.data("hidelabel") ?? false;
                const katAppCommand = el.data("command") ?? "UploadFile";

                if ( css !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if ( formCss !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }

                if ( hideLabel ) {
                    $("label", el).remove();                    
                }
                else {
                    if ( label !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                    if ( labelCss !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).addClass(labelCss);
                    }
                }

                const input = $("input", el);

                if ( inputCss !== undefined ) {
                    input.addClass(inputCss);
                }

                $(".btn-file-remove", el).on("click", function () {
                    const file = $(this).parents('.input-group').find(':file');
                    file.val("").trigger("change");
                });
                $(".btn-file-upload", el).on("click", function () {
                    const uploadUrl = that.application.options.rbleUpdatesUrl;

                    if ( uploadUrl !== undefined ) {
                        that.application.showAjaxBlocker();
                        $(".file-upload .btn", el).addClass("disabled");
                        that.incrementProgressBars();
                        $(".file-upload-progress", that.application.element).show();

                        const fileUpload = $(".file-data", $(this).parent());
                        const fd = new FormData();
                        const files = ( fileUpload[0] as HTMLInputElement ).files;

                        $.each(files, function(key, value)
                        {
                            fd.append(key, value);
                        });

                        fd.append("KatAppCommand", katAppCommand);
                        fd.append("KatAppView", that.application.options.view ?? "Unknown" );
                        fd.append("KatAppInputs", JSON.stringify(that.application.getInputs()));

                        const errors: ValidationRow[] = [];
                        // Can't use 'view' in selector for validation summary b/c view could be a 'container' instead of entire view
                        // if caller only wants to initialize a newly generated container's html                        
                        const errorSummary = $("#" + that.application.id + "_ModelerValidationTable", that.application.element);
                        $('.validator-container.error:not(.server)', that.application.element).removeClass('error');

                        fileUpload.trigger( "onUploadStart", application );

                        $.ajax({
                            url: uploadUrl,  
                            type: 'POST',
                            data: fd,
                            cache: false,
                            contentType: false,
                            processData: false
                        }).done( function( /* payLoad */ ) {
                            fileUpload.trigger( "onUploaded", application );
                        })
                        .fail( function( _jqXHR  ) {
                            const responseText = _jqXHR.responseText || "{}";
                            const jsonResponse = JSON.parse( responseText );
                            if ( jsonResponse[ "Validations" ] != undefined && errorSummary.length > 0 ) {
                                jsonResponse.Validations.forEach((v: { [x: string]: string }) => {
                                    errors.push( { "@id": v[ "ID" ], text: v[ "Message" ] });
                                });
                                return;
                            }
                            fileUpload.trigger( "onUploadFailed", [ jsonResponse, application ] );
                        })
                        .always( function() {
                            fileUpload.trigger( "onUploadComplete", application );
                            application.rble.processValidationRows(
                                errorSummary, 
                                errors
                            );
                            fileUpload.val("").trigger("change");
                            $(".file-upload .btn", el).removeClass("disabled");
                            $(".file-upload-progress", that.application.element).hide();
                            that.application.hideAjaxBlocker();
                        })
                    }
                });
                $(".btn-file :file", el).on("change", function () {
                    const fileUpload = $(this),
                        files = ( fileUpload[0] as HTMLInputElement ).files,
                        numFiles = files?.length ?? 1,
                        label = numFiles > 1 ? numFiles + ' files selected' : ( fileUpload.val() as string).replace(/\\/g, '/').replace(/.*\//, ''), // remove c:\fakepath
                        display = $(this).parents('.input-group').find(':text'),
                        upload = $(this).parents('.input-group').find('.btn-file-upload'),
                        remove = $(this).parents('.input-group').find('.btn-file-remove');
            
            
                    display.val(label);
                    if (numFiles > 0) {
                        upload.add(remove).removeClass("hidden d-none");
                    }
                    else {
                        upload.add(remove).addClass("hidden d-none");
                    }
                });
            
                el.attr("data-katapp-initialized", "true");
            });
        }

        private buildTextBoxes( view: JQuery<HTMLElement> ): void {
            const isBootstrap3 = this.isBootstrap3;
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
                const formCss = el.data("formcss");
                const inputCss = el.data("inputcss");
                const labelCss = el.data("labelcss");
                const displayOnly = el.data("displayonly") === true;
                const hideLabel = el.data("hidelabel") ?? false;

                if ( css !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if ( formCss !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }

                if ( hideLabel ) {
                    $("label", el).remove();                    
                }
                else {
                    if ( label !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                    if ( labelCss !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).addClass(labelCss);
                    }
                }

                let input = $("input", el);

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
                    input.replaceWith($('<textarea name="' + id + '" rows="' + rows + '" id_="' + id + '" class="form-control ' + id + '"></textarea>'))
                    input = $("textarea[name='" + id + "']", el);
                }

                if ( !autoComplete || inputType === "password" ) {
                    input.attr("autocomplete", "off");
                }
                
                if ( value !== undefined ) {
                    // Don't use 'input' variable here because some templates are 
                    // 2 column templates and I want all the styling to apply (i.e. RTX:PensionEstimate)
                    // to all inputs but default value should only apply to current value
                    $("input[name='" + id + "']", el).val(value);
                }

                const validatorContainer = $(".validator-container", el);

                if ( !displayOnly ) {
                    $(".form-control-display-only", el).remove();

                    const datePickerAvailable = typeof $.fn.datepicker === "function";

                    if ( inputType === "date" && datePickerAvailable ) {
                        validatorContainer.addClass("input-group date");
                        $(".error-msg", validatorContainer).addClass("addon-suffix"); // css aid

                        let addOnContainer = validatorContainer;
                        
                        if ( !isBootstrap3 ) {
                            addOnContainer = $("<div class='input-group-append'></div>");
                            addOnContainer.append($("<i class='input-group-text fa fa-calendar-day'></i>"));
                            validatorContainer.append( addOnContainer );
                        }
                        else {
                            addOnContainer.append($("<span class='input-group-addon'><i class='glyphicon glyphicon-calendar'></i></span>"));
                        }
    
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
                                    $(".datepicker-days .clear", view).on("click", function () {
                                        dateInput.val("");
                                        dateInput.change();
                                    });
                                }
                            })
                            .on("hide", function () {
                                const dp = $(this);
                                dp.removeData("datepicker-show");
    
                                $(".datepicker-days .clear", view).off("click");
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

                        let addOnContainer = validatorContainer;
                        
                        if ( !isBootstrap3 ) {
                            addOnContainer = $("<div class='input-group-prepend'></div>");
                            validatorContainer.prepend( addOnContainer );
                        }
                        
                        addOnContainer.prepend($("<span class='input-group-addon input-group-text'>" + prefix + "</span>"));
                    }
                    else if ( suffix !== undefined ) {
                        validatorContainer.addClass("input-group");
                        $(".error-msg", validatorContainer).addClass("addon-suffix"); // css aid

                        let addOnContainer = validatorContainer;
                        
                        if ( !isBootstrap3 ) {
                            addOnContainer = $("<div class='input-group-append'></div>");
                            validatorContainer.append( addOnContainer );
                        }
                        
                        addOnContainer.append($("<span class='input-group-addon input-group-text'>" + suffix + "</span>"));
                    }
                }
                else {
                    input.css("display", "none");
                    $("div." + id + "DisplayOnly", el).html(value);
                }

                el.attr("data-katapp-initialized", "true");
            });
        }

        private buildListControls( view: JQuery<HTMLElement> ): void {
            const listControls = $('[rbl-tid="input-radiobuttonlist"],[rbl-template-type="radiobuttonlist"]', view);
            const that = this;

            listControls.not('[data-katapp-initialized="true"]').each( function() {
                const el = $(this);

                // Do all data-* attributes that we support
                const id = el.data("inputname");
                const label = el.data("label");
                const horizontal = el.data("horizontal") ?? false;
                const hideLabel = el.data("hidelabel") ?? false;
                const lookuptable = el.data("lookuptable");
                const css = el.data("css");
                const formCss = el.data("formcss");
                const container = $("." + id, el);
                                
                // To make it easier during RBL processing to determine what to do
                container.attr("data-horizontal", horizontal);

                if ( horizontal ) {
                    container.addClass("form-group");
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group");
                }

                if ( css !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }
                if ( formCss !== undefined ) {
                    $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                }

                if ( hideLabel ) {
                    $("label", el).remove();                    
                }
                else if ( label !== undefined ) {
                    $("span[rbl-value='l" + id + "']", el).html(label);
                }
                
                if ( lookuptable !== undefined ) {
                    // Need to fix this
                    const options =
                        $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                            .map( ( index, ti ) => ({ Value: ti.getAttribute("key"), Text: ti.getAttribute( "name"), Class: undefined, Help: undefined, Selected: index == 0, Visible: true, Disabled: false }));

                    that.application.ui.processListItems(container, false, options.toArray());
                }
        
                el.attr("data-katapp-initialized", "true");
            });
        }

        private buildDropdowns( view: JQuery<HTMLElement> ): void {
            const dropdowns = $('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', view);
            const selectPickerAvailable = typeof $.fn.selectpicker === "function";
            const that = this;

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
                    $("[rbl-display='v" + id + "']", el).addClass(css);
                }

                if ( label !== undefined ) {
                    $("span[rbl-value='l" + id + "']", el).html(label);
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
                    that.application.ui.processDropdownItems(
                        input, 
                        false,
                        $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem")
                            .map( ( index, r ) => ({ Value:  r.getAttribute("key"), Text: r.getAttribute( "name"), Class: undefined, Subtext: undefined, Html: undefined, Selected: index === 0, Visible: true }))
                            .toArray()
                    );
                }

                // Merge all other data-* attributes they might want to pass through
                $.each(this.attributes, function(i, attrib){
                    const name = attrib.name;
                    if ( name.startsWith( "data-") ) {
                        input.attr(name, attrib.value);
                    }
                 });

                if ( selectPickerAvailable ) {
                    $(".bootstrap-select", el).selectpicker();

                    $(".bootstrap-select", el)
                        .attr("data-kat-bootstrap-select-initialized", "true")
                        .next(".error-msg")
                        .addClass("selectpicker"); /* aid in css styling */ /* TODO: Don't think this is matching and adding class */
                }
        
                el.attr("data-katapp-initialized", "true");
            });
        }

        private buildSliders( view: JQuery<HTMLElement> ): void {
            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', view).not('[data-katapp-initialized="true"]').each( function() {
                const el = $(this);

                const id = el.data("inputname");

                if ( el.attr("data-katapp-initialized") !== "true" ) {
                    // Do all data-* attributes that we support
                    const label = el.data("label");
                    const css = el.data("css");
                    
                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }
    
                    if ( label !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
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

        processUI( container?: JQuery<HTMLElement> ): void {
            this.processInputs( container );
            this.processCarousels( container );
            this.processHelpTips( container );
            this.processActionLinks( container );
        }

        processHelpTips( container?: JQuery<HTMLElement> ): void {
            // Couldn't include the Bootstrap.Tooltips.js file b/c it's selector hits entire page, and we want to be localized to our view.
            const selector = "[data-toggle='tooltip'], [data-toggle='popover'], .tooltip-trigger, .tooltip-text-trigger, .error-trigger";
            const application = this.application;
            const view = container ?? application.element;
            const isBootstrap3 = this.isBootstrap3;

            if ( typeof $.fn.popover !== "function" && $(selector, view).length > 0 ) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present.", TraceVerbosity.None);
                return;
            }

            $(selector, view)
                .not('.rbl-help, [data-katapp-initialized="true"]')
                .not('rbl-template [data-toggle="tooltip"], [rbl-tid="inline"] [data-toggle="tooltip"]')
                .not('rbl-template [data-toggle="popover"], [rbl-tid="inline"] [data-toggle="popover"]')
                .not('rbl-template .tooltip-trigger, [rbl-tid="inline"] .tooltip-trigger')
                .not('rbl-template .tooltip-text-trigger, [rbl-tid="inline"] .tooltip-text-trigger')
                .not('rbl-template .error-trigger, [rbl-tid="inline"] .error-trigger')
                .each( function() {
                    const isErrorValidator = $(this).hasClass('error-msg');
                    let placement = $(this).data('placement') || "top";
                    const trigger = $(this).data('trigger') || "hover";
                    const container = $(this).data('container') || "body";

                    const options: Bootstrap.PopoverOptions = {
                        html: true,
                        sanitize: false,
                        trigger: trigger,
                        container: container,
                        template: 
                            isErrorValidator && isBootstrap3 
                                ? '<div class="tooltip error katapp-css" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>' :
                            isBootstrap3 
                                ? '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>' :
                            isErrorValidator 
                                ? '<div class="tooltip error katapp-css" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
                                : '<div class="popover katapp-css" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
                
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
            
                            if ( !isBootstrap3 ) {
                                // Bootstrap 4 no longer supports 'left auto' (two placements) so just in case any markup has that still
                                // remove it (unless it is only thing specified - which 'popper' supports.)
                                const autoToken = /\s?auto?\s?/i
                                const autoPlace = autoToken.test(placement)
                                if (autoPlace) placement = placement.replace(autoToken, '') || 'auto';
                            }

                            return placement;
                        },
                        title: function () {
                            const  titleSelector = $(this).data('content-selector');
                            if (titleSelector != undefined) {
                                const title = $(titleSelector + "Title").text();
                                if (title != undefined) {
                                    return title;
                                }
                            }                    
                            return "";            
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
                        // Hover for this one...
                        $(this).tooltip(options)
                            .on('inserted.bs.tooltip', function (e) {
                                const isWarning = $("label.warning", $(e.target)).length == 1;
                                if (isWarning) {
                                    const templateId = "#" + $(e.target).attr("aria-describedby");
                                    $(templateId, view).removeClass("error").addClass("warning");
                                }
                            });
                    }
                    else {
                        $(this).popover(options);
                    }
                                
                })
                .attr("data-katapp-initialized", "true");

            const that = this;

            // Code to hide tooltips if you click anywhere outside the tooltip
            // Combo of http://stackoverflow.com/a/17375353/166231 and https://stackoverflow.com/a/21007629/166231 (and 3rd comment)
            // This one looked interesting too: https://stackoverflow.com/a/24289767/166231 but I didn't test this one yet
            const hideVisiblePopover = function(): void {
                // Going against entire KatApp (all apps) instead of a local variable because I only setup
                // the HTML click event one time, so the 'that=this' assignment above would be the first application
                // and might not match up to the 'currently executing' katapp, so had to make this global anyway
                const visiblePopover = KatApp[ "visiblePopover" ];
                // Just in case the tooltip hasn't been configured
                if ( visiblePopover === undefined || $(visiblePopover).data("bs.popover") === undefined ) return;
    
                // Call this first b/c popover 'hide' event sets visiblePopover = undefined
                if ( that.isBootstrap3 ) {
                    $(visiblePopover).data("bs.popover").inState.click = false
                }
                $(visiblePopover).popover("hide");
            };

            if ( application.element.attr("data-katapp-initialized-tooltip") != "true" ) {
                application.element
                    .on("show.bs.popover.RBLe", function() { hideVisiblePopover(); })
                    .on("shown.bs.popover.RBLe", function( e ) { 
                        KatApp[ "visiblePopover"] = e.target; 
                        $("div.katapp-css[role='tooltip'] [rbl-action-link]").attr("data-katapp-initialized", "false");
                        application.templateBuilder.processActionLinks($("div.katapp-css[role='tooltip']"));
                    })
                    .on("hide.bs.popover.RBLe", function() { 
                        KatApp[ "visiblePopover"] = undefined; 
                    })
                    .on("keyup.RBLe", function( e ) {
                        if (e.keyCode != 27) // esc
                            return;

                        hideVisiblePopover();
                        e.preventDefault();
                    })
                    .on("click.RBLe", function( e ) {
                        return;
                        if ($(e.target).is(".popover-title, .popover-content")) return; // BS3
                        if ($(e.target).is(".popover-header, .popover-body")) return; // BS4                        
                        hideVisiblePopover();
                    })
                    .attr("data-katapp-initialized-tooltip", "true");
            }
            if ( $("html").attr("data-katapp-initialized-tooltip") != "true" ) {
                $("html")
                    .on("click.RBLe", function( e ) {
                        if ($(e.target).is(".popover-title, .popover-content")) return; // BS3
                        if ($(e.target).is(".popover-header, .popover-body")) return; // BS4                        
                        hideVisiblePopover();
                    })
                    .attr("data-katapp-initialized-tooltip", "true");
            }

            // When helptip <a/> for checkboxes were  moved inside <label/>, attempting to click the help icon simply toggled
            // the radio/check.  This stops that toggle and lets the help icon simply trigger it's own click to show or hide the help.
            $('.checkbox label a[data-toggle], .abc-checkbox label a[data-toggle]', view)
                .not("[data-katapp-checkbox-tips-initialized='true']")
                .on('click', function (e) {
                    e.stopPropagation();
                    return false;
                })
                .attr("data-katapp-checkbox-tips-initialized", "true");
        }

        private processInputs( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;

            this.buildDropdowns( view );
            this.buildTextBoxes( view );
            this.buildFileUploads( view );
            this.buildListControls( view );
            this.buildCheckboxes( view );
            this.buildSliders( view );
        }
    }
    $.fn.KatApp.standardTemplateBuilderFactory = function( application: KatAppPlugIn ): StandardTemplateBuilder/*Interface*/ {
        return new StandardTemplateBuilder( application );
    };

    $.fn.KatApp.reset = function(): void {
        // This is deleted each time the 'real' Provider js runs, so rebuild it
        $.fn.KatApp.plugInShims = [];
        $.fn.KatApp.applications = [];
        // reset factory to shim factory
        $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory;
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
        // remove templates
        $("rbl-katapps > rbl-templates").remove();
        $.fn.KatApp.templatesUsedByAllApps = {};
        $.fn.KatApp.templateDelegates = [];
    }

    // Replace the applicationFactory to create real KatAppPlugIn implementations
    $.fn.KatApp.applications = [];
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
        
        const applications = $.fn.KatApp.applications as KatAppPlugIn[];
        const application = new KatAppPlugIn(id, element, options);
        applications.push( application );
        return application;
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

    // Overwrite the implementation of getResources with latest version so that it can support
    // improvements made (i.e. checking local web server first)
    KatApp[ "ping" ] = function( url: string, callback: ( responded: boolean, error?: string | Event )=> void ): void {
        const ip = url.replace('http://','').replace('https://','').split(/[/?#]/)[0];

        $.ajax({
            url: "http://" + ip + "/DataLocker/Global/ping.js",
            timeout: 1000,
            success: function( /* result */ ){
                callback(true);
            },     
            error: function( /* result */ ){
                callback(false);
            }
         });
    }
    KatApp[ "getResources" ] = function( application: KatAppPlugInShimInterface, resources: string, useTestVersion: boolean, isScript: boolean, debugResourcesDomain: string | undefined, getResourcesHandler: PipelineCallback ): void {
        const currentOptions = application.options;
        const url = currentOptions.functionUrl ?? KatApp.defaultOptions.functionUrl ?? KatApp.functionUrl;
        const resourceArray = resources.split(",");
        
        let localDomain: string | undefined = debugResourcesDomain ?? "http://localhost:8887/DataLocker/";

        let useLocalResources = localDomain !== undefined; // global value for all requested resources
        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string, optional Version

        let pipeline: Array<()=> void> = [];
        let pipelineNames: Array<string> = [];
        let pipelineIndex = 0;

        const getResourcesPipeline = function(): void {
            if ( pipelineIndex > 0 ) {
                application.trace( pipelineNames[ pipelineIndex - 1 ] + ".finish", TraceVerbosity.Detailed );
            }

            if ( pipelineIndex < pipeline.length ) {                    
                application.trace( pipelineNames[ pipelineIndex ] + ".start", TraceVerbosity.Detailed );
                pipeline[ pipelineIndex++ ]();
            }
        };

        let pipelineError: string | undefined = undefined;

        const resourceResults: ResourceResults = {};

        // Build a pipeline of functions for each resource requested.
        // TODO: Figure out how to make this asynchronous
        pipeline = 
            [
                function(): void {
                    if ( localDomain !== undefined ) {
                        if ( application.element.data("kat-local-domain-reachable") == undefined ) {
                            KatApp.ping(localDomain, function( responded: boolean ) { 
                                if ( !responded ) {
                                    localDomain = undefined;
                                    useLocalResources = false;
                                    application.element.data("kat-local-domain-reachable", false);
                                }
                                else {
                                    application.element.data("kat-local-domain-reachable", true);
                                }
                                getResourcesPipeline(); // Now start downloading resources
                            });
                        }
                        else {
                            if ( !( application.element.data("kat-local-domain-reachable") as boolean ) ) {
                                // Already pinged and no return
                                localDomain = undefined;
                                useLocalResources = false;
                            }
                            getResourcesPipeline(); // Now start downloading resources
                        }                        
                    }
                    else {
                        getResourcesPipeline(); // Now start downloading resources
                    }
                }
            ].concat(
                resourceArray.map( r => {
                    return function(): void {
                        if ( pipelineError !== undefined ) {
                            getResourcesPipeline();
                            return;
                        }

                        let useLocalResource = useLocalResources; // value for current requested resource

                        try {
                            const resourceParts = r.split(":");
                            let resource = resourceParts[ 1 ];
                            const folder = resourceParts[ 0 ];
                            let currentFolder = 0;
                            const folders = folder.split("|");
                            const version = resourceParts.length > 2 ? resourceParts[ 2 ] : ( useTestVersion ? "Test" : "Live" ); // can provide a version as third part of name if you want
            
                            // Template names often don't use .xhtml syntax
                            if ( !resource.endsWith( ".kaml" ) && !isScript ) {
                                resource += ".kaml";
                            }
            
                            const params: GetResourceOptions = {
                                Command: 'KatAppResource',
                                Resources: [
                                    {
                                        Resource: resource,
                                        Folder: folder,
                                        Version: version
                                    }
                                ]
                            };

                            let localFolder = folders[ currentFolder ] + "/";
                            const isRelativePath = KatApp.stringCompare( localFolder, "Rel/", true ) == 0;

                            const submit =
                                ( !useLocalResource ? currentOptions.submitCalculation : undefined ) ??
                                function( _app, o, done, fail ): void {
                                    let resourceUrl = useLocalResource ? localDomain + localFolder + resource : url; // + JSON.stringify( params )

                                    if ( isRelativePath )
                                    {
                                        resourceUrl = resource;
                                    }

                                    KatApp.trace(application, "Downloading " + resource + " from " + resourceUrl, TraceVerbosity.Diagnostic );

                                    const ajaxConfig = 
                                    { 
                                        url: resourceUrl,
                                        data: !useLocalResource && !isRelativePath ? JSON.stringify( o ) : undefined,
                                        method: !useLocalResource && !isRelativePath ? "POST" : undefined,
                                        dataType: !useLocalResource && !isRelativePath ? "json" : undefined,
                                        // async: true, // NO LONGER ALLOWED TO BE FALSE BY BROWSER
                                        cache: false
                                    };
            
                                    // Need to use .ajax isntead of .getScript/.get to get around CORS problem
                                    // and to also conform to using the submitCalculation wrapper by L@W.
                                    $.ajax( ajaxConfig ).done( done ).fail(  fail );
                                };
                                    
                            const submitDone: RBLeServiceCallback = function( data ): void {
                                if ( data == null ) {
                                    // Bad return from L@W
                                    pipelineError = "getResources failed requesting " + r + " from L@W.";
                                    getResourcesPipeline();
                                }
                                else {
                                    if ( data.payload !== undefined ) {
                                        data = JSON.parse(data.payload);
                                    }
                                    
                                    // data.Content when request from service, just data when local files
                                    const resourceContent = data.Resources?.[ 0 ].Content ?? data as string;

                                    if ( isScript ) {
                                        // If local script location is provided, doing the $.ajax code automatically 
                                        // injects/executes the javascript, no need to do it again
                                        const body = document.querySelector('body');

                                        // Still trying to figure out how to best determine if I inject or not, might have to make a variable
                                        // at top of code in KatAppProvider, but if it 'ran', then $.fn.KatApp.plugInShims should be undefined.
                                        // Originally, I just looked to see if debugResourcesDomain was undefined...but if that is set and the domain
                                        // does NOT match domain of site running (i.e. debugging site in asp.net that uses KatApps and I want it to
                                        // hit development KatApp resources) then it doesn't inject it.  So can't just check undefined or not.
                                        if ( body !== undefined && body !== null && $.fn.KatApp.plugInShims !== undefined && resourceContent !== undefined ) {

                                            // Just keeping the markup a bit cleaner by only having one copy of the code
                                            $("script[rbl-script='true']").remove()

                                            // https://stackoverflow.com/a/56509649/166231
                                            const script = document.createElement('script');
                                            script.setAttribute("rbl-script", "true");
                                            const content = resourceContent;
                                            script.innerHTML = content;
                                            body.appendChild(script);
                                        }
                                    }
                                    else {
                                        resourceResults[ r ] = resourceContent;
                                    }
                                    getResourcesPipeline(); 
                                }
                            };

                            const submitFailed: JQueryFailCallback = function( _jqXHR, textStatus, _errorThrown ): void {
                                // If local resources, syntax like LAW.CLIENT|LAW:sharkfin needs to try client first, then
                                // if not found, try generic.
                                if ( useLocalResource && currentFolder < folders.length - 1 ) {
                                    currentFolder++;
                                    localFolder = !isScript ? folders[ currentFolder ] + "/" : "";
                                    submit( application as KatAppPlugInInterface, params, submitDone, submitFailed );
                                }
                                else if ( useLocalResource && !isRelativePath && currentFolder >= folders.length -1 ) {
                                    useLocalResource = false; // If I had useLocalResource but it couldn't find it, try real site
                                    submit( application as KatAppPlugInInterface, params, submitDone, submitFailed );
                                }
                                else {
                                    pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                                    console.log( _errorThrown );
                                    getResourcesPipeline();
                                }
                            };

                            submit( application as KatAppPlugInInterface, params, submitDone, submitFailed );
                                                    
                        } catch (error) {
                            pipelineError = "getResources failed trying to request " + r + ":" + error;
                            getResourcesPipeline();
                        }
                    }
                }).concat( 
                    [
                        // Last function
                        function(): void {
                            if ( pipelineError !== undefined ) {
                                getResourcesHandler( pipelineError );
                            }
                            else {
                                getResourcesHandler( undefined, resourceResults );
                            }
                        }
                    ]
                )
            );

        pipelineNames = [ "getResourcesPipeline.ping" ].concat( resourceArray.map( r => "getResourcesPipeline." + r ).concat( [ "getResourcesPipeline.finalize" ] ) );

        // Start the pipeline
        getResourcesPipeline();
    }

    // If this is undefined, it is the first time through, so set up templates container and shared template state
    // NOTE: This script could be dynamically reloaded (via debugger KatApp) and this variable remains intact so that
    // it doesn't blow away existing shared data, so leave the if statement even though it seems like it shouldn't be
    // needed since when script is ran for 'first time' (which could be the 'only' time) obviously tempaltesUsedByAllApps
    // is undefined.
    if ( $.fn.KatApp.templatesUsedByAllApps == undefined ) {
        $('<rbl-katapps>\
            <style>\
                rbl-katapps, rbl-templates, rbl-template, [rbl-tid="inline"] { display: none; }\
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
//# sourceURL=DataLocker\Global\KatAppProvider.js