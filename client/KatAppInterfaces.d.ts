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
        debugResourcesDomain?: string; // localserver= querystring
        saveConfigureUiCalculationLocation?: string;        
        refreshCalcEngine?: boolean; // expireCE=1 querystring
        useTestCalcEngine?: boolean; // test=1 querystring
        useTestView?: boolean; // testView=1 querystring
        useTestPlugin?: boolean; // testPlugIn=1 querystring
        showInspector?: boolean; // showInspector=1 querystring
    };

    nextCalculation?: {
        saveLocations?: { location: string, serverSideOnly: boolean }[];
        expireCache?: boolean;
        trace?: boolean;
    };

    sessionUrl?: string;
    functionUrl?: string;
    
    bootstrapVersion?: number; // Can override the bootstrap version configured in rbl-config

    registerDataWithService?: boolean;
    shareDataWithOtherApplications?: boolean;
    _sharedDataLastRequested?: number;
    data?: RBLeRESTServiceResult; // Used if registerDataWithService = false
    registeredToken?: string; // Used if registerDataWithService = true

    currentPage?: string;
    requestIP?: string;
    environment?: string;
    currentUICulture?: string;    
    
    calcEngines?: CalcEngine[];
    inputCaching?: boolean; // Whether or not inputs are cached to/restored from LocalStorage
    userIdHash?: string; // User ID hashed to be used in different caching scenarios
    inputSelector?: string;
    // If there are some inputs that should always be passed in on a calculation but aren't available in the UI, 
    // they can be assigned here.  The most common use of this is iConfigureUI/iDataBind/iInputTrigger
    manualInputs?: CalculationInputs;
    manualResults?: TabDef[] | undefined
    
    // Used during updateOptions and init to set default inputs. After inputs are set, defaultInputs
    // property on the options object is set to undefined so they are only applied one time.
    defaultInputs?: CalculationInputs;
    runConfigureUICalculation?: boolean;

    // UI management properties
    view?: string;
    viewTemplates?: string;
    relativePathTemplates?: ResourceResults;
    
    ajaxLoaderSelector?: string;

    // Methods that might be overriden by angular/L@W hosts
    
    // If custom submit code is needed, can provide implementation here
    submitCalculation?: SubmitCalculationDelegate;
    // If client provides for a way to get registration data, can provide implementation here
    getData?: GetDataDelegate;
    // If custom register data code is needed, can provide implementation here
    registerData?: RegisterDataDelegate;

    handlers?: {};

    // If you use on() syntax for initialized, need to set it up before calling KatApp();
    onInitializing?: (this: HTMLElement, application: KatAppPlugInInterface, options: KatAppOptions )=> void;
    onInitialized?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onDestroyed?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onOptionsUpdated?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    // If multiple KatApps are on one page, you can catch notifications from other KatApps that called pushNotification()
    onKatAppNotification?: (this: HTMLElement, notificationName: string, notificationInformation: {}, application: KatAppPlugInInterface )=> void;
    onKatAppNavigation?: (this: HTMLElement, id: string, application: KatAppPlugInInterface )=> void;
    
    onCalculateStart?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculationOptions?: (this: HTMLElement, submitOptions: SubmitCalculationOptions, application: KatAppPlugInInterface )=> void;
    onInputsCache?: (this: HTMLElement, inputsCache: CalculationInputs, application: KatAppPlugInInterface )=> void;
    
    // Can use onResultsProcessing if you want to do something before generic result processing happens (i.e. clear/destroy table/chart so only displays if results in current calculation)
    onResultsProcessing?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface )=> void;
    onCalculationErrors?: (this: HTMLElement, key: string, message: string, exception: Error, calcOptions: KatAppOptions, application: KatAppPlugInInterface)=> void;
    onCalculateEnd?: (this: HTMLElement, application: KatAppPlugInInterface )=> void;

    onActionStart?: (this: HTMLElement, endpoint: string, submitData: JSON, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)=> boolean | undefined;
    onActionResult?: (this: HTMLElement, endpoint: string, result: JSON | undefined, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)=> void;
    onActionFailed?: (this: HTMLElement, endpoint: string, exception: JSON, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)=> void;
    onActionComplete?: (this: HTMLElement, endpoint: string, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)=> void;

    modalAppOptions?: ModalAppOptions,
    
    // Modal handlers
    onConfirm?: (this: HTMLElement, hostApplication: KatAppPlugInInterface, modalLink: JQuery<HTMLElement>, dismiss: (message?: string)=> void, cancel: ()=> void)=> boolean | string | undefined;
    onCancel?: (this: HTMLElement, hostApplication: KatAppPlugInInterface, modalLink: JQuery<HTMLElement>, dismiss: (message?: string)=> void, cancel: ()=> void)=> boolean | string | undefined;

    // Host handlers only triggered modal applications and only handled by framework
    onModalAppConfirm?: (this: HTMLElement, message: string | undefined)=> void;
    onModalAppCancel?: (this: HTMLElement, message: string | undefined)=> void;

    // Host handlers
    onModalAppInitialized?: (this: HTMLElement, applicationId: string, hostApplication: KatAppPlugInInterface, modalApplication: KatAppPlugInInterface, modalLink: JQuery<HTMLElement>)=> void;
    onModalAppConfirmed?: (this: HTMLElement, applicationId: string, hostApplication: KatAppPlugInInterface, modalApplication: KatAppPlugInInterface, modalLink: JQuery<HTMLElement>, dismiss: ()=> void, message: string | undefined)=> void;
    onModalAppCancelled?: (this: HTMLElement, applicationId: string, hostApplication: KatAppPlugInInterface, modalApplication: KatAppPlugInInterface, modalLink: JQuery<HTMLElement>, dismiss: ()=> void, message: string | undefined)=> void;
    
    onUploadStart?: (this: HTMLElement, fileUpload: JQuery<HTMLElement>, formData: FormData, application: KatAppPlugInInterface)=> void;
    onUploaded?: (this: HTMLElement, fileUpload: JQuery<HTMLElement>, application: KatAppPlugInInterface)=> void;
    onUploadFailed?: (this: HTMLElement, fileUpload: JQuery<HTMLElement>, exception: JSON, application: KatAppPlugInInterface)=> void;
    onUploadComplete?: (this: HTMLElement, fileUpload: JQuery<HTMLElement>, application: KatAppPlugInInterface)=> void;
}

