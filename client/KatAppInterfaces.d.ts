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
        debugResourcesDomain?: string;
        debugProviderDomain?: string;
        saveFirstCalculationLocation?: string;        
        refreshCalcEngine?: boolean; // expireCE=1 querystring
        useTestCalcEngine?: boolean; // test=1 querystring
        useTestView?: boolean; // testView=1 querystring
        useTestPlugin?: boolean; // testPlugIn=1 querystring
        allowLocalServer?: boolean; // allowLocal=1 querystring
        showInspector?: boolean; // showInspector=1 querystring
    };

    sessionUrl?: string;
    functionUrl?: string;
    rbleUpdatesUrl?: string;

    registerDataWithService?: boolean;
    shareDataWithOtherApplications?: boolean;
    sharedDataLastRequested?: number;
    data?: RBLeRESTServiceResult; // Used if registerDataWithService = false
    registeredToken?: string; // Used if registerDataWithService = true

    currentPage?: string;
    requestIP?: string;
    environment?: string;
    currentUICulture?: string;
    calcEngine?: string;
    inputTab?: string;
    resultTabs?: string[];
    preCalcs?: string;
    
    relativePathTemplates?: ResourceResults;

    inputSelector?: string;
    // This is normally used internally by the Provider code.  If there are some inputs that should
    // always be passed in on a calculation but aren't available in the UI, they can be assigned here.
    // The most common use of this is iConfigureUI/iDataBind/iInputTrigger
    manualInputs?: CalculationInputs;
    // Used during updateOptions and init to set default inputs. After inputs are set, defaultInputs
    // property on the options object is set to undefined so they are only applied one time.
    defaultInputs?: CalculationInputs;
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

    // If multiple KatApps are on one page, you can catch notifications from other KatApps that called pushNotification()
    onKatAppNotification?: (this: HTMLElement, notificationName: string, notificationInformation: {}, application: KatAppPlugInInterface )=> void;

    // If you use on() syntax for initialized, need to set it up before calling KatApp();
    onInitialized?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onDestroyed?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onOptionsUpdated?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculateStart?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    // Can use onResultsProcessing if you want to do something before generic result processing happens (i.e. clear/destroy table/chart so only displays if results in current calculation)
    onResultsProcessing?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculationOptions?: (this: HTMLElement, submitOptions: SubmitCalculationOptions, application: KatAppPlugInInterface )=> void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculationErrors?: (this: HTMLElement, key: string, message: string, exception: Error, calcOptions: KatAppOptions, application: KatAppPlugInInterface)=> void;
    onDataUpdateErrors?: (this: HTMLElement, message: string, exception: RBLeServiceResults | undefined, calcOptions: KatAppOptions, application: KatAppPlugInInterface)=> void;
    onDataUpdate?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface)=> void;
    onCalculateEnd?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
}
// These are the only methods available to call on .KatApp() until onInitialized is triggered (meaning
// that the provider object has been loaded and replaced the Shim and all methods of the KatAppPlugInInterface 
// are now implemented)

interface KatAppActionOptions extends KatAppOptions {
    isDownload?: boolean;
    customParameters?: {};
    customInputs?: {};
}

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
    
    // Completely destroy and init an application (possibly using new view/templates) given options.
    // NOTE: If $("selector").KatApp(options) is called on items that already had KatApp created on it,
    // the plugin will call this method.
    rebuild: ( options: KatAppOptions )=> void;
    
    // If you want to update options of existing KatApp, use this method.  This will not load new
    // view or templates, but the CalcEngine or any other options could be updated using this.
    // NOTE: If $("selector").KatApp("ensure", options) is called, items that didn't have a KatApp
    //      already created will go through normal create/init process.  However, items that already
    //      had a KatApp created, will simply delegate to updateOptions.
    // NOTE: updateOptions (along with init()) *will* apply options.defaultInputs every time it is called
    //      as if setInputs() was called.
    updateOptions: ( options: KatAppOptions )=> void;
    calculate: ( options?: KatAppOptions )=> void;
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
    templateBuilder: StandardTemplateBuilderInterface;
    results?: JSON;
    exception?: RBLeServiceResults;
    resultRowLookups?: ResultRowLookupsInterface;
    getResultTable<T>( tableName: string): Array<T>;
    getResultRow<T>( table: string, id: string, columnToSearch?: string ): T | undefined;
    getResultValue( table: string, id: string, column: string, defaultValue?: string ): string | undefined;
    getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined;
    setDefaultValue: ( id: string, value: string | undefined )=> void;
    
    calculationInputs?: CalculationInputs;

    calculate: ( customOptions?: KatAppOptions )=> void;

    // Re-run configureUI calculation, it will have already ran during first calculate() 
    // method if runConfigureUICalculation was true. This call is usually only needed if
    // you want to explicitly save a CalcEngine from a ConfigureUI calculation, so you set
    // the save location and call this.
    configureUI: ( customOptions?: KatAppOptions )=> void;
    
    // $("selector").KatApp("saveCalcEngine", "terry.aney"); - save *next successful* calc for all selector items to terry.aney
    saveCalcEngine: ( location: string )=> void;
    // $("selector").KatApp("refreshCalcEngine"); - refresh calc engine on *next successful* calc for all selector items
    refreshCalcEngine: ()=> void;
    // $("selector").KatApp("traceCalcEngine"); - return calc engine tracing from *next successful* calc for all selector items
    traceCalcEngine: ()=> void;
    // If multiple KatApps are on one page, a KatApp can broadcast notifications to other KatApps
    pushNotification: (name: string, information: {} | undefined)=> void;
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

interface ResourceResults { 
    [ key: string ]: string; 
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
    ( application: KatAppPlugInInterface, options: SubmitCalculationOptions | GetResourceOptions, done: RBLeServiceCallback, fail: JQueryFailCallback ): void;
}
interface GetDataDelegate {
    ( application: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback ): void;
}
interface RegisterDataDelegate {
    ( application: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback ): void;
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

interface StandardTemplateBuilderInterface {
    processUI( container?: JQuery<HTMLElement> ): void;
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