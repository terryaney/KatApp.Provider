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
    static sessionUrl: string;
    static stringCompare(strA: string, strB: string, ignoreCase: boolean): number;
    static readPageParameters(): JSON;
    static pageParameters: JSON;
    static defaultOptions: KatAppOptions;
    static extend(target: object, ...sources: (object | undefined)[]): object;
    static generateId: () => string;
    static ping(url: string, callback: (responded: boolean, error?: string | Event) => void): void;
    static trace(application: KatAppPlugInShimInterface | undefined, message: string, verbosity?: TraceVerbosity): void;
    static getResources(application: KatAppPlugInShimInterface, resources: string, useTestVersion: boolean, isScript: boolean, debugResourcesDomain: string | undefined, getResourcesHandler: PipelineCallback): void;
}
