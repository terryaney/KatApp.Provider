const pluginName = 'KatApp';

// Static options available in js via KatApp.*
class KatApp
{
    static functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    static corsUrl = "https://secure.conduentapplications.com/services/rbl/rbleproxy/RBLeCORS.ashx";

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
    
    // Default Options (shim, rest of the options/features added from server plugin)
    static defaultOptions: KatAppOptions =
    {
        enableTrace: false,
        functionUrl: KatApp.functionUrl,
        useTestPlugin: KatApp.pageParameters[ "testplugin"] === "1",
        useTestCalcEngine: KatApp.pageParameters[ "test" ] === "1"
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

    // https://stackoverflow.com/a/2117523
    static generateId = function(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
            function (c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }
        );
    };

    static trace( application: KatAppPlugInShimInterface | undefined, message: string ): void {
        if ( application?.options?.enableTrace ?? KatApp.defaultOptions.enableTrace ?? false ) {

            let item: JQuery | undefined = undefined;

            var d = new Date(),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear(),
                hours = '' + d.getHours(),
                minutes = '' + d.getMinutes(),
                seconds = '' + d.getSeconds();
    
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            if (hours.length < 2) hours = '0' + hours;
            if (minutes.length < 2) minutes = '0' + minutes;
            if (seconds.length < 2) seconds = '0' + seconds;
    
            const displayDate = [year, month, day].join('-') + " " + [hours, minutes, seconds].join(':');

            if ( application !== undefined ) {
                const traceId = application.element.attr("rbl-trace-id");
                const id = traceId ?? application.id;
                const className = application.element[ 0 ].className ?? "No classes";
                const viewId = application.element.attr("rbl-view") ?? "None";
                item = $("<div class='applog" + ( traceId ?? "" ) + "'>" + displayDate + " <b>Application " + id + "</b> (class=" + className +", view=" + viewId + "): " + message + "</div>");
            }
            else {
                item = $("<div>" + displayDate + ": " + message + "</div>");
            }
            console.log( item.text() /* remove any html formatting from message */ );
            $(".rbl-logclass").append( item ); 
        }
    }

    static getResources( functionUrl: string | undefined, resources: string, useTestVersion: boolean, isScript: boolean, pipelineDone: PipelineCallback ): void {
        (function(): void {
            const url = functionUrl ?? KatApp.defaultOptions.functionUrl ?? KatApp.functionUrl;
            const resourceArray = resources.split(",");
    
            // viewParts[ 0 ], viewParts[ 1 ]
            // folder: string, resource: string, optional Version
    
            let pipeline: Array<()=> void> = [];
            let pipelineIndex = 0;
    
            const next = function(): void {
                if ( pipelineIndex < pipeline.length ) {                    
                    pipeline[ pipelineIndex++ ]();
                }
            };

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
                    let resource = resourceParts[ 1 ];
                    const folder = resourceParts[ 0 ];
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

(function($, window, document, undefined?: undefined): void {

    class KatAppPlugInShim implements KatAppPlugInShimInterface
    {
        // Fields
        element: JQuery;
        options: KatAppOptions;
        id: string;

        constructor(id: string, element: JQuery, options: KatAppOptions)
        {
            this.id = id;

            // Take a copy of the options they pass in so same options aren't used in all plugin targets
            // due to a 'reference' to the object.
            this.options = KatApp.extend( {}, options );
            this.element = element;
            this.element[ 0 ][ pluginName ] = this;
        }
    
        destroy(): void {
            // Remove from memory cache in case they call delete before the
            // real provider is loaded
            let shimIndex = -1;

            const applications = $.fn[pluginName].plugInShims as KatAppPlugInShimInterface[];
            const id = this.id;
            // Wanted to use applications.findIndex( f() ) but ie doesn't support
            applications.forEach( ( a, index ) => {
                if ( shimIndex === -1 && a.id == id ) {
                    shimIndex = index;
                }
            });

            if ( shimIndex > -1 ) {
                applications.splice( shimIndex, 1 );
            }
            delete this.element[ 0 ][ pluginName ];
        }

        trace( message: string ): void {
            KatApp.trace( this, message );
        }
    }
    
    /*
    const privateMethod = function(this: KatAppPlugIn): void
    {
        // Private method not accessible outside plug in, however, if you want to call it from plug in implementation,
        // need to call via privateMethod.apply(this); so that the PlugIn is the 'this context'        
    }
    */
    
    const allowedPropertyGetters = ['options', 'id'];
    // const autoInitMethods = ['calculate', 'updateOptions'];

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
                    $.fn[pluginName].applicationFactory(KatApp.generateId(), $(this), options as KatAppOptions);
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
                    const instance = this[pluginName];

                    // No longer supporting this, see comment for needsCalculation in KatAppPlugInInterfaces.ts.  Just don't see the
                    // need and given pattern of providing full blown 'app' after server loads script, don't want to have to 
                    // support 'anything' on .KatApp() until onInitialized is completed.

                    /*
                    // If plugin isn't created yet and they call a method, just auto init for them
                    if ( instance === undefined && typeof options === 'string' && $.inArray(options, autoInitMethods) != -1 ) {
                        const appOptions = ( args.length >= 1 && typeof args[ 0 ] === "object" ? args[ 0 ] : undefined ) as KatAppOptions;
                        instance = $.fn[pluginName].applicationFactory(KatApp.generateId(), $(this), appOptions);
                    }
                    */

                    if (instance instanceof KatAppPlugInShim && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args); // eslint-disable-line prefer-spread
                    }
                });
            }
        }
    };

    // 'In memory' application list until the real KatAppProvider.js script can be loaded from 
    // the CMS to properly register the applications
    $.fn[pluginName].plugInShims = [];
    $.fn[pluginName].applicationFactory = function( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShim {
        const shim = new KatAppPlugInShim(id, element, options);

        const applications = $.fn[pluginName].plugInShims as KatAppPlugInShimInterface[];
        applications.push( shim );

        shim.trace("Starting factory");

        // First time anyone has been called with .KatApp()
        if ( applications.length === 1 ) {
            shim.trace("Loading KatAppProvider library...");

            const useTestService = shim.options?.useTestPlugin ?? KatApp.defaultOptions.useTestPlugin ?? false;

            KatApp.getResources( undefined, "Global:KatAppProvider.js", useTestService, true,
                function( errorMessage ) {
                    if ( errorMessage !== undefined ) {
                        shim.trace("KatAppProvider library could not be loaded.");
                    }
                    else {
                        shim.trace("KatAppProvider library loaded.");
                    }
                }
            );
        }
    
        shim.trace("Leaving factory");
    
        return shim;
    };

})(jQuery, window, document);