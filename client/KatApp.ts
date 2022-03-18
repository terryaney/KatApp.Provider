enum TraceVerbosity
{
    None,
    Quiet,
    Minimal,
    Normal,
    Detailed,
    Diagnostic
}

class KatApp
{
    static functionUrl = "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx";
    static sessionUrl = "https://btr.lifeatworkportal.com/services/evolution/Calculation.ashx";

    static stringCompare(strA: string, strB: string, ignoreCase: boolean): number {
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
        debug: {
            traceVerbosity: TraceVerbosity.None,
            useTestPlugin: KatApp.pageParameters[ "testplugin"] === "1",
            useTestView: KatApp.pageParameters[ "testview" ] === "1",
            saveConfigureUiCalculationLocation: KatApp.pageParameters[ "saveConfigureUI" ]
        },
        functionUrl: KatApp.functionUrl
    };
    
    // https://blog.logrocket.com/4-different-techniques-for-copying-objects-in-javascript-511e422ceb1e/
    // Wanted explicitly 'undefined' properties set to undefined and jquery .Extend() didn't do that
    static extend(target: object, ...sources: ( object | undefined )[]): object {
        sources.forEach((source) => {
            if ( source === undefined ) return;
            this.copyProperties( target, source );
        })
        return target;
    };
    static clone(source: object, replacer?: (this: any, key: string, value: any)=> any): object { // eslint-disable-line @typescript-eslint/no-explicit-any
        return this.copyProperties( {}, source, replacer );
    };
    private static copyProperties(target: object, source: object, replacer?: (this: any, key: string, value: any)=> any): object { // eslint-disable-line @typescript-eslint/no-explicit-any
        Object.keys(source).forEach((key) => {
            
            const value = replacer != undefined
                ? replacer( key, source[key] )
                : source[key];

            // Always do deep copy
            if ( typeof value === "object" && !Array.isArray( value ) ) {
                if ( target[key] === undefined || typeof target[key] !== "object" )
                {
                    target[key] = {};
                }
                this.copyProperties( target[key], value );
            }
            else {
                target[key] = value;
            }

        })
        return target;
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

    static trace( application: KatAppPlugInShimInterface | undefined, message: string, verbosity: TraceVerbosity = TraceVerbosity.Normal ): void {
        const verbosityOption = application?.options?.debug?.traceVerbosity ?? KatApp.defaultOptions.debug?.traceVerbosity ?? TraceVerbosity.None;

        if ( verbosityOption >= verbosity ) {

            let item: JQuery | undefined = undefined;

            const d = new Date(),
                year = d.getFullYear();
            let
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
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
                const markupDetails = verbosityOption === TraceVerbosity.Diagnostic ? " (class=" + className +", view=" + viewId + ")" : "";
                item = $("<div class='applog" + ( traceId ?? "" ) + "'>" + displayDate + " <b>Application " + id + "</b>" + markupDetails + ": " + message + "</div>");
            }
            else {
                item = $("<div>" + displayDate + ": " + message + "</div>");
            }
            console.log( item.text() /* remove any html formatting from message */ );            
            $(".rbl-logclass").show().append( item );
            $('.rbl-logclass:not(.rbl-do-not-scroll)').each(function() {
                this.scrollTop = this.scrollHeight;
            })
        }
    }

    static setNavigationInputs( inputs: {}, cachingKey: string | undefined ): void {
        const navigationCachingKey = cachingKey ?? "katapp:navigationInputs:global";
        const currentInputsJson = sessionStorage.getItem(navigationCachingKey);
        
        let currentInputs = currentInputsJson != undefined 
            ? JSON.parse( currentInputsJson ) 
            : {};

        currentInputs = this.extend( currentInputs, inputs );

        sessionStorage.setItem(navigationCachingKey, JSON.stringify(currentInputs) );
    }

