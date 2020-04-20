/// <reference types="jquery" />
declare const pluginName = "katapp";
interface CalculationInputs {
    iConfigureUI?: number;
    iInputTrigger?: string;
}
interface KatAppOptions {
    serviceUrl?: string;
    calcEngine?: string;
    inputSelector?: string;
    runConfigureUICalculation?: boolean;
    inputs?: CalculationInputs;
    onInitialized?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: KatAppInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
}
declare class KatApp {
    static serviceUrl: string;
    static defaultOptions: KatAppOptions;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static extend(target: object, ...sources: object[]): object;
    static getResource(serviceUrl: string | undefined, folder: string, resource: string, isScript: boolean, callBack: (data: string | undefined) => void): void;
    static getInputName(input: JQuery): string;
    static getInputValue(input: JQuery): string;
}
interface KatAppProviderInterface {
    init: (application: KatAppInterface) => void;
    calculate: (application: KatAppInterface, options?: KatAppOptions) => void;
    destroy: (application: KatAppInterface) => void;
    updateOptions: (application: KatAppInterface, originalOptions: KatAppOptions) => void;
}
interface KatAppInterface {
    options: KatAppOptions;
    provider: KatAppProviderInterface;
    element: JQuery;
    id: string;
    calculationResults?: JSON;
}
declare class ApplicationShim {
    application: KatAppInterface;
    calculateOptions?: KatAppOptions;
    needsCalculation: boolean;
    constructor(application: KatAppInterface);
}
declare class KatAppProviderShim implements KatAppProviderInterface {
    applications: ApplicationShim[];
    init(application: KatAppInterface): void;
    calculate(application: KatAppInterface, options?: KatAppOptions): void;
    updateOptions(): void;
    destroy(application: KatAppInterface): void;
}
