// TODO
// - How do I check/handle for errors when I try to load view
// - Do I want to call calculate in updateOptions?  They could bind and call if they need to I guess
// - Ability to have two CE's for one view might be needed for stochastic
//      Would need to intercept init that binds onchange and instead call a getOptions or smoething
//      on each input, or maybe a rbl-calcengine tag on each input?

// Discussions with Tom
// - Templates run every calc?  Will that goof up slider config?  Need to read code closer
//      - For example, arne't you hooking up events every time to carousel?  Since you aren't removing events?  WHere you said there were events hanging around?
//      - Seems like you need a way to only update the 'markup' of carousel vs rebuilding entire thing?  Otherwise, probably need/should hookup a 'calcstart event' in templates to remove event handlers

/*
    - Yours
        - Pro
            - Passed templated element in function call (don't have to .each() within template code)
        - Con
            - Diff/non-standard mechanism of registering functions.
            - If 4 distinct templates are loaded with one or more register control fucntions for two views on a page, 
                every view calculation you'll loop all (4+) control functions and 'try' to run it

                Every time view1 triggers calc, will call all four functions below, but template 2 & 4 have namespace/selector
                conflict b/c both use same thing.

                view1
                    template1 - reg selector: [unique1]
                    teamplte2 - reg selector: [carousel]
                view2
                    template3 - reg selector: [unique2]
                    template4 - reg, selector: [carousel]

    - templateOn() way
        - Pro
            - 'looks' like jquery/bootstrap on() syntax, so less jarring hopefully
            - No duplicated code snippets for each view containing template
            - No namespace issue b/c ran once
            - Register an 'event' instead of a 'function' then don't have to make two calls like yours
        - Con
            - $.fn.KatApp.templateOn() - I'm familiar with using $.fn.* calls but not sure if just because of the libraries I currently use. To me more clear that you are just calling 
                a global function vs $().RBL() ... which $() I haven't seen used before and confused me
            - Need to use {thisTemplate}, so code will always be $.fn.KatApp.templateOn("{thisTemplate}", "onCalculation.RBLe", function() { });
            - Still (by choice) making them do selector and foreach themselves, think it keeps code consistent (onCalculation this is 'always' app/view) but could change if required
*/

// - Show how bunch of errors are happening in boscomb (missing source elements)
// - Search for TOM comments
// - Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?
// - Need to figure out if we have name conflicts with id's put in katapps, tom's docs made comment about name vs id, read again
//      - i.e. what if two views on a page have iRetAge...now that it isn't asp.net (server ids), maybe we get away with it?
// - Would be consistent about -'s in attributes, meaning between every word or maybe none...I've seen -calcengine -calcengine, -inputname, etc.
// - Downfall to our paradigm of CMS managing KatAppProvider code is never caches script and loads it each time?

// External Usage Changes
// 1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
// 2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
// 3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
// 4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
// 5. Changed calcengine to calcengine in <rbl-config calcengine="Conduent_BiscombPOC_SE" templates="nonstandard_templates"></rbl-config> to match others
// 6. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'

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

