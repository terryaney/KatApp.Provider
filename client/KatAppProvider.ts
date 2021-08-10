const providerVersion = 9.02; // eslint-disable-line @typescript-eslint/no-unused-vars
// Hack to get bootstrap modals in bs5 working without having to bring in the types from bs5.
// If I brought in types of bs5, I had more compile errors that I didn't want to battle yet.
declare var bootstrap: any;

KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);

// Need this function format to allow for me to reload script over and over (during debugging/rebuilding)
(function($, window, document, undefined?: undefined): void {
    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const inputsToIgnoreSelector = "[data-itemtype='checkbox'] :input, .notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;
    const skipBindingInputSelector = ".notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, rbl-template :input, [type='search']" + tableInputsAndBootstrapButtons;

    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend(
        {
            debug: {
                traceVerbosity: TraceVerbosity.None,
                saveFirstCalculationLocation: KatApp.pageParameters[ "save" ],
                useTestCalcEngine: KatApp.pageParameters[ "test" ] === "1",
                refreshCalcEngine: KatApp.pageParameters[ "expirece" ] === "1",
                allowLocalServer: KatApp.pageParameters[ "allowlocal" ] === "1",
                showInspector: KatApp.pageParameters[ "showInspector" ] === "1"
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
                    $("div[data-slider-type='nouislider'], " + inputSelector, application.element)
                        .not(skipBindingInputSelector + ", :disabled")
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

    class KatAppPlugIn implements KatAppPlugInInterface {
        // Helper classes, see comment in interfaces class
        rble: RBLeUtilities/*Interface*/;
        ui: UIUtilities/*Interface*/;
        templateBuilder: StandardTemplateBuilder;

        // Fields
        element: JQuery;
        options: KatAppOptions = {};
        id: string;
        endpointRBLeInputsCache: {} = {};

        displayId: string;
        exception?: RBLeServiceResults | undefined;
        results?: TabDef[] | undefined;
        calculationInputs?: CalculationInputs | undefined;
        
        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = "ka" + id; // Some BS elements weren't working if ID started with #
            this.element = element;
            this.displayId = element.attr("rbl-trace-id") ?? id;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[ 0 ].KatApp = this;
            this.ui = new UIUtilities( this );
            this.rble = new RBLeUtilities( this );
            this.templateBuilder = new StandardTemplateBuilder( this );

            this.init( options );
        }
    
        dataAttributesToJson( container: JQuery, attributePrefix: string, convertToCalcEngineNames?: boolean ): object {
            const attributeNames = 
                [].slice.call(container.get(0).attributes).filter(function(attr: Attr) {
                    return attr && attr.name && attr.name.indexOf(attributePrefix) === 0
                }).map( function( a: Attr ) { return a.name; } );

            const json = {};

            attributeNames.forEach( a => {
                const value = container.attr(a);

                if ( value !== undefined ) {
                    let inputName = a.substring(attributePrefix.length);
                    
                    if ( convertToCalcEngineNames ?? false ) {
                        const inputNameParts = inputName.split("-");
                        inputName = "i";
                        inputNameParts.forEach( n => {
                            inputName += ( n[ 0 ].toUpperCase() + n.slice(1) );
                        });
                    }

                    json[ inputName ] = value;
                }
            });
            return json;            
        } 

        private init( options: KatAppOptions ): void {

            // MULTIPLE CE: Need to support nested config element of multiple calc engines I guess
            //              Problem.. if passed in options has calcEngine(s) specified or if there is config
            //              specified on this.element, how do match those up to what could be possibly multiple
            //              CalcEngines defined in view

            // MULTIPLE CE: Test if extend uses options passed in to replace

            // Transfer data attributes over if present...
            const attrCalcEngine = this.element.attr("rbl-calcengine");
            const calcEngine: CalcEngine | undefined = attrCalcEngine != undefined
                ? {
                    key: "default",
                    name: attrCalcEngine,
                    inputTab: this.element.attr("rbl-input-tab"),
                    resultTabs: this.element.attr("rbl-result-tabs")?.split(","),
                    preCalcs: this.element.attr("rbl-precalcs")
                }
                : undefined;

            const attributeOptions: KatAppOptions = {
                calcEngines: calcEngine != undefined ? [ calcEngine ] : KatApp.defaultOptions.calcEngines,
                view: this.element.attr("rbl-view"),
                viewTemplates: this.element.attr("rbl-view-templates")
            };

            // Backwards compatability when options had a 'calcEngine' property instead of calcEngines
            if ( options[ "calcEngine" ] != undefined ) {
                options.calcEngines = [
                    { key: "default", name: options[ "calcEngine" ] }
                ];
                delete options[ "calcEngine" ];
            }

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

            if ( $.fn.KatApp.inputsToPassOnNavigate.Applications.length > 0 ) {
                if ( this.options.defaultInputs == undefined ) {
                    this.options.defaultInputs = { };
                }
                const defaultInputs = this.options.defaultInputs;
                $.fn.KatApp.inputsToPassOnNavigate.Applications.forEach( a => {
                    if ( a.inputs != undefined ) {
                        Object.keys(a.inputs).forEach( k => {
                            defaultInputs[ k ] = a.inputs![ k ];
                        });
                    }
                })
            }
            
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
            let viewElement: JQuery<HTMLElement> | undefined = undefined;

            let inlineContainer = $("rbl-katapps > rbl-templates[rbl-t='_INLINE']");
            if ( inlineContainer.length == 0 ) {
                inlineContainer = $("<rbl-templates rbl-t='_INLINE'></rbl-templates>");
                $("rbl-katapps").append(inlineContainer);
            }
            
            const processTemplates = function(templateContainer: JQuery<HTMLElement>, containerName: string ): void {
                let inlineTemplates: JQuery<HTMLElement>;
                // Get all lowest level inlines and walk 'up'
                while( ( inlineTemplates = $("[rbl-tid='inline']", templateContainer).filter( function() { return $("[rbl-tid='inline']", $(this)).length == 0; } ) ).length > 0 )
                {
                    inlineTemplates.each(function() {
                        const inlineTemplate = $(this);
                        const inlineParent = inlineTemplate.parent();
                        if ( inlineParent.attr("rbl-source") == undefined ) {
                            that.trace( "Inline template's parent does not have rbl-source. " + this.outerHTML.substr(0, 75).replace( /</g, "&lt;").replace( />/g, "&gt;"), TraceVerbosity.None);
                        }
                        else if ( inlineParent.attr("rbl-tid") != undefined ) {
                            that.trace( "Inline template is present, but parent has rbl-tid of " + inlineParent.attr("rbl-tid"), TraceVerbosity.None);
                        }
                        else {
                            const tId = "_inline_" + KatApp.generateId();
                            const rblTemplateContent = that.ui.encodeTemplateContent(inlineTemplate.removeAttr("rbl-tid")[0].outerHTML);
                            const rblTemplate = 
                                $("<rbl-template/>")
                                    .attr("tid", tId)
                                    .attr("container", containerName)
                                    .html(rblTemplateContent);
                            inlineContainer.append(rblTemplate);
                            inlineParent.attr( "rbl-tid", tId );
                            inlineTemplate.remove();
                        }
                    });
                }

                // For all remaining templates, massage the markup so it doesn't cause issues (tr/td being dropped if not direct child of table/tbody)
                $("rbl-template", templateContainer)
                    .not("[tid='lookup-tables']") // never injected...
                    .each(function() {
                        const t = $(this);
                        t.html(that.ui.encodeTemplateContent(t.html()));
                    });
            };
            
            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            const loadView = function(): void { 
                if ( viewId !== undefined ) {
                    that.trace(viewId + " requested from CMS", TraceVerbosity.Detailed);
                    
                    const debugResourcesDomain = that.options.debug?.debugResourcesDomain;

                    KatApp.getResources( that, viewId, useTestView, false, debugResourcesDomain,
                        ( errorMessage, results ) => {                                

                            pipelineError = errorMessage;

                            if ( pipelineError === undefined && results != undefined ) {
                                that.trace(viewId + " returned from CMS", TraceVerbosity.Normal);

                                const data = results[ viewId ];

                                // Process as view - get info from rbl-config and inject markup
                                const thisClassCss = ".katapp-" + that.id;
                                const content = 
                                    data
                                        .replace( /{thisView}/g, "[rbl-application-id='" + that.id + "']" )
                                        .replace( /{id}/g, that.id )
                                        .replace( /{thisClass}/g, thisClassCss )
                                        .replace( /\.thisClass/g, thisClassCss )
                                        .replace( /thisClass/g, thisClassCss );

                                viewElement = $("<div class='katapp-css'>" + content + "</div>");
                                const rblConfig = $("rbl-config", viewElement).first();

                                processTemplates(viewElement, viewId);

                                // Not sure if I need to manually add script or if ie will load them
                                // https://www.danielcrabtree.com/blog/25/gotchas-with-dynamically-adding-script-tags-to-html
                                // IE is not loading scripts of my test harness at the moment
                                // const scripts = $("script", view);
                                // $("script", view).remove();
                                // alert(scripts.length);

                                const viewCalcEngines: CalcEngine[] = [];

                                if ( rblConfig.length !== 1 ) {
                                    that.trace("View " + viewId + " is missing rbl-config element", TraceVerbosity.Quiet);
                                }
                                else {
                                    const attrCalcEngine = rblConfig.attr("calcengine");
    
                                    if ( attrCalcEngine != undefined ) {
                                        viewCalcEngines.push(
                                            {
                                                key: rblConfig.attr("calcengine-key") ?? "default",
                                                name: attrCalcEngine,
                                                inputTab: rblConfig.attr("input-tab"),
                                                resultTabs: rblConfig.attr("result-tabs")?.split(","),
                                                preCalcs: rblConfig.attr("precalcs")
                                            }                                        
                                        );
                                    }
                                    $("calc-engine", rblConfig).each(function ( i, c ) {
                                        const ce = $(c);
                                        viewCalcEngines.push(
                                            {
                                                key: ce.attr("key") ?? ce.attr("name") ?? "UNAVAILABLE",
                                                name: ce.attr("name") ?? "UNAVAILABLE",
                                                inputTab: ce.attr("input-tab"),
                                                resultTabs: ce.attr("result-tabs")?.split(","),
                                                preCalcs: ce.attr("precalcs")
                                            }                                        
                                        );
                                    });
                                    }

                                if ( viewCalcEngines.length > 0 ) {
                                    if ( that.options.calcEngines?.length == 1 && viewCalcEngines.length == 1 ) {
                                        // Backward support a bit, if only one calc engine in options/katapp attributes 
                                        // and only one in view config, then 'merge' input/result/precalc from view config 
                                        // if not provided already
                                        const calcEngine = that.options.calcEngines[ 0 ]; // The CE configured in options/katapp attributes
                                        calcEngine.inputTab = calcEngine.inputTab ?? rblConfig?.attr("input-tab");
                                        calcEngine.resultTabs = calcEngine.resultTabs ?? rblConfig?.attr("result-tabs")?.split(",");
                                        calcEngine.preCalcs = calcEngine.preCalcs ?? rblConfig?.attr("precalcs");
                                    }
                                    else if ( that.options.calcEngines == undefined ) {
                                        // otherwise if option calcengines *not* passed in, then I can use view calcengines
                                        that.options.calcEngines = viewCalcEngines;
                                    }
                                }
                                
                                const toFetch = rblConfig?.attr("templates");
                                if ( toFetch !== undefined ) {
                                    requiredTemplates = 
                                        requiredTemplates
                                            .concat( toFetch.split(",").map( r => r.ensureGlobalPrefix() ) )
                                            // unique templates only
                                            .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i );

                                }
                                
                                // Don't insert viewElement here...wait until templates are injected so if any styling is needed, it'll be ready/loaded for view
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
                                that.trace("Template: " + r + " is now ready", TraceVerbosity.Detailed);

                                // only process (moving to finish or next step) if not already assigned an error
                                if ( pipelineError === undefined ) {
                                    if ( errorMessage === undefined ) {
                                        otherResourcesNeeded--;
                                        if ( otherResourcesNeeded === 0 ) {
                                            that.trace("No more templates needed, process 'inject templates' pipeline", TraceVerbosity.Diagnostic);
                                            initPipeline( 0 ); // move to next step if not waiting for anything else
                                        }
                                        else {
                                            that.trace("Waiting for " + otherResourcesNeeded + " more templates", TraceVerbosity.Diagnostic);
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
                    that.trace(toFetchList + " requested from CMS", TraceVerbosity.Detailed);

                    const debugResourcesDomain = that.options.debug?.debugResourcesDomain;

                    that.trace("Downloading " + toFetchList + " from " + debugResourcesDomain ?? functionUrl, TraceVerbosity.Diagnostic );
                    KatApp.getResources( that, toFetchList, useTestView, false, debugResourcesDomain,
                        ( errorMessage, data ) => {                                

                            if ( errorMessage === undefined ) {
                                resourceResults = data as ResourceResults;
                                that.trace(toFetchList + " returned from CMS", TraceVerbosity.Normal);
                                
                                // Only move on if not waiting on any more resources from other apps
                                if ( otherResourcesNeeded === 0 ) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline", TraceVerbosity.Diagnostic);
                                    initPipeline( 0 );
                                }
                                else {
                                    that.trace("Can't move to next step because waiting on templates", TraceVerbosity.Diagnostic);
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

                        const rblKatApps = $("rbl-katapps");
                        const templateContent = $("<rbl-templates rbl-t='" + r.toLowerCase() + "'>" + data.replace( /{thisTemplate}/g, r ) + "</rbl-templates>");

                        processTemplates(templateContent, r);

                        templateContent.appendTo(rblKatApps);

                        that.trace( r + " injected into markup", TraceVerbosity.Normal );

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

                    if ( viewElement != undefined ) {
                        that.element.empty().append( viewElement );
                    }

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
                                    that.trace( "[" + d.Events + "] events from template [" + d.Template + "] hooked up", TraceVerbosity.Normal );
                                    that.element.on( d.Events, function( ...args ): void {
                                        d.Delegate.apply( this, args );
                                    } );
                                });
                        });

                    // Update options.viewTemplates just in case someone is looking at them
                    that.options.viewTemplates = requiredTemplates.join( "," );

                    that.ui.injectTemplatesWithoutSource(that.element);

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
                    
                    that.ui.handleVoidAnchors();
                    that.ui.bindRblOnHandlers();

                    that.ui.triggerEvent( "onInitialized", that );

                    if ( that.options.runConfigureUICalculation ) {
                        that.trace( "Calling configureUI calculation...", TraceVerbosity.Detailed );
                        that.configureUI();
                    }
                    else if ( that.options.manualResults != undefined ) {
                        that.processResults( that.options );
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

        private setRegisteredToken( token: string ): void {
            this.options.registeredToken = token;

            if ( this.options.shareDataWithOtherApplications ?? false ) {
                const _sharedData = $.fn.KatApp.sharedData;
                _sharedData.registeredToken = token;
                this.options._sharedDataLastRequested = _sharedData.lastRequested = Date.now();                
            }
        }

        destroy(): void {
            this.unregister();
            this.ui.triggerEvent( "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        // This was needed for 'redraw' method which simply wants to 'restart' the load
        // of the view and use last 'calculation' to re-render (it is a method for UI developers)
        // I couldn't use destroy because it deleted the KatApp and only the KatAppPlugIn 'sets' that
        // so then KatApp was undefined.
        unregister(): void {
            this.element.removeAttr("rbl-application-id");
            this.element.removeClass("katapp-" + this.id);
            this.element.removeData("katapp-save-calcengine");
            this.element.removeData("katapp-refresh-calcengine");
            this.element.removeData("katapp-trace-calcengine");
            $('[data-katapp-initialized]', this.element).removeAttr("data-katapp-initialized");
            $('[data-katapp-template-injected]', this.element).removeAttr("data-katapp-template-injected");            
            this.ui.unbindCalculationInputs();
            this.element.off(".RBLe"); // remove all KatApp handlers
        }

        rebuild( options: KatAppOptions ): KatAppOptions {
            const o = KatApp.extend({}, this.options, options);
            this.unregister();
            this.init( o );
            return o;
        }

        pushNotification(name: string, information: {} | undefined): void {
            this.ui.pushNotification(this, name, information);
        }

        runRBLeCommand(commandName: string): void {
            // Debugging helper
            const app = this;

            const logSuccess = function( result: any ): void { 
                if ( result.payload !== undefined ) {
                    result = JSON.parse(result.payload);
                }

                console.log(  JSON.stringify( result ) ); 
            };
            const logError = function(xhr: JQuery.jqXHR<any> ): void { 
                console.log( "Error: " + xhr.status + ", " + xhr.statusText ); 
            };
            const data = {
                "Command": commandName, 
                "Token": app.options.registeredToken!
            };

            if ( app.options.submitCalculation != null ) {
                app.options.submitCalculation( app, data, logSuccess, logError );
            }
            else {
                $.ajax( { 
                    url: this.options.sessionUrl, 
                    contentType: "application/json", 
                    method: "POST", 
                    data: JSON.stringify( data ), 
                    success: logSuccess, 
                    error: logError
                } );
            }
        }

        navigate( navigationId: string, defaultInputs?: {} | undefined ): void {
            if ( defaultInputs != undefined ) {
                this.setDefaultInputsOnNavigate( defaultInputs );
            }

            this.ui.triggerEvent( "onKatAppNavigate", navigationId, this );
        }

        setDefaultInputsOnNavigate( inputs: {} | undefined, inputSelector?: string ): void {
            const inputsToPass = inputs ?? this.rble.getInputsBySelector( inputSelector )
            KatApp.setDefaultInputsOnNavigate( inputsToPass );
        }

        calculate( customOptions?: KatAppOptions, pipelineDone?: ()=> void ): void {
            const _sharedData = $.fn.KatApp.sharedData;

            // Shouldn't change 'share' option with a customOptions object, so just use original options to check
            const shareDataWithOtherApplications = this.options.shareDataWithOtherApplications ?? false;
            
            if ( shareDataWithOtherApplications ) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options._sharedDataLastRequested = _sharedData.lastRequested;
            }

            this.exception = this.results = undefined;

            // Build up complete set of options to use for this calculation call
            const currentOptions = KatApp.extend(
                {}, // make a clone of the options
                this.options, // original options
                customOptions, // override options
            ) as KatAppOptions;

            const cancelCalculation = !this.ui.triggerEvent( "onCalculateStart", this );

            if ( cancelCalculation ) {
                this.ui.triggerEvent( "onCalculateEnd", this );
                return;
            }

            if ( currentOptions.calcEngines === undefined ) {

                if ( currentOptions.manualResults != undefined ) {
                    this.setResults( [], currentOptions );
                    this.processResults( currentOptions );
                    this.ui.triggerEvent( "onCalculateEnd", this );
                }

                return;
            }

            const that: KatAppPlugIn = this;
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
                else if ( pipelineDone != undefined ) {
                    pipelineDone();
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

            // Success = submitCalculation
            // Error - processResults
            // Need Register - registerData
            const getCalculationData = function(): void {
                try {
                    pipelineError = undefined; // Was set in previous pipeline calculate attempt, but clear out and try flow again

                    if ( shareDataWithOtherApplications && _sharedData.requesting ) {
                        that.trace("Need to wait for already requested data", TraceVerbosity.Detailed);
                        // Wait for callback...

                        _sharedData.callbacks.push( function( errorMessage ) {
                            if ( errorMessage === undefined ) {
                                // When called back, it'll be after getting data *or* after
                                // registration if options call for it, so just jump to resubmit
                                that.trace("Data is now ready", TraceVerbosity.Detailed);
                                that.options.data = currentOptions.data = _sharedData.data;
                                that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                                that.options._sharedDataLastRequested = _sharedData.lastRequested;
                                calculatePipeline( 1 ); 
                            }
                            else {
                                that.trace("Data retrieval failed in other application", TraceVerbosity.Detailed);
                                throw new Error(errorMessage);
                            }                  
                        });
                    }
                    else if ( shareDataWithOtherApplications && _sharedData.lastRequested != null && ( that.options._sharedDataLastRequested === undefined || _sharedData.lastRequested > that.options._sharedDataLastRequested ) ) {
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
                        that.trace("Using existing shared data", TraceVerbosity.Detailed);
                        that.options.data = currentOptions.data = _sharedData.data;
                        that.options.registeredToken = currentOptions.registeredToken = _sharedData.registeredToken;
                        that.options._sharedDataLastRequested = _sharedData.lastRequested;
                        calculatePipeline( 1 ); 
                    }
                    else {
                        that.trace("Requesting data", TraceVerbosity.Detailed);
                        try {
                            if ( shareDataWithOtherApplications ) {
                                _sharedData.requesting = true;
                                _sharedData.registeredToken = undefined;
                                _sharedData.data = undefined;
                            }
                            that.options.data = currentOptions.data = undefined;
                            that.options.registeredToken = currentOptions.registeredToken = undefined;

                            // If failed, then I am unable to register data, so just jump to finish, 
                            // otherwise continue to registerData or submit
                            currentOptions.getData!(  // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                that,
                                currentOptions, 
                                data => { 
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
                                },
                                ( _jqXHR, textStatus ) => {
                                    that.trace("getData AJAX Error Status: " + textStatus, TraceVerbosity.Quiet);
                                    throw new Error("getData AJAX Error Status: " + textStatus);
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
                    that.ui.triggerEvent( "onCalculationErrors", "GetData", error, that.exception, currentOptions, that );
                    calculatePipeline( 4 ); // If error, jump to finish
                }
            };

            // Success - resubmitCalculation
            // Error - processResults
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
                                throw new Error(errorMessage); 
                            }
                        } 
                    );
                } catch (error) {
                    pipelineError = "Register.Pipeline exception: " + error;
                    if ( shareDataWithOtherApplications ) {
                        callSharedCallbacks( pipelineError );
                    }
                    that.ui.triggerEvent( "onCalculationErrors", "RegisterData", error, that.exception, currentOptions, that );
                    calculatePipeline( 3 );                            
                }
            };

            // Always go processResults
            // .calculate() cannot be called with expectation of synchronous execution because of this
            // pipeline function that uses Deferred objects to handle asynchronous submission of 1..N CalcEngines
            const submitCalculation = function(): void {
                
                const calculations = currentOptions.calcEngines != undefined && currentOptions.calcEngines.length > 0
                    ? currentOptions.calcEngines.map( c => {
                        const d = $.Deferred();

                        try {
                            that.rble.submitCalculation( 
                                c,
                                currentOptions,
                                ( errorMessage, result ) => { 
                                    if ( errorMessage != undefined ) {
                                        d.reject( { "calcEngine": c, "errorMessage": errorMessage } );
                                    }
                                    else {
                                        d.resolve( { "calcEngine": c, "result": result } );
                                    }
                                } 
                            );
                        } catch (error) {
                            d.reject( { "calcEngine": c, "errorMessage": "ReSubmit.Pipeline exception: " + error } );
                        }

                        return d;
                    })
                    : [
                        function(): Deferred {
                            const d = $.Deferred();
                            d.reject( { "calcEngine": "Unspecified", "errorMessage": "No CalcEngines configured to run" } );
                            return d;
                        }()
                    ];

                $.whenAllDone( calculations ).then(
                    function( ... results: PromiseStatus[] ) {
                        let tabDefs: TabDef[] = [];
                        const failures = results.filter( p => p.status == "rejected" );

                        if ( failures.length > 0 ) {
                            failures.forEach( p => {
                                const failure = p.reason as SubmitCalculationFailure;
                                that.trace( "Error during calculation for " + failure.calcEngine.name + ": " + failure.errorMessage, TraceVerbosity.None );
                            });

                            pipelineError = failures[ 0 ].reason.errorMessage; 
                            that.ui.triggerEvent( "onCalculationErrors", "SubmitCalculation", pipelineError, that.exception, currentOptions, that );
                            calculatePipeline( 2 );
                        }
                        else {
                            results
                                .forEach( p => {
                                    const success = p.value as SubmitCalculationSuccess;
                                    const tabDef = success.result.Profile.Data.TabDef;
                                    tabDefs = tabDefs.concat( tabDef != undefined && !Array.isArray( tabDef ) ? [ tabDef ] : tabDef );
                                });
                            that.setResults( tabDefs, currentOptions );
                            calculatePipeline( 0 );
                        }
                    }
                );
            };

            // Success - processApiActions
            // Error - calculateEnd
            const updateData = function(): void {
                const jwtUpdateCommand = "calculations/jwtupdate";

                try {
                    const jwtToken = {
                        Tokens: that.getResultTable<JSON>( "jwt-data")
                            .map( r => ({ Name: r[ "@id"], Token: r[ "value" ] }) )
                            .filter( t => t.Name == "data-updates" )
                    };
    
					if (jwtToken.Tokens.length > 0 ) {
                        that.trace("Posting jwt update data from results", TraceVerbosity.Detailed);
                        
                        that.apiAction( 
                            jwtUpdateCommand,
                            currentOptions, 
                            { 
                                customParameters: { DataTokens: jwtToken.Tokens }, 
                            },
                            undefined,
                            function( successResponse, failureReponse ) {
                                if ( failureReponse != undefined ) {
                                    // Any errors added, add a temp apiAction class so they aren't removed during Calculate workflow
                                    // (apiAction is used for jwt-data updates)
                                    $('.validator-container.error', that.element).not(".server").addClass("apiAction");
                                }

                                calculatePipeline( 0 );
                            }
                        );
                    }
                    else
                    {
                        calculatePipeline( 0 );
                    }
                } catch (error) {
                    that.trace( "Error during jwt update data processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onActionFailed", jwtUpdateCommand, error, that, currentOptions, undefined );
                    calculatePipeline( 2 );
                }
            };

            // Success - processResults if no download, calculateEnd if download
            // Error - calculateEnd (checks pipeline error before processing)
            const processApiActions = function(): void {
                try {
                    const docGenApiRow = that.getResultRow<JSON>( "api-actions", "DocGen", "action" );
                    if ( docGenApiRow != undefined ) {
                        if ( docGenApiRow[ "exception" ] != undefined ) {
                            // Show some sort of error...for now just logging diagnostics
                            debugger;
                        }
                        else {
                            const base64toBlob = function(base64Data : string, contentType: string = 'application/octet-stream', sliceSize: number = 1024): Blob {
                                // https://stackoverflow.com/a/20151856/166231                
                                var byteCharacters = atob(base64Data);
                                var bytesLength = byteCharacters.length;
                                var slicesCount = Math.ceil(bytesLength / sliceSize);
                                var byteArrays = new Array(slicesCount);
                            
                                for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                                    var begin = sliceIndex * sliceSize;
                                    var end = Math.min(begin + sliceSize, bytesLength);
                            
                                    var bytes = new Array(end - begin);
                                    for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                                        bytes[i] = byteCharacters[offset].charCodeAt(0);
                                    }
                                    byteArrays[sliceIndex] = new Uint8Array(bytes);
                                }
                                return new Blob(byteArrays, { type: contentType });
                            }
                            const base64toBlobFetch = (base64 : string, type: string = 'application/octet-stream'): Promise<Blob> => 
                                // Can't use in IE :(
                                fetch(`data:${type};base64,${base64}`).then(res => res.blob())

                            const base64 = docGenApiRow[ "content" ];
                            const contentType = docGenApiRow[ "content-type" ];
                            const fileName = docGenApiRow[ "file-name" ];
                            const blob = base64toBlob(base64, contentType);
                            that.downloadBlob(blob, fileName);
                        }
                        calculatePipeline( 1 );
                    }
                    else {
                        calculatePipeline( 0 );
                    }
                } catch (error) {
                    that.trace( "Error during api-actions processing: " + error, TraceVerbosity.None );
                    that.ui.triggerEvent( "onCalculationErrors", "ProcessApiActions", error, that.exception, currentOptions, that );
                    calculatePipeline( 1 );
                }
            };

            // Always go to calculateEnd
            const processResults = function(): void {
                that.processResults( currentOptions );
                calculatePipeline( 0 );
            };

            const calculateEnd = function(): void {
                // Remove temp apiAction error flag now that processing is finished
                $('.validator-container.error.apiAction, .validator-container.warning.apiAction', that.element).removeClass('apiAction');

                that.ui.triggerEvent( "onCalculateEnd", that );

                calculatePipeline( 0 );
            };

            const needsData = currentOptions.registeredToken === undefined && currentOptions.data === undefined;
            
            if ( needsData && currentOptions.getData != undefined ) {
                pipeline.push(getCalculationData);
                pipelineNames.push("calculatePipeline.getCalculationData");
            }
            if ( needsData ) {
                // Sometimes the register function 'gets data' on server and returns registration token
                pipeline.push(registerData);
                pipelineNames.push("calculatePipeline.registerData");
            }
            pipeline.push( 
                submitCalculation,
                updateData,
                processApiActions,
                processResults,
                calculateEnd
            )
            pipelineNames.push( 
                "calculatePipeline.submitCalculation",
                "calculatePipeline.updateData",
                "calculatePipeline.processApiActions",
                "calculatePipeline.processResults",
                "calculatePipeline.calculateEnd"
            )

            // Start the pipeline
            calculatePipeline( 0 );
        }

        getEndpointSubmitData( options: KatAppOptions, customOptions: KatAppActionOptions): KatAppActionSubmitData {
            const currentOptions = KatApp.extend(
                {}, // make a clone of the options
                KatApp.clone( 
                    options,
                    function( key, value ) {
                        if ( key == "handlers" || typeof value === "function" ) {
                            return; // don't want any functions passed along to api
                        }
                        return value; 
                    }
                ), // original options
                customOptions, // override options
            ) as KatAppOptions;

            const calculationOptions = this.rble.getSubmitCalculationOptions( currentOptions, undefined );

            const submitData: KatAppActionSubmitData = {
                Inputs: calculationOptions.Inputs,
                InputTables: calculationOptions.InputTables,
                Configuration: currentOptions
            };
            return submitData;
        }

        buildFormData(submitData: KatAppActionSubmitData): FormData {
            // https://gist.github.com/ghinda/8442a57f22099bdb2e34#gistcomment-3405266
            const buildForm = function (formData: FormData, data: Object, parentKey?: string, asDictionary?: boolean): void {
                if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
                    Object.keys(data).forEach( (key, index) => {
                        if ( asDictionary ?? false ) {
                            formData.append(`${parentKey}[${index}].Key`, key);
                            formData.append(`${parentKey}[${index}].Value`, data[key]);
                        }
                        else {
                            const formName = parentKey ? `${parentKey}[${key}]` : key;
                            var createDictionary = 
                                formName == "Inputs" || formName == "Configuration[customInputs]" || formName == "Configuration[manualInputs]";
                                buildForm(formData, data[key], formName, createDictionary);
                        }
                    });
                } else if ( data != null ) {
                    const value = (data instanceof Date) 
                        ? data.toISOString() 
                        : data;

                    if ( typeof value !== "function" ) {
                        formData.append(parentKey!, value);
                    }
                }
            };

            const fd = new FormData();
            
            buildForm(fd, submitData);

            return fd;    
            /*
            const useFormData = true; // Used to pass this in...but upload and apiAction both use 'FormData'

            if ( useFormData ) {
            }
            else {
                // Couldn't figure out how to model bind JObject or Dictionary, so hacking with this
                
                // If I start using 'raw data' to submit, need to figure out how to make a 'key/value' dictionary like above
                if ( submitData.Inputs != undefined ) {
                    submitData[ "inputsRaw" ] = JSON.stringify( submitData.Inputs );
                }
                if ( submitData.Configuration.manualInputs != undefined ) {
                    submitData.Configuration[ "manualInputsRaw" ] = JSON.stringify( submitData.Configuration.manualInputs );
                }
                if ( submitData.Configuration[ "customInputs" ] != undefined ) {
                    submitData.Configuration[ "customInputsRaw" ] = JSON.stringify( submitData.Configuration[ "customInputs" ] );
                }
                return submitData;
            }
            */
        }

        private processResults( calculationOptions: KatAppOptions ): void {
            this.trace("Processing results from calculation", TraceVerbosity.Detailed);
            const start = new Date();
            try {
                this.element.removeData("katapp-save-calcengine");
                this.element.removeData("katapp-trace-calcengine");
                this.element.removeData("katapp-refresh-calcengine");
                this.options.defaultInputs = undefined;
    
                this.ui.triggerEvent( "onResultsProcessing", this.results, calculationOptions, this );
                
                this.rble.processResults( calculationOptions );
               
                if ( this.calculationInputs?.iConfigureUI === 1 ) {
                    this.ui.triggerEvent( "onConfigureUICalculation", this.results, calculationOptions, this );
                }
    
                this.ui.triggerEvent( "onCalculation", this.results, calculationOptions, this );
            } catch (error) {
                this.trace( "Error during result processing: " + error, TraceVerbosity.None );
                this.ui.triggerEvent( "onCalculationErrors", "ProcessResults", error, this.exception, calculationOptions, this );
            }
            finally {
                this.trace("Processing results took " + ( Date.now() - start.getTime() ) + "ms", TraceVerbosity.Detailed);
            }
        }

        configureUI( customOptions?: KatAppOptions ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1, iDataBind: 1 } };
            this.calculate( KatApp.extend( {}, customOptions, manualInputs ) );
        }

        updateOptions( options: KatAppOptions ): void { 
            // When calling this method, presummably all the inputs are available
            // and caller wants the input (html element) to be updated.  When passed
            // in on a rebuild/init I simply pass them into the calculation and the CE can 
            // process as needed
            if ( options.defaultInputs !== undefined ) {
                this.setInputs( options.defaultInputs );
                delete options.defaultInputs;
            }

            this.options = KatApp.extend( {}, this.options, options )

            // If not bound, updateOptions called before onInit is finished, so no need
            // to bind them here b/c they will be bound later in the workflow
            const inputsBound = this.element.data("katapp-input-selector") != undefined;
            
            if ( inputsBound ) {
                this.ui.unbindCalculationInputs();
                this.ui.bindCalculationInputs();

                if ( options.manualResults != undefined ) {
                    // Need to process results...
                    this.setResults( this.results?.filter( r => r._name != "ManualResults" ), this.options );
                    this.processResults(this.options);
                }
            }

            this.ui.triggerEvent( "onOptionsUpdated", this );
        }

        getInputs(): CalculationInputs {
            return this.rble.getInputs( this.options )
        }

        setInputs( inputs: JSON | CalculationInputs, calculate = true ): void {
            // When called publicly, want to trigger a calculation, when called from init() we don't
            Object.keys( inputs ).forEach( i => {
                this.rble.setInput( i, inputs[ i ]);
            });

            if ( calculate ) {
                this.calculate();
            }
        }
        setInput( id: string, value: string | undefined, calculate = false): void {
            this.rble.setInput(id, value);

            if ( calculate ) {
                this.calculate();
            }
        }

        serverCalculation( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> ): void {
            this.apiAction(
                "calculations/run",
                this.options, 
                { customInputs: customInputs },
                actionLink
             );
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
        setResults( results: TabDef[] | undefined, calculationOptions: KatAppOptions = this.options ): void {
            const calcEngines = calculationOptions.calcEngines;

            if ( calculationOptions.manualResults != undefined ) {
                if ( results == undefined ) {
                    results = [];
                }
                
                calculationOptions.manualResults["@calcEngine"] = "ManualResults";
                calculationOptions.manualResults["@name"] = "RBLResults";
                calculationOptions.manualResults[ "_ManualResults" ] = true;
                results.push( calculationOptions.manualResults );
            }

            if ( results !== undefined ) {
                const defaultCEName = calcEngines != undefined ? calcEngines[ 0 ].name : undefined;
                results.forEach( t => {
                    // Breakpoint to test tabDef name
                    t._resultKeys = Object.keys(t).filter( k => !k.startsWith( "@" ) && k != "_ManualResults" );
                    
                    const ceName = t["@calcEngine"].split(".")[ 0 ].replace("_Test", "");
                    
                    // Is this tab part of defaultCalcEngine?
                    t._defaultCalcEngine = ceName == defaultCEName;
                    
                    // Put every key that ce is associated with, in case client override uses 1 CE to
                    // implement all functionality for view that might have been configured for two CEs...
                    /*
                        [
                            { key: "ce1", name: "clientCe"},
                            { key: "ce2", name: "clientCe"}
                        ]
                    */
                    if ( calcEngines != undefined )
                    {
                        calcEngines.filter( c => c.name == ceName ).forEach( c => {
                            t[ "_" +  c.key ] = true;
                        });
                    }                    

                    t._name = t["@name"];
                    t._fullName = ceName + "." + t._name;

                    // Ensure that all tables are an array
                    t._resultKeys.forEach( k => {
                        const table = t[ k ];
    
                        if (!(table instanceof Array) && table != null ) {
                            t[ k ] = [table];
                        }
                    });
    
                } );
            }

            this.results = results;
        }

        downloadBlob(blob: Blob, filename: string): void {
            const tempEl = document.createElement("a");
            $(tempEl).addClass( "d-none hidden" );
            const url = window.URL.createObjectURL(blob);
            tempEl.href = url;
            tempEl.download = filename;
            tempEl.click();
            window.URL.revokeObjectURL(url);
        }

        apiAction( commandName: string, options: KatAppOptions, actionOptions: KatAppActionOptions, actionLink: JQuery<HTMLElement> | undefined, done?: ( successResponse: KatAppActionResult | undefined, failureResponse: JSON | undefined )=> void ): void {
            const application = this;
            const isDownload = actionLink?.attr("rbl-action-download") == "true";
            const runCalculate = actionLink?.attr("rbl-action-calculate") == "true";
            const errors: ValidationRow[] = [];
            const warnings: ValidationRow[] = [];

            application.rble.initializeValidationSummaries();
            application.rble.finalizeValidationSummaries( false );
        
            this.showAjaxBlocker();
        
            let url = "api/" + commandName;
            const serviceUrlParts = application.options.sessionUrl?.split( "?" );

            if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                url += "?" + serviceUrlParts[ 1 ];
            }
            
            let errorResponse: JSON;
            let successResponse: KatAppActionResult | undefined = undefined;
            // No one was using this yet, not sure I need it
            // this.ui.triggerEvent( "onActionStart", commandName, data, this, actionLink );

            const data = application.getEndpointSubmitData(options, actionOptions);

            application.ui.triggerEvent( "onActionStart", commandName, data, application, data.Configuration, actionLink );

            // Couldn't figure out how to model bind JObject or Dictionary, so hacking with this
            data[ "inputTablesRaw" ] = data.InputTables != undefined ? JSON.stringify( data.InputTables ) : undefined;

            var fd = application.buildFormData( data );

            const finishApiAction = function() {
                const errorSummary = $("#" + application.id + "_ModelerValidationTable", application.element);
                const warningSummary = $("#" + application.id + "_ModelerWarnings", application.element);
                application.rble.processValidationRows( errorSummary, errors );
                application.rble.processValidationRows( warningSummary, warnings );
                application.rble.finalizeValidationSummaries();

                if ( errors.length > 0 ) {
                    console.group("Unable to process " + commandName + ": errorResponse");
                    console.log(errorResponse);
                    console.groupEnd();
                    console.group("Unable to process " + commandName + ": errors");
                    console.log( errors );
                    console.groupEnd();

                    application.ui.triggerEvent( "onActionFailed", commandName, errorResponse, application, data.Configuration, actionLink );
                }
                else {
                    application.ui.triggerEvent( "onActionResult", commandName, successResponse, application, data.Configuration, actionLink );
                }

                application.hideAjaxBlocker();
                application.ui.triggerEvent( "onActionComplete", commandName, application, data.Configuration, actionLink );

                if ( done != undefined ) {
                    done( successResponse, errorResponse);
                }
            };

            $.ajax( {
                method: "POST",
                url: url,
                data: fd,
                contentType: false,
                processData: false,
                headers: { "Content-Type": undefined },
                beforeSend: function( _xhr, settings ) {
                    // Enable jquery to assign 'binary' results so I can grab later.
                    settings[ "responseFields" ][ "binary" ] = "responseBinary";
                },
                xhr: function() {
                    var xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function() {
                        // https://stackoverflow.com/a/29039823/166231
                        if (xhr.readyState == 2) {
                            if (isDownload && xhr.status == 200) {
                                xhr.responseType = "blob";
                            } else {
                                // We are always returning json (binary/responseBinary) from our endpoints
                                xhr.responseType = "json";
                            }
                        }
                    };
                    return xhr;
                }
            }).then(
                function( result, status, xhr ) {
                    if ( isDownload ) {
            
                        const blob = result; // xhr.response;
            
                        let filename = "Download.pdf";
                        const disposition = xhr.getResponseHeader('Content-Disposition');
                        if (disposition && disposition.indexOf('attachment') !== -1) {
                            filename = disposition.split('filename=')[1].split(';')[0];
                        }
            
                        application.downloadBlob(blob, filename);
                    }
                    else {
                        successResponse = result as KatAppActionResult;

                        if ( successResponse.Status != 1 ) {
                            successResponse = undefined;
                            errorResponse = result;
                            errors.push( { "@id": "System", text: errorResponse[ "Message"] });
                            delete application.endpointRBLeInputsCache[ commandName ];
                        }
                        else {
                            if ( successResponse.ValidationWarnings != undefined ) {
                                successResponse.ValidationWarnings.forEach( vr => {
                                    warnings.push( { "@id": vr.ID, text: vr.Message });
                                });
                            }

                            if ( successResponse.RBLeInputs != undefined ) {
                                application.endpointRBLeInputsCache[ commandName ] = successResponse.RBLeInputs;
                            }
                            else {
                                delete application.endpointRBLeInputsCache[ commandName ];
                            }
                            if ( runCalculate ) {
                                application.calculate( undefined, finishApiAction );
                            }
                        }
                    }
                },
                function( xhr, _status, _errorInfo) {
                    errorResponse = xhr[ "responseBinary" ];
                    debugger;
                    delete application.endpointRBLeInputsCache[ commandName ];
                    if ( errorResponse != undefined ) {
                        if ( errorResponse[ "Validations" ] != undefined ) {
                            errorResponse[ "Validations" ].forEach((v: { [x: string]: string }) => {
                                errors.push( { "@id": v[ "ID" ], text: v[ "Message" ] });
                            });
                        }
                        else if ( errorResponse[ "ExceptionMessage" ] != undefined && errorResponse[ "Message" ] != undefined ) {
                            // Just want generic system message I think...
                            // errors.push( { "@id": "System", text: errorResponse[ "Message" ] });
                        }
                    }
            
                    if ( errors.length == 0 ) {
                        errors.push( { "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
                    }
                }
            )
            .always( function() {
                if ( errors.length > 0 || !runCalculate ) {
                    finishApiAction();
                }
            });
        }
        
        // Result helper
        getResultTable<T>( tableName: string, tabDef?: string, calcEngine?: string): Array<T> {
            return this.rble.getResultTable<T>( this.rble.getTabDef( tabDef, calcEngine ), tableName );
        }
        getResultRow<T>(table: string, id: string, columnToSearch?: string, tabDef?: string, calcEngine?: string ): T | undefined { 
            return this.rble.getResultRow<T>( this.rble.getTabDef( tabDef, calcEngine ), table, id, columnToSearch ); 
        }
        getResultValue( table: string, id: string, column: string, defautlValue?: string, tabDef?: string, calcEngine?: string ): string | undefined { 
            return this.rble.getResultValue( this.rble.getTabDef( tabDef, calcEngine ), table, id, column, defautlValue ); 
        }
        getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defautlValue?: string, tabDef?: string, calcEngine?: string ): string | undefined { 
            return this.rble.getResultValueByColumn( this.rble.getTabDef( tabDef, calcEngine ), table, keyColumn, key, column, defautlValue ); 
        }

        // Debug helpers        
        redraw( readViewOptions: boolean | undefined ): void {
            // Need to reset these so updated views are downloaded
            $("rbl-katapps > rbl-templates").remove(); // remove templates
            $.fn.KatApp.templatesUsedByAllApps = {};
            $.fn.KatApp.templateDelegates = [];

            // If || true is removed...update documentation to add the parameter
            if ( readViewOptions || true ) {
                // Clear these out and read from the view
                this.options.calcEngines = undefined;
                this.options.viewTemplates = undefined;
            }
            
            const that = this;
            let rebuildOptions: KatAppOptions = {};

            const redrawInit = function(): void {
                // From here down, some duplication from calculate(), not sure if make one
                // private method that is used with optional param to 'use existing results'
                // is better, but for now just putting this.
                //
                // NOTE: Below in error handler, I don't clear out results because if developer
                // is calling this, presummably results worked previously and they just updated
                // their view and want to test that.

                const cancelCalculation = !that.ui.triggerEvent( "onCalculateStart", that );

                if ( cancelCalculation ) {
                    that.ui.triggerEvent( "onCalculateEnd", that );
                    return;
                }

                that.processResults(rebuildOptions);

                that.ui.triggerEvent( "onCalculateEnd", that );
                
                that.element.off( "onInitialized.RBLe", redrawInit);
            };

            // This returns right away, so need to hook up the event handler above to process everything 
            // after view is loaded.  Don't run new calcs b/c need to just use existing results.
            rebuildOptions = this.rebuild( { runConfigureUICalculation: false, onInitialized: redrawInit } );
        }

        saveCalcEngine( location: string ): void {
            this.element.data("katapp-save-calcengine", location);
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

        get bootstrapVersion(): number {
            const version = 
                this.options.bootstrapVersion ??
                this.element.attr("rbl-bootstrap") ??
                $("rbl-config", this.element).attr("bootstrap") ?? "3";
            
            return +version;
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
                .not("rbl-template *") // not in templates
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

                const isBootstrap5 = this.application.bootstrapVersion == 5;
                const bsDataAttributePrefix = isBootstrap5 ? "data-bs-" : "data-";

                this.application.element.append(
                    '<div class="modal fade linkConfirmModal" tabindex="-1" role="dialog" ' + bsDataAttributePrefix + 'keyboard="false" ' + bsDataAttributePrefix + 'backdrop="static">' +
                        '<div class="modal-dialog">' +
                            '<div class="modal-content">' +
                                '<div class="modal-body"></div>' +
                                '<div class="modal-footer">' +
                                    '<button class="btn btn-default cancelButton" ' + bsDataAttributePrefix + 'dismiss="modal" aria-hidden="true">' + sCancel + '</button>' +
                                    '<button type="button" class="btn btn-primary continueButton" ' + bsDataAttributePrefix + 'dismiss="modal">' + sContinue + '</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
            }

            $('.linkConfirmModal .modal-body', this.application.element).html(confirm);

            $('.linkConfirmModal .continueButton', this.application.element).off("click.ka").on("click.ka", function () {
                onConfirm();
            });
        
            $('.linkConfirmModal .cancelButton', this.application.element).off("click.ka").on("click.ka", function () {
                if (onCancel != undefined) {
                    onCancel();
                }
            });            
    
            if (this.application.bootstrapVersion==5) {
                var myModal = new bootstrap.Modal($('.linkConfirmModal', this.application.element)[0]);
                myModal.show();
            }
            else {
                $('.linkConfirmModal', this.application.element).modal({ show: true });
            }
        }

        processDropdownItems(dropdown: JQuery<HTMLElement>, rebuild: boolean, dropdownItems: { Value: string | null; Text: string | null; Class: string | undefined; Subtext: string | undefined; Html: string | undefined; Selected: boolean; Visible: boolean }[]): void {
            if ( dropdown.length === 0 ) return;

            const controlName = this.getInputName(dropdown);
            const selectPicker = dropdown.attr("data-kat-bootstrap-select-initialized") !== undefined
                ? dropdown
                : undefined;

            if ( rebuild ) {
                $("." + controlName + " option", this.application.element).remove();
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

                        if ( ( ls.Html || "" ) != "" ) {
                            currentItem.attr("data-content", ls.Html || "");
                        }

                        dropdown.append(currentItem);
                    }
                }
                else if ( ls.Text != undefined && ls.Text != "" ) {
                    currentItem.text(ls.Text);
                }

                // selectpicker specific features
                if ( ( ls.Subtext || "" ) != "" ) {
                    currentItem.attr("data-subtext", ls.Subtext || "");
                }

                if (!ls.Visible) {
                    // Hide the item...
                    currentItem.hide();

                    const currentValue = selectPicker?.selectpicker('val') ?? dropdown.val();

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

        encodeTemplateContent( content: string) : string {
            return content
                .replace(/-toggle=/g, "-toggle_=")
                .replace(/ id=/g, " id_=")
                .replace(/<tr>/g, "<tr_>")
                .replace(/<tr /g, "<tr_ ")
                .replace(/<\/tr>/g, "</tr_>")
                .replace(/<td>/g, "<td_>")
                .replace(/<td /g, "<td_ ")
                .replace(/<\/td>/g, "</td_>");
        }
        decodeTemplateContent( content: string ): string {
            // If templates with bootstrap toggle have issues with 'target' because of {templateValues} inside the
            // selector attribute, bootstrap crashes and doesn't process rest of the 'valid' toggles.  To fix,
            // disable bootstrap handling *in the template* by putting _ after toggle, then it is turned when
            // the rendered template content is injected.
            let decodedContent = content
                .replace( / id_=/g, " id=") // changed templates to have id_ so I didn't get browser warning about duplicate IDs inside *template markup*
                .replace( /-toggle_=/g, "-toggle=" ) // changed templates to have -toggle_ so that BS didn't 'process' items that were in templates
                .replace( /tr_/g, "tr" ) // if tr/td were *not* contained in a table in the template, browsers would just remove them when the template was injected into application, so replace here before injecting template
                .replace( /td_/g, "td" );

            if ( this.application.bootstrapVersion > 3 ) {
                decodedContent = decodedContent
                    .replace( /control-label/g, "col-form-label")
                    .replace( /glyphicon glyphicon-volume-up/g, "fa fa-volume-up" )            
                    .replace( /glyphicon glyphicon-info-sign/g, this.application.bootstrapVersion >= 5 ? "fa-light fa-circle-info" : "fa fa-question-circle" );
            }

            if ( this.application.bootstrapVersion > 4 ) {
                decodedContent = decodedContent
                    .replace( / data-placement=/g, " data-bs-placement=")
                    .replace( / data-trigger=/g, " data-bs-trigger=")
                    .replace( / data-toggle=/g, " data-bs-toggle=")
                    .replace( / data-dismiss=/g, " data-bs-dismiss=")
                    .replace( / data-target=/g, " data-bs-target=");
            }

            return decodedContent;
        }

        injectTemplatesWithoutSource(container: JQuery<HTMLElement>): void {
            const app = this.application;
            const that = this;
            
            $("[rbl-tid]", container)
                .not("[rbl-source], [data-katapp-template-injected='true'], rbl-template *") // not an template with data source, not in templates
                .each(function () {
                    const item = $(this);
                    const templateId = item.attr('rbl-tid')!;
                    that.injectTemplate( item, templateId );
                    item.attr("data-katapp-template-injected", "true");

                    that.injectTemplatesWithoutSource(item);
                });
            }

        injectTemplate( target: JQuery<HTMLElement>, templateId: string ): void {
            const template = this.getTemplate( templateId, this.application.dataAttributesToJson(target, "data-"));

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
    
        getTemplate( templateId: string, data: JQuery.PlainObject ): { Content: string; Type: string | undefined } | undefined {
            const application = this.application;
            
            // Look first for template overriden directly in markup of view
            let template = templateId.startsWith("_inline_")
                ? $("rbl-templates rbl-template[tid='" + templateId + "']").first()
                : $("rbl-template[tid=" + templateId + "]", application.element).first();

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
                // Don't see anyone that uses content-selector, can try to remove
                const contentSelector = template.attr("content-selector");
                return {
                    Type: template.attr("type"),
                    Content:
                        this.decodeTemplateContent( ( contentSelector != undefined ? $(contentSelector, template) : template )
                            .html()
                            .format( KatApp.extend({}, data, { id: application.id } ) ) )
                };
            }
        }

        processListItems(container: JQuery<HTMLElement>, rebuild: boolean, listItems: { Value: string | null | undefined; Text: string | null | undefined; Help: string | undefined; Selected: boolean; Visible: boolean; Disabled: boolean }[] ): void {
            const isBootstrap3 = this.application.bootstrapVersion == 3;
            const isBootstrap4 = this.application.bootstrapVersion == 4;
            const isBootstrap5 = this.application.bootstrapVersion == 5;
            const inputName: string = container.data( "inputname" );
            const id: string = container.data( "id" );
            const horizontal = container.data("horizontal") ?? false;
            const itemType: string = container.data("itemtype" );
            const isRadio = itemType === "radio";

            const templateContainer = container.closest("[rbl-tid='input-radiobuttonlist'], [rbl-template-type='katapp-radiobuttonlist'], [rbl-tid='input-checkboxlist'], [rbl-template-type='katapp-checkboxlist']")

            if ( itemType == "checkbox" ) {
                /*                
                    Evo ess Framework Issues

                    iCheckList, with items of

                        a:Item A
                        b:Item B
                        c:Item C

                    When you set default values, you do: iCheckList: a,c (comma delim list).  But when 'getting values' you make 
                    inputs named: iCheckLista, iCheckListb, iCheckListc (input for each item).  How hard would it be have one 
                    input (iCheckList) and the value is comma delim of vlaues selected...Harder to work with or no?
                    ** Note, I've changed after talking to han, we are always returning comma delim list in Evo.
                    
                    * Currently checkbox lists don't work in ESS (DST OOPBasic)
                        *** Not sure if I fixed this in EVO/RBLe implementation or not.  Everything works in KatApp
                        - all oop's are going to MBM early next year
                        - no one uses bootstrapcheckbox control (bsc), only manual markup
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
                    "<table class='" + itemTypeClass + " bs-listcontrol' border='0'><tbody class='items-container'></tbody></table>";

                container.append($(temlpateContent));
                itemsContainer = $(".items-container", container);
            }

            const that = this;
            const helpIconClass = 
                isBootstrap3 ? "glyphicon glyphicon-info-sign" : 
                isBootstrap4 ? "fa fa-question-circle" : 
                isBootstrap5 ? "fa-light fa-circle-info" : "fa fa-question-circle";
            const bsDataAttributePrefix = isBootstrap5 ? "data-bs-" : "data-";

            let configureHelp = false;

            const inputTemplate = isRadio
                ? "<input id='{itemId}' type='radio' name='{id}:{inputName}' value='{value}' />"
                : "<input id='{itemId}' type='checkbox' name='{id}:{inputName}:{value}' data-value='{value}' data-input-name='{inputName}' />";

            const verticalItemTemplate = 
                this.getTemplate( isRadio ? "input-radiobuttonlist-vertical-item" : "input-checkboxlist-vertical-item", {} )?.Content ??
                "<tr rbl-display='{visibleSelector}'>\
                    <td>\
                        <span class='" + itemTypeClass + "'>\
                            " + inputTemplate + "\
                            <label for='{itemId}'>{text}</label>\
                            <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' " + bsDataAttributePrefix + "toggle='popover' " + bsDataAttributePrefix + "trigger='click' data-content-selector='#{id}_{helpSelector}' " + bsDataAttributePrefix + "placement='top'><span class='{helpIconCss} help-icon'></span></a>\
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
                    <a rbl-display='{helpIconSelector}' style='display: none;' role='button' tabindex='0' " + bsDataAttributePrefix + "toggle='popover' " + bsDataAttributePrefix + "trigger='click' data-content-selector='#{id}_{helpSelector}' " + bsDataAttributePrefix + "placement='top'><span class='{helpIconCss} help-icon'></span></a>\
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
                    // Don't uncheck anymore, just mark as 'not visible' so getInputValue ignores it
                    currentInput.attr("kat-visible", "0");
                    // currentInput.prop("checked", false);
                }
                else {
                    currentInput.removeAttr("kat-visible");

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

        pushNotification(from: KatAppPlugIn, name: string, information: {} | undefined): void {
            ( $.fn.KatApp.applications as KatAppPlugIn[] ).forEach( a => { 
                if ( from.id != a.id ) {
                    // Only trigger event for *other* KatApps
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
                
                // Make application.element[0] be 'this' in the event handler
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

        handleVoidAnchors(): void {
            const application = this.application;
            $("a[href='#']", application.element)
                .not("[data-katapp-nonav='true']")
                .not("rbl-template *")
                .on("click.RBLe", function(e) {
                    e.preventDefault();
                }).attr("data-katapp-nonav", "true");
        }

        bindRblOnHandlers(): void {
            const app = this.application;
            if ( app.options.handlers != undefined ) {
                // move events on templated output into targets after template is rendered
                $("[rbl-tid][rbl-on]", app.element)
                    .not("rbl-template *")
                    .each(function() {
                        const template = $(this);
                        const handlers = template.attr("rbl-on")!.split("|");
                        // Remove to signal no more processing needed, will be added back on as needed below
                        // if unable to move to target element
                        template.removeAttr("rbl-on");
                        
                        const tid = template.attr("rbl-tid");
                        const tType = template.attr("rbl-template-type");

                        handlers
                            .forEach( h => {
                                const handlerParts = h.split(":");
                                const handler = handlerParts.splice(0, 2).join(":");
                                const handlerSelector = handlerParts.length > 0 ? handlerParts.join(":") : undefined;

                                let input = handlerSelector != undefined
                                    ?  $(handlerSelector, template)
                                    : undefined;
                                
                                if ( input == undefined ) {
                                    if ( tid == "input-dropdown" || tType == "katapp-dropdown" ) {
                                        input = $("select.form-control", template).not("[data-rblon-initialized='true']");
                                    }
                                    else if ( tid == "input-fileupload" || tType == "katapp-fileupload" ) {
                                        input = $("input[type='file']", template).not("[data-rblon-initialized='true']");
                                    }
                                    else if ( tid == "input-slider" || tType == "katapp-slider" ) {
                                        input = $("div[data-slider-type='nouislider']", template).not("[data-rblon-initialized='true']");
                                    }
                                    else {
                                        input = $(":input", template).not("[data-rblon-initialized='true']");
    
                                    }
                                }

                                const isStandardListControl =
                                    tid == 'input-radiobuttonlist' || tid == 'input-checkboxlist' ||
                                    tType == 'katapp-radiobuttonlist' || tType =='katapp-checkboxlist';

                                input.each( function() {
                                    const target = $(this);
                                    const currentHandler = target.attr("rbl-on");
                                    target.attr("rbl-on", currentHandler == undefined ? handler : currentHandler + "|" + handler);
                                });

                                // If nothing found from target most likely content that will be placed
                                // in an input template after the calculation has ran (i.e. an anchor in the label content of an input template),
                                // so don't flag this item as done yet - needs to wait for the element to be generated via a calculation.

                                // Standard list control can have items added during each calculation, so unfortunately, need to continue to process 
                                // the item each and look for possibly new list control inputs.
                                if ( isStandardListControl || input.length == 0 ) {
                                    const currentHandler = template.attr("rbl-on");
                                    template.attr("rbl-on", currentHandler == undefined ? h : currentHandler + "|" + h);
                                }
                            });
                    });

                // If a handler was put on an html container with a selector but the container was *not*
                // a template, the handlers were not moved to targets in above method, so have to move them
                // to the intended targets in this loop
                $("[rbl-on]", app.element)
                    .not("[rbl-tid]")
                    .not("[data-rblon-initialized='true']")
                    .not("rbl-template *")
                    .each(function() {
                        const htmlContainer = $(this);
                        const handlers = htmlContainer.attr("rbl-on")!.split("|");

                        handlers
                            .forEach( h => {
                                const handlerParts = h.split(":");
                                const handler = handlerParts.splice(0, 2);
                                const handlerSelector = handlerParts.length > 0 ? handlerParts.join(":") : undefined;

                                // Only process if this is an html container that is assigning handlers to 'children'
                                if ( handlerSelector != undefined ) {
                                    const targetHandler = handler.join(":");
                                    $(handlerSelector, htmlContainer).each( function() {
                                        const target = $(this);
                                        const currentHandler = target.attr("rbl-on");
                                        target.attr("rbl-on", currentHandler == undefined ? targetHandler : currentHandler + "|" + targetHandler);
                                    });
                                }
                            });
                    });

                $("[rbl-on]", app.element)
                    .not("[rbl-tid]")
                    .not("[data-rblon-initialized='true']")
                    .not("rbl-template *")
                    .each(function() {
                        const el = $(this);
                        const handlers = el.attr("rbl-on")!.split("|");
                        const isSlider = el.attr("data-slider-type") == "nouislider";
                        const noUiSlider = isSlider 
                            ? app.ui.getNoUiSlider(el)
                            : undefined;

                        // Slider might not be enabled until after calculation is ran...
                        if ( !isSlider || noUiSlider != undefined ) {
                            handlers
                                .forEach( h => {
                                    const handlerParts = h.split(":");
                                    const handler = handlerParts.splice(0, 2);

                                    const eventName = handler[0];
                                    const functionName = handler[1];

                                    if ( noUiSlider != undefined ) {
                                        noUiSlider.on( eventName + ".ka",  app.options.handlers![ functionName ] );
                                    }
                                    else {
                                        el.on( eventName + ".ka",  app.options.handlers![ functionName ] );
                                    }
                                });
                            
                            el.attr("data-rblon-initialized", "true")
                              .attr("href", "#");
                        }
                    });
            }
        }

        bindCalculationInputs(): void {
            const application = this.application;
            if ( application.options.inputSelector !== undefined && application.options.calcEngines !== undefined ) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);
                
                const that: UIUtilities = this;

                $(application.options.inputSelector, application.element).not(skipBindingInputSelector).each(function () {
                    $(this).off("change.RBLe").on("change.RBLe", function () {
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

        findNoUiSlider(id: string, view: JQuery<HTMLElement>): noUiSlider.noUiSlider | undefined {
            const container = this.findNoUiSliderContainer(id, view);
            return container != undefined
                ? ( container[ 0 ] as noUiSlider.Instance )?.noUiSlider
                : undefined;
        }

        getNoUiSlider(container: JQuery<HTMLElement>): noUiSlider.noUiSlider | undefined {
            return container != undefined && container.length === 1
                ? ( container[ 0 ] as noUiSlider.Instance )?.noUiSlider
                : undefined;
        }

        findNoUiSliderContainer(id: string, view: JQuery<HTMLElement>): JQuery<HTMLElement> | undefined {
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
    class RBLeUtilities /* implements RBLeUtilitiesInterface */ {
        private application: KatAppPlugIn;
    
        constructor( application: KatAppPlugIn ) {
            this.application = application;  
        }
    
        registerData( currentOptions: KatAppOptions, data: RBLeRESTServiceResult, registerDataHandler: RegisterDataCallback ): void {
            const that: RBLeUtilities = this;
            const application = this.application;;
    
            const register: RegisterDataDelegate =
                currentOptions.registerData ??
                function( _app, _o, done, fail ): void
                {
                    const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
    
                    const json: RegisterDataOptions = {
                        Registration: KatApp.generateId(),
                        TransactionPackage: JSON.stringify( { Data: data } ),
                        Configuration: {
                            TraceEnabled: traceCalcEngine ? 1 : 0
                        }
                    };
    
                    const jsonParams = {
                        url: KatApp.sessionUrl,
                        type: "POST",
                        processData: false,
                        data: JSON.stringify(json),
                        dataType: "json"
                    };
    
                    $.ajax(jsonParams).then( done, fail );
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
    
        getInputsBySelector( inputSelector: string | undefined ): {} | undefined {
            if ( inputSelector == undefined ) return undefined;

            const inputs = {};
            const ui: UIUtilities = this.application.ui;
            const validInputs =  $(inputSelector, this.application.element).not(inputsToIgnoreSelector);

            jQuery.each(validInputs, function () {
                const input = $(this);
                const value = ui.getInputValue(input);

                if (value !== undefined) {
                    const name = ui.getInputName(input);
                    inputs[name] = value;
                }
            });

            // Checkbox list...
            $("[data-itemtype='checkbox']", this.application.element).each(function() {
                const cbl = $(this);
                const name = cbl.data("inputname");
                const value = 
                    $("input:checked", cbl)
                        .not("[kat-visible='0']")    
                        .toArray()
                        .map( chk => $(chk).data("value"))
                        .join(",");

                inputs[name] = value;
            });

            return inputs;
        }

        getInputs( currentOptions: KatAppOptions ): CalculationInputs {
            const submitOptions = currentOptions ?? this.application.options;

            const inputs = this.getInputsBySelector( submitOptions.inputSelector ) ?? {};

            Object.keys(this.application.endpointRBLeInputsCache).forEach( k => {
                const inputCache = this.application.endpointRBLeInputsCache[k];

                if ( inputCache != undefined ) {
                    const inputsCache = inputCache[ "Inputs" ];

                    if ( inputsCache != undefined ) {
                        Object.keys(inputsCache).forEach( k => {
                            inputs[ k ] = inputsCache[ k ];
                        });
                    }
                }
            });
            
            // const result = KatApp.extend( {}, inputs, { InputTables: this.ui.getInputTables() }, this.options.defaultInputs, this.options.manualInputs ) as JSON;
            const result = KatApp.extend( {}, 
                inputs, 
                submitOptions.manualInputs,
                submitOptions.defaultInputs
            ) as CalculationInputs;

            return result;
        };

        getInputTables(): CalculationInputTable[] | undefined {
            const utilities: UIUtilities = this.application.ui;
            const tables: CalculationInputTable[] = [];

            jQuery.each($(".RBLe-input-table", this.application.element), function () {
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
                        const value = utilities.getInputValue(input);

                        if (value !== undefined) {
                            row[input.data("column")] = value;
                        }
                    });

                    table.Rows.push(row);
                });

                tables.push(table);
            });

            Object.keys(this.application.endpointRBLeInputsCache).forEach( k => {
                const inputCache = this.application.endpointRBLeInputsCache[k];

                if ( inputCache != undefined ) {
                    const tableCache = inputCache[ "Tables" ];

                    if ( tableCache != undefined ) {

                        Object.keys(tableCache).forEach( k => {
                            const tableRows = tableCache[k];
            
                            var inputTable: CalculationInputTable = {
                                Name: k,
                                Rows: tableRows != undefined ? tableRows.slice() : []
                            };
                                                        
                            tables.push(inputTable);        
                        });
                    }
                }
            });

            return tables.length > 0 ? tables : undefined;
        }

        getSubmitCalculationOptions( currentOptions: KatAppOptions, currentCalcEngine: CalcEngine | undefined ): SubmitCalculationOptions {
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

            const inputs = this.getInputs( currentOptions ); 
            const inputTables = this.getInputTables() ?? [];

            const calcEngine = currentCalcEngine ||
                ( 
                    currentOptions.calcEngines != undefined && currentOptions.calcEngines.length > 0
                        ? currentOptions.calcEngines[ 0 ]
                        : null
                );

            let preCalcs = calcEngine?.preCalcs;

            if (inputs.iInputTrigger !== undefined) {
                const rblOnChange = $("." + inputs.iInputTrigger).data("rbl-on-change") as string ?? "";
                const triggerPreCalc = rblOnChange.indexOf("update-tp") > -1;
                preCalcs = triggerPreCalc 
                    ? $("." + inputs.iInputTrigger).data("rbl-update-tp-params") || preCalcs 
                    : preCalcs;
            }

            const application = this.application;
            const saveCalcEngineLocation = application.element.data("katapp-save-calcengine");
            const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
            const refreshCalcEngine = application.element.data("katapp-refresh-calcengine") === "1";

            const calculationOptions: SubmitCalculationOptions = {
                Data: !( currentOptions.registerDataWithService ?? true ) ? currentOptions.data : undefined,
                Inputs: inputs,
                InputTables: inputTables, 
                Configuration: {
                    CalcEngine: calcEngine?.name ?? "Conduent_NotAvailable_CE",
                    Token: ( currentOptions.registerDataWithService ?? true ) ? currentOptions.registeredToken : undefined,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: calcEngine?.inputTab ?? "RBLInput",
                    ResultTabs: calcEngine?.resultTabs ?? [ "RBLResult" ],
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ( currentOptions.debug?.refreshCalcEngine ?? false ),
                    PreCalcs: preCalcs,
                    
                    // In case a non-session submission, pass these along
                    // TODO: should we be using JWT for AuthID, AdminAuthID, Client?
                    AuthID: currentOptions.data?.AuthID ?? "NODATA",
                    AdminAuthID: undefined,
                    Client: currentOptions.data?.Client ?? "KatApp",
                    TestCE: currentOptions.debug?.useTestCalcEngine ?? false,
                    CurrentPage: currentOptions.currentPage ?? "KatApp:" + ( currentOptions.view ?? "UnknownView" ),
                    RequestIP: currentOptions.requestIP ?? "1.1.1.1",
                    CurrentUICulture: currentOptions.currentUICulture ?? "en-US",
                    Environment: currentOptions.environment ?? "PITT.PROD"
                }
            };

            this.application.ui.triggerEvent( "onCalculationOptions", calculationOptions, this.application );

            return calculationOptions;
        }

        submitCalculation( calcEngine: CalcEngine, currentOptions: KatAppOptions, submitCalculationHandler: SubmitCalculationCallback ): void {
            const application = this.application;

            const calculationOptions = this.getSubmitCalculationOptions( currentOptions, calcEngine );    
            // Just getting InputTables in the property so visible in console
            application.calculationInputs = KatApp.extend( {}, calculationOptions.Inputs as object, { InputTables: calculationOptions.InputTables } );
    
            const submitDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                const traceCalcEngine = application.element.data("katapp-trace-calcengine") === "1";
                    
                if ( traceCalcEngine && payload.Diagnostics != null ) {
                    console.group(calcEngine.name + " " + payload.Diagnostics.CalcEngineVersion + " Diagnostics");

                    const timings: string[] = [];
                    if ( payload.Diagnostics.Timings != null ) {
                        const utcDateLength = 28;
                        payload.Diagnostics.Timings.Status.forEach( ( t, i ) => {
                            const start = ( t["@Start"] + "       " ).substring(0,utcDateLength);
                            timings.push( start + ": " + t["#text"] );
                        })
                    }

                    const diag = {
                        Server: payload.Diagnostics.RBLeServer,
                        Session: payload.Diagnostics.SessionID,
                        Url: payload.Diagnostics.ServiceUrl,
                        Timings: timings,
                        Trace: payload.Diagnostics.Trace?.Item.map( i => i.substring( 2 ))
                    };
                    console.log(diag);

                    console.groupEnd();
                }

                if ( payload.Exception === undefined ) {
                    submitCalculationHandler( undefined, payload.RBL );
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
                        // dataType: "json",
                        headers: currentOptions.registerDataWithService 
                            ? { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                            : undefined
                    })
                    .then( done, fail )
                };
    
            submit( application, calculationOptions, submitDone, submitFailed );
        }
    
        getTabDef( tabDef?: string | null, calcEngine?: string | null ): TabDef | undefined {
            // Had to include | null because sometimes I call this with el.getAttribute(): string | null
            // instead of only $.attr(): string | undefined
            const results = this.application?.results;
            
            /*
                Have a little problem here...if view is coded with CE in markup...a mapping can be configured to match it...and it might look like:
    
                [
                    { key: "ce1", name: "clientCe"},
                    { key: "ce2", name: "clientCe"}
                ]
    
                With this, if view had ce1/ce2 as two sep CE's but client wanted to just implement with one custom one, they could do this.
                (NOTE: need to figure out how to not call two calcs)  The problem is if the tab names don't match up...if view had...
    
                ce1.tab1, ce2.tab2
    
                If client made one clientCe.tab1 to handle everything, all the tab2 references would not work, so would have to introduce
                some form of tab mapping as well.  Leaving off for now.
            */
            if ( results != undefined ) {
                return calcEngine != undefined && tabDef != undefined ? results.find( t => t["_" + calcEngine] == true && t._name == tabDef ) :
                    calcEngine != undefined ? results.find( t => t["_" + calcEngine] == true ) :
                    tabDef != undefined ? results.find( t => t._defaultCalcEngine && t._name == tabDef ) :
                    results[ 0 ];
            }
        
            return undefined;
        }
    
        getResultRow<T>( tabDef: TabDef | undefined, table: string, key: string, columnToSearch?: string ): T | undefined { 
            const rows = tabDef?.[table];
    
            if (tabDef === undefined || rows === undefined) return undefined;
    
            if ( typeof key != "string" ) {
                // In case caller passes in diff type, my === below will not work
                key = key + "";
            }

            const rowLookups = tabDef?._resultRowLookups || ( tabDef._resultRowLookups = {} );
    
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
    
        getResultValue( tabDef: TabDef | undefined, table: string, key: string, column: string, defaultValue?: string ): string | undefined { 
            return this.getResultRow<JSON>( tabDef, table, key, undefined )?.[ column ] ?? defaultValue;
        }
    
        getResultValueByColumn( tabDef: TabDef | undefined, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined {
            return this.getResultRow<JSON>( tabDef, table, key, keyColumn)?.[ column ] ?? defaultValue;
        };
    
        getResultTable<T>( tabDef: TabDef | undefined, tableName: string): Array<T> {
            if ( tabDef === undefined || tabDef._resultKeys === undefined ) return [];
    
            let tableKey = tableName;
    
            if (tableKey === "*") {
                const result: T[] = [];
    
                tabDef._resultKeys.forEach(key => {
                    let table = tabDef[key];
    
                    if (table instanceof Array) {
                        table = $.merge(result, table);
                    }
                });
    
                return result;
            }
    
            if (tabDef[tableKey] === undefined) {
                // Find property name case insensitive
                tabDef._resultKeys.forEach(key => {
                    if (key.toUpperCase() === tableName.toUpperCase()) {
                        tableKey = key;
                        return false;
                    }
                });
            }
    
            return tabDef[tableKey] as Array<T> ?? [];
        }
    
        createHtmlFromResultRow( resultRow: HtmlContentRow, processBlank: boolean ): void {
            const view = this.application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            const selector = 
                this.application.ui.getJQuerySelector( resultRow.selector ) ?? 
                this.application.ui.getJQuerySelector( resultRow["@id"] ) ?? "";
    
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
                        // Might have to change this at some point to look for rbl-tid= in string, and then enclose content
                        // in <div>+content+</div> then get the just the innerHTML.
                        if ( content.startsWith("<") && content.endsWith(">") ) {                            
                            const el = $(content);
                            const templateId = el.attr("rbl-tid");

                            // UPDATE: Continuing comment above, this looks to only process 'control' templates if only one returned in markup
                            // row, but probably need to change to look for any items in el.  Then additionally, move 'inline' to templates as well
                            // but for now, don't think anyone uses this, was more of a POC concept.
                            if (templateId !== undefined && templateId != "inline" && el.attr("rbl-source") == undefined && el.attr("rbl-source-table") == undefined) {
                                //Replace content with template processing, using data-* items in this pass
                                this.application.ui.injectTemplate( el, templateId );
                            }
                            
                            // Append 'templated' content
                            el.appendTo(target);
                        }
                        else {
                            target.append(content);
                        }
                    }
                }
            }
        }
    
        getRblSelectorValue( tabDef: TabDef | undefined, defaultTableName: string, selectorParts: string[] ): string | undefined {
            if ( tabDef != undefined ) {
                if ( selectorParts.length === 1 ) 
                {
                    return this.getResultValue( tabDef, defaultTableName, selectorParts[0], "value") ??
                        ( this.getResultRow<JSON>( tabDef, defaultTableName, selectorParts[0] ) !== undefined ? "" : undefined );
                }
                else if (selectorParts.length === 2) 
                {
                    return this.getResultValue( tabDef, selectorParts[0], selectorParts[1], "value") ??
                        ( this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[1] ) !== undefined ? "" : undefined );
                }
                else if (selectorParts.length === 3) 
                {
                    return this.getResultValue( tabDef, selectorParts[0], selectorParts[1], selectorParts[2]) ??
                        ( this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[1] ) !== undefined ? "" : undefined );
                }
                else if (selectorParts.length === 4) 
                {
                    return this.getResultValueByColumn( tabDef, selectorParts[0], selectorParts[1], selectorParts[2], selectorParts[3]) ??
                        ( this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[2], selectorParts[1] ) !== undefined ? "" : undefined );
                }
                else {
                    this.application.trace( "Invalid selector length for [" + tabDef._fullName + "." + selectorParts.join(".") + "]", TraceVerbosity.Quiet );
                }
            }
    
            return undefined;
        }
        
        processRblValues(defaultCalcEngineKey: string, showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            $("[rbl-value]", application.element)
                .not("rbl-template *") // Not sure I'd need these to filter out rbl-value elements inside templates because { } should be used for 'values'
                .each(function () {
                    let el = $(this);
        
                    if ( showInspector && !el.hasClass("kat-inspector-value") )
                    {
                        el.addClass("kat-inspector-value");
                        let inspectorTitle = "[rbl-value={value}]".format( { "value": el.attr('rbl-value') } );
                        const existingTitle = el.attr("title");
                        
                        if ( existingTitle != undefined ) {
                            inspectorTitle += "\nOriginal Title: " + existingTitle;
                        }
                        el.attr("title", inspectorTitle);
                    }
        
                    const rblValueParts = el.attr('rbl-value')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    const tabDef = that.getTabDef( el.attr('rbl-tab'), el.attr('rbl-ce') )
                    const value = 
                        that.getRblSelectorValue( tabDef, "rbl-value", rblValueParts ) ??
                        that.getRblSelectorValue( tabDef, "ejs-output", rblValueParts );
        
                    if ( value != undefined ) {
                        if ( el.length === 1 ) {
                            el = application.ui.getAspNetCheckboxLabel( el ) ?? el;
                        }
        
                        el.html( value );

                        if ( value.indexOf( "rbl-tid" ) > -1 ) {
                            // In case the markup from CE has a template specified...
                            that.processRblSource(el, defaultCalcEngineKey, showInspector);                        
                        }
                    }
                    else {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDef?._fullName + ", rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Detailed);
                    }
                });
        }
    
        processRblAttributes(showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            $("[rbl-attr]", application.element)
                .not("rbl-template *") // Not sure I'd need these to filter out rbl-value elements inside templates because { } should be used for 'values'
                .each(function () {
                    let el = $(this);
        
                    if ( showInspector && !el.hasClass("kat-inspector-attr") )
                    {
                        el.addClass("kat-inspector-attr");
                        let inspectorTitle = "[rbl-attr={value}]".format( { "value": el.attr('rbl-attr') } );
                        const existingTitle = el.attr("title");
                        
                        if ( existingTitle != undefined ) {
                            inspectorTitle += "\nOriginal Title: " + existingTitle;
                        }
                        el.attr("title", inspectorTitle);
                    }
        
                    const rblAttributes = el.attr("rbl-attr")!.split( " " ); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                    // rbl-attr="attrName:selector[:ce:tab]"
                    rblAttributes.forEach( a => {
                        const attrParts = a.split(":");
                        const attrName = attrParts[ 0 ];
                        const rblValueParts = attrParts[1].split('.');
                        const ceName = attrParts.length >= 3 ? attrParts[ 2 ] : undefined;
                        const tabName = attrParts.length >= 4 ? attrParts[ 3 ] : undefined;

                        const tabDef = that.getTabDef( tabName, ceName )
                        const value = 
                            that.getRblSelectorValue( tabDef, "rbl-value", rblValueParts ) ??
                            that.getRblSelectorValue( tabDef, "ejs-output", rblValueParts );
            
                        if ( value != undefined ) {
                            if ( el.length === 1 ) {
                                el = application.ui.getAspNetCheckboxLabel( el ) ?? el;
                            }

                            // set attribute and data
                            const dataName = "rbl-attr-" + attrName + "-previous";
                            const previous = el.data(dataName);
                            const currentValue = el.attr(attrName) || "";
                            const newValue = previous != undefined
                                ? currentValue.replace(previous, value).trim()
                                : ( currentValue == "" ? value : currentValue + " " + value ).trim();

                            if ( newValue == "" ) {
                                el.removeAttr(attrName).removeData(dataName)
                            }
                            else {
                                el.attr(attrName, newValue).data(dataName, value);
                            }
                        }
                        else {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDef?._fullName + ", rbl-attr=" + a, TraceVerbosity.Detailed);
                        }
                    });
                });
        }

        processRblSources(defaultCalcEngineKey: string, showInspector: boolean): void {
            //[rbl-source] processing templates that use rbl results
            this.processRblSource(this.application.element, defaultCalcEngineKey, showInspector);
        }
    
        processRblSource(root: JQuery<HTMLElement>, defaultCalcEngineKey: string, showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            // If root itself is a templated item, I need to add (append) it to the list of
            // items to process, b/c selector below looking 'inside' root will not hit it.
            // The markup for this might look like:
            //
            //  <rbl-template tid="parent-template">
            //      <div rbl-source="child-rows" rbl-tid="child-template"></div>
            //  </rbl-template>
            $("[rbl-source], [rbl-source-table]", root)
                .add(root.is("[rbl-source], [rbl-source-table]") ? root : [] ) 
                .not("rbl-template *") // not in templates
                .each(function () {
                    const el = $(this);
    
                    // Only process element if *not* flagged as a rbl-configui only item or if it actually is a Configuration UI calculation
                    if ( el.attr("rbl-configui") === undefined || application.calculationInputs?.iConfigureUI === 1 ) {
    
                        const elementData = application.dataAttributesToJson(el, "data-");
                        const tid = el.attr('rbl-tid');
                        const rblSourceTableParts = el.attr('rbl-source-table')?.split('.');
                        const tabDef = that.getTabDef( el.attr('rbl-tab'), el.attr('rbl-ce') )
                        const tabDefName = tabDef?._fullName ?? ( el.attr( "rbl-ce" ) ?? defaultCalcEngineKey ) + "." + ( el.attr( "rbl-tab" ) ?? "default" );

                        // rbl-source-table - if provided, is a standard selector path in then form of
                        // table.id.valueColumn or table.columnToSearch.id.valueColumn and can be used to 
                        // return dynamic table name for rbl-source from CalcEngine
                        const rblSourceParts = rblSourceTableParts === undefined
                            ? el.attr('rbl-source')?.split('.')
                            : rblSourceTableParts.length === 3
                                ? [ that.getResultValue( tabDef, rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ] ) ?? "unknown" ]
                                : [ that.getResultValueByColumn( tabDef, rblSourceTableParts[ 0 ], rblSourceTableParts[ 1 ], rblSourceTableParts[ 2 ], rblSourceTableParts[ 3 ] ) ?? "unknown" ];
    
                        let templateContent = tid != undefined ? application.ui.getTemplate( tid, elementData )?.Content : undefined;
    
                        if ( showInspector && !el.hasClass("kat-inspector-source") ) {
                            el.addClass("kat-inspector-source");
                            const inspectorName = el.attr("rbl-source") != undefined ? "rbl-source" : "rbl-source-table";
                            const inspectorData = { 
                                "name": inspectorName, 
                                "value": el.attr(inspectorName),
                                "template": templateContent ?? "[No template found]"
                            };
                            let inspectorTitle = "[{name}={value}]\n{template}".format( inspectorData );
                            const existingTitle = el.attr("title");
                            
                            if ( existingTitle != undefined ) {
                                inspectorTitle += "\nOriginal Title: " + existingTitle;
                            }
                            el.attr("title", inspectorTitle);
                        }
            
                        if ( templateContent === undefined ) {
                            // Result tables are processed later
                            if ( el.attr("rbl-tid") !== "result-table" ) {
                                application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found. Tab = " + tabDefName + " [" + ( tid ?? "Missing rbl-tid for " + ( el.attr('rbl-source') ?? el.attr('rbl-source-table') ) ) + "]", TraceVerbosity.Detailed);
                            }
                        }
                        else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no rbl-source data in tab " + tabDefName, TraceVerbosity.Detailed);
                        }
                        else {
                            //table in array format.  Clear element, apply template to all table rows and .append
                            const table = that.getResultTable<JSON>( tabDef, rblSourceParts[0] );
                            
                            if ( table !== undefined && table.length > 0 ) {
                                
                                // Get a 'data' row with all values cleared out so that rows with blanks in CE
                                // (which aren't exported) are properly handled in templates
                                const firstRowSource = KatApp.extend( {}, table[0] );
                                if (Object.keys(firstRowSource).length > 0) {
                                    for (const propertyName in firstRowSource) {
                                        firstRowSource[propertyName] = "";
                                    }
                                }

                                const rblSourceDefaults = el.attr( "rbl-source-defaults" );
                                if ( rblSourceDefaults != undefined ) {
                                    rblSourceDefaults
                                        .split( ';' )
                                        .forEach( def => {
                                            const defParts = def.split('=');
                                            firstRowSource[ defParts[ 0 ] ] = defParts.length == 2 ? defParts[ 1 ] : "";
                                        });
                                }

                                const generateTemplateData = function(templateData: object, templateContent: string): JQuery<HTMLElement> {                                    
                                    try {
                                        templateData = KatApp.extend( {}, firstRowSource, templateData )
                                    } catch {
                                        // Could throw error if KatApp.js isn't updated and can't handle
                                        // when column has meta data of @class, @width, etc.
                                    }
    
                                    const formattedContent = templateContent.format( templateData );
                                    let el = $(formattedContent);

                                    const hasRoot = el.length == 1;

                                    // nested template processing will not select elements right if there is no root
                                    if ( !hasRoot ) {
                                        el = $("<div>" + formattedContent + "</div>");
                                    }

                                    // Nested templates
                                    that.application.ui.injectTemplatesWithoutSource(el);
                                    that.processRblSource(el, defaultCalcEngineKey, showInspector);
                                    
                                    return hasRoot ? el : el.children();
                                };

                                if ( rblSourceParts.length === 2 ) {
                                    const rowSource = that.getResultRow<JSON>( tabDef, rblSourceParts[0], rblSourceParts[1] );

                                    if ( rowSource !== undefined ) {
                                        const templateResult = generateTemplateData(
                                            KatApp.extend( {}, rowSource ),
                                            templateContent
                                        );

                                        el.children().remove();
                                        el.append(templateResult);
                                    }
                                    else {
                                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDefName + ", rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                                    }
                                }
                                else if ( rblSourceParts.length === 1 || rblSourceParts.length === 3 ) {
                                    el.children()
                                        .not(".rbl-preserve")
                                        .remove();

                                    const prepend = el.attr('rbl-prepend') === "true";
                                    const prependBeforePreserve = el.attr('rbl-prepend') === "before-preserve";

                                    table.forEach( ( row, index ) => {
                                        if ( rblSourceParts.length === 1 || row[ rblSourceParts[ 1 ] ] == rblSourceParts[ 2 ] ) {
                                            // Automatically add the _index0 and _index1 for carousel template
                                            // const templateData = KatApp.extend( {}, row, { _index0: index, _index1: index + 1 } )
                                            const templateResult = generateTemplateData(
                                                KatApp.extend( {}, row, { _index0: index, _index1: index + 1 } ),
                                                // compiler mis-stating that templateContent could be undefined
                                                templateContent!
                                            );
        
                                            if ( prepend ) {
                                                el.prepend( templateResult );
                                            }
                                            else if ( prependBeforePreserve ) {
                                                templateResult.insertBefore( $(".rbl-preserve", el).first() );
                                            }
                                            else {
                                                el.append( templateResult );
                                            }
                                        }
                                    });
                                }
                                else {
                                    application.trace("<b style='color: Red;'>RBL WARNING</b>: Invalid length for rblSourceParts=" + rblSourceParts.join("."), TraceVerbosity.Detailed);
                                }            
                            } else {
                                application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDefName + ", rbl-source=" + el.attr('rbl-source'), TraceVerbosity.Detailed);
                            }
                        }
                    }
                });
        }
    
        processVisibilities( defaultCalcEngineKey: string, showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            // toggle visibility
            //[rbl-display] controls display = none|block(flex?).  
            //Should this be rbl-state ? i.e. other states visibility, disabled, delete
            $("[rbl-display]", application.element)
                .not("rbl-template *") // not in templates
                .each(function () {
                    const el = $(this);
                    const rblDisplay = el.attr('rbl-display');

                    if ( rblDisplay != undefined ) {
                        if ( showInspector && !el.hasClass("kat-inspector-display") )
                        {
                            el.addClass("kat-inspector-display");
                            let inspectorTitle = "[rbl-display={value}]".format( { value: rblDisplay } );
                            const existingTitle = el.attr("title");
                            
                            if ( existingTitle != undefined ) {
                                inspectorTitle += el.hasClass( "kat-inspector-value" )
                                    ? "\n" + existingTitle
                                    : "\nOriginal Title: " + existingTitle;
                            }
                            el.attr("title", inspectorTitle);
                        }
            
                        // totalReturned=0
                        const rblDisplayParts = rblDisplay.split('.');
                        const tabDef = that.getTabDef( el.attr('rbl-tab'), el.attr('rbl-ce') )
                        let  tabDefName = tabDef?._fullName ?? ( el.attr( "rbl-ce" ) ?? defaultCalcEngineKey ) + "." + ( el.attr( "rbl-tab" ) ?? "default" );

                        if ( tabDef != undefined ) {
                            // Check to see if there's an "=" for a simple equality expression
                            // If rblDisplay = table.id.col=value, rblDisplayParts is: table, id, col=value
                            // so split the last item and if expression is present, change the last displayParts
                            // from col=value to just col.  Then get the value.
                            const isInequality = rblDisplayParts[ rblDisplayParts.length - 1].indexOf("!=") > -1;
                            const isLTE = rblDisplayParts[ rblDisplayParts.length - 1].indexOf("<=") > -1;
                            const isLT = rblDisplayParts[ rblDisplayParts.length - 1].indexOf("<") > -1;
                            const isGTE = rblDisplayParts[ rblDisplayParts.length - 1].indexOf(">=") > -1;
                            const isGT = rblDisplayParts[ rblDisplayParts.length - 1].indexOf(">") > -1;

                            const splitOperator =
                                isInequality ? '!=' : 
                                isLTE ? '<=' :
                                isLT ? '<' :
                                isGTE ? '>=' :
                                isGT ? '>' : '=';

                            const expressionParts = rblDisplayParts[ rblDisplayParts.length - 1].split(splitOperator);
                            rblDisplayParts[ rblDisplayParts.length - 1] = expressionParts[0];
                            
                            let visibilityValue = 
                                rblDisplayParts[ 0 ].startsWith( "v:" ) ? rblDisplayParts[ 0 ].substring( 2 ) :
                                    that.getRblSelectorValue( tabDef, "rbl-display", rblDisplayParts ) ??
                                    that.getRblSelectorValue( tabDef, "ejs-visibility", rblDisplayParts ) ??
                                    that.getRblSelectorValue( tabDef, "ejs-output", rblDisplayParts ); // Should remove this and only check ejs-visibility as the 'default'
                
                            if (visibilityValue != undefined) {

                                // Reassign the value you are checking to 1/0 if they tried to compare with
                                // an expression of col=value.
                                if ( expressionParts.length > 1) {
                                    visibilityValue = 
                                        isInequality ? ( visibilityValue != expressionParts[1] ? "1" : "0" ) : 
                                        isLTE ? ( +visibilityValue <= +expressionParts[1] ? "1" : "0" ) :
                                        isLT ? ( +visibilityValue < +expressionParts[1] ? "1" : "0" ) :
                                        isGTE ? ( +visibilityValue >= +expressionParts[1] ? "1" : "0" ) :
                                        isGT ? ( +visibilityValue > +expressionParts[1] ? "1" : "0" ) :
                                        ( visibilityValue == expressionParts[1] ? "1" : "0" );
                                }
                
                                if (visibilityValue === "0" || visibilityValue.toLowerCase() === "false" || visibilityValue === "") {
                                    el.hide();
                                }
                                else {
                                    el.show();
                                }

                                return;
                            }
                        }

                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDefName + ", rbl-display=" + rblDisplay, TraceVerbosity.Detailed);
                    }
                });
        }
    
        processRblDatas( tabDef: TabDef ): void {
            // Legacy, might not be needed
            const dataRows = this.getResultTable<RBLeRowWithId>( tabDef, "ejs-rbl-data" );
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
    
        processRBLSkips( tabDef: TabDef ): void {
            // Legacy, might not be needed (what class do you want me to drop in there)
            const skipRows = this.getResultTable<RBLeRowWithId>( tabDef, "skip-RBLe" );
            const application = this.application;
    
            skipRows.forEach( row => {
                const selector = application.ui.getJQuerySelector( row["key"] || row["@id"] );
                if ( selector !== undefined ) {
                    const el = $(selector, application.element);
                    
                    el.addClass("rbl-nocalc skipRBLe").off(".RBLe");
                    $(":input", el).off(".RBLe");
                    // leave update.RBLe (for updating label) and change.RBLe (for keeping 'wizard sliders' in sync) on...
                    this.application.ui.getNoUiSlider( $("div[data-slider-type='nouislider']", el.parent()) )?.off('set.RBLe');
                }
            });
        }
    
        setInput( id: string, value: string | undefined ): void {
            const selector = this.application.ui.getJQuerySelector( id );
    
            if ( selector !== undefined ) {
                value = value ?? "";
                $(selector + "DisplayOnly", this.application.element).html(value);
                const input = $(selector, this.application.element).not("div");
                const listControl = $(selector + "[data-itemtype]", this.application.element);
                const isCheckboxList = listControl.data("itemtype") == "checkbox";
                const isRadioList = listControl.data("itemtype") == "radio";
                const aspCheckbox = this.application.ui.getAspNetCheckboxInput(input);
                const radioButtons = isRadioList ? $("input", listControl) : $("input[type='radio']", input);
                const noUiSlider = this.application.ui.findNoUiSlider(id, this.application.element);
    
                if ( noUiSlider !== undefined ) {
                    const sliderContainer = this.application.ui.findNoUiSliderContainer(id, this.application.element);
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
                else {
                    this.application.trace("<b style='color: Red;'>RBL WARNING</b>: No ejs-default input can be found for " + id, TraceVerbosity.Detailed);
                }
            }
        }
    
        processDefaults( tabDef: TabDef ): void {
            const defaultRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-defaults" );
    
            defaultRows.forEach( row => {
                const id = row["@id"];
                this.setInput(id, row.value);
            });
        }
    
        processDisabled( tabDef: TabDef ): void {
            const disabledRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-disabled" );
            const application = this.application;
    
            disabledRows.forEach( row => {
                const id = row["@id"];
                const selector = this.application.ui.getJQuerySelector( id );
    
                if ( selector !== undefined ) {
                    // @id - regular input
                    // @id input - checkbox and list controls
                    // slider-@id - noUiSlider
                    const value = row.value ?? "";
                    const input = $(selector + ", " + selector + " input", application.element);
                    const sliderContainer = this.application.ui.findNoUiSliderContainer( id, application.element );
    
                    if (sliderContainer !== undefined) {
                        if (value === "1") {
                            sliderContainer.attr("disabled", "true").removeAttr("kat-disabled");
                        }
                        else {
                            sliderContainer.removeAttr("disabled");
                        }
                    }
                    else if ( input.length > 0 ) {
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
                    else {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: No ejs-disabled input can be found for " + id, TraceVerbosity.Detailed);
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
    
        private getCellMarkup(row: ResultTableRow, columnName: string, element: string, columnClass: string, colSpan: number | undefined, isBootstrapColumn: boolean): string {
            const value = this.getResultTableValue( row, columnName );
    
            if (!isBootstrapColumn && colSpan !== undefined) {
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
    
            $("[rbl-tid='result-table']", view)
                .not("rbl-template *") // not in templates
                .each(function ( i, r ) {
                    const tableName = r.getAttribute( "rbl-tablename" ) ?? r.getAttribute( "rbl-source" );
                    const templateCss = r.getAttribute( "data-css" );
        
                    if ( tableName !== null ) {
                        const tabDef = that.getTabDef( r.getAttribute('rbl-tab'), r.getAttribute('rbl-ce') )
                        const contentRows = application.rble.getResultTable<ContentsRow>( tabDef, "contents" );
                        
                        const configRow = 
                            contentRows.find( row => row.section === "1" && KatApp.stringCompare( row.type, "table", true ) === 0 && row.item === tableName );
        
                        const configCss = configRow?.class;
                        let tableCss = 
                            configCss != undefined ? "rbl " + tableName + " " + configCss :
                            templateCss != undefined ? "rbl " + tableName + " " + templateCss :
                            "table table-striped table-bordered table-condensed rbl " + tableName;
                            
                        const tableRows = application.rble.getResultTable<ResultTableRow>( tabDef, tableName );
        
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
                                    xsColumns: ( e.Element["@xs-width"] != undefined ? e.Element["@xs-width"]*1 : undefined ) || (hasResponsiveTable && e.Element["@width"] != undefined ? e.Element["@width"]*1 : undefined),
                                    smColumns: e.Element["@sm-width"] != undefined ? e.Element["@sm-width"] * 1 : undefined,
                                    mdColumns: e.Element["@md-width"] != undefined ? e.Element["@md-width"] * 1 : undefined,
                                    lgColumns: e.Element["@lg-width"] != undefined ? e.Element["@lg-width"] * 1 : undefined
                                }) as ResultTableColumnConfiguration );
                        
                        const columnConfiguration: { 
                            [ key: string ]: ResultTableColumnConfiguration;
                        } = {};
                    
                        tableColumns.forEach( c => {
                            columnConfiguration[ c.name ] = c;
                        });
        
                        const hasBootstrapTableWidths = tableColumns.filter(c => c.xsColumns !== undefined || c.smColumns !== undefined || c.mdColumns !== undefined || c.lgColumns !== undefined).length > 0;
                        const useBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;
        
                        let colGroupDef: string | undefined = undefined; // This was an optional param in RBLe
        
                        const getBootstrapColumnCss = function( c: ResultTableColumnConfiguration ) {
                            let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
                            bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
                            bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
                            bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";

                            return bsClass.trim();
                        }
                        const getBootstrapSpanColumnCss = function( start: number, length: number ) {
                            const spanCols = tableColumns.filter( ( c, i ) => i >= start && i <= start + length );
                            const xs = spanCols.reduce( ( sum, curr ) => sum + ( curr.xsColumns ?? 0 ), 0 );
                            const sm = spanCols.reduce( ( sum, curr ) => sum + ( curr.smColumns ?? 0 ), 0 );
                            const md = spanCols.reduce( ( sum, curr ) => sum + ( curr.mdColumns ?? 0 ), 0 );
                            const lg = spanCols.reduce( ( sum, curr ) => sum + ( curr.lgColumns ?? 0 ), 0 );
                            let bsClass = xs > 0 ? " col-xs-" + xs : "";
                            bsClass += sm > 0 ? " col-sm-" + sm : "";
                            bsClass += md > 0 ? " col-md-" + md : "";
                            bsClass += lg > 0 ? " col-lg-" + lg : "";

                            return bsClass.trim();
                        }

                        if ( colGroupDef === undefined ) {
                            colGroupDef = "";

                            if ( !useBootstrapColumnWidths ) {
                                tableColumns.forEach(c => {
                                    const width = c.width !== undefined || c.widthPct !== undefined
                                        ? " width=\"{width}\"".format( { width: c.widthPct || (c.width + "px") })
                                        : "";
            
                                    colGroupDef += "<col class=\"{table}-{column}\"{width} />".format(
                                        {
                                            table: tableName,
                                            column: c.name,
                                            width: width
                                        }
                                    );
                                });
                            }
                        }
        
                        const colGroup = colGroupDef != "" ? that.createResultTableElement(colGroupDef, "colgroup") : "";
        
                        let headerHtml = "";
                        let bodyHtml = "";

                        tableRows.forEach( row => {
                            const code = row["code"] ?? "";
                            const id = row["@id"] ?? "";
                            const isHeaderRow = 
                                (code === "h" || code.startsWith("header") || code.startsWith("hdr") ) ||
                                (id === "h" || id.startsWith("header") || id.startsWith("hdr"));
        
                            const element = 
                                useBootstrapColumnWidths ? "div" :
                                isHeaderRow ? "th" : "td";

                            let rowClass = row["@class"] ?? row["class"] ?? "";

                            if ( useBootstrapColumnWidths ) {
                                rowClass += " row tr-row";
                                if ( isHeaderRow ) {
                                    rowClass += " h-row"
                                }
                            }

                            const span = that.getResultTableValue(row, "span");
        
                            let rowHtml = "";
                            let headerSpanCellName: string | undefined = "";
        
                            if (isHeaderRow && span === "" && (headerSpanCellName = that.getHeaderSpanCellName(row)) !== undefined) {
                                const hClass =
                                    "{valueClass} span-{table}-{column} {bsGrid}".format(
                                        {
                                            table: tableName,
                                            column: headerSpanCellName,
                                            valueClass: columnConfiguration[headerSpanCellName].isTextColumn ? "text" : "value",
                                            bsGrid: useBootstrapColumnWidths ? getBootstrapSpanColumnCss( 0, tableColumns.length - 1 ) : ""
                                        }
                                    );
                                rowHtml += that.getCellMarkup(row, headerSpanCellName, element, hClass.trim(), tableColumns.length, useBootstrapColumnWidths);
                            }
                            else if (span !== "") {
                                const parts = span.split(":");
                                let currentCol = 0;

                                for (let p = 0; p < parts.length; p++) {
                                    if (p % 2 === 0) {
                                        const colSpan = +parts[p + 1];
        
                                        // includeBootstrapColumnWidths - need to figure out how to get class in here...
                                        // parse viewports and add together based on colSpan...
                                        const colSpanName = parts[p];
                                        const spanConfig = columnConfiguration[colSpanName];
                                        const textCol = spanConfig.isTextColumn;
        
                                        const sClass =
                                            "{valueClass}{columnClass} span-{table}-{column} {bsGrid}".format(
                                                {
                                                    table: tableName,
                                                    column: colSpan,
                                                    valueClass: textCol ? "text" : "value",
                                                    columnClass: spanConfig.cssClass != undefined ? " " + spanConfig.cssClass : "",
                                                    bsGrid: useBootstrapColumnWidths ? getBootstrapSpanColumnCss(currentCol, colSpan - 1) : ""
                                                }
                                            );
                                        
                                        currentCol += colSpan;
                                        rowHtml += that.getCellMarkup(row, colSpanName, element, sClass.trim(), colSpan, useBootstrapColumnWidths);
                                    }
                                }
                            }
                            else {
                                tableColumns.forEach(c => {
                                    const columnClass = useBootstrapColumnWidths
                                        ? [ getBootstrapColumnCss( c ), c.cssClass ?? "" ]
                                            .filter( c => c != undefined && c != "" )
                                            .join( " " )
                                        : c.cssClass ?? "";

                                    const cClass =
                                        "{valueClass} {columnClass} {table}-{column}".format(
                                            {
                                                table: tableName,
                                                column: c.name,
                                                valueClass: c.isTextColumn ? "text" : "value",
                                                columnClass: columnClass
                                            }
                                        );
        
                                    rowHtml += that.getCellMarkup(row, c.name, element, cClass, undefined, useBootstrapColumnWidths );
                                });
                            }    
        
                            if (!useBootstrapColumnWidths && isHeaderRow && bodyHtml === "") {
                                headerHtml += that.createResultTableElement(rowHtml, "tr", rowClass.trim());
                            }
                            else {
                                bodyHtml += that.createResultTableElement(rowHtml, useBootstrapColumnWidths ? "div" : "tr", rowClass.trim());
                            }
                        });
                        
                        if ( useBootstrapColumnWidths ) {
                            const html = that.createResultTableElement(bodyHtml, "div", "");        
                            $(r).empty().append($(html));
                        }
                        else {
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
                    }
                });
        }
    
        processCharts(): void {
            const view = this.application.element;
            const highchartsBuilder: HighchartsBuilder = new HighchartsBuilder( this.application );
    
            if ( typeof Highcharts !== "object" && $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view).length > 0 ) {
                this.application.trace("Highcharts javascript is not present", TraceVerbosity.None);
                return;
            }            
    
            $('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]', view)
                .not("rbl-template *")
                .each(function () {
                    highchartsBuilder.renderChart( $(this) );
                });
        }
    
        private addValidationItem(summary: JQuery<HTMLElement>, input: JQuery<HTMLElement> | undefined, message: string, bootstrapVersion: number): void {
            let ul = $("ul", summary);
            if (ul.length === 0) {
                summary.append("<ul></ul>");
                ul = $("ul", summary);
            }
    
            // Backward compat to remove validation with same id as input, but have changed it to 
            // id + Error so that $(id) doesn't get confused picking the li item.
            let inputName = "Input" + $("ul li", summary).length;
            if ( input !== undefined && input.length > 0 ) {
                inputName = this.application.ui.getInputName(input);
                $("ul li." + inputName + ", ul li." + inputName + "Error", summary).remove();
            }
            
            ul.append("<li class=\"rble " + inputName + "Error\">" + message + "</li>");
    
            if ( input !== undefined && input.length > 0 ) {
                const isWarning = summary.hasClass("ModelerWarnings");
                const validationClass = isWarning ? "warning" : "error";
                const valContainer = input.closest('.validator-container').addClass(validationClass);
    
                const errorSpan = valContainer.find('.error-msg')
                    .attr(bootstrapVersion == 5 ? 'data-bs-original-title' : 'data-original-title', message)
                    .empty();
    
                $("<label/>").css("display", "inline-block")
                    .addClass(validationClass)
                    .text(message)
                    .appendTo(errorSpan);
            }
        };
    
        processValidationRows(summary: JQuery<HTMLElement>, errors: ValidationRow[]): void {
            if (errors.length > 0) {
                var bootstrapVersion = this.application.bootstrapVersion;
                errors.forEach( r => {
                    const selector = this.application.ui.getJQuerySelector( r["@id"] );
                    const input = selector !== undefined ? $(selector, this.application.element) : undefined;
                    this.addValidationItem(summary, input, r.text, bootstrapVersion);
                });
            }
        }
    
        initializeValidationSummaries(): void {
            const view = this.application.element;            
            const errorSummary = $("#" + this.application.id + "_ModelerValidationTable", view);
            let warningSummary = $("#" + this.application.id + "_ModelerWarnings", view);
    
            // TODO: See Bootstrap.Validation.js - need to process server side validation errors to highlight the input correctly
    
            if (warningSummary.length === 0 && errorSummary.length > 0 ) {
                // Warning display doesn't exist yet, so add it right before the error display...shouldn't have errors and warnings at same time currently...
                warningSummary = $("<div id='" + this.application.id + "_ModelerWarnings' style='display: none;' class='validation-warning-summary alert alert-warning' role='alert'><p><i class='far fa-exclamation-triangle'></i> <span class='sr-only'>Warnings</span> Please review the following warnings: </p><ul></ul></div>");
                $(warningSummary).insertBefore(errorSummary);
            }            
    
            $('.validator-container.error', view).not(".server, .apiAction").removeClass('error');
            $('.validator-container.warning', view).not(".server, .apiAction").removeClass('warning');
    
            [ warningSummary, errorSummary ].forEach( summary => {
                // Remove all RBLe client side created errors since they would be added back
                $("ul li.rble", summary).remove();
            });
        }
        finalizeValidationSummaries( scrollToSummary = true ): void {
            const view = this.application.element;            
            const errorSummary = $("#" + this.application.id + "_ModelerValidationTable", view);
            const warningSummary = $("#" + this.application.id + "_ModelerWarnings", view);
    
            [ warningSummary, errorSummary ].forEach( summary => {
                // Some server side calcs add error messages..if only errors are those from client calcs, 
                // I can remove them here
                if ($("ul li", summary).length === 0) {
                    summary.hide();
                    $("div", summary).first().hide();
                }
                else {
                    summary.show();
                    $("div", summary).first().show();
                }
            });
    
            if ( scrollToSummary && this.application.calculationInputs?.iConfigureUI === 1 ) {
            /*
                // Scroll target will probably need some work
                if ($("ul li", warningSummary).length > 0 && warnings.length > 0) {
                    $('html, body').animate({
                        scrollTop: warningSummary.offset().top - 30
                    }, 1000);
                }
                else if ($("ul li", errorSummary).length > 0 && errors.length > 0) {
                    $('html, body').animate({
                        scrollTop: errorSummary.offset().top - 30
                    }, 1000);
                }
            */
            }
        }
    
        processValidations( tabDef: TabDef ): void {
            const view = this.application.element;            
            const errorSummary = $("#" + this.application.id + "_ModelerValidationTable", view);
            const warningSummary = $("#" + this.application.id + "_ModelerWarnings", view);
    
            const warnings = this.getResultTable<ValidationRow>( tabDef, "warnings" );
            const errors = this.getResultTable<ValidationRow>( tabDef, "errors" );

            if ( errors.length + warnings.length > 0 && errorSummary.length == 0 ) {
                this.application.trace("<b style='color: Red;'>RBL WARNING</b>: No validation summary is found to process the errors/warnings rows from " + tabDef._fullName, TraceVerbosity.Detailed);
            }
            else {
                this.processValidationRows(warningSummary, warnings);
                this.processValidationRows(errorSummary, errors);
            }
        }
    
        processSliders( tabDef: TabDef ): void {
            const sliderRows = this.getResultTable<SliderConfigurationRow>( tabDef, "ejs-sliders" );
            const application = this.application;
            
            if ( typeof noUiSlider !== "object" && sliderRows.length > 0 ) {
                application.trace("noUiSlider javascript is not present for " + tabDef._fullName, TraceVerbosity.None);
                return;
            }
    
            sliderRows.forEach( config => {
                const id = config["@id"];
    
                const sliderJQuery = $(".slider-" + id, application.element);
    
                if ( sliderJQuery.length !== 1 ) {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id, TraceVerbosity.Detailed);
                }
                else {
                    const minValue = Number( config.min );
                    const maxValue = Number( config.max );
        
                    const input = $("." + id, application.element);
    
                    const defaultConfigValue =
                        this.getResultValue( tabDef, "ejs-defaults", id, "value") || // what is in ejs-defaults
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
    
        processListControls( tabDef: TabDef ): void {
            const application = this.application;
            const ui = this.application.ui;
            const configRows = this.getResultTable<ListControlRow>( tabDef, "ejs-listcontrol" );
    
            configRows.forEach( row => {
                const tableName = row.table;
                const controlName = row["@id"];
                
                const dropdown = $("." + controlName, application.element).not("div");
                const listControl = $("div." + controlName + "[data-itemtype]", application.element);
                const listRows = this.getResultTable<ListRow>( tabDef, tableName );
    
                if ( listControl.length === 1 ) {
                    ui.processListItems(
                        listControl,
                        row.rebuild == "1",
                        listRows.map( r => ({ Value:  r.key, Text: r.text, Help: r.help, Selected: false, Visible: r.visible != "0", Disabled: r.disabled == "1" }))
                    );
                }
                else if ( dropdown.length === 1 ) {
                    ui.processDropdownItems(
                        dropdown, 
                        row.rebuild == "1",
                        listRows.map( r => ({ Value:  r.key, Text: r.text, Class: r.class, Subtext: r.subtext, Html: r.html, Selected: false, Visible: r.visible != "0" }))
                    );
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No ejs-listcontrol can be found for " + controlName, TraceVerbosity.Detailed);
                }
            });
        }
    
        processResults( calculationOptions: KatAppOptions ): boolean {
            const application = this.application;
            const results = application.results;
    
            if ( results !== undefined ) {
                const showInspector = application.calculationInputs?.iConfigureUI === 1 && ( calculationOptions.debug?.showInspector ?? false );
                this.initializeValidationSummaries();
                this.finalizeValidationSummaries( false );

                results.forEach(tabDef => {
                    application.trace( "Processing results for " + tabDef._fullName + "(" + tabDef["@version"] + ")", TraceVerbosity.Normal );
    
                    // Need two passes to support "ejs-markup" because the markup might render something that 
                    // is then processed by subsequent flow controls (ouput, sources, or values)
                    const markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "ejs-markup" )
                    markUpRows.forEach( r => { this.createHtmlFromResultRow( r, false ); });
                    
                    // Legacy support, hopefully ejs-output would be removed from CalcEngine
                    // to speed up processing
                    const outputRows = this.getResultTable<HtmlContentRow>( tabDef, "ejs-output" )
                    outputRows.forEach( r => { this.createHtmlFromResultRow( r, true ); });
    
                    this.processRblDatas( tabDef );
                });
    
                // Run all *pull* logic outside of tabdef loop, this has to be after all markup
                // rows have been processed and all ejs-output in case they injected 'rbl-' items
                // in markup that has to be processed
                application.trace( "Processing all results 'pull' logic", TraceVerbosity.Normal );
                const defaultCalcEngineKey = ( calculationOptions.calcEngines != undefined ? calculationOptions.calcEngines[0].key : undefined ) ?? "default";
                this.processRblSources( defaultCalcEngineKey, showInspector );
                this.processRblValues( defaultCalcEngineKey, showInspector );
                this.processRblAttributes( showInspector );
                this.processTables();
                this.processCharts();
    
                // Need to re-run processUI here in case any 'templates/inputs' were injected from 
                // results and need their initial data-* attributes/events processed.
                this.application.templateBuilder.processUI();
    
                // These all need to be after processUI so if any inputs are built
                // from results, they are done by the time these run
                this.processVisibilities( defaultCalcEngineKey, showInspector );
    
                let sliderConfigIds: ( string | null )[] = [];
    
                // Now loop again to run rest of 'push' items from each tab.  This has to
                // be after all html updates from prior loop and from any possible template 
                // processing thta happens in rbl-source processing
                results.forEach(tabDef => {
                    const markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "ejs-markup" )
                    // apply dynamic classes after all html updates 
                    markUpRows.forEach( r => {
                        if ( r.selector !== undefined ) {
                            if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                                const el = $(r.selector, application.element);
                                el.addClass(r.addclass);
    
                                if ( r.addclass.indexOf("skipRBLe") > -1 || r.addclass.indexOf("rbl-nocalc") > -1 ) {
                                    el.off(".RBLe");
                                    $(":input", el).off(".RBLe");
                                    this.application.ui.getNoUiSlider( $("div[data-slider-type='nouislider']", el.parent()) )?.off('.RBLe');
                                }
                            }
        
                            if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                                $(r.selector, application.element).removeClass(r.removeclass);
                            }
                        }
                    });
    
                    // Legacy, might not be needed
                    const visibilityRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-visibility" );
                    visibilityRows.forEach( row => {
                        const selector = application.ui.getJQuerySelector( row["@id"] ) + ", [rbl-display='" + row["@id"] + "']";
                        if ( selector !== undefined ) {
                            if (row.value === "1") {
                                $(selector, application.element).show();
                            }
                            else {
                                $(selector, application.element).hide();
                            }
                        }
                    });
    
                    if ( application.calculationInputs?.iConfigureUI === 1 ) {
                        sliderConfigIds = sliderConfigIds.concat( this.getResultTable<SliderConfigurationRow>( tabDef, "ejs-sliders" ).map( r => r["@id"]) );
                    }                
        
                    this.processSliders( tabDef )
                    this.processRBLSkips( tabDef );
                    this.processListControls( tabDef );
                    this.processDefaults( tabDef );
                    this.processDisabled( tabDef );
                    this.processValidations( tabDef );
                    
                    this.application.ui.handleVoidAnchors();
                    this.application.ui.bindRblOnHandlers();

                    application.trace( "Finished processing results for " + tabDef._fullName, TraceVerbosity.Normal );
                });
    
                if ( application.calculationInputs?.iConfigureUI === 1 ) {
                    $('div[data-slider-type="nouislider"]', application.element)
                        .map( ( i, r ) => $("input", $(r).parent()).attr("name") || "missing" )
                        .filter( ( i, r ) => {
                            return sliderConfigIds.indexOf( r ) < 0;
                        })
                        .each( ( i, r ) => {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider configuration can be found for " + r + ".", TraceVerbosity.Detailed);
                        });
                }                
    
                this.finalizeValidationSummaries();
                return true;
            }
            else {
                application.trace( "Results not available", TraceVerbosity.Quiet );
                return false;
            }
        }
    }
    class HighchartsBuilder {
        application: KatAppPlugIn;

        constructor( application: KatAppPlugIn ) {
            this.application = application;    
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

		getValue(value: string): string | boolean | number | (()=> void) | undefined {
			const d = Number(value);

			if (value === undefined || KatApp.stringCompare(value, "null", true) === 0) return undefined;
			else if (!isNaN(d) && value !== "") return d;
			else if (KatApp.stringCompare(value, "true", true) === 0) return true;
			else if (KatApp.stringCompare(value, "false", true) === 0) return false;
			else if (value.startsWith("json:")) return JSON.parse(value.substring(5));
			else if (value.startsWith("var ")) {
                // Not sure this is ever used because it doesn't appear to work.
                // It assigns a function() to the property instead of the value.
                // Introduced eval method to immediately eval the text
                const v = value.substring(4);
				return function (): any { return eval(v); } // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			else if (value.startsWith("eval ")) {
                const v = value.substring(5);
                
                return eval(v);
			}
			else if (value.startsWith("function ")) {
                // What I changed it to, so it kept params, but maybe not needed??  FindDr has function ( event ) { }...only works if I DON'T have the (event) in my code
				// const f = this.removeRBLEncoding("function f {function} f.call(this);".format( { function: value.substring(value.indexOf("(")) } ));
                // https://bitbucket.org/benefittechnologyresources/katapp/commits/f81b20cb5d76b24d92579613b2791bbe37374eb2#chg-client/KatAppProvider.ts
                const f = this.removeRBLEncoding("function f() {value} f.call(this);".format( { value: value.substring(value.indexOf("{")) } ));				

                // value = "function ( event ) { debugger; $(\".iChartClick\").val( event.point.id ).trigger('change'); }"
                // f_1 = this.removeRBLEncoding("function f() {value} f.call(this);".format( { value: value.substring(value.indexOf("{")) } ))

				return function (): any { return eval(f!); } // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
			}
			else return this.removeRBLEncoding(value);
		}

        // Associated code with this variable might belong in template html/js, but putting here for now.
        firstHighcharts = true;
        ensureCulture(): void {
            // Set some default highcharts culture options globally if this is the first chart I'm processing
            if ( this.firstHighcharts ){
                this.firstHighcharts = false;

                // Culture *has* to be returned on first/driver CE
                const tabDef = this.application.rble.getTabDef()
                const culture = this.application.rble.getResultValue( tabDef, "variable","culture","value") ?? "en-";

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

        setApiOption(optionsContainer: HighchartsOptions | HighchartsSeriesOptions, name: string, value: string): void {
			let optionJson = optionsContainer;
			const optionNames = name.split(".");
			const optionValue = this.getValue(value);

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

                const needsArrayElement = optionIndex > -1 && optionJson[optionName] != undefined && (optionJson[optionName] as HighchartsOptionsArray ).length - 1 < optionIndex;

				// If doesn't exist, set it to new object or array
				if (optionJson[optionName] === undefined) {
					optionJson[optionName] = optionIndex > -1 ? [newValue] : newValue;
				}
				else if (onPropertyValue || needsArrayElement ) {
					if (optionIndex > -1) {
						const propertyArray = optionJson[optionName] as HighchartsOptionsArray;
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

				// Reset my local variable to the most recently added/created object
				optionJson = optionIndex > -1
					? optionJson[optionName][optionIndex]
					: optionJson[optionName];
			}
		}

        getXAxisOptions( existingOptions: HighchartsAxisOptions | undefined, chartData: HighChartsDataRow[] ): HighchartsAxisOptions {
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

                    const from = KatApp.stringCompare(span, "lower", true) === 0 ? -1 : row.Index + offset;
                    const to =
                        KatApp.stringCompare(span, "lower", true) === 0 ? row.Index + offset :
                        KatApp.stringCompare(span, "higher", true) === 0 ? chartData.length :
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

        getTooltipOptions( tooltipFormat: string | undefined, seriesColumns: string[], seriesConfigurationRows: HighChartsDataRow[] ): HighchartsTooltipOptions | undefined {
            if ( tooltipFormat === undefined ) {
                return undefined;
            }

            // Get the series 'format' row to look for specified format, otherwise return c0 as default (find => firstordefault)
            const configFormat = seriesConfigurationRows.find(c => c.category === "config-format");

            const seriesFormats = seriesColumns
                // Ensure the series/column is visible
                .filter( seriesName => seriesConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0 )
                .map( seriesName => configFormat?.[seriesName] as string || "c0" );

            return {
                formatter: function ( this: HighchartsTooltipFormatterContextObject ) {
                    let s = "";
                    let t = 0;
                    const pointTemplate = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
                        ? "<br/>{name} : {value}"
                        : "<br/>{name}: {value}";

                    this.points.forEach( ( point, index ) => {
                        if (point.y > 0) {

                            s += pointTemplate.format( { name: point.series.name, value: String.localeFormat("{0:" + seriesFormats[index] + "}", point.y) });
                            t += point.y;
                        }
                    });
                    return tooltipFormat.format( { x: this.x, stackTotal: String.localeFormat("{0:" + seriesFormats[0] + "}", t), seriesDetail: s});
                },
                shared: true
            } as HighchartsTooltipOptions;
        }

        getSeriesDataRow(row: HighChartsDataRow, allColumnNames: string[], seriesName: string, isXAxisChart: boolean): HighchartsDataPoint {

            // id: is for annotations so that points can reference a 'point name/id'
			// name: is for pie chart's built in highcharts label formatter and it looks for '.name' on the point
			const dataRow = { y: +row[seriesName], id: seriesName + "." + row.category } as HighchartsDataPoint;

			if (!isXAxisChart) {
				dataRow.name = row.category;
			}

            // Get all the 'data point' property values for the current chart data row
			const pointColumnHeader = "point." + seriesName + ".";
            allColumnNames.filter( k => k.startsWith(pointColumnHeader) ).forEach( k => {
                dataRow[k.substring(pointColumnHeader.length)] = this.getValue(row[k]);
			});

			return dataRow;
		}

		buildSeries(allColumns: string[], seriesColumns: string[], seriesConfigurationRows: HighChartsDataRow[], chartData: HighChartsDataRow[], isXAxisChart: boolean): HighchartsSeriesOptions[] {
			const seriesInfo: HighchartsSeriesOptions[] = [];

			seriesColumns.forEach(seriesName => {
				const isVisible = seriesConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0;
				// Don't want series on chart or legend but want it in tooltip/chart data
				const isHidden = seriesConfigurationRows.filter(c => c.category === "config-hidden" && c[seriesName] === "1").length > 0;

				if (isVisible) {
					const series: HighchartsSeriesOptions = {};
					const properties = seriesConfigurationRows
						.filter(c => ["config-visible", "config-hidden", "config-format"].indexOf(c.category) === -1 && c[seriesName] !== undefined)
						.map(c => ({ key: c.category.substring(7), value: c[seriesName] } as HighChartsOptionRow));

					series.data = chartData.map(d => this.getSeriesDataRow(d, allColumns, seriesName, isXAxisChart));

					properties.forEach(c => {
						this.setApiOption(series, c.key, c.value);
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

        buildChart( chartType: string | undefined, tooltipFormat: string | undefined, dataRows: HighChartsDataRow[], optionRows: HighChartsOptionRow[], overrideRows: HighChartsOverrideRow[], seriesConfigurationRows: HighChartsDataRow[] ): HighchartsOptions {
            const chartOptions: HighchartsOptions = {};

            const firstDataRow = dataRows[ 0 ];

            // First set all API properties from the options/overrides rows (options first, then overrides to replace/append)
            const apiOptions = 
                optionRows.concat( overrideRows )
                    .filter( r => !r.key.startsWith("config-") );

            apiOptions.forEach(optionRow => {
                this.setApiOption(chartOptions, optionRow.key, optionRow.value);
            });

            // Get series data
            const allChartColumns = Object.keys(firstDataRow);
            const seriesColumns = allChartColumns.filter( k => k.startsWith( "series" ) );
            const isXAxisChart = chartType !== "pie" && chartType !== "solidgauge" && chartType !== "scatter3d" && chartType !== "scatter3d";

            chartOptions.series = this.buildSeries(allChartColumns, seriesColumns, seriesConfigurationRows, dataRows, isXAxisChart);

            if (isXAxisChart) {
                chartOptions.xAxis = this.getXAxisOptions( chartOptions.xAxis as HighchartsAxisOptions | undefined, dataRows );
            }

            chartOptions.tooltip = this.getTooltipOptions( tooltipFormat, seriesColumns, seriesConfigurationRows ) ?? chartOptions.tooltip;

            return chartOptions;
        }

        renderChart(el: JQuery<HTMLElement>): JQuery {
            const dataName = el.attr("rbl-chartdata");
            const optionsName = el.attr("rbl-chartoptions") ?? dataName;

            if ( dataName !== undefined && optionsName !== undefined ) {

                const application = this.application;
                const tabDef = application.rble.getTabDef( el.attr('rbl-tab'), el.attr('rbl-ce') )
                const overrideRows = application.rble.getResultTable<HighChartsOverrideRow>( tabDef,"HighCharts-Overrides").filter( r => KatApp.stringCompare(r["@id"], dataName, true) === 0);
                const optionRows = application.rble.getResultTable<HighChartsOptionRow>( tabDef, "HighCharts-" + optionsName + "-Options");
                const allDataRows = application.rble.getResultTable<HighChartsDataRow>( tabDef, "HighCharts-" + dataName + "-Data");
                const dataRows = allDataRows.filter(e => !(e.category || "").startsWith("config-"));
                const seriesConfigurationRows = allDataRows.filter(e => (e.category || "").startsWith("config-"));

                if ( dataRows.length > 0 ) {
                    this.ensureCulture();

                    const builder = this;
                    const getOptionValue = function( configurationName: string ): string | undefined {
                        // Look in override table first, then fall back to 'regular' options table
                        return overrideRows?.find(r => KatApp.stringCompare(r.key, configurationName, true) === 0)?.value ??
                               optionRows?.find(r => KatApp.stringCompare(r.key, configurationName, true) === 0)?.value;
                    }
    
                    const chartType = getOptionValue("chart.type");
                    const tooltipFormat = this.removeRBLEncoding(getOptionValue("config-tooltipFormat"));
                    const chartOptions = this.buildChart( chartType, tooltipFormat, dataRows, optionRows, overrideRows, seriesConfigurationRows );
    
                    const container = $(".chart", el);

                    const configStyle = getOptionValue("config-style");
                    if (configStyle !== undefined) {
                        let renderStyle = container.attr("style") ?? "";
                        if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                            renderStyle += ";";
                        }
                        container.attr("style", renderStyle + configStyle);
                    }
                    
                    // Key automatically added to container for identifying this chart
                    const highchartKey = container.attr('data-highcharts-chart');
                    const highchart = Highcharts.charts[ highchartKey ?? -1 ] as unknown as HighchartsChartObject;
    
                    if ( highchart !== undefined ) {
                        highchart.destroy();                    
                    }

                    try {
                        container.highcharts(chartOptions);
                    } catch (error) {
                        application.trace("Error during highchart creation", TraceVerbosity.None);
                        throw error;                        
                    }
                }
            }

            return el;
        }
    }

    class StandardTemplateBuilder implements StandardTemplateBuilderInterface
    {
        application: KatAppPlugIn;

        constructor( application: KatAppPlugIn ) {
            this.application = application;   
        }
        
        processUI( container?: JQuery<HTMLElement> ): void {
            this.processInputs( container );
            this.processCarousels( container );
            this.processHelpTips( container );
            this.processActionLinks( container );
            this.processNavigationLinks( container );
        }

        processHelpTips( container?: JQuery<HTMLElement> ): void {
            // Couldn't include the Bootstrap.Tooltips.js file b/c it's selector hits entire page, and we want to be localized to our view.
            const selector = ".error-msg[data-toggle='tooltip'], .error-msg[data-bs-toggle='tooltip'], [data-toggle='popover'], [data-bs-toggle='popover']";
            const application = this.application;
            const view = container ?? application.element;
            const isBootstrap3 = this.application.bootstrapVersion == 3;

            if ( typeof $.fn.popover !== "function" && $(selector, view).length > 0 ) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present", TraceVerbosity.None);
                return;
            }

            $(selector, view)
                .not('.rbl-help, [data-katapp-initialized="true"]')
                .not("rbl-template *") // not in templates
                .each( function() {
                    const isErrorValidator = $(this).hasClass('error-msg');
                    let placement = $(this).data('placement') || $(this).data('bs-placement') || "top";
                    const trigger = $(this).data('trigger') || $(this).data('bs-trigger') || "hover";
                    const container = $(this).data('container') || $(this).data('bs-container') || "body";

                    if ($(this).attr("href") == "#") {
                        // Convert simply # links to void so nothing happens
                        $(this).on("click.RBLe", function (e) {
                            e.preventDefault();
                        });
                    }
            
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
                            isErrorValidator // popover-arrow is for bootstrap 5
                                ? '<div class="tooltip error katapp-css" role="tooltip"><div class="tooltip-arrow arrow"></div><div class="tooltip-inner"></div></div>'
                                : '<div class="popover katapp-css" role="tooltip"><div class="popover-arrow arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
                
                        placement: function (tooltip, trigger) {
                            // Add a class to the .popover element
            
                            // http://stackoverflow.com/a/19875813/166231
                            let dataClass = $(trigger).data('class');
                            if (dataClass != undefined) {
                                $(tooltip).addClass(dataClass);
                            }
            
                            // Did they specify a data-width?
                            dataClass = $(trigger).data('width') || $(trigger).data('bs-width');
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
                            const dataContent = $(this).data('content') ?? $(this).data('bs-content');
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
                        $(this)
                            .tooltip(options)
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
                if ( visiblePopover === undefined || $(visiblePopover).data("katapp-initialized") != true ) return;
                // Used to use this logic, but it didn't work with bootstrap 5, I've asked a question here:
                // https://stackoverflow.com/questions/67301932/cannot-access-bootstrap-5-bs-popover-data-with-jquery
                // if ( visiblePopover === undefined || $(visiblePopover).data("bs.popover") === undefined ) return;
                
                // Call this first b/c popover 'hide' event sets visiblePopover = undefined
                if ( application.bootstrapVersion == 3 ) {
                    $(visiblePopover).data("bs.popover").inState.click = false
                }
                $(visiblePopover).popover("hide");
            };

            if ( application.element.attr("data-katapp-initialized-tooltip") != "true" ) {
                application.element
                    .on("show.bs.popover.RBLe", function() { hideVisiblePopover(); })
                    .on("shown.bs.popover.RBLe", function( e ) { 
                        KatApp[ "visiblePopover"] = e.target; 
                        
                        //$("div.katapp-css[role='tooltip'] [rbl-action-link]").attr("data-katapp-initialized", "false");
                        //application.templateBuilder.processActionLinks($("div.katapp-css[role='tooltip']"));
                        
                        // Think scoping here is better
                        const currentPopover = $(e.target);
                        $("[rbl-action-link]", currentPopover).attr("data-katapp-initialized", "false");
                        application.templateBuilder.processActionLinks(currentPopover);
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
                    .attr("data-katapp-initialized-tooltip", "true");
            }
            if ( $("html").attr("data-katapp-initialized-tooltip") != "true" ) {
                $("html")
                    .on("click.RBLe", function( e ) {
                        if ($(e.target).is(".popover-title, .popover-content")) return; // BS3
                        if ($(e.target).is(".popover-header, .popover-body")) return; // BS4/BS5                    
                        hideVisiblePopover();
                    })
                    .attr("data-katapp-initialized-tooltip", "true");
            }

            // When helptip <a/> for checkboxes were  moved inside <label/>, attempting to click the help icon simply toggled
            // the radio/check.  This stops that toggle and lets the help icon simply trigger it's own click to show or hide the help.
            $('.checkbox label a[data-toggle], .checkbox label a[data-bs-toggle], .abc-checkbox label a[data-toggle], .abc-checkbox label a[data-bs-toggle]', view)
                .not("rbl-template *") // not in templates
                .not("[data-katapp-checkbox-tips-initialized='true']")
                .on('click', function (e) {
                    e.stopPropagation();
                    return false;
                })
                .attr("data-katapp-checkbox-tips-initialized", "true");
        }

        processNavigationLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const that = this;
            const application = this.application;

            $('[rbl-navigate]', view)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    if ( this.tagName == "A" ) {
                        $(this).attr("href", "#");
                    }
                    $(this).on("click", function(e) {
                        const actionLink = $(this);
                        e.preventDefault();

                        const id = actionLink.attr("rbl-navigate");
                        const inputSelector = actionLink.attr("rbl-navigate-input-selector");
                        const dataInputs = application.dataAttributesToJson( actionLink, "data-input-", true );

                        if ( dataInputs != undefined || inputSelector != undefined ) {
                            application.setDefaultInputsOnNavigate( dataInputs, inputSelector );
                        }

                        application.ui.triggerEvent( "onKatAppNavigate", id, this );
                        return false;
                    }).attr("data-katapp-initialized", "true");
                });
        }

        processActionLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const that = this;
            const application = this.application;

            $('[rbl-action-link]', view)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    if ( $(this).attr("href") == undefined ) {
                        $(this).attr("href", "#");
                    }
                    $(this).on("click", function(e) {
                        const actionLink = $(this);
                        e.preventDefault();

                        const actionEndpoint = actionLink.attr("rbl-action-link") ?? "NotSupported";
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
                            
                            const parametersJson = application.dataAttributesToJson( actionLink, "data-param-");
                            const inputsJson = application.dataAttributesToJson( actionLink, "data-input-" );

                            application.apiAction(
                                actionEndpoint, 
                                application.options, 
                                { 
                                    customParameters: parametersJson, 
                                    customInputs: inputsJson 
                                },
                                actionLink 
                            );
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
        
        private ensureRblDisplay( templateContainer: JQuery<HTMLElement> ): void {
            if ( templateContainer.attr("rbl-display") == undefined ) {
                const rblDisplayItems = templateContainer.children("[rbl-display]");
                if ( rblDisplayItems.length == 1 ) {
                    // If rendered template has first element with rbl-display, duplicate
                    // it on the rbl-tid item, otherwise reponsibility of kaml author to put
                    // rbl-display on rbl-tid item.
                    templateContainer.attr("rbl-display", rblDisplayItems.attr("rbl-display")!)
                }
            }
        }

        private processInputs( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            this.processTextBoxes( view );
            this.processDropdowns( view );
            this.processCheckboxes( view );
            this.processListControls( view );
            this.processSliders( view );
            this.processFileUploads( view );
        }

        private processCarousels( container?: JQuery<HTMLElement> ): void {
            const that: StandardTemplateBuilder = this;
            const app = this.application;
            const view = container ?? app.element;

            // Hook up event handlers only when *not* already initialized            
            $('[rbl-tid="carousel"],[rbl-template-type="katapp-carousel"]', view)            
                .not("rbl-template *") // not in templates
                // .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const el = $(this);

                    // Need to see if it has had items injected from results yet...
                    if ( el.data("katapp-initialized") != "true" && $(".carousel-indicators button[data-bs-slide-to]", el).length > 0) {
                        app.trace("Processing carousel: " + el.data("source"), TraceVerbosity.Detailed);
        
                        const carousel = $('.carousel', el);

                        // add active class to carousel items
                        $(".carousel-inner .carousel-item", el).not("[rbl-tid='inline']")
                            .first().addClass("active");
    
                        $(".carousel-indicators button", el).not("[rbl-tid='inline']")
                            .attr("data-bs-target", "#" + carousel.attr("id")!)
                            .first().addClass("active").attr("aria-current", "true");
    
                        const carouselAll = $('.carousel-all', el);
    
                        //add buttons to show/hide
                        $(".carousel-indicators button[data-show-all='true']", el)
                            .on("click", function () {
                                carousel.hide();
                                carouselAll.show();
                            });
                        $(".carousel-all button[data-show-all='false']", el)
                            .on("click", function () {
                                carouselAll.hide();
                                carousel.show();
                            });
    
                        el.attr("data-katapp-initialized", "true");
    
                        //show initial item, start carousel
                        carousel.carousel(0);
                    }
                });
        }

        private processCheckboxes( container: JQuery<HTMLElement> ): void {
            const app = this.application;
            const builder = this;

            $('[rbl-tid="input-checkbox"],[rbl-template-type="katapp-checkbox"]', container)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const el = $(this);
                    const id = el.data("inputname");
                    const input = $("span." + id + " input", el);
                    const label = el.data("label");
                    const help = el.data("help");
                    const checked = el.data("checked");
                    const css = el.data("css");
                    const inputCss = el.data("inputcss");

                    builder.ensureRblDisplay( el );

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
                        input.prop("checked", true);
                    }

                    if ( inputCss !== undefined ) {
                        input.addClass(inputCss);
                    }

                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processFileUploads( container: JQuery<HTMLElement> ): void {
            const that = this;
            const application = this.application;

            $('[rbl-tid="input-fileupload"],[rbl-template-type="katapp-fileupload"]', container)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const el = $(this);
                    
                    const id = el.data("inputname");
                    const label = el.data("label");
                    const help = el.data("help");
                    const css = el.data("css");
                    const formCss = el.data("formcss");
                    const inputCss = el.data("inputcss");
                    const labelCss = el.data("labelcss");
                    const hideLabel = el.data("hidelabel") ?? false;
                    // Command is legacy until nexgen 4.0 is removed
                    const actionEndpoint = el.data("rbl-action") ?? el.data("command") ?? "UploadFile";

                    that.ensureRblDisplay( el );

                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }
                    if ( formCss !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                    }

                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
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
                        let uploadUrl = "api/" + actionEndpoint;
                        const serviceUrlParts = application.options.sessionUrl?.split( "?" );
            
                        if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                            uploadUrl += "?" + serviceUrlParts[ 1 ];
                        }
            
                        application.showAjaxBlocker();
                        $(".file-upload .btn", el).addClass("disabled");
                        that.incrementProgressBars();
                        $(".file-upload-progress", application.element).show();

                        const fileUpload = $(".file-data", $(this).parent());


                        const parametersJson = application.dataAttributesToJson( el, "data-param-");
                        const inputsJson = application.dataAttributesToJson( el, "data-input-" );

                        const fd = 
                            application.buildFormData( 
                                that.application.getEndpointSubmitData(
                                    application.options, 
                                    { 
                                        customParameters: parametersJson, 
                                        customInputs: inputsJson 
                                    }
                                ) 
                            );

                        const files = ( fileUpload[0] as HTMLInputElement ).files;
                        $.each(files, function(index, file)
                        {
                            fd.append("PostedFiles[" + index + "]", file);
                        });

                        const errors: ValidationRow[] = [];

                        application.rble.initializeValidationSummaries();
                        application.rble.finalizeValidationSummaries( false );
                
                        application.ui.triggerEvent( "onUploadStart", fileUpload, fd, application );

                        let errorResponse: JSON;
            
                        $.ajax({
                            url: uploadUrl,  
                            type: 'POST',
                            data: fd,
                            cache: false,
                            contentType: false,
                            processData: false,
                            headers: { "Content-Type": undefined },
                            beforeSend: function( _xhr, settings ) {
                                // Enable jquery to assign 'binary' results so I can grab later.
                                settings[ "responseFields" ][ "binary" ] = "responseBinary";
                            },
                            xhr: function() {
                                var xhr = new XMLHttpRequest();
                                xhr.onreadystatechange = function() {
                                    // https://stackoverflow.com/a/29039823/166231
                                    if (xhr.readyState == 2) {
                                        // We are always returning json (binary/responseBinary) from our endpoints
                                        xhr.responseType = "json";
                                    }
                                };
                                return xhr;
                            }
                        })
                        .then( 
                            function( /* payLoad */ ) {
                                application.ui.triggerEvent( "onUploaded", fileUpload, application );
                            },
                            function( _jqXHR  ) {
                                errorResponse = _jqXHR[ "responseBinary" ];

                                if ( errorResponse != undefined ) {
                                    if ( errorResponse[ "Validations" ] != undefined ) {
                                        errorResponse[ "Validations" ].forEach((v: { [x: string]: string }) => {
                                            errors.push( { "@id": v[ "ID" ], text: v[ "Message" ] });
                                        });
                                    }
                                    else if ( errorResponse[ "ExceptionMessage" ] != undefined && errorResponse[ "Message" ] != undefined ) {
                                        // Just want generic system message I think...
                                        // errors.push( { "@id": "System", text: errorResponse[ "Message" ] });
                                    }
                                }
                        
                                if ( errors.length == 0 ) {
                                    errors.push( { "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
                                }
                            }
                        )
                        .always( function() {
                            // Get file upload control to update its UI (buttons)
                            fileUpload.val("").trigger("change");
                            $(".file-upload .btn", el).removeClass("disabled");
                            $(".file-upload-progress", that.application.element).hide();

                            if ( errors.length > 0 ) {
                                console.group("Unable to upload file: errors");
                                console.log( errors );
                                console.groupEnd();            

                                const errorSummary = $("#" + application.id + "_ModelerValidationTable", application.element);
                                application.rble.processValidationRows( errorSummary, errors );
                                application.rble.finalizeValidationSummaries();

                                application.ui.triggerEvent( "onUploadFailed", fileUpload, errorResponse, application );
                            }
                            else {
                                application.ui.triggerEvent( "onUploadComplete", fileUpload, application );
                            }

                            that.application.hideAjaxBlocker();
                        });
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

        private processTextBoxes( container: JQuery<HTMLElement> ): void {
            const app = this.application;
            const applicationId = app.id;
            const bootstrapVersion = app.bootstrapVersion;
            const isBootstrap3 = bootstrapVersion == 3;
            const isBootstrap4 = bootstrapVersion == 4;
            const isBootstrap5 = bootstrapVersion == 5;
            const builder = this;

            $('[rbl-tid="input-textbox"],[rbl-template-type="katapp-textbox"]', container)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const el = $(this);
                    let input = $("input", el);
                    const id = el.data("inputname");
                    const inputType = el.data("type")?.toLowerCase();
                    const label = el.data("label");
                    const help = el.data("help");
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

                    builder.ensureRblDisplay( el );

                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }
                    if ( formCss !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).removeClass("form-group").addClass(formCss);
                    }

                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
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
                        input.replaceWith($('<textarea name="' + id + '" rows="' + rows + '" id="katapp_' + applicationId + '_' + id + '" class="form-control ' + id + '"></textarea>'))
                        input = $("textarea[name='" + id + "']", el);
                    }

                    if ( !autoComplete || inputType === "password" ) {
                        input.attr("autocomplete", "off");
                    }
                    
                    if ( value !== undefined ) {
                        // Don't use 'input' variable here because some templates are 
                        // 2 column templates and I want all the styling to apply (i.e. Nexgen:PensionEstimate)
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

                            if ( isBootstrap5 ) {
                                // datepicker library looks for element with input-group-addon class to determine if
                                // component is inline or popup, so class shouldn't do anything for styling in bs5, but
                                // need it for date to work the way we want.
                                validatorContainer.append( $("<div class='input-group-addon input-group-text'><i class='fa-light fa-calendar-day'></i></div>") );
                            }
                            else if ( isBootstrap4 ) {
                                validatorContainer.append( $("<div class='input-group-append'><i class='input-group-text fa fa-calendar-day'></i></div>") );
                            }
                            else {
                                validatorContainer.append($("<span class='input-group-addon'><i class='glyphicon glyphicon-calendar'></i></span>"));
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
        
                                        const dateInput = $("input", dp);
        
                                        // Originally, I had an .on("clearDate", ... ) event handler that simply
                                        // called dateInput.change() to trigger a calc.  But clearing input with keyboard
                                        // also triggered this, so if I cleared with keyboard, it triggered change, then when
                                        // I lost focus on input, it triggered 'normal' change event resulting in two calcs.
                                        // So now I attach click on clear button as well and call change still
                                        // so that works, but problem is that input isn't cleared before change event happens
                                        // so I also clear the input myself.
                                        $(".datepicker-days .clear", dp).on("click.ka", function () {
                                            dateInput.val("");
                                            dateInput.change();
                                        });
                                    }
                                })
                                .on("hide", function () {
                                    const dp = $(this);
                                    dp.removeData("datepicker-show");
        
                                    $(".datepicker-days .clear", dp).off("click.ka");
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
                            
                            if ( isBootstrap4 ) {
                                validatorContainer.prepend( $("<div class='input-group-prepend'></div>") );
                                addOnContainer = $(".input-group-prepend", validatorContainer);
                            }
                            
                            const prefixElement = $("<span class='input-group-text'>" + prefix + "</span>");

                            if ( !isBootstrap5 ) {
                                prefixElement.addClass("input-group-addon");
                            }

                            addOnContainer.prepend(prefixElement);
                        }
                        else if ( suffix !== undefined ) {
                            validatorContainer.addClass("input-group");
                            $(".error-msg", validatorContainer).addClass("addon-suffix"); // css aid

                            let addOnContainer = validatorContainer;
                            
                            if ( isBootstrap4 ) {
                                validatorContainer.append( $("<div class='input-group-prepend'></div>") );
                                addOnContainer = $(".input-group-prepend", validatorContainer);
                            }
                            
                            const suffixElement = $("<span class='input-group-text'>" + suffix + "</span>");

                            if ( !isBootstrap5 ) {
                                suffixElement.addClass("input-group-addon");
                            }

                            addOnContainer.append( suffixElement );
                        }
                    }
                    else {
                        input.css("display", "none");
                        $("div." + id + "DisplayOnly", el).html(value);
                    }

                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processListControls( container: JQuery<HTMLElement> ): void {
            const that = this;

            $('[rbl-tid="input-radiobuttonlist"],[rbl-template-type="radiobuttonlist"],[rbl-tid="input-checkboxlist"],[rbl-template-type="checkboxlist"]', container)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each( function() {
                    const el = $(this);

                    // Do all data-* attributes that we support
                    const id = el.data("inputname");
                    const label = el.data("label");
                    const help = el.data("help");
                    const horizontal = el.data("horizontal") ?? false;
                    const hideLabel = el.data("hidelabel") ?? false;
                    const lookuptable = el.data("lookuptable");
                    const css = el.data("css");
                    const formCss = el.data("formcss");
                    const listContainer = $("." + id, el);
                                    
                    that.ensureRblDisplay( el );

                    // To make it easier during RBL processing to determine what to do
                    listContainer.attr("data-horizontal", horizontal);

                    if ( horizontal ) {
                        listContainer.addClass("form-group");
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
                    
                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
                    }

                    if ( lookuptable !== undefined ) {
                        const options =
                            $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem", that.application.element)
                                .map( ( index, ti ) => ({ Value: ti.getAttribute("key"), Text: ti.getAttribute( "name"), Help: undefined, Selected: index == 0, Visible: true, Disabled: false }));

                        that.application.ui.processListItems(listContainer, false, options.toArray());
                    }
            
                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processDropdowns( container: JQuery<HTMLElement> ): void {
            const dropdowns = 
                $('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', container)
                    .not("rbl-template *") // not in templates
                    .not('[data-katapp-initialized="true"]');

            const selectPickerAvailable = typeof $.fn.selectpicker === "function";
            const that = this;

            if ( !selectPickerAvailable && dropdowns.length > 0 ) {
                this.application.trace("bootstrap-select javascript is not present", TraceVerbosity.None);
            }

            dropdowns
                .each( function() {
                    const el = $(this);
                    const input = $(".form-control", el);
                    const id = el.data("inputname");
                    const label = el.data("label");
                    const hideLabel = el.data("hidelabel") ?? false;
                    const help = el.data("help");
                    const multiSelect = el.data("multiselect") ?? false;
                    const liveSearch = el.data("livesearch") ?? true;
                    const size = el.data("size") ?? "15";
                    const lookuptable = el.data("lookuptable");
                    const css = el.data("css");

                    that.ensureRblDisplay( el );

                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }

                    if ( hideLabel ) {
                        $("label", el).remove();                    
                    }
                    else if ( label !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }
                    
                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
                    }

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
                            $("rbl-template[tid='lookup-tables'] DataTable[id='" + lookuptable + "'] TableItem", that.application.element)
                                .map( ( index, r ) => ({ Value:  r.getAttribute("key"), Text: r.getAttribute( "name"), Class: undefined, Subtext: undefined, Html: undefined, Selected: index === 0, Visible: true }))
                                .toArray()
                        );
                    }

                    // Merge all other data-* attributes they might want to pass through to bootstrap-select
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

        private processSliders( container: JQuery<HTMLElement> ): void {
            const builder = this;

            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            $('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', container)
                .not("rbl-template *") // not in templates
                .not('[data-katapp-initialized="true"]')
                .each( function() {
                    const el = $(this);

                    const id = el.data("inputname");
                    const label = el.data("label");
                    const css = el.data("css");
                    const help = el.data("help");
                    const value = el.data("value");
                            
                    builder.ensureRblDisplay( el );

                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }
    
                    if ( label !== undefined ) {
                        $("span[rbl-value='l" + id + "']", el).html(label);
                    }

                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
                    }    

                    if ( value !== undefined ) {
                        $("input[name='" + id + "']", el).val(value);
                    }
    
                    el.attr("data-katapp-initialized", "true");
                });
        }
    }

    $.fn.KatApp.reset = function(): void {
        // Search for comment near - KatApp[ "ping" ]
        // KatApp[ "ping" ] = $.fn.KatApp.ping;

        // This is deleted each time the 'real' Provider js runs, so rebuild it
        $.fn.KatApp.plugInShims = [];
        $.fn.KatApp.applications = [];
        // reset factory to shim factory
        $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory;
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
        // For now, leave inputs to pass assigned to what it was
        // $.fn.KatApp.inputsToPassOnNavigate = undefined;

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
                const valueType = typeof json[propertyName];

                // If class/width/other RBLe custom columns were used, their values
                // would be assigned as attributes, so a #text property on the object would
                // exist, and that is probably what they want.
                let jsonValue = valueType == "object" 
                    ? json[propertyName][ "#text" ] ?? json[propertyName]
                    : json[propertyName];
                
                // https://stackoverflow.com/a/6024772/166231 - first attempt
                // https://stackoverflow.com/a/13418900/166231
                if ( typeof jsonValue == "string") {
                    jsonValue = jsonValue.replace(new RegExp('\\$', 'gm'),'$$$$');
                }

                that = that.replace(re, jsonValue)

                // If I didn't want to hard code the $0 check, this answer suggested using a function, but I didn't want the overhead
                // https://stackoverflow.com/a/6024692/166231
                // that = that.replace(re, function() { return json[propertyName]; });
            }
        }
        // const leftOverTokens = new RegExp('\{\S*\}', 'gm');
        // return that.replace(leftOverTokens, "").replace("_", "_");
        
        // don't know why I have this replace in here
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
    if (!Array.prototype.find) {
        Object.defineProperty(Array.prototype, 'find', {
            value: function (predicate: any) {
                // 1. Let O be ? ToObject(this value).
                if (this == null) {
                    throw TypeError('"this" is null or not defined');
                }

                var o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, "length")).
                var len = o.length >>> 0;

                // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                if (typeof predicate !== 'function') {
                    throw TypeError('predicate must be a function');
                }

                // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                var thisArg = arguments[1];

                // 5. Let k be 0.
                var k = 0;

                // 6. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                    // d. If testResult is true, return kValue.
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return kValue;
                    }
                    // e. Increase k by 1.
                    k++;
                }

                // 7. Return undefined.
                return undefined;
            },
            configurable: true,
            writable: true
        });
    }

    $.whenAllDone = function ( deferredParams: Deferred[] ): Deferred {
		// Update, made this more like Promises.allSettled
        // Understanding promises
		//	https://www.taniarascia.com/how-to-promisify-an-ajax-call/
		//	https://blackninjadojo.com/javascript/2019/02/27/using-jquery-promises-and-deferreds.html
		// whenAllDone - https://stackoverflow.com/a/15094263/166231 - current implementation
		// whenAll - https://stackoverflow.com/a/7881733/166231 - another implementation I might want to look at

        const deferreds: Deferred[] = [];
        const result = $.Deferred();

        // arguments - all the deferreds passed in to whenAllDone call
        $.each(deferredParams, function (i, current) {
            const currentDeferred = $.Deferred();
            current.then(function (...args) {
                currentDeferred.resolve(true, args);
            }, function (...args) {
                currentDeferred.resolve(false, args);
            });
            deferreds.push(currentDeferred);
        });

        const jqueryWhenUsesSubordinate = deferreds.length == 1;
        
        // call when on each deferred in the deferreds array, and it is always
        // going to be a .then because the deferred items in the array always
        // calls resolve (instead of reject) and passes true/false for status of failure
        $.when.apply($, deferreds).then(function (...args) {
            const settled: PromiseStatus[] = [];
            
            // arguments - the arguments passed on resolve/reject calls on any deferred items passed to whenAllDone
            // Hack to deal with jquery.when: function( subordinate /* , ..., subordinateN */ ) { ...
            // It has a line like: 
            //
            //  // If resolveValues consist of only a single Deferred, just use that.
            //  deferred = remaining === 1 ? subordinate : jQuery.Deferred(),
            //
            // And this changes the shape of the arguments, so I had to put it back to common state regardless of how many
            // deferred objects were passed in.
            const deferredArgs = jqueryWhenUsesSubordinate
                ? [[ args[ 0 ], args[ 1 ] ]]
                : args
            
            $.each(deferredArgs, function (i, resolvedArgs) {
                // If we resolved with `true` as the first parameter, it is success, otherwise failure
                const status = !resolvedArgs[ 0 ] ? "rejected" : "fulfilled";
                // Push either all arguments or the only one
                const data = resolvedArgs[1].length === 1 ? resolvedArgs[1][0] : resolvedArgs[1];
                const reason = !resolvedArgs[ 0 ] ? data : undefined;
                const result = resolvedArgs[ 0 ] ? data : undefined;
                settled.push( { status: status, reason: reason, value: result } );
            });

            return result.resolve.apply(result, settled);
        });

        return result;
    }

    // Overwrite the implementation of getResources with latest version so that it can support
    // improvements made (i.e. checking local web server first), store copy of original function
    // from katapp.js so that if they call reset() I can restore that and not run functions in
    // this file that is going to be re-injected into debug page
    //
    // KatApp.js is updated everywhere so not needed, but leaving this line in for example of how this is
    // handled in case I need to do it in the future again.
    // $.fn.KatApp.ping = $.fn.KatApp.ping ?? KatApp[ "ping" ];
    //
    // KatApp[ "ping" ] = function( url: string, callback: ( responded: boolean, error?: string | Event )=> void ): void {
    //  ...
    // }

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
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
    
        const currentInputsJson = sessionStorage.getItem("katapp:tempData:defaultInputs");
        const currentInputs: inputsToPassOnNavigate = currentInputsJson != undefined 
            ? JSON.parse( currentInputsJson ) 
            : { Applications: [] };
        $.fn.KatApp.inputsToPassOnNavigate = currentInputs;
        sessionStorage.removeItem("katapp:tempData:defaultInputs");

        $.fn.KatApp.templateOn = function( templateName: string, events: string, fn: TemplateOnDelegate ): void {
            $.fn.KatApp.templateDelegates.push( { Template: templateName.ensureGlobalPrefix(), Delegate: fn, Events: events } );
            KatApp.trace( undefined, "Template event(s) [" + events + "] registered for [" + templateName + "]", TraceVerbosity.Normal );
        };
    }

    ( $.fn.KatApp.plugInShims as KatAppPlugInShimInterface[] ).forEach( a => { 
        $.fn.KatApp.applicationFactory( a.id, a.element, a.options );
    });

    // Destroy plugInShims
    delete $.fn.KatApp.plugInShims;
})(jQuery, window, document);
// https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript()
//# sourceURL=DataLocker\Global\KatAppProvider.js