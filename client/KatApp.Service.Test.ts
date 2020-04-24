KatApp.defaultOptions.getData = function( application, _options, done ): void {    
    application.trace("Debug data.");
    done(
        {
            AuthID: "91111111",
            Client: "Boeing",
            Profile: {} as JSON,
            History: {} as JSON
        }
    );
};
