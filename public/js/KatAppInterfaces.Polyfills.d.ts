/// <reference types="jquery" />
interface String {
    format(json: JQuery.PlainObject): string;
    ensureGlobalPrefix(): string;
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
    plugInShims?: KatAppPlugInShimInterface[];
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
