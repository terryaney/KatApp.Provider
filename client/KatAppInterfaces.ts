// Prototypes / polyfills
interface String {
    format(json: JQuery.PlainObject): string;
	startsWith(str: string): boolean;
    endsWith(searchString: string, position?: number): boolean;
}
interface HTMLElement {
    KatApp?: KatAppPlugInShimInterface;
}
interface JQuery {
    KatApp( options?: KatAppOptions | string, ...args: Array<string | number | KatAppOptions> ): JQuery | KatAppPlugInShimInterface | string | undefined;
    carousel(frame: number): JQuery;
    selectpicker(): JQuery;
    selectpicker( option: string ): string;
    selectpicker( propertyName: string, value: string ): void;
    datepicker( options: any ): JQuery; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface Function {
    plugInShims: KatAppPlugInShimInterface[];
    applicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    // Debugging...let's me restore the original shim factory if I'm going to rebuild UI or script locations
    debugApplicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;    
    templateOn( templateName: string, events: string, fn: TemplateOnDelegate ): void;

    templatesUsedByAllApps: { 
        [ key: string ]: { 
            requested: boolean; 
            data?: string; 
            callbacks: Array<( errorMessage: string | undefined )=> void>; 
        };
    };
    templateDelegates: {
        Delegate: TemplateOnDelegate;
        Template: string;
        Events: string;
    }[];
    sharedData: { 
        requesting: boolean;
        lastRequested?: number;
        data?: RBLeRESTServiceResult;
        registeredToken?: string;
        callbacks: Array<( errorMessage: string | undefined )=> void>; 
    };
    
    // Didn't want to use interface (see comments at bottom of file for the negative parts) and couldn't use
    // the 'class' implementation because that code only existed in closure.  So just use any.
    standardTemplateBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    highchartsBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    ui( application: KatAppPlugInInterface ): any /*UIUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    rble( application: KatAppPlugInInterface, uiUtilities: any ): any /*RBLeUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    // highcharts: any /*HighchartsBuilder*/; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface HighchartsTooltipFormatterContextObject {
    y: number;
    x: number;
    series: {
        name: string;
    };
    points: Array<HighchartsTooltipFormatterContextObject>;
}

// RBLe Service Callback handler and input/result classes
interface CalculationInputs
{
    iConfigureUI?: number;
    iDataBind?: number;
    iInputTrigger?: string;
}
interface CalculationInputTableRow {
    index: string;
}
interface CalculationInputTable
{
    Name: string;
    Rows: CalculationInputTableRow[];
}

interface RBLeRowWithId {
    "@id": string;
}
interface RBLeDefaultRow extends RBLeRowWithId {
    value?: string;
}
interface HtmlContentRow {
    "@id"?: string;
    content?: string;
    html?: string;
    value?: string;
    selector?: string;
    addclass?: string;
    removeclass?: string;
}
interface ListControlRow {
    "@id": string;
    table: string;
}
interface ListRow {
    key: string;
    text: string;
    visible?: string;
}
interface SliderConfigurationRow {
    "@id": string;
    min: string;
    max: string;
    default?: string;
    step?: string;
    format?: string;
    decimals?: string;
    "pips-mode"?: string;
    "pips-values"?: string;
    "pips-density"?: string;
}

interface RBLeServiceResults {
    payload?: string; //if from l@w wrapper, escaped string returned

    // Exception is only present if RBLe service threw exception and
    // it was able to catch it and package up exception details
    Exception?: {
        Message: string;
        StackTrace?: string;
    };

    Diagnostics?: JSON; // Should define interface for nested items
    
    // Only present after successful 'get resource' call
    Resources?: {
        Resource: string;
        Content: string;
        DateLastModified: Date;
    }[];

    // RBL is only present after successful calculation
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };

    // RegisteredToken is only present after successful registration
    RegisteredToken?: string;
}
interface RBLeServiceCallback {
    ( data: RBLeServiceResults ): void;
}


// REST Service Callback handlers and results
interface RBLeRESTServiceResult {
    // AuthID/Client/Profile/History is present after calling GET request
    AuthID?: string;
    Client?: string;
    Profile: JSON;
    History?: JSON;
}
interface RBLeRESTServiceResultCallback {
    ( data: RBLeRESTServiceResult ): void;
}


// Generic callback when I make pipelines to handle several async events
// but want a pipeline pattern to make them 'look' synchronous in code
interface PipelineCallback {
    ( errorMessage?: string, data?: RBLeRESTServiceResult | ResourceResults ): void;
}
// JQuery Callback signatures used during pipeline calls to $.get(), $.getScript()
interface JQueryFailCallback {
    ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ): void;
}

