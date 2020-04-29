// TODO
// - Need to remove slider events (https://refreshless.com/nouislider/events-callbacks/) before destroying and carousel (standard)
// - How do I check/handle for errors when I try to load view
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?

// Discussions with Tom
// - Templates run every calc?  Will that goof up slider config?  Need to read code closer
//      - For example, arne't you hooking up events every time to carousel?  Since you aren't removing events?  WHere you said there were events hanging around?
//      - Seems like you need a way to only update the 'markup' of carousel vs rebuilding entire thing?  Otherwise, probably need/should hookup a 'calcstart event' in templates to remove event handlers
// - Show how bunch of errors are happening in boscomb (missing source elements)
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calcengine, -inputname, etc.
// - Downfall to our paradigm of CMS managing KatAppProvider code is never caches script and loads it each time?
// - Talk to tom about how to check for events
//      - Wondering if events on charts are still there or if calling destroy on chart removes
//      - Wondering if we are making multiple events on the carousel events and slider events

// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
// 6. <div rbl-tid="chart-highcharts" data-name="BalanceChart" rbl-data="BalanceChart" rbl-options="BalanceChart"></div>

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

$(function() {
    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend(
        {
            enableTrace: false,
            registerDataWithService: false,
            shareRegistrationData: true,
            functionUrl: KatApp.functionUrl,
            corsUrl: KatApp.corsUrl,
            currentPage: "Unknown",
            inputSelector: "input",
            inputTab: "RBLInput",
            resultTabs: ["RBLResult"],
            runConfigureUICalculation: true,
            ajaxLoaderSelector: ".ajaxloader",
            useTestCalcEngine: KatApp.pageParameters[ "test" ] === "1",

            onCalculateStart: function( application: KatAppPlugInInterface ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).show();
                }
                $( ".RBLe .slider-control, .RBLe input", application.element ).attr("disabled", "true");
            },
            onCalculateEnd: function( application: KatAppPlugInInterface ) {
                if ( application.options.ajaxLoaderSelector !== undefined ) {
                    $( application.options.ajaxLoaderSelector, application.element ).fadeOut();
                }
                $( ".RBLe .slider-control, .RBLe input", application.element ).removeAttr("disabled");
            }
        }, KatApp.defaultOptions );

    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const validInputSelector = ":not(.notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons + ")";
    const skipBindingInputSelector = ":not(.notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input" + tableInputsAndBootstrapButtons + ")";

    // Template logic.. if no flag, get template, but then check flag again before inserting into DOM in case another processes loaded the template.
    const _templatesLoaded: { 
        [ key: string ]: boolean; 
    } = {};
    const _templateDelegates: {
        Delegate: TemplateOnDelegate;
        Template: string;
        Events: string;
    }[] = [];

    // Get Global: put as prefix if missing
    function ensureGlobalPrefix( id: string | undefined ): string | undefined {
        if ( id === undefined ) return undefined;

        const idParts = id.split(":");
        return idParts.length > 1 ? id : "Global:" + id;
    };


    $.fn.KatApp.templateOn = function( templateName: string, events: string, fn: TemplateOnDelegate ): void {
        _templateDelegates.push( { Template: ensureGlobalPrefix( templateName )!, Delegate: fn, Events: events } ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        KatApp.trace( undefined, "Template event(s) registered [" + events + "] for [" + templateName + "]." );
    };

    let _sharedRegisteredToken: string | undefined = undefined;
    let _sharedData: RBLeRESTServiceResult | undefined = undefined;

    class KatAppPlugIn implements KatAppPlugInInterface {
        // Helper classes, see comment in interfaces class
        private rble: RBLeUtilitiesInterface = $.fn.KatApp.rble;
        private ui: UIUtilitiesInterface = $.fn.KatApp.ui;

        // Fields
        element: JQuery;
        options: KatAppOptions = { };
        id: string;
        calculationResults?: JSON;
        exception?: RBLeServiceResults | undefined;
        results?: JSON | undefined;
        resultRowLookups?: ResultRowLookupsInterface;
        inputs?: CalculationInputs | undefined;

        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = id;
            this.element = element;
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

            this.element.attr("rbl-application-id", this.id);

            (function( that: KatAppPlugIn ): void {
                that.trace( "Started init" );
                const pipeline: Array<()=> void> = [];
                let pipelineIndex = 0;
    
                const next = function(offest: number ): void {
                    pipelineIndex += offest;
                    if ( pipelineIndex < pipeline.length ) {                    
                        pipeline[ pipelineIndex++ ]();
                    }
                };
    
                let pipelineError: string | undefined = undefined;

                const optionTemplates = that.options.viewTemplates?.split(",").map( i => { return ensureGlobalPrefix( i ); } ).join(",");
                let resourcesToFetch = [ optionTemplates, ensureGlobalPrefix( that.options.view ) ].filter( r => r !== undefined ).join(",");
    
                const useTestView = that.options.useTestView ?? KatApp.pageParameters[ "testview"] === "1" ?? false;
                const functionUrl = that.options.functionUrl;
                const viewId = ensureGlobalPrefix( that.options.view ); 
                    
                let templatesFromRblConfig: string | undefined = undefined;

                // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                let requestedTemplates: string[] = optionTemplates != undefined
                    ? optionTemplates.split( "," )
                    : [];

                // Build up the list of resources to get from KatApp Markup
                let resourceNames = resourcesToFetch.split( "," ).filter( r => !( _templatesLoaded[ r ] ?? false ) );
                resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                
                let resourceData: ResourceResults | undefined = undefined;

                pipeline.push( 
                    // Get View and Templates resources on KatApp
                    function(): void { 
                        if ( resourcesToFetch !== "" ) {
                            KatApp.getResources( functionUrl, resourcesToFetch, useTestView, false,
                                ( errorMessage, data ) => {                                
    
                                    if ( errorMessage === undefined && data !== undefined ) {
                                        resourceData = data as ResourceResults;
                                        that.trace(resourcesToFetch + " returned from CMS (" + functionUrl + ").");
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
                            next( 2 ); // jump to finish
                        }
                    },
                    // Inject the view and templates from resources
                    function(): void {
                        
                        resourceNames.forEach( r => {
                            const data = resourceData![ r ]; // eslint-disable-line @typescript-eslint/no-non-null-assertion

                            if ( r === viewId ) {
                                // Process as view
                                const view = $("<div>" + data.replace( /{thisView}/g, "[rbl-application-id='" + that.id + "']" ) + "</div>");
                                const rblConfig = $("rbl-config", view).first();
    
                                if ( rblConfig.length !== 1 ) {
                                    that.trace("View " + viewId + " is missing rbl-config element.");
                                }
                                else {
                                    that.options.calcEngine = that.options.calcEngine ?? rblConfig.attr("calcengine");
                                    templatesFromRblConfig = rblConfig.attr("templates");
                                    that.options.inputTab = that.options.inputTab ?? rblConfig.attr("input-tab");
                                    const attrResultTabs = rblConfig.attr("result-tabs");
                                    that.options.resultTabs = that.options.resultTabs ?? ( attrResultTabs != undefined ? attrResultTabs.split( "," ) : undefined );
                                    that.element.html( view.html() );
                                }
                            }
                            else if ( !( _templatesLoaded[ r ] ?? false ) ) {
                                _templatesLoaded[ r ] = true;

                                // TOM: create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                                // and this attribute used for checking(?)
                                
                                // Remove extension if there is one, could be a problem if you do Standard.Templates, trying to get
                                // Standard.Templates.html.
                                const resourceParts = r.split(":");
                                const tId = ( resourceParts.length > 1 ? resourceParts[ 1 ]: resourceParts[ 0 ] ).replace(/\.[^/.]+$/, "");
                                const t = $("<rbl-templates style='display:none;' rbl-t='" + tId + "'>" + data.replace( /{thisTemplate}/g, r ) + "</rbl-templates>");

                                t.appendTo("body");

                                that.trace( "Loaded template [" + r + "] for [" + viewId + "]." );
                            }
                        });

                        next( 0 );
                    },
                    // Get Templates configured on <rbl-config/>
                    function(): void {
                        // Now build up a list of templates that were specified inside the view markup
                        if ( templatesFromRblConfig != undefined ) {
                            // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                            requestedTemplates = requestedTemplates.concat( templatesFromRblConfig.split( "," ).map( i => ensureGlobalPrefix( i )! ) ); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                            resourceNames = templatesFromRblConfig.split( "," ).filter( r => !( _templatesLoaded[ r ] ?? false ) ).map( i => ensureGlobalPrefix( i )! ); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                            resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                            templatesFromRblConfig = undefined; // clear out so that we don't process this again

                            if ( resourcesToFetch !== "" ) {
                                const currentTemplates = optionTemplates !== undefined ? optionTemplates + "," : "";
                                that.options.viewTemplates = currentTemplates + resourcesToFetch;
                                next( -3 ); // Go to start now that I've reset resources to fetch
                            }
                            else {
                                next( 0 ); // no *new* resources to load
                            }
                        }
                        else {
                            next( 0 ); // no viewTemplates specified
                        }
                    },
                    // Final processing (hook up template events and process templates that don't need RBL)
                    function(): void {
                        if ( pipelineError === undefined ) {
                            
                            // Now, for every unique template reqeusted by client, if the template had <script rbl-script="view"/> 
                            // associated with it, I can inject that view specific code (i.e. event handlers) for the currently
                            // processing application
                            requestedTemplates
                                .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i ) // unique
                                .forEach( t => {

                                    // Loop every template event handler that was called when template loaded
                                    // and register a handler to call the delegate
                                    _templateDelegates
                                        .filter( d => d.Template.toLowerCase() == t.toLowerCase() )
                                        .forEach( d => {
                                            that.element.on( d.Events, function( ...args ): void {
                                                d.Delegate.apply( this, args );
                                            } );
                                        });
                                });

                            // Build up template content that DOES NOT use rbl results, but instead just 
                            // uses data-* to create a dataobject generally used to create controls like sliders.                    
                            $("[rbl-tid]:not([rbl-source])", that.element).each(function () {
                                const templateId = $(this).attr('rbl-tid');
                                if (templateId !== undefined && templateId !== "inline") {
                                    //Replace content with template processing, using data-* items in this pass
                                    $(this).html(that.rble.processTemplate( that, templateId, $(this).data()));
                                }
                            });

                            that.ui.bindEvents( that );
                
                            that.ui.triggerEvent( that, "onInitialized", that );

                            if ( that.options.runConfigureUICalculation ) {
                                const customOptions: KatAppOptions = {
                                    manualInputs: { iConfigureUI: 1 }
                                };
                                that.calculate( customOptions );
                            }
                        }
                        else {
                            that.trace( "Error during Provider.init: " + pipelineError );
                        }

                        that.trace( "Finished init" );
                    }
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

            const shareRegistrationData = this.options.shareRegistrationData ?? false;
            if ( shareRegistrationData ) {
                this.options.registeredToken = _sharedRegisteredToken;
                this.options.data = _sharedData;
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
    
                let pipelineError: string | undefined = undefined;
                let registrationData: RBLeRESTServiceResult | undefined = undefined;
    
                pipeline.push( 
                    // Attempt First Submit
                    function(): void { 
                        try {
                            that.rble.submitCalculation( 
                                that, currentOptions, 
                                // If failed, let it do next job (getData), otherwise, jump to finish
                                errorMessage => { 
                                    pipelineError = errorMessage; 
                                    next( errorMessage !== undefined ? 0 : 3 );
                                } 
                            );
                        } catch (error) {
                            pipelineError = "Submit.Pipeline exception: " + error;
                            next( 3 );
                        }
                    },
                    // Get Registration Data
                    function(): void {
                        try {
                            that.rble.getData( 
                                that, currentOptions, 
                                // If failed, then I am unable to register data, so just jump to finish, otherwise continue to registerData
                                ( errorMessage, data ) => { 
                                    pipelineError = errorMessage; 
                                    registrationData = data as RBLeRESTServiceResult;  
                                    
                                    if ( errorMessage !== undefined ) {
                                        pipelineError = errorMessage;
                                        next( 2 ); // If error, jump to finish
                                    }
                                    else if ( !that.options.registerDataWithService ) {
                                        if ( shareRegistrationData ) {
                                            _sharedRegisteredToken = undefined;
                                            _sharedData = registrationData;
                                        }
                                        next( 1 ); // If not registering data, jump to submit
                                    }
                                    else {
                                        next( 0 ); // Continue to register data
                                    }                                        
                                } 
                            );
                        } catch (error) {
                            pipelineError = "GetData.Pipeline exception: " + error;
                            next( 2 ); // If error, jump to finish
                        }
                    },
                    // Register Data
                    function(): void {

                        try {
                            that.rble.registerData( 
                                that, currentOptions, registrationData as RBLeRESTServiceResult,
                                // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                                errorMessage => { 
                                    pipelineError = errorMessage; 
        
                                    if ( errorMessage === undefined && shareRegistrationData ) {
                                        _sharedRegisteredToken = that.options.registeredToken;
                                        _sharedData = undefined;
                                    }
                    
                                    // If error, jump to finish
                                    next( errorMessage !== undefined ? 1 : 0 );
                                } 
                            );
                        } catch (error) {
                            pipelineError = "Register.Pipeline exception: " + error;
                            next( 1 );                            
                        }
                    },
                    // Submit Again (if needed)
                    function(): void {
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
                    },
                    // Finish
                    function(): void {

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
                            that.trace( "Error duing result processing: " + error );
                            that.ui.triggerEvent( that, "onCalculationErrors", "RunCalculation", error, that.exception, currentOptions, that );
                        }
                        finally {
                            that.ui.triggerEvent( that, "onCalculateEnd", that );
                        }
                    }
                )
    
                // Start the pipeline
                next( 0 );
            })( this );
        }

        configureUI( customOptions?: KatAppOptions ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1 } };
            this.calculate( KatApp.extend( {}, customOptions, manualInputs ) );
        }

        destroy(): void {
            this.element.removeAttr("rbl-application-id");
            this.element.off(".RBLe");
            this.ui.unbindEvents( this );
            this.ui.triggerEvent( this, "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        updateOptions(): void { 
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
        trace( message: string ): void {
            KatApp.trace( this, message );
        }
    }

    // All methods/classes before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure).  Could make another utility
    // class like I did in original service or KATApp beta, but wanted methods unreachable from javascript
    // outside my framework.  See if there is a way to pull that off and move these methods somewhere that
    // doesn't clutter up code flow here
    class UIUtilities implements UIUtilitiesInterface {
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

        getInputs(application: KatAppPlugInInterface, customOptions: KatAppOptions ): JSON {
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

        getInputTables(application: KatAppPlugInInterface): CalculationInputTable[] | undefined {
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

        triggerEvent(application: KatAppPlugInInterface, eventName: string, ...args: ( object | string | undefined )[]): void {
            application.options[ eventName ]?.apply(application.element[0], args );
            application.element.trigger( eventName + ".RBLe", args);
        }

        bindEvents( application: KatAppPlugInInterface ): void {
            if ( application.options.inputSelector !== undefined ) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);

                $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {
        
                    $(this).bind("change.RBLe", function () {
                        
                        const wizardInputSelector = $(this).data("input");
        
                        if (wizardInputSelector == undefined) {
                            application.calculate( { manualInputs: { iInputTrigger: $(this).attr("id") } } );
                        }
                        else {
                            // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                            $("." + wizardInputSelector)
                                .val($(this).val() as string)
                                .trigger("change.RBLe"); // trigger calculation
                        }
        
                    });
                });
            }
        }

        unbindEvents( application: KatAppPlugInInterface ): void {
            const inputSelector = application.element.data("katapp-input-selector");

            if ( inputSelector !== undefined ) {
                $(inputSelector, application.element).off(".RBLe");
                application.element.removeData("katapp-input-selector")
            }
        }
    }
    $.fn.KatApp.ui = new UIUtilities();

    class RBLeUtilities implements RBLeUtilitiesInterface {
        ui: UIUtilitiesInterface = $.fn.KatApp.ui;

        setResults( application: KatAppPlugInInterface, results: JSON | undefined ): void {
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

        getData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void {
        
            if ( currentOptions.getData === undefined ) 
            {
                next( "getData handler does not exist." );
                return;
            }
    
            currentOptions.getData( 
                application,
                currentOptions, 
                data => { 
                    application.options.data = currentOptions.data = data;
                    application.options.registeredToken = currentOptions.registeredToken = undefined;
                    next( undefined, data ); 
                },
                ( _jqXHR, textStatus ) => {
                    application.trace("getData AJAX Error Status: " + textStatus);
                    next( "getData AJAX Error Status: " + textStatus );
                }
            );  
        }
    
        registerData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, data: RBLeRESTServiceResult, next: PipelineCallback ): void {
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
                            TestCE: currentOptions.useTestCalcEngine ?? false,
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
                application.trace("registerData AJAX Error Status: " + textStatus);
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
                    application.trace("registerData Error Status: " + payload.Exception.Message);
                    next( "RBLe Register Data Error: " + payload.Exception.Message );
                }
            }
    
            register( application, currentOptions, registerDone, registerFailed );
        }
    
        submitCalculation( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void {

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
                    RefreshCalcEngine: refreshCalcEngine || ( currentOptions.refreshCalcEngine ?? false ),
                    PreCalcs: undefined, // TODO: search service for update-tp, need to get that logic in there
                    
                    // Non-session submission
                    AuthID: currentOptions.data?.AuthID,
                    AdminAuthID: undefined,
                    Client: currentOptions.data?.Client,
                    TestCE: currentOptions.useTestCalcEngine ?? false,
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
                    application.trace( "RBLe Service Result Exception: " + payload.Exception.Message )
                    next( "RBLe Service Result Exception: " + payload.Exception.Message );
                }
            };
    
            const submitFailed: JQueryFailCallback = function( _jqXHR, textStatus ): void {
                application.trace("submitCalculation AJAX Error Status: " + textStatus);
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
                    .done( done )
                    .fail( fail )
                };
    
            submit( application, calculationOptions, submitDone, submitFailed );
        }

        getResultRow<T>( application: KatAppPlugInInterface, table: string, key: string, columnToSearch?: string ): T | undefined { 
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

        getResultValue( application: KatAppPlugInInterface, table: string, key: string, column: string, defaultValue?: string ): string | undefined { 
            return this.getResultRow<JSON>( application, table, key )?.[ column ] ?? defaultValue;
        }

        getResultValueByColumn( application: KatAppPlugInInterface, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined {
            return this.getResultRow<JSON>( application, table, key, keyColumn)?.[ column ] ?? defaultValue;
        };

		getResultTable<T>( application: KatAppPlugInInterface, tableName: string): Array<T> {
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

        processTemplate( application: KatAppPlugInInterface, templateId: string, data: JQuery.PlainObject ): string {
            let template = $("rbl-template[tid=" + templateId + "]", application.element).first();

            if ( template.length === 0 ) {
                template = $("rbl-template[tid=" + templateId + "]").first();
            }

            if ( template.length === 0 ) {
                application.trace( "Invalid template id: " + templateId);
                return "";
            }
            else {
                return template.html().format(data);
            }
        }
    
        createHtmlFromResultRow( application: KatAppPlugInInterface, resultRow: HtmlContentRow ): void {
            const view = application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            let selector = resultRow.selector ?? resultRow["@id"] ?? "";

            if (content.length > 0 && selector.length > 0) {

                //if selector contains no 'selector' characters (.#[:) , add a . in front (default is class; downside is no selecting plain element)
                if ( selector === selector.replace( /#|:|\[|\./g ,'') ) {
                    selector = "." + selector;
                }

                const target = $( selector, view );

                if ( target.length > 0 ) {
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
                            
                            // Append 'tempalted' content to view
                            el.appendTo($( selector, view ));    
                        }
                        else {
                            target.append(content);
                        }
                    }
                }
            }
        }

        processRblValues( application: KatAppPlugInInterface ): void {
            const that = this;

            //[rbl-value] inserts text value of referenced tabdef result into .html()
            $("[rbl-value]", application.element).each(function () {
                const el = $(this);
                const rblValueParts = el.attr('rbl-value')!.split('.'); // eslint-disable-line @typescript-eslint/no-non-null-assertion

                let value: string | undefined = undefined;

                if ( rblValueParts.length === 1 ) value = that.getResultValue( application, "ejs-output", rblValueParts[0], "value");
                else if (rblValueParts.length === 3) value = that.getResultValue( application, rblValueParts[0], rblValueParts[1], rblValueParts[2]);
                else if (rblValueParts.length === 4) value = that.getResultValueByColumn( application, rblValueParts[0], rblValueParts[1], rblValueParts[2], rblValueParts[3]);

                if ( value != undefined ) {
                    $(this).html( value );
                }
                else {
                    application.trace("RBL WARNING: no data returned for rbl-value=" + el.attr('rbl-value'));
                }
            });
        }

        processRblSources( application: KatAppPlugInInterface ): void {
            const that = this;

            //[rbl-source] processing templates that use rbl results
            $("[rbl-source]", application.element).each(function () {
                const el = $(this);

                // TOM - Need some flow documentation here
                if ( el.attr("rbl-configui") === undefined || application.inputs?.iConfigureUI === 1 ) {
                    const elementData = el.data();
                    const tid = el.attr('rbl-tid');

                    // TOM - inline needed for first case?  What does it mean if rbl-tid is blank?  Need a variable name
                    const inlineTemplate = tid === undefined ? $("[rbl-tid]", el ) : undefined;
                    const templateContent = tid === undefined
                        ? inlineTemplate === undefined || inlineTemplate.length === 0
                            ? undefined
                            : $( inlineTemplate.prop("outerHTML").format( elementData) ).removeAttr("rbl-tid").prop("outerHTML")
                        : that.processTemplate( application, tid, elementData ); 

                    const rblSourceParts = el.attr('rbl-source')?.split('.');

                    if ( templateContent === undefined ) {
                        application.trace("RBL WARNING: Template content could not be found: [" + tid + "].");
                    }
                    else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                        application.trace("RBL WARNING: no rbl-source data");
                    }
                    else if ( rblSourceParts.length === 1 || rblSourceParts.length === 3 ) {
                        
                        //table in array format.  Clear element, apply template to all table rows and .append
                        const table = that.getResultTable<JSON>( application, rblSourceParts[0] );
                        
                        if ( table !== undefined && table.length > 0 ) {
                            
                            el.children( ":not(.rbl-preserve, [rbl-tid='inline'])" ).remove();

                            let i = 1;

                            table.forEach( row => {
                                
                                if ( rblSourceParts.length === 1 || row[ rblSourceParts[ 1 ] ] === rblSourceParts[ 2 ] ) {
                                    const templateData = KatApp.extend( {}, row, { _index0: i - 1, _index1: i++ } )
                                    el.append( templateContent.format( templateData ) );    
                                }

                            })

                        } else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }

                    } else if ( rblSourceParts.length === 2 ) {

                        const row = that.getResultRow( application, rblSourceParts[0], rblSourceParts[1] );
                        
                        if ( row !== undefined ) {
                            el.html( templateContent.format( row ) );
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }

                    }
                    else if ( rblSourceParts.length === 3 ) {
                        
                        const value = that.getResultValue( application, rblSourceParts[0], rblSourceParts[1], rblSourceParts[2]);
                        
                        if ( value !== undefined ) {
                            el.html( templateContent.format( { "value": value } ) );                                    
                        }
                        else {
                            application.trace("RBL WARNING: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }

                    }
            
                }
            });
        }

        processVisibilities(application: KatAppPlugInInterface): void {
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
                
                let visibilityValue: string | boolean | undefined = undefined;
                
                if (rblDisplayParts.length == 1) visibilityValue = that.getResultValue( application, "ejs-output", rblDisplayParts[0], "value");
                else if (rblDisplayParts.length == 3) visibilityValue = that.getResultValue( application, rblDisplayParts[0], rblDisplayParts[1], rblDisplayParts[2]);
                else if (rblDisplayParts.length == 4) visibilityValue = that.getResultValueByColumn( application, rblDisplayParts[0], rblDisplayParts[1], rblDisplayParts[2], rblDisplayParts[3]);
                
                if (visibilityValue != undefined) {
                    if ( visibilityValue.length > 1) {
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
                    application.trace("RBL WARNING: no data returned for rbl-display=" + el.attr('rbl-display'));
                }
            });
        }

        processResults( application: KatAppPlugInInterface ): boolean {
            const results = application.results;

            //processes the view with rbl results (render engine)
			//elements using templates have rbl-tid or rbl-source
			//templates: run once page build | run once after rbl call (not subsequent times)
			//element content can be preserved with a class flag
			//generated content append or prepend (only applicably when preserved content)

            if ( results !== undefined ) {
                // TODO Process results...implement appProcessResults
                const calcEngineName = results["@calcEngine"];
                const version = results["@version"];
                application.trace( "Processing results for " + calcEngineName + "(" + version + ")." );

                //need two passes to support "ejs-markup"
                // TOM - Why 2 passes needed?
                const markUpRows = this.getResultTable<HtmlContentRow>( application, "ejs-markup" )
                markUpRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });
                
                const outputRows = this.getResultTable<HtmlContentRow>( application, "ejs-output" )
                outputRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });

                this.processRblSources( application );
                this.processRblValues( application );

                // apply dynamic classes after all html updates (could this be done with 'non-template' build above)
                markUpRows.concat( outputRows ).forEach( r => {
                    if ( r.selector !== undefined ) {
                        if ( r.addclass !== undefined && r.addclass.length > 0 ) {
                            $(r.selector, application.element).addClass(r.addclass);
                        }
    
                        if ( r.removeclass !== undefined && r.removeclass.length > 0 ) {
                            $(r.selector, application.element).removeClass(r.addclass);
                        }
                    }
                });

                this.processVisibilities( application );

                application.trace( "Finished processing results for " + calcEngineName + "(" + version + ")." );

                return true;
            }
            else {
                application.trace( "Results not available." );
                return false;
            }
        }
    }
    $.fn.KatApp.rble = new RBLeUtilities();

    class StandardTemplateBuilder implements StandardTemplateBuilderInterface
    {
        application: KatAppPlugInInterface;

        highchartsOptions?: HighChartsOptionRow[];
        highchartsOverrides?: HighChartsOverrideRow[];
        highchartsData?: HighChartsDataRow[];
        highChartsDataName?: string;
        highChartsOptionsName?: string;

        constructor( application: KatAppPlugInInterface ) {
            this.application = application;    
        }
        
        buildSlider(el: JQuery): void {
            const id = el.data("inputname");
            const that = this;

            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.s." + id) {
                debugger;
            }

            const config = this.application.getResultRow<SliderConfigurationRow>("ejs-sliders", id);

            if (config == undefined) return;

            const minValue = Number( config.min );
            const maxValue = Number( config.max );

            const defaultConfigValue =
                this.application.getResultValue("ejs-defaults", id, "value") || // what is in ejs-defaults
                config.default || // what was in ejs-slider/default
                $("." + id).val() || // what was put in the text box
                config.min; //could/should use this

            const stepValue = Number( config.step || "1" );
            const format = config.format || "n";
            const decimals = Number( config.decimals || "0");

            const sliderJQuery = $(".slider-" + id, el);
            $("." + id, el).val(defaultConfigValue);

            if (sliderJQuery.length === 1) {

                const slider = sliderJQuery[0] as noUiSlider.Instance;

                sliderJQuery.data("min", minValue);
                sliderJQuery.data("max", maxValue);

                // Some modelers have 'wizards' with 'same' inputs as regular modeling page.  The 'wizard sliders'
                // actually just set the input value of the regular input and let all the other flow (main input's
                // change event) happen as normal.
                const targetInput = sliderJQuery.data("input");

                const defaultSliderValue = targetInput != undefined
                    ? $("." + targetInput, this.application.element).val() as string
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

                    if ($("." + sliderCalcId + ".skipRBLe", this.application.element).length === 0 && $("." + sliderCalcId, this.application.element).parents(".skipRBLe").length === 0) {

                        if (targetInput === undefined /* never trigger run from wizard sliders */) {

                            // Whenever 'regular' slider changes or is updated via set()...
                            instance.on('set.RBLe', function ( this: noUiSlider.noUiSlider ) {

                                const settingDefault = $(this.target).data("setting-default") === 1;

                                if (!settingDefault && that.application.options !== undefined) {
                                    const sliderCalcOptions = $.extend(true, {}, that.application.options, { Inputs: { iInputTrigger: id } });
                                    that.application.calculate(sliderCalcOptions);
                                }

                            });
                        }
                        else {
                            // When wizard slider changes, set matching 'regular slider' value with same value from wizard
                            instance.on('change.RBLe', function ( this: noUiSlider.noUiSlider ) {
                                const value = Number( this.get() as string );
                                const targetSlider = $(".slider-" + targetInput, that.application.element);
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
        }

        buildCarousel(el: JQuery): void {
            const carouselName = el.attr("rbl-name");

            if (KatApp.pageParameters["debugkatapp"] === "t.{thisTemplate}.c." + carouselName) {
                debugger;
            }

            if (carouselName !== undefined && !carouselName.includes("{")) {
                this.application.trace("Processing carousel: " + carouselName);

                //add active class to carousel items
                $(".carousel-inner .item", el).first().addClass("active");

                //add 'target needed by indicators, referencing name of carousel
                $(".carousel-indicators li", el)
                    .attr("data-target", "#carousel-" + carouselName)
                    .first().addClass("active");

                const carousel = $('.carousel', el);
                const carouselAll = $('.carousel-all', el);

                //add buttons to show/hide
                $('<a class="list-btn"> Show More</a>')
                    .appendTo($(".carousel-indicators", el))
                    .click(function () {
                        carousel.hide();
                        carouselAll.show();
                    });

                $('<div class="text-center"><a class="carousel-btn"> Show Less</a></div>')
                    .appendTo(carouselAll)
                    .click(function () {
                        carouselAll.hide();
                        carousel.show();
                    });

                //show initial item, start carousel:
                carousel.carousel(0);
            }
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

        buildHighcharts(el: JQuery<HTMLElement>): void {
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
        }
    }

    $.fn.KatApp.standardTemplateBuilderFactory = function( application: KatAppPlugInInterface ): StandardTemplateBuilderInterface {
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
});
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js