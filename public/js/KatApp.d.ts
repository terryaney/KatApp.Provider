declare const pluginName = "KatApp";
declare class KatApp {
    static functionUrl: string;
    static corsUrl: string;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static defaultOptions: KatAppOptions;
    static extend(target: object, ...sources: (object | undefined)[]): object;
    static generateId: () => string;
    static trace(application: KatAppPlugInShimInterface | undefined, message: string): void;
    static getResources(functionUrl: string | undefined, resources: string, useTestVersion: boolean, isScript: boolean, pipelineDone: PipelineCallback): void;
}