interface SubmitCalculationDelegate {
    ( appilcation: KatAppPlugInInterface, options: SubmitCalculationOptions | GetResourceOptions, done: RBLeServiceCallback, fail: JQueryFailCallback ): void;
}
interface GetDataDelegate {
    ( appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback ): void;
}
interface RegisterDataDelegate {
    ( appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback ): void;
}
// Note: Everything in this class is currently nullable so I can do partial option updates and default options, but
// I should probably just make some partial interfaces, and correctly set nullability on members

// During initialization of a view, application.options.calcEngine = (and other properties) that are read...precedence is
//      rbl-config data atrributes in view (given this precedence, do attributes/element have to be required?  Remove my logic enforcing if so)
//      markup attributes on katapp
//      js options passed in on initialize

interface KatAppOptions
{
    debug?: {
        traceVerbosity?: TraceVerbosity;
        scriptLocation?: string;
        templateLocation?: string;
        saveFirstCalculationLocation?: string;        
        refreshCalcEngine?: boolean; // expireCE=1 querystring
        useTestCalcEngine?: boolean; // test=1 querystring
        useTestView?: boolean; // testView=1 querystring
        useTestPlugin?: boolean; // testPlugIn=1 querystring
    };

    corsUrl?: string;
    functionUrl?: string;

    registerDataWithService?: boolean;
    shareDataWithOtherApplications?: boolean;
    sharedDataLastRequested?: number;
    data?: RBLeRESTServiceResult; // Used if registerDataWithService = false
    registeredToken?: string; // Used if registerDataWithService = true

    currentPage?: string;
    calcEngine?: string;
    inputTab?: string;
    resultTabs?: string[];

    inputSelector?: string;
    // This is normally used internally by the Provider code, but if client needs to get some additional 
    // inputs that normal KatApp processing would not grab, they can be provided here.  The most common 
    // example are DST's where the caller creates a KatAppOptions object and passes as along a few variables
    // from its site before opening new DST window.
    //
    // var options = {
    //      manualInputs: {
    //          "iAge": 65, // This would probably be a calculated value from results
    //          "iRetirementSavingsPct": 85 // This would probably be a calculated value from results
    //      }       
    // };
    manualInputs?: CalculationInputs;
    runConfigureUICalculation?: boolean;

    // UI management properties
    view?: string;
    viewTemplates?: string;
    ajaxLoaderSelector?: string;

    // Methods that might be overriden by angular/L@W hosts
    
    // If custom submit code is needed, can provide implementation here
    submitCalculation?: SubmitCalculationDelegate;
    // If client provides for a way to get registration data, can provide implementation here
    getData?: GetDataDelegate;
    // If custom register data code is needed, can provide implementation here
    registerData?: RegisterDataDelegate;
    
    // TODO - do we even want to support these?  Maybe just always do events like all bootstrap components do.
    //      $("app").on("onInitialized.rble", function() { } ).KatApp();
    // Event call backs
    // If you use on() syntax for initialized, need to set it up before calling KatApp();

    // Needed onTemplatesProcessed event so that standard event processing code could be called in Standard_Templates (like
    // processing additional data-* attributes on inputs) *before* onInitialized or onCalculation.  Those events couldn't 
    // be used because views/hosting clients might use them as well and their event handlers (due to flow of page/app construction)
    // are registered first.  For example:
    //
    //      Client disables configure UI calculation by default because it needs to do additional processing after onInitialized 
    //      is completed, *then* manually call KatApp.calculate().
    //
    // In the above scenario, templates would be processed, but 'additional' processing code (hooking up jquery plugin, etc.)
    // would not happen until after the calculation finished.  Therefore, the main reasons for adding this additional event are:
    // 
    // a) Inputs that have plugins modify their appearance (dropdown list, dates, etc.) happen 'quickly/immediately'
    //      instead of waiting until after a calculation might have had to occur (resulting in 1-N second delay)
    // b) If there are any data-* attributes that define things (like label, help) that were implemented during POC phase
    //      then later the CE controlled them, I didn't want the data-* processing to occur *after* CE processing and
    //      overwrite what CE returned.
    //
    // Final comment, the vast majority of the time, only 'Template Authors' will use this event to 'finish processing' any
    // custom (input) templates they need to handle.  View/hosting clients will *rarely* need to care about this event.
    onTemplatesProcessed?: (this: HTMLElement, appilcation: KatAppPlugInInterface, templates: string[] )=> void;
    onInitialized?: (this: HTMLElement, appilcation: KatAppPlugInInterface )=> void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppPlugInInterface )=> void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppPlugInInterface )=> void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppPlugInInterface )=> void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppPlugInInterface )=> void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculationErrors?: (this: HTMLElement, key: string, message: string, exception: RBLeServiceResults | undefined, calcOptions: KatAppOptions, application: KatAppPlugInInterface)=> void;
    onCalculateEnd?: (this: HTMLElement, appilcation: KatAppPlugInInterface )=> void;
}

