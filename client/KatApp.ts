const pluginName = 'KatApp';

// Static options available in js via KatApp.*
class KatApp
{
    static serviceUrl = "https://btr.lifeatworkportal.com/services/evolution/Calculation.ashx";
    static corsProxyUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";

    static readPageParameters(): JSON {
        const params = {};
        const paramsArray = window.location.search.substr(1).split('&');

        for (let i = 0; i < paramsArray.length; ++i)
        {
            const param = paramsArray[i]
                .split('=', 2);

            if (param.length !== 2)
                continue;

            params[param[0].toLowerCase()] = decodeURIComponent(param[1].replace(/\+/g, " "));
        }

        return params as JSON;
    }

    static pageParameters = KatApp.readPageParameters();

    // Default Options
    static defaultOptions: KatAppOptions =
    {
        enableTrace: false,
        shareRegisterToken: true,
        serviceUrl: KatApp.serviceUrl,
        currentPage: "Unknown",
        inputSelector: "input",
        inputTab: "RBLInput",
        resultTabs: ["RBLResult"],
        runConfigureUICalculation: true,
        ajaxLoaderSelector: ".ajaxloader",
        useTestCalcEngine: KatApp.pageParameters[ "save" ] === "1",

        onCalculateStart: function( application: KatAppInterface ) {
            if ( application.options.ajaxLoaderSelector !== undefined ) {
                $( application.options.ajaxLoaderSelector, application.element ).show();
            }
            $( ".RBLe .slider-control, .RBLe input", application.element ).attr("disabled", "true");
        },
        onCalculateEnd: function( application: KatAppInterface ) {
            if ( application.options.ajaxLoaderSelector !== undefined ) {
                $( application.options.ajaxLoaderSelector, application.element ).fadeOut();
            }
            $( ".RBLe .slider-control, .RBLe input", application.element ).removeAttr("disabled");
        }
    };
    
    // https://blog.logrocket.com/4-different-techniques-for-copying-objects-in-javascript-511e422ceb1e/
    // Wanted explicitly 'undefined' properties set to undefined and jquery .Extend() didn't do that
    static extend(target: object, ...sources: ( object | undefined )[]): object {
        sources.forEach((source) => {
            if ( source === undefined ) return;

            Object.keys(source).forEach((key) => {
                
                // Always do deep copy
                if ( typeof source[key] === "object" && target[key] != undefined ) {
                    KatApp.extend( target[key], source[key] );
                }
                else {
                    target[key] = source[key];
                }

            })
        })
        return target
    };

    static getResources( serviceUrl: string | undefined, resources: string, useTestVersion: boolean, isScript: boolean, pipelineDone: PipelineCallback ): void {
        const url = serviceUrl ?? KatApp.defaultOptions.serviceUrl ?? KatApp.serviceUrl;
        const resourceArray = resources.split(",");

        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string

        let pipeline: Array<()=> void> = [];
        let pipelineIndex = 0;

        const next = function(): void {
            if ( pipelineIndex < pipeline.length ) {                    
                pipeline[ pipelineIndex++ ]();
            }
        };

        (function(): void {
            let pipelineError: string | undefined = undefined;

            const resourceResults: ResourceResults = {};
    
            // Build a pipeline of functions for each resource requested.
            // TODO: Figure out how to make this asynchronous
            pipeline = resourceArray.map( r => {
                return function(): void {
                    if ( pipelineError !== undefined ) {
                        next();
                        return;
                    }
    
                    const resourceParts = r.split(":");
                    let resource = resourceParts.length > 1 ? resourceParts[ 1 ] : resourceParts[ 0 ];
                    const folder = resourceParts.length > 1 ? resourceParts[ 0 ] : "Global"; // if no folder provided, default to global
                    const version = resourceParts.length > 2 ? resourceParts[ 2 ] : ( useTestVersion ? "Test" : "Live" ); // can provide a version as third part of name if you want
    
                    // Template names often don't use .html syntax
                    if ( !resource.endsWith( ".html" ) && !isScript ) {
                        resource += ".html";
                    }
    
                    const params = "?{Command:'KatAppResource',Resource:'" + resource + "',Folder:'" + folder + "',Version:'" + version + "'}";
        
                    if ( isScript ) {
                        // $.getScript(url + params);                    
                        // Debug version without having to upload to MgmtSite
                        $.getScript("js/" + resource)
                            .done( () => { next(); } )
                            .fail( ( _jqXHR: JQuery.jqXHR, textStatus: string) => {
                                pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                                next();
                            } );
                    }
                    else {
                        // $.get(url + params)
                        // Debug version without having to upload to MgmtSite
                        $.get("templates/" + resource)
                            .done( data => {
                                resourceResults[ r ] = data;
                                next();
                            } )
                            .fail( ( _jqXHR: JQuery.jqXHR, textStatus: string) => {
                                pipelineError = "getResources failed requesting " + r + ":" + textStatus;
                                next();
                            } );
                    }
                }
            }).concat( 
                [
                    // Last function
                    function(): void {
                        if ( pipelineError !== undefined ) {
                            pipelineDone( pipelineError );
                        }
                        else {
                            pipelineDone( undefined, resourceResults );
                        }
                    }
                ]
            );
    
            // Start the pipeline
            next();
        })();
    }
}