type ModalAppSize = "xl" | "lg" | "md" | "sm";
interface ModalAppOptions {
    labels: {
        title: string | undefined
        cancel: string;
        continue: string;
    };
    applicationId: string;
    actionLink: JQuery<HTMLElement>;
    showCancel: boolean;
    size: ModalAppSize;
    hostApplication: KatAppPlugInInterface;
    continueActionLink?: string | undefined;
    calculateOnConfirm: boolean;
}
interface ModalDialogOptions {
    labels: {
        title?: string;
        cancel?: string;
        continue?: string;
    } | undefined;
    confirmation: string
}

interface KatAppActionOptions extends KatAppOptions {
    customParameters?: {};
    customInputs?: {};
    isDownload?: boolean;
    calculateOnSuccess?: boolean
}

interface KatAppActionSubmitData {
    Inputs: CalculationInputs;
    InputTables: CalculationInputTable[] | undefined;
    Configuration: KatAppActionOptions;
}

interface KatAppActionResult {
    Validations: { ID: string, Message: string }[] | undefined;
    ValidationWarnings: { ID: string, Message: string }[] | undefined;
    RBLeInputs: {
        Tables: CalculationInputTable[] | undefined;
        Inputs: JSON | undefined
    } | undefined;
    InvalidateKatApp?: boolean
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
    calculate: ( customOptions?: KatAppOptions )=> void;
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

    results?: TabDef[];
    calculationInputs?: CalculationInputs;

    exception?: RBLeServiceResults;

    select(selector: string, context?: JQuery | HTMLElement): JQuery;
    closest(element: JQuery | HTMLElement, selector: string): JQuery;

    // Re-run configureUI calculation, it will have already ran during first calculate() 
    // method if runConfigureUICalculation was true. This call is usually only needed if
    // you want to explicitly save a CalcEngine from a ConfigureUI calculation, so you set
    // the save location and call this.
    configureUI: ( customOptions?: KatAppOptions )=> void;

    getResultTable<T>( tableName: string, tabDef?: string, calcEngine?: string): Array<T>;
    getResultRow<T>( table: string, id: string, columnToSearch?: string, tabDef?: string, calcEngine?: string ): T | undefined;
    getResultValue( table: string, id: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined;
    getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined;
    
    getInputs: ( currentOptions: KatAppOptions | undefined )=> CalculationInputs;
    setInputs: ( inputs: JSON | CalculationInputs, calculate: boolean )=> void;
    setInput: ( id: string, value: string | undefined, calculate: boolean )=> void;
    serverCalculation: ( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> )=> void;
    
    apiAction: ( commandName: string, options: KatAppOptions, actionOptions: KatAppActionOptions, actionLink: JQuery<HTMLElement> | undefined, done?: ( successResponse: KatAppActionResult | undefined, failureResponse: {} | undefined )=> void )=> void
    invalidate: ()=> void; // called upon failure from apiAction (jwtUpdates right now)

    // If multiple KatApps are on one page, a KatApp can broadcast notifications to other KatApps
    pushNotification: (name: string, information: {} | undefined)=> void;

    // $("selector").KatApp("saveCalcEngine", "terry.aney"); - save *next successful* calc for all selector items to terry.aney
    saveCalcEngine: ( location: string | boolean, serverSideOnly?: boolean )=> void;
    // $("selector").KatApp("refreshCalcEngine"); - for the next calculation, instruct the RBLe Service to immediately check for an updated CalcEngine
    refreshCalcEngine: ()=> void;
    // $("selector").KatApp("traceCalcEngine"); - return calc engine tracing from *next successful* calc for all selector items
    traceCalcEngine: ()=> void;
}

interface CalcEngine {
    key: string;
    name: string;
    inputTab?: string;
    resultTabs?: string[];
    preCalcs?: string;
}

interface GetResourceOptions {
    Command: string;
    Resources: KatAppResource[];        
}
interface RBLeCommandOptions {
    Command: string;
    Token: string;
}
interface KatAppResource {
    Resource: string;
    Folder: string;
    Version: string;
}
interface KatAppResourceResult extends KatAppResource {
    Url: string;
}
interface ResourceResults { 
    [ key: string ]: string; 
}

interface TemplateFile { 
    Name: string;
    Templates: Record<string, Template>;
    UsedInApplications: Record<string, string>;

