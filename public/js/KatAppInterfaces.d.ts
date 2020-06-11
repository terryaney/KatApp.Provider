/// <reference types="jquery" />
interface KatAppOptions {
    debug?: {
        traceVerbosity?: TraceVerbosity;
        debugResourcesDomain?: string;
        debugProviderDomain?: string;
        saveFirstCalculationLocation?: string;
        refreshCalcEngine?: boolean;
        useTestCalcEngine?: boolean;
        useTestView?: boolean;
        useTestPlugin?: boolean;
    };
    sessionUrl?: string;
    functionUrl?: string;
    registerDataWithService?: boolean;
    shareDataWithOtherApplications?: boolean;
    sharedDataLastRequested?: number;
    data?: RBLeRESTServiceResult;
    registeredToken?: string;
    currentPage?: string;
    calcEngine?: string;
    inputTab?: string;
    resultTabs?: string[];
    inputSelector?: string;
    manualInputs?: CalculationInputs;
    defaultInputs?: CalculationInputs;
    runConfigureUICalculation?: boolean;
    view?: string;
    viewTemplates?: string;
    ajaxLoaderSelector?: string;
    submitCalculation?: SubmitCalculationDelegate;
    getData?: GetDataDelegate;
    registerData?: RegisterDataDelegate;
    onInitialized?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppPlugInInterface) => void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onResultsProcessing?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, message: string, exception: RBLeServiceResults | undefined, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculateEnd?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
}
interface KatAppPlugInShimInterface {
    options: KatAppOptions;
    element: JQuery;
    id: string;
    destroy: () => void;
    rebuild: (options: KatAppOptions) => void;
    updateOptions: (options: KatAppOptions) => void;
    calculate: (options?: KatAppOptions) => void;
    trace: (message: string, verbosity?: TraceVerbosity) => void;
}
interface KatAppPlugInInterface extends KatAppPlugInShimInterface {
    results?: JSON;
    exception?: RBLeServiceResults;
    resultRowLookups?: ResultRowLookupsInterface;
    getResultTable<T>(tableName: string): Array<T>;
    getResultRow<T>(table: string, id: string, columnToSearch?: string): T | undefined;
    getResultValue(table: string, id: string, column: string, defaultValue?: string): string | undefined;
    calculationInputs?: CalculationInputs;
    calculate: (customOptions?: KatAppOptions) => void;
    configureUI: (customOptions?: KatAppOptions) => void;
    saveCalcEngine: (location: string) => void;
    refreshCalcEngine: () => void;
    traceCalcEngine: () => void;
}
interface GetResourceOptions {
    Command: string;
    Resources: {
        Resource: string;
        Folder: string;
        Version: string;
    }[];
}
interface ResourceResults {
    [key: string]: string;
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
interface SubmitCalculationDelegate {
    (appilcation: KatAppPlugInInterface, options: SubmitCalculationOptions | GetResourceOptions, done: RBLeServiceCallback, fail: JQueryFailCallback): void;
}
interface GetDataDelegate {
    (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback): void;
}
interface RegisterDataDelegate {
    (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback): void;
}
interface TemplateOnDelegate {
    (event: JQuery.Event, ...args: Array<object>): void;
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
