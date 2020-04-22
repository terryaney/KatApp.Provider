interface CalculationInputs
{
    iConfigureUI?: number;
    iInputTrigger?: string;
}
interface CalculationInputTable
{
    Name: string;
    Rows: CalculationInputTableRow[];
}
interface CalculationInputTableRow
{
    index: string;
}
interface ServiceException {
    Message: string;
    StackTrace?: string;
}
interface ServiceResults {
    payload?: string; //if from l@w wrapper, escaped string returned
    Exception?: ServiceException;
    Diagnostics?: JSON; // Should define interface
}
interface CalculationResults extends ServiceResults
{
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };
}
interface HtmlContentRow {
    content?: string;
    html?: string;
    value?: string;
    selector?: string;
}
interface CalculationResultCallback {
    ( data: CalculationResults ): void;
}
interface GetRegistrationDataResult {
    AuthID?: string;
    Client?: string;
    Profile: JSON;
    History?: JSON;
}
interface PipelineCallback {
    ( errorMessage?: string, data?: GetRegistrationDataResult | ResourceResults ): void;
}
interface GetRegistrationDataResultCallback {
    ( data: GetRegistrationDataResult ): void;
}
interface RegistrationResult extends ServiceResults {
    RegisteredToken?: string;
}
interface RegistrationResultCallback {
    ( data: RegistrationResult ): void;
}
interface JQueryDoneCallback {
    ( data: JQuery.PlainObject, textStatus: string, jqXHR: JQuery.jqXHR ): void;
}
interface JQueryFailCallback {
    ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ): void;
}
interface JQueryGetScriptSuccessCallback {
    ( script: string | undefined, textStatus: string, jqXHR: JQuery.jqXHR ): void;
}
interface SubmitCalculationDelegate {
    ( application: KatAppInterface, options: SubmitCalculationOptions, done: CalculationResultCallback, fail: JQueryFailCallback ): void;
}

// Note: Everything in this class is currently nullable so I can do partial option updates and default options, but
// I should probably just make some partial interfaces, and correctly set nullability on members
interface KatAppOptions
{
    enableTrace?: boolean;

    serviceUrl?: string;
    registeredToken?: string;
    shareRegisterToken?: boolean;

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

    // Debugging flags that override query strings
    refreshCalcEngine?: boolean; // expireCE=1 querystring
    useTestCalcEngine?: boolean; // test=1 querystring
    useTestView?: boolean; // testView=1 querystring
    useTestPlugin?: boolean; // testPlugIn=1 querystring

    // Methods that might be overriden by angular/L@W hosts
    
    // If custom submit code is needed, can provide implementation here
    submitCalculation?: ( appilcation: KatAppInterface, options: SubmitCalculationOptions, done: CalculationResultCallback, fail: JQueryFailCallback )=> void;
    // If client provides for a way to get registration data, can provide implementation here
    getRegistrationData?: ( appilcation: KatAppInterface, options: KatAppOptions, done: GetRegistrationDataResultCallback, fail: JQueryFailCallback )=> void;
    // If custom register data code is needed, can provide implementation here
    registerData?: ( appilcation: KatAppInterface, options: KatAppOptions, done: RegistrationResultCallback, fail: JQueryFailCallback )=> void;
    
    // TODO - do we even want to support these?  Maybe just always do events like all bootstrap components do.
    //      $("app").on("initialized.rble", function() { } ).KatApp();
    // Event call backs
    // If you use on() syntax for initialized, need to set it up before calling KatApp();
    onInitialized?: (this: HTMLElement, appilcation: KatAppInterface )=> void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppInterface )=> void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppInterface )=> void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface)=> void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppInterface )=> void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppInterface )=> void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface)=> void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: KatAppInterface)=> void;
    onCalculateEnd?: (this: HTMLElement, appilcation: KatAppInterface )=> void;
}

interface SubmitCalculationOptions
{
    Inputs: CalculationInputs;
    InputTables?: CalculationInputTable[];
    Configuration: {
        InputTab: string;
        ResultTabs: string[];
        RefreshCalcEngine: boolean;
        CalcEngine?: string;
        PreCalcs?: string;
        Comment?: string;
        TraceEnabled: number;
        SaveCE?: string;
        Token?: string;
    };
}
interface SubmitRegistrationOptions {
    Data: GetRegistrationDataResult;
    Configuration: {
        AuthID: string;
        AdminAuthID?: string;
        Client: string;
        InputTab: string;
        ResultTabs: string[];
        CalcEngine?: string;
        TraceEnabled: number;
        TestCE: boolean;
        SaveCE?: string;
        CurrentPage: string;
        RequestIP: string;
        CurrentUICulture: string;
        Environment: string;
    };
}
interface KatAppProviderInterface
{
    init: ( application: KatAppInterface )=> void;
    calculate: ( application: KatAppInterface, customOptions?: KatAppOptions )=> void;
    destroy: ( application: KatAppInterface )=> void;
    updateOptions: ( application: KatAppInterface )=> void;
     
    // Pass throughs from App to Provider just so code can be maintained in Provider
    getResultRow: ( application: KatAppInterface, table: string, id: string, columnToSearch?: string )=> JSON | undefined;
    getResultValue: ( application: KatAppInterface, table: string, id: string, column: string, defaultValue?: string )=> string | undefined;

    saveCalcEngine: ( application: KatAppInterface, location: string )=> void; // Save the next calculations CalcEngine to secure file location
    refreshCalcEngine: ( application: KatAppInterface )=> void; // Tell next calculation to check for new CE
    traceCalcEngine: ( application: KatAppInterface )=> void; // Save the next calculations CalcEngine to secure file location
}

interface RowLookup {
    LastRowSearched: number;
    Mapping: { 
        [ key: string ]: number; 
    };
}

interface ResourceResults { 
    [ key: string ]: string; 
}

// This is the actual plug in interface.  Accessible via:
//  $("selector").KatApp( "memberName")
//  $("selector").KatApp().memberName - if "selector" only returns one element
//  $("selector")[0].KatApp.memberName
//  $("selector").KatApp( "methodName", ...args)
//  $("selector").KatApp().methodName(...args) - if "selector" only returns one element
//  $("selector")[0].KatApp.methodName(...args)
interface KatAppInterface
{
    options: KatAppOptions;

    provider: KatAppProviderInterface;
    element: JQuery;
    id: string;

    results?: JSON;
    resultRowLookups?: RowLookup[]; 
    getResultRow: ( table: string, id: string, columnToSearch?: string )=> JSON | undefined;
    getResultValue: ( table: string, id: string, column: string, defaultValue?: string )=> string | undefined;
    
    inputs?: CalculationInputs;

    calculate: ( customOptions?: KatAppOptions )=> void;
    // Re-run configureUI calculation, it will have already ran during first calculate() 
    // method if runConfigureUICalculation was true. This call is usually only needed if
    // you want to explicitly save a CalcEngine from a ConfigureUI calculation, so you set
    // the save location and call this.
    configureUI: ( customOptions?: KatAppOptions )=> void;
    destroy: ()=> void;
    updateOptions: ( options: KatAppOptions )=> void;
    
    saveCalcEngine: ( location: string )=> void;
    refreshCalcEngine: ( application: KatAppInterface )=> void; // Tell next calculation to check for new CE
    traceCalcEngine: ( application: KatAppInterface )=> void; // Save the next calculations CalcEngine to secure file location

    trace: ( message: string )=> void;
}