interface GetResourceOptions {
    Command: string;
    Resources:
        {
            Resource: string;
            Folder: string;
            Version: string;
        }[];        
}

interface SubmitCalculationOptions
{
    Data?: RBLeRESTServiceResult; // Passed in during registration or if non-session calcs being used
    
    Inputs?: CalculationInputs; // Empty during Registration submissions
    InputTables?: CalculationInputTable[];

    Configuration: {
        // Used only in submit for session based calcs
        Token?: string;

        // Used in both submit and registration
        InputTab: string;
        ResultTabs: string[];
        CalcEngine?: string;
        Comment?: string;
        TestCE?: boolean;
        TraceEnabled: number;
        SaveCE?: string;
        PreCalcs?: string;

        // Used in registration or non-session calc only
        AuthID?: string;
        Client?: string;
        AdminAuthID?: string;
        RefreshCalcEngine?: boolean;
        CurrentPage?: string;
        RequestIP?: string;
        CurrentUICulture?: string;
        Environment?: string;
    };
}

interface ResourceResults { 
    [ key: string ]: string; 
}

interface ResultRowLookupsInterface { 
    [ key: string ]: {
        LastRowSearched: number;
        Mapping: { 
            [ key: string ]: number; 
        };
    }; 
}

// These are the only methods available to call on .KatApp() until onInitialized is triggered (meaning
// that the provider object has been loaded and replaced the Shim and all methods of the KatAppPlugInInterface 
// are now implemented)
interface KatAppPlugInShimInterface {
    options: KatAppOptions;
    element: JQuery;
    id: string;
    // needsCalculation would only be set if $("app").KatApp("calculate"); was called before .KatApp() was
    // called and initialized.  Only reason that that pattern should be used is if you have turned off
    // ConfigureUI calc and you want to immediately calculate all applications with a 'normal' calculation.
    // Even that seems weird though because CalcEngine could just ignore it.
    // needsCalculation?: boolean;
    destroy: ()=> void;
    rebuild: ( options: KatAppOptions )=> void;
    trace: ( message: string, verbosity?: TraceVerbosity )=> void;
}

// This is the actual plug in interface.  Accessible via:
//
//  $("selector").KatApp( "propertyName") - returns propertyName property for first match
//      $("selector").KatApp().propertyName - if "selector" only returns one element, can access propertyName this way
//      $("selector")[0].KatApp.propertyName - can get first result from selector and access KatApp.propertyName
//
//  $("selector").KatApp( "methodName", ...args) - call methodName on all matching KatApps passing in ...args
//      $("selector").KatApp().methodName(...args) - if "selector" only returns one element, can call methodName this way
//      $("selector")[0].KatApp.methodName(...args) - can get first result from selector and access KatApp.methodName

// KatApp compared to jQuery syntax
// $("selector").KatApp() similiar to jQuery $("selector").html() - returns property (KatApp or html) from first match
// $("selector").KatApp("param") similiar to jQuery $("selector").html("param") - sets property ("param") of all items matching selector

// *NOTE* - I don't use this interface in KatAppProvider implementation.  It would only be exposed in a *.d.ts file
// for clients to be able to reference.
interface KatAppPlugInInterface extends KatAppPlugInShimInterface {
    results?: JSON;
    exception?: RBLeServiceResults;
    resultRowLookups?: ResultRowLookupsInterface;
    getResultTable<T>( tableName: string): Array<T>;
    getResultRow<T>( table: string, id: string, columnToSearch?: string ): T | undefined;
    getResultValue( table: string, id: string, column: string, defaultValue?: string ): string | undefined;
    
