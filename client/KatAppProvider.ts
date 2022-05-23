const providerVersion = 9.02; // eslint-disable-line @typescript-eslint/no-unused-vars
// Hack to get bootstrap modals in bs5 working without having to bring in the types from bs5.
// If I brought in types of bs5, I had more compile errors that I didn't want to battle yet.
declare const bootstrap: any; // eslint-disable-line @typescript-eslint/no-explicit-any

KatApp.trace(undefined, "KatAppProvider library code injecting...", TraceVerbosity.Detailed);

// Need this function format to allow for me to reload script over and over (during debugging/rebuilding)
(function($, window, document, undefined?: undefined): void {
    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    // Inputs NOT passed to RBLe
    const inputsToIgnoreSelector = "[data-itemtype='checkbox'] :input, .notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, [type='search']" + tableInputsAndBootstrapButtons;
    // Inputs that do not trigger calculations
    const skipBindingInputSelector = ".notRBLe, .notRBLe :input, .rbl-exclude, .rbl-exclude :input, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input, [type='search']" + tableInputsAndBootstrapButtons;

    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend(
        {
            debug: {
                traceVerbosity: TraceVerbosity.None,
                saveConfigureUiCalculationLocation: KatApp.pageParameters[ "saveConfigureUI" ],
                useTestCalcEngine: KatApp.pageParameters[ "test" ] === "1",
                refreshCalcEngine: KatApp.pageParameters[ "expirece" ] === "1",
                showInspector: KatApp.pageParameters[ "showinspector" ] === "1"
                // Set in KatApp.ts
                // useTestView: KatApp.pageParameters[ "testview"] === "1",
                // useTestPlugin: KatApp.pageParameters[ "testplugin"] === "1",
            },
            shareDataWithOtherApplications: true,
            functionUrl: KatApp.functionUrl,
            sessionUrl: KatApp.sessionUrl,
            inputSelector: "input, textarea, select",
            runConfigureUICalculation: true,
            ajaxLoaderSelector: ".ajaxloader",
                 
            onCalculateStart: function( application: KatAppPlugIn ) {
                application.showAjaxBlocker();

                const inputSelector = application.element.data("katapp-input-selector");
                if ( inputSelector !== undefined ) {
                    application.select("div[data-slider-type='nouislider'], " + inputSelector)
                        .not(skipBindingInputSelector + ", :disabled")
                        .attr("disabled", "disabled")
                        .attr("kat-disabled", "true");

                    if ( typeof $.fn.selectpicker === "function" ) {
                        application.select("select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").selectpicker("refresh");
                    }
                }
            },
            onCalculateEnd: function( application: KatAppPlugIn ) {
                application.select(".needsRBLeConfig").removeClass("needsRBLeConfig");
                application.hideAjaxBlocker();

                if ( typeof $.fn.selectpicker === "function" ) {
                    application.select("select[data-kat-bootstrap-select-initialized='true'][kat-disabled='true']").removeAttr("disabled").selectpicker("refresh");
                }
                application.select( "[kat-disabled='true']").removeAttr("disabled kat-disabled");
            },

            // Default to just an empty (non-data) package
            getData: function( application: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, _fail: JQueryFailCallback ): void { // eslint-disable-line @typescript-eslint/no-unused-vars
                done( {
                    AuthID: "Empty",
                    Client: options.view ?? "Empty",
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
        applicationIsInvalid = false;
        inputsHaveBeenCached = false;

        endpointRBLeInputsCache = {};

        displayId: string;
        exception?: RBLeServiceResults | undefined;
        results?: TabDef[] | undefined;
        calculationInputs?: CalculationInputs | undefined;
        
        constructor(id: string, element: JQuery, options: KatAppOptions) {
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
    
        dataAttributesToJson( container: JQuery, attributePrefix: string ): object | undefined {
            const attributeNames = 
                [].slice.call(container.get(0).attributes).filter(function(attr: Attr) {
                    return attr && attr.name && attr.name.indexOf(attributePrefix) === 0
                }).map( function( a: Attr ) { return a.name; } );

            const json = {};
            let hasValues = false;
            const convertToCalcEngineNames = attributePrefix == "data-input-";
            const convertToVariableNames = convertToCalcEngineNames || attributePrefix == "data-param-";

            attributeNames.forEach( a => {
                const value = container.attr(a);

                if ( value !== undefined ) {
                    let inputName = a.substring(attributePrefix.length);
                    
                    if ( convertToVariableNames ) {
                        const inputNameParts = inputName.split("-");
                        inputName = convertToCalcEngineNames ? "i" : "";
                        inputNameParts.forEach( n => {
                            inputName += ( ( convertToCalcEngineNames ? n[ 0 ].toUpperCase() : n[ 0 ] ) + n.slice(1) );
                        });
                    }

                    hasValues = true;
                    json[ inputName ] = value;
                }
            });
            return hasValues ? json : undefined;
        } 

        isResourceTemplateLoaded( resourceName: string ): boolean {
            return resourceName.toLowerCase() in $.fn.KatApp.resourceTemplates;
        }
        removeResourceApplications( applicationsToRemove: { View: string | undefined, ID: string | undefined }[] ): void {
            // TODO: FYI, if any of these applications loaded template files, they are not removed, so if file is updated, KatApp
            // will not reflect these updates until page refresh.
            applicationsToRemove.forEach( a => {
                const viewName = a.View;
                if ( viewName != undefined ) {
                    delete $.fn.KatApp.resourceTemplates[ viewName.toLowerCase() ];
                }
            });

            const inlineTemplates = this.getResourceTemplate( "_INLINE" );

            if ( inlineTemplates != undefined ) {
                Object.keys(inlineTemplates.Templates).forEach( key => {
                    const inlineTemplate = inlineTemplates.Templates[ key ];
                    applicationsToRemove.forEach( a => {
                        const viewName = a.View;
                        if ( viewName != undefined ) {
                            if ( inlineTemplate.ContainerName == viewName.toLowerCase() ) {
                                delete inlineTemplates.Templates[ key ];
                            }
                        }
                    });
                });   
            }

            // Loop remaining 'template file' resources and if any templates have been
            // injected by the application to remove, remove reference so that next/first time 
            // script/style elements will be included
            // UPDATE: This is actually obsolete in a way...applications will always have new IDs
            //          so the next time item a template is used by a new modal/nested application
            //          the ID will never exist
            if ( applicationsToRemove.filter( a => a.ID != undefined ).length > 0 ) {
                Object.keys($.fn.KatApp.resourceTemplates).forEach( keyFile => {
                    if ( keyFile != "_INLINE".toLowerCase() ) {
                        const resourceTemplates = $.fn.KatApp.resourceTemplates[ keyFile ].Templates;
                        Object.keys(resourceTemplates).forEach( keyTemplate => {
                            const template = resourceTemplates[ keyTemplate ];
                            applicationsToRemove.forEach( a => {
                                const applicationId = a.ID;
                                if ( applicationId != undefined ) {
                                    delete template.ApplicationsInjected[ applicationId ];
                                }
                            });
                        });
                    }
                });
            }
        }
        getResourceTemplate( resourceName: string ): TemplateFile | undefined {
            return this.isResourceTemplateLoaded( resourceName )
                ? $.fn.KatApp.resourceTemplates[ resourceName.toLowerCase() ]
                : undefined;
        }
        getResourceTemplateItem( resourceName: string, templateId: string ): Template | undefined {
            var templateFile = this.isResourceTemplateLoaded( resourceName )
                ? $.fn.KatApp.resourceTemplates[ resourceName.toLowerCase() ]
                : undefined;

            return templateFile != undefined && templateId in templateFile.Templates
                ? templateFile.Templates[ templateId ]
                : undefined;
        }
        createResourceTemplate( resourceName: string, requested: boolean = false ): TemplateFile {
            return $.fn.KatApp.resourceTemplates[ resourceName.toLowerCase() ] = { Name: resourceName.toLowerCase(), Requested: requested, Callbacks: [], Templates: { } };
        }

        private init( options: KatAppOptions ): void {
            // MULTIPLE CE: Need to support nested config element of multiple calc engines I guess
            //              Problem.. if passed in options has calcEngine(s) specified or if there is config
            //              specified on this.element, how do match those up to what could be possibly multiple
            //              CalcEngines defined in view

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
                viewTemplates: this.element.attr("rbl-view-templates"),
                inputCaching: this.element.attr("rbl-input-caching") != undefined ? this.element.attr("rbl-input-caching") == "true" : undefined
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
            
            this.element.attr("rbl-application-id", this.id);
            this.element.addClass("katapp-" + this.id);

            this.trace( "Started init", TraceVerbosity.Detailed );
            const pipeline: Array<()=> void> = [];
            const pipelineNames: Array<string> = [];
            let pipelineIndex = 0;

            const that: KatAppPlugIn = this;

            const initPipeline = function( offset: number ): void {
                that.processPipeline( pipeline, pipelineNames, pipelineIndex += ( offset + 1 ), offset );
            };

            let pipelineError: string | undefined = undefined;

            const useTestView = that.options.debug?.useTestView ?? false;
            const functionUrl = that.options.functionUrl;
                            
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
                        2. Register callbacks that will be called when template is ready. Each callback...
                            a. If error occurred on any previous template callback, exit function doing nothing
                            b. If not waiting for any more templates, continue to next pipeline
                            c. If waiting for more, set flag and continue to wait
                    b. For any required templates *not* already requested *or* downloaded...
                        1. Initialize the _templateFilesUsedByAllApps variable for template so other apps know it is requested
                        2. Get templates (will release flow control when ajax.get() called)
                            When templates are returned...
                                a. If error, set pipelineError, call all template callbacks (of other apps) signalling error, and jump to finish
                                b. If no error
                                    1. If not waiting for other templates, continue to next pipeline
                                    2. If waiting for other templates, exit function, the template delegates will move pipeline along
                3. Inject templates ...
                    a. For all templates downloaded by *this* application...
                        1. Inject the template into markup
                        2. Set the _templateFilesUsedByAllApps.data property
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

            let viewElement: JQuery<HTMLElement> | undefined = undefined;

            const viewName = that.options.view!;
            const viewCurrentlyLoaded = this.isResourceTemplateLoaded( viewName );

            if ( viewCurrentlyLoaded ) {
                // Don't know ID of previous application, so just remove things associated with view.
                // This scenario happens when a page has a nested app that keeps getting re-initalized
                // to one of a set of applications and they may cycle back to showing one that was previously
                // shown.
                this.removeResourceApplications([ { View: viewName, ID: undefined } ] );
            }

            const viewTemplates = this.createResourceTemplate( viewName );
            const inlineTemplates = this.isResourceTemplateLoaded( "_INLINE" )
                ? this.getResourceTemplate( "_INLINE" )!
                : this.createResourceTemplate( "_INLINE" );

            const processResourceTemplates = function(resource: JQuery<HTMLElement>, templateFile: TemplateFile ): void {
                const convertInlineTemplateToStandardTemplate = function(inlineTemplate: JQuery<HTMLElement>): void {
                    const inlineParent = inlineTemplate.parent();
                    const templateType = inlineTemplate.attr("rbl-tid")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    const templateIdAttribute = templateType == "inline"
                        ? "rbl-tid"
                        : "rbl-empty-tid";

                    if ( inlineParent.attr("rbl-source") == undefined ) {
                        inlineTemplate.attr(templateIdAttribute, "inline-no-rbl-source");
                        that.trace( templateType + " template's parent does not have rbl-source. " + inlineTemplate[0].outerHTML.substr(0, 75).replace( /</g, "&lt;").replace( />/g, "&gt;"), TraceVerbosity.None);
                    }
                    else if ( inlineParent.attr("rbl-tid") != undefined ) {
                        inlineTemplate.attr(templateIdAttribute, "inline-parent-has-template-already");
                        that.trace( templateType + " template is present, but parent has rbl-tid of " + inlineParent.attr("rbl-tid"), TraceVerbosity.None);
                    }
                    else {
                        const tId = "_t_" + KatApp.generateId();

                        // remove 'inline' or 'empty'
                        inlineTemplate.removeAttr("rbl-tid");

                        // if inline template is calling another template, add rbl-tid
                        // attribute to be called when template is generated/processed
                        const inlineTemplateId = inlineTemplate.attr("rbl-inline-tid");
                        if ( inlineTemplateId != undefined ) {
                            inlineTemplate.attr("rbl-tid", inlineTemplateId);
                            inlineTemplate.removeAttr("rbl-inline-tid");
                        }

                        inlineTemplates.Templates[ tId ] = { Name: tId, Content: inlineTemplate, ApplicationsInjected: {}, ContainerName: templateFile.Name };
                        inlineParent.attr( templateIdAttribute, tId );
                        inlineTemplate.remove(); // Remove original template markup from view
                    }
                };

                $("[rbl-tid='empty']", resource).each(function() {
                    convertInlineTemplateToStandardTemplate($(this));
                });
                
                let inlineTemplatesToProcess: JQuery<HTMLElement>;

                // Get all lowest level inlines and walk 'up'
                while( ( inlineTemplatesToProcess = $("[rbl-tid='inline']", resource).filter( function() { return $("[rbl-tid='inline']", this).length == 0; } ) ).length > 0 )
                {
                    inlineTemplatesToProcess.each(function() {
                        convertInlineTemplateToStandardTemplate($(this));
                    });
                }

                $("rbl-template", resource).each( function ( i, t ) {
                    const template = $(t);
                    const tId = template.attr("tid")!;
                    templateFile.Templates[ tId ] = { Name: tId, Content: template, ApplicationsInjected: {} };
                    template.remove();
                });
            };
            
            const extendDefaultInputs = function(): void {
                const hasInputCaching = that.options.inputCaching;
                const applicationNavigationInputs = that.getNavigationInputs();
                const hasNavigationInputs = 
                    $.fn.KatApp.navigationInputs != undefined || applicationNavigationInputs != undefined;
    
                if ( hasInputCaching ) {
                    that.options.defaultInputs = that.options.defaultInputs ?? {};
                    const defaultInputs = that.options.defaultInputs;
    
                    const inputCachingKey = "katapp:cachedInputs:" + that.options.currentPage + ":" + ( that.options.userIdHash ?? "EveryOne" );
                    const cachedInputsJson = sessionStorage.getItem(inputCachingKey);
                    const cachedInputs = cachedInputsJson != undefined && cachedInputsJson != null 
                        ? JSON.parse( cachedInputsJson ) 
                        : {};
                    
                    KatApp.extend(defaultInputs, cachedInputs);
                }    
                if ( hasNavigationInputs ) {
                    that.options.manualInputs = that.options.manualInputs ?? {};
                    const manualInputs = that.options.manualInputs;
    
                    KatApp.extend(manualInputs, $.fn.KatApp.navigationInputs, applicationNavigationInputs);
                }    
            }

            // Made all pipeline functions variables just so that I could search on name better instead of 
            // simply a delegate added to the pipeline array.
            const loadView = function(): void { 
                const viewId = viewName.ensureGlobalPrefix(); 

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
                                    .replace( /thisClass/g, thisClassCss )
                                    .replace(/<rbl-template[\S\s]*?<\/rbl-template>/g, function( match ) {
                                        // Only massage items inside templates, nothing else in view is touched
                                        return that.ui.encodeTemplateContent(match);
                                    });
                                    
                            viewElement = $("<div class='katapp-css'>" + content + "</div>");

                            processResourceTemplates(viewElement, viewTemplates);

                            // Not sure if I need to manually add script or if ie will load them
                            // https://www.danielcrabtree.com/blog/25/gotchas-with-dynamically-adding-script-tags-to-html
                            // IE is not loading scripts of my test harness at the moment
                            // const scripts = $("script", view);
                            // $("script", view).remove();
                            // alert(scripts.length);

                            const rblConfig = $("rbl-config", viewElement).first();
                            const viewCalcEngines: CalcEngine[] = [];

                            if ( rblConfig.length !== 1 ) {
                                that.trace("View " + viewId + " is missing rbl-config element", TraceVerbosity.Quiet);
                            }
                            else {
                                const attrCalcEngine = rblConfig.attr("calcengine");
                                
                                extendDefaultInputs();

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
                                            key: ce.attr("key") ?? "default",
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
                                        // unique templates only (in case global options specified templates)
                                        .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i );
                            }
                            that.trace("View needs templates: " + requiredTemplates.join( "," ), TraceVerbosity.Detailed);
                            
                            // Don't insert viewElement here...wait until templates are injected so if any styling is needed, it'll be ready/loaded for view
                            initPipeline( 0 );
                        }
                        else {
                            pipelineError = errorMessage;
                            initPipeline( 2 ); // jump to finish
                        }
                    }
                );
            };

            const loadTemplates = function(): void { 
                // Total number of resources already requested that I have to wait for
                let otherResourcesNeeded = 0;

                // Array of items this app will fetch that is *NOT* already requested for download or finished
                const toFetch = requiredTemplates.filter( r => {
                    if ( !that.isResourceTemplateLoaded( r ) ) return true;
                    var template = that.getResourceTemplate( r );
                    return template != undefined && !template.Requested && template.Data === undefined;
                } );
                const toWait = requiredTemplates.filter( r => {
                    if ( !that.isResourceTemplateLoaded( r ) ) return false;
                    var template = that.getResourceTemplate( r );
                    return template != undefined && template.Requested;
                 } );

                // Need the following allFetchedIsComplete flag due to following scenario:
                // 1. KatAppA already requested Template1 that KatAppB need. So KatAppB adds a callback to be notified when Template1 is done
                // 2. KatAppB starts download of Template2...(results would be put into resourceResults when done)
                // 3. KatAppA Template1 finishes and notifies KatAppB via callback
                // 4. KatAppB decrements otherResourcesNeeded and since it was then 0, it calls injectTemplates() (Template2 is still downloading)
                // 5. However, since Template2 didn't finish in time, it was never put into resourceResults, so injectTemplates() for KatAppB does nothing (skipping Template2)
                let allFetchedIsComplete = toFetch.length == 0;

                // For every template this app is fetching, add it to the fetch list and set the state to 'requesting'
                toFetch.forEach( function( r ) {
                    that.createResourceTemplate( r, true );
                });

                // For all templates that are already being fetched, create a callback to move on when 
                // not waiting for any more resources 
                toWait.forEach( function( r ) {
                    otherResourcesNeeded++;
                    that.trace("Need to wait for already requested template: " + r, TraceVerbosity.Detailed);
                    that.getResourceTemplate( r )!.Callbacks.push(
                        function( errorMessage ) {
                            that.trace("Template: " + r + " is now ready", TraceVerbosity.Detailed);

                            // only process (moving to finish or next step) if not already assigned an error
                            // from templates that were requested directly from current KatApp
                            if ( pipelineError !== undefined ) return;

                            if ( errorMessage !== undefined ) {
                                that.trace("Template " + r + " error: " + errorMessage, TraceVerbosity.Quiet );
                                pipelineError = errorMessage;
                                initPipeline( 1 ); // jump to finish
                                return;
                            }

                            otherResourcesNeeded--;

                            if ( allFetchedIsComplete && otherResourcesNeeded === 0 ) {
                                that.trace("No more templates needed, process 'inject templates' pipeline", TraceVerbosity.Diagnostic);
                                initPipeline( 0 ); // move to next step if not waiting for anything else
                            }
                            else if ( !allFetchedIsComplete ) {
                                that.trace("Waiting for toFetch to complete", TraceVerbosity.Diagnostic);
                            }
                            else {
                                that.trace("Waiting for " + otherResourcesNeeded + " more templates", TraceVerbosity.Diagnostic);
                            }
                        }
                    );
                });

                if ( toFetch.length > 0 ) {

                    const toFetchList = toFetch.join(",");
                    const debugResourcesDomain = that.options.debug?.debugResourcesDomain;

                    that.trace("Downloading " + toFetchList, TraceVerbosity.Detailed );
                    that.trace("debugResourcesDomain: " + debugResourcesDomain, TraceVerbosity.Diagnostic );
                    that.trace("functionUrl: " + functionUrl, TraceVerbosity.Diagnostic );
                    
                    KatApp.getResources( that, toFetchList, useTestView, false, debugResourcesDomain,
                        ( errorMessage, data ) => {                                
                            allFetchedIsComplete = true;

                            if ( errorMessage === undefined ) {
                                resourceResults = data as ResourceResults;
                                that.trace(toFetchList + " returned from CMS", TraceVerbosity.Normal);
                                
                                // Only move on if not waiting on any more resources from other apps
                                if ( otherResourcesNeeded === 0 ) {
                                    that.trace("No more templates needed, process 'inject templates' pipeline", TraceVerbosity.Diagnostic);
                                    initPipeline( 0 );
                                }
                                else {
                                    that.trace("Can't move to next step because waiting on " + otherResourcesNeeded + " more templates", TraceVerbosity.Diagnostic);
                                }
                            }
                            else {
                                toFetch.forEach( r => {
                                    // call all registered callbacks from other apps
                                    let currentCallback: ( ( errorMessage: string )=> void ) | undefined = undefined;
                                    const template = that.getResourceTemplate( r )!;
                                    while( ( currentCallback = template.Callbacks.pop() ) !== undefined )
                                    {
                                        that.trace("Calling error message callback on " + r + ": " + errorMessage, TraceVerbosity.Diagnostic);
                                        currentCallback( errorMessage );
                                    }
                                    template.Requested = false; // remove it so someone else might try to download again
                                });

                                that.trace("Downloading " + toFetchList + " from " + ( debugResourcesDomain ?? functionUrl ) + " failed.  Jumping to finish.", TraceVerbosity.Diagnostic );
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
                    Object.keys(resourceResults).forEach( r => {
                        const data = resourceResults![ r ]; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        const templateContent = $("<rbl-resource rbl-t='" + r.toLowerCase() + "'>" + that.ui.encodeTemplateContent(data.replace( /{thisTemplate}/g, r )) + "</rbl-resource>");
                        const resourceTemplates = that.getResourceTemplate( r )!;

                        processResourceTemplates(templateContent, resourceTemplates);

                        if ( templateContent.children().length > 0 ) {
                            templateContent.appendTo($("rbl-katapps"));
                        }

                        that.trace( r + " processed successfully", TraceVerbosity.Normal );

                        // Should only ever get template results for templates that I can request
                        resourceTemplates.Data = data;
                        resourceTemplates.Requested = false;

                        // Call all registered callbacks from other apps
                        let currentCallback: ( ( errorMessage: string | undefined )=> void ) | undefined = undefined;
                        while( ( currentCallback = resourceTemplates.Callbacks.pop() ) !== undefined )
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
                        that.ui.triggerEvent( "onInitializing", that, that.options );
                    }

                    // Update options.viewTemplates just in case someone is looking at them
                    that.options.viewTemplates = requiredTemplates.join( "," );

                    const showInspector = that.options.debug?.showInspector ?? false;

                    that.ui.injectTemplatesWithoutSource(that.element, showInspector);                        

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
                    else if ( that.options.manualResults != undefined && ( that.options.calcEngines == null || that.options.calcEngines.length == 0 ) ) {
                        // If there are calcEngines, but view has configureUI turned off, don't want to process
                        // this yet.
                        that.results = that.buildResults( [], that.options );
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

        setRegisteredToken( token: string ): void {
            this.options.registeredToken = token;

            if ( this.options.shareDataWithOtherApplications ?? false ) {
                const _sharedData = $.fn.KatApp.sharedData;
                _sharedData.registeredToken = token;
                this.options._sharedDataLastRequested = _sharedData.lastRequested = Date.now();                
            }
        }

        closest(element: JQuery | HTMLElement, selector: string): JQuery {
            const context = element != undefined && !(element instanceof jQuery)
                ? $(element)
                : element as JQuery;

            const c = context.closest( selector );
            const cAppId = c.attr("rbl-application-id") || c.closest("[rbl-application-id]").attr("rbl-application-id");

            return cAppId == this.id
                ? c
                : $();
        }

        select(selector: string, context?: JQuery | HTMLElement): JQuery {
            const container = context != undefined && !(context instanceof jQuery)
                ? $(context)
                : context as JQuery ?? this.element;
            
            var appId = context == undefined
                ? this.id
                : container.attr("rbl-application-id") || container.closest("[rbl-application-id]").attr("rbl-application-id");

            return $(selector, container).filter(
                function(index) {
                    return $(this).closest("[rbl-application-id]").attr("rbl-application-id") == appId;
                }
            );
        }

        destroy(): void {
            this.unregister();
            this.ui.triggerEvent( "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        rebuild( options: KatAppOptions ): void {
            this.unregister();
            this.init( KatApp.extend({}, this.options, options) );
        }

        // This was needed for 'redraw' method which simply wants to 'restart' the load
        // of the view and use last 'calculation' to re-render (it is a method for UI developers)
        // I couldn't use destroy because it deleted the KatApp and only the KatAppPlugIn 'sets' that
        // so then KatApp was undefined.
        private unregister(): void {
            this.options.nextCalculation = undefined;
            // view will be removed, so don't need this
            // this.select('[data-katapp-initialized]').removeAttr("data-katapp-initialized");
            // this.select('[data-katapp-template-injected]').removeAttr("data-katapp-template-injected");            
            // this.ui.unbindCalculationInputs();
            this.element.off(".RBLe"); // remove all KatApp handlers
            this.element.removeAttr("rbl-application-id");
            this.element.removeClass("katapp-" + this.id);
            $(this.element).empty();
        }

        pushNotification(name: string, information: {} | undefined): void {
            this.ui.pushNotification(this, name, information);
        }

        runRBLeCommand(commandName: string): void {
            // Debugging helper
            const that = this;

            const logSuccess = function( result: RBLeServiceResults ): void { 
                if ( result.payload !== undefined ) {
                    result = JSON.parse(result.payload);
                }

                console.log( JSON.stringify( result ) ); 
            };
            const logError = function(xhr: JQuery.jqXHR ): void { 
                console.log( "Error: " + xhr.status + ", " + xhr.statusText ); 
            };
            const data = {
                "Command": commandName, 
                "Token": that.options.registeredToken! // eslint-disable-line @typescript-eslint/no-non-null-assertion
            };

            if ( that.options.submitCalculation != null ) {
                that.options.submitCalculation( that, data, logSuccess, logError );
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

        navigate( navigationId: string, persistInputs?: boolean, defaultInputs?: {} | undefined ): void {
            if ( defaultInputs != undefined ) {
                this.setNavigationInputs( defaultInputs, navigationId, persistInputs ?? true );
            }

            this.ui.triggerEvent( "onKatAppNavigate", navigationId, this );
        }

        setNavigationInputs( inputs: {} | undefined, navigationId?: string, persist?: boolean, inputSelector?: string ): void {
            const inputsToPass = inputs ?? this.getInputsBySelector( inputSelector ) ?? {};

            const cachingKey = 
                navigationId == undefined // global
                    ? undefined
                    : persist
                        ? "katapp:navigationInputs:" + navigationId + ":" + ( this.options.userIdHash ?? "Everyone" )
                        : "katapp:navigationInputs:" + navigationId;

            KatApp.setNavigationInputs( inputsToPass, cachingKey );
        }
        getNavigationInputs(): {} | undefined {
            const oneTimeInputsKey = "katapp:navigationInputs:" + this.options.currentPage;
            const oneTimeInputsJson = sessionStorage.getItem(oneTimeInputsKey);
            const oneTimeInputs = oneTimeInputsJson != undefined ? JSON.parse( oneTimeInputsJson ) : undefined ;
            sessionStorage.removeItem(oneTimeInputsKey);

            const persistedInputsKey = "katapp:navigationInputs:" + this.options.currentPage + ":" + ( this.options.userIdHash ?? "Everyone" );
            const persistedInputsJson = sessionStorage.getItem(persistedInputsKey);
            const persistedInputs = persistedInputsJson != undefined ? JSON.parse( persistedInputsJson ) : undefined ;

            return oneTimeInputs == undefined && persistedInputs == undefined
                ? undefined
                : KatApp.extend( {}, oneTimeInputs, persistedInputs );
        }

        calculate( customOptions?: KatAppOptions, pipelineDone?: ()=> void ): void {
            if ( !this.ensureApplicationValid() ) {
                if ( pipelineDone != undefined ) {
                    pipelineDone();
                }
                return;
            }

            const _sharedData = $.fn.KatApp.sharedData;

            // Shouldn't change 'share' option with a customOptions object, so just use original options to check
            const shareDataWithOtherApplications = this.options.shareDataWithOtherApplications ?? false;
            
            if ( shareDataWithOtherApplications ) {
                this.options.registeredToken = _sharedData.registeredToken;
                this.options.data = _sharedData.data;
                this.options._sharedDataLastRequested = _sharedData.lastRequested;
            }

            this.exception = this.results = this.calculationInputs = undefined;

            // Build up complete set of options to use for this calculation call
            const currentOptions = KatApp.extend(
                {}, // make a clone of the options
                this.options, // original options
                customOptions, // override options
            ) as KatAppOptions;

            let currentResults: TabDef[] | undefined = undefined;
            let currentCalculationInputs: object | undefined = undefined;
            const inputs = this.getOptionInputs( currentOptions ); 
            const inputTables = this.getInputTables( currentOptions ) ?? [];

            if ( !this.ui.triggerEvent( "onCalculateStart", this ) ) {
                this.ui.triggerEvent( "onCalculateEnd", this );
                return;
            }

            if ( currentOptions.calcEngines === undefined ) {

                if ( currentOptions.manualResults != undefined ) {
                    this.results = this.buildResults( [], currentOptions );
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
                that.processPipeline( pipeline, pipelineNames, pipelineIndex += ( offset + 1 ), offset, pipelineDone );
            };

            const callSharedCallbacks = function( error: string | undefined | unknown ): void {
                const errorMessage = 
                    error instanceof Error ? error.message :
                    typeof error === "string" ? error : undefined;

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
                        // Two applications originally registered data on server and timed out due to inactivity.  Then both
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

            const cacheInputs = function(): void {
                // Current called after submitCalculation succeeds
                // 1. Do we want to do only if api/save data don't throw error?
    
                const hasInputCaching = currentOptions.inputCaching;
                if ( hasInputCaching && !that.inputsHaveBeenCached ) {
                    that.inputsHaveBeenCached = true;
                    const inputCachingKey = "katapp:cachedInputs:" + currentOptions.currentPage + ":" + ( currentOptions.userIdHash ?? "EveryOne" );
                    const inputsCache = KatApp.extend({}, currentCalculationInputs);
                    that.ui.triggerEvent( "onInputsCache", inputsCache, that );

                    // that.calculationInputs has Inputs and Tables in it { input1, input2, Tables: [ ... ] }
                    sessionStorage.setItem(inputCachingKey, JSON.stringify(inputsCache));
                }
            }

            // Always go processResults
            // .calculate() cannot be called with expectation of synchronous execution because of this
            // pipeline function that uses Deferred objects to handle asynchronous submission of 1..N CalcEngines
            const submitCalculation = function(): void {
                const calculations = currentOptions.calcEngines != undefined && currentOptions.calcEngines.length > 0
                    ? currentOptions.calcEngines.map( c => {
                        const d = $.Deferred();

                        try {
                            const submitCalculationOptions = that.getSubmitCalculationOptions( currentOptions, inputs, inputTables, c, undefined );
                            currentCalculationInputs = KatApp.extend( {}, submitCalculationOptions.Inputs as object, { Tables: submitCalculationOptions.InputTables } );

                            that.submitCalculation( 
                                c,
                                currentOptions,
                                submitCalculationOptions,
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
                            that.ui.triggerEvent( "onCalculationErrors", "SubmitCalculation" + ( that.calculationInputs?.iConfigureUI == 1 ? ".ConfigureUI" : "" ), pipelineError, that.exception, currentOptions, that );
                            calculatePipeline( 2 );
                        }
                        else {
                            results
                                .forEach( p => {
                                    const success = p.value as SubmitCalculationSuccess;
                                    const tabDef = success.result.Profile.Data.TabDef;
                                    const resultTabs = tabDef != undefined && !Array.isArray( tabDef ) ? [ tabDef ] : tabDef;

                                    resultTabs.forEach( t => {
                                        t["@calcEngineKey"] = success.calcEngine.key;
                                    });                

                                    tabDefs = tabDefs.concat( resultTabs );
                                });
                            currentResults = that.buildResults( tabDefs, currentOptions );
                            cacheInputs();
                            calculatePipeline( 0 );
                        }
                    }
                );
            };

            // This is needed b/c if a calculation event (i.e. jwt update) triggers another calculation
            // the flow would be...
            // 1. Calc A, gets/sets results/inputs
            // 2. Calc A, Process updateData, finishes
            // 3. Calc A, Raises apiAction Copmlete event
            // 4. KAML triggers a application.calculate() event in api Complete (to resync UI/updated data)
            // 5. Calc B, Starts, set results/inputs to undefined
            // 6. Calc B, Submits calc which is ajax...so code 'releases' back to step 4 where KAML triggered calc
            // 7. Calc A, Flow picks up again and calls processResults and raises onCalculation() etc. however results
            //              and inputs are undefined.

            const ensureResults = function(): void {
                that.results = currentResults;
                that.calculationInputs = currentCalculationInputs;
            };

            // Success - processApiActions
            // Error - calculateEnd
            const updateData = function(): void {
                const jwtUpdateCommand = "rble/jwtupdate";

                try {
                    ensureResults();
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
                            function( successResponse, failureResponse ) {
                                if ( failureResponse != undefined ) {
                                    // Any errors added, add a temp apiAction class so they aren't removed during Calculate workflow
                                    // (apiAction is used for jwt-data updates)
                                    that.select('.validator-container.error').not(".server").addClass("apiAction");
                                    calculatePipeline( 2 );
                                }
                                else {
                                    calculatePipeline( 0 );
                                }
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
                    ensureResults();
                    const docGenApiRow = that.getResultRow<JSON>( "api-actions", "DocGen", "action" );
                    if ( docGenApiRow != undefined ) {
                        if ( docGenApiRow[ "exception" ] != undefined ) {
                            // Show some sort of error...for now just logging diagnostics
                            debugger;
                        }
                        else {
                            const base64toBlob = function(base64Data: string, contentType = 'application/octet-stream', sliceSize = 1024): Blob {
                                // https://stackoverflow.com/a/20151856/166231                
                                const byteCharacters = atob(base64Data);
                                const bytesLength = byteCharacters.length;
                                const slicesCount = Math.ceil(bytesLength / sliceSize);
                                const byteArrays = new Array(slicesCount);
                            
                                for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                                    const begin = sliceIndex * sliceSize;
                                    const end = Math.min(begin + sliceSize, bytesLength);
                            
                                    const bytes = new Array(end - begin);
                                    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
                                        bytes[i] = byteCharacters[offset].charCodeAt(0);
                                    }
                                    byteArrays[sliceIndex] = new Uint8Array(bytes);
                                }
                                return new Blob(byteArrays, { type: contentType });
                            }

                            /*
                            const base64toBlobFetch = (base64 : string, type: string = 'application/octet-stream'): Promise<Blob> => 
                                // Can't use in IE :(
                                fetch(`data:${type};base64,${base64}`).then(res => res.blob())
                            */

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
                ensureResults();
                that.processResults( currentOptions );
                calculatePipeline( 0 );
            };

            const calculateEnd = function(): void {
                ensureResults();
                that.inputsHaveBeenCached = false;

                // Remove temp apiAction error flag now that processing is finished
                that.select('.validator-container.error.apiAction, .validator-container.warning.apiAction').removeClass('apiAction');

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

        processPipeline( pipeline: Array<()=> void>, pipelineNames: Array<string>, pipelineIndex: number, offset: number, pipelineDone?: ()=> void ): void {
            if ( ( pipelineIndex - offset ) > 1 ) {
                this.trace( pipelineNames[ ( pipelineIndex - offset ) - 2 ] + ".finish", TraceVerbosity.Detailed );              
            }
        
            if ( pipelineIndex <= pipeline.length ) {
                this.trace( pipelineNames[ pipelineIndex - 1 ] + ".start", TraceVerbosity.Detailed );
                pipeline[ pipelineIndex - 1 ]();
            }
            else if ( pipelineDone != undefined ) {
                pipelineDone();
            }
        };

        getSubmitCalculationOptions( currentOptions: KatAppOptions, inputs: CalculationInputs, inputTables: CalculationInputTable[], currentCalcEngine: CalcEngine | undefined, endpointOptions: KatAppActionOptions | undefined ): SubmitCalculationOptions {
            // TODO Should make a helper that gets options (for both submit and register)
            const calcEngine = currentCalcEngine ||
                ( 
                    currentOptions.calcEngines != undefined && currentOptions.calcEngines.length > 0
                        ? currentOptions.calcEngines[ 0 ]
                        : null
                );

            let preCalcs = calcEngine?.preCalcs;

            if (inputs.iInputTrigger !== undefined) {
                const rblOnChange = this.select("." + inputs.iInputTrigger).data("rbl-on-change") as string ?? "";
                const triggerPreCalc = rblOnChange.indexOf("update-tp") > -1;
                preCalcs = triggerPreCalc 
                    ? this.select("." + inputs.iInputTrigger).data("rbl-update-tp-params") || preCalcs 
                    : preCalcs;
            }

            const application = this;
            const saveCalcEngineLocation = application.options.nextCalculation?.saveLocations != undefined
                ? application.options.nextCalculation.saveLocations.map( l => l.location ).join("|")
                : "";
            const traceCalcEngine = application.options.nextCalculation?.trace ?? false;
            const refreshCalcEngine = application.options.nextCalculation?.expireCache ?? false;

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
                    Environment: currentOptions.environment ?? "EW.PROD",
                    Framework: "KatApp"
                }
            };

            this.ui.triggerEvent( "onCalculationOptions", calculationOptions, application, endpointOptions );

            return calculationOptions;
        }

        submitCalculation( calcEngine: CalcEngine, currentOptions: KatAppOptions, calculationOptions: SubmitCalculationOptions, submitCalculationHandler: SubmitCalculationCallback ): void {
            const application = this;

            const submitDone: RBLeServiceCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                const traceCalcEngine = application.options.nextCalculation?.trace ?? false;
                    
                if ( traceCalcEngine && payload.Diagnostics != null ) {
                    console.group(calcEngine.name + " " + payload.Diagnostics.CalcEngineVersion + " Diagnostics");

                    const timings: string[] = [];
                    if ( payload.Diagnostics.Timings != null ) {
                        const utcDateLength = 28;
                        payload.Diagnostics.Timings.Status.forEach( t => {
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
    
        getEndpointSubmitData( options: KatAppOptions, endpointOptions: KatAppActionOptions): KatAppActionSubmitData {
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
                endpointOptions, // override options
            ) as KatAppOptions;

            const inputs = this.getOptionInputs( currentOptions ); 
            const inputTables = this.getInputTables( currentOptions ) ?? [];
            const calculationOptions = this.getSubmitCalculationOptions( currentOptions, inputs, inputTables, undefined, endpointOptions );

            const submitData: KatAppActionSubmitData = {
                Inputs: calculationOptions.Inputs,
                InputTables: calculationOptions.InputTables,
                Configuration: currentOptions
            };
            return submitData;
        }

        buildFormData(submitData: KatAppActionSubmitData): FormData {
            // https://gist.github.com/ghinda/8442a57f22099bdb2e34#gistcomment-3405266
            const buildForm = function (formData: FormData, data: object, parentKey?: string, asDictionary?: boolean): void {
                if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
                    Object.keys(data).forEach( (key, index) => {
                        if ( asDictionary ?? false ) {
                            formData.append(`${parentKey}[${index}].Key`, key);
                            formData.append(`${parentKey}[${index}].Value`, data[key]);
                        }
                        else {
                            const formName = parentKey ? `${parentKey}[${key}]` : key;
                            const createDictionary = 
                                formName == "Inputs" || formName == "Configuration[customInputs]" || formName == "Configuration[manualInputs]";
                            
                            if ( key != "manualResults" ) {
                                buildForm(formData, data[key], formName, createDictionary);
                            }
                        }
                    });
                } else if ( data != null ) {
                    const value = (data instanceof Date) 
                        ? data.toISOString() 
                        : data;

                    if ( typeof value !== "function" ) {
                        formData.append(parentKey!, value); // eslint-disable-line @typescript-eslint/no-non-null-assertion
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

        configureUI( customOptions?: KatAppOptions, done?: ()=> void ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1, iDataBind: 1 } };
            const saveConfigureUiCalculationLocation = this.options.debug?.saveConfigureUiCalculationLocation;
            if ( saveConfigureUiCalculationLocation !== undefined ) {
                this.saveCalcEngine(saveConfigureUiCalculationLocation);
            }
            this.calculate( KatApp.extend( {}, customOptions, manualInputs ), done );
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
                    this.results = this.buildResults( this.results?.filter( r => r._manualResult == undefined ), this.options );
                    this.processResults( this.options );
                }
            }

            this.ui.triggerEvent( "onOptionsUpdated", this );
        }

        clearValidationSummaries(): void {
            this.rble.initializeValidationSummaries();
        }

        clearInputs( container?: JQuery<HTMLElement>): void {
            this.clearInputsBySelector( this.options.inputSelector, container );
        }

        getInputs(): CalculationInputs {
            return this.getOptionInputs( this.options )
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

        private getOptionInputs( currentOptions: KatAppOptions ): CalculationInputs {
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

            const inputs = this.getInputsBySelector( currentOptions.inputSelector ) ?? {};

            // const result = KatApp.extend( {}, inputs, { InputTables: this.ui.getInputTables() }, this.options.defaultInputs, this.options.manualInputs ) as JSON;
            const result = KatApp.extend( {}, 
                inputs, 
                currentOptions.manualInputs,
                currentOptions.defaultInputs
            ) as CalculationInputs;

            delete result[ "Tables" ];

            Object.keys(this.endpointRBLeInputsCache).forEach( k => {
                const inputCache = this.endpointRBLeInputsCache[k];

                if ( inputCache != undefined ) {
                    KatApp.extend(result,inputCache[ "Inputs" ]);
                }
            });
            
            return result;
        };

        private getInputTables( currentOptions: KatAppOptions ): CalculationInputTable[] | undefined {
            const utilities: UIUtilities = this.ui;
            const tables: CalculationInputTable[] = [];
            const that = this;

            jQuery.each(that.select(".RBLe-input-table"), function () {
                const table: CalculationInputTable = {
                    Name: $(this).data("table"),
                    Rows: []
                };

                jQuery.each(that.select("[data-index]", this), function () {
                    const row: CalculationInputTableRow = {
                        index: $(this).data("index")
                    };

                    jQuery.each(that.select("[data-column]", this), function () {
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

            const mergeCachedTable = function( tableCache: undefined | object ): void {
                if ( tableCache != undefined ) {

                    Object.keys(tableCache).forEach( k => {
                        let tableRows = tableCache[k];
                        let tableName = k;

                        if ( tableRows[ "Name" ] != undefined ) {
                            // Then this is from *Inputs instead of api result, so need to massage info
                            tableName = tableRows[ "Name" ];
                            tableRows = tableRows[ "Rows" ];
                        }

                        const inputTable: CalculationInputTable = {
                            Name: tableName,
                            Rows: tableRows != undefined ? tableRows.slice() : []
                        };
                                                    
                        tables.push(inputTable);        
                    });
                }
            };

            const optionTables = KatApp.extend( {}, 
                currentOptions.manualInputs,
                currentOptions.defaultInputs
            );

            mergeCachedTable( optionTables[ "Tables" ] );

            Object.keys(this.endpointRBLeInputsCache).forEach( k => {
                const inputCache = this.endpointRBLeInputsCache[k];
                mergeCachedTable(inputCache?.Tables );
            });

            return tables.length > 0 ? tables : undefined;
        }

        private getInputsBySelector( inputSelector: string | undefined, container?: JQuery<HTMLElement> ): {} | undefined {
            if ( inputSelector == undefined ) return undefined;

            const inputs = {};
            const ui: UIUtilities = this.ui;
            const inputContainer = container ?? this.element;
            const validInputs =  this.select(inputSelector, inputContainer).not(inputsToIgnoreSelector);

            jQuery.each(validInputs, function () {
                const input = $(this);
                const value = ui.getInputValue(input);

                if (value !== undefined) {
                    const name = ui.getInputName(input);
                    inputs[name] = value;
                }
            });

            // Checkbox list...
            this.select("[data-itemtype='checkbox']", inputContainer)
                .each(function() {
                    const cbl = $(this);
                    const name = cbl.data("inputname");
                    // cbl is already constrained to current app, so
                    // don't need to use application.select() for value
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

        private clearInputsBySelector( inputSelector: string | undefined, container?: JQuery<HTMLElement> ): {} | undefined {
            if ( inputSelector == undefined ) return undefined;

            const ui: UIUtilities = this.ui;
            const that = this;
            const inputContainer = container ?? this.element;
            const validInputs =  this.select(inputSelector, inputContainer).not(inputsToIgnoreSelector);

            validInputs.each(function () {
                const input = $(this);
                const name = ui.getInputName(input);
                that.setInput( name, "");
            });

            // https://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery/13351234#13351234
            this.select("input[type='file']", inputContainer).each(function() {
                const input = $(this);
                ( input.wrap('<form>').closest('form').get(0) as HTMLFormElement ).reset();
                input.unwrap();
                that.setInput( ui.getInputName(input) + "Display", "");
            });

            // Checkbox list...
            this.select("[data-itemtype='checkbox'] input", inputContainer).prop("checked", false);
        }

        serverCalculation( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> ): void {
            this.apiAction(
                "rble/calculation",
                this.options, 
                { 
                    customInputs: customInputs,
                    isDownload: actionLink?.attr("rbl-action-download") == "true",
                    calculateOnSuccess: actionLink?.attr("rbl-action-calculate") == "true"
                },
                actionLink
             );
        }
    
        blockerCount = 0;
        showAjaxBlocker(): void {
            this.blockerCount++;

            if ( this.blockerCount == 1 ) {
                const selector = this.options.ajaxLoaderSelector;
                if ( selector != undefined ) {
                    this.select(selector).show();
                }
            }
        }

        hideAjaxBlocker(): void {
            this.blockerCount--;

            if ( this.blockerCount == 0 ) {
                const selector = this.options.ajaxLoaderSelector;
                if ( selector != undefined ) {
                    this.select(selector).fadeOut();
                }
            }

            if ( this.blockerCount < 0 ) {
                this.blockerCount = 0;
            }
        }

        buildResults( results: TabDef[] | undefined, calculationOptions: KatAppOptions = this.options ): TabDef[] | undefined {
            const calcEngines = ( calculationOptions.calcEngines ?? [] ).map( ce => ({ name: ce.name, key: ce.key }) );
            const application = this;

            if ( calculationOptions.manualResults != undefined ) {
                if ( results == undefined ) {
                    results = [];
                }
                
                calculationOptions.manualResults.forEach( ( t, i ) => {
                    if ( t["@calcEngineKey"] == undefined ) {
                        t["@calcEngineKey"] = "ManualResults";
                    }
                    t["@calcEngine"] = t["@calcEngine"] ?? t["@calcEngineKey"];
                    t["@name"] = t["@name"] ?? "RBLResults" + ( i + 1 );
                    t["_manualResult"] = true;

                    results!.push( t ); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                    if ( calcEngines.findIndex( v => v.key == t["@calcEngineKey"] ) == -1 ) {
                        calcEngines.push( { name: t["@calcEngine"], key: t["@calcEngineKey"] } );
                    }
                });
            }

            const defaultCEKey = calcEngines[ 0 ].key;

            if ( results !== undefined ) {
                results.forEach( t => {
                    t._resultKeys = 
                        Object.keys(t)
                            .filter( k => !k.startsWith( "@" ) && !k.startsWith( "_" ) );
                    
                    const ceKey = t["@calcEngineKey"];
                    const ceName = t["@calcEngine"].split(".")[ 0 ].replace("_Test", "");
                    
                    // Is this tab part of defaultCalcEngine?
                    t._defaultCalcEngine = ceKey == defaultCEKey;
                    t[ "_" +  ceKey ] = true;
                    t._name = t["@name"];
                    t._fullName = ceKey + "." + ceName + "." + t._name;

                    // Ensure that all tables are an array
                    t._resultKeys.forEach( k => {
                        const table = t[ k ];
    
                        if (!(table instanceof Array) && table != null ) {
                            t[ k ] = [table];
                        }
                    });    
                } );

                results[ "getResultTable" ] = function<T>( tableName: string, tabDef?: string, calcEngine?: string): Array<T> {
                    return application.rble.getResultTable<T>( application.rble.getTabDef( tabDef, calcEngine ), tableName );
                };
                results[ "getResultRow" ] = function<T>(table: string, id: string, columnToSearch?: string, tabDef?: string, calcEngine?: string ): T | undefined { 
                    return application.rble.getResultRow<T>( application.rble.getTabDef( tabDef, calcEngine ), table, id, columnToSearch ); 
                };
                results[ "getResultValue" ] = function( table: string, id: string, column: string, defautlValue?: string, tabDef?: string, calcEngine?: string ): string | undefined { 
                    return application.rble.getResultValue( application.rble.getTabDef( tabDef, calcEngine ), table, id, column, defautlValue ); 
                };
                results[ "getResultValueByColumn" ] = function( table: string, keyColumn: string, key: string, column: string, defautlValue?: string, tabDef?: string, calcEngine?: string ): string | undefined { 
                    return application.rble.getResultValueByColumn( application.rble.getTabDef( tabDef, calcEngine ), table, keyColumn, key, column, defautlValue ); 
                };
                results[ "pushResultRow" ] = function( tableName: string, row: object, tabDef?: string | null, calcEngine?: string | null ) {
                    application.pushResultRow( tableName, row, tabDef, calcEngine );
                };
            }

            return results;
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

        invalidate(): void {
            this.applicationIsInvalid = true;
        }

        ensureApplicationValid(): boolean {
            if ( this.applicationIsInvalid ) {
                this.rble.initializeValidationSummaries();

                const errors: ValidationRow[] = [];
                console.log( "Application has been invalidated due to data concurrency issues." );
                errors.push( { "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });

                const errorSummary = this.select("#" + this.id + "_ModelerValidationTable");

                this.rble.processValidationRows( errorSummary, errors );
                this.rble.finalizeValidationSummaries();

                return false;
            }

            return true;
        }

        apiAction( commandName: string, options: KatAppOptions, actionOptions: KatAppActionOptions, actionLink: JQuery<HTMLElement> | undefined, done?: ( successResponse: KatAppActionResult | undefined, failureResponse: {} | undefined )=> void ): void {
            if ( !this.ensureApplicationValid() ) {
                if ( done != undefined ) {
                    done(
                        undefined, 
                        { 
                            InvalidateKatApp: true,
                            ExceptionMessage: "Application as been invalidated"    
                        }
                    );
                }
                return;
            }

            const that = this;
            const isDownload = actionOptions.isDownload ?? false;
            const runCalculate = actionOptions.calculateOnSuccess ?? false;
            const errors: ValidationRow[] = [];
            const warnings: ValidationRow[] = [];

            that.rble.initializeValidationSummaries();
            this.showAjaxBlocker();
        
            let url = "api/" + commandName;
            const serviceUrlParts = that.options.sessionUrl?.split( "?" );

            if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                url += ( url.indexOf( "?" ) > -1 ? "&" : "?" ) + serviceUrlParts[ 1 ];
            }
            
            let errorResponse: KatAppActionResult;
            let successResponse: KatAppActionResult | undefined = undefined;
            // No one was using this yet, not sure I need it
            // this.ui.triggerEvent( "onActionStart", commandName, data, this, actionLink );

            const data = that.getEndpointSubmitData(options, actionOptions);

            that.ui.triggerEvent( "onActionStart", commandName, data, that, data.Configuration, actionLink );

            // Couldn't figure out how to model bind JObject or Dictionary, so hacking with this
            data[ "inputTablesRaw" ] = data.InputTables != undefined ? JSON.stringify( data.InputTables ) : undefined;

            const fd = that.buildFormData( data );

            const clearServerOnlySaveInstructions = function(): void {
                if ( that.options.nextCalculation?.saveLocations != undefined ) {
                    that.options.nextCalculation.saveLocations = 
                        that.options.nextCalculation.saveLocations.filter( l => !l.serverSideOnly );
                }
            };
            const finishApiAction = function(): void {
                clearServerOnlySaveInstructions();
                const errorSummary = that.select("#" + that.id + "_ModelerValidationTable");
                const warningSummary = that.select("#" + that.id + "_ModelerWarnings");
                that.rble.processValidationRows( errorSummary, errors );
                that.rble.processValidationRows( warningSummary, warnings );
                that.rble.finalizeValidationSummaries();

                if ( errors.length > 0 ) {
                    console.group("Unable to process " + commandName + ": errorResponse");
                    console.log(errorResponse);
                    console.groupEnd();
                    console.group("Unable to process " + commandName + ": errors");
                    console.log( errors );
                    console.groupEnd();

                    that.ui.triggerEvent( "onActionFailed", commandName, errorResponse, that, data.Configuration, actionLink );
                }
                else {
                    that.ui.triggerEvent( "onActionResult", commandName, successResponse, that, data.Configuration, actionLink );
                }

                that.hideAjaxBlocker();
                that.ui.triggerEvent( "onActionComplete", commandName, that, data.Configuration, actionLink );

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
                    const xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function(): void {
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
            
                        that.downloadBlob(blob, filename);
                    }
                    else {
                        successResponse = result as KatAppActionResult;

                        if ( successResponse.ValidationWarnings != undefined ) {
                            successResponse.ValidationWarnings.forEach( vr => {
                                warnings.push( { "@id": vr.ID, text: vr.Message });
                            });
                        }

                        delete that.endpointRBLeInputsCache[ commandName ];
                        if ( successResponse.RBLeInputs != undefined ) {
                            that.endpointRBLeInputsCache[ commandName ] = successResponse.RBLeInputs;
                        }

                        if ( runCalculate ) {
                            clearServerOnlySaveInstructions();
                            that.calculate( undefined, finishApiAction );
                        }
                    }

                    if ( !runCalculate ) {
                        finishApiAction();
                    }
                },
                function( xhr ) {
                    errorResponse = xhr[ "responseBinary" ] as KatAppActionResult;
                    delete that.endpointRBLeInputsCache[ commandName ];

                    if ( errorResponse != undefined ) {
                        if ( errorResponse.Validations != undefined ) {
                            errorResponse.Validations.forEach(v => {
                                errors.push( { "@id": v.ID, text: v.Message });
                            });
                        }
                        
                        if ( errorResponse.InvalidateKatApp ?? false ) {
                            that.invalidate();
                        }
                    }

                    if ( errors.length == 0 ) {
                        errors.push( { "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
                    }
                    finishApiAction();
                }
            );
        }
        
        private processResults( calculationOptions: KatAppOptions ): void {
            this.trace("Processing results from calculation", TraceVerbosity.Detailed);
            const start = new Date();

            try {
                const calculationResults = this.results;
                this.options.nextCalculation = undefined;
                this.options.defaultInputs = undefined;
    
                this.ui.triggerEvent( "onResultsProcessing", calculationResults, calculationOptions, this );
                
                this.rble.processResults( calculationResults, calculationOptions );
               
                if ( this.calculationInputs?.iConfigureUI === 1 ) {
                    this.ui.triggerEvent( "onConfigureUICalculation", calculationResults, calculationOptions, this );
                }
    
                this.ui.triggerEvent( "onCalculation", calculationResults, calculationOptions, this );
            } catch (error) {
                this.trace( "Error during result processing: " + error, TraceVerbosity.None );
                this.ui.triggerEvent( "onCalculationErrors", "ProcessResults", error, this.exception, calculationOptions, this );
            }
            finally {
                this.trace("Processing results took " + ( Date.now() - start.getTime() ) + "ms", TraceVerbosity.Detailed);
            }
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
        pushResultRow( tableName: string, row: object, tabDef?: string | null, calcEngine?: string | null ) {
            const tab = this.rble.getTabDef( tabDef, calcEngine );

            if ( tab == undefined ) {
                throw new Error("Unable to find specified result tab." );
            }

            let resultTable = this.rble.getResultTable<object>( tab, tableName );

            if ( resultTable.length == 0 ) {
                tab[ tableName ] = resultTable = [];
                tab._resultKeys.push( tableName );
            }

            if ( row[ "@id" ] == undefined ) {
                row[ "@id" ] = "_pushId_" + resultTable.length;
            }
            const existingRow = this.rble.getResultRow<object>( tab, tableName, row[ "@id" ] );

            if ( existingRow != undefined ) {
                KatApp.extend( existingRow, row );
            }
            else {
               resultTable.push( row );
            }
        };
        
        createModalDialog(confirm: string, onConfirm?: ()=> void, onCancel?: ()=> void): void {
            if (!this.select('.katappModalDialog').length) {
                const sCancel = "Cancel";
                const sContinue = "Continue";

                const isBootstrap5 = this.bootstrapVersion == 5;
                const bsDataAttributePrefix = isBootstrap5 ? "data-bs-" : "data-";

                this.element.append(
                    '<div class="modal fade katappModalDialog" tabindex="-1" role="dialog" ' + bsDataAttributePrefix + 'keyboard="false" ' + bsDataAttributePrefix + 'backdrop="static">' +
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

            const modalBody = this.select('.katappModalDialog .modal-body');
            modalBody.html(confirm);
            this.templateBuilder.processNavigationLinks(modalBody);

            this.select('.katappModalDialog .continueButton').off("click.ka").on("click.ka", function (e) {
                e.preventDefault();
                if (onConfirm != undefined) {
                    onConfirm();
                }
            });
            if ( onCancel == undefined ) {
                this.select('.katappModalDialog .cancelButton').hide();
            }
            else {
                this.select('.katappModalDialog .cancelButton').off("click.ka").show().on("click.ka", function (e) {
                    e.preventDefault();
                    if (onCancel != undefined) {
                        onCancel();
                    }
                });
            }
    
            if (this.bootstrapVersion==5) {
                const myModal = new bootstrap.Modal(this.select('.katappModalDialog')[0]);
                myModal.show();
            }
            else {
                this.select('.katappModalDialog').modal({ show: true });
            }
        }

        get bootstrapVersion(): number {
            const version = 
                this.options.bootstrapVersion ??
                this.element.attr("rbl-bootstrap") ??
                this.select("rbl-config").attr("bootstrap") ?? "3";
            
            return +version;
        }

        get defaultCalcEngineKey(): string {
            return ( this.options.calcEngines != undefined ? this.options.calcEngines[0].key : undefined ) ?? "default";
        }

        saveCalcEngine( location: string | boolean, serverSideOnly?: boolean ): void {
            if ( this.options.nextCalculation == undefined )
            {
                this.options.nextCalculation = {
                    saveLocations: []
                };
            }
            else if ( this.options.nextCalculation.saveLocations == undefined ) {
                this.options.nextCalculation.saveLocations = [];
            }
            
            if ( typeof( location ) == "boolean" ) {
                if ( !location ) {
                    this.options.nextCalculation.saveLocations = [];
                }
            }
            else {
                const locations = location.split('|');
                this.options.nextCalculation!.saveLocations = this.options.nextCalculation!.saveLocations!.filter( e => locations.indexOf(e.location) == -1 ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                locations.forEach( l => {
                    this.options.nextCalculation!.saveLocations!.push( {// eslint-disable-line @typescript-eslint/no-non-null-assertion
                        location: l,
                        serverSideOnly: serverSideOnly ?? false
                    });
                });
            }
        }
        refreshCalcEngine(): void {
            if ( this.options.nextCalculation == undefined )
            {
                this.options.nextCalculation = { };
            }
            this.options.nextCalculation.expireCache = true;
        }
        traceCalcEngine(): void {
            if ( this.options.nextCalculation == undefined )
            {
                this.options.nextCalculation = { };
            }
            this.options.nextCalculation.trace = true;
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
                that.application.select(".SubmitButton").removeClass("disabled");
                that.application.hideAjaxBlocker();
            });
        
            this.application.select("a[data-confirm], a[data-confirm-selector]")
                .not(".confirm-bound, .jquery-validate, .skip-confirm")
                .addClass("confirm-bound")
                .on("click.RBLe", function() { 
                    const link = $(this);
                    const confirm = 
                        link.data("confirm") || 
                        that.application.select(link.data("confirm-selector")).html() || "";
    
                    return that.onConfirmLinkClick( link, confirm ); 
                });
        }

        onConfirmLinkClick( link: JQuery<HTMLElement>, modalText: string, confirmAction?: ()=> void ): boolean {

            if (link.data("confirmed") == "true") {
                return true;
            }
            const that = this;

            const onConfirm = function (): void {
                link.data("confirmed", "true");

                if ( confirmAction != undefined ) {
                    confirmAction();
                }
                else {
                    const submitKey = link.data("submit-key");

                    if (submitKey != undefined) {
                        that.application.select(submitKey)[0].click();
                    }
                    else {
                        link[0].click();
                    }
                }

                link.data("confirmed", "false");
            };

            if (modalText == "") {
                onConfirm(); // If no confirm on link (called from validation modules), just call onConfirm
            }
            else {
                this.application.createModalDialog(
                    modalText,
                    onConfirm,                
                    // onCancel
                    function () {
                        link.data("confirmed", "false");
                        that.triggerEvent( "onConfirmCancelled", link );
                    }
                );
            }

            return false;
        }

        processDropdownItems(dropdown: JQuery<HTMLElement>, rebuild: boolean, dropdownItems: { Value: string | null; Text: string | null; Class: string | undefined; Subtext: string | undefined; Html: string | undefined; Selected: boolean; Visible: boolean }[]): void {
            if ( dropdown.length === 0 ) return;

            const controlName = this.getInputName(dropdown);
            const selectPicker = dropdown.attr("data-kat-bootstrap-select-initialized") !== undefined
                ? dropdown
                : undefined;

            if ( rebuild ) {
                this.application.select("." + controlName + " option").remove();
            }
    
            const that = this;

            dropdownItems.forEach( ls => {
                // checkbox list
                // $(".v" + controlName + "_" + ls.key, application.element).parent()
                let currentItem = that.application.select("." + controlName + " option[value='" + ls.Value + "']");

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
                    currentItem.hide().prop("disabled", true);

                    const currentValue = selectPicker?.selectpicker('val') ?? dropdown.val();

                    // If selected item from dropdown was hidden, need to clear the value
                    if (currentValue === ls.Value) {
                        dropdown.val("");

                        /* Think I should always just set dropdown val and 
                            selectPicker.refresh will take care of rest

                        if (selectPicker !== undefined) {
                            selectPicker.selectpicker("val", "");
                        }
                        else {
                            dropdown.val("");
                        }
                        */
                    }
                }
                else {
                    currentItem.show().prop("disabled", false);
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

        encodeTemplateContent( content: string ): string {
            return content
                .replace(/-toggle=/g, "-toggle_=")
                .replace(/ id=/g, " id_=")
                .replace(/ src=/g, " src_=")
                .replace(/<table>/g, "<table_>")
                .replace(/<table /g, "<table_ ")
                .replace(/<\/table>/g, "</table_>")
                .replace(/<thead>/g, "<thead_>")
                .replace(/<thead /g, "<thead_ ")
                .replace(/<\/thead>/g, "</thead_>")
                .replace(/<tbody>/g, "<tbody_>")
                .replace(/<tbody /g, "<tbody_ ")
                .replace(/<\/tbody>/g, "</tbody_>")
                .replace(/<tfoot>/g, "<tfoot_>")
                .replace(/<tfoot /g, "<tfoot_ ")
                .replace(/<\/tfoot>/g, "</tfoot_>")
                .replace(/<tr>/g, "<tr_>")
                .replace(/<tr /g, "<tr_ ")
                .replace(/<\/tr>/g, "</tr_>")
                .replace(/<th>/g, "<th_>")
                .replace(/<th /g, "<th_ ")
                .replace(/<\/th>/g, "</th_>")
                .replace(/<td>/g, "<td_>")
                .replace(/<td /g, "<td_ ")
                .replace(/<\/td>/g, "</td_>");
        }
        decodeTemplateContent( content: string ): string {
            // If templates with bootstrap toggle have issues with 'target' because of {templateValues} inside the
            // selector attribute, bootstrap crashes and doesn't process rest of the 'valid' toggles.  To fix,
            // disable bootstrap handling *in the template* by putting _ after toggle, then it is turned when
            // the rendered template content is injected.

            const thisClassCss = ".katapp-" + this.application.id;

            let decodedContent = content
                .replace( /{thisClass}/g, thisClassCss )
                .replace( /\.thisClass/g, thisClassCss )
                .replace( /thisClass/g, thisClassCss )
                .replace( / src_=/g, " src=") // changed templates to have src_ so I didn't get browser warning about 404
                .replace( / id_=/g, " id=") // changed templates to have id_ so I didn't get browser warning about duplicate IDs inside *template markup*
                .replace( /-toggle_=/g, "-toggle=" ) // changed templates to have -toggle_ so that BS didn't 'process' items that were in templates
                .replace( /table_/g, "table" ) // if table is in template and we replace tr -> tr_ when table added to DOM, it removes all the tr_ as 'invalid' and places them before the (now empty) table
                .replace( /thead_/g, "thead" ) // if table is in template and we replace tr -> tr_ when table added to DOM, it removes all the tr_ as 'invalid' and places them before the (now empty) table
                .replace( /tbody_/g, "tbody" ) // if table is in template and we replace tr -> tr_ when table added to DOM, it removes all the tr_ as 'invalid' and places them before the (now empty) table
                .replace( /tfoot_/g, "tfoot" ) // if table is in template and we replace tr -> tr_ when table added to DOM, it removes all the tr_ as 'invalid' and places them before the (now empty) table
                .replace( /tr_/g, "tr" ) // if tr/td were *not* contained in a table in the template, browsers would just remove them when the template was injected into application, so replace here before injecting template
                .replace( /th_/g, "th" )
                .replace( /td_/g, "td" );

            if ( this.application.bootstrapVersion > 3 ) {
                decodedContent = decodedContent
                    .replace( /control-label/g, "form-label")
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
        
        injectTemplatesWithoutSource(container: JQuery<HTMLElement>, showInspector: boolean): void {
            const that = this;

            const containerIsTemplateNotInjected = container.is("[rbl-tid]:not([rbl-source], [data-katapp-template-injected='true'])");
            const itemsToProcess = 
                that.application.select("[rbl-tid]", container)
                    .not("[rbl-source], [data-katapp-template-injected='true']") // not an template with data source, not processed
                    .add(containerIsTemplateNotInjected ? container : [] );

            itemsToProcess.each(function () {
                const item = $(this);                    
                const templateId = item.attr('rbl-tid')!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                that.injectTemplate( item, templateId );
                item.attr("data-katapp-template-injected", "true");
                that.injectTemplatesWithoutSource(item, showInspector);
            });
        }

        ensureTemplateScript( template: Template, templatedContent: JQuery<HTMLElement> ): void {            
            if ( !( this.application.id in template.ApplicationsInjected ) ) {
                template.ApplicationsInjected[ this.application.id ] = this.application.id;
            }
            else {                                        
                // only inject script once per template name
                templatedContent.find("script").remove();
                templatedContent.find("style").remove();
            }
        }

        injectTemplate( target: JQuery<HTMLElement>, templateId: string ): void {
            try {
                $.fn.KatApp.currentView = this.application.element;

                const template = 
                    this.getTemplate( 
                        templateId, 
                        this.application.dataAttributesToJson(target, "data-"),
                        true
                    );

                // rbl-template-type is to enable the creation of templates with different ids/names but still
                // fall in a category of type.  For example, you may want to make a certain style/template of
                // sliders (while still keeping main slider template usable) that is then capable of applying
                // all the KatApp programming (data-* attributes applying ranges, and configurations).            
                target.removeAttr("rbl-template-type");

                if ( template === undefined ) {
                    target.html("");
                }
                else {
                    let el = $(template.TemplatedContent);

                    const hasRoot = el.length == 1;

                    if ( !hasRoot ) {
                        el = $("<div>" + template.TemplatedContent + "</div>");
                    }

                    this.ensureTemplateScript( template.Template, el );

                    // This will run any <script> tags that are present
                    target.html( hasRoot ? el[ 0 ].outerHTML : el.html() );

                    const templateType = template.Template.Content.attr( "type" );
                    if ( templateType !== undefined ) {
                        target.attr("rbl-template-type", templateType);
                    }
                }
            } finally {
                $.fn.KatApp.currentView = undefined;
            }
        }
    
        getTemplate( templateId: string, data: JQuery.PlainObject | undefined, includeDefaults: boolean ): { Template: Template, TemplatedContent: string } | undefined {
            const application = this.application;
            const isInline = templateId.startsWith("_t_");
            // Look first for template overriden directly in markup of view
            let template = application.getResourceTemplateItem( isInline ? "_INLINE" : application.options.view!, templateId );

            // Now try to find template given precedence of views provided (last template file given highest)
            if ( template == undefined && application.options.viewTemplates != undefined ) {
                application.options.viewTemplates!
                    .split(",")
                    .reverse()
                    .forEach( tid => {
                        if ( template == undefined ) {
                            template = application.getResourceTemplateItem( tid, templateId );
                        }    
                    });
            }

            if ( template == undefined ) {
                application.trace( "Invalid template id: " + templateId, TraceVerbosity.Quiet);
                return undefined;
            }
            else {
                const templateContent = template.Content;
                const templateDefaults = includeDefaults ? application.dataAttributesToJson(templateContent, "default-") : {};
                const templateFormatData = KatApp.extend({}, templateDefaults, data, { id: application.id } );
                const templateHtml = isInline ? templateContent[0].outerHTML : templateContent.html();
                const templatedContent = this.decodeTemplateContent( templateHtml.format( templateFormatData ) );

                return {
                    Template: template,
                    TemplatedContent: templatedContent
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

            // const templateContainer = container.closest("[rbl-tid='input-radiobuttonlist'], [rbl-template-type='katapp-radiobuttonlist'], [rbl-tid='input-checkboxlist'], [rbl-template-type='katapp-checkboxlist']")

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
                        - both bsc/manual fail if vertical, it adds 'options' to the table, results has rbl-list table in it again for visiblity
                            - code doesn't know how to handle/hide items b/c it is hardcoded (RBLe) to only handle 'horizontal' ones

                */
                // throw new Error("CheckboxList is not supported yet.");
            }

            let itemsContainer = horizontal
                ? container
                : this.application.select(".items-container", container);

            const itemTypeClass: string = isRadio ? "radio abc-radio" : "checkbox abc-checkbox";

            if ( horizontal && !isBootstrap5 ) {
                container.parent().addClass( "bs-listcontrol form-inline form-inline-vtop" );
            }
            else if ( horizontal && isBootstrap5 ) {
                container.addClass( "row" );
            }
            else if ( itemsContainer.length === 0 ) {
                const templateContent = 
                    this.getTemplate( isRadio ? "input-radiobuttonlist-vertical-container" : "input-checkboxlist-vertical-container", {}, false )?.TemplatedContent ??
                    "<table class='" + itemTypeClass + " bs-listcontrol' border='0'><tbody class='items-container'></tbody></table>";

                container.append($(templateContent));
                itemsContainer = this.application.select(".items-container", container);
            }

            const that = this;
            const helpIconClass = 
                isBootstrap3 ? "glyphicon glyphicon-info-sign" : 
                isBootstrap4 ? "fa fa-question-circle" : 
                isBootstrap5 ? "fa-light fa-circle-info" : "fa fa-question-circle";

            let configureHelp = false;

            const verticalItemTemplate = 
                this.getTemplate( isRadio ? "input-radiobuttonlist-vertical-item" : "input-checkboxlist-vertical-item", {}, false )!.TemplatedContent; // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const horizontalItemTemplate =
                this.getTemplate( isRadio ? "input-radiobuttonlist-horizontal-item" : "input-checkboxlist-horizontal-item", {}, false )!.TemplatedContent; // eslint-disable-line @typescript-eslint/no-non-null-assertion

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
            // Need to support : and $.  'Legacy' is : which is default mode a convert process has for VS, but Gu says to never use 
            // that, but it caused other issues that are documented in 4.1 Validators.cs file so allowing both.
            // http://bytes.com/topic/asp-net/answers/433532-control-name-change-asp-net-2-0-generated-html
            // http://weblogs.asp.net/scottgu/gotcha-don-t-use-xhtmlconformance-mode-legacy-with-asp-net-ajax

            // data-inputname - Checkbox list items, I put the 'name' into a parent span (via attribute on ListItem)
            // but if they are children of [data-itemtype="checkbox"] element, they are skipped and handled specifically
            // and the data-inputname is expected on same element as [data-itemtype="checkbox"].
            let htmlName = input.parent().attr("data-inputname") || input.attr("data-inputname") || input.attr("name");

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
            else if (input.attr("type") === "checkbox") {
                value = input.prop("checked") ? "1" : "0";
            }

            return ( !skipAssignment ? value ?? '' : undefined ) as string;
        }

        pushNotification(from: KatAppPlugIn, name: string, information: {} | undefined): void {
            const that = this;
            $("[rbl-application-id]").each(function() {
                const a = this.KatApp as KatAppPlugIn;

                if ( a != undefined ) {
                    if ( from.id != a.id ) {
                        // Only trigger event for *other* KatApps
                        that.triggerApplicationEvent( a, "onKatAppNotification", name, information, a );
                    }
                }
            });
        }

        triggerEvent(eventName: string, ...args: ( object | string | undefined | unknown )[]): boolean {
            const application = this.application;
            return this.triggerApplicationEvent( application, eventName, ...args );
        }

        private triggerApplicationEvent(application: KatAppPlugIn, eventName: string, ...args: ( object | string | undefined | unknown )[]): boolean {
            // If event is cancelled, return false;
            try {
                application.trace("Calling " + eventName + " delegate: Starting...", TraceVerbosity.Diagnostic);
                // Make application.element[0] be 'this' in the event handler
                if ( !( application.options[ eventName ]?.apply(application.element[0], args ) ?? true ) ) {
                    return false;
                }
                application.trace("Calling " + eventName + " delegate: Complete", TraceVerbosity.Diagnostic);
            } catch (error) {
                application.trace("Error calling " + eventName + ": " + error, TraceVerbosity.None);
            }

            try {
                application.trace("Triggering " + eventName + ": Starting...", TraceVerbosity.Diagnostic);
                const event = jQuery.Event( eventName + ".RBLe" );
                application.element.trigger( event, args);                    
                application.trace("Triggering " + eventName + ": Complete", TraceVerbosity.Diagnostic);

                if ( !( ( event as any ).result ?? true ) || event.isDefaultPrevented() ) {
                    return false;
                }

            } catch (error) {
                application.trace("Error triggering " + eventName + ": " + error, TraceVerbosity.None);
            }

            return true;
        }

        changeRBLe(element: JQuery<HTMLElement>): void {
            const wizardInputSelector = element.data("input");
        
            if (wizardInputSelector == undefined) {
                this.application.calculate( { manualInputs: { iInputTrigger: this.getInputName(element) } } );
            }
            else {
                // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                this.application.select("." + wizardInputSelector)
                    .val(element.val() as string)
                    .trigger("change.RBLe"); // trigger calculation
            }        
        }

        handleVoidAnchors(): void {
            this.application.select("a[href='#']")
                .not("[data-katapp-nonav='true']")
                .on("click.RBLe", function(e) {
                    e.preventDefault();
                }).attr("data-katapp-nonav", "true");
        }

        bindRblOnHandlers(container?: JQuery<HTMLElement>): void {
            const application = this.application;
            if ( application.options.handlers != undefined ) {
                // If it is popover, we can't scope it to application
                const isPopover = container != undefined && container.attr("data-katapp-popover") == "true";

                // move events on templated output into targets after template is rendered
                application.select("[rbl-tid][rbl-on]", container)
                    .each(function() {
                        const template = $(this);
                        const handlers = template.attr("rbl-on")!.split("|"); // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
                                    ? application.select(handlerSelector, template)
                                    : undefined;
                                
                                if ( input == undefined ) {
                                    if ( tid == "input-dropdown" || tType == "katapp-dropdown" ) {
                                        input = application.select("select.form-control", template).not("[data-rblon-initialized='true']");
                                    }
                                    else if ( tid == "input-fileupload" || tType == "katapp-fileupload" ) {
                                        input = application.select("input[type='file']", template).not("[data-rblon-initialized='true']");
                                    }
                                    else if ( tid == "input-slider" || tType == "katapp-slider" ) {
                                        input = application.select("div[data-slider-type='nouislider']", template).not("[data-rblon-initialized='true']");
                                    }
                                    else {
                                        input = application.select(":input", template).not("[data-rblon-initialized='true']");
    
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

                let items = isPopover
                    ? $('[rbl-on]', container)
                    : application.select("[rbl-tid]", container);

                // If a handler was put on an html container with a selector but the container was *not*
                // a template, the handlers were not moved to targets in above method, so have to move them
                // to the intended targets in this loop.  NOTE: The move process is only done once...
                items
                    .not("[rbl-tid]")
                    .not("[data-rblon-parent-initialized='true']")
                    .each(function() {
                        const htmlContainer = $(this);
                        const handlers = htmlContainer.attr("rbl-on")!.split("|"); // eslint-disable-line @typescript-eslint/no-non-null-assertion

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
                                    htmlContainer.attr("data-rblon-parent-initialized", "true");
                                }
                            });
                    });

                items = isPopover
                    ? $('[rbl-on]', container)
                    : application.select("[rbl-on]", container);
                
                items
                    .not("[rbl-tid]")
                    .not("[data-rblon-initialized='true']")
                    .each(function() {
                        const el = $(this);
                        const handlers = el.attr("rbl-on")!.split("|"); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        const isSlider = el.attr("data-slider-type") == "nouislider";
                        const noUiSlider = isSlider 
                            ? application.ui.getNoUiSlider(el)
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
                                        if ( application.options.handlers != undefined ) {
                                            noUiSlider.on( eventName + ".ka",  application.options.handlers[ functionName ] );
                                        }
                                    }
                                    else {
                                        const confirmSelector = el.attr("rbl-action-confirm-selector");
                            
                                        if ( eventName == "click" && confirmSelector != undefined ) {
                                            const confirm = $(confirmSelector, application.element).html() || "";
                                            el.on( eventName + ".ka",  function() {
                                                const eventArgs = arguments;
                                                const that = this;
                                                return application.ui.onConfirmLinkClick(
                                                    $(this), 
                                                    confirm, 
                                                    function() {
                                                        if ( application.options.handlers != undefined ) {
                                                            application.options.handlers[ functionName ].apply(that, eventArgs )
                                                        }
                                                    }
                                                );
                                            } );
                                        }
                                        else {
                                            el.on( eventName + ".ka", function() {
                                                if ( application.options.handlers != undefined ) {
                                                    application.options.handlers[ functionName ].apply(this, arguments);
                                                }
                                            });
                                        }
                                    }
                                });
                            
                            el.attr("data-rblon-initialized", "true");

                            if ( ( el.attr("href") ?? "" ) == "" ) {
                                el.attr("href", "#");
                            }
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

                application.select(application.options.inputSelector)
                    .not(skipBindingInputSelector)
                    .each(function () {
                        $(this).off("change.RBLe").on("change.RBLe", function () {
                            that.changeRBLe($(this));
                        });
                    });
            }
        }

        unbindCalculationInputs(): void {
            const inputSelector = this.application.element.data("katapp-input-selector");

            if ( inputSelector !== undefined ) {
                this.application.select(inputSelector).off(".RBLe");
                this.application.element.removeData("katapp-input-selector")
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

        findNoUiSlider(id: string): noUiSlider.noUiSlider | undefined {
            const container = this.findNoUiSliderContainer(id);
            return container != undefined
                ? ( container[ 0 ] as noUiSlider.Instance )?.noUiSlider
                : undefined;
        }

        getNoUiSlider(container: JQuery<HTMLElement>): noUiSlider.noUiSlider | undefined {
            return container != undefined && container.length === 1
                ? ( container[ 0 ] as noUiSlider.Instance )?.noUiSlider
                : undefined;
        }

        findNoUiSliderContainer(id: string): JQuery<HTMLElement> | undefined {
            const sliderJQuery = this.application.select(".slider-" + id);
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
                    const traceCalcEngine = application.options.nextCalculation?.trace ?? false;
    
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
    
        getTabDef( tabDef?: string | null, calcEngine?: string | null ): TabDef | undefined {
            // Had to include | null because sometimes I call this with el.getAttribute(): string | null
            // instead of only $.attr(): string | undefined
            const results = this.application?.results;
            
            /*
            Have a little problem here...If client overrides a view that had two CEs configured, 
            but client only uses 1 CE to implement all functionality for view/templates, might need
            a mechanism to specify multiple keys for one CE so that templates/rbl-ce that reference the
            second CE key are able to still work, maybe comma delim list of keys??

            Original View
            [
                { key: "ce1", name: "ce1Name"},
                { key: "ce2", name: "ce2Name"}
            ]
    
            Client wants to do something like this
            [
                { key: "ce1", name: "clientCE"},
                { key: "ce2", name: "clientCE"}
            ]

            But this is bad b/c it'll run same calculation twice.  Would need to figure out how to not
            call two calcs.  
            
            Another problem is if the tab names don't match up...if view/template had...
    
            rbl-* attributes of ce1.tab1, ce2.tab2
    
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
            const rows = this.getResultTable<T>( tabDef, table );
    
            if (tabDef === undefined || rows === undefined) return undefined;
    
            if ( typeof key != "string" ) {
                // In case caller passes in diff type, my === below will not work
                key = key + "";
            }

            const rowLookups = tabDef._resultRowLookups || ( tabDef._resultRowLookups = {} );
    
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
    
        getRblSelectorValue( tabDef: TabDef | undefined, defaultTableName: string, selector: string ): string | undefined {
            if ( tabDef != undefined ) {
                const isExpression = selector.endsWith( "]" );
                let selectorParts: string[];

                if ( isExpression ) {
                    const expressionStart = selector.indexOf( "[" );

                    const expressionPrefix = expressionStart == 0
                        ? defaultTableName
                        : selector.substring( 0, expressionStart );
                    
                    // table[expression] - all rows until !undefined
                    // table.id[expression] - process single row by id
                    // table.searchCol.key[expression] - process single row by searchCol=key
                    selectorParts = expressionPrefix.split( "." );

                    if ( selectorParts.length > 3 ) {
                        this.application.trace( "Invalid selector length for [" + tabDef._fullName + ":" + selector + "]", TraceVerbosity.Quiet );
                        return undefined;
                    }
                }
                else {
                    selectorParts = selector.split('.');

                    if ( selectorParts.length > 4 ) {
                        this.application.trace( "Invalid selector length for [" + tabDef._fullName + ":" + selector + "]", TraceVerbosity.Quiet );
                        return undefined;
                    }
                }

                if ( isExpression && selectorParts.length === 1 ) {
                    const tableRows = this.getResultTable<JSON>( tabDef, selectorParts[ 0 ] );

                    if ( tableRows.length > 0 ) {
                        for (let index = 0; index < tableRows.length; index++) {
                            const row = tableRows[index];
                            const expressionValue = this.processTableRowExpression( selector, row, index );
                            
                            if ( expressionValue != undefined ) {
                                return expressionValue;
                            }
                        }
                    }
                }
                else {
                    let row: JSON | undefined = undefined;
                    const returnColumn = 
                        selectorParts.length == 3 ? selectorParts[2] :
                        selectorParts.length == 4 ? selectorParts[3] : "value";

                    if ( selectorParts.length === 1 ) 
                    {
                        row = this.getResultRow<JSON>( tabDef, defaultTableName, selectorParts[0] );
                    }
                    else if (selectorParts.length === 2) 
                    {
                        row = this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[1] );
                    }
                    else if (selectorParts.length === 3) 
                    {
                        row = isExpression
                            ? this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[2], selectorParts[1] )
                            : this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[1] );
                    }
                    else if (selectorParts.length === 4) // expression not supported
                    {
                        row = this.getResultRow<JSON>( tabDef, selectorParts[0], selectorParts[2], selectorParts[1] );
                    }
                    return row !== undefined 
                        ? isExpression
                            ? this.processTableRowExpression( selector, row, 0 )
                            : row[ returnColumn ] // ?? "" // Should this return blank if the 'row' is found b/c column isn't returned?
                        : undefined;
                }
            }
    
            return undefined;
        }
        
        processRblValues(showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            application.select("[rbl-value]")
                .each(function () {
                    let el = $(this);
        
                    if ( showInspector && !el.hasClass("kat-inspector-value") ) {
                        el.addClass("kat-inspector-value");
                        let inspectorTitle = "[rbl-value={value}]".format( { "value": el.attr('rbl-value') } );
                        const existingTitle = el.attr("title");
                        
                        if ( existingTitle != undefined ) {
                            inspectorTitle += "\nOriginal Title: " + existingTitle;
                        }
                        el.attr("title", inspectorTitle);
                    }
        
                    const ceKey = el.attr('rbl-ce');
                    const tabName = el.attr('rbl-tab');
                    const tabDef = that.getTabDef( tabName, ceKey )
                    const value = 
                        that.getRblSelectorValue( tabDef, "rbl-value", el.attr('rbl-value')! ) ?? // eslint-disable-line @typescript-eslint/no-non-null-assertion
                        that.getRblSelectorValue( tabDef, "ejs-output", el.attr('rbl-value')! ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        
                    if ( value != undefined ) {
                        if ( el.length === 1 ) {
                            el = application.ui.getAspNetCheckboxLabel( el ) ?? el;
                        }
        
                        el.html( value );

                        if ( value.indexOf( "rbl-tid" ) > -1 ) {
                            // In case the markup from CE has a template specified...
                            that.processRblSources(el, showInspector);                        
                        }
                    }
                    else {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: no data returned for tab=" + tabDef?._fullName + ", rbl-value=" + el.attr('rbl-value'), TraceVerbosity.Detailed);
                    }
                });
        }
    
        private getRblAttributeValueWithExpressions( el: JQuery<HTMLElement> ): { expressions: {}; rblAttr: string } {
            const format = "[...]",
                formatParts = /^([\S\s]+?)\.\.\.([\S\s]+)/,
                metaChar = /[-[\]{}()*+?.\\^$|,]/g,
                escape = function (str: string): string {
                    return str.replace(metaChar, "\\$&");
                };
        
            let rblAttrValue = el.attr("rbl-attr")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        
            if ( rblAttrValue.indexOf("[") == -1 ) {
                return {
                    expressions: {},
                    rblAttr: rblAttrValue
                }                    
            }

            // https://blog.stevenlevithan.com/archives/javascript-match-nested
            const p = formatParts.exec(format);
            if (!p) throw new Error("format must include start and end tokens separated by '...'");
            if (p[1] == p[2]) throw new Error("start and end format tokens cannot be identical");
        
            const opener = p[1],
                closer = p[2],
                /* Use an optimized regex when opener and closer are one character each */
                iterator = new RegExp(format.length == 5 ? "["+escape(opener+closer)+"]" : escape(opener)+"|"+escape(closer), "g"),
                results = []

            let openTokens, 
                matchStartIndex = 0,
                match;
        
            do {
                openTokens = 0;
                while (match = iterator.exec(rblAttrValue)) {
                    if (match[0] == opener) {
                        if (!openTokens) {
                            matchStartIndex = iterator.lastIndex;
                        }
                        openTokens++;
                    } else if (openTokens) {
                        openTokens--;
                        if (!openTokens)
                        {
                            results.push(
                                { 
                                    key: "_expression_" + ( results.length + 1 ), 
                                    expression: rblAttrValue.slice(matchStartIndex, match.index)
                                }
                            );                            
                        }
                    }
                }
            } while (openTokens && (iterator.lastIndex = matchStartIndex));
        
            const expressions = {};

            results.forEach(function (result) {
                rblAttrValue = rblAttrValue.replace( result.expression, result.key );
                expressions[ result.key ] = result.expression;
            });
        
            return {
                expressions: expressions,
                rblAttr: rblAttrValue
            }
        }
        
        processRblAttributes(showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            application.select("[rbl-attr]")
                .each(function () {
                    let el = $(this);
        
                    if ( showInspector && !el.hasClass("kat-inspector-attr") ) {
                        el.addClass("kat-inspector-attr");
                        let inspectorTitle = "[rbl-attr={value}]".format( { "value": el.attr('rbl-attr') } );
                        const existingTitle = el.attr("title");
                        
                        if ( existingTitle != undefined ) {
                            inspectorTitle += "\nOriginal Title: " + existingTitle;
                        }
                        el.attr("title", inspectorTitle);
                    }
        
                    const rblAttributesWithExpressions = that.getRblAttributeValueWithExpressions( el );

                    const rblAttributes = rblAttributesWithExpressions.rblAttr.split( " " );

                    // rbl-attr="attrName:selector"
                    // rbl-attr="attrName:selector:ce"
                    // rbl-attr="attrName:selector:ce:tab"
                    // rbl-attr="attrName:selector attrName2:selector ..."
                    rblAttributes.forEach( a => {
                        const attrParts = a.split(":");
                        const attrName = attrParts[ 0 ];
                        let attrSelector = attrParts[1];
                        const ceName = attrParts.length >= 3 ? attrParts[ 2 ] : undefined;
                        const tabName = attrParts.length >= 4 ? attrParts[ 3 ] : undefined;
                        const tabDef = that.getTabDef( tabName, ceName )
                        const expressionStart = attrSelector.indexOf("[");

                        if ( expressionStart > -1 ) {
                            // either [expression] or table[expression]
                            const expressionKey = 
                                attrSelector.substring(
                                    expressionStart + 1,
                                    attrSelector.lastIndexOf("]")
                                );

                            attrSelector = attrSelector.replace( expressionKey, rblAttributesWithExpressions.expressions[ expressionKey ] );
                        }

                        const value = 
                            that.getRblSelectorValue( tabDef, "rbl-value", attrSelector ) ??
                            that.getRblSelectorValue( tabDef, "ejs-output", attrSelector );
            
                        if ( value != undefined ) {
                            if ( el.length === 1 ) {
                                el = application.ui.getAspNetCheckboxLabel( el ) ?? el;
                            }

                            // rbl-attr="data-foo:fooValue" data-foo="Terry"
                            // Calc 1: fooValue = Aney
                            //  previous = undefined
                            //  currentValue = "Terry"
                            //  newValue = "Terry Aney"
                            // Calc 2: fooValue = Craig
                            //  previous = "Aney"
                            //  currentValue = "Terry Aney"
                            //  newValue = "Terry Craig"
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

        private isFalsy( value: string | undefined | boolean ): boolean {
            return value != undefined &&
                ( value === "0" || ( typeof( value ) == "string" && value.toLowerCase() === "false" ) || !value );
        }

        private processTableRowExpression( expression: string, row: JSON, index: number ): any { // eslint-disable-line @typescript-eslint/no-explicit-any
            let tableExpressionScript = expression.substring( expression.indexOf("[") + 1, expression.lastIndexOf("]") );

            if ( !tableExpressionScript.endsWith(";" ) ) {
                tableExpressionScript += ";";
            }
            const tableExpression =  function ( row: JSON, index: number, application: KatAppPlugIn ): any { // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                return eval(tableExpressionScript); 
            };
            return tableExpression.call(row, row, index, this.application);
        }

        processRblSources(root: JQuery<HTMLElement>, showInspector: boolean): void {
            const that: RBLeUtilities = this;
            const application = this.application;
            // If root itself is a templated item, I need to add (append) it to the list of
            // items to process, b/c selector below looking 'inside' root will not hit it.
            // The markup for this might look like:
            //
            //  <rbl-template tid="parent-template">
            //      <div rbl-source="child-rows" rbl-tid="child-template"></div>
            //  </rbl-template>
            application.select("[rbl-source]", root)
                .add(root.is("[rbl-source]") ? root : [] ) 
                .each(function () {
                    const el = $(this);
    
                    // Only process element if *not* flagged as a rbl-configui only item or if it actually is a Configuration UI calculation
                    if ( el.attr("rbl-configui") === undefined || application.calculationInputs?.iConfigureUI === 1 ) {
    
                        const elementData = application.dataAttributesToJson(el, "data-");
                        const tid = el.attr('rbl-tid');
                        const sourceCE = el.attr('rbl-ce');
                        const sourceTab = el.attr( "rbl-tab" );
                        const tabDef = that.getTabDef( sourceTab, sourceCE )
                        const tabDefName = tabDef?._fullName ?? sourceCE + "." + sourceTab;
                        const rblSource = el.attr('rbl-source-table') ?? el.attr('rbl-source') ?? "NOSOURCE";
                        const isTableExpression = rblSource.indexOf("[") > -1;
                        
                        if ( el.attr('rbl-source-table') != undefined ) {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: rbl-source-table in tab " + tabDefName + " no longer supported.", TraceVerbosity.Detailed);
                        }

                        // rbl-source:
                        // tableName - all rows
                        // tableName.idValue - row where @id = idValue
                        // tableName.columnName.columnValue - rows where columnName = columnValue
                        // tableName[javascript] - rows where javascript expression evaluates to true
                        const rblSourceParts = 
                            isTableExpression 
                                ? [ rblSource ]
                                : rblSource.split('.');
    
                        const tableName = rblSourceParts[0].split("[")[ 0 ];
                        const template = tid != undefined 
                            ? application.ui.getTemplate( tid, elementData, false )
                            : undefined;
                        const templateContent = template != undefined 
                            ? template.TemplatedContent 
                            : undefined;
    
                        if ( showInspector && !el.hasClass("kat-inspector-source") ) {
                            el.addClass("kat-inspector-source");
                            const inspectorData = { 
                                "id": tid ?? "[ID MISSING!]",
                                "name": "rbl-source", 
                                "value": el.attr("rbl-source"),
                                "template": templateContent ?? "[No template found]"
                            };
                            let inspectorTitle = "Template: {id}\n{name}: {value}\n\n{template}".format( inspectorData );
                            const existingTitle = el.attr("title");
                            
                            if ( existingTitle != undefined ) {
                                inspectorTitle += "\nOriginal Title: " + existingTitle;
                            }
                            el.attr("title", inspectorTitle);
                        }
            
                        if ( tid === undefined || template === undefined || templateContent === undefined ) {
                            // Result tables are processed later
                            if ( el.attr("rbl-tid") !== "result-table" ) {
                                application.trace("<b style='color: Red;'>RBL WARNING</b>: Template content could not be found. Tab = " + tabDefName + " [" + ( tid ?? "Missing rbl-tid for " + el.attr('rbl-source') ) + "]", TraceVerbosity.Detailed);
                            }
                        }
                        else if ( rblSourceParts.length > 3 ) {
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: Invalid length for rblSourceParts=" + rblSourceParts.join("."), TraceVerbosity.Detailed);
                        }
                        else {
                            let showEmptyTemplate = true;

                            // table in array format.  Clear element, apply template to all table rows and .append                            
                            const tableRows = that.getResultTable<JSON>( tabDef, tableName );
                            
                            if ( tableRows.length > 0 ) {
                                const templateDefaults = application.dataAttributesToJson(el, "default-");

                                // tableName.idValue - row where @id = idValue
                                const rblSourceId = rblSourceParts.length == 2 ? rblSourceParts[1] : undefined;

                                // Get a 'data' row with all values cleared out so that rows with blanks in CE
                                // (which aren't exported) are properly handled in templates
                                const firstRow = KatApp.extend( {}, tableRows[0] );
                                if (Object.keys(firstRow).length > 0) {
                                    for (const propertyName in firstRow) {
                                        firstRow[propertyName] = "";
                                    }
                                }
                                const firstRowSource = KatApp.extend( {}, firstRow, templateDefaults );

                                const appendTemplateResult = function( templateData: object, templateContent: string, dest: JQuery<HTMLElement>, prepend: boolean, prependBeforePreserve: boolean ): void {
                                    try {
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
    
                                        that.application.ui.ensureTemplateScript( template.Template, el );
    
                                        // Nested templates
                                        that.application.ui.injectTemplatesWithoutSource(el, showInspector);
                                        // Nested rbl-source templates
                                        that.processRblSources(el, showInspector);
                                        
                                        const templateResult = hasRoot ? el : el.children();
    
                                        $.fn.KatApp.currentView = application.element;
                                        
                                        if ( prepend ) {
                                            dest.prepend( templateResult );
                                        }
                                        else if ( prependBeforePreserve ) {
                                            templateResult.insertBefore( application.select(".rbl-preserve", dest).first() );
                                        }
                                        else {
                                            dest.append( templateResult );
                                        }
                                    } finally {
                                        $.fn.KatApp.currentView = undefined;
                                    }
                                };

                                if ( rblSourceId != undefined ) {
                                    const rowSource = that.getResultRow<JSON>( tabDef, tableName, rblSourceId );
                                    
                                    if ( rowSource !== undefined ) {
                                        showEmptyTemplate = false;

                                        el.children()
                                            .not(".rbl-preserve")
                                            .remove();

                                        appendTemplateResult(KatApp.extend( {}, rowSource ), templateContent, el, false, false);
                                    }
                                }
                                else {
                                    el.children()
                                        .not(".rbl-preserve")
                                        .remove();

                                    const prepend = el.attr('rbl-prepend') === "true";
                                    const prependBeforePreserve = el.attr('rbl-prepend') === "before-preserve";
                                    const rblSourceHasColumnCondition = rblSourceParts.length === 3;
                                    const rblSourceColToCompare = rblSourceHasColumnCondition ? rblSourceParts[ 1 ] : "";
                                    const rblSourceColValue = rblSourceHasColumnCondition ? rblSourceParts[ 2 ] : undefined;

                                    tableRows.forEach( ( row, index ) => {
                                        // tableName - process all
                                        // tableName[expression] - process if expression returns !falsy
                                        // tableName.columnName.columnValue - rows where columnName = columnValue
                                        const processTableRow = isTableExpression
                                            ? !that.isFalsy( that.processTableRowExpression( rblSourceParts[ 0 ], row, index ) )
                                            : !rblSourceHasColumnCondition || row[ rblSourceColToCompare ] == rblSourceColValue;

                                        if ( processTableRow ) {
                                            showEmptyTemplate = false;

                                            // Automatically add the _index0 and _index1 for carousel template
                                            // const templateData = KatApp.extend( {}, row, { _index0: index, _index1: index + 1 } )
                                            appendTemplateResult(KatApp.extend( {}, row, { _index0: index, _index1: index + 1 } ), templateContent, el, prepend, prependBeforePreserve);
                                        }
                                    });
                                }
                            }

                            if ( showEmptyTemplate && application.select(".rbl-preserve", el).length == 0 ) {
                                // If no data source (and no previous preserves there), show/append the 'empty' template
                                const emptyTemplateId = el.attr("rbl-empty-tid");
                                const emptyTemplate = emptyTemplateId != undefined
                                    ? application.ui.getTemplate( emptyTemplateId, {}, false )?.TemplatedContent
                                    : undefined;

                                if ( emptyTemplate != undefined ) {
                                    const et = $(emptyTemplate);
                                    el.children().remove();
                                    el.append(et);
                                }
                            }
                        }
                    }
                });
        }
    
        getSimpleExpression(simpleExpression: string): { selector: string; operator: string; left: string | undefined; right: string; isNumber: boolean; evaluate: ( value: string | undefined )=> string | undefined } | undefined {
            const simpleExpressionParts = simpleExpression.split(".");
            const expression = simpleExpressionParts[ simpleExpressionParts.length - 1]            

            // Check to see if there's an "=" for a simple equality expression
            // If rblDisplay = table.id.col=value, rblDisplayParts is: table, id, col=value
            // so split the last item and if expression is present, change the last part of 
            // expression from col=value to just col so getRblSelectorValue returns correct
            // value, and can be passed to generated expression
            const isInequality = expression.indexOf("!=") > -1;
            const isLTE = expression.indexOf("<=") > -1;
            const isLT = !isLTE && expression.indexOf("<") > -1;
            const isGTE = expression.indexOf(">=") > -1;
            const isGT = !isGTE && expression.indexOf(">") > -1;

            const splitOperator =
                isInequality ? '!=' : 
                isLTE ? '<=' :
                isLT ? '<' :
                isGTE ? '>=' :
                isGT ? '>' : '=';

            const expressionParts = expression.split(splitOperator);

            // If complex expression, return undefined
            if ( !simpleExpression.startsWith( "v:" ) && simpleExpression.indexOf("[") > -1 && expressionParts[ expressionParts.length - 1 ].indexOf("[") == -1 ) return undefined;
            
            if ( expressionParts.length == 2 ) {
                // Remove the 'expression' from the parts and change it
                // to just have the 'field' (removing 'operator value')
                simpleExpressionParts.pop();
                simpleExpressionParts.push(expressionParts[ 0 ]);

                return {
                    selector: simpleExpressionParts.join("."),
                    operator: splitOperator == "=" ? "==" : splitOperator,
                    left: simpleExpression.startsWith( "v:" ) ? simpleExpression.substring( 2, simpleExpression.lastIndexOf( splitOperator ) ) : undefined,
                    right: expressionParts[ 1 ],
                    isNumber: isLTE || isLT || isGTE || isGT,
                    evaluate: function( value ): string | undefined {
                        if ( value == undefined ) return undefined;

                        const expression = this.isNumber || value.startsWith("'")
                            ? "{v1} {op} {v2}".format( { v1: value, op: this.operator, v2: this.right } )
                            : "\"{v1}\" {op} \"{v2}\"".format( { v1: value, op: this.operator, v2: this.right } );

                        return eval(expression) as boolean ? "1" : "0";
                    }
                };
            }

            return undefined;
        };

        private processRblFalseyAttribute( showInspector: boolean, attributeName: string, legacyTable: string, processFalsey: ( el: JQuery<HTMLElement>, value: boolean )=> void ): void {
            const that: RBLeUtilities = this;
            const application = this.application;
    
            application.select("[" + attributeName + "]")
                .each(function () {
                    const el = $(this);
                    const attributeValue = el.attr(attributeName);

                    // rbl-display/rbl-disable - current support
                    // id - attributeName[@id=id]/value || legacyTable[@id=id]/value returns falsy
                    // table.idValue - table[@id=idValue]/value returns falsy
                    // table.idValue.column - table[@id=idValue]/column returns falsy
                    // table.keyColumn.keyValue.column - table[keyColumn=keyValue]/column returns falsy
                    
                    // Simple Expressions:
                    // 1) Any of the above formats with {operator}{value} appended to last part of selector
                    //      segment.  i.e. id=1, table.idValue.column>2, etc.
                    //
                    // 2) v:tValue1 op tValue2 - usually only used templates and would originally be 
                    //      written as v:{templateCol}=someVal and {templateCol} would be replaced during
                    //      template processing, then evaluated when rbl-display processed.
                    //
                    // Complex Expressions - [expression] or table[expression]:
                    // Process until expression returns != undefined, then evaluate.
                    if ( attributeValue != undefined ) {
                        const inspectorClass = "kat-inspector-" + attributeName.split("-")[ 1 ];
                        if ( showInspector && !el.hasClass(inspectorClass) ) {
                            el.addClass(inspectorClass);
                            let inspectorTitle = "[{name}={value}]".format( { name: attributeName, value: attributeValue } );
                            const existingTitle = el.attr("title");
                            
                            if ( existingTitle != undefined ) {
                                inspectorTitle += el.hasClass( "kat-inspector-value" )
                                    ? "\n" + existingTitle
                                    : "\nOriginal Title: " + existingTitle;
                            }
                            el.attr("title", inspectorTitle);
                        }
            
                        // Visibilities created inside templated results should use the source CE of parent *inline* template to look for rbl-display items
                        let templateSource = el.attr( "rbl-ce" ) == undefined || el.attr("rbl-tab") == undefined
                            ? that.application.closest(el, "[rbl-source][rbl-tid^='_t_']")
                            : undefined;

                        const ceKey = el.attr('rbl-ce') ?? templateSource?.attr("rbl-ce");
                        const tabName = el.attr('rbl-tab') ?? templateSource?.attr("rbl-tab")
                        const tabDef = that.getTabDef( tabName, ceKey )

                        if ( tabDef != undefined ) {
                            const simpleExpression = that.getSimpleExpression(attributeValue);

                            let resultValue = 
                                simpleExpression?.left ??
                                that.getRblSelectorValue( tabDef, attributeName, simpleExpression?.selector ?? attributeValue ) ??
                                that.getRblSelectorValue( tabDef, legacyTable, simpleExpression?.selector ?? attributeValue );
                
                            // Reassign the value you are checking if they are using simple expressions
                            // by passing in the value from getRblSelectorValue to the expression created
                            // originally by {operator}{value} and it will return 1 or 0.
                            if ( simpleExpression != undefined ) {
                                resultValue = simpleExpression.evaluate(resultValue);
                            }

                            if (resultValue != undefined) {
                                processFalsey( el, that.isFalsy( resultValue ) );
                            }
                        }
                        else {
                            const tabDefName = ( ceKey ?? application.defaultCalcEngineKey ) + "." + ( tabName ?? "default" );
                            application.trace("<b style='color: Red;'>RBL WARNING</b>: no tab found for " + tabDefName + ", " + attributeName + "=" + attributeValue, TraceVerbosity.Detailed);
                        }
                    }
                });
        }

        processRblDisabled( showInspector: boolean): void {
            this.processRblFalseyAttribute(
                showInspector,
                "rbl-disabled",
                "ejs-disabled",
                ( el, value ) => {
                    const isListContainer = el.hasClass("list-container");
                    const isSlider = el.data("slider-type") == "nouislider";                    
                    const isInput = el.is(":input");
                    const useClass = !isListContainer && !isSlider && !isInput;

                    const target = isListContainer
                        ? $("input", el) // check/radio list
                        : el;

                    if ( !value ) {
                        if ( useClass ) {
                            target.addClass("disabled");
                        }
                        else {
                            target.prop("disabled", true).removeAttr("kat-disabled");
                        }
                    }
                    else {
                        if ( useClass ) {
                            target.removeClass("disabled");
                        }
                        else {
                            target.prop("disabled", false);
                        }
                    }
                    
                    if (target.attr("data-kat-bootstrap-select-initialized") !== undefined) {
                        target.selectpicker('refresh');
                    }
                }
            );
        }

        processRblDisplays( showInspector: boolean): void {
            this.processRblFalseyAttribute(
                showInspector,
                "rbl-display",
                "ejs-visibility",
                ( el, value ) => {
                    if ( value ) {
                        // couldn't use .hide() because elements with 
                        // 'flex' display had important on it
                        el.attr('style','display:none !important');
                    }
                    else {
                        el.show();
                    }
                }
            );
        }
    
        processRBLSkips( tabDef: TabDef ): void {
            // Legacy, might not be needed (what class do you want me to drop in there)
            let skipRows = this.getResultTable<RBLeRowWithId>( tabDef, "rbl-skip" );

            if ( skipRows.length == 0 ) {
                skipRows = this.getResultTable<RBLeRowWithId>( tabDef, "skip-RBLe" );
            }

            const application = this.application;
    
            skipRows.forEach( row => {
                const selector = application.ui.getJQuerySelector( row["key"] || row["@id"] );
                if ( selector !== undefined ) {
                    const el = application.select(selector);
                    
                    el.addClass("rbl-nocalc").off(".RBLe");
                    $(":input", el).off(".RBLe");
                    // leave update.RBLe (for updating label) and change.RBLe (for keeping 'wizard sliders' in sync) on...
                    this.application.ui.getNoUiSlider( application.select("div[data-slider-type='nouislider']", el.parent()) )?.off('set.RBLe');
                }
            });
        }
    
        setInput( id: string, value: string | undefined ): void {
            const selector = this.application.ui.getJQuerySelector( id );
    
            if ( selector !== undefined ) {
                value = value ?? "";
                this.application.select(selector + "DisplayOnly").html(value);
                const input = this.application.select(selector).not("div");
                const listControl = this.application.select(selector + "[data-itemtype]");
                const isCheckboxList = listControl.data("itemtype") == "checkbox";
                const isRadioList = listControl.data("itemtype") == "radio";
                const aspCheckbox = this.application.ui.getAspNetCheckboxInput(input);
                const radioButtons = isRadioList ? $("input", listControl) : $("input[type='radio']", input);
                const noUiSlider = this.application.ui.findNoUiSlider(id);
    
                if ( noUiSlider !== undefined ) {
                    const sliderContainer = this.application.ui.findNoUiSliderContainer(id);
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
    
                    if (input.attr("data-kat-bootstrap-select-initialized") !== undefined) {
                        input.selectpicker("refresh");
                    }
                }
                else {
                    this.application.trace("<b style='color: Red;'>RBL WARNING</b>: No rbl-default input can be found for " + id, TraceVerbosity.Detailed);
                }
            }
        }
    
        processDefaults( tabDef: TabDef ): void {
            let defaultRows = this.getResultTable<RBLeDefaultRow>( tabDef, "rbl-defaults" );
    
            if ( defaultRows.length == 0 ) {
                defaultRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-defaults" );
            }

            defaultRows.forEach( row => {
                const id = row["@id"];
                this.setInput(id, row.value);
            });
        }
    
        processVisibilities( tabDef: TabDef ): void {
            const application = this.application;
            const visibilityRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-visibility" );
            visibilityRows.forEach( row => {
                const selector = application.ui.getJQuerySelector( row["@id"] ) + ", [rbl-display='" + row["@id"] + "']";
                if ( selector !== undefined ) {
                    if (row.value === "1") {
                        application.select(selector).show();
                    }
                    else {
                        application.select(selector).hide();
                    }
                }
            });
        }

        processDisabled( tabDef: TabDef ): void {
            const application = this.application;
            let disabledRows = this.getResultTable<RBLeDefaultRow>( tabDef, "rbl-disabled" );            

            if ( disabledRows.length == 0 ) {
                disabledRows = this.getResultTable<RBLeDefaultRow>( tabDef, "ejs-disabled" );
            }
    
            disabledRows.forEach( row => {
                const id = row["@id"];
                const selector = this.application.ui.getJQuerySelector( id );
    
                if ( selector !== undefined ) {
                    // @id - regular input
                    // @id input - checkbox and list controls
                    // slider-@id - noUiSlider
                    const value = row.value ?? "";
                    const target = 
                        this.application.ui.findNoUiSliderContainer( id ) ??
                        application.select(selector + ":not(div), " + selector + " input");

                    if (value === "1") {
                        target.prop("disabled", true).removeAttr("kat-disabled");
                    }
                    else {
                        target.prop("disabled", false);
                    }

                    if (target.attr("data-kat-bootstrap-select-initialized") !== undefined) {
                        target.selectpicker('refresh');
                    }
        
                    if ( target.length == 0 ) {
                        application.trace("<b style='color: Red;'>RBL WARNING</b>: No rbl-disabled input can be found for " + id, TraceVerbosity.Detailed);
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
            const that: RBLeUtilities = this;
    
            application.select("[rbl-tid='result-table']")
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
        
                        const getBootstrapColumnCss = function( c: ResultTableColumnConfiguration ): string {
                            let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
                            bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
                            bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
                            bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";

                            return bsClass.trim();
                        }
                        const getBootstrapSpanColumnCss = function( start: number, length: number ): string {
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
            const highchartsBuilder: HighchartsBuilder = new HighchartsBuilder( this.application );
    
            if ( typeof Highcharts !== "object" && this.application.select('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]').length > 0 ) {
                this.application.trace("Highcharts javascript is not present", TraceVerbosity.None);
                return;
            }            
    
            this.application.select('[rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]')
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
                const bootstrapVersion = this.application.bootstrapVersion;
                errors.forEach( r => {
                    const selector = this.application.ui.getJQuerySelector( r["@id"] );
                    let input = selector !== undefined 
                        ? this.application.select(selector)
                        : undefined;

                    if ( input != undefined && input.length == 2 ) {
                        // bootstrap select
                        input = input.not("div");
                    }
                    this.addValidationItem(summary, input, r.text, bootstrapVersion);
                });
            }
        }
    
        initializeValidationSummaries(): void {
            const errorSummary = this.application.select("#" + this.application.id + "_ModelerValidationTable");
            let warningSummary = this.application.select("#" + this.application.id + "_ModelerWarnings");
    
            // TODO: See Bootstrap.Validation.js - need to process server side validation errors to highlight the input correctly
    
            if (warningSummary.length === 0 && errorSummary.length > 0 ) {
                // Warning display doesn't exist yet, so add it right before the error display...shouldn't have errors and warnings at same time currently...
                warningSummary = $("<div id='" + this.application.id + "_ModelerWarnings' style='display: none;' class='validation-warning-summary alert alert-warning' role='alert'><p><i class='far fa-exclamation-triangle'></i> <span class='sr-only'>Warnings</span> Please review the following warnings: </p><ul></ul></div>");
                $(warningSummary).insertBefore(errorSummary);
            }            
    
            this.application.select('.validator-container.error').not(".server, .apiAction").removeClass('error');
            this.application.select('.validator-container.warning').not(".server, .apiAction").removeClass('warning');
    
            [ warningSummary, errorSummary ].forEach( summary => {
                // Remove all RBLe client side created errors since they would be added back
                $("ul li.rble", summary).remove();
            });

            // Re-render with nothing in summary that shouldn't be there
            this.finalizeValidationSummaries( false );
        }
        
        finalizeValidationSummaries( scrollToSummary = true ): void {
            const errorSummary = this.application.select("#" + this.application.id + "_ModelerValidationTable");
            const warningSummary = this.application.select("#" + this.application.id + "_ModelerWarnings");
    
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
            const errorSummary = this.application.select("#" + this.application.id + "_ModelerValidationTable");
            const warningSummary = this.application.select("#" + this.application.id + "_ModelerWarnings");
    
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
            let sliderRows = this.getResultTable<SliderConfigurationRow>( tabDef, "rbl-sliders" );
            if ( sliderRows.length == 0 ) {
                sliderRows = this.getResultTable<SliderConfigurationRow>( tabDef, "ejs-sliders" );
            }

            const application = this.application;
            
            if ( typeof noUiSlider !== "object" && sliderRows.length > 0 ) {
                application.trace("noUiSlider javascript is not present for " + tabDef._fullName, TraceVerbosity.None);
                return;
            }
    
            sliderRows.forEach( config => {
                const id = config["@id"];
    
                const sliderJQuery = application.select(".slider-" + id);
    
                if ( sliderJQuery.length !== 1 ) {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No slider div can be found for " + id, TraceVerbosity.Detailed);
                }
                else {
                    const minValue = Number( config.min );
                    const maxValue = Number( config.max );
        
                    const input = application.select("." + id);
    
                    const defaultConfigValue =
                        this.getResultValue( tabDef, "rbl-defaults", id, "value") || // what is in this table?
                        this.getResultValue( tabDef, "ejs-defaults", id, "value") || 
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
                        ? application.select("." + targetInput).val() as string
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
                            application.select("." + id + "Label, .sv" + id).html( String.localeFormat("{0:" + format + decimals + "}", v) );
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
                                    const targetSlider = application.select(".slider-" + targetInput);
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
            let configRows = this.getResultTable<ListControlRow>( tabDef, "rbl-listcontrol" );

            if ( configRows.length == 0 ) {
                configRows = this.getResultTable<ListControlRow>( tabDef, "ejs-listcontrol" );
            }

            configRows.forEach( row => {
                const tableName = row.table;
                const controlName = row["@id"];
                
                const dropdown = application.select("." + controlName).not("div");
                const listControl = application.select("div." + controlName + "[data-itemtype]");
                const listRows = this.getResultTable<ListRow>( tabDef, tableName );
    
                if ( listControl.length === 1 ) {
                    ui.processListItems(
                        listControl,
                        row.rebuild == "1",
                        listRows.map( r => ({ Value: r.key, Text: r.text, Help: r.help, Selected: false, Visible: r.visible != "0", Disabled: r.disabled == "1" }))
                    );
                }
                else if ( dropdown.length === 1 ) {
                    ui.processDropdownItems(
                        dropdown, 
                        row.rebuild == "1",
                        listRows.map( r => ({ Value: r.key, Text: r.text, Class: r.class, Subtext: r.subtext, Html: r.html, Selected: false, Visible: r.visible != "0" }))
                    );
                }
                else {
                    application.trace("<b style='color: Red;'>RBL WARNING</b>: No rbl-listcontrol can be found for " + controlName, TraceVerbosity.Detailed);
                }
            });
        }
    
        processResults( results: TabDef[] | undefined, calculationOptions: KatAppOptions ): boolean {
            const application = this.application;

            if ( results !== undefined ) {
                const showInspector = application.calculationInputs?.iConfigureUI === 1 && ( calculationOptions.debug?.showInspector ?? false );
                
                this.initializeValidationSummaries();

                results.forEach(tabDef => {
                    application.trace( "Processing results for " + tabDef._fullName + "(" + tabDef["@version"] + ")", TraceVerbosity.Normal );
    
                    // Need two passes to support "rbl-markup" because the markup might render something that 
                    // is then processed by subsequent flow controls (ouput, sources, or values)
                    let markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "ejs-markup" )

                    if ( markUpRows.length == 0 ) {
                        markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "rbl-markup" )
                    }

                    markUpRows.forEach( resultRow => { 
                        const processBlank = false;
                        let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
                        const selector = 
                            this.application.ui.getJQuerySelector( resultRow.selector ) ?? 
                            this.application.ui.getJQuerySelector( resultRow["@id"] ) ?? "";
                
                        if (( processBlank || content.length > 0 ) && selector.length > 0) {
                
                            let target = this.application.select(selector);
                
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
                                    target.append(content);
                                }
                            }
                        }
                    });
                });
    
                // Run all *pull* logic outside of tabdef loop, this has to be after all markup
                // rows have been processed and all rbl-markup in case they injected 'rbl-' items
                // in markup that has to be processed
                application.trace( "Processing all results 'pull' logic", TraceVerbosity.Normal );

                this.application.ui.injectTemplatesWithoutSource(this.application.element, showInspector);
                this.processRblSources( this.application.element, showInspector );
                this.processRblValues( showInspector );
                this.processRblAttributes( showInspector );
                this.processTables();
                this.processCharts();
    
                // Need to re-run processUI here in case any 'templates/inputs' were injected from 
                // results and need their initial data-* attributes/events processed.
                this.application.templateBuilder.processUI();
    
                // These all need to be after processUI so if any inputs are built
                // from results, they are done by the time these run
                this.processRblDisplays( showInspector );
                this.processRblDisabled( showInspector );

                let sliderConfigIds: ( string | null )[] = [];
    
                // Now loop again to run rest of 'push' items from each tab.  This has to
                // be after all html updates from prior loop and from any possible template 
                // processing that happens in rbl-source processing
                results.forEach(tabDef => {
                    let markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "rbl-markup" )
                    if ( markUpRows.length == 0 ) {
                        markUpRows = this.getResultTable<HtmlContentRow>( tabDef, "ejs-markup" );
                    }

                    // Apply dynamic classes after all html updates 
                    markUpRows.forEach( r => {
                        if ( r.selector !== undefined ) {
                            if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                                const el = application.select(r.selector);
                                const classValue = r.addclass.replace("skipRBLe", "rbl-nocalc");
                                el.addClass(classValue);
    
                                if ( classValue.indexOf("rbl-nocalc") > -1 ) {
                                    el.off(".RBLe");
                                    $(":input", el).off(".RBLe");
                                    this.application.ui.getNoUiSlider( $("div[data-slider-type='nouislider']", el.parent()) )?.off('.RBLe');
                                }
                            }
        
                            if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                                application.select(r.selector).removeClass(r.removeclass);
                            }
                        }
                    });

                    // Debug info - just getting all sliderConfigIds
                    if ( application.calculationInputs?.iConfigureUI === 1 ) {
                        let sliderRows = this.getResultTable<SliderConfigurationRow>( tabDef, "rbl-sliders" );
                        if ( sliderRows.length == 0 ) {
                            sliderRows = this.getResultTable<SliderConfigurationRow>( tabDef, "ejs-sliders" );
                        }
                        sliderConfigIds = sliderConfigIds.concat( sliderRows.map( r => r["@id"]) );
                    }                
        
                    // Should removed after rbl-display attribute is on all items
                    this.processVisibilities( tabDef );
                    this.processSliders( tabDef )
                    this.processRBLSkips( tabDef );
                    this.processListControls( tabDef );
                    this.processDefaults( tabDef );
                    // Should removed after rbl-disable attribute is on all items
                    this.processDisabled( tabDef );
                    this.processValidations( tabDef );
                    
                    this.application.ui.handleVoidAnchors();
                    this.application.ui.bindRblOnHandlers();

                    application.trace( "Finished processing results for " + tabDef._fullName, TraceVerbosity.Normal );
                });
    
                if ( application.calculationInputs?.iConfigureUI === 1 ) {
                    application.select('div[data-slider-type="nouislider"]')
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
                // FindDr has: 
                //  function ( event ) { $(\".iChartClick\").val( event.point.id ).trigger('change'); }
                // Only works if I DON'T have the (event) in my code, so substring after ( didn't work
                // and only substring after { worked. 
				// const f = 
                //  this.removeRBLEncoding("function f {function} f.call(this);"
                //      .format( { function: value.substring(value.indexOf("(")) } ));
                // https://bitbucket.org/benefittechnologyresources/katapp/commits/f81b20cb5d76b24d92579613b2791bbe37374eb2#chg-client/KatAppProvider.ts
                //
                // **BUT** I don't understand how 'event' (or other parms described in Highcharts documentation) 
                // are available when they aren't really mentioned anywhere.
                // **NOTE**: Also, if I simply use what's inside { } instead of the function f() { ... } f.call(this);
                //           it also seems to work.
                const f = 
                    this.removeRBLEncoding("function f() {function} f.call(this);"
                        .format( { function: value.substring(value.indexOf("{")) } ));				

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
                const overrideRows = application.rble.getResultTable<HighChartsOverrideRow>( tabDef, "HighCharts-Overrides").filter( r => KatApp.stringCompare(r["@id"], dataName, true) === 0);
                const optionRows = application.rble.getResultTable<HighChartsOptionRow>( tabDef, "HighCharts-" + optionsName + "-Options");
                const allDataRows = application.rble.getResultTable<HighChartsDataRow>( tabDef, "HighCharts-" + dataName + "-Data");
                const dataRows = allDataRows.filter(e => !(e.category || "").startsWith("config-"));
                const seriesConfigurationRows = allDataRows.filter(e => (e.category || "").startsWith("config-"));

                if ( dataRows.length > 0 ) {
                    this.ensureCulture();
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
            this.processModalLinks( container );
            this.processNestedApplications( container );
        }

        processHelpTips( container?: JQuery<HTMLElement> ): void {
            // Couldn't include the Bootstrap.Tooltips.js file b/c it's selector hits entire page, and we want to be localized to our view.
            const selector = ".error-msg[data-toggle='tooltip'], .error-msg[data-bs-toggle='tooltip'], [data-toggle='popover'], [data-bs-toggle='popover']";
            const application = this.application;
            const view = container ?? application.element;
            const isBootstrap3 = this.application.bootstrapVersion == 3;

            if ( typeof $.fn.popover !== "function" && application.select(selector, view).length > 0 ) {
                this.application.trace("Bootstrap popover/tooltip javascript is not present", TraceVerbosity.None);
                return;
            }

            application.select(selector, view)
                .not('.rbl-help, [data-katapp-initialized="true"]')
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
                            const t = $(trigger);
                            let dataClass = t.data('class');
                            if (dataClass != undefined) {
                                $(tooltip).addClass(dataClass);
                            }
            
                            // Did they specify a data-width?
                            dataClass = t.data('width') || t.data('bs-width');
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
                                const title = application.select(titleSelector + "Title").html();
                                if (( title ?? "" ) != "" ) {
                                    return title;
                                }
                            }                    
                            return "";            
                        },
                        content: function () {
                            // See if they specified data-content directly on trigger element.
                            const h = $(this);
                            const dataContent = h.data('content') ?? h.data('bs-content');
                            const dataContentSelector = h.data('content-selector');
                            let content = dataContent == undefined
                                ? dataContentSelector == undefined ? h.next().html() : application.select(dataContentSelector, view).html()
                                : dataContent as string;
            
                            // Replace {Label} in content with the trigger provided...used in Error Messages
                            const labelFix = h.data("label-fix");
            
                            if (labelFix != undefined) {
                                content = content.replace(/\{Label}/g, application.select("." + labelFix, view).html());
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
                                    $(templateId).removeClass("error").addClass("warning");
                                }
                            });
                    }
                    else {
                        $(this)
                            .popover(options)
                            .on('inserted.bs.popover', function (e) {
                                const templateId = "#" + $(e.target).attr("aria-describedby");
                                const currentPopover = $(templateId);
                                currentPopover.attr("data-katapp-popover", "true");

                                $("[rbl-action-link]", currentPopover).attr("data-katapp-initialized", "false");
                                $("[rbl-on]", currentPopover).attr("data-rblon-initialized", "false");

                                application.templateBuilder.processActionLinks(currentPopover);
                                application.ui.bindRblOnHandlers(currentPopover);
                            });
                    }
                                
                })
                .attr("data-katapp-initialized", "true");

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
            application.select('.checkbox label a[data-toggle], .checkbox label a[data-bs-toggle], .abc-checkbox label a[data-toggle], .abc-checkbox label a[data-bs-toggle]', view)
                .not("[data-katapp-checkbox-tips-initialized='true']")
                .on('click', function (e) {
                    e.stopPropagation();
                    return false;
                })
                .attr("data-katapp-checkbox-tips-initialized", "true");
        }

        processNavigationLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const application = this.application;

            application.select('[rbl-navigate]', view)
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    if ( this.tagName == "A" ) {
                        $(this).attr("href", "#");
                    }
                    $(this).on("click.RBLe", function(e) {
                        const actionLink = $(this);
                        e.preventDefault();

                        const id = actionLink.attr("rbl-navigate");
                        const inputSelector = actionLink.attr("rbl-navigate-input-selector");
                        const dataInputs = application.dataAttributesToJson( actionLink, "data-input-" );
                        const persistInputs = ( actionLink.attr("rbl-navigate-persist-inputs") ?? "true" ) != "false";

                        if ( dataInputs != undefined || inputSelector != undefined ) {
                            application.setNavigationInputs( dataInputs, id, persistInputs, inputSelector );
                        }

                        application.ui.triggerEvent( "onKatAppNavigate", id, this );
                        return false;
                    }).attr("data-katapp-initialized", "true");
                });
        }
        
        processNestedApplications( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const application = this.application;
            const that = this;
            
            application.select('[rbl-app]', view)
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const nestedApp = $(this);
                    const applicationId = nestedApp.attr("rbl-app");

                    if ( applicationId != undefined ) {
                        let url = "api/rble/verify-katapp-modal?applicationId=" + applicationId;
                        const serviceUrlParts = application.options.sessionUrl?.split( "?" );
            
                        if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                            url += "&" + serviceUrlParts[ 1 ];
                        }
                                                
                        $.ajax( {
                            method: "GET",
                            url: url,
                            dataType: "json"
                        }).then(
                            function( result ) {
                                const successResponse = result as KatAppActionResult;
                        
                                const nestedAppOptions = 
                                    KatApp.extend( {}, 
                                        application.options, 
                                        { 
                                            view: successResponse[ "Path" ], 
                                            currentPage: applicationId,
                                            manualInputs: application.dataAttributesToJson( nestedApp, "data-input-" ) 
                                        }
                                    );

                                delete nestedAppOptions["calcEngines"]; // So it doesn't use parent CE

                                nestedApp.KatApp( nestedAppOptions );                                    
                            },
                            function( xhr ) {
                                console.log( xhr );
                                application.trace("Unable to create nested KatApp (" + applicationId + ").", TraceVerbosity.None);
                            }
                        ).always(
                            function() {
                                nestedApp.attr("data-katapp-initialized", "true");
                            }
                        );
                    }
                });
        }
        
        processModalLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const application = this.application;
            const that = this;
            
            application.select('[rbl-modal]', view)
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    if ( this.tagName == "A" ) {
                        $(this).attr("href", "#");
                    }
                    $(this).on("click.RBLe", function(e) {
                        const actionLink = $(this);
                        e.preventDefault();

                        const applicationId = actionLink.attr("rbl-modal");                        

                        if ( applicationId != undefined ) {
                            let url = "api/rble/verify-katapp-modal?applicationId=" + applicationId;
                            const serviceUrlParts = application.options.sessionUrl?.split( "?" );
                
                            if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                                url += "&" + serviceUrlParts[ 1 ];
                            }
                                                    
                            $.ajax( {
                                method: "GET",
                                url: url,
                                dataType: "json"
                            }).then(
                                function( result ) {
                                    const successResponse = result as KatAppActionResult;
                            
                                    that.createModalApplication(
                                        applicationId,
                                        successResponse[ "Path" ],
                                        actionLink
                                    );
                                },
                                function( xhr ) {
                                    console.log( xhr );
                                    application.trace("Unable to launch modal KatApp.", TraceVerbosity.None);
                                }
                            );
                        }
                                                           
                        return false;
                    }).attr("data-katapp-initialized", "true");
                });
        }

        createModalApplication( applicationId: string, viewId: string, actionLink: JQuery<HTMLElement> ): void {
            const hostApplication = this.application;
            const labelCancel = actionLink.data("label-cancel") ?? "Cancel";
            const labelContinue = actionLink.data("label-continue") ?? "Continue";
            const labelTitle = actionLink.data("label-title");
            const showCancel = actionLink.data("show-cancel") ?? true;

            const isBootstrap5 = this.application.bootstrapVersion == 5;
            const bsDataAttributePrefix = isBootstrap5 ? "data-bs-" : "data-";

            let modalApp: KatAppPlugIn | undefined = undefined;
            let modalBS5: any | undefined = undefined;

            // dismiss, but I want to do programattically so removing
            // " ' + bsDataAttributePrefix + 'dismiss="modal"
            const modal =      
                $('<div class="modal fade katappModalAppDialog" tabindex="-1" role="dialog" ' + bsDataAttributePrefix + 'keyboard="false" ' + bsDataAttributePrefix + 'backdrop="static">\
                    <div class="modal-dialog modal-dialog-centered modal-xl">\
                        <div class="modal-content">\
                            <div class="modal-header d-none">\
                                <h5 class="modal-title d-none hidden">Modal title</h5>\
                                <button type="button" class="btn-close aria-label="Close"></button>\
                            </div>\
                            <div class="modal-body">\
                                <div class="katapp-modal-app"></div>\
                            </div>\
                            <div class="modal-footer">\
                                <button class="btn btn-default cancelButton" aria-hidden="true">' + labelCancel + '</button>\
                                <button type="button" class="btn btn-primary continueButton">' + labelContinue + '</button>\
                            </div>\
                        </div>\
                    </div>\
                </div>');

            if ( labelTitle != undefined ) {
                $(".modal-title", modal).html(labelTitle).removeClass("d-none");
            }
            if ( !showCancel ) {
                $(".cancelButton", modal).remove();
            }
            
            hostApplication.element.after( modal );

            const showModal = function() {
                if (hostApplication.bootstrapVersion==5) {
                    modalBS5 = bootstrap.Modal.getOrCreateInstance(modal[0]);
                    modalBS5.show();
                }
                else {
                    modal.modal({ show: true });
                }                               
            };

            const closeModal = function(message?: string ) {
                if ( modalApp == undefined ) return;

                if (hostApplication.bootstrapVersion==5) {
                    modalBS5.hide();
                }
                else {
                    modal.modal('hide');
                }                                                                    
                modal.remove();

                const applicationsToRemove: { View: string | undefined, ID: string | undefined }[] = [];
                // Remove any templates from nested applications, don't use .select()
                // method because want to get all nested items no matter what
                $("[rbl-application-id]", modal).each(function() {
                    applicationsToRemove.push( { View: ( $(this).KatApp() as KatAppPlugInShimInterface ).options.view, ID: $(this).attr("rbl-application-id") } );
                });

                hostApplication.removeResourceApplications( applicationsToRemove );
            };
    
            const reenableModal = function() { $(".modal-footer .btn", modal).prop("disabled", false); };

            $('.continueButton', modal).on("click.ka", function (e) {
                e.preventDefault();
                $(this).prop("disabled", true);

                if ( modalApp != undefined) {
                    const confirmModal = function(message?: string ) {
                        closeModal( message );
                        hostApplication.ui.triggerEvent( "onModalAppConfirmed", applicationId, hostApplication, modalApp, actionLink, message );
        
                        if ( actionLink.attr("rbl-action-calculate") == "true" ) {
                            hostApplication.calculate();
                        }
                    };

                    if ( modalApp.options.onModalAppConfirm != undefined ) {
                        modalApp.options.onModalAppConfirm.apply(this, [ hostApplication, actionLink, confirmModal, reenableModal ] );
                    }
                    else {
                        confirmModal();
                    }
                }
            });
            $('.cancelButton, .btn-close', modal).on("click.ka", function (e) {
                e.preventDefault();
                $(this).prop("disabled", true);

                if ( modalApp != undefined) {
                    const cancelModal = function(message?: string ) {
                        closeModal( message );
                        hostApplication.ui.triggerEvent( "onModalAppCancelled", applicationId, hostApplication, modalApp, actionLink, message );
                    };

                    if ( modalApp.options.onModalAppCancel != undefined ) {
                        modalApp.options.onModalAppCancel.apply(this, [ hostApplication, actionLink, cancelModal, reenableModal ] );
                    }
                    else {
                        cancelModal();
                    }
                }
            });

            const modalAppOptions = 
                KatApp.extend( {}, 
                    hostApplication.options, 
                    { 
                        view: viewId, 
                        currentPage: actionLink.attr("rbl-modal"),
                        manualInputs: hostApplication.dataAttributesToJson( actionLink, "data-input-" ) 
                    }
                );
                
            delete modalAppOptions["calcEngines"]; // So it doesn't use parent CE
            
            $(".katapp-modal-app", modal)
                .on("onInitialized.RBLe", function (e, application) {
                    modalApp = application as KatAppPlugIn;
                    hostApplication.ui.triggerEvent( "onModalAppInitialized", applicationId, hostApplication, modalApp, actionLink );

                    if ( modalApp.options.calcEngines == undefined || !( modalApp.options.runConfigureUICalculation ?? true )) {
                        showModal();
                    }
                })
                .on( "onConfigureUICalculation.RBLe", function(e, calculationResults_, calcOptions_, childApplication) { 
                    showModal();
                } )
                .KatApp( modalAppOptions );
        }

        processActionLinks( container?: JQuery<HTMLElement> ): void {
            const view = container ?? this.application.element;
            const that = this;
            const application = this.application;

            const isPopover = container != undefined && container.attr("data-katapp-popover") == "true";

            const links = isPopover
                ? $('[rbl-action-link]', view)
                : application.select('[rbl-action-link]', view);

            links
                .not('[data-katapp-initialized="true"]')
                .each(function () {
                    if ( $(this).attr("href") == undefined ) {
                        $(this).attr("href", "#");
                    }

                    $(this).on("click.RBLe", function(e) {
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
                                    customInputs: inputsJson,
                                    isDownload: actionLink.attr("rbl-action-download") == "true",
                                    calculateOnSuccess: actionLink.attr("rbl-action-calculate") == "true"
                                },
                                actionLink 
                            );
                        };
                            
                        // .on("click", function() { return that.onConfirmLinkClick( $(this)); })
                        if ( confirmSelector != undefined ) {
                            const confirm = application.select(confirmSelector).html() || "";
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
        
                that.application.select(".progress-bar")
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
                    templateContainer.attr("rbl-display", rblDisplayItems.attr("rbl-display")!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
            const application = this.application;
            const view = container ?? application.element;

            // Hook up event handlers only when *not* already initialized            
            application.select('[rbl-tid="carousel"],[rbl-template-type="katapp-carousel"]', view)            
                // .not('[data-katapp-initialized="true"]')
                .each(function () {
                    const el = $(this);

                    // Need to see if it has had items injected from results yet...
                    if ( el.data("katapp-initialized") != "true" && $(".carousel-indicators button[data-bs-slide-to]", el).length > 0) {
                        application.trace("Processing carousel: " + el.data("source"), TraceVerbosity.Detailed);
        
                        const carousel = $('.carousel', el);

                        // add active class to carousel items
                        $(".carousel-inner .carousel-item", el).not("[rbl-tid='inline']")
                            .first().addClass("active");
    
                        $(".carousel-indicators button", el).not("[rbl-tid='inline']")
                            .attr("data-bs-target", "#" + carousel.attr("id")!) // eslint-disable-line @typescript-eslint/no-non-null-assertion
                            .first().addClass("active").attr("aria-current", "true");
    
                        const carouselAll = $('.carousel-all', el);
    
                        //add buttons to show/hide
                        $(".carousel-indicators button[data-show-all='true']", el)
                            .on("click.RBLe", function () {
                                carousel.hide();
                                carouselAll.show();
                            });
                        $(".carousel-all button[data-show-all='false']", el)
                            .on("click.RBLe", function () {
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
            const that = this;

            this.application.select('[rbl-tid="input-checkbox"],[rbl-template-type="katapp-checkbox"]', container)
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

                    that.ensureRblDisplay( el );

                    if ( css !== undefined ) {
                        $("[rbl-display='v" + id + "']", el).addClass(css);
                    }

                    if ( help !== undefined ) {
                        $("div[rbl-value='h" + id + "']", el).html(help);
                        $("a[rbl-display='vh" + id + "']", el).show();
                    }

                    if ( label !== undefined ) {
                        let target = $("span[rbl-value='l" + id + "'] label span.checkbox-label", el);

                        /* Don't think needed
                        if ( target.length === 0 ) {
                            target = $("span[rbl-value='l" + id + "'] label", el);
                        }
                        */

                        if ( target.length === 0 ) {
                            target = $("label[rbl-value='l" + id + "']", el);
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

            application.select('[rbl-tid="input-fileupload"],[rbl-template-type="katapp-fileupload"]', container)
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
                    const showUpload = el.data("showupload") ?? true;
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

                    $(".btn-file-remove", el).on("click.RBLe", function () {
                        $(this).closest('.input-group')
                            .find(':file')
                            .val("")
                            .trigger("change");
                    });

                    const uploadFileHandler = function (): void {
                        if ( !application.ensureApplicationValid() ) {
                            return;
                        }
            
                        let uploadUrl = "api/" + actionEndpoint;
                        const serviceUrlParts = application.options.sessionUrl?.split( "?" );
            
                        if ( serviceUrlParts != undefined && serviceUrlParts.length === 2 ) {
                            uploadUrl += "?" + serviceUrlParts[ 1 ];
                        }
            
                        application.showAjaxBlocker();
                        $(".file-upload .btn", el).addClass("disabled");
                        that.incrementProgressBars();
                        application.select(".file-upload-progress").show();

                        const fileUpload = $(".file-upload .file-data", el);

                        const parametersJson = application.dataAttributesToJson( el, "data-param-");
                        
                        // Don't think needed
                        // const inputsJson = application.dataAttributesToJson( el, "data-input-" );

                        const fd = 
                            application.buildFormData( 
                                that.application.getEndpointSubmitData(
                                    application.options, 
                                    { 
                                        customParameters: parametersJson, 
                                        // customInputs: inputsJson 
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
                
                        application.ui.triggerEvent( "onUploadStart", actionEndpoint, fileUpload, fd, application );

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
                                const xhr = new XMLHttpRequest();
                                xhr.onreadystatechange = function(): void {
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
                                application.ui.triggerEvent( "onUploaded", actionEndpoint, fileUpload, application );
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
                            that.application.select(".file-upload-progress").hide();

                            if ( errors.length > 0 ) {
                                debugger;
                                console.group("Unable to upload file: errors");
                                console.log( errors );
                                console.groupEnd();            

                                const errorSummary = $("#" + application.id + "_ModelerValidationTable", application.element);
                                application.rble.processValidationRows( errorSummary, errors );
                                application.rble.finalizeValidationSummaries();

                                application.ui.triggerEvent( "onUploadFailed", actionEndpoint, fileUpload, errorResponse, application );
                            }
                            else {
                                application.ui.triggerEvent( "onUploadComplete", actionEndpoint, fileUpload, application );
                            }

                            that.application.hideAjaxBlocker();
                        });
                    };

                    $(".btn-file-upload", el).on("click.RBLe", uploadFileHandler);
                    el.on("UploadFile.RBLe", uploadFileHandler);

                    $(".btn-file :file", el).on("change.RBLe", function () {
                        const fileUpload = $(this),
                            files = ( fileUpload[0] as HTMLInputElement ).files,
                            numFiles = files?.length ?? 1,
                            label = numFiles > 1 ? numFiles + ' files selected' : ( fileUpload.val() as string).replace(/\\/g, '/').replace(/.*\//, ''), // remove c:\fakepath
                            inputGroup = $(this).closest('.input-group'),
                            display = inputGroup.find(':text'),
                            upload = inputGroup.find('.btn-file-upload'),
                            remove = inputGroup.find('.btn-file-remove');
                
                        display.val(label);

                        const itemsToToggle = showUpload
                            ? remove.add( upload )
                            : remove;

                        if (numFiles > 0) {                            
                            itemsToToggle.removeClass("hidden d-none");
                        }
                        else {
                            itemsToToggle.addClass("hidden d-none");
                        }
                    });
                
                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processTextBoxes( container: JQuery<HTMLElement> ): void {
            const application = this.application;
            const applicationId = application.id;
            const bootstrapVersion = application.bootstrapVersion;
            const isBootstrap4 = bootstrapVersion == 4;
            const isBootstrap5 = bootstrapVersion == 5;
            const that = this;

            application.select('[rbl-tid="input-textbox"],[rbl-template-type="katapp-textbox"]', container)
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
                    const mask = el.data("mask");

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
                        const rows = el.data("rows");
                        const rowsAttr = rows != undefined ? ' rows="' + rows + '" ' : "";
                        input.replaceWith($('<textarea name="' + id + '" ' + rowsAttr + 'id="katapp_' + applicationId + '_' + id + '" class="form-control ' + id + '"></textarea>'))
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

                    if ( mask != undefined ) {
                        const isNumericInput = function(event: JQuery.KeyboardEventBase<HTMLElement, undefined, HTMLElement, HTMLElement>): boolean {
                            const key = event.keyCode;
                            const valid = ((key >= 48 && key <= 57) || // Allow number line
                                (key >= 96 && key <= 105) // Allow number pad
                            );
                            return valid;
                        };
            
                        const isModifierKey = function(event: JQuery.KeyboardEventBase<HTMLElement, undefined, HTMLElement, HTMLElement>): boolean {
                            const key = event.keyCode;
                            const value = (event.shiftKey === true || key === 35 || key === 36) || // Allow Shift, Home, End
                                (key === 8 || key === 9 || key === 13 || key === 46) || // Allow Backspace, Tab, Enter, Delete
                                (key > 36 && key < 41) || // Allow left, up, right, down
                                (
                                    // Allow Ctrl/Command + A,C,V,X,Z
                                    (event.ctrlKey === true || event.metaKey === true) &&
                                    (key === 65 || key === 67 || key === 86 || key === 88 || key === 90)
                                )
                            return value;
                        };
                        
                        // Only support phone so far...
                        if ( mask == "(###) ###-####" ) {
                            // Why can't I put .RBLe event namespace here??
                            input.on("keydown", function (event) {
                                // Input must be of a valid number format or a modifier key, and not longer than ten digits
                                if (!isNumericInput(event) && !isModifierKey(event)) {
                                    event.preventDefault();
                                }
                            }).on("keyup", function (event) {
                                if (isModifierKey(event)) { return; }
                    
                                const target = event.target as HTMLInputElement;
                                const input = target.value.replace(/\D/g, '').substring(0, 10);

                                // First ten digits of input only
                                const zip = input.substring(0, 3);
                                const middle = input.substring(3, 6);
                                const last = input.substring(6, 10);
                    
                                if (input.length > 6) { target.value = "(" + zip + ") " + middle + "-" + last; }
                                else if (input.length >= 3) { target.value = "(" + zip + ") " + middle; }
                                else if (input.length > 0) { target.value = "(" + zip; }
                            });                    
                        }
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
                                .on("show.RBLe", function () {
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
                                            dateInput.val("").trigger("change");
                                        });
                                    }
                                })
                                .on("hide.RBLe", function () {
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
                                .on("blur.RBLe", function () {
                                    const dateInput = $(this);
                                    if (dateInput.data("datepicker-paste") != undefined) {
                                        dateInput.trigger("change");
                                    }
                                    dateInput.removeData("datepicker-paste");
                                })
                                .on("paste.RBLe", function () {
                                    const dateInput = $(this);
                                    dateInput.data("datepicker-paste", true);
                                })
                                .on("keypress.RBLe change.RBLe", function () {
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

            this.application.select('[rbl-tid="input-radiobuttonlist"],[rbl-template-type="radiobuttonlist"],[rbl-tid="input-checkboxlist"],[rbl-template-type="checkboxlist"]', container)
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

                    // To make it easier during result/listitem processing to determine what to do
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
                        const lookups = that.application.getResourceTemplateItem( that.application.options.view!, "lookup-tables" )?.Content ?? $();
                        const options =
                            $("DataTable[id_='" + lookuptable + "'] TableItem", lookups)
                                .map( ( index, ti ) => ({ Value: ti.getAttribute("key"), Text: ti.getAttribute( "name"), Help: undefined, Selected: index == 0, Visible: true, Disabled: false }))
                                .toArray();

                        that.application.ui.processListItems(listContainer, false, options);
                    }
            
                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processDropdowns( container: JQuery<HTMLElement> ): void {
            const dropdowns = 
                this.application.select('[rbl-tid="input-dropdown"],[rbl-template-type="katapp-dropdown"]', container)
                    .not('[data-katapp-initialized="true"]');

            const selectPickerAvailable = typeof $.fn.selectpicker === "function";
            const that = this;
            const isBootstrap5 = this.application.bootstrapVersion == 5;

            let selectPickerNotAvailWarning = true;

            dropdowns
                .each( function() {
                    const el = $(this);
                    const input = $(".form-control", el);
                    const id = el.data("inputname");
                    const label = el.data("label");
                    const hideLabel = el.data("hidelabel") ?? false;
                    const help = el.data("help");
                    const multiSelect = el.data("multiselect") ?? false;
                    const liveSearch = el.data("livesearch") ?? false;
                    const size = el.data("size") ?? "15";
                    const lookuptable = el.data("lookuptable");
                    const css = el.data("css");
                    const useSelectPicker = el.data("use-selectpicker") ?? true;

                    const dataItemsProcessed = [ "data-inputname", "data-label", "data-hidelabel", "data-help", "data-multiselect", "data-livesearch", "data-size", "data-lookuptable", "data-css", "data-use-selectpicker" ];

                    if ( useSelectPicker && !selectPickerAvailable && selectPickerNotAvailWarning ) {
                        that.application.trace("bootstrap-select javascript is not present", TraceVerbosity.None);
                        selectPickerNotAvailWarning = false;
                    }

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

                    if ( lookuptable !== undefined ) {
                        const lookups = that.application.getResourceTemplateItem( that.application.options.view!, "lookup-tables" )?.Content ?? $();
                        const options =
                            $("DataTable[id_='" + lookuptable + "'] TableItem", lookups)
                                .map( ( index, r ) => ({ Value:  r.getAttribute("key"), Text: r.getAttribute( "name"), Class: undefined, Subtext: undefined, Html: undefined, Selected: index === 0, Visible: true }))
                                .toArray();

                        that.application.ui.processDropdownItems( input, false, options );
                    }

                    if ( useSelectPicker ) {
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

                        // Merge all other data-* attributes they might want to pass through to bootstrap-select
                        $.each(this.attributes, function(i, attrib){
                            const name = attrib.name;
                            if ( name.startsWith( "data-") && dataItemsProcessed.indexOf(name) == -1 ) {
                                input.attr(name, attrib.value);
                            }
                        });

                        if ( selectPickerAvailable ) {
                            $(".bootstrap-select", el)
                                .next(".error-msg")
                                .addClass("drop-down"); /* aid in css styling */

                            $(".bootstrap-select", el)
                                .selectpicker()
                                .attr("data-kat-bootstrap-select-initialized", "true");
                        }
                    }
                    else {
                        // Need to deal with data-placeholder ... some hacks out
                        // there that are supported by modern browsers, but I haven't
                        // implemented yet.
                        // https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
                        
                        $("select", el).removeClass("bootstrap-select show-tick");
                        
                        // This should be done before this if statement, but bootstrap-select
                        // doesn't support form-select class styling yet
                        if ( isBootstrap5 ) {
                            $("select", el)
                                .removeClass("form-control")
                                .addClass("form-select")
                                .next(".error-msg")
                                .addClass("drop-down"); /* aid in css styling */
                        }
                    }
                    el.attr("data-katapp-initialized", "true");
                });
        }

        private processSliders( container: JQuery<HTMLElement> ): void {
            const that = this;

            // Only need to process data-* attributes here because RBLeUtilities.processResults will push out 'configuration' changes
            this.application.select('[rbl-tid="input-slider"],[rbl-template-type="katapp-slider"]', container)
                .not('[data-katapp-initialized="true"]')
                .each( function() {
                    const el = $(this);

                    const id = el.data("inputname");
                    const label = el.data("label");
                    const css = el.data("css");
                    const help = el.data("help");
                    const value = el.data("value");
                            
                    that.ensureRblDisplay( el );

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

    // Currently only used by Debugger.kaml to handle changing which view is being rendered
    $.fn.KatApp.reset = function(): void {
        // Search for comment near - KatApp[ "ping" ]
        // KatApp[ "ping" ] = $.fn.KatApp.ping;

        // This is deleted each time the 'real' Provider js runs, so rebuild it
        $.fn.KatApp.plugInShims = [];
        // reset factory to shim factory
        $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory;
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };
        // For now, leave inputs to pass assigned to what it was
        // $.fn.KatApp.inputsToPassOnNavigate = undefined;
        
        // remove templates
        $("rbl-katapps > rbl-resource").remove();
        $.fn.KatApp.resourceTemplates = {};
    }

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
            value: function (predicate: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                // 1. Let O be ? ToObject(this value).
                if (this == null) {
                    throw TypeError('"this" is null or not defined');
                }

                const o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, "length")).
                const len = o.length >>> 0;

                // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                if (typeof predicate !== 'function') {
                    throw TypeError('predicate must be a function');
                }

                // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                const thisArg = arguments[1];

                // 5. Let k be 0.
                let k = 0;

                // 6. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                    // d. If testResult is true, return kValue.
                    const kValue = o[k];
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
    if ( $.fn.KatApp.resourceTemplates == undefined ) {
        $('<rbl-katapps>\
            <style>\
                rbl-katapps, rbl-templates, rbl-template, [rbl-tid="inline"], [rbl-tid="empty"] { display: none; }\
            </style>\
        </rbl-katapps>').appendTo("body");
        
        $.fn.KatApp.resourceTemplates = {};
        $.fn.KatApp.sharedData = { requesting: false, callbacks: [] };

        const navigationCachingKey = "katapp:navigationInputs:global";
        const currentInputsJson = sessionStorage.getItem(navigationCachingKey);
        $.fn.KatApp.navigationInputs = currentInputsJson != undefined && currentInputsJson != null 
            ? JSON.parse( currentInputsJson ) 
            : undefined;
        sessionStorage.removeItem(navigationCachingKey);

        $.fn.KatApp.templateOn = function( events: string, fn: TemplateOnDelegate ): void {
            if ( $.fn.KatApp.currentView != undefined ){
                $.fn.KatApp.currentView!.on( events, fn ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
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
//# sourceURL=KatApp\Global\KatAppProvider.js
