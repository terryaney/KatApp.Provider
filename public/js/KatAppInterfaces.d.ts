/// <reference types="jquery" />
interface String {
    format(json: JQuery.PlainObject): string;
    startsWith(str: string): boolean;
    endsWith(searchString: string, position?: number): boolean;
}
interface HTMLElement {
    KatApp?: KatAppPlugInShimInterface;
}
interface JQuery {
    KatApp(options?: KatAppOptions | string, ...args: Array<string | number | KatAppOptions>): JQuery | KatAppPlugInShimInterface | string | undefined;
    carousel(frame: number): JQuery;
    selectpicker(): JQuery;
    datepicker(options: any): JQuery;
}
interface Function {
    plugInShims: KatAppPlugInShimInterface[];
    applicationFactory(id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    templateOn(templateName: string, events: string, fn: TemplateOnDelegate): void;
    standardTemplateBuilderFactory(application: KatAppPlugInInterface): any;
    highchartsBuilderFactory(application: KatAppPlugInInterface): any;
    ui: any;
    rble: any;
}
interface HighchartsTooltipFormatterContextObject {
    y: number;
    x: number;
    series: {
        name: string;
    };
    points: Array<HighchartsTooltipFormatterContextObject>;
}
interface CalculationInputs {
    iConfigureUI?: number;
    iDataBind?: number;
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
    "@id"?: string;
    content?: string;
    html?: string;
    value?: string;
    selector?: string;
    addclass?: string;
    removeclass?: string;
}
interface SliderConfigurationRow {
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
    traceVerbosity?: TraceVerbosity;
    corsUrl?: string;
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
    runConfigureUICalculation?: boolean;
    view?: string;
    viewTemplates?: string;
    ajaxLoaderSelector?: string;
    refreshCalcEngine?: boolean;
    useTestCalcEngine?: boolean;
    useTestView?: boolean;
    useTestPlugin?: boolean;
    submitCalculation?: (appilcation: KatAppPlugInInterface, options: SubmitCalculationOptions, done: RBLeServiceCallback, fail: JQueryFailCallback) => void;
    getData?: (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback) => void;
    registerData?: (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback) => void;
    onTemplatesProcessed?: (this: HTMLElement, appilcation: KatAppPlugInInterface, templates: string[]) => void;
    onInitialized?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onRegistration?: (this: HTMLElement, calcOptions: KatAppOptions, appilcation: KatAppPlugInInterface) => void;
    onCalculateStart?: (this: HTMLElement, appilcation: KatAppPlugInInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, message: string, exception: RBLeServiceResults | undefined, calcOptions: KatAppOptions, application: KatAppPlugInInterface) => void;
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
interface ResultRowLookupsInterface {
    [key: string]: {
        LastRowSearched: number;
        Mapping: {
            [key: string]: number;
        };
    };
}
interface KatAppPlugInShimInterface {
    options: KatAppOptions;
    element: JQuery;
    id: string;
    destroy: () => void;
    rebuild: (options: KatAppOptions) => void;
    trace: (message: string, verbosity?: TraceVerbosity) => void;
}
interface KatAppPlugInInterface extends KatAppPlugInShimInterface {
    results?: JSON;
    exception?: RBLeServiceResults;
    resultRowLookups?: ResultRowLookupsInterface;
    getResultTable<T>(tableName: string): Array<T>;
    getResultRow<T>(table: string, id: string, columnToSearch?: string): T | undefined;
    getResultValue(table: string, id: string, column: string, defaultValue?: string): string | undefined;
    inputs?: CalculationInputs;
    calculate: (customOptions?: KatAppOptions) => void;
    configureUI: (customOptions?: KatAppOptions) => void;
    updateOptions: (options: KatAppOptions) => void;
    saveCalcEngine: (location: string) => void;
    refreshCalcEngine: () => void;
    traceCalcEngine: () => void;
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
