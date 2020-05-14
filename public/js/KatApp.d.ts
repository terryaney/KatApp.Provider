declare enum TraceVerbosity {
    None = 0,
    Quiet = 1,
    Minimal = 2,
    Normal = 3,
    Detailed = 4,
    Diagnostic = 5
}
declare class KatApp {
    static functionUrl: string;
    static corsUrl: string;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static defaultOptions: KatAppOptions;
    static extend(target: object, ...sources: (object | undefined)[]): object;
    static generateId: () => string;
    static trace(application: KatAppPlugInShimInterface | undefined, message: string, verbosity?: TraceVerbosity): void;
    static getResources(application: KatAppPlugInShimInterface, resources: string, useTestVersion: boolean, isScript: boolean, pipelineDone: PipelineCallback): void;
}