// In 'memory' application references until the real KatAppProvider.js is loaded and can 
// register them with the service.
class ApplicationShim
{
    application: KatAppInterface;
    calculateOptions?: KatAppOptions;
    needsCalculation = false;

    constructor( application: KatAppInterface ) {
        this.application = application;
    }
}

// 'In memory' KatApp Provider that stores any attempted .KatApp() initializations until the
// real KatAppProvider.js script can be loaded from the CMS to properly register the applications
class KatAppProviderShim implements KatAppProviderInterface
{
    applications: ApplicationShim[] = []

    init(application: KatAppInterface): void {
        if ( this.applications.length === 0 ) {
            // First time anyone has been called with .KatApp()
            const useTestService = application.options.useTestPlugin ?? KatApp.pageParameters[ "testplugin"] === "1" ?? false;
            KatApp.getResources( undefined, "Global:KatAppProvider.js", useTestService, true,
                function( errorMessage ) {
                    if ( errorMessage !== undefined ) {
                        application.trace("KatAppProvider library could not be loaded.");
                    }
                    else {
                        application.trace("KatAppProvider library loaded.");
                    }
                }
            );
        }

        this.applications.push( new ApplicationShim( application ) );
    }

    calculate( application: KatAppInterface, options?: KatAppOptions ): void {
        const shim = this.applications.filter( a => a.application.id === application.id ).shift();
        if ( shim ) {
            shim.calculateOptions = options;
            shim.needsCalculation = true;
        }
    }

    updateOptions(): void { /* Do nothing until real provider loads */ }
    saveCalcEngine(): void { /* Do nothing until real provider loads */ }
    traceCalcEngine(): void { /* Do nothing until real provider loads */ }
    refreshCalcEngine(): void { /* Do nothing until real provider loads */ }
    
    getResultValue(): string | undefined { return undefined; } // Do nothing until real provider loads
    getResultRow(): JSON | undefined { return undefined; } // Do nothing until real provider loads

    destroy( application: KatAppInterface ): void { 
        // Remove from memory cache in case they call delete before the
        // real provider is loaded
        let shimIndex = -1;

        // Wanted to use applications.findIndex( f() ) but ie doesn't support
        this.applications.forEach( ( a, index ) => {
            if ( shimIndex === -1 && a.application.id == application.id ) {
                shimIndex = index;
            }
        });

        if ( shimIndex > -1 ) {
            this.applications.splice( shimIndex, 1 );
        }
    }
}