    // ping and getResources duplicated in KatAppProvider now.  This allows for Views of L@W 
    // (or other clients that have own copy of KatApp.js but are unable to update it) to be served
    // from local server if enabled.
    static ping( url: string, callback: ( responded: boolean, error?: string | Event )=> void ): void {
        const ip = url.replace('http://','').replace('https://','').split(/[/?#]/)[0];

        $.ajax({
            converters: {
                'text script': function (text: string): string {
                    return text;
                }
            },
            url: "http://" + ip + "/js/ping.js",
            timeout: 1000,
            success: function( /* result */ ): void {
                callback(true);
            },     
            error: function( /* result */ ): void {
                callback( false );
            }
         });
    }

    static getResource( url: string, tryLocalWebServer: boolean, isInManagementSite: boolean, folder: string, name: string, version: string ): GetResourceXHR {
        // https://stackoverflow.com/a/66187724/166231
        // This link showed me how to get custom parameter sent back in call back
        
        const resource: KatAppResource = { Resource: name, Folder: folder, Version: version };
        const command = { 
            "Command": "KatAppResource", 
            "Resources": [ resource ] 
        };

        const ajaxUrl = !tryLocalWebServer && isInManagementSite
            ? url + "?" + JSON.stringify( command )
            : url; // If just file served up by local web server or hosting site web server, don't pass params
        
        const resourceResult: KatAppResourceResult = { Resource: name, Folder: folder, Version: version, Url: ajaxUrl };

        const requestConfig = {
            converters: {
                'text script': function (text: string): string {
                    return text;
                }
            },
            url: ajaxUrl,
            cache: !tryLocalWebServer
        };

        if ( !tryLocalWebServer ) {
            // https://stackoverflow.com/a/38690731/166231
            // requestConfig[ "ifModified" ] = true; // !tryLocalWebServer;
            requestConfig[ "headers" ] = { 'Cache-Control': 'max-age=0' };
        }

        const p = $.ajax(requestConfig);
        
        const result: GetResourceXHR = {
            ...p,
            done( s: ajaxGetResourceSuccessCallbackSpread ) {
                p.done(function (...args) {
                    // s.call(p, ...args, resourceResult);
                    s.call(p, args[ 0 ], args[ 1 ], args[ 2 ], resourceResult);
                });
                return result;
            },
            fail( f: ajaxGetResourceFailCallbackSpread ) {
                p.fail(function (...args) {
                    // f.call(p, ...args, resourceResult);
                    f.call(p, args[ 0 ], args[ 1 ], args[ 2 ], resourceResult);
                });
                return result;
            }
        };
        
        return result;
    };
    
    static getResources( application: KatAppPlugInShimInterface, resources: string, useTestVersion: boolean, isScript: boolean, debugResourcesDomain: string | undefined, getResourcesCallback: GetResourcesCallback ): void {
        const currentOptions = application.options;
        const managementUrl = currentOptions.functionUrl ?? KatApp.defaultOptions.functionUrl ?? KatApp.functionUrl;
        const resourceArray = resources.split(",");
        const allowLocalWebServer = application.options.debug?.allowLocalServer ?? KatApp.pageParameters[ "allowlocal"] === "1";
        
        let localWebServer: string | undefined = debugResourcesDomain;
        
        if ( localWebServer === undefined && allowLocalWebServer ) {
            localWebServer = "http://localhost:8887/";
        }

        let useLocalWebServer = localWebServer !== undefined; // global value for all requested resources
        // viewParts[ 0 ], viewParts[ 1 ]
        // folder: string, resource: string, optional Version

        const checkLocalServer = function(): Deferred {
            const d = $.Deferred();

            if ( localWebServer === undefined || application.element.data("kat-local-domain-reachable") !== undefined ) {
                if ( !application.element.data("kat-local-domain-reachable") ) {
                    localWebServer = undefined;
                    useLocalWebServer = false;
                }
                d.resolve();
            }
            else {
                KatApp.ping(localWebServer, function( responded: boolean ) { 
                    if ( !responded ) {
                        localWebServer = undefined;
                        useLocalWebServer = false;
                        application.element.data("kat-local-domain-reachable", false);
                    }
                    else {
                        application.element.data("kat-local-domain-reachable", true);
                    }
                    d.resolve();
                } );
            }

            return d;
        };

        checkLocalServer()
            .then( function() {
                // Declared outside of submit function so that
                // the failure handler can log it.
                let resourceUrl = "";
                
                const resourcePromises = resourceArray.map( resourceKey => {
                    const d = $.Deferred();

                    let tryLocalWebServer = useLocalWebServer; // value for current requested resource

                    try {
                        const relativeTemplatePath = currentOptions.relativePathTemplates?.[ resourceKey ];
                        const resourceParts = relativeTemplatePath != undefined ? relativeTemplatePath.split(":") : resourceKey.split(":");
                        let resourceName = resourceParts[ 1 ];
                        const managementFolders = resourceParts[ 0 ];
                        let localWebServerFolderPosition = 0;
                        const currentLocalWebServerFolders = managementFolders.split("|");
                        const version = resourceParts.length > 2 ? resourceParts[ 2 ] : ( useTestVersion ? "Test" : "Live" ); // can provide a version as third part of name if you want
        
                        if ( !isScript ) {
                            const resourceNameParts = resourceName.split( "?" );
                            const resourceNameBase = resourceNameParts[ 0 ];

                            // Template names often don't use .kaml syntax
                            if ( !resourceNameBase.endsWith( ".kaml" ) ) {
                                resourceName = resourceNameBase + ".kaml";

                                if ( resourceNameParts.length == 2 ) {
                                    // cache buster
                                    resourceName += "?" + resourceNameParts[ 1 ];
                                }
                            }
                        }
        
                        let localWebServerFolder = currentLocalWebServerFolders[ localWebServerFolderPosition ] + "/";
                        let localWebServerResource = resourceName;
                        const isResourceInManagementSite = KatApp.stringCompare( localWebServerFolder, "Rel/", true ) != 0;
                        
                        // If relative path used, I still need to look at local server and the path
                        // is usually Rel:Client/kaml or Rel:Container/Client/kaml.  So always just
                        // get the containing folder of the kaml to be used as the 'folder name'
                        // and the last part is simply the kaml file
                        const relativeResourceConfig = resourceName.split( '/' ).slice(-2);

                        if ( !isResourceInManagementSite )
                        {
                            localWebServerFolder = relativeResourceConfig[ 0 ] + "/";
                            localWebServerResource = relativeResourceConfig[ 1 ];
                        }

                        const managementUrlOptions: GetResourceOptions = {
                            Command: 'KatAppResource',
                            Resources: [
                                {
                                    Resource: resourceName,
                                    Folder: managementFolders,
                                    Version: version
                                }
                            ]
                        };

                        const submit: SubmitCalculationDelegate = function( app, options, done, fail ): void {
                            if (!tryLocalWebServer && currentOptions.submitCalculation != undefined ) {
                                currentOptions.submitCalculation( app, options, done, fail );
                            }
                            else {
                                resourceUrl = tryLocalWebServer 
                                    ? localWebServer + "KatApp/" + localWebServerFolder + localWebServerResource 
                                    : !isResourceInManagementSite
                                        ? resourceName
                                        : managementUrl;

                                KatApp.trace(application, "Downloading " + resourceName + " from " + resourceUrl, TraceVerbosity.Diagnostic );

                                KatApp.getResource(
                                    resourceUrl,
                                    tryLocalWebServer,
                                    isResourceInManagementSite,
                                    managementFolders,
                                    resourceName,
                                    version )
                                .then( done, fail );
                            }
                        };
                        
                        const submitDone: ajaxGetResourceSuccessCallback = function( data, statusText, jqXHR, resource ): void {
                            if ( statusText == "notmodified" ) {
                                console.log(statusText);
                            }

                            if ( data == null ) {
                                d.reject( { "resource": resource.Folder + ":" + resource.Resource, "errorMessage": "getResources failed requesting from L@W." } );
                            }
                            else {
                                if ( data.payload !== undefined ) {
                                    data = JSON.parse(data.payload);
                                }
                                
                                // data.Content when request from service, just data when local files
                                d.resolve( { "key": resourceKey, "isLocalServer": tryLocalWebServer, "content": data.Resources?.[ 0 ].Content ?? data as string, "isScript": isScript } );
                            }
                        };

                        const submitFailed: ajaxGetResourceFailCallback = function( _jqXHR, textStatus, _errorThrown, resource ): void {
                            // If local resources, syntax like LAW.CLIENT|LAW:sharkfin needs to try client first, 
                            // then if not found, try generic.
                            if ( tryLocalWebServer && localWebServerFolderPosition < currentLocalWebServerFolders.length - 1 ) {
                                localWebServerFolderPosition++;
                                localWebServerFolder = !isScript ? currentLocalWebServerFolders[ localWebServerFolderPosition ] + "/" : "";
                                submit( application as KatAppPlugInInterface, managementUrlOptions, submitDone, submitFailed );
                            }
                            else if ( tryLocalWebServer ) {
                                tryLocalWebServer = false; // If I had tryLocalWebServer but it couldn't find it, try real site
                                submit( application as KatAppPlugInInterface, managementUrlOptions, submitDone, submitFailed );
                            }
                            else {
                                console.log( _errorThrown );
                                d.reject( { "resource": resource.Folder + ":" + resource.Resource, "errorMessage": "getResources failed requesting from " + resource.Url + ":" + textStatus } );
                            }
                        };

                        // Make original submit to attempt to get the kat app resource
                        submit( application as KatAppPlugInInterface, managementUrlOptions, submitDone, submitFailed );

                    } catch (error) {
                        d.reject( { "resource": resourceKey, "errorMessage": "getResources failed:" + error } );
                    }

                    return d;
                });

                $.whenAllDone( resourcePromises ).then(
                    function( ... resourceResults: PromiseStatus[] ) {
                        const failures = resourceResults.filter( p => p.status == "rejected" );
                    
                        if ( failures.length > 0 ) {
                            failures.forEach( p => {
                                const failure = p.reason as GetResourceFailure;
                                application.trace( "Error during calculation for " + failure.resource + ": " + failure.errorMessage, TraceVerbosity.None );
                            });
                    
                            getResourcesCallback( failures[ 0 ].reason.errorMessage );
                        }
                        else {
                            resourceResults
                                .filter( r => ( r.value as GetResourceSuccess ).isScript )
                                .forEach( r => {
                                    const success = r.value as GetResourceSuccess;
                                    let scriptContent = success.content;

                                    // If local script location is provided, doing the $.ajax code automatically 
                                    // injects/executes the javascript, no need to do it again
                                    const body = document.querySelector('body');

                                    // Still trying to figure out how to best determine if I inject or not, might have to make a variable
                                    // at top of code in KatAppProvider, but if it 'ran', then $.fn.KatApp.plugInShims should be undefined.
                                    // Originally, I just looked to see if debugResourcesDomain was undefined...but if that is set and the domain
                                    // does NOT match domain of site running (i.e. debugging site in asp.net that uses KatApps and I want it to
                                    // hit development KatApp resources) then it doesn't inject it.  So can't just check undefined or not.
                                    if ( body !== undefined && body !== null && $.fn.KatApp.plugInShims !== undefined && scriptContent !== undefined ) {
                                        // Just keeping the markup a bit cleaner by only having one copy of the code
                                        $("script[rbl-script='true']").remove()

                                        // https://stackoverflow.com/a/56509649/166231
                                        const script = document.createElement('script');
                                        script.setAttribute("rbl-script", "true");

                                        const scriptLines = scriptContent.split('\n');
                                        if ( !success.isLocalServer && scriptLines[ scriptLines.length - 1 ] == "//# sourceMappingURL=KatAppProvider.js.map" ) {
                                            scriptLines.pop();
                                            scriptContent = scriptLines.join("\n");
                                        }
                                        script.innerHTML = scriptContent;
                                        body.appendChild(script);
                                    }

                                });

                            const callbackResults: ResourceResults = {};

                            resourceResults
                                .map( r => r.value as GetResourceSuccess )
                                .filter( r => !r.isScript )
                                .forEach( r => {
                                    callbackResults[ r.key ] = r.content!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                });

                            
                            getResourcesCallback( undefined, callbackResults );
                        }
                    }
                );
            });
    }
}

(function($, window, document, undefined?: undefined): void {

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
            this.options = KatApp.extend( {}, KatApp.defaultOptions, options );
            this.element = element;
            this.element[ 0 ].KatApp = this;
        }
    
        calculate( /* options?: KatAppOptions */ ): void {
            // do nothing, only 'provider' does a calculate
        }

        updateOptions( options: KatAppOptions ): void {
            this.options = KatApp.extend( this.options, options );
        }

        rebuild( options: KatAppOptions ): void {
            this.options = KatApp.extend( this.options, options );
        }

        destroy(): void {
            // Remove from memory cache in case they call delete before the
            // real provider is loaded
            let shimIndex = -1;

            const applications = $.fn.KatApp.plugInShims as KatAppPlugInShimInterface[];
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
            delete this.element[ 0 ].KatApp;
        }

        trace( message: string, verbosity: TraceVerbosity = TraceVerbosity.Normal ): void {
            KatApp.trace( this, message, verbosity );
        }
    }
    
    /*
    const privateMethod = function(this: KatAppPlugIn): void
    {
        // Private method not accessible outside plug in, however, if you want to call it from plug in implementation,
        // need to call via privateMethod.apply(this); so that the PlugIn is the 'this context'        
    }
    */
    
    const methodsThatReturnResult = ['options', 'id', 'results', 'calculationInputs', 'exception', 'getInputs', 'getResultTable', 'getResultRow', 'getResultValue', 'getResultValueByColumn'];
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
    $.fn.KatApp = function(options?: KatAppOptions | string, ...args: Array<string | number | KatAppOptions>): JQuery | KatAppPlugInShimInterface | undefined {

        if (options === undefined || typeof options === 'object') {
            
            if ( options == undefined && this.length > 0 && this.first()[0].KatApp !== undefined ) {
                return this.first()[0].KatApp;
            }

            // Creates a new plugin instance, for each selected element, and
            // stores a reference within the element's data
            return this.each(function(): void {

                if (!this.KatApp) {
                    $.fn.KatApp.applicationFactory(KatApp.generateId(), $(this), options as KatAppOptions);
                }
                else if ( options !== undefined ) {
                    this.KatApp.rebuild(options);
                }

            });

        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            
            // Call a public pluguin method (not starting with an underscore) for each 
            // selected element.
            if ($.inArray(options, methodsThatReturnResult) != -1 ) {
            
                // If the user does not pass any arguments and the method allows to
                // work as a getter then break the chainability so we can return a value
                // instead the element reference.  this[0] should be the only item in selector and grab getter from it.
                const instance = this[0].KatApp;
                
                if ( instance === undefined ) return undefined;

                return typeof instance[options] === 'function'
                    ? instance[options].apply(instance, args) // eslint-disable-line prefer-spread
                    : instance[options];
            
            } else {
            
                // Invoke the speficied method on each selected element
                return this.each(function(): void {

                    const instance = this.KatApp;

                    if ( options == "ensure" ) {
                        const appOptions = ( args.length >= 1 && typeof args[ 0 ] === "object" ? args[ 0 ] : undefined ) as KatAppOptions;
                        
                        if ( instance === undefined ) {
                            $.fn.KatApp.applicationFactory(KatApp.generateId(), $(this), appOptions);
                        }
                        else if ( appOptions !== undefined ) {
                            instance.updateOptions( appOptions );
                            if ( appOptions.defaultInputs !== undefined ) {
                                instance.calculate();
                            }
                        }
                    }
                    else if (instance !== undefined && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args); // eslint-disable-line prefer-spread
                    }
               });
            }
        }
    };

