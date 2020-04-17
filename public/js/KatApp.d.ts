interface JQuery {
    PlugIn(): JQuery | undefined;
    PlugIn(options?: PlugInOptions | string, ...obj: Array<string | number>): JQuery | undefined;
}
declare const pluginName = "KatApp";
declare class KatApp {
    static defaultOptions: PlugInOptions;
}
