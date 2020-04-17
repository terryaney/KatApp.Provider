interface KatAppProviderInterface {
    addApplication: (application: PlugInInterface) => void;
}
interface PlugInInterface {
    options(): PlugInOptions;
    element: JQuery;
    id: string;
}
interface PlugInOptions {
    color: string;
    backgroundColor: string;
    skipConfigureUI?: boolean;
    onProcessResults?: (this: HTMLElement, calculationResults: JSON) => void;
    onProcessErrors?: (this: HTMLElement, key: string, data: JSON) => void;
}
