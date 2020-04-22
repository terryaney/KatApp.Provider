// TODO
// - Clean up init pipelines so that the 'adding' of the script is done in sep function()
// - How do I check/handle for errors when I try to load view
// - Do I want to call calculate in updateOptions?  They could bind and call if they need to I guess
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calc-engine tag on each input?

// Discussions with Tom
// - Search for TOM comments
// - During load view, application.options.calcEngine = (and other properties)...precedence is
//      rbl-config calcengine in view (given this precedence, does this have to be required?  Remove my logic enforcing if so)
//      markup attributes on katapp
//      js options passed in on initialize
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Talk to Tom about 'angular/L@W hosts methods' and how I architected them (register/getregdata seperated) and allow for callback to be registered
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - $(".viDemoNotice").show(); - what is this in cors_demo.js
// - Need to review KatApp.ts to make sure it is robust but also 'as slim' as possible so we can put enhancements into our provider code
//      Need to make sure our 'interface' is ironed out...but do some testing on adding features and see if posible without breaking existing
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calc-engine, -inputname, etc.

// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calc-engine
// 3. Registering TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Changed calcengine to calc-engine in <rbl-config calcengine="Conduent_BiscombPOC_SE" templates="nonstandard_templates"></rbl-config> to match others
// 6. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
// 7. rbl-script="view" - added this to Standard_Templates - not really external, but fyi and we can discuss

// Prototypes / polyfills
interface String {
    format(json: JQuery.PlainObject): string;
}
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