$(function() {
    // Reassign options here (extending with what client/host might have already set) allows
    // options (specifically events) to be managed by CMS - adding features when needed.
    KatApp.defaultOptions = KatApp.extend(
        {
            enableTrace: false,
            registerDataWithService: true,
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
    const ui = new UIUtilities();

    class RBLeUtilities {
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
                        Registration: "[guid]",
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
                Inputs: application.inputs = KatApp.extend( ui.getInputs( application, currentOptions ), currentOptions?.manualInputs ),
                InputTables: ui.getInputTables( application ), 
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

        getResultRow( application: KatAppPlugInInterface, table: string, key: string, columnToSearch?: string ): JSON | undefined { 
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
            return this.getResultRow( application, table, key )?.[ column ] ?? defaultValue;
        }

        getResultValueByColumn( application: KatAppPlugInInterface, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined {
            return this.getResultRow( application, table, key, keyColumn)?.[ column ] ?? defaultValue;
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
                    application.trace("RBL ERROR: no data returned for rbl-value=" + el.attr('rbl-value'));
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
                        application.trace("RBL ERROR: Template content could not be found: [" + tid + "].");
                    }
                    else if ( rblSourceParts === undefined || rblSourceParts.length === 0) {
                        application.trace("RBL ERROR: no rbl-source data");
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
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }

                    } else if ( rblSourceParts.length === 2 ) {

                        const row = that.getResultRow( application, rblSourceParts[0], rblSourceParts[1] );
                        
                        if ( row !== undefined ) {
                            el.html( templateContent.format( row ) );
                        }
                        else {
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
                        }

                    }
                    else if ( rblSourceParts.length === 3 ) {
                        
                        const value = that.getResultValue( application, rblSourceParts[0], rblSourceParts[1], rblSourceParts[2]);
                        
                        if ( value !== undefined ) {
                            el.html( templateContent.format( { "value": value } ) );                                    
                        }
                        else {
                            application.trace("RBL ERROR: no data returned for rbl-source=" + el.attr('rbl-source'));
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
                    application.trace("RBL ERROR: no data returned for rbl-display=" + el.attr('rbl-display'));
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
    const rble = new RBLeUtilities();

    class KatAppPlugIn implements KatAppPlugInInterface {
        // Fields
        element: JQuery;
        options: KatAppOptions;
        id: string;
        calculationResults?: JSON;
        results?: JSON | undefined;
        resultRowLookups?: ResultRowLookupsInterface;
        inputs?: CalculationInputs | undefined;

        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = id;

            // Transfer data attributes over if present...
            const attrResultTabs = element.attr("rbl-result-tabs");
            const attributeOptions: KatAppOptions = {
                calcEngine: element.attr("rbl-calcengine") ?? KatApp.defaultOptions.calcEngine,
                inputTab: element.attr("rbl-input-tab") ?? KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: element.attr("rbl-view"),
                viewTemplates: element.attr("rbl-view-templates")
            };

            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend(
                {}, // make a clone (so we don't have all plugin targets using same reference)
                KatApp.defaultOptions, // start with default options
                attributeOptions, // data attribute options have next precedence
                options // finally js options override all
            );

            this.element = element;
            // re-assign the KatAppPlugIn to replace shim with actual implementation
            this.element[ 0 ].KatApp = this;

            this.init();
        }
    
        init(): void {
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
                                    $(this).html(rble.processTemplate(that, templateId, $(this).data()));
                                }
                            });

                            ui.bindEvents( that );
                
                            ui.triggerEvent( that, "onInitialized", that );

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

        calculate( customOptions?: KatAppOptions ): void {

            const shareRegistrationData = this.options.shareRegistrationData ?? false;
            if ( shareRegistrationData ) {
                this.options.registeredToken = _sharedRegisteredToken;
                this.options.data = _sharedData;
            }

            ui.triggerEvent( this, "onCalculateStart", this );

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
                        rble.submitCalculation( 
                            that, currentOptions, 
                            // If failed, let it do next job (getData), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; next( errorMessage !== undefined ? 0 : 3 );
                            } 
                        );
                    },
                    // Get Registration Data
                    function(): void {
                        rble.getData( 
                            that, currentOptions, 
                            // If failed, then I am unable to register data, so just jump to finish, otherwise continue to registerData
                            ( errorMessage, data ) => { 
                                pipelineError = errorMessage; 
                                registrationData = data as RBLeRESTServiceResult;  
                                
                                if ( errorMessage !== undefined ) {
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
                    },
                    // Register Data
                    function(): void {
                        rble.registerData( 
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
                    },
                    // Submit Again (if needed)
                    function(): void {
                        rble.submitCalculation( 
                            that, currentOptions,
                            // If failed, let it do next job (getData), otherwise, jump to finish
                            errorMessage => { 
                                pipelineError = errorMessage; 
                                next( 0 );
                            } 
                        );
                    },
                    // Finish
                    function(): void {
                        if ( pipelineError === undefined ) {
                            rble.processResults( that );
    
                            if ( that.inputs?.iConfigureUI === 1 ) {
                                ui.triggerEvent( that, "onConfigureUICalculation", that.results, currentOptions, that );
                            }
                            ui.triggerEvent( that, "onCalculation", that.results, currentOptions, that );
            
                            that.element.removeData("katapp-save-calcengine");
                            that.element.removeData("katapp-trace-calcengine");
                            that.element.removeData("katapp-refresh-calcengine");
                        }
                        else {
                            rble.setResults( that, undefined );
                            // TODO: Need error status key?  Might want to swap between calc and registration, but not sure
                            ui.triggerEvent( that, "onCalculationError", "RunCalculation", currentOptions, that );
                        }
        
                        ui.triggerEvent( that, "onCalculateEnd", that );
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
            ui.unbindEvents( this );
            ui.triggerEvent( this, "onDestroyed", this );
            delete this.element[ 0 ].KatApp;
        }

        updateOptions(): void { 
            ui.unbindEvents( this );
            ui.bindEvents( this );
            ui.triggerEvent( this, "onOptionsUpdated", this );
        }

        getResultTable<T>( tableName: string): Array<T> {
            return rble.getResultTable<T>( this, tableName );
        }
        getResultRow(table: string, id: string, columnToSearch?: string ): JSON | undefined { 
            return rble.getResultRow( this, table, id, columnToSearch ); 
        }
        getResultValue( table: string, id: string, column: string, defautlValue?: string ): string | undefined { 
            return rble.getResultValue( this, table, id, column, defautlValue ); 
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
        trace( message: string ): void {
            KatApp.trace( this, message );
        }
    }

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
    
    // Replace the applicationFactory to create real KatAppPlugIn implementations
    $.fn.KatApp.applicationFactory = function( id: string, element: JQuery, options: KatAppOptions): KatAppPlugIn {
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