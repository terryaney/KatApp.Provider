/// <reference types="jquery" />
declare const pluginName = "katapp";
interface CalculationInputs {
    iConfigureUI?: number;
    iInputTrigger?: string;
}
interface KatAppOptions {
    calcEngine?: string;
    inputSelector?: string;
    runConfigureUICalculation?: boolean;
    inputs?: CalculationInputs;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculate?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: KatAppInterface) => void;
}
declare class KatApp {
    static defaultOptions: KatAppOptions;
    static extend: (target: object, ...sources: object[]) => object;
    static getInputName(input: JQuery): string;
    static getInputValue(input: JQuery): string;
}
interface KatAppProviderInterface {
    init: (application: KatAppInterface) => void;
    calculate: (application: KatAppInterface, options?: KatAppOptions) => void;
    destroy: (application: KatAppInterface) => void;
    updateOptions: (application: KatAppInterface) => void;
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
