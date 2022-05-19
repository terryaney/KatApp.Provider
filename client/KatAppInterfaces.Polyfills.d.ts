interface Deferred extends JQuery.Deferred<any, any, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    // made this interface to just put the one lint comment and not have to put lint every place I use it
}
interface GetResourceXHR extends JQuery.jqXHR<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    // made this interface to just put the one lint comment and not have to put lint every place I use it
}
// Prototypes / polyfills
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
    KatApp( options?: KatAppOptions | string, ...args: Array<string | number | KatAppOptions> ): JQuery | KatAppPlugInShimInterface | string | undefined;

    selectpicker(): JQuery;
    selectpicker( option: string ): string;
    selectpicker( propertyName: string, value: string ): void;

    datepicker( options: any ): JQuery; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface JQueryStatic {
    whenAllDone( deferreds: ( Deferred )[] ): Deferred;
}

interface PromiseStatus {
    status: string;
    reason?: any;
    value?: any;
}
interface Function {
    plugInShims?: KatAppPlugInShimInterface[]; // applications when they are in 'shim' format
    reset(): void;
    applicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    // Debugging...let's me restore the original shim factory if I'm going to rebuild UI or script locations
    debugApplicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;    
    templateOn( events: string, fn: TemplateOnDelegate ): void;
    getResources( application: KatAppPlugInShimInterface, resources: string, useTestVersion: boolean, isScript: boolean, debugResourcesDomain: string | undefined, getResourcesHandler: GetResourcesCallback ): void;
    getResource( url: string, tryLocalServer: boolean, isInManagementSite: boolean, folder: string, name: string, version: string ): GetResourceXHR;
    ping( url: string, callback: ( responded: boolean, error?: string | Event )=> void ): void;

    resourceTemplates: Record<string, TemplateFile>;

    // When template content is being injected inside a view, if calls are made to templateOn, this variable
    // must/will be set so that the event handler being registered is correctly hooked to the view containing
    // the templated content.
    currentView: JQuery<HTMLElement> | undefined,
    navigationInputs: {} | undefined,
    sharedData: { 
        requesting: boolean;
        lastRequested?: number;
        data?: RBLeRESTServiceResult;
        registeredToken?: string;
        callbacks: Array<( errorMessage: string | undefined )=> void>; 
    };
    
    // Didn't want to use interface (would have to keep an interface in sync with implementation - every method
    // add, I'd have to add interface and implementation.  Also, f12 goto would always come to this file) and couldn't use
    // the 'class' implementation because that code only existed in closure.  So just use any.
    standardTemplateBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    highchartsBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    ui( application: KatAppPlugInInterface ): any /*UIUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    rble( application: KatAppPlugInInterface ): any /*RBLeUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    // highcharts: any /*HighchartsBuilder*/; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface HighchartsOptionsArray extends Array<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    // made this interface to just put the one lint comment and not have to put lint every place I use it
}
interface HighchartsTooltipFormatterContextObject {
    y: number;
    x: number;
    series: {
        name: string;
    };
    points: Array<HighchartsTooltipFormatterContextObject>;
}