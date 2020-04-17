interface KatAppProviderInterface
{
    addApplication: ( application: PlugInInterface )=> void;
}

interface PlugInInterface
{
    options(): PlugInOptions;
    element: JQuery;
    id: string;
}
interface PlugInOptions
{
    color: string;
    backgroundColor: string;

    skipConfigureUI?: boolean;
    onProcessResults?: (this: HTMLElement, calculationResults: JSON)=> void;
    onProcessErrors?: (this: HTMLElement, key: string, data: JSON)=> void;
}

$(function() {
    class KatAppProvider 
    {
        applications: Map<string, PlugInInterface> = new Map();

        constructor(applications: Map<string, PlugInInterface>)
        {
            const applicationCount = applications.size;
            console.log(`Trigger ${applicationCount} applications.`);

            applications.forEach( application => { 
                this.addApplication( application ) 
            });
            applications.clear();
        }

        addApplication( application: PlugInInterface ): void {
            this.applications.set( application.id, application);
            const options = application.options();

            console.log(`Trigger onProcessResults for ${application.element.attr("rbl-application-id")}.`);
            application.element.append("<div>Initialized</div>");
            options.onProcessResults?.call(application.element[0], { "ceVersion": "1.0" } as unknown as JSON );
        }
    }

    $.fn[pluginName].provider = new KatAppProvider($.fn[pluginName].applications);
});
// Needed this line to make sure that I could debug in VS Code since this 
// was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js