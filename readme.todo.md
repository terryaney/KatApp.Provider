# Questions and TODOs

## Approval
- Provider + Templates together (make sure to test LAW/Dr as well)
- After approval of Find Dr, delete Standard_TemplatesBS4

## TODO
- How do I check/handle for errors when I try to load view
- Ability to have two CE's for one view might be needed for stochastic
    - Would need to intercept init that binds onchange and instead call a getOptions or smoething on each input, or maybe a rbl-calcengine tag on each input?

## Discussions with Tom
- Search for TOM comments
- Retry - how often do we 'retry' registration?  Once per session?  Once per calc attempt?

## External Usage Changes
1. Look at KatAppOptions (properties and events) and KatAppPlugInInterface (public methods on a katapp (only 4))
2. Kat App element attributes (instead of data): rbl-view, rbl-view-templates, rbl-calcengine
3. Registration TP needs AuthID and Client like mine does, RBLe Service looks like it expects them (at least AuthID)
4. If they do handlers for submit, register, etc., they *have* to call my done/fail callbacks or app will 'stall'
5. Added rbl-input-tab and rbl-result-tabs to 'kat app data attributes'
6. `<div rbl-tid="chart-highcharts" data-name="BalanceChart" rbl-data="BalanceChart" rbl-options="BalanceChart"></div>`

## Debug Issues
1. If I set tsconfig-base.json removeComments: true, it removes my //# sourceURL=KatAppProvider.js at the bottom of the file and debugging/finding the file in Chrome is not possible.  Need to figure out how to get that in there or manually put in after I build.

2. Trouble debugging KatAppProvider with breakpoints. The only way it seemed I could put breakpoints into KatAppProvider.ts was to modify the sourceMappingURL declaration in the generated file (KatAppProvider.js) to sourceMappingURL=Global/KatAppProvider.js.map. If it didn't have the Global/ folder, Chrome said it couldn't find the file and breakpoints were never hit.
    - If I did change to js/, breakpoints hit, but then Chrome would display an error.  Maybe that is expected, but just documenting. In the Source file view, not the console, would see something like:
        > Could not load content for http://localhost:8887/client/KatAppProvider.ts (HTTP error: status code 404, net::ERR_HTTP_RESPONSE_CODE_FAILURE)
