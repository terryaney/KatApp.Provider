interface JQuery
{
    PlugIn(): JQuery | undefined;
    PlugIn(options?: PlugInOptions | string, ...obj: Array<string | number>): JQuery | undefined;
}

const pluginName = 'KatApp';

// Static Methods
class KatApp
{
    // Default Options
    static defaultOptions: PlugInOptions =
    {
        color: '#F00',
        backgroundColor: '#00F',
        skipConfigureUI: false,
        onProcessResults: function(): void { /* default empty callback */ },
        onProcessErrors: function(): void { /* default empty callback */ }
    };
}

(function($, window, document, undefined?: undefined): void {

    class PlugIn implements PlugInInterface
    {
        // Fields
        container: HTMLElement;
        element: JQuery;
        _options: PlugInOptions;
        id: string;

        constructor(id: string, element: JQuery, options: PlugInOptions)
        {
            this.id = id;
            this._options = $.extend(KatApp.defaultOptions, options);
            this.element = element;
            this.element.attr("rbl-application-id", id);
            this.container = element[ 0 ];
            this.container[ pluginName ] = this;
            
            this.calculate();
        }
    
        calculate(): void
        {
           // this._options.onProcessResults?.call(this);
        }

        destroy(): void
        {
            delete this.container[ pluginName ];
            // this.element.removeData();
        }
    
        updateOptions( options: PlugInOptions ): void
        {
            this._options = $.extend(this._options, options);
        }

        options(): PlugInOptions {
            return this._options;
        } 
    }
    
    // Private method not accessible outside plug in, need to call via privateMethod.apply(this);
    const privateMethod = function(this: PlugIn): void
    {
        this.element
            .css('color', this._options.color)
            .css('background-color', this._options.backgroundColor);
    }

    // Allowed 'property get' statements
    const getters = ['options'];

    $.fn[pluginName] = function(options?: PlugInOptions | string, ...args: Array<string | number>): JQuery | undefined {

        if (options === undefined || typeof options === 'object') {
            
            // Creates a new plugin instance, for each selected element, and
            // stores a reference withint the element's data
            return this.each(function() {

                if (!this[pluginName]) {
                    // https://stackoverflow.com/a/2117523
                    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });

                    const provider = $.fn[pluginName].provider as KatAppProviderInterface;
                    const applications = $.fn[pluginName].applications as Map<string, PlugInInterface>;

                    if ( !provider && applications.size === 0 ) {
                        $.getScript("js/KatAppProvider.js", function( _data ) {
                            console.log("Get Script worked.");
                        });
                    }
                    
                    const plugIn = new PlugIn(id, $(this), options as PlugInOptions);
                    
                    if ( !provider ) {
                        applications.set( plugIn.id, plugIn );
                    }
                    else {
                        provider.addApplication( plugIn );
                    }
                }

            });

        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            
            // Call a public pluguin method (not starting with an underscore) for each 
            // selected element.
            if (args.length == 0 && $.inArray(options, getters) != -1 ) {
            
                // If the user does not pass any arguments and the method allows to
                // work as a getter then break the chainability so we can return a value
                // instead the element reference.  this[0] should be the only item in selector and grab getter from it.
                const instance = this[0][pluginName];
                return instance[options].apply(instance, args);
            
            } else {
            
                // Invoke the speficied method on each selected element
                return this.each(function() {
                    const instance = this[pluginName];
                    if (instance instanceof PlugIn && typeof instance[options] === 'function') {
                        instance[options].apply(instance, args);
                    }
                });
            
            }

        }
    };

    // Collection of registered PlugIn controllers
    $.fn[pluginName].applications = new Map();
})(jQuery, window, document);