    inputs?: CalculationInputs;

    calculate: ( customOptions?: KatAppOptions )=> void;

    // Re-run configureUI calculation, it will have already ran during first calculate() 
    // method if runConfigureUICalculation was true. This call is usually only needed if
    // you want to explicitly save a CalcEngine from a ConfigureUI calculation, so you set
    // the save location and call this.
    configureUI: ( customOptions?: KatAppOptions )=> void;
    updateOptions: ( options: KatAppOptions )=> void;
    
    // $("selector").KatApp("saveCalcEngine", "terry.aney"); - save *next successful* calc for all selector items to terry.aney
    saveCalcEngine: ( location: string )=> void;
    // $("selector").KatApp("refreshCalcEngine"); - refresh calc engine on *next successful* calc for all selector items
    refreshCalcEngine: ()=> void;
    // $("selector").KatApp("traceCalcEngine"); - return calc engine tracing from *next successful* calc for all selector items
    traceCalcEngine: ()=> void;
}


interface TemplateOnDelegate {
/*
    - Original $().RBL().registerControlFunction( ... )
        - Pro
            - Passed templated element into delegate (don't have to .each() within template code)
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
    ( event: JQuery.Event, ...args: Array<object> ): void; 
}

interface HighChartsPlotConfigurationRow {
    Index: number;
    PlotLine: string;
    PlotBand: string;
}
interface HighChartsDataRow {
    category: string;
    plotLine?: string;
    plotBand?: string;
}
interface HighChartsOverrideRow extends HighChartsOptionRow {
    "@id": string;
}
interface HighChartsOptionRow {
    key: string;
    value: string;
}

// Made the following an interface/factory just so that I could put the
// implementation of this code below the implementation of the KatAppPlugIn
// so it was easier to read/maintain the code inside the Provider file (i.e.
// expecting to find the 'plugin' implementation first). If I didn't have an
// interface and I put plugin code above helper implementations, then eslint
// complained that I used a class before it was declared.  Downside is that for 
// any public methods I want to expose, I need to add to this interface as well
// and if I try to navigate (f12) to a method in the code it jumps to the interface
// instead of implementation.  I might remove this and tell eslint to ignore. 
// Not sure yet.
// 
// Original code simply had each of these classes before KatAppPlugIn and made
// a constant (scoped to closure) like - const ui = new UIUtilities()
/*
interface StandardTemplateBuilderInterface {
    buildSlider( element: JQuery ): void;
    buildCarousel( element: JQuery ): void;
    buildHighcharts( element: JQuery ): void;
    processInputs( application: KatAppPlugIn ): void;
}
interface UIUtilitiesInterface {
    getInputName(input: JQuery): string;
    getInputValue(input: JQuery): string;
    getInputs(application: KatAppPlugInInterface, customOptions: KatAppOptions ): JSON;
    getInputTables(application: KatAppPlugInInterface): CalculationInputTable[] | undefined;
    triggerEvent(application: KatAppPlugInInterface, eventName: string, ...args: ( object | string | undefined )[]): void;
    bindEvents( application: KatAppPlugInInterface ): void;
    unbindEvents( application: KatAppPlugInInterface ): void;
}
interface RBLeUtilitiesInterface {
    setResults( application: KatAppPlugInInterface, results: JSON | undefined ): void;
    getData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void;
    registerData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, data: RBLeRESTServiceResult, next: PipelineCallback ): void;
    submitCalculation( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void;
    getResultRow<T>( application: KatAppPlugInInterface, table: string, key: string, columnToSearch?: string ): T | undefined;
    getResultValue( application: KatAppPlugInInterface, table: string, key: string, column: string, defaultValue?: string ): string | undefined;
    getResultValueByColumn( application: KatAppPlugInInterface, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined;
    getResultTable<T>( application: KatAppPlugInInterface, tableName: string): Array<T>;
    processTemplate( application: KatAppPlugInInterface, templateId: string, data: JQuery.PlainObject ): string;
    createHtmlFromResultRow( application: KatAppPlugInInterface, resultRow: HtmlContentRow ): void;
    processRblValues( application: KatAppPlugInInterface ): void;
    processRblSources( application: KatAppPlugInInterface ): void;
    processVisibilities(application: KatAppPlugInInterface): void;
    processResults( application: KatAppPlugInInterface ): boolean;
}
*/