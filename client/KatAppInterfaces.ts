interface CalculationInputs
{
    iConfigureUI?: number;
    iInputTrigger?: string;
}

interface KatAppOptions
{
    serviceUrl?: string;

    calcEngine?: string;
    inputSelector?: string;
    runConfigureUICalculation?: boolean;
    inputs?: CalculationInputs;

    onInitialized?: (this: HTMLElement, appilcation: PlugInInterface )=> void;
    onDestroyed?: (this: HTMLElement, appilcation: PlugInInterface )=> void;
    onOptionsUpdated?: (this: HTMLElement, appilcation: PlugInInterface )=> void;

    onConfigureUICalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: PlugInInterface)=> void;
    onCalculation?: (this: HTMLElement, calculationResults: JSON, calcOptions: KatAppOptions, application: PlugInInterface)=> void;
    onCalculationErrors?: (this: HTMLElement, key: string, data: JSON, calcOptions: KatAppOptions, application: PlugInInterface)=> void;
}

interface KatAppProviderInterface
{
    init: ( application: PlugInInterface )=> void;
    calculate: ( application: PlugInInterface, options?: KatAppOptions )=> void;
    destroy: ( application: PlugInInterface )=> void;
    updateOptions: ( application: PlugInInterface, originalOptions: KatAppOptions )=> void;
}

// This is the actual plug in interface.  Accessible via:
//  $("selector").KatApp( "memberName")
//  $("selector").KatApp().memberName - if "selector" only returns one element
//  $("selector")[0].KatApp.memberName
//  $("selector").KatApp( "methodName", ...args)
//  $("selector").KatApp().methodName(...args) - if "selector" only returns one element
//  $("selector")[0].KatApp.methodName(...args)
interface PlugInInterface
{
    options: KatAppOptions;

    provider: KatAppProviderInterface;
    element: JQuery;
    id: string;
    calculationResults?: JSON;

    calculate: ( options?: KatAppOptions )=> void;
    // Re-run configureUI calculation, it will have already ran during first calculate() 
    // method if runConfigureUICalculation was true. This call is usually only needed if
    // you want to explicitly save a CalcEngine from a ConfigureUI calculation, so you set
    // the save location and call this.
    configureUI: ( options?: KatAppOptions )=> void;
    destroy: ()=> void;
    updateOptions: ( originalOptions: KatAppOptions )=> void;
}
