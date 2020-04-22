declare const pluginName = "KatApp";
declare class KatApp {
    static serviceUrl: string;
    static corsProxyUrl: string;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static defaultOptions: KatAppOptions;
    static extend(target: object, ...sources: (object | undefined)[]): object;
    static getResources(serviceUrl: string | undefined, resources: string, useTestVersion: boolean, isScript: boolean, pipelineDone: PipelineCallback): void;
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
    saveCalcEngine(): void;
    traceCalcEngine(): void;
    refreshCalcEngine(): void;
    getResultValue(): string | undefined;
    getResultRow(): JSON | undefined;
    destroy(application: KatAppInterface): void;
}