    // If multiple applications are rendered on one page, this object stores unique list of templates requested
    // so that if two applications request the same template but one is still waiting for a download, the second
    // application registers a callback and will be notified when the content is ready.
    State?: number; // Wanted enum, but didn't know how to make it work with our file/cms structure
        // 0-None, 1-Requested, 2-Complete
    Callbacks: Array<( errorMessage: string | undefined )=> void>; 
}
interface Template { 
    Name: string;
    // If template is inline, store application id that would leverage it so when application is removed, I can remove this template
    InlineApplicationId?: string;
    Content: JQuery;
    // Only want to inject script from templates one time...so this list keeps 
    // track of whether or not script has been added once
    ApplicationsInjected: Record<string, string>;
}

interface RegisterDataOptions
{
    Registration: string;
    TransactionPackage: string; // JSON.stringify( TransactionPackage )
    
    Configuration: {
        TraceEnabled: number;
    };
}

interface SubmitCalculationOptions
{
    Data?: RBLeRESTServiceResult; // Passed in if non-session calcs being used
    
    Inputs: CalculationInputs;
    InputTables: CalculationInputTable[] | undefined;

    Configuration: {
        // Used only in submit for session based calcs
        Token?: string;

        InputTab: string;
        ResultTabs: string[];
        CalcEngine: string;
        Comment?: string; // currently never passed
        TestCE: boolean;
        TraceEnabled: number;
        SaveCE: string;
        PreCalcs: string | undefined;

        // Used in non-session calc only
        AuthID: string;
        Client: string;
        AdminAuthID: string | undefined;
        RefreshCalcEngine: boolean;
        CurrentPage: string;
        RequestIP: string;
        CurrentUICulture: string;
        Environment: string;
        Framework: string;
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
interface GetResourcesCallback {
    ( errorMessage?: string, data?: ResourceResults ): void;
}
interface RegisterDataCallback {
//    ( errorMessage?: string, data?: RBLeRESTServiceResult ): void;
    ( errorMessage?: string ): void;
}
interface SubmitCalculationCallback {
    ( errorMessage?: string, results?: RBLResult ): void;
}
// JQuery Callback signatures used during pipeline calls to $.get(), $.getScript()
interface JQueryFailCallback {
    ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ): void;
}
// Because ajaxGetResourceSuccessCallback/ajaxGetResourceFailCallback use spread operator, all params
// have to be optional... https://stackoverflow.com/a/46228488/166231
interface ajaxGetResourceSuccessCallbackSpread {
    ( data?: any, textStatus?: string, jqXHR?: JQuery.jqXHR, resource?: KatAppResourceResult ): void;
}
interface ajaxGetResourceFailCallbackSpread {
    ( jqXHR?: JQuery.jqXHR, textStatus?: string, errorThrown?: string, resource?: KatAppResourceResult ): void;
}
// And here is implementation so I don't have to check undefined or not
interface ajaxGetResourceSuccessCallback {
    ( data: any, textStatus: string, jqXHR: JQuery.jqXHR, resource: KatAppResourceResult ): void;
}
interface ajaxGetResourceFailCallback {
    ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string, resource: KatAppResourceResult ): void;
}

interface GetResourceFailure
{ 
    resource: string;
    errorMessage: string;
}
interface GetResourceSuccess
{ 
    key: string;
    isScript: boolean;
    isLocalServer: boolean;
    content: string | undefined;
}
interface SubmitCalculationSuccess
{ 
    calcEngine: CalcEngine;
    result: RBLResult;
}
interface SubmitCalculationFailure
{ 
    calcEngine: CalcEngine;
    errorMessage: string;
}

interface SubmitCalculationDelegate {
    ( application: KatAppPlugInInterface, options: GetResourceOptions | SubmitCalculationOptions | RBLeCommandOptions, done: RBLeServiceCallback | ajaxGetResourceSuccessCallback, fail: JQueryFailCallback | ajaxGetResourceFailCallback ): void;
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