$(function() {
    const tableInputsAndBootstrapButtons = ", .RBLe-input-table :input, .dropdown-toggle, button";
    const validInputSelector = ":not(.notRBLe, .rbl-exclude" + tableInputsAndBootstrapButtons + ")";
    const skipBindingInputSelector = ":not(.notRBLe, .rbl-exclude, .skipRBLe, .skipRBLe :input, .rbl-nocalc, .rbl-nocalc :input" + tableInputsAndBootstrapButtons + ")";

    // All methods/classes before KatAppProvider class implementation are private methods only
    // available to KatAppProvider (no one else outside of this closure).  Could make another utility
    // class like I did in original service or KATApp beta, but wanted methods unreachable from javascript
    // outside my framework.  See if there is a way to pull that off and move these methods somewhere that
    // doesn't clutter up code flow here
    class UIUtilities {
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

        getInputs(application: KatAppInterface, customOptions: KatAppOptions ): JSON {
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

        getInputTables(application: KatAppInterface): CalculationInputTable[] | undefined {
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

        triggerEvent(application: KatAppInterface, eventName: string, ...args: ( object | string | undefined )[]): void {
            application.options[ eventName ]?.apply(application.element[0], args );
            application.element.trigger( eventName + ".RBLe", args);
        }

        bindEvents( provider: KatAppProvider, application: KatAppInterface ): void {
            if ( application.options.inputSelector !== undefined ) {
                // Store for later so I can unregister no matter what the selector is at time of 'destroy'
                application.element.data("katapp-input-selector", application.options.inputSelector);

                $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {
        
                    $(this).bind("change.RBLe", function () {
                        
                        const wizardInputSelector = $(this).data("input");
        
                        if (wizardInputSelector == undefined) {
                            provider.calculate( application, { manualInputs: { iInputTrigger: $(this).attr("id") } } );
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

        unbindEvents( application: KatAppInterface ): void {
            const inputSelector = application.element.data("katapp-input-selector");

            if ( inputSelector !== undefined ) {
                $(inputSelector, application.element).off(".RBLe");
                application.element.removeData("katapp-input-selector")
            }
        }
    }
    const ui = new UIUtilities();

    class RBLeUtilities {
        setResults( application: KatAppInterface, results: JSON | undefined ): void {
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

        getRegistrationData( application: KatAppInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void {
        
            if ( currentOptions.getRegistrationData === undefined ) 
            {
                next( "getRegistrationData handler does not exist." );
                return;
            }
    
            currentOptions.getRegistrationData( 
                application,
                currentOptions, 
                data => { next( undefined, data ); },
                ( _jqXHR, textStatus ) => {
                    application.trace("getRegistrationData AJAX Error Status: " + textStatus);
                    next( "getRegistrationData AJAX Error Status: " + textStatus );
                }
            );  
        }
    
        registerData( application: KatAppInterface, currentOptions: KatAppOptions, data: GetRegistrationDataResult, next: PipelineCallback ): void {
            const register =
                currentOptions.registerData ??
                function( _app, _o, done, fail ): void {
                    const traceCalcEngine = application.element.data("katapp-trace-calc-engine") === "1";
                    const calculationOptions: SubmitRegistrationOptions = {
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
                        Registration: "[guid]",
                        TransactionPackage: JSON.stringify(calculationOptions)
                    };
    
                    const jsonParams = {
                        url: KatApp.corsProxyUrl,
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
        
            const registerDone: RegistrationResultCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception == undefined ) {
                    application.options.registeredToken = currentOptions.registeredToken = payload.RegisteredToken;
                    ui.triggerEvent( application, "onRegistration", currentOptions, application );
                    next();
                }
                else {
                    application.trace("registerData Error Status: " + payload.Exception.Message);
                    next( "RBLe Register Data Error: " + payload.Exception.Message );
                }
            }
    
            register( application, currentOptions, registerDone, registerFailed );
        }
    
        submitCalculation( application: KatAppInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void {
            
            if ( currentOptions.registeredToken === undefined ) {
                next( "submitCalculation no registered token." );
                return;
            }
            
            const that = this;
            const saveCalcEngineLocation = application.element.data("katapp-save-calc-engine");
            const traceCalcEngine = application.element.data("katapp-trace-calc-engine") === "1";
            const refreshCalcEngine = application.element.data("katapp-refresh-calc-engine") === "1";
            // TODO: COnfirm all these options are right
            const calculationOptions: SubmitCalculationOptions = {
                Inputs: application.inputs = KatApp.extend( ui.getInputs( application, currentOptions ), currentOptions?.manualInputs ),
                InputTables: ui.getInputTables( application ), 
                Configuration: {
                    CalcEngine: currentOptions.calcEngine,
                    Token: currentOptions.registeredToken,
                    TraceEnabled: traceCalcEngine ? 1 : 0,
                    InputTab: currentOptions.inputTab as string,
                    ResultTabs: currentOptions.resultTabs as string[],
                    SaveCE: saveCalcEngineLocation,
                    RefreshCalcEngine: refreshCalcEngine || ( currentOptions.refreshCalcEngine ?? false ),
                    PreCalcs: undefined // TODO: search service for update-tp, need to get that logic in there
                }
            };
    
            const submitDone: CalculationResultCallback = function( payload ): void {
                if ( payload.payload !== undefined ) {
                    payload = JSON.parse(payload.payload);
                }
    
                if ( payload.Exception === undefined ) {
                    that.setResults( application, payload.RBL?.Profile.Data.TabDef );
                    next();
                }
                else {
                    application.trace( "RBLe Service Result Exception: " + payload.Exception.Message )
                    next( "RBLe Service Result Exception: " + payload.Exception.Message );
                }
            };
    
            const submitFailed: JQueryFailCallback = function( _jqXHR, textStatus ): void {
                application.trace("submitCalculation AJAX Error Status: " + textStatus);
                next( "submitCalculation AJAX Error Status: " + textStatus );
            };
    
            const submit =
                currentOptions?.submitCalculation ??
                function( _app, o, done, fail ): void {
                    $.ajax({
                        url: KatApp.corsProxyUrl,
                        data: JSON.stringify(o),
                        method: "POST",
                        dataType: "json",
                        headers: { 'x-rble-session': calculationOptions.Configuration.Token, 'Content-Type': undefined }
                    })
                    .done( done )
                    .fail( fail )
                };
    
            submit( application, calculationOptions, submitDone, submitFailed );
        }

        getResultRow( application: KatAppInterface, table: string, key: string, columnToSearch?: string ): JSON | undefined { 
            const rows = this[table];

            if (rows === undefined) return undefined;

            let rowLookups = application.resultRowLookups;

            if ( rowLookups === undefined ) {
                application.resultRowLookups = rowLookups = [];
            }

            const lookupKey = table + (columnToSearch ?? "");
            const lookupColumn = columnToSearch ?? "@id";
            
            let lookupInfo: RowLookup = rowLookups[lookupKey];

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
                return rows[rowIndex];
            }

            return undefined;
        }

        getResultValue( application: KatAppInterface, table: string, key: string, column: string, defaultValue?: string ): string | undefined { 
            const row = this.getResultRow( application, table, key );
            if (row === undefined) return defaultValue;
            const col = row[column];
            if (col === undefined) return defaultValue;
            return col;
        }

		getResultTable<T>( application: KatAppInterface, tableName: string): Array<T> {
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

        processTemplate( application: KatAppInterface, templateId: string, data: JQuery.PlainObject ): string {
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
    
        createHtmlFromResultRow( application: KatAppInterface, resultRow: HtmlContentRow ): void {
            const view = application.element;
            let content = resultRow.content ?? resultRow.html ?? resultRow.value ?? "";
            let selector = resultRow.selector ?? resultRow['@id'] + "";

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

        processResults( application: KatAppInterface ): boolean {
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

                const markUpRows = this.getResultTable<HtmlContentRow>( application, "ejs-markup" )
                markUpRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });
                
                const outputRows = this.getResultTable<HtmlContentRow>( application, "ejs-output" )
                outputRows.forEach( r => { this.createHtmlFromResultRow( application, r ); });

                application.trace( "Finished processing results for " + calcEngineName + "(" + version + ")." );
                return true;
            }
            else {
                application.trace( "Results not available." );
                return false;
            }
        }
    }
    const rble = new RBLeUtilities();

    class KatAppProvider implements KatAppProviderInterface
    {
        // Template logic.. if no flag, get template, but then check flag again before inserting into DOM in case another processes loaded the template.
        _templatesLoaded: { 
            [ key: string ]: boolean; 
        } = {};
        _templateClientScripts: { 
            [ key: string ]: string; 
        } = {};
        _sharedRegisteredToken?: string;

        constructor(applications: ApplicationShim[] )
        {
            applications.forEach( a => { 
                this.init( a.application );
                // a.needsCalculation is set if they explicitly call calculate(), but on this
                // initial transfer from Shim to real Provider, we don't want to double call
                // calculate if the options already has callCalculateOnInit because the call
                // above to init() will call calculate.
                if ( a.needsCalculation && !a.application.options.runConfigureUICalculation ) {
                    this.calculate( a.application, a.calculateOptions );
                }
            });
        }
        
        init( application: KatAppInterface ): void {

            // re-assign the provider to replace shim with actual implementation
            application.provider = this;
            application.element.attr("rbl-application-id", application.id);

            const that = this;

            (function(): void {
                const pipeline: Array<()=> void> = [];
                let pipelineIndex = 0;
    
                const next = function(offest: number ): void {
                    pipelineIndex += offest;
                    if ( pipelineIndex < pipeline.length ) {                    
                        pipeline[ pipelineIndex++ ]();
                    }
                };
    
                let pipelineError: string | undefined = undefined;
                let resourcesToFetch = [ application.options.viewTemplates, application.options.view ].filter( r => r !== undefined ).join(",");
    
                const useTestView = application.options.useTestView ?? KatApp.pageParameters[ "testview"] === "1" ?? false;
                const serviceUrl = application.options.serviceUrl ?? KatApp.serviceUrl;
                const viewId = application.options.view;
                let viewTemplates: string | undefined = undefined;

                // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                const requestedTemplates: string[] = application.options.viewTemplates != undefined
                    ? application.options.viewTemplates.split( "," )
                    : [];

                // Build up the list of resources to get from KatApp Markup
                let resourceNames = resourcesToFetch.split( "," ).filter( r => !( that._templatesLoaded[ r ] ?? false ) );
                resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates
                
                pipeline.push( 
                    // Get View and Templates configured on KatApp
                    function(): void { 
                        if ( resourcesToFetch !== "" ) {
                            KatApp.getResources( serviceUrl, resourcesToFetch, useTestView, false,
                                ( errorMessage, data ) => {                                
                                    const resourceData = data as ResourceResults;
    
                                    if ( errorMessage === undefined && resourceData !== undefined ) {
                                        application.trace(resourcesToFetch + " returned from CMS.");
                                    
                                        resourceNames.forEach( r => {
                                            const data = resourceData[ r ];
    
                                            if ( r === viewId ) {
                                                // Process as view
                                                const view = $("<div>" + data.replace( "{thisview}", "[rbl-application-id='" + application.id + "']" ) + "</div>");
                                                const rblConfig = $("rbl-config", view).first();
                    
                                                if ( rblConfig.length !== 1 ) {
                                                    application.trace("View " + viewId + " is missing rbl-config element.");
                                                }
                                                else {
                                                    application.options.calcEngine = application.options.calcEngine ?? rblConfig.attr("calc-engine");
                                                    viewTemplates = rblConfig.attr("templates");
                                                    application.options.inputTab = application.options.inputTab ?? rblConfig.attr("input-tab");
                                                    const attrResultTabs = rblConfig.attr("result-tabs");
                                                    application.options.resultTabs = application.options.resultTabs ?? ( attrResultTabs != undefined ? attrResultTabs.split( "," ) : undefined );
                                                    application.element.append( view.html() );
                                                }
                                            }
                                            else if ( !( that._templatesLoaded[ r ] ?? false ) ) {
                                                that._templatesLoaded[ r ] = true;

                                                // TOM: create container element 'rbl-templates' with an attribute 'rbl-t' for template content 
                                                // and this attribute used for checking(?)
                                                
                                                // Remove extension if there is one, could be a problem if you do Standard.Templates, trying to get
                                                // Standard.Templates.html.
                                                const resourceParts = r.split(":");
                                                const tId = ( resourceParts.length > 1 ? resourceParts[ 1 ]: resourceParts[ 0 ] ).replace(/\.[^/.]+$/, "");
                                                const t = $("<rbl-templates style='display:none;' rbl-t='" + tId + "'>" + data + "</rbl-templates>");

                                                const viewScript = $("script[rbl-script='view']", t);

                                                if ( viewScript.length === 1 ) {
                                                    that._templateClientScripts[ r ] = viewScript[ 0 ].outerHTML;
                                                    viewScript.remove();
                                                }

                                                t.appendTo("body");
                
                                                application.trace( "Loaded template [" + r + "] for [" + viewId + "]." );
                                            }
                                        });
                                    }
                                    else {
                                        pipelineError = errorMessage;
                                    }
                
                                    // Now build up a list of templates that were specified inside the view markup
                                    if ( viewTemplates != undefined ) {
                                        // Gather up all requested templates, and then inject any 'client specific' script that is needed.
                                        requestedTemplates.concat( viewTemplates.split( "," ) );

                                        resourceNames = viewTemplates.split( "," ).filter( r => !( that._templatesLoaded[ r ] ?? false ) );
                                        resourcesToFetch = resourceNames.join(","); // Join up again after removing processed templates

                                        if ( resourcesToFetch !== "" ) {
                                            const currentTemplates = application.options.viewTemplates !== undefined ? application.options.viewTemplates + "," : "";
                                            application.options.viewTemplates = currentTemplates + resourcesToFetch;
                                            next( -1 ); // Do this step over again to load new resources
                                        }
                                        else {
                                            next( 0 ); // move on to next if no new resources to load
                                        }
                                    }
                                    else {
                                        next( 0 ); // move on to next if no viewTemplates specified
                                    }
                                }
                            );
                        }
                        else {
                            next( 0 ); // move on to next if no view/viewTemplates specified on KatApp
                        }
                    },
                    // Final processing
                    function(): void {
                        if ( pipelineError === undefined ) {
                            
                            // Now, for every unique template reqeusted by client, if the template had <script rbl-script="view"/> 
                            // associated with it, I can inject that view specific code (i.e. event handlers) for the currently
                            // processing application
                            requestedTemplates
                                .filter((v, i, a) => v !== undefined && v.length != 0 && a.indexOf(v) === i && that._templateClientScripts[ v ] !== undefined ) // unique
                                .forEach( t => {
                                    const data = that._templateClientScripts[ t ];
                                    const script = $(data.replace( "{thisview}", "[rbl-application-id='" + application.id + "']" ));
                                    script.appendTo("body");
                                });

                            // Build up template content that DOES NOT use rbl results, but instead just 
                            // uses data-* to create a dataobject generally used to create controls like sliders.                    
                            $("[rbl-tid]:not([rbl-source])", application.element).each(function () {
                                const templateId = $(this).attr('rbl-tid');
                                if (templateId !== undefined) {
                                    //Replace content with template processing, using data-* items in this pass
                                    $(this).html(rble.processTemplate(application, templateId, $(this).data()));
                                }
                            });

                            ui.bindEvents( that, application );
                
                            ui.triggerEvent( application, "onInitialized", application );

                            if ( application.options.runConfigureUICalculation ) {
                                const customOptions: KatAppOptions = {
                                    manualInputs: { iConfigureUI: 1 }
                                };
                                that.calculate( application, customOptions );
                            }
                        }
                        else {
                            application.trace( "Error during Provider.init: " + pipelineError );
                        }
                    }
                );
    
                // Start the pipeline
                next( 0 );
            })();
        }

        calculate( application: KatAppInterface, customOptions?: KatAppOptions ): void {

            const shareRegisterToken = application.options.shareRegisterToken ?? false;
            if ( shareRegisterToken ) {
                application.options.registeredToken = this._sharedRegisteredToken;
            }

            // Build up complete set of options to use for this calculation call
            const currentOptions = KatApp.extend(
                {}, // make a clone of the options
                application.options, // original options
                customOptions, // override options
            ) as KatAppOptions;

            ui.triggerEvent( application, "onCalculateStart", application );

            const that = this;

            (function(): void {
                const pipeline: Array<()=> void> = [];
                let pipelineIndex = 0;
    
                const next = function( offset: number ): void {
                    pipelineIndex += offset;
    
                    if ( pipelineIndex < pipeline.length ) {                    
                        pipeline[ pipelineIndex++ ]();
                    }
                };
    
                let pipelineError: string | undefined = undefined;
                let registrationData: GetRegistrationDataResult | undefined = undefined;
    
                pipeline.push( 
                    // Attempt First Submit
                    function(): void { 
                        rble.submitCalculation( 
                            application, currentOptions, 
                            // If failed, let it do next job (getRegistrationData), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; next( errorMessage !== undefined ? 0 : 3 );
                            } 
                        );
                    },
                    // Get Registration Data
                    function(): void {
                        rble.getRegistrationData( 
                            application, currentOptions, 
                            // If failed, then I am unable to register data, so just jump to finish, otherwise continue to registerData
                            ( errorMessage, data ) => { 
                                pipelineError = errorMessage; registrationData = data as GetRegistrationDataResult;  next( errorMessage !== undefined ? 2 : 0 );
                            } 
                        );
                    },
                    // Register Data
                    function(): void {
                        rble.registerData( 
                            application, currentOptions, registrationData as GetRegistrationDataResult,
                            // If failed, then I am unable to register data, so just jump to finish, otherwise continue to submit again
                            errorMessage => { 
                                pipelineError = errorMessage; 
    
                                if ( errorMessage === undefined && shareRegisterToken ) {
                                    that._sharedRegisteredToken = application.options.registeredToken;
                                }
    
                                next( errorMessage !== undefined ? 1 : 0 );
                            } 
                        );
                    },
                    // Submit Again (if needed)
                    function(): void {
                        rble.submitCalculation( 
                            application, currentOptions, 
                            // If failed, let it do next job (getRegistrationData), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; next( 0 );
                            } 
                        );
                    },
                    // Finish
                    function(): void {
                        if ( pipelineError === undefined ) {
                            rble.processResults( application );
    
                            if ( application.inputs?.iConfigureUI === 1 ) {
                                ui.triggerEvent( application, "onConfigureUICalculation", application.results, currentOptions, application );
                            }
                            ui.triggerEvent( application, "onCalculation", application.results, currentOptions, application );
            
                            application.element.removeData("katapp-save-calc-engine");
                            application.element.removeData("katapp-trace-calc-engine");
                            application.element.removeData("katapp-refresh-calc-engine");
                        }
                        else {
                            rble.setResults( application, undefined );
                            // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                            ui.triggerEvent( application, "onCalculationError", "RunCalculation", currentOptions, application );
                        }
        
                        ui.triggerEvent( application, "onCalculateEnd", application );
                    }
                )
    
                // Start the pipeline
                next( 0 );
            })();
        }

        destroy( application: KatAppInterface ): void { 
            application.element.removeAttr("rbl-application-id");
            $(application.element).off(".RBLe");
            ui.unbindEvents( application );
            ui.triggerEvent( application, "onDestroyed", application );
        }

        updateOptions( application: KatAppInterface ): void { 
            ui.unbindEvents( application );
            ui.bindEvents( this, application );
            ui.triggerEvent( application, "onOptionsUpdated", application );
        }

        getResultRow(application: KatAppInterface, table: string, id: string, columnToSearch?: string ): JSON | undefined { 
            return rble.getResultRow( application, table, id, columnToSearch ); 
        }
        getResultValue( application: KatAppInterface, table: string, id: string, column: string, defautlValue?: string ): string | undefined { 
            return rble.getResultValue( application, table, id, column, defautlValue ); 
        }
        saveCalcEngine( application: KatAppInterface, location: string ): void {
            application.element.data("katapp-save-calc-engine", location);
        }
        refreshCalcEngine( application: KatAppInterface ): void {
            application.element.data("katapp-refresh-calc-engine", "1");
        }
        traceCalcEngine( application: KatAppInterface ): void {
            application.element.data("katapp-trace-calc-engine", "1");
        }
    }

    const providerShim = $.fn[pluginName].provider as KatAppProviderShim;
    $.fn[pluginName].provider = new KatAppProvider(providerShim.applications);
});
// Needed this line to make sure that I could debug in VS Code since this was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js