    // 'In memory' application list until the real KatAppProvider.js script can be loaded from 
    // the CMS to properly register the applications
    $.fn.KatApp.plugInShims = [];
    $.fn.KatApp.applicationFactory = $.fn.KatApp.debugApplicationFactory = function( id: string, element: JQuery, options: KatAppOptions ): KatAppPlugInShim {
        const shim = new KatAppPlugInShim(id, element, options);

        shim.trace("Starting factory", TraceVerbosity.Diagnostic);

        const applications = $.fn.KatApp.plugInShims as KatAppPlugInShimInterface[];
        applications.push( shim );

        // First time anyone has been called with .KatApp()
        if ( applications.length === 1 ) {
            shim.trace("Loading KatAppProvider library...", TraceVerbosity.Detailed);

            const useTestService = shim.options?.debug?.useTestPlugin ?? KatApp.defaultOptions.debug?.useTestPlugin ?? false;

            KatApp.getResources( shim, "Global:KatAppProvider.js", useTestService, true, shim.options.debug?.debugResourcesDomain,
                function( errorMessage ) {
                    if ( errorMessage !== undefined ) {
                        shim.trace("KatAppProvider library could not be loaded.", TraceVerbosity.Quiet);
                    }
                    else {
                        shim.trace("KatAppProvider library loaded.", TraceVerbosity.Detailed);
                    }
                }
            );
        }
    
        shim.trace("Leaving factory", TraceVerbosity.Diagnostic);
    
        return shim;
    };

})(jQuery, window, document);