"use strict";
// Made the following an interface/factory just so that I could put the
// implementation of this code below the implementation of the KatAppPlugIn
// so it was easier to read/maintain the code inside the Provider file (i.e.
// expecting to find the 'plugin' implementation first). If I didn't have an
// interface and I put plugin code above helper implementations, then eslint
// complained that I used a class before it was declared.  Downside is that for 
// any public methods I want to expose, I need to add to this interface as well
// and if I try to navigate (f12) to a method in the code it jumps to the interface
// instead of implementation.  I might remove this and tell eslint to ignore. 
// Not sure yet.
// 
// Original code simply had each of these classes before KatAppPlugIn and made
// a constant (scoped to closure) like - const ui = new UIUtilities()
/*
interface StandardTemplateBuilderInterface {
    buildSlider( element: JQuery ): void;
    buildCarousel( element: JQuery ): void;
    buildHighcharts( element: JQuery ): void;
}
interface UIUtilitiesInterface {
    getInputName(input: JQuery): string;
    getInputValue(input: JQuery): string;
    getInputs(application: KatAppPlugInInterface, customOptions: KatAppOptions ): JSON;
    getInputTables(application: KatAppPlugInInterface): CalculationInputTable[] | undefined;
    triggerEvent(application: KatAppPlugInInterface, eventName: string, ...args: ( object | string | undefined )[]): void;
    bindEvents( application: KatAppPlugInInterface ): void;
    unbindEvents( application: KatAppPlugInInterface ): void;
}
interface RBLeUtilitiesInterface {
    setResults( application: KatAppPlugInInterface, results: JSON | undefined ): void;
    getData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void;
    registerData( application: KatAppPlugInInterface, currentOptions: KatAppOptions, data: RBLeRESTServiceResult, next: PipelineCallback ): void;
    submitCalculation( application: KatAppPlugInInterface, currentOptions: KatAppOptions, next: PipelineCallback ): void;
    getResultRow<T>( application: KatAppPlugInInterface, table: string, key: string, columnToSearch?: string ): T | undefined;
    getResultValue( application: KatAppPlugInInterface, table: string, key: string, column: string, defaultValue?: string ): string | undefined;
    getResultValueByColumn( application: KatAppPlugInInterface, table: string, keyColumn: string, key: string, column: string, defaultValue?: string ): string | undefined;
    getResultTable<T>( application: KatAppPlugInInterface, tableName: string): Array<T>;
    processTemplate( application: KatAppPlugInInterface, templateId: string, data: JQuery.PlainObject ): string;
    createHtmlFromResultRow( application: KatAppPlugInInterface, resultRow: HtmlContentRow ): void;
    processRblValues( application: KatAppPlugInInterface ): void;
    processRblSources( application: KatAppPlugInInterface ): void;
    processVisibilities(application: KatAppPlugInInterface): void;
    processResults( application: KatAppPlugInInterface ): boolean;
}
*/ 
//# sourceMappingURL=KatAppInterfaces.js.map