(function($, window, document, undefined?: undefined): void {

    class KatAppPlugIn implements KatAppInterface
    {
        // Fields
        element: JQuery;
        options: KatAppOptions;
        id: string;
        provider: KatAppProviderInterface;
        calculationResults?: JSON;

        constructor(id: string, element: JQuery, options: KatAppOptions, provider: KatAppProviderInterface)
        {
            this.id = id;
            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.

            // Transfer data attributes over if present...
            const attrResultTabs = element.attr("rbl-result-tabs");
            const attributeOptions: KatAppOptions = {
                calcEngine: element.attr("rbl-calc-engine") ?? KatApp.defaultOptions.calcEngine,
                inputTab: element.attr("rbl-input-tab") ?? KatApp.defaultOptions.inputTab,
                resultTabs: attrResultTabs != undefined ? attrResultTabs.split(",") : KatApp.defaultOptions.resultTabs,
                view: element.attr("rbl-view"),
                viewTemplates: element.attr("rbl-view-templates")
            };

            this.options = KatApp.extend(
                {}, // make a clone (so we don't have all plugin targets using same reference)
                KatApp.defaultOptions, // start with default options
                attributeOptions, // data attribute options have next precedence
                options // finally js options override all
            );

            this.element = element;
            this.element[ 0 ][ pluginName ] = this;
            this.provider = provider;

            this.provider.init( this );
        }
        results?: JSON | undefined;
        resultRowLookups?: RowLookup[] | undefined;
        inputs?: CalculationInputs | undefined;
    
        calculate( options?: KatAppOptions ): void {
           this.provider.calculate( this, options );
        }

        saveCalcEngine( location: string ): void {
            this.provider.saveCalcEngine( this, location );
         }
         traceCalcEngine(): void {
            this.provider.traceCalcEngine( this );
         }
         refreshCalcEngine(): void {
            this.provider.refreshCalcEngine( this );
         }
  
        configureUI( customOptions?: KatAppOptions ): void {
            const manualInputs: KatAppOptions = { manualInputs: { iConfigureUI: 1 } };
            this.provider.calculate( this, KatApp.extend( {}, customOptions, manualInputs ) );
        }

        destroy(): void {
            this.provider.destroy( this );
            delete this.element[ 0 ][ pluginName ];
        }
    
        updateOptions( options: KatAppOptions ): void {
            this.options = KatApp.extend(/* true, */ this.options, options);
            this.provider.updateOptions( this );
        }

        getResultRow( table: string, id: string, columnToSearch?: string ): JSON | undefined {
            return this.provider.getResultRow( this, table, id, columnToSearch );
        }
        getResultValue( table: string, id: string, column: string, defaultValue?: string ): string | undefined {
            return this.provider.getResultValue( this, table, id, column, defaultValue );
        }

        trace( message: string ): void {
            if ( this.options.enableTrace ?? false ) {
                const id = this.element.attr("rbl-trace-id") ?? this.id;
                const className = this.element[ 0 ].className ?? "No classes";
                const viewId = this.element.attr("rbl-view") ?? "None";
                const item = $("<div>Application " + id + " (class=" + className +", view=" + viewId + "): " + message + "</div>");
                console.log( item.text() );
                $(".rbl-logclass").append( item); 
            }
        }
    }
    
    /*
    const privateMethod = function(this: KatAppPlugIn): void
    {
        // Private method not accessible outside plug in, however, if you want to call it from plug in implementation,
        // need to call via privateMethod.apply(this); so that the PlugIn is the 'this context'        
    }
    */
    
    const allowedPropertyGetters = ['options'];
    const autoInitMethods = ['calculate', 'updateOptions'];

    // https://stackoverflow.com/a/2117523
    const getId = function(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
            function (c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }
        );
    };

    // Not a fan of these 'magic' strings to call methods:
    //
    //      $("selector").KatApp("destroy")
    //
    // But other libraries (selectpicker, datepicker) seem to do same.
    //
    // Highcharts - they always seem to want you to grab an element and work with object from there:
    //
    //      $("select").each( function() { $(this).highcharts().destroy() } );
    //
    //      This mechanism would work for ours too.  But I feel ours is better, you just have this.KatApp property
    //      not calling the 'plugin' again (which theirs only assumes to work with one element, in code they do this[0])
    //
    // noUiSlider - They aren't even a plugin, just a javascript library.
    //
    // MatchHeight - they allow you to register items correctly, but then allow you to hit methods via directly hitting prototype 
    //               global options.  So they are 'almost' just a javascript library.  You can 'initalize' it with jQuery plugin 
    //               style code, but then you have free reign to all their state and methods.
    //
    //      $.fn.matchHeight._beforeUpdate = function() { };
    //      $.fn.matchHeight._apply(elements, options); // manually apply options
    $.fn[pluginName] = function(options?: KatAppOptions | string, ...args: Array<string | number | KatAppOptions>): JQuery | undefined {

        if (options === undefined || typeof options === 'object') {
            
            if ( options == undefined && this.length > 0 && this.first()[0][pluginName] != null ) {
                return this.first()[0][pluginName];
            }

            // Creates a new plugin instance, for each selected element, and
            // stores a reference within the element's data
            return this.each(function(): void {

                if (!this[pluginName]) {
                    const provider = $.fn[pluginName].provider as KatAppProviderInterface;
                    new KatAppPlugIn(getId(), $(this), options as KatAppOptions, provider);
                }

            });

        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            
            // Call a public pluguin method (not starting with an underscore) for each 
            // selected element.
            if (args.length == 0 && $.inArray(options, allowedPropertyGetters) != -1 ) {
            
                // If the user does not pass any arguments and the method allows to
                // work as a getter then break the chainability so we can return a value
                // instead the element reference.  this[0] should be the only item in selector and grab getter from it.
                const instance = this[0][pluginName];
                
                return typeof instance[options] === 'function'
                    ? instance[options].apply(instance) // eslint-disable-line prefer-spread
                    : instance[options];
            
            } else {
            
                // Invoke the speficied method on each selected element
                return this.each(function(): void {
                    let instance = this[pluginName];

                    // If plugin isn't created yet and they call a method, just auto init for them
                    if ( instance === undefined && typeof options === 'string' && $.inArray(options, autoInitMethods) != -1 ) {
                        const provider = $.fn[pluginName].provider as KatAppProviderInterface;
                        const appOptions = ( args.length >= 1 && typeof args[ 0 ] === "object" ? args[ 0 ] : undefined ) as KatAppOptions;
                        instance = new KatAppPlugIn(getId(), $(this), appOptions, provider);
                    }

                    if (instance instanceof KatAppPlugIn && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args); // eslint-disable-line prefer-spread
                    }
                });
            
            }

        }
    };

    $.fn[pluginName].provider = new KatAppProviderShim();

})(jQuery, window, document);