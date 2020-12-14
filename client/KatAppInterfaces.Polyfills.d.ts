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
interface Function {
    plugInShims?: KatAppPlugInShimInterface[]; // applications when they are in 'shim' format
    applications?: KatAppPlugInShimInterface[]; // applications when they are in 'real' format
    reset(): void;
    applicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;
    // Debugging...let's me restore the original shim factory if I'm going to rebuild UI or script locations
    debugApplicationFactory( id: string, element: JQuery, options: KatAppOptions): KatAppPlugInShimInterface;    
    templateOn( templateName: string, events: string, fn: TemplateOnDelegate ): void;

    templatesUsedByAllApps: { 
        [ key: string ]: { 
            requested: boolean; 
            data?: string; 
            callbacks: Array<( errorMessage: string | undefined )=> void>; 
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
        callbacks: Array<( errorMessage: string | undefined )=> void>; 
    };
    
    // Didn't want to use interface (see comments at bottom of file for the negative parts) and couldn't use
    // the 'class' implementation because that code only existed in closure.  So just use any.
    standardTemplateBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    highchartsBuilderFactory( application: KatAppPlugInInterface ): any /*StandardTemplateBuilderInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    ui( application: KatAppPlugInInterface ): any /*UIUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    rble( application: KatAppPlugInInterface ): any /*RBLeUtilitiesInterface*/; // eslint-disable-line @typescript-eslint/no-explicit-any
    // highcharts: any /*HighchartsBuilder*/; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface HighchartsTooltipFormatterContextObject {
    y: number;
    x: number;
    series: {
        name: string;
    };
    points: Array<HighchartsTooltipFormatterContextObject>;
}