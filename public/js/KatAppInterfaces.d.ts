/// <reference types="jquery" />
interface CalculationInputs {
    iConfigureUI?: number;
    iInputTrigger?: string;
}
interface CalculationInputTable {
    Name: string;
    Rows: CalculationInputTableRow[];
}
interface CalculationInputTableRow {
    index: string;
}
interface ServiceException {
    Message: string;
    StackTrace?: string;
}
interface ServiceResults {
    payload?: string;
    Exception?: ServiceException;
    Diagnostics?: JSON;
}
interface CalculationResults extends ServiceResults {
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
    (data: CalculationResults): void;
}
interface GetRegistrationDataResult {
    AuthID?: string;
    Client?: string;
    Profile: JSON;
    History?: JSON;
}
interface PipelineCallback {
    (errorMessage?: string, data?: GetRegistrationDataResult | ResourceResults): void;
}
interface GetRegistrationDataResultCallback {
    (data: GetRegistrationDataResult): void;
}
interface RegistrationResult extends ServiceResults {
    RegisteredToken?: string;
}
interface RegistrationResultCallback {
    (data: RegistrationResult): void;
}
interface JQueryDoneCallback {
    (data: JQuery.PlainObject, textStatus: string, jqXHR: JQuery.jqXHR): void;
}
interface JQueryFailCallback {
    (jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string): void;
}
interface JQueryGetScriptSuccessCallback {
    (script: string | undefined, textStatus: string, jqXHR: JQuery.jqXHR): void;
}
interface SubmitCalculationDelegate {
    (application: KatAppInterface, options: SubmitCalculationOptions, done: CalculationResultCallback, fail: JQueryFailCallback): void;
}
interface KatAppOptions {
    enableTrace?: boolean;
    serviceUrl?: string;
    registeredToken?: string;
    shareRegisterToken?: boolean;
    currentPage?: string;
    calcEngine?: string;
    inputTab?: string;
    resultTabs?: string[];
    inputSelector?: string;
    manualInputs?: CalculationInputs;
    runConfigureUICalculation?: boolean;
    view?: string;
    viewTemplates?: string;
    ajaxLoaderSelector?: string;
    refreshCalcEngine?: boolean;
    useTestCalcEngine?: boolean;
    useTestView?: boolean;
    useTestPlugin?: boolean;
    submitCalculation?: (appilcation: KatAppInterface, options: SubmitCalculationOptions, done: CalculationResultCallback, fail: JQueryFailCallback) => void;
    getRegistrationData?: (appilcation: KatAppInterface, options: KatAppOptions, done: GetRegistrationDataResultCallback, fail: JQueryFailCallback) => void;
    registerData?: (appilcation: KatAppInterface, options: KatAppOptions, done: RegistrationResultCallback, fail: JQueryFailCallback) => void;
    onInitialized?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppInterface) => void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculateEnd?: (this: HTMLElement, appilcation: KatAppInterface) => void;
}
interface SubmitCalculationOptions {
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
interface KatAppProviderInterface {
    init: (application: KatAppInterface) => void;
    calculate: (application: KatAppInterface, customOptions?: KatAppOptions) => void;
    destroy: (application: KatAppInterface) => void;
    updateOptions: (application: KatAppInterface) => void;
    getResultRow: (application: KatAppInterface, table: string, id: string, columnToSearch?: string) => JSON | undefined;
    getResultValue: (application: KatAppInterface, table: string, id: string, column: string, defaultValue?: string) => string | undefined;
    saveCalcEngine: (application: KatAppInterface, location: string) => void;
    refreshCalcEngine: (application: KatAppInterface) => void;
    traceCalcEngine: (application: KatAppInterface) => void;
}
interface RowLookup {
    LastRowSearched: number;
    Mapping: {
        [key: string]: number;
    };
}
interface ResourceResults {
    [key: string]: string;
}
interface KatAppInterface {
    options: KatAppOptions;
    provider: KatAppProviderInterface;
    element: JQuery;
    id: string;
    results?: JSON;
    resultRowLookups?: RowLookup[];
    getResultRow: (table: string, id: string, columnToSearch?: string) => JSON | undefined;
    getResultValue: (table: string, id: string, column: string, defaultValue?: string) => string | undefined;
    inputs?: CalculationInputs;
    calculate: (customOptions?: KatAppOptions) => void;
    configureUI: (customOptions?: KatAppOptions) => void;
    destroy: () => void;
    updateOptions: (options: KatAppOptions) => void;
    saveCalcEngine: (location: string) => void;
    refreshCalcEngine: (application: KatAppInterface) => void;
    traceCalcEngine: (application: KatAppInterface) => void;
    trace: (message: string) => void;
}
