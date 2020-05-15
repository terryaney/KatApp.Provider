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
    selectpicker(): JQuery;
    selectpicker(option: string): string;
    selectpicker(propertyName: string, value: string): void;
    datepicker(options: any): JQuery;
}
interface Function {
    plugInShims: KatAppPlugInShimInterface[];
    applicationFactory(id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    debugApplicationFactory(id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    templateOn(templateName: string, events: string, fn: TemplateOnDelegate): void;
    templatesUsedByAllApps: {
        [key: string]: {
            requested: boolean;
            data?: string;
            callbacks: Array<(errorMessage: string | undefined) => void>;
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
        callbacks: Array<(errorMessage: string | undefined) => void>;
    };
    standardTemplateBuilderFactory(application: KatAppPlugInInterface): any;
    highchartsBuilderFactory(application: KatAppPlugInInterface): any;
    ui(application: KatAppPlugInInterface): any;
    rble(application: KatAppPlugInInterface, uiUtilities: any): any;
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
interface ContentsRow {
    section: string;
    type: string;
    item: string;
    class?: string;
}
interface ResultTableColumnConfiguration {
    name: string;
    cssClass?: string;
    isTextColumn: boolean;
    xsColumns?: number;
    smColumns?: number;
    mdColumns?: number;
    lgColumns?: number;
    width?: number;
    widthPct?: string;
}
interface ResultTableConfiguration {
    totalRows: number;
    columnConfiguration: {
        [key: string]: ResultTableColumnConfiguration;
    };
    columnConfigurationQuery: Array<ResultTableColumnConfiguration>;
}
interface ResultTableRow extends JSON {
    "@id"?: string;
    "@code"?: string;
}
interface ResultTableColumn {
    "@class"?: string;
    "@width"?: string;
    "@r-width"?: string;
    "@xs-width"?: string;
    "@sm-width"?: string;
    "@md-width"?: string;
    "@lg-width"?: string;
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
interface ValidationRow {
    "@id"?: string;
    text: string;
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
    payload?: string;
    Exception?: {
        Message: string;
        StackTrace?: string;
    };
    Diagnostics?: JSON;
    Resources?: {
        Resource: string;
        Content: string;
        DateLastModified: Date;
    }[];
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };
    RegisteredToken?: string;
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
interface SubmitCalculationDelegate {
    (appilcation: KatAppPlugInInterface, options: SubmitCalculationOptions | GetResourceOptions, done: RBLeServiceCallback, fail: JQueryFailCallback): void;
}
interface GetDataDelegate {
    (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeRESTServiceResultCallback, fail: JQueryFailCallback): void;
}
interface RegisterDataDelegate {
    (appilcation: KatAppPlugInInterface, options: KatAppOptions, done: RBLeServiceCallback, fail: JQueryFailCallback): void;
}
interface KatAppOptions {
    debug?: {
        traceVerbosity?: TraceVerbosity;
        debugResourcesRoot?: string;
        saveFirstCalculationLocation?: string;
        refreshCalcEngine?: boolean;
        useTestCalcEngine?: boolean;
        useTestView?: boolean;
        useTestPlugin?: boolean;
    };
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
    submitCalculation?: SubmitCalculationDelegate;
    getData?: GetDataDelegate;
    registerData?: RegisterDataDelegate;
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
interface GetResourceOptions {
    Command: string;
    Resources: {
        Resource: string;
        Folder: string;
        Version: string;
    }[];
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
