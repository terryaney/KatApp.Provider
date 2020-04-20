/// <reference types="jquery" />
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
    onInitialized?: (this: HTMLElement, appilcation: PlugInInterface) => void;
    onDestroyed?: (this: HTMLElement, appilcation: PlugInInterface) => void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: PlugInInterface) => void;
    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: PlugInInterface) => void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: PlugInInterface) => void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: PlugInInterface) => void;
}
interface KatAppProviderInterface {
    init: (application: PlugInInterface) => void;
    calculate: (application: PlugInInterface, options?: KatAppOptions) => void;
    destroy: (application: PlugInInterface) => void;
    updateOptions: (application: PlugInInterface, originalOptions: KatAppOptions) => void;
}
interface PlugInInterface {
    options: KatAppOptions;
    provider: KatAppProviderInterface;
    element: JQuery;
    id: string;
    calculationResults?: JSON;
    calculate: (options?: KatAppOptions) => void;
    configureUI: (options?: KatAppOptions) => void;
    destroy: () => void;
    updateOptions: (originalOptions: KatAppOptions) => void;
}
