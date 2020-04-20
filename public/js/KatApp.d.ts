/// <reference types="jquery" />
declare const pluginName = "KatApp";
declare class KatApp {
    static serviceUrl: string;
    static defaultOptions: KatAppOptions;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static extend(target: object, ...sources: (object | undefined)[]): object;
    static getResource(serviceUrl: string | undefined, folder: string, resource: string, isScript: boolean, callBack: (data: string | undefined) => void): void;
    static getInputName(input: JQuery): string;
    static getInputValue(input: JQuery): string;
}
declare class ApplicationShim {
    application: PlugInInterface;
    calculateOptions?: KatAppOptions;
    needsCalculation: boolean;
    constructor(application: PlugInInterface);
}
declare class KatAppProviderShim implements KatAppProviderInterface {
    applications: ApplicationShim[];
    init(application: PlugInInterface): void;
    calculate(application: PlugInInterface, options?: KatAppOptions): void;
    updateOptions(): void;
    destroy(application: PlugInInterface): void;
}
