$(function() {
    const invalidInputSelector = ":not(.notRBLe, .RBLe-input-table :input, .dropdown-toggle, button)";
    const skipBindingInputSelector = ":not(.notRBLe, .skipRBLe, .skipRBLe :input, .RBLe-input-table :input, .dropdown-toggle, button)";

    const getInputs = function(application: KatAppInterface): JSON {
        const json = { inputs: {} };
        const inputs = json.inputs;

        // skip table inputs b/c those are custom, and .dropdown-toggle b/c bootstrap select
        // puts a 'button input' inside of select in there
        jQuery.each($(application.options.inputSelector + invalidInputSelector, application.element), function () {
            const input = $(this);

            // bootstrap selectpicker has some 'helper' inputs that I need to ignore
            if (input.parents(".bs-searchbox").length === 0) {
                const value = KatApp.getInputValue(input);

                if (value !== undefined) {
                    const name = KatApp.getInputName(input);
                    inputs[name] = value;
                }
            }
        });

        return json as unknown as JSON;
    }

    class KatAppProvider implements KatAppProviderInterface
    {
        constructor(applications: ApplicationShim[] )
        {
            applications.forEach( a => { 
                this.init( a.application );
                // a.needsCalculation is set if they explicitly call calculate(), but on this
                // initial transfer from Shim to real Provider, we don't want to double call
                // calculate if the options already has callCalculateOnInit because the call
                // above to init() will call calculate.
                if ( a.needsCalculation && !a.application.options.runConfigureUICalculation ) {
                    this.calculate( a.application, a.calculateOptions );
                }
            });
        }

        init( application: KatAppInterface ): void {
            const that = this;

            // re-assign the provider to replace shim with actual implementation
            application.provider = this;

            $(application.options.inputSelector + skipBindingInputSelector, application.element).each(function () {

                $(this).bind("change.RBLe", function () {
                    
                    const wizardInputSelector = $(this).data("input");

                    if (wizardInputSelector == undefined) {
                        that.calculate( application, { inputs: { iInputTrigger: $(this).attr("id") } } );
                    }
                    else {
                        // if present, this is a 'wizard' input and we need to keep the 'regular' input in sync
                        $("." + wizardInputSelector)
                            .val($(this).val() as string)
                            .trigger("change.RBLe"); // trigger calculation
                    }

                });
            });

            application.element.append(`<div>Application initialized.</div>`);

            if ( application.options.runConfigureUICalculation ) {
                const calculationOptions: KatAppOptions = {
                    inputs: { iConfigureUI: 1 }
                };
                this.calculate( application, calculationOptions );
            }
        }

        destroy( application: KatAppInterface ): void { 
            // Remove all event handlers
            application.element.append(`<div>Application destroyed.</div>`);
            $(application.element).off(".RBLe");
            $(application.options.inputSelector!, application.element).off(".RBLe"); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        }

        updateOptions( application: KatAppInterface ): void { 
            // Remove and re-add handlers?
            // Call calculate?
            application.element.append(`<div>Application options updated.</div>`);
        }

        calculate( application: KatAppInterface, options?: KatAppOptions ): void {
            const calcOptions = options !== undefined
                ?  KatApp.extend(/* true, */ {}, application.options, options ) as KatAppOptions
                : application.options;

            KatApp.extend( calcOptions, getInputs( application ) );

            // Pretend to get calculation results
            const calculationResults = { "ceVersion": "1.0", "time": new Date().getTime() } as unknown as JSON;
            
            application.calculationResults = calculationResults;

            if ( calcOptions.inputs?.iConfigureUI ?? false ) {
                calcOptions.onConfigureUICalculation?.call(application.element[0], calculationResults, calcOptions, application );
                application.element.trigger("onConfigureUICalculation.RBLe", [ calculationResults, calcOptions, application ]);
            }

            calcOptions.onCalculate?.call(application.element[0], calculationResults, calcOptions, application );
            application.element.trigger("onCalculate.RBLe", [ calculationResults, calcOptions, application ]);
        }
    }

    const providerShim = $.fn[pluginName].provider as KatAppProviderShim;
    $.fn[pluginName].provider = new KatAppProvider(providerShim.applications);
});
// Needed this line to make sure that I could debug in VS Code since this 
// was dynamically loaded with $.getScript() - https://stackoverflow.com/questions/9092125/how-to-debug-dynamically-loaded-javascript-with-jquery-in-the-browsers-debugg
//# sourceURL=KatAppProvider.js