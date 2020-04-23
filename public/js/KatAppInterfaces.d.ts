/// <reference types="jquery" />
interface CalculationInputs {
    iConfigureUI?: number;
    iInputTrigger?: string;
}
interface CalculationInputTableRow {
    index: string;
}
interface CalculationInputTable {
    Name: string;
    Rows: CalculationInputTableRow[];
}
interface RBLeServiceResults {
    payload?: string;
    Exception?: {
        Message: string;
        StackTrace?: string;
    };
    Diagnostics?: JSON;
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };
    RegisteredToken?: string;
}
interface HtmlContentRow {
    content?: string;
    html?: string;
    value?: string;
    selector?: string;
    addclass?: string;
    removeclass?: string;
}
interface RBLeServiceCallback {
    (data: RBLeServiceResults): void;
}
interface RBLeRESTServiceResult {
    AuthID?: string;
    Client?: string;
    Profile: JSON;
    History?: JSON;
}
interface RBLeRESTServiceResultCallback {
    (data: RBLeRESTServiceResult): void;
}
interface PipelineCallback {
    (errorMessage?: string, data?: RBLeRESTServiceResult | ResourceResults): void;
}
interface JQueryFailCallback {
    (jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string): void;
}
interface KatAppOptions {
    enableTrace?: boolean;
    corsUrl?: string;
    functionUrl?: string;
    registerDataWithService?: boolean;
    shareRegistrationData?: boolean;
    data?: RBLeRESTServiceResult;
    registeredToken?: string;
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
    submitCalculation?: (appilcation: KatAppPlugInInterface, options: SubmitCalculationOptions, done: RBLeServiceCallback, fail: JQueryFailCallback) => void;
    getRegistrationData?: (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback) => void;
    registerData?: (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback) => void;
    onInitialized?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppPlugInInterface) => void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculateEnd?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
}
interface SubmitCalculationOptions {
    Data?: RBLeRESTServiceResult;
    Inputs?: CalculationInputs;
    InputTables?: CalculationInputTable[];
    Configuration: {
        Token?: string;
        InputTab: string;
        ResultTabs: string[];
        CalcEngine?: string;
        Comment?: string;
        TestCE?: boolean;
        TraceEnabled: number;
        SaveCE?: string;
        PreCalcs?: string;
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
    [key: string]: string;
}
interface KatAppPlugInShimInterface {
    options: KatAppOptions;
    element: JQuery;
    id: string;
    destroy: () => void;
    trace: (message: string) => void;
}
interface ResultRowLookupsInterface {
    [key: string]: {
        LastRowSearched: number;
        Mapping: {
            [key: string]: number;
        };
    };
}
interface KatAppPlugInInterface extends KatAppPlugInShimInterface {
    results?: JSON;
    resultRowLookups?: ResultRowLookupsInterface;
    getResultTable<T>(tableName: string): Array<T>;
    getResultRow: (table: string, id: string, columnToSearch?: string) => JSON | undefined;
    getResultValue: (table: string, id: string, column: string, defaultValue?: string) => string | undefined;
    inputs?: CalculationInputs;
    calculate: (customOptions?: KatAppOptions) => void;
    configureUI: (customOptions?: KatAppOptions) => void;
    updateOptions: (options: KatAppOptions) => void;
    saveCalcEngine: (location: string) => void;
    refreshCalcEngine: () => void;
    traceCalcEngine: () => void;
}
