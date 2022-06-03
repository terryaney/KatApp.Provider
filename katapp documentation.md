# KatApp Documentation Contents
- [Overview](#Overview)
    - [Definitions](#Definitions)
    - [Required Javscript Files](#Required-Javscript-Files)
- [Initializing and Configuring a KatApp](#Initializing-and-Configuring-a-KatApp)
    - [Configuring via KatApp Attributes](#Configuring-via-KatApp-Attributes)
    - [Configuring via Javascript Configuration Object](#Configuring-via-Javascript-Configuration-Object)
    - [Initialize multiple KatApps](#Initialize-Multiple-KatApps)
    - [Configuring CalcEngines and Input/Result Tabs](#Configuring-CalcEngines-and-InputResult-Tabs)
    - [Using Kaml View's `<rbl-config>` for Configuration](#Using-Kaml-View's-<rbl-config>-for-Configuration)
    - [Multiple CalcEngines and Result Tabs](#Multiple-CalcEngines-and-Result-Tabs)
    - [Configuration Precedence](#Configuration-Precedence)
- [Kaml View Specifications](#Kaml-View-Specifications)
    - [RBLe Attributes used in Kaml View](#RBLe-Attributes-used-in-Kaml-View)
    - [KatApp Selectors](#KatApp-Selectors)
    - [View Scoping](#View-Scoping)
        - [Scoping CSS](#Scoping-CSS)
        - [Scoping IDs](#Scoping-IDs)
        - [Scoping jQuery](#Scoping-jQuery)
    - [rbl-value Attribute Details](#rbl-value-Attribute-Details)
    - [rbl-attr Attribute Details](#rbl-attr-Attribute-Details)
    - [rbl-display Attribute Details](#rbl-display-Attribute-Details)
    - [rbl-disabled Attribute Details](#rbl-disabled-Attribute-Details)
    - [rbl-on Event Handlers](#rbl-on-Event-Handlers)
        - [Assigning Event Handlers to Contained Elements](#Assigning-Event-Handlers-to-Contained-Elements)
        - [Assigning Multiple Event Handlers](#Assigning-Multiple-Event-Handlers)
        - [Removing Event Handlers](#Removing-Event-Handlers)
    - [rbl-navigate Attribute Details](#rbl-navigate-Attribute-Details)
    - [rbl-modal Attribute Details](#rbl-modal-Attribute-Details)
        - [Controlling the Modal KatApp Options](#Controlling-the-Modal-KatApp-Options)
        - [Controlling the Modal UI Options](#Controlling-the-Modal-UI-Options)
    - [rbl-app Attribute Details](#rbl-app-Attribute-Details)
        - [Controlling the Nested KatApp Options](#Controlling-the-Nested-KatApp-Options)
    - [_Push_ Table Processing](#_Push_-Table-Processing)
        - [rbl-defaults Table](#**rbl-defaults**)
        - [rbl-listcontrol Table](#**rbl-listcontrol**)
            - [rbl-listcontrol data source Tables](#**rbl-listcontrol-data-source**)
        - [rbl-sliders Table](#**rbl-sliders**)
        - [rbl-disabled Table](#**rbl-disabled**)
        - [rbl-skip Table](#**rbl-skip**)
        - [errors And warnings Tables](#**errors/warnings**)
        - [rbl-markup Table](#**rbl-markup**)
- [Templates](#Templates)
    - [rbl-source Selectors](#rbl-source-Selectors)
    - [Template Default Attributes](#Template-Default-Attributes)
    - [Template Precedence](#Template-Precedence)
    - [Template Attributes](#Template-Attributes)
    - [Inline Templates](#Inline-Templates)
    - [Empty Templates](#Empty-Templates)
    - [Automatically Processed Templates](#Automatically-Processed-Templates)
        - [ResultBuilder Framework Tables](#ResultBuilder-Framework-Tables)
        - [ResultBuilder Framework Charts](#ResultBuilder-Framework-Charts)
    - [Building Common Controls](#Building-Common-Controls)
        - [Eliminating Browser ID Warnings](#Eliminating-Browser-ID-Warnings)
        - [Creating Table Row/Column Templates](#Creating-Table-Row/Column-Templates)
        - [Example: Creating a slider](#Example-Creating-a-slider)
    - [Standard_Templates.kaml](#Standard_Templates.kaml)
        - [input-textbox](#input-textbox)
        - [input-dropdown](#input-dropdown)
        - [input-checkbox / input-checkbox-simple](#input-checkbox-/-input-checkbox-simple)
        - [input-slider](#input-slider)
        - [input-radiobuttonlist / input-checkboxlist](#input-radiobuttonlist-/-input-checkboxlist)
        - [input-fileupload](#input-fileupload)
        - [validation-summary / validation-warning-summary](#validation-summary-/-validation-warning-summary)
        - [carousel](#carousel)
        - [Additional Template Components](#Additional-Template-Components)
        - [Using Template Type Attribute](#Using-Template-Type-Attribute)
- [View and Template Expressions](#View-and-Template-Expressions)
    - [Simple rbl-display Expression Selector](#Simple-rbl-display-Expression-Selector)
    - [rbl-display v: Template Expression](#rbl-display-v-Template-Expression)
    - [Complex rbl-source Expressions](#Complex-rbl-source-Expressions)
    - [Complex KatApp Selector Expressions](#Complex-KatApp-Selector-Expressions)
- [RBLe Service](#RBLe-Service)
    - [ResultBuilder Framework](#ResultBuilder-Framework)
        - [Table Template Processing](#Table-Template-Processing)
            - [Unique Summary Configuration](#Unique-Summary-Configuration)
            - [Table Nesting Configuration](#Table-Nesting-Configuration)
            - [table-output-control](#table-output-control)
            - [colgroup processing](#colgroup-Processing)
            - [Header Rows](#Header-Rows)
            - [Automatic Column Spanning](#Automatic-Column-Spanning)
            - [Manual Column Spanning](#Manual-Column-Spanning)
            - [Column Widths](#Column-Widths)
        - [Highcharts Template Processing](#Highcharts-Template-Processing)
            - [CalcEngine Table Layouts](#CalcEngine-Table-Layouts)
                - [Highcharts-{rbl-chartoptions}-Options](#Highcharts-{rbl-chartoptions}-Options)
                - [Highcharts-{rbl-chartdata}-Data](#Highcharts-{rbl-chartoptions}-Data)
                - [Highcharts-Overrides](#Highcharts-Overrides)
            - [Custom Chart Options](#Custom-Chart-Options)
            - [Standard Chart Options](#Standard-Chart-Options)
            - [Custom Series Options](#Custom-Series-Options)
            - [Standard Series Options](#Standard-Series-Options)
            - [Property Value Parsing](#Property-Value-Parsing)
            - [Language Support](#Language-Support)
    - [Advanced Configuration](#Advanced-Configuration)
        - [RBLe Service Attributes / Classes](#RBLe-Service-Attributes-/-Classes)
        - [Precalc Pipelines](#Precalc-Pipelines)
- [KatApp API](#KatApp-API)
    - [KatApp Object Properties](#KatApp-Object-Properties)
        - [KatAppOptions Object](#KatAppOptions-Object)
        - [DebugOptions Object](#DebugOptions-Object)
        - [CalcEngine Object](#CalcEngine-Object)
        - [OptionInputs Object](#OptionInputs-Object)
        - [KatAppData Object](#KatAppData-Object)
        - [RelativePathTemplates Object](#RelativePathTemplates-Object)
        - [TabDef Object](#TabDef-Object)
        - [CalculationInputs Object](#CalculationInputs-Object)
        - [CalculationException Object](#CalculationException-Object)
        - [GetDataDelegate Object](#GetDataDelegate-Object)
        - [RegisterDataDelegate Object](#RegisterDataDelegate-Object)
        - [SubmitCalculationDelegate Object](#SubmitCalculationDelegate-Object)
    - [KatApp Methods](#KatApp-Methods)
        - [KatApp Lifecycle Methods](#KatApp-Lifecycle-Methods)
            - [KatApp](#KatApp)
            - [destroy](#destroy)
            - [rebuild](#rebuild)
            - [updateOptions](#updateOptions)
            - [ensure](#ensure)
        - [KatApp Scoping Methods](#KatApp-Scoping-Methods)
            - [select](#select)
            - [closest](#closest)
        - [KatApp Calculation Methods](#KatApp-Calculation-Methods)
            - [calculate](#calculate)
            - [configureUI](#configureUI)
            - [getInputs](#getInputs)
            - [setInputs](#setInputs)
            - [setInput](#setInput)
            - [getResultTable](#getResultTable)
            - [getResultRow](#getResultRow)
            - [getResultValue](#getResultValue)
            - [getResultValueByColumn](#getResultValueByColumn)
            - [pushResultRow](#pushResultRow)
        - [KatApp Advanced Methods](#KatApp-Advanced-Methods)
            - [apiAction](#apiAction)
            - [serverCalculation](#serverCalculation)
            - [setNavigationInputs](#setNavigationInputs)
            - [navigate](#navigate)
            - [pushNotification](#pushNotification)
            - [createModalDialog](#createModalDialog)
        - [KatApp Debugging Methods](#KatApp-Debugging-Methods)
            - [saveCalcEngine](#saveCalcEngine)
            - [refreshCalcEngine](#refreshCalcEngine)
            - [traceCalcEngine](#traceCalcEngine)
    - [KatApp Events](#KatApp-Events)
        - [KatApp Lifecycle Events](#KatApp-Lifecycle-Events)
            - [onInitializing](#onInitializing)
            - [onInitialized](#onInitialized)
            - [onDestroyed](#onDestroyed)
            - [onOptionsUpdated](#onOptionsUpdated)
            - [onKatAppNotification](#onKatAppNotification)
            - [onKatAppNavigate](#onKatAppNavigate)
        - [KatApp Calculation Lifecycle Events](#KatApp-Calculation-Lifecycle-Events)
            - [onCalculateStart](#onCalculateStart)
            - [onRegistration](#onRegistration)
            - [onCalculationOptions](#onCalculationOptions)
            - [onResultsProcessing](#onResultsProcessing)
            - [onConfigureUICalculation](#onConfigureUICalculation)
            - [onCalculation](#onCalculation)
            - [onCalculationErrors](#onCalculationErrors)
            - [jwt-data Updates](#jwt-data-Updates)
            - [onCalculateEnd](#onCalculateEnd)
        - [KatApp Action Lifecycle Events](#KatApp-Action-Lifecycle-Events)
            - [onActionStart](#onActionStart)
            - [onActionResult](#onActionResult)
            - [onActionFailed](#onActionFailed)
            - [onActionComplete](#onActionComplete)
        - [KatApp Upload Lifecycle Events](#KatApp-Upload-Lifecycle-Events)
            - [onUploadStart](#onUploadStart)
            - [onUploaded](#onUploaded)
            - [onUploadFailed](#onUploadFailed)
            - [onUploadComplete](#onUploadComplete)
        - [KatApp Modal Application Lifecycle Events](#KatApp-Modal-Application-Lifecycle-Events)
            - [onConfirm](#onConfirm)
            - [onCancel](#onCancel)
            - [onModalAppInitialized](#onModalAppInitialized)
            - [onModalAppConfirmed](#onModalAppConfirmed)
            - [onModalAppCancelled](#onModalAppCancelled)
            - [onModalAppConfirm](#onModalAppConfirm)
            - [onModalAppCancel](#onModalAppCancel)
            - [Standard KatApp Modal Sample](#Standard-KatApp-Modal-Sample)
            - [Advanced KatApp Modal Sample](#Advanced-KatApp-Modal-Sample)
        - [Template Event Handlers](#Template-Event-Handlers)
    - [Global Methods](#Global-Methods)
        - [static setNavigationInputs](#static-setNavigationInputs)

# Overview
A KatApp is a dynamic html application delivered to a host platform.  Conceptually, its like a CMS, but instead of static content, it provides for dynamic content containing potentially complex business logic and controls and data and results.

See [KatApp Debugging Methods](#KatApp-Debugging-Methods) for the most commonly used methods during the development cycle to aid in obtaining debug CalcEngines, seeing intermediate results/inputs, etc.

See [DebugOptions Object](#DebugOptions-Object) for the most commonly used options (and the query strings that enable them) during the development cycle to configure live or test CalcEngines, Views, or Provider, enabling the KatApp Inspector, etc.

## Definitions

Term | Definition
---|---
KatApp | Dynamic webpage content driven by AJAX, using Kaml Views and RBLe Service
RBLe Service | Rapid Business Logic calcuation service.  Contains all business logic.  Driven by a CalcEngine
CalcEngine | Specialized Excel speadsheet that drives business logic
RBLe Results | Results from RBLe Service
KatApp Plugin | Jquery plugin to enable KatApp's
KatApp element | HTML element that is target for the KatApp.  Example: `<div id="KatApp"></div>`
Host Platform | Web Application hosting the KatApp
Kaml | _KatApp Markup Language_ is a combination of HTML, CSS, and Javascript where the HTML supports attribute decoration to bind elements to CalcEngine results.
Kaml View | Kaml file dynamically used by KatApp.
Kaml View CMS | System for updating Kaml View.
Kaml&nbsp;Template&nbsp;Files | Kaml file containing templates, css, and javascript for generating common markup/controls used in KatApp's
Template | A reuseable piece of a KatApp found in Kaml Template file.
Template Element | The HTML element found inside a Kaml view that is decorated with an attribute indicating that it should be build from an existing Template.

## Required Javscript Files
- bootstrap.js
- jquery.js
- highcharts.js
- KatApp.js

# Initializing and Configuring a KatApp

To run a KatApp, minimally a Kaml View file needs to be provided.  Additional properties like CalcEngine or Templates can be provided as well.  These options can be provided via attributes on the element representing the KatApp or via a configuration object passed on the `.KatApp( {options} )` method.

When specifying a view or template to use, it is always in the format of `folder:kaml-file`.  If `folder` is omitted, this the folder of `GLOBAL` will be used.  The only files typically found in the `GLOBAL` folder are template files (i.e. `Standard_Templates` and `Input_TemplatesBS4`).

## Configuring via KatApp Attributes

```html
<!-- Specify a View only (Simplest/typical implementation) -->
<div id="KatApp-wealth" class="KatApp"
    rbl-view="LAW:WealthDashboard">
</div>

<!-- Specify a View and CalcEngine -->
<div id="KatApp-wealth" class="KatApp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE">
</div>

<!-- Specify a View, CalcEngine, and Templates -->
<div id="KatApp-wealth" class="KatApp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE"
    rbl-view-templates="Standard_Templates,LAW:Law_Templates">
</div>
```
```javascript
// Javascript - In all cases above, initalize the KatApp with following
$("#KatApp-wealth").KatApp();
```

## Configuring via Javascript Configuration Object

```html
<!-- In all case, simply have div representing KatApp with configuration provided in Javascript -->
<div id="KatApp-wealth" class="KatApp"></div>
```
```javascript
// Specify a View only
$("#KatApp-wealth").KatApp({
    view: "LAW:WealthDashboard"
});

// Specify a View and CalcEngine
$("#KatApp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    calcEngines: [
        { name: "LAW_Wealth_CE" }
    ]
});

// Specify a View, CalcEngine, and Templates
$("#KatApp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { name: "LAW_Wealth_CE" }
    ]
});
```

## Initialize Multiple KatApps
Since the KatApp's are triggered via a JQuery plugin using the selector, it is possible to initialize multiple KatApp's with one Javascript call.  To accomplish this, a single, common `class` could be used.

```html
<!-- three KatApp's on the same page -->
<div id="KatApp-wealth" class="KatApp" rbl-view="LAW:WealthDashboard"></div>
<div id="KatApp-health" class="KatApp" rbl-view="LAW:HealthDashboard"></div>
<div id="KatApp-feature" class="KatApp" rbl-view="LAW:FeatureView"></div>
```
```javascript
// Single javascript call to initialize
$("KatApp").KatApp();
```

## Configuring CalcEngines and Input/Result Tabs

As seen above, CalcEngines can be provided via KatApp element attributes or via Javascript options.  Along with the CalcEngine to use, an input tab and result tabs can be configured.

```html
<!-- Specify CalcEngine Tabs, note that rbl-result-tab is comma delimitted list of tabs -->
<div id="KatApp-wealth" class="KatApp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE"
    rbl-input-tab="RBLInput"
    rbl-result-tab="RBLResult"
    rbl-view-templates="Standard_Templates,LAW:Law_Templates">
</div>
```
```javascript
// Specify CalcEngine Tabs, note that resultTabs is an array of tabs
$("#KatApp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { name: "LAW_Wealth_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult" ] }
    ]
});
```

## Using Kaml View's `<rbl-config>` for Configuration

There is a third and final way to configure CalcEngine information.  This is the most common use case as it keeps the KatApp markup and Javascript in the hosting client the simplest and is easist to implement.  Inside each Kaml View file is a required `<rbl-config>` element.  The first element in any Kaml View file should be the `<rbl-config>` element.

```html
<rbl-config 
    calcengine="LAW_Wealth_CE"
    calcengine-key="default"
    input-tab="RBLInput"
    result-tabs="RBLResult"
    input-caching="true"
    templates="Standard_Templates,LAW:Law_Templates"></rbl-config>
```

## Multiple CalcEngines and Result Tabs

KatApp's are capable of leveraging multiple CalcEngine inside a single Kaml View file.  You can pass these in using two of the described mechanisms above.  Multiple CalcEngines can be configured only by a Javascript configuration object or via the `<rbl-config>` element.

When multiple CalcEngines or result tabs are used, additional information is required to pick the appropriate results.  See [KatApp Selectors](#KatApp-Selectors) for more information describing `rbl-ce` and `rbl-tab`.  

**Important** - Whenever multiple CalcEngines are used, you must provide a 'key' value minimally on CalcEngines 2...N, but ideally on all of them.  Note that the first CalcEngine has a key value of `default` if not provided.

```html
<!-- Multiple CalcEngines via rbl-config -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult"></calc-engine>
    <calc-engine key="shared" name="LAW_Shared_CE" input-tab="RBLInput" result-tabs="RBLResult,RBLHelpers"></calc-engine>
</rbl-config>
```
```javascript
// Multiple CalcEngines via Javascript
$("#KatApp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { key: "default", name: "LAW_Wealth_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult" ] },
        { key: "shared", name: "LAW_Shared_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult", "RBLHelpers" ] }
    ]
});
```

## Configuration Precedence

In addition to the the three methods of configuration described above, there is one more mechanism.  There is a global `KatApp.defaultOptions` object.  It has all the same properties as the normal Javascript configuration option passed in on that `.KatApp( options )` method.  See [KatAppOptions Object](#KatAppOptions-Object) for more information.

The configuration precedence is as follows (1 being the highest)

1. Javascript configuration object
2. KatApp element attributes
3. KatApp.defaultOptions configuration object
4. `<rbl-config>` attributes

# Kaml View Specifications

Kaml View files are essentially HTML markup files with the addition of KatApp functionality.  This additional functionality is called the _K_at_A_pp _M_arkup _L_anguage. These files are managed in Kaml View CMS and provide all the functionality of the rendered KatApp.  Features included are template processing and CalcEngine integration via attribute decorations.

Every view must have a `<rbl-config>` element as the first element of the file.

```html
<rbl-config calcengine="LAW_Wealth_CE" templates="Standard_Templates,LAW:Law_Templates"></rbl-config>
```

## RBLe Attributes Used in Kaml View
When building Kaml Views, dynamic content and visiblity is managed via the following attributes placed on any valid Html element.

Attribute | Description
---|---
rbl-value | Inserts a value from RBLe Service.  See [rbl-value Attribute Details](#rbl-value-Attribute-Details).
rbl-ce | If multiple CalcEngines are used, can provide a `key` to a CE to indicate which CalcEngine to pull value from.
rbl-tab | If multiple tabs are returned from a CalcEngine, can provide a name which tab to pull value from.
rbl-display | Reference to boolean RBLe result data that toggles display style (uses `jQuery.show()` and `jQuery.hide()` ).  See [rbl-display Attribute Details](#rbl-display-Attribute-Details).
rbl-attr | Update HTML attribute values with combining the syntax of `rbl-value`, `rbl-ce`, and `rbl-tab`.  See [rbl-attr Attribute Details](#rbl-attr-Attribute-Details).
rbl-tid | Indicates what RBL template to apply to the given source rows.  Results from template and data replace element content.
rbl-source<br/>rbl&#x2011;source&#x2011;table | Indicates row(s) from an RBLe result table used to process a template.  Pairs with `rbl-tid`<br/>&nbsp;.  See [rbl-source Selectors](#rbl-source-Selectors).
rbl-on | Attached Javascript event handlers to DOM elements.  See [rbl-on Event Handlers](#rbl-on-Event-Handlers).

<br/>

Note: `<rbl-config calcengine-key=""/>` is optional (and `default` is the default key) and would be used when a CalcEngine is a used as both a primary and a secondary (Multiple) CalcEngine are the results are shared across markup templates.  For example, if a Sample_Shared CalcEngine was used as a secondary CalcEngine with a key of `Shared`, the template would have to specify `rbl-ce="Shared"` as a source to a Selector Path.  When Sample_Shared is the single/primary CalcEngine used in a Kaml view, its key would be `default`.  When the same markup template is used, the `rbl-ce="Shared"` source would result in no matches.  To correct this, use `<rbl-config calcengine="Sample_Shared" calcengine-key="Shared"/>`.

## KatApp Selectors
KatApp selectors are the syntax used to specify how to pull data from CalcEngines.  They are used in `rbl-value`, `rbl-display`, and `rbl-attr` attribute processing.  Using selectors can be used in conjunction with `rbl-ce` and `rbl-tab`.

Selector&nbsp;Path | Description
---|---
idValue | Look in `rbl-value` table for row where row id is `idValue` and return the value column.
table.idValue | Look in `table` table for row where row id is `idValue` and return the value column.
table.idValue.column | Look in `table` table for row where row id is `idValue` and return the `column` column.
table.keyColumn.keyValue.column | Look in `table` table for row where `keyColumn` is `keyValue` and return the `column` column.

## View Scoping

It is very important to keep Kaml View encapsulated as an isolated environment, or sandbox if you will. **The KatApp framework ensures that all input and calculation result processing are isolated to the KatApp/Kaml View.**  In the same manner, there are ways to ensure proper scoping your markup and javascript so that Kaml Views do not interfere with containing web sites.

### Scoping CSS

In Kaml Views, if you include a `<style>` section to define some CSS for the view, make sure you prefix every class selector with `.thisClass`.

Additional CSS scoping has to be considered when creating Template Kaml Files.  The `.katapp-css` class will always be applied to KatApp application elements.  So that is the way to provide some scoping inside template files (or Kaml Views too, although `.thisClass` is preferred).

So the CSS priority would be:

1. `.katapp-css`
2. `.thisClass`

```html
<style>
    /* Without scoping would affect all h2 elements on rendered page even if not part of this Kaml View */
    h2 {
        font-size: 24px;
    }

    /* Do use .katapp-css */
    .katapp-css h2 {
        color: Green;
        font-size: 30px;
    }

    /* Do use .thisClass */
    .thisClass h2 {
        color: Red;
    }

    /* The end result would be color: Red, size 30px */
</style>

<h2>Hello</h2>
```

### Scoping IDs

When creating HTML elements inside the Kaml View that needs the `id` attribute provided, ID scoping must be used.  A name cannot be guaranteed to be unique with out.  To guarantee a unique ID for elements, you need to append or prepend the unique KatApp ID.  This is done with the `{id}` token. 

```html
<!-- nav-list can not be guaranteed unique, the containing application (or other hosted KatApps may use the same id) -->
<div id="nav-list">
    <!-- ... -->
</div>


<div id="nav-list_{id}">
    <!-- ... -->
</div>
```

### Scoping jQuery

When `<script>` tags are included in Kaml View files, the correct way to obtain the KatApp element is by using this `{thisView}` token.  `{thisView}` is substituted with a jQuery selector like `[rbl-application-id='{id}']` where `{id}` is the unique KatApp ID.

```html
<script>
(function () {
    
    // Obtain a reference of the KatApp element.
    var view = $("{thisView}");
    var application = view.KatApp();
})();
</script>
```

Then, inside any `<script>` elements in a Kaml View, any time selection is needed, you need to scope it to the KatApp element.  To do this, use the `application.select()` and `application.closest()` methods instead of the jQuery counterparts of `$()` or `$().closest()`.  This is also required to ensure proper selected for [nested KatApps](#rbl-app-Attribute-Details) as well.

```html
<script>
view.on("onInitialized.RBLe", function (event, application) {
    application.select("[data-reset-confirmed='true']").on("click", function (e) {
        e.preventDefault();
        application.select(".iDirection").val(-1);
    })
});
</script>
```

See [KatApp Scoping Methods](#KatApp-Scoping-Methods) for more details or [KatApp Events](#KatApp-Events) for more usage examples where scoping is required.

## rbl-value Attribute Details
There are two ways to use `rbl-value` attribute.  You can provide simply an 'id' that will look inside the `rbl-value` table or you can provide a KatApp Selector.  Both mechanisms can be used in conjunction with `rbl-ce` and `rbl-tab`.

```html
<!-- Table: rbl-value, ID: ret-age, Column: value -->
<span rbl-value="ret-age"></span>

<!-- Table: benefit-savings, ID: ret-age, Column: value -->
<span rbl-value="benefit-savings.ret-age"></span>

<!-- Table: benefit-savings, ID: ret-age, Column: year -->
<span rbl-value="benefit-savings.ret-age.year"></span>

<!-- 
CalcEngine:default, Tab: RBLRetire
Table: rbl-value, ID: ret-age, Column: value
-->
<span rbl-tab="RBLRetire" rbl-value="ret-age"></span>

<!-- 
CalcEngine: 'Shared' (key=Shared), Tab: first/default
Table: rbl-value, ID: ret-age, Column: value
-->
<span rbl-ce="Shared" rbl-value="ret-age"></span>

<!-- 
CalcEngine: 'Shared' (key=Shared), Tab: RBLRetire
Table: rbl-value, ID: ret-age, Column: value
-->
<span rbl-ce="Shared" rbl-tab="RBLRetire" rbl-value="ret-age"></span>
```

See [View and Template Expressions](#View-and-Template-Expressions) for information on how to use simple and complex expressions when selecting and processing `rbl-value` attributes.

## rbl-attr Attribute Details
Similar to `rbl-value`, attributes can be assigned using selector paths.  However, since only *one* `rbl-attr` attribute is ever present on any HTML DOM element, the syntax is slightly different.  Multiple attributes can be set via a `SPACE` delimitted list.  Optionally, the CalcEngine and TabDef names can be provided if needed.

The syntax for each attribute you wish to set is controlled by a `:` delimitted list:  `attributeName:selectorPath:calcEngineName:tabDefName`.  `calcEngineName` and `tabDefName` are optional.

If the `rbl-attr` selector path returns a value on subsequent calculations, the previously assigned value with be replaced with the new value.

```html
<!-- Set the 'data-path' attribute to the 'value' column from 'rbl-value' table where 'id' is 'apiNextPagePath' -->
<a rbl-attr="data-path:apiNextPagePath">Next Page</a>

<!-- 
1. Set HTML of this anchor to the 'value' column from 'rbl-value' table where 'id' is 'electionButton' 
2. Set the 'data-action' attribute to the 'value' column from 'rbl-value' table where 'id' is 'election-action' 
3. Set the 'data-confirm' attribute to the 'value' column from 'rbl-value' table where 'id' is 'election-confirm' 
-->
<a rbl-attr="data-action:election-action data-confirm:election-confirm" rbl-value="electionButton"></a>

<!-- 
Attribute: data-action
CalcEngine: 'Shared' (key=Shared), Tab: first/default
Selector: Table: rbl-value, ID: election-action, Column: value
-->
<a rbl-attr="data-action:election-action:Shared">Make Election</a>

<!-- 
Attribute: data-action
CalcEngine: 'Shared' (key=Shared), Tab: RBLRetire
Selector: Table: rbl-value, ID: election-action, Column: value

Attribute: data-confirm
CalcEngine: default, Tab: first/default
Selector: Table: rbl-value, ID: election-confirm, Column: value
-->
<a rbl-attr="data-action:election-action:Shared:RBLRetire data-confirm:election-confirm">Make Election</a>
```

## rbl-display Attribute Details
The `rbl-display` attribute has all the same 'selector' capabilities described in [KatApp Selectors](#KatApp-Selectors).  Once a `value` is selected from a specified selector (or `rbl-display` as default table if only ID is provided), a boolean 'falsey' logic is applied against the value.  An element will be hidden if the value is `0`, `false` or an empty string.

```html
<!-- Show or hide based on 'value' column from 'rbl-display' table where 'id' is 'show-wealth' -->
<div rbl-display="show-wealth">Wealth Information</div>

<!-- Show or hide based on 'value' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<span rbl-display="benefit-savings.ret-age"></span>

<!-- Show or hide based on 'year' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<span rbl-display="benefit-savings.ret-age.year"></span>
```

See [View and Template Expressions](#View-and-Template-Expressions) for information on how to use simple and complex expressions to determine visibility.

## rbl-disabled Attribute Details
The `rbl-disabled` attribute has all the same 'selector' capabilities described in [KatApp Selectors](#KatApp-Selectors).  Once a `value` is selected from a specified selector (or `rbl-disabled` as default table if only ID is provided), a boolean 'falsey' logic is applied against the value.  An element will be disabled if the value is `1` or `true`.

**Note:** By default, all the template inputs provided by Standard_Templates.kaml have `rbl-disabled` attributes assigned to appropriate items.

```html
<!-- Disable or enable based on 'value' column from 'rbl-disabled' table where 'id' is 'show-wealth' -->
<input rbl-disabled="show-wealth" value="10000">

<!-- Disable or enable based on 'value' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<input rbl-disabled="benefit-savings.ret-age" value="65">

<!-- Disable or enable based on 'year' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<input rbl-disabled="benefit-savings.ret-age.year" value="2020">
```

See [View and Template Expressions](#View-and-Template-Expressions) for information on how to use simple and complex expressions to determine disabled state.

**Note:** When working with inputs, check/radio lists, or sliders, the jQuery `.prop("disabled", true)` method is used.  For anything else (i.e. bootstrap buttons or generic divs), the `disabled` class is added/removed as necessary.

## rbl-on Event Handlers

Event handlers on HTML DOM elements inside Kaml Views can be attached using two mechanisms.  Developers can use jQuery `on(eventName, function() {})` syntax at the appropriate time in KatApp calculation life cycle with the understanding of when the markup, after result and template processing, will be in the correct state for jQuery DOM Selectors to find the desired HTML DOM elements (see [KatApp Lifecycle Events](#KatApp-Lifecycle-Events) or [KatApp Calculation Lifecycle Events](#KatApp-Calculation-Lifecycle-Events)) or simply use the `rbl-on` attribute in Kaml markup and let the framework attach the events at the appropriate time.  

Using `rbl-on` will attach the event correctly regardless of when the element is rendered (i.e. if the element is inside a template).  This makes using the `rbl-on` attribute the preferred mechanism for attaching events the vast majority of the time.  In some complex situations, like conditionally attaching events based on UI state or calculation results may require attaching events via the jQuery `on` method.

To use the `rbl-on` method for attaching events, the KatApp options must have the `handlers` object set with all the handlers assigned in markup.  This can be done by setting the property of the options object passed during the initial `$(".katapp").KatApp( configuration );` call, however, more commonly it is done by using the [updateOptions](#updateOptions) method inside the Kaml View.

```javascript
// Javascript - Sample of javascript inside Kaml View to correctly use rbl-on handlers.

var view = $("thisClass");
var application = view.KatApp();

application.updateOptions(
	{
		handlers: {
            foo: function() { /* do something */ },
            baz: function() { /* do something else */ }
        }
    }
);

// Additional code as needed...
view.on("onInitialized.RBLe", function () {
    // Code to run after Kaml View has been initialized...
});
```

```html
<!-- Assigning foo/baz in markup -->
<p>Please use <a href="#" rbl-on="click:foo">foo</a> or <a href="#" rbl-on="click:baz">baz</a>.</p>
```

### Assigning Event Handlers to Contained Elements

There are two scenarios when handlers are assigned to elements contained *inside* the element with the `rbl-on` attribute.  In these cases, the handlers are not attached to the element with the `rbl-on`, but rather are attached to items (via a jQuery selector) contained inside the element - which in some cases, are elements generated during template processing.  The two scenarios are as follows:

1. Event handlers that are assigned to elements that are created via templates (i.e. have a `rbl-tid=` attribute)
2. Event handlers that are intended for multiple/many elements inside a parent container (i.e. to reduce the need to repeating the same `rbl-on=` syntax on each of the intended targets)

In the first scenario, for handlers assigned to elements that also have a `rbl-tid` attribute.  All of the *standard template items* will automatically select the correct item to attach the event to (i.e. the generated *input* element).  The following list is the default behavior for attaching events:

- `rbl-tid="input-textbox"` or `rbl-template-type="katapp-textbox"` - The item selected matches the `:input` selector
- `rbl-tid="input-checkbox"`, `rbl-tid="input-checkbox-simple"`, or `rbl-template-type="katapp-checkbox"` - The item selected matches the `:input` selector
- `rbl-tid="input-dropdown"` or `rbl-template-type="katapp-dropdown"` - The item selected matches the `select.form-control` selector
- `rbl-tid="input-slider"` or `rbl-template-type="katapp-slider"` - The item selected matches the `div[data-slider-type='nouislider']` selector
- `rbl-tid="input-checkboxlist"` or `rbl-template-type="katapp-checkboxlist"` - The item selected matches the `:input` selector
- `rbl-tid="input-radiobuttonlist"` or `rbl-template-type="katapp-radiobuttonlist"` - The item selected matches the `:input` selector
- `rbl-tid="input-fileupload"` or `rbl-template-type="katapp-upload"` - The item selected matches the `input[type='file']` selector

To override this default selector, and the required way to specify the selector for the second scenario above, a third part of the `:` delimitted `rbl-on` value can be used.

```html
<!-- Assigning handleResource to each a element inside the ul -->
<p>Please use one of the following:</p>
<ul rbl-on="click:handleResource:a">
    <li><a href="#">Resource 1</a></li>
    <li><a href="#">Resource 2</a></li>
    <li><a href="#">Resource 3</a></li>
</ul>

<!-- Assigning handleResource to each a element inside the ul that does not have target attribute -->
<p>Please use one of the following:</p>
<ul rbl-on="click:handleResource:a:not([target])">
    <li><a href="#">Resource 1</a></li>
    <li><a href="#">Resource 2</a></li>
    <li><a target="_blank" href="www.google.com">Google [no rbl-on]</a></li>
</ul>

<!-- Assigning showDate to an element with data-type='year' attribute assigned -->
<div rbl-tid="custom-date-input" rbl-template-type="katapp-textbox" rbl-on="change:showDate:input[data-type='year']"></div>
```
### Assigning Multiple Event Handlers

You can assign multiple event handlers to the same element by `|` delimitting the list of handlers.

```html
<!-- 
    Assigning 'activateRecalc' to all inputs (date/text) AND sliders contained inside div.inputsContainer.

    This is assigned to a 'change' event, but take note for sliders, you need to use the `set` event.
-->
<div class="inputsContainer" rbl-on="change:activateRecalc:input|set:activateRecalc:div.slider-control"></div>


<!-- 
    Assigning checkYear to an element with data-type='year' attribute assigned when input changes
    Assigning checkMonth to an element with data-type='month' attribute assigned when input changes
-->
<div rbl-tid="custom-date-input" rbl-template-type="katapp-textbox" rbl-on="change:checkYear:input[data-type='year']|change:checkMonth:input[data-type='month']"></div>

<!-- 
    Assigning checkYear to an element with data-type='year' attribute assigned  when input changes
    Assigning displayDate to all input elements when they lose focus
-->
<div rbl-tid="custom-date-input" rbl-template-type="katapp-textbox" rbl-on="change:checkYear:input[data-type='year']|blur:displayDate::input"></div>
```

Similarily, an element can have multiple handlers assigned if `rbl-on` is supplied both on the element itself and on a parent element that selects the same element.

```html
<!--
    For *all* a elements, call the handleResource method.
    Additionaly, for Resource 3, call the customResourceHandler message as well.
-->
<ul rbl-on="click:handleResource:a">
    <li><a href="#">Resource 1</a></li>
    <li><a href="#">Resource 2</a></li>
    <li><a href="#" rbl-on="click:customResourceHandler">Resource 3</a></li>
</ul>
```
### Removing Event Handlers

Events bound with the `rbl-on` attribute are bound with a `.ka` namespace.  Therefore, at any point in the application lifecycle, events can be removed specifically, or generically with the namespace.

```javascript
// Remove the customResourceHandler event handler from all a elements (in example above, only one item has this handler)
$("ul[rbl-on='click:handleResource:a'] a").off("customResourceHandler.ka");

// Remove all rbl-on event handlers from all a elements (in example above, three handleResource handlers and one customResourceHandler handler)
$("ul[rbl-on='click:handleResource:a'] a").off(".ka");
```

## rbl-navigate Attribute Details
The `rbl-navigate` value can be used to enable navigate to different KatApps (which are typically different pages).  Different frameworks (i.e. Evolution vs Camelot) have different mechanisms for navigation that can be controlled via event handlers.  See [onKatAppNavigate](#onKatAppNavigate) for more information.

```html
Click <a rbl-navigate="DB.Home">here</a> to see your Defined Benefit Portal.
```

**Passing Default Inputs to the Next KatApp**
If you need to pass inputs to the KatApp that is being navigated to assign defaults, the `rbl-navigate-input-selector` attribute can be used.  Any input that matches the JQuery selector provided will be pass to the next KatApp to be used as default inputs, similar to the `defaultInputs` property of the [KatAppOptions Object](#KatAppOptions-Object).

By default, inputs passed during navigation are persisted to `Storage` indefinitely.  If you want inputs to be flagged as one-time use, add the `rbl-navigate-persist-inputs="false"` attribute.

```html
Click <a rbl-navigate="Benefits.HPF" rbl-navigate-input-selector=".iProviderTypeIds">here</a> to find a Benefit Provider.
```

In addition to rbl-navigate-input-selector, `data-input-*` attributes can be used, similar to [apiAction](#apiAction) attributes, to pass custom values.

```html
<!--
    Create a default input of iProviderTypeIds="ABC,XYZ"
-->
Click <a rbl-navigate="Benefits.HPF" data-input-provider-type-ids="ABC,XYZ">here</a> to find a Benefit Provider.
```

## rbl-modal Attribute Details
The `rbl-modal` attribute can be used to launch an independent KatApp application inside of a modal popup.  

```html
Click <a rbl-modal="Channel.Home">here</a> to see your dashboard.
```

See [KatApp Modal Application Lifecycle Events](#KatApp-Modal-Application-Lifecycle-Events) to see how to handle confirmation or cancellation of modal KatApps and how to handle unexpected exceptions.

The application 'ID' specified in this attribute will always be verified via an endpoint in the hosting application: `api/rble/verify-katapp?applicationId=`.  This endpoint should return a payload of:

```javascript
{
    path: "relative path to kaml view",
    manualInputs: { // optional, but can provide default inputs as needed
        iInputA: "value",
        iInputB: "value"
    }
}
```

### Controlling the Modal KatApp Options

By default, the containing KatApp options are the starting point (see [KatAppOptions Object](#KatAppOptions-Object) for more information) with only the following properties overwritten: `view`, `currentPage`, `inputSelector`, `calcEngines`, `manualInputs`.

A manual input of `iModalApplication=1` is always injected, however more inputs can be specified in markup via the `data-input-*` attribute described below.

Option&nbsp;Attribute | Description
---|---
rbl&#x2011;action&#x2011;calculate | (boolean) Determines if an `application.calculate()` should be called upon modal application confirmation (default is `false`).
rbl&#x2011;input&#x2011;selector | Set the default input selector on the modal application (default is `input, textarea, select`).
rbl&#x2011;action&#x2011;continue | If the default modal continue button should execute an 'action link' when clicked, provide the endpoint here (default is blank).
 data&#x2011;input&#x2011;* | Passed as the `manualInputs` to the modal application.  (i.e. to pass `iDependentId=1`, use `data-input-dependent-id="1"`.  The 'input name' will be created automatically to match RBLe CalcEngine input name pattern)

When a `rbl-modal` is launched, it uses the same options of its parent application except for `view`, `currentPage`, `inputSelector`, calcEngines`, and `manualInputs`. If you need to control more options, you can use the [updateOptions](#updateOptions) method inside the Kaml script.

```javascript
(function () {
    var view = $("{thisView}");
    var application = view.KatApp();

    application.updateOptions(
        {
            // Settings you wish to update
        }
    );
})();
```

### Controlling the Modal UI Options

By default, the following markup will be injected into the DOM to host the KatApp:

```html
<div class="katapp-modal"> <!-- This is actual KatApp -->
    <div class="modal fade katappModalAppDialog" tabindex="-1" role="dialog" bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{Modal Title}</h5>
                    <button type="button" class="btn-close" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    {View Contents Hosted Here}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default cancelButton" aria-hidden="true">{Cancel Label}</button>
                    <button type="button" class="btn btn-primary continueButton">{Continue Label}</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

UI&nbsp;Attribute | Description
---|---
rbl&#x2011;label&#x2011;title | Change the title of the modal dialog (default is no title and header is hidden).  If you want to have no title *and* header is shown simply with an `X` button to close the dialog, use `rbl-label-title=''`.
rbl&#x2011;label&#x2011;continue | Change the text of the continue button (default is Continue).
rbl&#x2011;label&#x2011;cancel | Change the text of the cancel button (default is Cancel).
rbl&#x2011;show&#x2011;cancel | (boolean) Whether or not to show the cancel button (default is `true`).
rbl&#x2011;modal&#x2011;size | Change the size of the modal via [Bootstrap sizes](#https://getbootstrap.com/docs/5.1/components/modal/#optional-sizes): `sm`, `md` (same `None` in Bootstrap documentation), `lg`, `xl` (default is `xl`).

```html
Click <a rbl-modal="Channel.Home" 
        rbl-label-title="Your Dashboard" 
        rbl-label-continue="Close" 
        rbl-show-cancel="false" 
        rbl-modal-size="md">here</a> to see your dashboard.
```

## rbl-app Attribute Details
The `rbl-app` attribute can be used to nest an independent KatApp application inline within a parent KatApp.

```html
<p>Below is our nested KatApp</p>
<div rbl-app="Channel.Home"></div>
```

The application 'ID' specified in this attribute will always be verified via an endpoint in the hosting application: `api/rble/verify-katapp?applicationId=`.  This endpoint should return a payload of:

```javascript
{
    path: "relative path to kaml view",
    manualInputs: { // optional, but can provide default inputs as needed
        iInputA: "value",
        iInputB: "value"
    }
}
```

**Note**: It is important to use `application.select()` to ensure that parent KatApps do not cross into the boundary of a nested KatApp.  See [View Scoping - Scoping jQuery](#Scoping-jQuery) for more information.

**Caveat**: If a parent of a `rbl-app` has a `rbl-nocalc` class applied, currently this does carry into the inline application and will be applied to all inputs in both applications.  To fix this would require extra processing.  Instead of jQuery selector, I would first have to return all inputs then loop them checking if the containing application is the appropriate application that is doing the selecting.

### Controlling the Nested KatApp Options

Attribute | Description
---|---
data&#x2011;input&#x2011;* | Passed as the `manualInputs` to the nested application.  (i.e. to pass `iDependentId=1`, use `data-input-dependent-id="1"`.  The 'input name' will be created automatically to match RBLe CalcEngine input name pattern)

When a `rbl-app` is launched, it uses the same options of its parent application except for `view`, `currentPage`, `inputSelector`, calcEngines`, and `manualInputs`. If you need to control more options, you can use the [updateOptions](#updateOptions) method inside the Kaml script.

```javascript
(function () {
    var view = $("{thisView}");
    var application = view.KatApp();

    application.updateOptions(
        {
            // Settings you wish to update
        }
    );
})();
```

## _Push_ Table Processing

Even though it is preferrable to have _pull_ over _push_ for content and visibility, there are still some tables that either require push processing or are much better suited for a _push_ pattern.  In these cases, the source tables in the CalcEngines are usually very focused; only turned on during the initial configuration calculation and/or have a very limited number of rows.  By paying attention to the processing scope of these tables (only returning information when needed and minimizing the rows), you can ensure that Kaml Views remain performant.

### **rbl-defaults**
Set input values for any input on Kaml View.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
value | The value to set.  

Input&nbsp;Type | Description
---|---
Checkbox List | `value` should be a `,` delimitted list of values that match the `key` of each list item to be checked.  When processed, all items will be unchecked first.
Radio Button List | `value` matches the radio item to be selected (all others will be unselected).
Checkbox | `value` is `1` or `0`.  If `1`, the input will be checked.
Dropdown | If the dropdown is single select, `value` matches the item to be selected (all others will be unselected).  if the dropdown is _multi-select_, `value` should be a `^` delimitted list of values that match the `key` of each item to be selected.
Slider | `value` should be a numerical value within the configured `min` and `max`.
Text | `value` is simply applied.

<br/>

### **rbl-listcontrol** 
Find and populate 'list' controls (dropdown, radio button list, or checkbox list) that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
table | The name of the data source table that provides the list items for the control specified by id. 

<br/>

#### **rbl-listcontrol data source** 
Typically, `rbl-listcontrol` and its data tables are only returned during a configuration calculation to initialize the user interface.  However, if the list control items are dynamic based on employee data or other inputs, the typical pattern is to return all list items possible for all situations during the configuration calculation, and then use the `visible` column to show and hide which items to show.  During subsequent calculations, when items are simply changing visibility, for performance enhancements, the only rows returned in the data source table should be the rows that have dynamic visiblity.

Column | Description
---|---
key | The data value for current list item (i.e. MN for Minnesota). 
text<br/>&nbsp; | The display text for the current list item.<br/>For **dropdown** controls, if text is `/data-divider` a bootstrap enabled select input is able to simple render a divider bar.
rebuild | If `rebuild` is `1` all current list items will be cleared and the control will be rebuilt from provided items.
visible | If `visible` is `0`, the list item is hidden<sup>1</sup>, otherwise it is shown.
disabled | If `disabled` is `1`, the list item is disabled<sup>1</sup>, otherwise it is enabled.
help | For _radio button and checkbox lists_, if `help` is provided, a help icon and popup text will be generated.
class<sup>2</sup> | Class to be applied to the option element of a bootstrap enabled select input.
html<sup>2</sup> | Custom Html to use instead of the `text` value.
subtext<sup>2</sup> | Add subtext to an option.

<sup>1</sup> When hiding and disabling list items, ensure that you perform validation in the CalcEngine during any save events to ensure invalid values were not maliciously sent.  
<sup>2</sup> For a bootstrap enabled dropdown inputs, additional properties can be applied to create an enhanced UI experience.  See [noUiSlider Samples](https://developer.snapappointments.com/bootstrap-select/examples/) for documentation on `class`, `html`, and `subtext`.

<br/>

### **rbl-sliders** 
Find and configure slider inputs that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the slider in your Kaml View (i.e. iRetAge).
min | The minimum value allowed.
max | The maximum value allowed.
default<sup>1</sup> | The default value to assign.
step | The change interval to use.
format<sup>2</sup><br/>decimals | Whether to display the as percent or number (`p` or `n`).<br/>The number decimal places to display.
pips&#x2011;mode<sup>3</sup> | When generating points along the slider, this determines where to place the pips (`range`, `steps`, `positions`, `count` or `values`).
pips&#x2011;values | When `pips-mode` is `values`, you can provide a comma delimitted list of values for the large pip values.  Default is 0, 25, 50, 75, 100.
pips&#x2011;density | Pre-scale the number of pips.  The `pips-density` value controls how many pips are placed on one percent of the slider range. With the default value of 1, there is one pip per percent. For a value of 2, a pip is placed for every 2 percent. A value below one will place more than one pip per percentage.

<sup>1</sup> Default value has a few ways to be assigned and the precedence is as follows:
1. The default selector path of `rbl-defaults.{id}.value`.
2. The `default` column in the `rbl-slider` row.
3. The current value of the hidden slider html input (if set directly via markup).
4. The `min` column in the `rbl-slider` row.

<sup>2</sup> The slider value is displayed in the element that has a CSS class of `sv{id}`.  
<sup>3</sup> See [API documentation](https://refreshless.com/nouislider/pips/) for documentation on using `pips-*` values.

<br/>

### **rbl-disabled**
Find and enable or disable inputs that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
value | Whether or not to enable or disable the input.  If `value` is `1`, the input will be disabled, otherwise enabled.

<br/>

### **rbl-skip**
Find and prevent inputs in Kaml View from triggering a calculation upon change.  This table is legacy support that is equivalent to `rbl-nocalc` (see [RBLe Service Attributes / Classes](#RBLe-Service-Attributes-/-Classes)) and can only be used to _prevent an input from triggering a calculation_.  You can not use it to turn calculations back on for an input.  This table allows for the business logic of knowing which inputs trigger a calculation and which do not to be left inside the CalcEngine.  Using this table has the same effect as applying attributes manually in the Kaml View.

Column | Description
---|---
id<br/>key&nbsp;(legacy) | The name of the input in your Kaml View (i.e. iMaritalStatus) to disable triggering a calculation. 
value | Whether or not to disable the input.  `1` will diable, otherwise enable.

<br/>

### **errors/warnings**
Errors and warnings are returned from CalcEngine when invalid inputs are sent to the CalcEngine.

Column | Description
---|---
id | The name of the input with a validation error.  `id` is optional.  If provided, the input will be highlighted in the UI to indicate an error.
text | The error message to display in the validation summary.  If `id` is provided, the highlighted input will have an error icon that displays a popup of the error message.

<br/>

### **rbl-markup**
This table is an evolution of the `rbl-value` table in the fact that is allows you to inject content into a Kaml View.  It also has ability to manage CSS class state for elements.

Column | Description
---|---
selector | Any valid jQuery selector to use to find element(s).
html | The html to inject.  If `html` starts with `&` it is appended to existing html of the matched element, otherwise the element's content is replaced with html.<br/><br/>Additionally, `html` can be in the form of `<div rbl-tid="templateId" data-value1="templatevalue1"></div>` (See [Templates](#Templates) for more detail).  If it is a template, it will be 'templated' before injecting into the html.
addClass<sup>1</sup> | A `space` delimitted list of CSS class names to add to the matched element.
removeClass<sup>1</sup> | A `space` delimitted list of CSS clsas names to remove from the matched element.

<sup>1</sup> `addClass` and `removeClass` are processed after all html content creation is finished so that selectors can be apply to the dynamically created html.

# Templates

Templates are a powerful tool in KatApp Views.  Templates are a small markup snippet that are combined with a data object to render content.

The data object can come from static `data-*` attributes, a RBLe Service result row, or the merged result of both.  To use RBLe Service result rows, the `rbl-source` attribute is required and the selector path is defined as follows.

## rbl-source Selectors

`rbl-source` selectors are very similar to [KatApp Selectors](#KatApp-Selectors).  However, with `rbl-source` elements, you must *always* specify a table, and the most common pattern is to process all rows in a table.  However, the selector is specified, the specified template will be applied to the resulting row(s) and injected into the Kaml View.

Selector | Description
---|---
table | Will process all rows from `table`.
table.idValue | Will only process the row from `table` where the row id equals `idValue`.
table.keyColumn.keyValue | Will only process rows from `table` where the value of `keyColumn` equals `keyValue`.

If both `rbl-source` and `data-*` attributes are provided, `data-*` attributes will take precedence. All `data-*` values will be merged into currently processing row to provide additional values not present or **replace** existing values found in the current row.

See [View and Template Expressions](#View-and-Template-Expressions) for information on filter `rbl-source` selectors before processing a row.

```html
<!-- 
Create a name-position template.  
Element name is rbl-template and the template id attribute is tid.
-->
<rbl-template tid="name-item">
    <p>Name: {first} {last}</p>
    <p>Position: {title}</p>
</rbl-template>

<!-- 
Assuming foundingfathers table from CalcEngine returns these two rows.

    foundingfathers: [{ 
        id: "madison", 
        first: "James", 
        last: "Madison", 
        title: "4th US President" 
    }, { 
        id: "hamilton", 
        first: "Alexander", 
        last: "Hamilton", 
        title: "Former US Treasury Secretary" 
    }]
-->
<!-- Use this template with foundingfathers row having id of 'madison'. -->
<div rbl-tid="name-item" rbl-source="foundingfathers.madison"></div>
<!-- Use this template with foundingfathers row having last of 'Madison'. -->
<div rbl-tid="name-item" rbl-source="foundingfathers.last.Madison"></div>
<!-- Use template with static data-* attributes -->
<div rbl-tid="name-item" data-first="James" data-last="Madison" data-title="4th US President"></div>

<!-- Resulting HTML (rbl-tid is removed so not processed again) -->
<div rbl-tid="name-item" data-first="James" data-last="Madison" data-title="4th US President">
    <p>Name: James Madison</p>
    <p>Position: 4th US President</p>
</div>
```

The most common use of templates with RBLe results is for repetitive result items like HTML list items: `<li>`.

```html
<!-- 
    foundingfathers: [{ 
        id: "madison", 
        first: "James", 
        last: "Madison", 
        title: "4th US President" 
    }, { 
        id: "hamilton", 
        first: "Alexander", 
        last: "Hamilton", 
        title: "Former US Treasury Secretary" 
    }]
-->

<!-- Template -->
<rbl-template tid="li-foundingfathers">
    <li>{first} {last}, {title}</li>
</rbl-template>

<!-- Markup -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
</ul>

<!-- Markup Results -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li>James Madison, 4th US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
</ul>
```

## Template Default Attributes

Templates can be provided default values in case a `{value}` is not provided via the caller with `data-value='xyz'` syntax, or not present in the `rbl-source` data used to render the template.

To provide defaults on a template, simply specify values via `default-` prefixed attributes.  For example, to provide a default value for a `{value}` subsitution, specify `default-value='xyz'` on the `<rbl-template>` or `<div rbl-tid="inline">` element.

When templates are processed, if the data source (`data-` attributes or data row from `rbl-source` driven templates) doesn't have a column requested in the template (i.e. `{missing-column}`), a replace doesn't happen and the templated content returns the static string `{requested-column}` in the markup. Providing defaults allows the Kaml View developers to avoid this situation..

**Note** When `rbl-source` is the data source, result columns from RBLe CalcEngines with blank values returned will automatically be processed as if a blank value was passed in and `{blank-column}` will be replaced. Therefore, setting `default-*=""` is unnecessary, but if an override value instead of blank is desired, `default-*` attribute values should be provided.

```html
<!-- Template (default-location="" below is for demonstration only since rbl-source is used by caller) -->
<rbl-template tid="li-foundingfathers" default-age="Old" default-title="Unknown" default-location="">
    <li>{first} {last} ({age}), {title}, {location}</li>
</rbl-template>

<!-- Markup -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers"></ul>

<!-- Markup, using data-* applied to caller of template instead of defaults on template definition -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers" data-age="Old" data-title="Unknown" data-location=""></ul>

<!-- Markup Results (same data source provided in samples above) -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li>James Madison (Old), 4th US President, </li>
    <li>Alexander Hamilton (Old), Former US Treasury Secretary, </li>
</ul>
```

## Template Precedence

Templates can be created inside Kaml View files in addition to a separate Kaml Template file.  Also, a Kaml View can specify multiple Kaml Template files that are required.  Therefore, an order of precedence is applied because templates can be overridden if the same `tid` is used.

**Sample Kaml View File**
```html
<rbl-config calcengine="ABC_DST_CE" templates="Standard_Templates,Client_Templates"></rbl-config>

<!-- Kaml View Markup -->

<!-- Custom checkbox template to replace the template inside Standard_Templates -->
<rbl-template tid="input-checkbox">
  <div class="form-group" rbl-display="v{inputname}">
    <input class="form-check-input {inputname}" id_="{inputname}" type="checkbox" name="{inputname}" />
    <label class="form-check-label" rbl-value="l{inputname}" for="{inputname}"></label>
  </div>
</rbl-template>
```

Given the above sample, the order of precedence (1 being the highest) is applied when locating a template:

1. Template located inside the Kaml View file
2. Search template files specified in the `templates` attribute from _right to left_

## Template Attributes

There is additional control that can be applied when processing Kaml templates.

Attribute | Description
---|---
rbl&#x2011;preserve | Normal processing of a template starts off with all child content of the target being removed.  Setting the content to the templated content.  If you want some content to be preserved, add the `rbl-preserve` _CSS class_ to any child elements that should not be replaced.
rbl&#x2011;preprend | When templated content is inserted into the Kaml View, by default it is inserted at the end of the element content.  If you are preserving items and you want it inserted at the beginning of the element content, set `rbl-prepend` attribute to `true`.  By default, `true` will put items in 'reverse' order because each data source processed will be added as the first element on the template.  If you want them in the order they are processed, you can use `rbl-prepend="before-preserve"` and each data source processed will be inserted before the first `.rbl-preserve` item found.

```html
<!-- 
    foundingfathers: [{ 
        id: "madison", 
        first: "James", 
        last: "Madison", 
        title: "4th US President" 
    }, { 
        id: "hamilton", 
        first: "Alexander", 
        last: "Hamilton", 
        title: "Former US Treasury Secretary" 
    }]
-->

<!-- Template -->
<rbl-template tid="li-foundingfathers">
    <li>{first} {last}, {title}</li>
</rbl-template>

<!-- Markup -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li class="rbl-preserve">George Washington, 1st US President</li>
</ul>

<!-- Markup Results -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li class="rbl-preserve">George Washington, 1st US President</li>
    <li>James Madison, 4th US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
</ul>

<!-- Markup with prepend -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers" rbl-prepend="true">
    <li class="rbl-preserve">George Washington, 1st US President</li>
</ul>

<!-- Markup Results -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li>James Madison, 4th US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
    <li class="rbl-preserve">George Washington, 1st US President</li>
</ul>
```

## Inline Templates
Normally, templates are created via a `<rbl-template tid="template-name">...</div>` element and used via a `<div rbl-tid="template-name"></div>` element.  You can also use inline templates by using the `rbl-tid="inline"` attribute on the child element.  The `rbl-tid="inline"` _must_ be the first element inside the `rbl-source="source"` element.

```xml
<!-- markup in inline template; noted with child element attrib [rbl-tid] -->
<ul rbl-source="foundingfathers">
    <li rbl-tid="inline">{first} {last},  {title}</li>
</ul>
<!-- markup results -->
<ul rbl-source="foundingfathers">
    <li rbl-tid="inline">{first} {last},  {title}</li>
    <li>James Madison, Former US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
</ul>
```
**Note**: All elements with a `rbl-tid` attribute are automatically hidden from the UI and when rendered.  Also, inline templates are simply converted into standard `<rbl-template/>` templates with unique names, but in the example above, they are left in markup for demonstration.

When using inline templates, if the template is simply a call to another template, you may have to use the `rbl-inline-tid` attribute.  When inline templates are converted to a standard `<rbl-template/>`, if `rbl-inline-tid` is present, it is moved to the `rbl-tid` attribute so that it will be processed as the specified template ID when the template is called.

```html
<!-- 
    For each row in dashboards, using the inline template, render a div.col* container and call a 
    template specified by the {name} column.
-->
<div class="row" rbl-source="dashboards">
	<div class="col-12 col-md-{col-md}" rbl-tid="inline" rbl-inline-tid="{name}"></div>
</div>

<!-- Markup after inline template pre-processed -->
<div class="row" rbl-source="dashboards" rbl-tid="GUID-ID"></div>

<!-- Dynamic Template Markup -->
<rbl-template tid="GUID-ID">
	<div class="col-12 col-md-{col-md}" rbl-tid="{name}"></div>
</div>

<!-- Generated HTML -->
<div class="row" rbl-source="dashboards" rbl-tid="GUID-ID">
	<div class="col-12 col-md-3" rbl-tid="widget.1"></div>
	<div class="col-12 col-md-3" rbl-tid="widget.2"></div>
	<div class="col-12 col-md-3" rbl-tid="widget.3"></div>
	<div class="col-12 col-md-3" rbl-tid="widget.4"></div>
</div>
```

## Empty Templates
Normally, when a template has an `rbl-source="source"` attribute and the `source` table isn't present in the CalcEngine results, the template simply doesn't process and nothing in the UI changes.  However, if you want the template to process every time, with or without matching results, and to display "no data" content if the `rbl-source` specified does not return any data, use the 'empty' template feature.

```html
<ul rbl-source="foundingfathers">
    <li rbl-tid="inline">{first} {last}, {title}</li>
    <li rbl-tid="empty">There are no Founding Fathers</li>
</ul>
<!-- markup results -->
<ul rbl-source="foundingfathers">
    <li rbl-tid="inline">{first} {last}, {title}</li>
    <li rbl-tid="empty">There are no Founding Fathers</li>
    <li>There are no Founding Fathers</li>
</ul>
```
**Note**: All elements with a `rbl-tid` attribute are automatically hidden from the UI and when rendered.  Also, inline templates are simply converted into standard `<rbl-template/>` templates with unique names, but in the example above, they are left in markup for demonstration.

## Automatically Processed Templates

Tables and Highchart templates are two templates that contain minimal markup because they are processed automatically when RBLe Service results are processed.

Neither template is applied with an `rbl-source` attribute, therefore the templated content is generated when the Kaml View is loaded.  Below are the templates found in _Standard\_Templates_.

```html
<rbl-template tid="result-table">
</rbl-template>

<rbl-template tid="chart-highcharts" type="KatApp-highcharts">
  <div class="chart chart-responsive"></div>
</rbl-template>
```

As you can see, for result tables, no content is generated.  And for Highcharts, a simple `div` with standard CSS class names applied is generated.

For each of these rendered templates, the RBLe Service then binds their contents to the `ResultBuilder Framework` that generates tables or charts.

### ResultBuilder Framework Tables

The following markup shows how the template would be rendered before the ResultBuilder Framework processing.

```html
<!-- Markup -->
<div rbl-tid="result-table" rbl-tablename="foundingfathers" data-css="table table-sm"></div>

<!-- RBLe Service Table
    * Note, column names changed from previous samples
    foundingfathers: [{ 
        id: "header", 
        text1: "First", 
        text2 "Last", 
        value1: "DOB" 
    }, { 
        id: "madison", 
        text1: "James", 
        text2 "Madison", 
        value1: "3/16/1751" 
    }, { 
        id: "hamilton", 
        text1: "Alexander", 
        text2: "Hamilton", 
        value1: "1/11/1755" 
    }]
-->

<!-- Rendered HTML -->
<div rbl-tid="result-table" rbl-source="foundingfathers" data-css="table table-sm">
    <table border="0" cellspacing="0" cellpadding="0" class="rbl foundingfathers table table-sm">
        <colgroup>
            <col class="foundingfathers-text1">
            <col class="foundingfathers-text2">
            <col class="foundingfathers-value1">
        </colgroup>
        <thead>
            <tr class="hdr">
                <th class="text foundingfathers-text1">First</th>
                <th class="text foundingfathers-text2">Last</th>
                <th class="value foundingfathers-value1">DOB</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text foundingfathers-text1">James</td>
                <td class="text foundingfathers-text2">Madison</td>
                <td class="value foundingfathers-value1">3/16/1751</td>
            </tr>
            <tr>
                <td class="text foundingfathers-text1">Alexander</td>
                <td class="text foundingfathers-text2">Hamilton</td>
                <td class="value foundingfathers-value1">1/11/1755</td>
            </tr>
        </tbody>
    </table>
</div>
```

Template&nbsp;Attribute | Description
---|---
rbl&#x2011;tablename | The name of the RBLe Service table to render.
data-css<sup>1</sup> | A custom CSS class to apply to the `table` element.  If provided, the CSS class will be `rbl {data-source} {data-css}`.  If not provided, the CSS class will use a default bootstrap styling of `rbl {data-source} table table-striped table-bordered table-condensed`.<br/><br/>If `data-css` contains `table-responsive`, a child `<div class="table-responsive">` is created and the resulting table html is inserted inside this `div`.

\
<sup>1</sup> The preferred way to define the styling of the table is using the `data-css` attribute or simply the `class` attribute on the template element.  However, the `class` column from the legacy `contents` table is still supported.  If there is a row in `contents` with `section=1 and type='table' and item={rbl-tablename} and class!=""`, then `data-css` will not be used and instead the table's CSS class will be `rbl {rbl-tablename} {contents.class}`.

### ResultBuilder Framework Charts

The following markup shows how the template would be rendered before the ResultBuilder Framework processing.

```html
<!-- Markup -->
<div class="text-center" rbl-tid="chart-highcharts" rbl-chartdata="SavingsChart" rbl-chartoptions="Pie"></div>

<!-- Rendered HTML -->
<div class="text-center" rbl-tid="chart-highcharts" rbl-chartdata="SavingsChart" rbl-chartoptions="Pie">
    <div class="chart chart-responsive">
        <!-- Highchart generated code -->
    </div>
</div>
```

Processing charts is accomplished specifying by two tables.  A data table and an options table.

Template&nbsp;Attribute | Description
---|---
rbl&#x2011;chartdata | The name of the RBLe Service table that provides the data for the chart.  In the CalcEngine, the table name will be `HighCharts-{table}-Data`.
rbl&#x2011;chartoptions | Optional name of the RBLe Service table that provides the options/configuration for the chart.  In the CalcEngine, the table name will be `HighCharts-{table}-Options`.  If not provided, the `rbl-chartdata` table will be used as the identifier.

## Building Common Controls

Templates are also used to build controls in an Kaml View that may have repetitive or complex markup.  This is accomplished by passing static data to the template that is used to create markup.  This use of templates generally does not use RBLe results, but rather static data.

### Eliminating Browser ID Warnings

When creating a Template Kaml File that has markup for more than one control/component, it is common to have something like the following:

```html
<rbl-template tid="my-textbox" type="katapp-textbox">
  <input name="{inputname}" id="katapp_{id}_{inputname}" type="text" class="form-control {inputname}">
</rbl-template>

<rbl-template tid="my-checkbox" type="katapp-checkbox">
  <input name="{inputname}" id="katapp_{id}_{inputname}" type="checkbox" class="form-control {inputname}">
</rbl-template>
```

When this template is injected into the page, both `input` elements have the same id of `katapp_{id}_{inputname}` (no substitution yet because the template hasn't been applied) and browser debug tools complain about multiple elements with identical `id` attributes.  To get around this, you can use an `id_` attribute instead of `id` and when the template is processed, it will change `id_` to `id` and avoid superfluous error messages.

**Update**: The `id` attribute is not needed by the KatApp framework, only the `name` attribute.  If the `id` attribute is not needed for Kaml View javascript or Template javascript, it is preferred to only use the `name` attribute.

### Creating Table Row/Column Templates

Browsers do not allow `tr` or `td` table elements to exist unless nested properly under a `table` element.  When it encounters such elements, it simply (silently) removes the element from the DOM.  The following template is not valid because the `tr` would be removed and unusable.

```html
<rbl-template tid="my-table-row">
  <tr>
    <td>{data-text}</td>
    <td>{data-value}</td>
  </tr>
</rbl-template>
```

To allow for row and column templates, Template Kaml files must use `tr_` and `td_` instead of `tr` and `td`.  The following would be a functional template for table rows.

```html
<rbl-template tid="my-table-row">
  <tr_>
    <td_>{data-text}</td_>
    <td_>{data-value}</td_>
  </tr_>
</rbl-template>
```

### Example: Creating a slider
```xml
<!-- create a slider for control 'iRetireAge' using 'standard' template -->
<div rbl-tid="slider-control" data-inputname="iRetireAge">
```

The above markup uses the predefined "slider-control" template and the result is this markup:

```xml
<div class="form-group slider-control-group">
    <div class="validator-container">
        <a style="display: none;" class="vhiRetireAge" role="button" tabindex="0" data-toggle="popover"
        data-trigger="click" data-content-selector=".hiRetireAge" data-placement="top">
        <span class="glyphicon glyphicon-info-sign help-icon"></span>
        </a>
        <a style="display: none;" class="vsiRetireAge" role="button" tabindex="0" data-placement="top">
        <span class="glyphicon glyphicon glyphicon-volume-up"></span>
        </a>
        <div class="slider-control slider-iRetireAge" data-slider-type="nouislider"></div>
        <input name="iRetireAge" type="text" id_="iRetireAge" class="form-control iRetireAge" style="display: none" />
        <span class="error-msg" data-toggle="tooltip" data-placement="top"></span>
    </div>
    <div class="hiRetireAgeTitle" style="display: none;"></div>
    <div class="hiRetireAge" style="display: none;"></div>
    <h6 class="text-center">
        <span class="liRetireAge" style="text-transform: uppercase">iRetireAge Label</span>
        <span class="sviRetireAge" style="font-weight: bold"></span>
    </h6>
</div>
```

In this manner, if two more sliders are needed for inputs iInvestmentReturn and iBonusPercentage, the Kaml View markup would be:

```html
<!-- sliders -->
<div rbl-tid="slider-control" data-inputname="iRetireAge">
<div rbl-tid="slider-control" data-inputname="iInvestmentReturn">
<div rbl-tid="slider-control" data-inputname="iBonusPercentage">
```

This is more accurate than repeating the complex markup for every slider needed and replacing all instances of 'iRetireAge'. 

## Standard_Templates.kaml

The KatApp framework includes a _Standard\_Templates.kaml_ Template that has the most commonly used input templates leveraged in Kaml Views.  The inputs are styled with Bootstrap 3.  When a container is using Bootstrap 4, include the _Input\_TemplatesBS4.kaml_ file as well.

```html
<!-- When Bootstrap 4 is being used, the view's templates attribute should be configured as follows -->
<rbl-config calcengine="ABC_DST_CE" templates="Standard_Templates,Input_TemplatesBS4"></rbl-config>
```

Each input can have its own set of data attributes to configure the functionality and appearance of the input.  For some templated inputs, results from the CalcEngine can provide all or additional configuration as well.

This section contains a list of the common controls provided by this template and the attributes that can configure them.  When creating custom templates, do use Standard_Templates as an example of how templates should be built.

<hr/>

### input-textbox

Builds a textual input that is styled with Bootstrap and supports input group suffix/prefix, help tips, voice icons, and validation indicators.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-type | The type of input it is: `password`, `multiline`, `date`, or `text` (default).
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data-prefix | Prefix to prepend to the input in the form of a Bootstrap `input-group-prepend` element (usually the $ symbol when needed).
data-suffix | Suffix to append to the input in the form of a Bootstrap `input-group-append` element (usually the % symbol when needed).
data-placeholder | The placeholder to display when the input is empty.
data-maxlength | The max length allowed for textual input.
data&#x2011;autocomplete | A `Boolean`, that when `false` specifies that the `autocomplete="false"` attribute should be assigned to the contained `input` element (default is `false` for inputs with `type=password`, otherwise default is `true`).
data-value | A default value to use for the input.
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-formcss | A CSS class to use in place of the default `form-group`.
data-inputcss | A CSS class to apply to the contained `input` element.
data-labelcss | A CSS class to apply to the contained `label` element.
data-displayonly | A `Boolean` value specifying whether this input should be rendered in a 'display only` mode.  All the logic for label, help and voice will remain, but the input will be removed and replaced with a label input (default is `false`).
data-hidelabel | A `Boolean` value specifying whether the contained `label` element should be remove to correct for UI layout issues when needed (default is `false`).

<br/>

<hr/>

### input-dropdown

Builds a dropdown control that is styled with Bootstrap (and _bootstrap-select_) and supports help tips, voice icons, validation indicators, and [_bootstrap-select API_](#https://developer.snapappointments.com/bootstrap-select/) properites.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-multiselect | A `Boolean` value specifying whether this dropdown allows multi-selection (default is `false`).
data-livesearch | A `Boolean` value specifying whether this dropdown allows live search capabilities when the dropdown is opened (default is `false`).
data-size | The number of items to display when the dropdown is opened before rendering a scrollbar (default is `15`).
data&#x2011;lookuptable | Specifies the name of lookup table to use as a data source when `rbl-listcontrols` from the results will _not_ provide the data source.
data&#x2011;use&#x2011;selectpicker | A `Boolean` value specifying whether this dropdown should leverage `bootstrap-select` (or use a standard `<select>` when `false`) (default is `true`).
data-* | All other data attributes present will be applied to the contained `select` element for processing from the [_bootstrap-select API_](#https://developer.snapappointments.com/bootstrap-select/).

<br/>

Using the `data-lookuptable` attribute requires a `<rbl-template tid="lookup-tables">` containing the lookup table in the same format as a xDS Specification Sheet export.

```html
<!-- Create a 'Tax Status' label and manually provide the data source to propulate the dropdown -->
<div rbl-tid="input-dropdown" data-label="Tax Status" data-lookuptable="TableTaxStatus"></div>

<rbl-template tid="lookup-tables">
	<DataTable id="TableTaxStatus">
        <TableItem key="1" name="Single Standard Deduction"/>
        <TableItem key="2" name="Married File Jointly Std. Ded"/>
        <TableItem key="3" name="Married File Sep Std. Ded"/>
        <TableItem key="4" name="Head of Household Std. Ded"/>
	</DataTable>
</rbl-template>
```

<hr/>

### input-checkbox / input-checkbox-simple

Builds a checkbox input that is styled with Bootstrap and supports help tips, voice icons, and validation indicators.

The `input-checkbox-simple` is a simplified rendering that does _not_ support help tips, voice icons, or validation indicators.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data&#x2011;checked | A `Boolean` indicating whether the input should be checked by default (default is `false`).
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-inputcss | A CSS class to apply to the contained `input` element.

<br/>

<hr/>

### input-slider

Builds a noUiSlider input that is styled with Bootstrap and supports help tips, voice icons, and validation indicators.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-value | A default value to use for the slider.

See [rbl-sliders](#**rbl-sliders** ) for more information about the values that come from RBLe Service calculation results that control the configuration of the noUiSlider.

<br/>

<hr/>


### input-radiobuttonlist / input-checkboxlist

Builds a radio or checkbox list of inputs that grouped together and styled with Bootstrap and supports help tips, voice icons, and validation indicators.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-formcss | A CSS class to use in place of the default `form-group`.
data-horizontal | A `Boolean` value specifying whether the list items should be displayed in a horizontal layout versus vertical (default is `false`).
data-hidelabel | A `Boolean` value specifying whether the contained `label` element should be remove to correct for UI layout issues when needed (default is `false`).
data&#x2011;lookuptable | Specifies the name of lookup table to use as a data source when `rbl-listcontrols` from the results will _not_ provide the data source.

<br/>

Using the `data-lookuptable` attribute requires a `<rbl-template tid="lookup-tables">` containing the lookup table in the same format as a xDS Specification Sheet export.

```html
<!-- Create a 'Tax Status' label and manually provide the data source for the list of radio buttons -->
<div rbl-tid="input-radiobuttonlist" data-label="Tax Status" data-lookuptable="TableTaxStatus"></div>

<rbl-template tid="lookup-tables">
	<DataTable id="TableTaxStatus">
        <TableItem key="1" name="Single Standard Deduction"/>
        <TableItem key="2" name="Married File Jointly Std. Ded"/>
        <TableItem key="3" name="Married File Sep Std. Ded"/>
        <TableItem key="4" name="Head of Household Std. Ded"/>
	</DataTable>
</rbl-template>
```

<hr/>

### input-fileupload

Builds a file upload input that is styled with Bootstrap and supports help tips, voice icons, and validation indicators.

Attribute | Description
---|---
data&#x2011;inputname | The input name.
data-label | The input label.
data-help | The help tip.  When provided, the help icon will be displayed that can render the tip in a a popup fashion.
data-css | A CSS class to apply to the container `div`.  This is same `div` that has the `rbl-display` attribute and `form-group` CSS class assigned.
data-formcss | A CSS class to use in place of the default `form-group`.
data-inputcss | A CSS class to apply to the contained `input` element.
data-labelcss | A CSS class to apply to the contained `label` element.
data-hidelabel | A `Boolean` value specifying whether the contained `label` element should be remove to correct for UI layout issues when needed (default is `false`).
data-comand | The KatApp Command Value to submit to the Endpoint API indicating the purpose of this file upload (default is `UploadFile`).

<br/>

See [apiAction](#apiAction) for more information on KatApp Commands.

```html
<!-- Build a file upload input that has label, name, and KatApp Command provided -->
<div rbl-tid="input-fileupload" class="col-md-9" data-label="File Name" data-inputname="iUpload" data-command="RetireOnline.UploadRequiredDocument"></div>
```

<hr/>

### validation-summary / validation-warning-summary

Provides the markup needed to display the default error (`validation-summary`) or warning (`validation-warning-summary`) validaiton summaries.

There are no custom data attributes to use to customize validation summary components.

<hr/>

### carousel

Builds a standard Boostrap carousel.

Attribute | Description
---|---
data-name | Provides the name for the carousel.
data-source | Provides the result table to use as a `rbl-source` to be used to generate carousel items.  The table specified only needs to contain a `text` column.

<br/>

<hr/>

### Additional Template Components

In addition to the common components previously described there are a handful of other components less often used.

Component | Description
---|---
li-item | Wraps a `text` data with `<li></li>`
p-item | Wraps a `text` data with `<p></p>`
result-table | Actually has no content, is simply an indicator for a ResultBuilder Framework to build a [table](#Table-Template-Processing).
chart&#x2011;highcharts | Renders a container div with default CSS (`chart chart-responsive`) which later has a Highcarts chart generated inside of it.  See [chart processing](#Highcharts-Template-Processing) for more information.

<br/>

### Using Template Type Attribute

Some Kaml Views need to use input templates provided from Standard_Templates.kaml _and_ create additional input templates with different markup (using a different `tid` as to no override the base template).  In most cases, it is still desired to support all or some of the `data-` attribute functionality that the base templates support.  Since the `tid` is different, to allow for the KatApp framework to properly include custom input template during the processing of these `data-` attributes, use the `type` attribute on your `rbl-template` element.

```html
<!-- Custom template, but categorized as a katapp-checkbox -->
<rbl-template tid="custom-checkbox" type="katapp-checkbox">
    <!-- markup -->
</rbl-template>
```

The following template types are supported: `katapp-textbox`, `katapp-dropdown`, `katapp-checkbox`, `katapp-radiobuttonlist`, `katapp-checkboxlist`, `katapp-fileupload`, and `katapp-highcharts`.

# View and Template Expressions

Simple and complex expression logic can be used in with both [KatApp Selectors](#KatApp-Selectors) and [`rbl-source` selectors](#rbl-source-Selectors).  For `rbl-display`, simple expression logic provides a single operator/value comparison at the end of a selector path.  Complex expressions (denoted by `[]` in the selector path) are much more powerful and provide the full capabilities of Javascript programming to create predicate expressions.

## Simple rbl-display Expression Selector

In addition to simply returning a falsey visibility value from the CalcEngine via a [KatApp Selector](#KatApp-Selectors), the `rbl-display` attribute can contain simple operator expressions. The operators that are supported are `=`, `!=`, `>=`, `>`, `<=`, and `<`.

Expression Selector | Description
---|---
idValue{operator}{value} | Process the item if row in `rbl-display` table where id is `idValue` exists and show if the `value` column compared to `value` does not return falsey.
table.idValue{operator}{value} | Process the item if row in `table` table where id is `idValue` exists and show if the `value` column compared to `value` does not return falsey.
table.idValue.column{operator}{value} | Process the item if row in `table` table where id is `idValue` exists and show if the `column` column compared to `value` does not return falsey.
table.keyColumn.keyValue.returnColumn{operator}{value} | Process the item if row in `table` table where `keyColumn` is `keyValue` exists and show if the `returnColumn` column compared to `value` does not return falsey.

```html
<!-- 
Row: 'rbl-display' table where 'id' is 'vWealth'
Show if 'value' column from Row = 2, otherwise hide 
-->
<div rbl-display="vWealth=2">Wealth Information</div>

<!-- 
Row: 'wealth-summary' table where 'id' is 'benefit-start'
Show if 'value' column from Row = 1, otherwise hide 
-->
<div rbl-display="wealth-summary.benefit-start=1">Wealth Information</div>

<!-- 
Row: 'wealth-summary' table where 'id' is 'benefit-start'
Show if 'enabled' column from Row = 1, otherwise hide 
-->
<div rbl-display="wealth-summary.benefit-start.enabled=1">Wealth Information</div>

<!-- 
Row: 'wealth-summary' table where 'group' column is 'HW'
Show if 'enabled' column from Row = 1, otherwise hide 
-->
<div rbl-display="wealth-summary.group.HW.enabled=1">Wealth Information</div>

<!-- 
Row: 'contact-info' table where 'id' is 'work'
Show if 'address1' column from Row is not blank, otherwise hide 
-->
<div rbl-display="contact-info.work.address1!=">Work Address: <span rbl-value="contact-info.work.address1"></span></div>

<!-- 
Checking existence of a row

Row: 'wealth-summary' table where 'id' is 'benefit-start'
Show if Row exists (if '@id' column from Row = 'benefit-start'), otherwise hide
-->
<div rbl-display="wealth-summary.benefit-start.@id=benefit-start">benefit-start row exists</div>
```

**Note**: If you need to show and hide something based on a row that may or may not exist, set `style="display: none;"` by default.  If the row is not present in the results, processing will not occur and the item will remain hidden.

```html
<!-- 
Processing item where row might not exist in results

Row: 'wealth-summary' table where 'id' is 'benefit-start-missing' (intentially bad ID)
Show if Row exists (it will not in this case) and the value is not blank, otherwise leave hidden.
-->
<div rbl-display="wealth-summary.benefit-start-missing!=" style="display: none;">benefit-start-missing row exists</div>
```

## rbl-display v: Template Expression

The `rbl-display` attribute usually works off of falsey values returned via [KatApp Selectors](#KatApp-Selectors) from a CalcEngine result.  However, inside [templates](#Templates), controlling visibility by looking at values on the current row being processed can be accomplished by using a `v:` prefix (v for value) and providing a simple operator expression.

All comparison operators (`=`, `!=`, `<`, `<=`, `>`, and `>=`) are supported.

For example, if the data processed by a template had a `code` and `count` column, the following could be leveraged.

```html
<div rbl-display="v:{code}=YES">Show if the `code` column is `'YES'`.</div>

<div rbl-display="v:{count}>=2">Show if the `count` column is greater than or equal to 2.</div>

<div rbl-display="v:{field}=">Show if the `field` column is blank.</div>
```

Note: As shown in the example above, to use an empty string in the expression, simply skip providing anything (do not provide `''` for empty string).

## Complex rbl-source Expressions

Similar to a [`rbl-source` selector](#rbl-source-Selectors) that only specifies a `table` (to process all rows), expressions can be supplied and evaluated via the addition of javascript predicate support. 

Expression&nbsp;Selector | Description
---|---
table[predicate] | `predicate` is a javascript expression that should return `true` or `false`.  In the expression, the `this` reference will be current row being processed.  Each row evaluated will only be applied to the template specified if the predicate returns `true`.

The javascript predicate has a signature of: `predicate( row: JSON, index: integer, application: KatAppPlugInInterface)`.  Therefore, within the predicate expression, you can use these parameters if needed.

```html
<!-- Call the name-item template with each row in foundingfathers table where the last column contains 'Mad'. -->
<div rbl-tid="name-item" rbl-source="foundingfathers[this.last.indexOf('Mad')>-1]"></div>
```

## Complex KatApp Selector Expressions

When using a [KatApp Selector](#KatApp-Selectors) to specify how to pull a value from CalcEngine results, expressions increase the power of selectors by enabling expression coding to extend the base selector capability (via `[]` expression coding).

KatApp Selectors are used for [rbl-value](#rbl-value-Attribute-Details), [rbl-display](#rbl-display-Attribute-Details), and [rbl-attr](#rbl-attr-Attribute-Details) attribute processing.  Expressions extend default behavior by allowing a javascript code to be supplied on top of the default selector to return any value the Kaml View developer sees fit.

There are a couple differences in the KatApp Selector syntax when they are used in conjuction with expressions.

KatApp&nbsp;Selector | With&nbsp;Expressions
---|---
Only one segment provided indicates a `idValue`.  `rbl-value="liDateTerm"` means look in the default table of `rbl-value` for row with `id=liDateTerm` and return the `value` column. | Only one segment provided indicates a table name.  All rows should be processed by the expression until *one* of the rows returns a value *other than* `undefined`  `rbl-value="election-data[index==1 ? row.form : undefined]"` means loop all rows in `election-data` until index (zero based) is 1, then return the `form` column.
Must have at least one segment. | Can supply *only* an expression *without* any selector segments and it defaults to using the 'default' table based on attribute being processed (`rbl-value` and `rbl-attr` default to `rbl-value` table and `rbl-display` defaults to `rbl-display` table). `rbl-value="[index==1 ? row.form : undefined]"` processes the same as the example above.

Expression&nbsp;Selector | Description
---|---
[expression] | Run the `expression` on each row from the 'default' table until the expression returns value not equal to `undefined`.
table[expression] | Run the `expression` on each row from the `table` table until the expression returns value not equal to `undefined`.
table.idValue[expression] | Run the `expression` on the row from `table` where `@id=idValue`.
table.keyColumn.keyValue[expression] | Run the `expression` on the row from `table` where `keyColumn=keyValue`.

Once the value is returned, which could be `undefined` when processing all table rows based on expression, normal work flow for the currently processing attribute (`rbl-value`, `rbl-display`, or `rbl-attr`) with proceed in the same manner as if a value has been returned from a standard KatApp Selector.

The javascript expression has a signature of: `expression( row: JSON, index: integer, application: KatAppPlugInInterface)`.  Therefore, within the expression, you can use these parameters if needed (`index` will always be `0` if more than one segment is provided in the KatApp Selector to indicate row filtering *before* the expression is executed).

```html
<!--
    If the CalcEngine results has rbl-value row with id='pageHeader' and value='TOTAL REWARDS`, then
    all samples below should output: Hi TOTAL BENEFITS.
-->
<div rbl-value="[row['@id'] == 'pageHeader' ? 'Hi ' + row.value.replace('REWARDS', 'BENEFITS') : undefined]"></div>
<div rbl-value="rbl-value[row['@id'] == 'pageHeader' ? 'Hi ' + row.value.replace('REWARDS', 'BENEFITS') : undefined]"></div>
<div rbl-value="rbl-value.pageHeader[row.value.indexOf('TOTAL')>-1 ? 'Hi ' + row.value.replace('REWARDS', 'BENEFITS') : undefined]"></div>
<div rbl-value="rbl-value.@id.pageHeader[row.value.indexOf('TOTAL')>-1 ? 'Hi ' + row.value.replace('REWARDS', 'BENEFITS') : undefined]"></div>
```

# RBLe Service

The RBLe Service is the backbone of KatApps.  The service is able to marshall inputs and results in and out of RBLe CalcEngines.  These results drive the functionality of KatApps.

## Framework Inputs

Every calculation sends back a set of framework inputs that are set programmatically via the `KatAppOptions`, versus an actual input on the page.

Input | Description
---|---
iConfigureUI | A value of `1` indicates that this is the first calculation called after the markup has been rendered.  Can be turned off via `KatAppOptions.runConfigureUICalculation`
iDataBind | A value of `1` indicates that all `rbl-listcontrol` and `rbl-defaults` should be processed to set default data bound values (note, this happens on the same calculation that sends `iConfigureUI=1`).
iInputTrigger | The name of the input that triggered the calculation (if any) will be passed.
iCurrentPage | Describes which page the calculation is being submitted from.  Passed from `KatAppOptions.currentPage`
iCurrentUICulture | Specifies which culture should be when generating results.  Passed from `KatAppOptions.currentUICulture`
iEnvironment | Specifies the environment in which the RBLe Service is executing.  Passed from `KatAppOptions.environment` (`PITT.PROD`, `PITT.UAT`, or `WN.PROD`)

<br/>

## Input Table Management

RBLe Service has the concept of input tables that allow for tabular input data to be sent to the CalcEngine.  This can be handled in markup or in javascript.

```javascript
// Append custom table to the CalculationInputs object instead of sending an input for each 'table cell' of data
view.on("onCalculationOptions.RBLe", function (event, submitOptions, application) {
    var tables = submitOptions.InputTables;
    if (tables == null) {
        // Ensure that the InputTables property is valid
        submitOptions.InputTables = tables = [];
    }

    // Create custom coverage table
    var coverageTable = {
        Name: "coverage",
        Rows: []
    };

    // Loop all inputs that start with iCoverageA- and process them.
    // data-inputname is in form of iCoverageA-id
    // For each input, create a row with id/covered properties
    var inputControlData = application.select("div[data-inputname^=iCoverageA-]");
    inputControlData.each(function (index, element) {
        var id = $(element).data("inputname").split("-")[1];
        var v = $(element).hasClass("active") ? 1 : 0;
        var row = { "id": id, covered: v };
        coverageTable.Rows.push(row);
    });
    tables.push(coverageTable);
});
```

Calculation Input Tables can be driven by Html markup too.  The markup can be a hidden element that has its 'state' managed via javascript (i.e. Income/Expense cards in Evolution Framework planner) or can be an actual UI table of inputs the user is manipulating.  For processing to function properly data attributes need to be applied to container elements and inputs.

Attribute | Description
---|---
RBLe&#x2011;input&#x2011;table | Not an attribute, but a `class` that must be applied to the container that represents the input table.  KatApp framework will loop all elements with this `class` and treat it as an input table.
data-table | The name of the input table applied on the same container that has the `RBLe-input-table` class.
data-index | The index/id of the row containing columns of inputs applied on a container of input elements.
data-column | The column name to use for current data value applied on an input.

<br/>

Note: The `data-index` and `data-column` tagged elements do **not** have to be direct descendents of the related parent.

```html
<!-- 
Sample hidden input table whose state (rows, columns/inputs, and values) is managed via javascript.
The resulting markup is processed by KatApp frameworks `calculate` method when it gathers all the inputs to submit.
-->
<div class="RBLe-input-table d-none hidden" data-table="pay">
    <div data-index="2020">
        <input data-column="base" type="text" value="50000">
        <input data-column="bonus" type="text" value="0">
    </div>
    <div data-index="2021">
        <input data-column="base" type="text" value="51000">
        <input data-column="bonus" type="text" value="1000">
    </div>
</div>

<!--
Sample UI input table allowing user to enter inputs to be submitted as a table to RBLe Service
-->
<div class="RBLe-input-table" data-table="pay">
    <div class="row" data-index="2020">
        <div class="col-6">
            <input data-column="base" type="text" value="50000">
        </div>
        <div class="col-6">
            <input data-column="bonus" type="text" value="0">
        </div>
    </div>
    <div class="row" data-index="2021">
        <div class="col-6">
            <input data-column="base" type="text" value="51000">
        </div>
        <div class="col-6">
            <input data-column="bonus" type="text" value="1000">
        </div>
    </div>
</div>
```

## ResultBuilder Framework

The RBLe ResultBuilder Framework is responsible for creating HTML table and chart markup, the latter leverages Highcharts API, automatically from the calculation results returned from the CalcEngine.

### Table Template Processing

All tables rendered by ResultBuilder Framework use the rules described below.  Simply put, only columns starting with `text` or `value` are rendered, however, there are flags, columns, or names available for use that control how results are generated and returned for each `rbl-tablename` table from the CalcEngine.

Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Location&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description
---|---|---
id | Column Name | An arbitrary 'id' value for each row.  Used in selector paths and also used to detect 'header' rows.
on | Column Name | Whether or not this row gets exported. If set to `0`, the row is not returned in results.
code | Column Name | Same rules as id column for rendering 'header' rows.
class | Column Name | Optional CSS class to apply to the table row (`tr` element).
span | Column Name | Optional column to use to define column spanning within the row.
textX | Column Name | Render content with `text {table}-{column}` CSS class. `text` by default causes left alignment.
valueX | Column Name | | Render content with `value {table}-{column}` CSS class. `value` by default causes right alignment.
width<br/>r-width | Row ID | If you want explicit control of column widths via absolute or percentage, values can be provided here.  `r-width` is used when the table has a CSS class of `table-responsive` applied.
width-xs<br/>width-sm<br/>width-md<br/>width-lg | Row ID | If you want explicit control of column widths via bootstrap column sizes, values can be provided here.  **Note:** If any bootstrap viewport width is provided, the `width` column is ignored.
on | Row ID | Similar to the `on` Column, to control whether or not a column gets exported, provide a row with `id` set to `on`, then for each column in this row, if the value is `0`, then _entire_ column will not be exported.
class | Row ID | Similar to the `class` Column, to provide a class on a specific column, provide a row with `id` set to `class`, then for each column in this row, provide a class that will be applied to a column for _every_ row rendered.
table-output-control | Table Name | Similar to the `on` Column Name and Row ID, this controls exporting logic, but it puts all the logic in one place (instead of every row's `on` column) to make maintenance easier.  See [table-output-control](#table-output-control) for more information.
export-blanks | Column Switch | By default, blank values/columns are not returned from RBLe service.  If table processing requires all columns to be present even when blank, use the `/export-blanks` switch on the column header.
work-table | Table Switch | By default, all tables on a CalcEngine result tab are exported (until two blank columns are encountered).  To flag a table as simply a temp/work table that doesn't need to be processed, use the `/work-table` switch on the table name.
configure-ui | Table Switch | To configure a table to _only_ export during a Configure UI calculation (`iConfigureUI=1`), use the `/configure-ui` switch on the table name.  This removes the need of putting `on` or `table-output-control` logic that checks the `iConfigureUI` input explicitly.
unique-summary | Table Switch | RBLe has an automatic 'grouping' aggregator to produce a unique list of values for input tables (UI inputs, Data Tables, or Global Tables).  See [Unique Summary Configuration](#Unique-Summary-Configuration) for more information.
child-only | Table Switch | By default, any tables used as a child table are still exported normally, so the data appears twice in the results; once nested, and once at root level.  If you want to supress the exporting of data at the normal/root level, you can add the `/child-only` flag indicating that it will only appear in the results nested in its parent table.  _If the parent is not exported, child tables remain supressed._ See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.
sort-field | Table Switch | To configure how the table data is sorted, use the `/sort-field:field-name` switch on the table name.  To specify multiple columns to use in the sort, provide a comma delimitted list of field names.  When used on an _Input Tab Table_, the data is sorted _before_ it is loaded into the tab.  Conversely, when used on a _Result Tab Table_, the data is sorted _after_ exporting the results from the CalcEngine.
sort-direction | Table Switch | Optional sort control (`asc` or `desc`) used in conjunction with `sort-field`.  By default, data will be sorted ascending.  Use the `/sort-direction:direction` to control how field(s) specified in the `/sort-field` switch are sorted.  If `/sort-direction:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.
sort-number | Table Switch | Optional switch (`true` or `false`) used in conjunction with `sort-field`.  By default, data will be sorted using a `string` comparison.  Use the `/sort-number:true` to indicate that field(s) specified in the `/sort-field` switch should be treated as numeric when sorting.  If `/sort-number:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.
text | Column Switch | Optional switch used on input table columns to indicate whether or not to force the provided data to be formatted as 'text'.  If `/text` is not provided and a textual value that converts to a number is provided, it can change the value.  For example, if `01` is provided to a column without the `\text` flag, the CalcEngine would convert `01` to `1`.  With the `\text` flag, the leading `0` would be preserved.
off | Column Switch | Optional switch used on result table columns to indicate that the column should not be exported in the results.  This is similar to an `on` row ID where each column is controlled with a `1` or `0` (skipped) value, but is an easier syntax to use if there is no logic behind exporting or not.
Nesting `[]` | Column Switch | Optional syntax to specify that a column contains nested information.  See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.

<br/>

#### Unique Summary Configuration

Producing a unique list of values in CalcEngines can be difficult (especially when the unique _key_ is a combination of multiple columns). To alleviate this problem, RBLe can produce a unique list of values from input tables (UI inputs, `<data-tables>` or `<<global-tables>>`).  The configuration is controlled by the `/unique-summary:detailTable` flag and the columns specified in the summary table.

1. The `/unique-summary:detailTable` flags a table as a _summary_ table and the `detailTable` name indicates the table that should be summarized.
2. When creating a summary table, you indicate what type of table (input, data, or global) the detail table is by using the same naming convention: `<data>`, `<<global>>`, or no `<>` for user input tables.
3. In the summary table, only columns that generate the _unique_ list of values desired should be specified.  Additional columns (i.e. for additional details) *can not* be used.

In the example below, `benefitSummary` will contain values that generate a unique list across the `benefitType` and `optionId` columns from the `benefitDetails` table.

*&lt;benefitDetails&gt; table*

id | benefitType/text | optionId/text | coverageLevel/text
---|---|---|---
1 | 01 | 02 | 05
2 | 01 | 02 | 04
3 | 02 | 02 | 05
4 | 02 | 01 | 03
5 | 03 | 01 | 01

*&lt;benefitSummary&gt;/unique-summary:benefitDetails table*

benefitType/text | optionId/text
---|---
01 | 02
02 | 02
02 | 01
03 | 01

<br/>

#### Table Nesting Configuration

Traditionally, RBLe exports all tables specified in the CalcEngine as root level table row arrays with no nesting; each row containing only the properties (columns from CalcEngine) defined on the table.  For better API support from other systems calling into RBLe, result tables can be configured so that nesting occurs and rich object hierarchies can be built.  

When a column has `[]` in its name, this signals that this column will have an array of children rows.  The column header name specified before the `[` will be the name of the property on this parent row.  Note that if any `/switch` flags are to be used on this column (i.e. `/text`), they should appear _after_ the closing `]`.  There are two ways to configure nesting.

If only `[]` is used in the name, the nesting configuration will be supplied in the _column value_ of each row, however, if every parent row nests the same child table but simply filters the child rows by a value, the syntax of `[childTable:childKeyColumn]` can be used.

Configuration | Value | Description
---|---|---
`[]` | `childTable` | When the column only has `[]` provided, and the value only specifies a `childTable`, every row present in `childTable` will be nested under this column.
`[]` | `childTable:childKeyColumn=value` | Each row can specify a filter into the specified `childTable`.  The table and filter are separated by a `:` and a simply expression using `=` is all that is supported.  This would nest all rows from `childTable` where the column `childKeyColumn` has a value of `value`.
`[childTable:childKeyColumn]` | `value` | When this syntax is used, the `value` provided in each row is used as a filter for the `childKeyColumn` column.


*Example of `[childTable:childKeyColumn]` syntax.*

*orders table*
id | date | amount | items\[orderItems:orderId\] 
---|---|---|---
1 | 2021-07-13 | 45 | 1
2 | 2021-08-13 | 33 | 2

*orderItems table*
id | orderId | sku | price | quantity 
---|---|---|---|---
1 | 1 | PRD4321 | 10 | 3
2 | 1 | PRD5678 | 5 | 2
3 | 1 | PRD3344 | 5 | 1
4 | 2 | PRD6677 | 33 | 1

This CalcEngine nesting configuration would result in the following JSON

```javascript
{
    orders: [
        {
            "@id": 1,
            date: "2021-07-13",
            amount: 45
            items: [
                { "@id": 1, orderId: 1, sku: "PRD4321", price: 10, quantity: 3 },
                { "@id": 2, orderId: 1, sku: "PRD5678", price: 5, quantity: 2 },
                { "@id": 3, orderId: 1, sku: "PRD3344", price: 5, quantity: 1 }
            ]
        },
        {
            "@id": 2,
            date: "2021-08-13",
            amount: 33
            items: [
                { "@id": 4, orderId: 2, sku: "PRD6677", price: 33, quantity: 1 }
            ]
        }
    ],
    orderItems: [
        { "@id": 1, orderId: 1, sku: "PRD4321", price: 10, quantity: 3 },
        { "@id": 2, orderId: 1, sku: "PRD5678", price: 5, quantity: 2 },
        { "@id": 3, orderId: 1, sku: "PRD3344", price: 5, quantity: 1 },
        { "@id": 4, orderId: 2, sku: "PRD6677", price: 33, quantity: 1 }
    ]
}
```

*Example of `[]` syntax.*

*plans table*
id | name | subPlans\[\] 
---|---|---
DB | Retirement | retirementPlans
SDB | Special Retirement | specialRetirementPlans
HSA | HSA Savings | savingsPlans:type=HSA
FSA | FSA Savings | savingsPlans:type=FSA
MISC | Misc Savings | savingsPlans:type=MISC
SIMPLE | Simple (no subPlans) |

*retirementPlans/child-only table*
id | name
---|---
1 | Plan 1
2 | Plan 2
3 | Plan 3

*specialRetirementPlans/child-only table has no rows*

*savingsPlans/child-only table - with no MISC type rows*
id | name | type
---|---|---
HSA-1 | Savings 1 | HSA
HSA-2 | Savings 2 | HSA
HSA-3 | Savings 3 | HSA
FSA-1 | Savings 1 | FSA

This CalcEngine nesting configuration would result in the following JSON

```javascript
// Since /child-only was used on all child tables, their results are not exported
{
    plans: [
        {
            "@id": "DB",
            name: "Retirement",
            subPlans: [
                { "@id": 1, name: "Plan 1" },
                { "@id": 2, name: "Plan 2" },
                { "@id": 3, name: "Plan 3" }
            ]
        },
        {
            "@id": "SDB",
            name: "Special Retirement"
        },
        {
            "@id": "HSA",
            name: "HSA Savings",
            subPlans: [
                { "@id": "HSA-1", name: "Savings 1" },
                { "@id": "HSA-2", name: "Savings 2" },
                { "@id": "HSA-3", name: "Savings 3" }
            ]
        },
        {
            "@id": "FSA",
            name: "FSA Savings",
            subPlans: [
                { "@id": "FSA-1", name: "Savings 1" }
            ]
        },
        {
            "@id": "MISC",
            name: "Misc Savings"
        },
        {
            "@id": "SIMPLE",
            name: "Simple (no subPlans)"
        }
    ]
}
```

Notes about nesting:

1. A parent table can have more than one property column configured as a nesting column.
2. Nesting can be configured to nest 1..N levels deep.
3. If no child rows are present, the property is simply removed from the parent row.  There *is not* an empty array property specified.
4. When using `[]`, no nesting is attempted if no column value is provided, if `childTable` is provided, but that table has no rows, or if applying the `childKeyColumn=value` filter results in no rows.
5. When using `[childTable:childKeyColumn]`, no nesting is attempted if no column value is provided or if the `childKeyColumn` has no row matching the column value.
6. By default, tables that are the 'child' tables of a nest configuration are still exported as root level table rows.  If the data should _only_ appear in the nested relationship, the `child-only` table flag can be used to supress the normal exporting process.

<br/>

#### table-output-control

Provide a single table with logic that controls whether or not a table is exported without the need placing logic in every row's `on` column of desired table.

Column | Description
---|---
id | The name of the table to control.
export | Whether or not the table is exported.  A value of `0` prevents the table from being exported.

#### colgroup Processing

The first row returned by the `rbl-source` table is used to build the `colgroup` element inside the `table` element.  For each `text*` and `value*` column it generates a `col` element as`<col class="{table}-{column}">`.  Additional width processing is desribed in the [Columns Widths](#Columns-Widths) section.

#### Header Rows

The `id` and `code` columns are used to detect header rows.  Row ids do _not_ have to be unique.  However, the only time they possibly shouldn't be unique is when they are identifying header rows.  Otherwise, you cannot guarantee selecting the proper row if used in a selector path.  If the `id`/``code` column is `h`, starts with `hdr` or starts with `header`, then the cell element will be a `th` (header), otherwise it will be a `td` (row).

All 'header' rows processed before the _first_ non-header row is processed will be placed inside the `thead` element, after which, all remaining rows (data and header) will be placed inside the `tbody` element.

#### Automatic Column Spanning

For header rows, if only one column has a value, it automatically spans all columns.

#### Manual Column Spanning

The `span` column is used to define column spanning in the format of `columnName:spanCount[:columnName:spanCount]`

Each span definition is a column name followed by a colon and how many columns to span. If you need to control more than one grouping of spans, you can put as many definitions back to back separated by colons as needed.

Additionally, when a column span definition is processed, the resulting table cell has an additional CSS class of `span-{table}-{column}`.

**Examples**  
Span `text1` all three columns in a three cell table: `text1:3`  
Span `text1` 1 column and `value1` 2 columns in a three cell table: `text1:1:value1:2`

**Note:** When using the `span` column, the total number of columns spanned/configured must equal the total number of columns in the table even if the span configuration directs several columns to 'span' only one column (which is counter intuitive since that really isn't 'spanning').

**Example:**  
If you have table with columns `text1`, `value1`, `value2`, and `value3` and you want `text1` to span the first two columns and then `value2` and `value3` render their contents appropriately, the following applies to the span column:

_Wrong:_ `text1:2` - setting this will only generate one cell spanning two columns, but leaving the third and fourth columns unrendered.

_Correct:_ `text1:2:value2:1:value3:1` - you must explicitly set all columns for the row. The sum of columns by this configuration is four which equals the total number of columns in the table.  

#### Column Widths

Column widths can be provided in three ways.  Absolute width, percentage width, or bootstrap class widths.  If **any** bootstrap class widths are provided, or if the `data-css` attribute provided for a table contains `table-responsive`, then bootstrap widths are used.  Otherwise, the `width` column is used and is deemed a percentage if the value ends with a `%` sign.

**Absolute or Percentage Widths**
When using absolute or percentage widths, the `width` value is applied to the `col` element inside the `colgroup`.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: { #test: "First", width: "100" }, 
        text2 { #test: "Last", width: "200" }, 
        value1: { #test: "DOB", width: "100" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1" width="100px">
    <col class="foundingfathers-text2" width="200px">
    <col class="foundingfathers-value1" width="100px">
</colgroup>
```

**Bootstrap Widths**
When using bootstrap widths, the `width` value is applied to the `col` element inside the `colgroup` and on every row.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: { #test: "First", xs-width: "12", lg-width="3" }, 
        text2 { #test: "Last", xs-width: "12", lg-width="3" }, 
        value1: { #test: "DOB", xs-width: "12", lg-width="3" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1 col-xs-12 col-lg-3">
    <col class="foundingfathers-text2 col-xs-12 col-lg-3">
    <col class="foundingfathers-value1 col-xs-12 col-lg-3">
</colgroup>
```

### Highcharts Template Processing

There are three types of chart information returned from CalcEngines: KatApp specific `config-*` options, chart and series options (matching the Highcharts API), and data.

```html
<!-- Rendered HTML before ResultBuilder Framework processing -->
<div class="text-center" rbl-tid="chart-highcharts" rbl-chartdata="SavingsChart" rbl-chartoptions="Pie">
    <div class="chart chart-responsive"></div>
</div>
```

By default, all 'option values' come from the table with the name of `Highcharts-{rbl-chartoptions}-Options`.  The CalcEngine developer may provide overrides to these values using the `Highcharts-Overrides` table.

To see all the options available for charts and series, please refer to the [Highcharts API](#https://api.highcharts.com/highcharts/)

### CalcEngine Table Layouts

The tables used to produce Highcharts in a Kaml view are mostly 'key/value pair' tables.  The three tables in use are `Highcharts-{rbl-chartoptions}-Options`, `Highcharts-{rbl-chartdata}-Data`, and `Highcharts-Overrides`.  Note that if `rbl-chartoptions` attribute is not provided, `rbl-chartdata` will be used as the 'name' for both the options and the data table.

#### Highcharts-{rbl-chartoptions}-Options

Provides the options used to build the chart.  Either [Custom Chart Options](#Custom-Chart-Options) or [Standard Chart Options](#Standard-Chart-Options).  If the option name starts with `config-`, it is Custom ResultBuilder Framework option, otherwise it is a standard Highcharts option.  If it is a [standard option](#Standard-Chart-Options), it is a `period` delimitted key that matches the Highcharts API object hierarchy.

Column | Description
---|---
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#Property-Value-Parsing) for allowed values.

<br/>

#### Highcharts-{rbl-chartdata}-Data

Provides the data and _series configuration_ to build the chart.  If the category name starts with `config-`, it is a row that provides [Standard Highchart Series Options](#Standard-Highchart-Series-Options) for each series in the chart, otherwise, the category name represents the data values for each series in the chart.

Column | Description
---|---
category | Either a series configuration 'key' (see [Custom](#Custom-Series-Options) and [Standard](#Standard-Series-Options) series options), data category/name or X-Axis value for the current data point.  For all charts, `category` is used in the `id` property of the data point in the format of `seriesN.category` (which is helpful for [chart annotations](https://api.highcharts.com/highcharts/annotations)).  For charts of type `pie`, `solidgauge`, `scatter3d` or `scatter3d`, `category` is the 'name' used for each category and, it is part of the `id` _and_ it is used for the 'name' of the data point, which is leveraged by the built in label formatter.
seriesN | A column exists for each series in the chart to provide the 'value' of that series for the current row (i.e. `series1`, `series2`, and `series3` for a chart with three series).
point.seriesN.propertyName | Custom data point properties to be applied for each data point.  `seriesN` should match desired series' column name and `propertyName` should match an available property name for the chart's data points.  See [series](https://api.highcharts.com/highcharts/series) documentation and look at the `data` array property for each series type to learn more about available properties for each chart type.
plotLine | Provide [plot line information](https://api.highcharts.com/highcharts/xAxis.plotLines) for the given data row.  The value is in the format of `color\|width\|offset`.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.
plotBand | Provide [plot band information](https://api.highcharts.com/highcharts/xAxis.plotBands) for the given data row.  The value is in the format of `color\|span\|offset`.  `span` is either `lower` meaning the band fills backwards, `upper` meaning it fills forwards, or a number value for how many X-Axis values to span.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.

<br/>

#### Highcharts-Overrides

Similar to [`Highcharts-{rbl-chartoptions}-Options`](#Highcharts-{rbl-chartoptions}-Options), this table provides the options used to build the chart, but it overrides any option `keys` matching the original `Highcharts-{rbl-chartoptions}-Options` table.  This is useful if several charts have the same values for the majority of the properties and use the same `Highcharts-{rbl-chartoptions}-Options` table as a base setup.  Then you can provide overrides for each property that varies from the shared options setup.

Column | Description
---|---
id | The name of the chart whose values will be overridden.  `id` needs to match the `rbl-chartoptions` attribute value.
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#Property-Value-Parsing) for allowed values.

<br/>

### Custom Chart Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework, meaning, they do not map to the Highcharts API.

Configuration&nbsp;Setting | Description
---|---
config-style | By default, the Highcharts template has no style applied to the `<div class="chart chart-responsive"></div>` element.  If, the CalcEngine wants to apply any CSS styles (i.e. height and width), the config-style value
config-tooltipFormat | When tooltips are enabled, there is a default `tooltip.formatter` function provided by KatApps where this value provides the template to apply a `string.format` to.  For example `<b>{x}</b>{seriesDetail}<br/>`<br/><br/>The available substitution tokens are `x` (current X-Axis value), `stackTotal` (sum of all Y-Axis values at this current `x` value), and `seriesDetail` (list of all Y-Axis points in format of `name: value`).  For more information see [tooltip.formatter API](https://api.highcharts.com/highcharts/tooltip.formatter) and [Highchart Value Parsing](#Highcharts-Value-Parsing).

### Standard Chart Options

Standard chart option names provided by `key` columns are a `period` delimitted value meant to represent the Highcharts API object hierarchy.  

For example, given:
id | value
---|---
chart.title.text | My Chart

<br/>
The following Hicharts configuration would be created:

```javascript
{
    chart: {
        title: {
            text: "My Chart"
        }
    }
}
```

If the Highcharts API object property is an array, you can set specific array elements as well using an `[]` syntax.  

For example, given:
id | value
---|---
plotOptions.pie.colors[0] | Red
plotOptions.pie.colors[1] | Blue

<br/>
The following Hicharts configuration would be created:

```javascript
{
    plotOptions: {
        pie: {
            colors: [
                "Red",
                "Blue"
            ]
        }
    }
}
```

Another example assigning [annotations](https://api.highcharts.com/highcharts/annotations):

For example, given:

id | value
---|---
annotations[0].labels[0] | json:{ point: 'series1.69', text: 'Life Exp' }

<br/>
The following Hicharts configuration would be created:

```javascript
{
    annotations: [
        {
            labels: [
                { 
                    point: 'series1.69', 
                    text: 'Life Exp' 
                }
            ]
        }
    ]
}
```

### Custom Series Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework for Highchart series, meaning, they do not map to the Highcharts API.

Series options are created by having a row in the `Highcharts-{rbl-chartdata}-Data` table with a `category` column value starting with `config-`.  Then the values in every `seriesN` column in the row represent the configuration setting for _that_ series.

Configuration&nbsp;Setting | Description
---|---
config-visible | You can disable a series from being processed by setting its `config-visible` value to `0`.
config-hidden | Similar to `config-visible` except, if hidden, the series is _processed_ in the chart rendering, but it is not displayed in the chart or the legend.  Hidden series are essentially only available for tooltip processing.
config-format | Specify a format to use when display date or number values for this series in the tooltip.  See Microsoft documentation for available [date](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings) and [number](https://docs.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings) format strings.

<br/>

An example of how these might look in a CalcEngine result table.

category | series1 | series2 | series3 | series4
---|---|---|---|---
config&#x2011;visible | 1 | 1 | 1 | 0
config-hidden | 0 | 0 | 1 | 1
config-format | c2 | c2 | c2 | c2

<br/> 

This table would result a chart with `series1`, `series2`, and `series3` being processed.  `series3` would not be visible in the chart or legend, but would be displayed in the tooltip.  Each of the processed series would display values in $0.00 format.

### Standard Series Options

In addition to the Custom Series Options, if you need to apply any Highcharts API options to the series in the chart, you accomplish it in the following manner.

Configuration&nbsp;Setting | Description
---|---
config-* | Every row that starts with `config-` but is not `config-visible`, `config-hidden` or `config-format` is assumed to be an option to assign to the Highcharts API for the given series.  `*` represents a `period` delimitted list of property names.  See [Standard Chart Options](#Standard-Chart-Options) for more information on API property naming.

Example of settings used for KatApp Sharkfin Income chart.

category | series1 | series2 | series3 | series4 | series5 | series6
---|---|---|---|---|---|--
config-name | Shortfall | 401(k) Plan | Non Qualified Savings Plan | HSA | Personal Savings | Retirement Income  Needed
config-color | #FFFFFF | #006BD6 | #DDDDDD | #6F743A | #FD9F13 | #D92231
config-type | areaspline | column | column | column | column | spline
config-fillOpacity | 0 |||||			
config&#x2011;showInLegend | 0 | 1 | 1 | 1 | 1 | 1

<br/>

The following Hicharts configuraiton would be created:

```javascript
{
    series: [
        {
            name: "Shortfall",
            color: "#FFFFFF",
            type: "areaspline",
            fillOpacity: 0,
            showInLegend: 0,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "401(k) Plan",
            color: "#006BD6",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Non Qualified Savings Plan",
            color: "#DDDDDD",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "HSA",
            color: "#6F743A",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Personal Savings",
            color: "#FD9F13",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Retirement Income Needed",
            color: "#D92231",
            type: "spline",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        }
    ]
}
```

See [series](https://api.highcharts.com/highcharts/series) documentation to learn more about available series properties for each chart type.

### Property Value Parsing

Value columns used to set the Highcharts API option values allow for several different formats of data that are then converted into different types of properties values.

Value&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | API&nbsp;Value&nbsp;Type | Description
---|---|---
`blank` or `null` | `undefined` | If no value or value of `null` (case insensitive) is returned, `undefined` will be assigned to the property value.
numeric | numeric | If the value returned can be parsed into a number, a numeric value will be assigned to the property value.
`true` or `false` | boolean |  If a value of `true` or `false` (case insensitive) is returned, a `boolean` value will be assigned to the property value.
`json:{ name: value }` | object | If a value starting with `json:` is returned, the json text will be parsed and the resulting object will be assigned to the property value.
`eval [1,2]` | any | If a value starting with `eval ` is returned, the text following the `eval` prefix is _parsed and evaluated_ as Javascript and the resulting value (can be any type) is assigned to the property value.  In the example shown here, an integer array of `[1,2]` would be assigned to the property.  Assigning properties of type array are most common use of this syntax.
`function () { ... }` | function: any | For API properties that can be assigned a function, if a value starting with `function ` is returned, it will be parsed as a valid function and assigned to the property.

<br/>

### Language Support

The 'culture' of the table can be set via the CalcEngine.  If the results have a `variable` row with `id` of 'culture', then the language preference will be set to the `value` column of this row.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  By default, `en-US` is used.

## Advanced Configuration

KatApps have advanced features that can be configured that provide expression capabilities, manage input handling (via attributes), CalcEngines (via Precalc Pipelines) and hooking into the calculation lifecycle events.

### RBLe Service Attributes / Classes

By decorating elements with specific CSS class names<sup>1</sup>, RBLe Service functionality can be controlled.

Class | Purpose
---|---
rbl&#x2011;nocalc<br/>skipRBLe<sup>2</sup> | By default, changing any `<input>` value in the view will sumbit a calc to the RBLe service.  Use this class to supress submitting a calc.  Note this input will still be included in calcuations, but that changing it does not initate a calc.
rbl&#x2011;exclude<br/>notRBLe<sup>2</sup> | By default, all inputs in the view are sent to RBLe calculation.  Use this class to exclude an input from the calc.  This will also prevent this input from initating a calc on change.
rbl&#x2011;preserve | Use this class in child elements beneath `[rbl-source]` so that when the element is cleared on each calculation, an element with class 'rbl-preserve' will not be deleted.
 
\
<sup>1</sup> Future versions of KatApp's may move these classes to attributes.  
<sup>2</sup> Legacy class name.  Prefer using the current class name when possible.  

### Precalc Pipelines
Precalc CalcEngines simply allow a CalcEngine developer to put some shared logic inside a helper CalcEngine that can be reused.  Results from each CalcEngine specified will flow through a pipeline into the next CalcEngine.  Precalc CalcEngines are ran in the order they are specified ending with the calculation of the Primary CalcEngine.

The format used to specify precalc CalcEngines is a comma delimitted list of CalcEngines, i.e. `CalcEngine1,CalcEngineN`.  By default, if only a CalcEngine name is provided, the input and the result tab with the *same* name as the tabs<sup>1</sup> configured on the primary CalcEngine will be used.  To use different tabs, each CalcEngine 'entity' becomes `CalcEngine|InputTab|ResultTab`.  

By specifying precalc CalcEngine(s), the flow in RBLe Service is as follows.

1. Load all inputs and data into precalc CalcEngine and run calculation.
2. Any tables returned by the configured result tab<sup>1</sup> are then passed to the next CalcEngine in the pipeline as a *data* `<history-table>` on the input tab.

<sup>1</sup> For precalc CalcEngines, only one result tab is supported.

#### Sample 1: Two precalc CalcEngines
Configure two CalcEngines to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE and LAW_Wealth_Helper2_CE both use the same tabs configured on LAW_Wealth_CE.

```html
<div id="KatApp-wealth" 
    class="KatApp" 
    rbl-view="LAW:WealthDashboard" 
    rbl-calcengine="LAW_Wealth_CE"
    rbl-precalcs="LAW_Wealth_Helper1_CE,LAW_Wealth_Helper2_CE"></div>
```

#### Sample 2: Custom CalcEngine Tabs
Configure two CalcEngines with different tabs to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE specifies custom tabs, while LAW_Wealth_Helper2_CE uses same tabs configured on LAW_Wealth_CE.

```html
<div id="KatApp-wealth" 
    class="KatApp" 
    rbl-view="LAW:WealthDashboard" 
    rbl-calcengine="LAW_Wealth_CE"
    rbl-precalcs="LAW_Wealth_Helper1_CE|RBLInput|RBLHelperResults,LAW_Wealth_Helper2_CE"></div>
```

# KatApp API

This section describes all the properties, methods and events of the KatApp API.  All methods and property getters can be called via jQuery plugin sytnax or by obtaining a reference to the KatApp and accessing them directly from the object.  jQuery plugin syntax is when you provide the method/property name as the first param to the plugin method.

When using the jQuery plugin syntax, if a method that has no return value is being called, it will be called on every KatApp that matches the selector.  If a property or method that returns data is being called, it will execute the property or method on the _first_ KatApp that matches the supplied selector.

When calling the plugin method with no parameters `.KatApp()`, if the _first_ KatApp matching the supplied selector has already been initialized, the plugin method will _return_ the KatApp object of the _first_ matching KatApp.  Otherwise, it will attempt to initialize all matching KatApps using the default options.

```javascript
// jQuery plugin syntax 
var results = $(".katapp").KatApp("results");

// direct object access
var application = $(".katapp").KatApp(); // reference to the KatApp object
var results = application.results;

// or get result for first KatApp matching the .katapp selector
var results = $(".katapp").KatApp().results;

// jQuery plugin syntax
$(".katapp").KatApp("saveCalcEngine", "first.last");

// direct object access
$(".katapp").KatApp().saveCalcEngine("first.last");
```

## KatApp Object Properties

Property | Type | Description
---|---|---
id | string | The unique id generated for KatApp.
element | DOM Element | The Document Object Model (DOM) element that represents the KatApp.  All input and result processing are scoped to this DOM Element.  CSS style should be scoped as well.  See [View Scoping](#View-Scoping) for more information about scoping inside Kaml Views.
options | [KatAppOptions](#KatAppOptions-Object) | The options currently in use by the KatApp.
results | [TabDef](#TabDef-Object)[] | Contains the results from the last calculation submission.  If an error occurs during submission, this will be set to `undefined`
calculationInputs | [CalculationInputs](#CalculationInputs-Object) | Contains all the input and input tables used during the last calculation submission.
exception | [CalculationException](#CalculationException-Object) | If an exception occurs inside the RBLe Service, a `CalculationException` object is returned with exception details.

<br/>

### KatAppOptions Object

When a KatApp is initialized via `$(".katapp").KatApp( options );`, the `options` object has the following settings.

Property | Type | Description
---|---|---
debug | [DebugOptions Object](#DebugOptions-Object) | Assign properties that control debugging capabilities.
view | string | Assign the Kaml View to use in this KatApp in the form of `Folder:View`.
inputCaching | boolean | Whether or not inputs should automatically persist and restore from `Storage`.
userIdHash | string | Optional hashed User ID to use as a key in different storage situations.
inputSelector | string | A jQuery selector that specifies which inputs inside the view are considers RBLe Calculation Service inputs.  By default, _all_ inputs are selected via a selector of `input, textarea, select`.
viewTemplates | string | A `comma` delimitted list of Kaml Template Files to use in the form of `Folder:Template,Folder:Template,...`.
ajaxLoaderSelector | string | A jQuery selector that indicates an item to show at the start of calculations and hide upon completion.  By default, `.ajaxloader` is used.
handlers | object | An object containing functions that will be assigned via [rbl-on Event Handlers](#rbl-on-Event-Handlers).
calcEngines | [CalcEngine](#CalcEngine-Object)[] | An array of CalcEngine objects specifying which CalcEngine(s) should drive the current Kaml View.
manualResults | [TabDef](#TabDef-Object)[] | Provide manual results that should _always_ be merged with calculation results (or used as the sole calculation results if the KatApp does not have a CalcEngine), they can be assigned here.  These results can be generated and used during prototyping of the Kaml file before the CalcEngine is ready, or can suppliment CalcEngine results if some data that is needed in the Kaml file is/can be generated from code.  When referencing these results in [Kaml Markup selectors](#Multiple-CalcEngines-and-Result-Tabs), use `rbl-ce="ManualResults"`.
manualInputs | [OptionInputs](#OptionInputs-Object) | Provide inputs that should _always_ be passed in on a calculation but aren't available in the UI, they can be assigned here.
defaultInputs | [OptionInputs](#OptionInputs-Object) | Provide default inputs to use when the KatApp is initialized or updated via [method calls](#KatApp-Methods) .  `defaultInputs` are only applied one time.
registerDataWithService | boolean | Whether or not data will be registered with the RBLe Service.  Default value is `true`.  If true, usually the `registeredToken` is passed in, but it can be created via an event handler triggered during the calculation lifecycle.  If false, the `data` property is usually passed in, but it can be created via an event handler triggered during the calculation lifecycle.
registeredToken | string | If the participant data was registered by hosting site, it will provide the `registeredToken` to the KatApp so that it can pass that to the RBLe Service during calculation ajax calls.
data | [KatAppData](#KatAppData-Object) | Participant data to pass to RBLe Service for calculations.
shareDataWithOtherApplications | boolean | If multiple KatApps on are on page, one data source can be shared across all KatApps by setting this to `true`.
sessionUrl | url | When `registerDataWithService` is `true`, this url will be called for calculation ajax calls.  Default value is `/services/evolution/Calculation.ashx`.
functionUrl | url | This url is used for all resource requests and also, if `registerDataWithService` is `false`, all calculation ajax calls.  Default value is `/services/evolution/CalculationFunction.ashx`.
currentPage | string | String identifier for the current page.  This value is passed to CalcEngines in the `iCurrentPage` input.
requestIP | string | IP Address of client browser.  Used during calculation job logging.
environment | string | The environment the current Kaml View is running in.  This value is passed to CalcEngines in the `iEnvironment` input.
currentUICulture | string | The current culture the Kaml View is being rendered under.  This value is passed to CalcEngines in the `iCurrentUICulture` input.
relativePathTemplates | [RelativePathTemplates](#RelativePathTemplates-Object) | Configure views and relative paths when Kaml View files are located in the hosting site instead of the Kaml View CMS
getData | [GetDataDelegate](#GetDataDelegate-Object) | If data is retrieved from the client browser (instead of provided from server side code), a handler can be provided.  Typically, if a handler is provided, it is calling a API Endpiont from the host application to get the data.  In some cases, the data can be generated with javascript if the KatApp is a generic tool that does not need real data.
registerData | [RegisterDataDelegate](#RegisterDataDelegate-Object) | If the data is registered from the client side browser (usually after the `getData` handler was called), a handler can be provided to register the data with the RBLe Service.  Typically, if a handler is provided, it is calling a API Endpoint from the host application that is performing some service side code before registration with RBLe Service.
submitCalculation | [SubmitCalculationDelegate](#SubmitCalculationDelegate-Object) | Provide a custom handler to submit calculations if needed.  Typically, if a handler is provided, it is calling an API Endpoint because data was registered in RBLe Service session with a call to the `registerData` endpoint handler and the `submitCalculation` endpoint is needed to access the session/cookie of the RBLe Service on subsequent calls.
<br/>

### DebugOptions Object

The following properties are available on the `DebugOptions` object, some of which can be set with query string values.

Property | Type | Description
---|---|---
traceVerbosity | TraceVerbosity | Set the minimum allowed trace level to be displayed.  Values are : `None`, `Quiet`, `Minimal`, `Normal`, `Detailed`, or `Diagnostic`.
debugResourcesDomain | string | Set the base domain/url to use if provided when attempting to find local resource files.  By default, the `localserver=` querystring will set this value.
saveConfigureUiCalculationLocation | string | Signals to the RBLe Service that the ConfigureUI calculation should save a debug CalcEngine to this location.  By default, the `saveConfigureUI` querystring will set this.
refreshCalcEngine | boolean | If `true`, it signals to the RBLe Service to check for new CalcEngines from the CalcEngine CMS immediately instead of waiting for cache to expire.  By default, the `expireCE=1` querystring will set this to true.
useTestCalcEngine | boolean | Whether or not the RBLe Service should use the test version of a CalcEngine (if it is present).  By default, the `test=1` querystring will set this to true.
useTestView | boolean | Whether or not the Kaml View CMS should use the test version of a Kaml View (if it is present).  By default, the `testView=1` querystring will set this to true.  If `relativePathTemplates` is configured in the [KatAppOptions Object](#KatAppOptions-Object), this setting is ignored.
useTestPlugin | boolean | Whether or not the Kaml View CMS should use the test version of the KatAppProvider.js file (if it is present).  By default, the `testPlugin=1` querystring will set this to true.
showInspector | boolean | Whether or not the Kaml View will highlight elements that have `rbl-value`, `rbl-source`, and `rbl-display` attributes to aid in debugging.  By default, the `showInspector=1` querystring sets this to true.

<br/>

### CalcEngine Object

Property | Type | Description
---|---|---
key | string | Unique identifier for a CalcEngine that can be used in the `rbl-ce` attribute of elements.  The first CalcEngine configured will default to `default` if no `key` is provided.  All subsequent CalcEngines require a `key` property.
name | string | The name of the CalcEngine.
inputTab | string | The name of the input tab to process during calculations.  The default value is `RBLInput`.
resultTabs | string[] | The names of the result tabs to process during the calculations.  The default value is `[ "RBLResult" ]`.
preCalcs | string | The [Precalc Pipelines](#Precalc-Pipelines) configuration for the CalcEngine.

<br/>

### OptionInputs Object

The OptionInputs object is just a json object with multiple key/value properties configured.  The `key` matches an input name on the Kaml View.

```javascript
// Sample configuration with manualInputs set.
{
    manualInputs: {
        iInput1: "Input1 Value",
        iInput2: "Input2 Value"
    }
}
```

### KatAppData Object

The KatAppData object is a json object representing all the data for the current participant.

```javascript
// Sample configuration with data set.
{
    data: {
        AuthID: "11111111",
        Client: "ABC",
        Profile: {
            nameFirst: "John",
            nameLast: "Smith",
            dateBirth: "1973-05-09"
        },
        History: {
            Pay: [
                { id: 2020, amount: 120000 },
                { id: 2022, amount: 140000 }
            ],
            Status: [
                { id: 2020, status: AC },
                { id: 2022, status: RT }
            ]
        } 
    }
}
```

### RelativePathTemplates Object

The RelativePathTemplates object is usually configured by the hosting site if Kaml View files are present locally instead of in the Kaml View CMS.  It is just a json object with multiple key/value properties configured.  The `key` is the name of the Kaml View while the `value` is the relative path.

```javascript
// Sample configuration with relativePathTemplates set.
{    
    relativePathTemplates: {
        {"Nexgen:Nexgen.Templates":"Rel:KatApp/Nexgen/Nexgen.Templates.kaml?c=20210222223426"}
    }
}
```

Note the `Rel:` prefix on the path.  That indicates to the KatApp provider that the Kaml View is a relative path to the hosting site instead of the `Folder:Name` used to query the Kaml View CMS.  When relativePathTemplates are configured, the `view` must also be set to a relative path.

### TabDef Object

A TabDef is a json object representation of all the tables exported from a RBLResult tab.

```javascript
{
    "@calcEngine": "ABC_CalcEngine_SE.xlsm",
    "@version": "1.0047",
    "@name": "RBLResult", // TabDef name
    "@GlobalTables.Version": "1.0",
    "@Helpers.Version": "1.0",
    "@type": "ResultXml", // Always ResultXml for KatApp calculations
    "rbl-value": [
        { id: "outputId1", value: "Text to display" },
        { id: "outputId2", value: "Different text to display" }
    ],
    ... // More tables
}
```

### CalculationInputs Object

The CalcualtionInputs object extends the OptionInputs object simply by adding a `InputTables` property.

```javascript
// Sample configuration with manualInputs set.
{
    InputTables: [
        { 
            "Name": "tableName", 
            "Rows": [
                { index: "1", value1: "200", value2: "300"  }, 
                { index: "2", value1: "300", value2: "400"  }, 
                { index: "3", value1: "400", value2: "500"  }
            ]
        },
        ... // More tables as needed
    ],
    iInput1: "Input1 Value",
    iInput2: "Input2 Value"
}
```

See RBLe Service [Input Table Management](#Input-Table-Management) for more information.

### CalculationException Object

A CalculationException is a json object representation of any exception that occurs inside the RBLe Service.

```javascript
{
    Exception: {
        Message: "String message explaining the exception.",
        StackTrace: "The call stack trace at the moment when the exception was thrown."
    }
}
```

### GetDataDelegate Object

The `getData` property is a delegate handler with the following signature.

**`function( application: KatAppPlugInInterface, options: KatAppOptions, done: ( data: KatAppData ), fail: ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ) )`**

```javascript
// By default, the KatApp framework will return a 'dummy' data object to support any KatApps that do not need personal information
{
    getData: function( appilcation, options, done ) { 
        done( {
            AuthID: "Empty",
            Client: "Empty",
            Profile: {} as JSON,
            History: {} as JSON
        });
    }
}

// Sample application that calls API endpoint relative to containing site
{
    getData: function( application, options, done, fail ) {
        $.ajax({
            url: pURL('/rks/benefits/services/sharkfin/db/data.htm'),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .done( function ( payload ) { done( payload.payload ); } )
        .fail( fail );
    }
}
```

### RegisterDataDelegate Object

The `registerData` property is a delegate handler with the following signature.

**`function( application: KatAppPlugInInterface, options: KatAppOptions, done: ( data: KatAppData ), fail: ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ) )`**

```javascript
// Sample application that calls API endpoint relative to containing site.
{
    registerData: function( application, options, done, fail ) {
        $.ajax({
            url: pURL('/rks/benefits/services/sharkfin/db/guid.htm'),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .done( function ( payload ) { done( { registeredToken: payload.payload } ); } )
        .fail( fail );
    }
}
```

### SubmitCalculationDelegate Object

The `submitCalculation` property is a delegate handler with the following signature.

**`function( application: KatAppPlugInInterface, options: KatAppOptions, done: ( data: KatAppData ), fail: ( jqXHR: JQuery.jqXHR, textStatus: string, errorThrown: string ) )`**

```javascript
// Sample application that calls API endpoint relative to containing site.  Note that the KatApp framework 
// has built in code to look for a `.payload` property on the returned value to support legacy implementations
{
    submitCalculation: function( application, options, done, fail ) {
        $.ajax({
            url: pURL('/rks/benefits/services/sharkfin/db/calculate.htm'),
            data: JSON.stringify(options),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).done( done ).fail( fail );
    }
}
```

## KatApp Methods

Once you have a reference to a KatApp Object, there are many methods that can be called to read data, control lifecycle of KatApp, or perform debugging actions.

### KatApp Lifecycle Methods

The following methods control the lifecycle (create/destroy) and options of KatApps.

<hr/>

#### KatApp

**`.KatApp( options?: KatAppOptions )`**

Creates the KatApp.  See [Initializing and Configuring a KatApp](#Initializing-and-Configuring-a-KatApp) for more examples.

<hr/>

#### destroy

**`.destroy()`**

Removes the KatApp implementation from the targetted DOM element.  All event handlers registered by the KatApp and DOM attributes added by the KatApp are removed.

```javascript
$(".katapp").KatApp("destroy");
application.destroy();
```

<hr/>

#### rebuild

**`.rebuild( options?: KatAppOptions )`**

Merge the optional [KatAppOptions](#KatAppOptions-Object) `options` parameter with existing KatApp options, then completely destroy and re-initialize the KatApp (possibly using new view/templates) given the newly merged options.

When `.KatApp(options)` is called, if the selector returns items that already had KatApp created on it, the plugin will call this method.

Note: This method is typically only used by debugging/test harnesses, but could also could be used in a Single Page Application framework as well.

```javascript
$(".katapp").KatApp("rebuild", customOptions);
application.rebuild( customOptions);

// or, if no new options needed...
$(".katapp").KatApp("rebuild");
application.rebuild();
```

<hr/>

#### updateOptions

**`.updateOptions( options: KatAppOptions )`**

Merge the [KatAppOptions](#KatAppOptions-Object) `options` parameter with existing KatApp options.  This will not load new view or templates, but the CalcEngine or any other options could be updated.

If `.KatApp("ensure", options)` is called, items that did _not_ have a KatApp already created will go through normal creation and initialization process.  However, items that already had a KatApp created, will simply delegate to this method.

`updateOptions` _will_ apply `options.defaultInputs`, if present, immediately one time.

```javascript
$(".katapp").KatApp("updateOptions", updatedOptions);
application.updateOptions(updatedOptions);
```

<hr/>

#### ensure

**`.ensure( options?: KatAppOptions )`**

Create or update a KatApp.  It is similar to the `.KatApp()` method call, but it allows you to create _or update an existing_ KatApp in one method call.  This is useful when a KatApp is displayed in a modal dialog and you don't want to initialize it until the modal is displayed (maybe because inputs are being passed from the current version).  Additionally when they display the modal again, you don't want to have to destroy and re-recreate the KatApp.

_Note: This method should NOT be called by obtaining a reference to the KatApp and accessing it directly from the object because if the KatApp has not been created yet, there is no KatApp reference available._

```javascript
// Launch an IRP DST in a modal using many of the same options already in use by the current KapApp that is launching the IRP Kaml View

// clone current options and update with custom options needed for IRP (i.e. passing some inputs from the parent KatApp to the IRP KatApp)
var options =
    KatApp.extend({},
        application.options,
        {
            view: "DST:IRP",
            defaultInputs: {
                iInputsFromModeler: 1,
                iCurrentAge: application.getResultValue("variable", "iCurrentAge", "value") * 1,
                iAnnualFuturePayIncreaseRate: $(".iSalaryIncrease").val(),
                iAnnualPay: $(".iSalary").val(),
                iRetirementAge: $(".iRetAge").val(),
                iRetirementSavingsPct: application.getResultValue("variable", "iRetirementSavingsPct", "value") * 1
            }
        });

// Delete the 'calcEngines' property from the cloned options so that CalcEngine configuration is read from the IRP Kaml View
delete options.calcEngines;
$(".katapp-irp").KatApp("ensure", options);

// NOTE: This is wrong, never call ensure directly from a KatApp reference.  *Always* use the jQuery plugin syntax
$(".katapp-irp").KatApp().ensure(options);`
```

### KatApp Scoping Methods

The following methods allow developers to correctly scope DOM selector methods when programming against the KatApp model.

<hr/>

#### select

**`.select(selector: string, context?: JQuery | HTMLElement): JQuery`**

This is a replacement function for jQuery's default `$()` selector method.  It is needed scope the selection within the current KatApp (does not reach outside the KatApp markup) and also prevents selection from selecting **inside** a nested KatApp.

```javascript
// Get all inputs of my application (but none from nested KatApps or outside of my KatApp in container site)
application.select(":input");

// Get all inputs of my application within the address container
var address = application.select(".address")
application.select(":input", address);
```

<hr/>

#### closest

**`.closest(element: JQuery | HTMLElement, selector: string): JQuery`**

This is a replacement function for jQuery's default `$()` selector method.  It is needed scope the selection within the current KatApp (does not reach outside the KatApp markup - either to hosting site or a parent KatApp).

```javascript
var name = application.select(".iName");
var nameLabel application.closest(name, "label");
```

<hr/>

### KatApp Calculation Methods

The following methods allow developers to trigger calculations, get and set inputs, and get result information.

<hr/>

#### calculate

**`.calculate( calculationOptions?: KatAppOptions )`**

Manually invoke a calculation with the optional [KatAppOptions](#KatAppOptions-Object) `calculationOptions` parameter merged with the existing KatApp options for a one time use.

Note: The `calculationOptions` is _only_ used for this single calculation.

```javascript
$(".katapp").KatApp("calculate", calculationOptions);
application.calculate(calculationOptions);

// or, if no new options needed...
$(".katapp").KatApp("calculate");
application.calculate();
```

<hr/>

#### configureUI

**`.configureUI( calculationOptions?: KatAppOptions )`**

Manually invoke a ConfigureUI calculation (`iConfigureUI=1` and `iDataBind=1` will be passed to the CalcEngine) with the optional [KatAppOptions](#KatAppOptions-Object) `calculationOptions` parameter merged with the existing KatApp options for a one time use.

`calculationOptions` is _only_ used for this single calculation.

```javascript
$(".katapp").KatApp("configureUI", calculationOptions);
application.configureUI(calculationOptions);

// or, if no new options needed...
$(".katapp").KatApp("configureUI");
application.configureUI();
```

<hr/>

#### getInputs

**`.getInputs(): CalculationInputs`**

Returns a [CalculationInputs Object](#CalculationInputs-Object) representing all the inputs and input tables of the KatApp.

```javascript
var inputs = $(".katapp").KatApp("getInputs");
var inputs = application.getInputs();
```

<hr/>

#### setInputs

**`setInputs( inputs: OptionInputs, calculate?: boolean )`**

Applys all input values of the [OptionInputs](#OptionInputs-Object) `inputs` parameter to the KatApp.  If `calculate` is true, a calculation will be triggered after all inputs have been set.  By default, `calculate` is `true`.

```javascript
$(".katapp").KatApp("setInputs", newInputs);
application.setInputs(newInputs);

// or, to disable a calculation after applying values...
$(".katapp").KatApp("setInputs", newInputs, false);
application.setInputs(newInputs, false);
```

<hr/>

#### setInput

**`setInput( id: string, value: number | string | undefined, calculate?: boolean )`**

Set the value of the input identified by `id` with the `value` parameter.  If `calculate` is true, a calculation will be triggered after all inputs have been set.  **By default, `calculate` is `false`.**

```javascript
$(".katapp").KatApp("setInput", "iRetireAge", 65);
application.setInput("iRetireAge", 65);

// or, to trigger a calculation after setting value...
$(".katapp").KatApp("setInput", "iRetireAge", 65, true);
application.setInput("iRetireAge", 65, true);
```

<hr/>

#### getResultTable

**`getResultTable( tableName: string, tabDef?: string, calcEngine?: string): Array<JSON>`**

Get an array of `tableName` json objects representing each row returned in the calculation results.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

**Note**: This method is also available on the `calculationResults` object in event handlers.

```javascript
var payRows = $(".katapp").KatApp("getResultTable", "pay");
var payRows = application.getResultTable("pay");

// or, to get rows from the RBLPayResults tab on the first/only CalcEngine
var payRows = $(".katapp").KatApp("getResultTable", "pay", "RBLPayResults");
var payRows = application.getResultTable("pay", "RBLPayResults");

// or, to get rows from the RBLPayResults tab on the CalcEngine with a key=PayCE
var payRows = $(".katapp").KatApp("getResultTable", "pay", "RBLPayResults", "PayCE");
var payRows = application.getResultTable("pay", "RBLPayResults", "PayCE");
```

<hr/>

#### getResultRow

**`getResultRow( table: string, key: string, columnToSearch?: string, tabDef?: string, calcEngine?: string ): JSON`**

Get a json object representing a row from the `tableName` in the calculation results.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If `columnToSearch` is `undefined` or not provided, the row with its id column matching `key` will be returned.  Otherwise, the row with its `columnToSearch` column matching `key` will be returned.

**Note**: This method is also available on the `calculationResults` object in event handlers.

```javascript
// to get the row with id = 2021
var payRows = $(".katapp").KatApp("getResultRow", "pay", "2021");
var payRows = application.getResultRow("pay", "2021");

// or, to get the row with year = 2021
var payRows = $(".katapp").KatApp("getResultRow", "pay", "2021", "year");
var payRows = application.getResultRow("pay", "2021", "year");

// or, to get row with year = 2021 from the RBLPayResults on the first/only CalcEngine
var payRows = $(".katapp").KatApp("getResultRow", "pay", "2021", "year", "RBLPayResults");
var payRows = application.getResultRow("pay", "2021", "year", "RBLPayResults");

// or, to get row with year = 2021 from the RBLPayResults on the PayCE CalcEngine
var payRows = $(".katapp").KatApp("getResultRow", "pay", "2021", "year", "RBLPayResults", "PayCE");
var payRows = application.getResultRow("pay", "2021", "year", "RBLPayResults", "PayCE");
```

<hr/>

#### getResultValue

**`getResultValue( table: string, key: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined`**

Return the `column` value from the `table` row with the id column matching `key`.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If the value returned from the calculation result is `undefined`, the `defaultValue` (if provided) will be returned.

**Note**: This method is also available on the `calculationResults` object in event handlers.

```javascript
// to get the bonus value from pay row with id = 2021, defaulting to $0 if not available
var currentBonus = $(".katapp").KatApp("getResultValue", "pay", "2021", "bonus","$0");
var currentBonus = application.getResultValue("pay", "2021", "bonus", "$0");

// or, to get the bonus value from pay row with id = 2021, from the RBLPayResults on the first/only CalcEngine
var currentBonus = $(".katapp").KatApp("getResultValue", "pay", "2021", "bonus", undefined, "RBLPayResults");
var currentBonus = application.getResultValue("pay", "2021", "bonus", undefined, "RBLPayResults");

// or, to get the bonus value from pay row with id = 2021, from the RBLPayResults on the PayCE CalcEngine
var currentBonus = $(".katapp").KatApp("getResultValue", "pay", "2021", "bonus", undefined, "RBLPayResults", "PayCE");
var currentBonus = application.getResultValue("pay", "2021", "bonus", undefined, "RBLPayResults", "PayCE");
```

<hr/>

#### getResultValueByColumn

**`getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined`**

Return the `column` value from the `table` row with the `keyColumn` column matching `key`.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If the value returned from the calculation result is `undefined`, the `defaultValue` (if provided) will be returned.

**Note**: This method is also available on the `calculationResults` object in event handlers.

```javascript
// to get the bonus value from pay row with year = 2021, defaulting to $0 if not available
var currentBonus = $(".katapp").KatApp("getResultValueByColumn", "pay", "year", "2021", "bonus","$0");
var currentBonus = application.getResultValueByColumn("pay", "year", "2021", "bonus", "$0");

// or, to get the bonus value from pay row with year = 2021, from the RBLPayResults on the first/only CalcEngine
var currentBonus = $(".katapp").KatApp("getResultValueByColumn", "pay", "year", "2021", "bonus", undefined, "RBLPayResults");
var currentBonus = application.getResultValueByColumn("pay", "2021", "year", "bonus", undefined, "RBLPayResults");

// or, to get the bonus value from pay row with year = 2021, from the RBLPayResults on the PayCE CalcEngine
var currentBonus = $(".katapp").KatApp("getResultValueByColumn", "pay", "year", "2021", "bonus", undefined, "RBLPayResults", "PayCE");
var currentBonus = application.getResultValueByColumn("pay", "2021", "year", "bonus", undefined, "RBLPayResults", "PayCE");
```

#### pushResultRow

**`pushResultRow( table: string, row: object, tabDef?: string, calcEngine?: string ): void`**

Merges a row into the existing calculation results.  If the row `@id` is not present in existing results, the row is added.  If an existing row with the same `@id` exists, then the values from `row` are merged into existing calculation row.

This can be helpful if the javascript inside the Kaml view contains the logic on how to inject values that would be beneficial to use in other locations in the Kaml markup/templates.

**Note**: This method is also available on the `calculationResults` object in event handlers.

```javascript
    $(".katapp")
        .on("onResultsProcessing.RBLe", function (event, calculationResults, calculationOptions, application) {
            // push 'current page' into rbl-values for 'parent page' views/templates to use to render a link
            // to navigate to a 'target page'
            calculationResults.pushResultRow(
                "rbl-value",
                { "@id": "currentPage", "value": calculationOptions.currentPage.replace("lnkNexgenHost.", "") }
            );
            // if iReferrer input present (will be set via data-input-referrer 'parent page'), add to rbl-value
            // so 'target' page can use it to create a navigate back link
            calculationResults.pushResultRow(
                "rbl-value",
                { "@id": "referrerPage", "value": inputs.iReferrer || "" }
            );
        });
```

```html
<!-- 
    Parent page creates a link setting data-input-referrer to whatever is present in rbl-value.currentPage 
    and passes it along to Benefits.DependentUpdate
-->
<a rbl-navigate="Benefits.DependentUpdate" rbl-attr="data-input-referrer:currentPage">Navigate</a>

<!-- 
    Target page (Benefits.DependentUpdate) can now put a 'back' button to navigate back to whatever page
    brought the user here.  
-->
<button type="button" class="btn btn-secondary" rbl-attr="rbl-navigate:referrerPage">Cancel</button>
```

### KatApp Advanced Methods

<hr/>

#### apiAction

**`.apiAction( endpoint: string, customOptions?: KatAppActionOptions, actionLink?: JQuery<HTMLElement>, , done?: ( successResponse: KatAppActionResult | undefined, failureResponse: JSON | undefined )=> void )`**

KatApps have the ability to call web api endpoints to perform actions that need server side processing (saving data, generating document packages, saving calculations, etc.).  All api endpoints should return an object indicating success or failure.

```javascript
{
    Status: 1, // or 0 for failure
    Message: "Error Message to display", // Optional
    Validations: [ // Optional validation messages to display
        { ID: "iInput1", "Message" },
        { ID: "iInput2", "Message" }
    ],
    RBLeInputs: { } // Optional, see 'Web Api Endpiont Return Values' below for more info
}
```

`customOptions` can be provided and have the following properties.

Property | Type | Description
---|---|---
customParameters | JSON | Optional.  Any parameter values to be passed back to the server endpoint that are required for processing (i.e. plan id and document id for election required document upload).
customInputs | JSON | Optional.  Any input values that need to be passed back to the server endpoint and inserted into the input package sent to the RBLe Service calculation.

<br/>

```javascript
// hook up a click handler that generates a server side DocGen package for download
application.select(".downloadForms").on('click', function (e) {
    application.apiAction(
        "PensionEstimates.DocGen.Forms", 
        { 
            isDownload: true, 
            customInputs: 
            { 
                iDownloadForms: 1 
            } 
        }
    );
});
```

Kaml View developers can leverage calling API endpoints as well by constructing `rbl-action-link` links with appropriate attributes.

Attribute | Description
---|---
rbl-action-link | Used as the `endpoint` passed into `apiAction`.
rbl-action-download | (boolean) Determines if the action results in the downloading of a file.
rbl-action-calculate | (boolean) Determines if an `application.calculate()` should be called upon successful `api-action-link` execution.
data-param-* | Used as the `customParameters` property of the `customOptions` parameter and is used by server side API endpints.  (i.e. to pass `PlanId=value` parameter to server, use `data-param-plan-id="value"`, the parameter name will be created automatically to match server API endpoint parameter name pattern)
data-input-* | Used as the `customInputs` property of the `customOptions` parameter and passed to RBLe CalcEngine on server side calculation.  (i.e. to pass `iDownloadForms=1` parameter to server, use `data-input-download-forms="1"`, the 'input name' will be created automatically to match RBLe CalcEngine input name pattern)
rbl-action-confirm-selector | If the link should prompt before calling the endpoint, this attribute provides a jQuery selector to element containing the markup to display in a modal confirm dialog.

<br/>

Each `endpoint`/`rbl-action-link` can, and most likely will, have its own set of custom parameters or inputs.  To determine which values to pass, see the API endpoint documentation.

```html
<!-- Same as sample above in Javascript, create a link generates a server side DocGen package for download -->
<a rbl-action-link="rble/docgen" rbl-action-download="true" data-input-iDownloadForms="1" href="#">Download Forms</a>

<!-- Sample download of a static file -->
<a rbl-action-link="document-center/download" rbl-action-download="true" data-param-domain="SecureFile" data-param-filename="PlanDocument.pdf" class="download-file" href="#">Download SPD</a>

<!-- Sample enrollment kaml deleting a 'required document' that was uploaded -->
<a rbl-action-link="document-center/delete" rbl-action-confirm-selector="[data-required-document-prompt=\'delete\']" data-param-domain="RequiredDocument" data-param-documentid="{document-id}" class="delete-file" href="#">Delete</a>

<!-- 
Using input-fileupload template to support file uploads using the `data-command` attribute.  Current inputs from the 'entire KatApp' are passed as well, so endpoint code can use that as well to determine which type of document they are uploading.
-->
<div rbl-tid="input-fileupload" class="col-md-9" data-hidelabel="false" data-label="File Name" data-inputname="iUpload" data-rbl-action="retireonline/documents/upload"></div>
```

Note: There are API Endpoint lifecycle events that are triggered during the processing of an action.  See [KatApp Action Lifecycle Events](#KatApp-Action-Lifecycle-Events) for more information.

**Web Api Endpiont Return Values**

Api endpoints can return RBLe input information that should be injected on every subsequent calculation.  Note, these inputs are  cleared when an api endpoint return failure, or updated/set when an endpoint returns success.

To return input information from an endpoint to pass through to all subsequent calculations, return a `RBLeInputs` property in the format of:

```javascript
    RBLeInputs: {
        Inputs: { // Optional, provide a key/value object to have 'input' values injected into RBLe
            iApiInput1: "Value1",
            iApiInput2: "Value1",
        },
        Tables: { // Optional, provide tables in the following format to have 'input tables' injected into RBLe
            Table1: [ 
                { index: "1", col1: "2" }
                { index: "2", col1: "2" }
            ],
            Table2: [ 
                { index: "1", col1: "2" }
                { index: "2", col1: "2" }
            ]
        }
    }
```

<hr/>

#### serverCalculation

**`.serverCalculation( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> )`**

`serverCalculation` is shortcut method that calls `apiAction`.  The most common use for the need to call a 'server calculation' is when a calculation 'result' needs to be saved to storage.

```javascript
// Set up a click handler that calls a serverCalculation to save the calculated results to storage
application.select(".saveButtonAction").on('click', function (e) {
    application.serverCalculation({ iSaveInputs: 1, iCalculationName: application.select(".iCalculationName").val() }, $(this));
});

// The same functionality could be accomplished using the apiAction method call as well.
application.select(".saveButtonAction").on('click', function (e) {
    application.apiAction(
        "rble/calculation", 
        {
            customInputs: customInputs
        },
        $(this) 
    );
});
```

#### setNavigationInputs

**`.setNavigationInputs( inputs: {} | undefined, navigationId?: string, inputSelector?: string, persist?: boolean )`**

`setNavigationInputs` is primarily used as an internal helper, however, default inputs could be programmatically set if needed.  These inputs would be used after the next navigation in which a KatApp is rendered. If persist is `false`, the inputs will be used a single time.  If navigationId is `undefined`, then the inputs are applied globally and can not be persisted.

```javascript
// Set the iCurrentAge default (calculated from CE) to be used in next KatApp after navigation
view.on("onCalculationOptions.RBLe", function (event, calculationOptions, application) {
    const currentAge: application.getResultValue("defaults", "iCurrentAge", "value") * 1
    // No navigationId makes it global to all applications rendered
    application.setNavigationInputs( { "iEnableTrace": 1 } );
    // Set iCurrentAge for Sharkfin application only.
    application.setNavigationInputs( { "iCurrentAge": currentAge }, "Sharkfin" );
    // Set iCurrentAge for Sharkfin application only (only valid for next navigation to Sharkfin).
    application.setNavigationInputs( { "iCurrentAge": currentAge }, "Sharkfin", false );
});

// Create defaults from any input with .default-from-ce class (calculated from CE and assigned via rbl-defaults) 
// to be used in next KatApp after navigation
view.on("onCalculationOptions.RBLe", function (event, calculationOptions, application) {
    application.setNavigationInputs( undefined, undefined, false, ".default-from-ce" );
});
```

<hr/>

#### navigate

**`.navigate( navigationId: string, defaultInputs?: {} | undefined )`**

`navigate` can be programmatically called to navigate to a new KatApp/page.  It is equivalent to using [rbl-navigate](#rbl-navigate-Attribute-Details) attribute in markup.

Similar to a `rbl-navigate` link using `data-input-*` attributes to pass inputs, the `defaultInputs` parameter can be provided to pass along default inputs for the next KatApp.

```javascript
// Set up a click handler that calls a serverCalculation to save the calculated results to storage
application.select(".showProvider").on('click', function (e) {
    application.navigate( "Benefits.HPF", { iProviderTypeIds: "ABC,XYZ" });
});
```

<hr/>

#### pushNotification

**`.pushNotification(name: string, information: {} | undefined)`**

If multiple KatApps are on one page, KatApps can broadcast notifications to other KatApps.  Use this functionality when two KatApps are displaying the same data and one of them updates the data and the other KatApp needs to be notified to 'refresh'.

```javascript
// In the KatApp that wants to send the message...
// Hook up an event to save a calculation then notify other KatApps that are displaying information about saved calculations
application.select(".saveButtonAction").on('click', function (e) {
    application.serverCalculation({ iSaveInputs: 1, iCalculationName: application.select(".iCalculationName").val() }, $(this));
    application.pushNotification("SavePensionEstimate");
});

// In other KatApps that want to handle the message...
view.on( "onKatAppNotification.RBLe", function( event, name, information, application ) {
    switch( name ) {
        case "SavePensionEstimate":
        {
            // Just recalculate to render UI with updated data
            application.calculate();
            break;
        }
    }
});
```

#### createModalDialog

**`.createModalDialog(confirm: string | ModalDialogOptions, onConfirm: ()=> void, onCancel: ()=> void | undefined)`**

createModalDialog is a helper method to show a simple 'Continue' / 'Cancel' Bootstrap dialog on the screen.  If `onCancel` is not provided, the 'Cancel' button will not be displayed. If provided, the dialog will support pressing the `esc` key in addition to clicking the button.

```javascript
view.on("onActionResult.RBLe", function (e, endpoint, _jsonResponse, application) {
    if (endpoint == "ba7/update-withholding") {
        application.createModalDialog(
            "You bank information have been successfully updated.",
            function () {
                application.navigate("Pension.PaymentDetails");
            }
        );
    }
});
```

#### Controlling the Modal UI Options

By default, the following markup will be injected into the DOM when a modal dialog is created:

```html
<div class="modal fade katappModalAppDialog" tabindex="-1" role="dialog" bs-keyboard="false" bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header d-none hidden">
                <h5 class="modal-title"></h5>
                <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="modal-body">{Confirmation}</div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default cancelButton" aria-hidden="true">Cancel</button>
                <button type="button" class="btn btn-primary continueButton">Continue</button>
            </div>
        </div>
    </div>
</div>
```

A `ModalDialogOptions` object can be passed in to control the UI appearance of the dialog.  The `ModalDialogOptions` object can be constructed as follows:

```javascript
{
    confirmation: "Are you sure?", // Required
    labels: { // Optional
        continue: "OK", // Optional, change the continue button text
        cancel: "Abort", // Optional, change the cancel button text
        title: "Please Confirm" // Optional, if provided, the modal-header will be displayed with title and an 'X' to close the dialog.
    }
}
```

```javascript
// Sample modal confirm/cancel dialog using the ModalDialogOptions object
view.on("onActionResult.RBLe", function (e, endpoint, _jsonResponse, application) {
    if (endpoint == "ba7/update-withholding") {
        application.createModalDialog(
            {
                Confirmation: "Are you sure?",
                Labels: {
                    Continue: "OK",
                    Cancel: "Abort",
                    Title: "Please Confirm"
                }
            },
            function () {
                alert("Confirmed.");
            },
            function () {
                alert("Cancelled.");
            }
        );
    }
});
```


### KatApp Debugging Methods

The following methods are helpful for Kaml View or CalcEngine developers to aid in their debugging.  These methods are manually invoked via the browser's console window while working on the site.

<hr/>

#### saveCalcEngine

**`.saveCalcEngine( location: string | boolean, serverSideOnly?: boolean )`**

Save the *next successful* calculation's CalcEngine to the secure folder specified in the KAT Team's CMS.  Trigger the calculation by changing an input or manually calling the [`.calculate()`](#calculate) or [`.configureUI()`](#configureUI) methods.

Calling `saveCalcEngine` multiple times before a calculation is ran will save the CalcEngine to each location specified.  To clear out all locations specified, call `saveCalcEngine( false )`.

If the UI event that triggers a calculation calls an 'API Endpoint' or if a KatApp event handler calls the [`serverCalculation`](#serverCalculation) method, and upon success calls `application.calculate()` (i.e. data was updated on the server and a calculation is needed to refresh the UI), you may only want to save the next CalcEngine for the server side calculation.  To accomplish this, pass `true` into the optional `serverSideOnly` parameter.

```javascript
// Save the next CalcEngine to the 'terry.aney' folder
$(".katapp").KatApp().saveCalcEngine("terry.aney");

// Then call calculation or configureUI to trigger a calculation...
$(".katapp").KatApp().calculate();
// or... 
$(".katapp").KatApp().configureUI();

// Save the next CalcEngine to the 'terry.aney' and 'tom.aney' folders
$(".katapp").KatApp().saveCalcEngine("terry.aney");
$(".katapp").KatApp().saveCalcEngine("tom.aney");

// Then call calculation or configureUI to trigger a calculation...
$(".katapp").KatApp().calculate();

// Save the next Server Side Calculation CalcEngine to the 'terry.aney' folder, then trigger
// the UI event (via button/link click that triggers apiAction or serverCalculation)
$(".katapp").KatApp().saveCalcEngine("terry.aney", true);
```

<hr/>

#### refreshCalcEngine

**`.refreshCalcEngine()`**

For the next calculation, instruct the RBLe Service to immediately check for an updated CalcEngine from the CalcEngine CMS instead of waiting for the RBLe Service's CalcEngine cache to expire.

```javascript
// Immediately check for new CalcEngine upon the next calculation
$(".katapp").KatApp("refreshCalcEngine");
$(".katapp").KatApp().refreshCalcEngine();

// Then call calculation or configureUI to trigger a calculation...
$(".katapp").KatApp("calculate");
$(".katapp").KatApp().calculate();

// or... 
$(".katapp").KatApp("configureUI");
$(".katapp").KatApp().configureUI();
```

<hr/>

#### traceCalcEngine

**`.traceCalcEngine()`**

For the next calculation, instruct the RBLe Service to return detailed trace information from the *next successful* calculation.

```javascript
// Trace the next calculation
$(".katapp").KatApp("traceCalcEngine");
$(".katapp").KatApp().traceCalcEngine();

// Then call calculation or configureUI to trigger a calculation...
$(".katapp").KatApp("calculate");
$(".katapp").KatApp().calculate();

// or... 
$(".katapp").KatApp("configureUI");
$(".katapp").KatApp().configureUI();
```

<hr/>

## KatApp Events

KatApps trigger several events to during different workflows allowing Kaml View developers to catch and respond to these events as needed.  All events are registered on the 'view' of the application.  The view is simply the HTML element that had the `.KatApp()` method applied to it to build a KatApp.  

To assign event handlers to HTML DOM elements inside Kaml Views, see [rbl-on Event Handlers](#rbl-on-Event-Handlers).

When using events, use the following guidelines:

1. Events should use the _.RBLe_ namespace
2. All jQuery selectors should be scoped to either `view`, `application.element`, or using `{id}` (see [View Scoping](#View-Scoping) for more information)
3. `{id}` is replaced with a unique application ID for the currently running KatApp

**Example Kaml View Script**

```javascript
(function() {
    // Use this line to grab a reference to the current view the Kaml View is being rendered to
    var view = $("thisClass");

    // Hook up one or more event handlers *using* the .RBLe namespace
    view.on( "onInitialized.RBLe", function( event, application ) {
        // Perform view specific code
    });
})();
```

Additionally, every event handler described can be passed in on the `KatAppOptions` object at the time of KatApp creation.  However, if handlers are passed in this way, they override the default behaviors of the KatApp framework.  For example, you could change the default behavior of the start and end of calculations by passing in your own handlers.

```javascript
var options = {
    onCalculateStart: function( event: Event, application: KatAppPlugIn ) {
        application.showAjaxBlocker();
    },
    onCalculateEnd: function( event: Event, application: KatAppPlugIn ) {
        application.hideAjaxBlocker();
    }
};

$(".katapp").KatApp(options);
```

### KatApp Lifecycle Events

KatApp Lifecycle Events are events that pertain to the creation, updating, notifying, and destroying of a KatApp.  Some Calculation Lifecycle Events are intermixed and will be mentioned but see [documentation](#KatApp-Calculation-Lifecycle-Events) for more detailed information.

<hr/>

#### onInitializing

**`onInitializing?: (event: Event, application: KatApp, options: KatAppOptions )`**

Triggered after a Kaml View has been injected into the page and before all UI/template processing code is ran.  `onInitializing` is where event handlers that need to modify the application options (via event handler in Kaml View - instead of via the `.KatApp(options)` initialization method call) should be placed.

```javascript
(function() {
    // Use this line to grab a reference to the current view the Kaml View is being rendered to
    var view = $("thisClass");

    // Hook up one or more event handlers *using* the .RBLe namespace
    view.on( "onInitializing.RBLe", function( event, application, options ) {
        options.runConfigureUICalculation = false; // Don't run ConfigureUI
    });

    $(document).ready(function () {
        var application = view.KatApp();

        // Call an api endpoint
        application.apiAction(
            "wsi/documents",
            application.options,
            {},
            undefined,
            function (successResponse, failureReponse) {
                if (failureReponse == undefined) {

                    // Do something with successResponse...

                    // Now call the configureUI calculation and hide any progress indicators
                    // when the calculation completes.
                    application.configureUI(
                        undefined,
                        function () {
                            $(".katloader-container").hide();
                        }
                    );
                }
                else {
                    $(".katloader-container").hide();
                }
            }
        );
    });
})();
```

<hr/>

#### onInitialized

**`onInitialized?: (event: Event, application: KatApp )`**

Triggered after a KatApp finishes building the application instance, rendering the view/templates, and runs a ConfigureUI calculation (if needed).  `onInitialized` is where event handlers that need to use a reference to the `application` should be placed.  Other event handlers can be included, but could be placed outside of this event.

```javascript
(function() {
    // Use this line to grab a reference to the current view the Kaml View is being rendered to
    var view = $("thisClass");
    var application = view.KatApp();

    // Hook up one or more event handlers *using* the .RBLe namespace
    view.on( "onInitialized.RBLe", function( event, application ) {
        // When any inputs tagged with recalcInputs class change, turn on the recalcNeeded notification
        $(".recalcInputs " + application.options.inputSelector, application.element).on("change", function() {
            $(".recalcNeeded", application.element).addClass("active");
        })

        // When the recalculateButton is clicked, trigger a KatApp calculation
        $("#{id}_recalculateButton", application.element).on("click", function(e) {
            e.preventDefault();
            application.calculate();
        });

        // When iAdditionalDates checkbox is clicked, toggle the 'both-scenarios-v' elements
        $('.iAdditionalDates', application.element).click(function (e) {
            if (e.target.tagName.toUpperCase() !== "INPUT") {
                return;
            }
            $(".both-scenarios-v").fadeToggle();
        });
    });

    application.select('.iAdditionalDates').click(function (e) {
        if (e.target.tagName.toUpperCase() !== "INPUT") {
            return;
        }
        application.select(".both-scenarios-v").fadeToggle();
    });
})();
```

<hr/>

#### onDestroyed

**`onDestroyed(event: Event, application: KatApp )`**

Triggered from the `destroy` method after a KatApp finishes destroying the application instance and unbinding any event handlers, and runs a ConfigureUI calculation (if needed).  `onDestroyed` is normally not needed.  The `destroy` method is only called from the `rebuild()` 'debug' method.  Note that the view/templates are _not_ removed.  So if the site was manually calling `destroy` clean up code could be placed in this event to perform site specific clean up.

<hr/>

#### onOptionsUpdated

**`onOptionsUpdated(event: Event, application: KatApp )`**

Triggered from the `updateOptions` method after a KatApp finishes updating options, rebinding input event handlers, and setting default inputs.

<hr/>

#### onKatAppNotification

**`onKatAppNotification(event: Event, notificationName: string, notificationInformation: JSON | undefined, application: KatApp )`**

Triggered from the `pushNotification` method from the calling KatApp.  All other KatApps that are rendered on the page are sent the notification for custom processing.

```javascript
// Caller KatApp...
$(".saveButtonAction", application.element).on('click', function (e) {
    application.pushNotification("SavePensionEstimate");
});

// Notified KatApp...
view.on("onKatAppNotification.RBLe", function (event, name, information, application) {
    switch (name) {
        case "SavePensionEstimate":
            {
                application.calculate();
                break;
            }
    }
});
```

#### onKatAppNavigate

**`onKatAppNavigate(event: Event, id: string, application: KatApp )`**

When an `rbl-navigate` attribute is provided and the element is clicked, this event is raised to allow the client to perform navigation to a different KatApp.

```javascript
// During KatApp bootstrap code via configuration
$(".katapp").KatApp({
    view: "LAW:WealthDashboard",
    onKatAppNavigate: function(id) {
        $(".nexgenNavigation").val(id);
        $(".lnkNexgenHost")[0].click();
    }
});

// Or via javascript on() handler inside View script
view.on("onKatAppNotification.RBLe", function (id, application) {
    $(".nexgenNavigation").val(id);
    $(".lnkNexgenHost")[0].click();
});
```

### KatApp Calculation Lifecycle Events

KatApp Calculation Lifecycle Events are events that pertain to preparing, executing, and processing results from RBLe Service calculations.  If a KatApp is configured to run a ConfigureUI calculation, this events happen _before_ the `onInitialized` event.

<hr/>

#### onCalculateStart

**`onCalculateStart(event: Event, application: KatApp ): bool | undefined`**

This event is triggered at the start of the `calculate` method.  Use this event to perform any actions that need to occur before the calculation is submitted (i.e. custom processing of UI blockers or enabled state of inputs).  If the handler returns `false` or calls `e.preventDefault()`, then the calculation is immediately cancelled.

By default, the KatApp framework does the following:

1. Shows the configured Ajax UI Blocker
2. Disabled all Kaml View inputs

```javascript
{
    onCalculateStart = function (e, application) {
        // custom code
        
        // can then call default behavior if you want via following line
        KatApp.defaultOptions.onCalculateStart(application);
    }
}
```

<hr/>

#### onRegistration

**`onRegistration(event: Event, calculationOptions: KatAppOptions, application: KatApp )`**

This event is triggered during `calculate` if there is no data available to submit to the RBLe Service and the KatApp is configured to register data with the RBLe Service.  It occurs before calculation submission to RBLe Service and after calling the `getData` handler if configured.

<hr/>

#### onCalculationOptions

**`onCalculationOptions(event: Event, calculationOptions: KatAppOptions, application: KatApp, endpointOptions: KatAppActionOptions | undefined )`**

This event is triggered during `calculate` immediately before submission to RBLe Service.  It allows Kaml Views to massage the `calculationOptions` before being submitted.  Use this method if you want to massage inputs or add custom inputs/tables to the `calculationOptions` that wouldn't normally be processed by the KatApp framework.

```javascript
// Sample appends two inputs that are read from the current url/querystring
view.on("onCalculationOptions.RBLe", function (event, calculationOptions, application) {
    calculationOptions.Inputs.iUrl = document.URL;
    calculationOptions.Inputs.iHero = querystring.hero;
});
```

<hr/>

#### onInputsCache

**`onInputsCache(event: Event, inputsCache: CalculationInputs, application: KatApp )`**

This event is triggered immediately before inputs are cached to `Storage` (if `options.inputCaching=true`).  It allows Kaml Views to massage the inputs before being cached.  Use this method if you want to add or remove inputs before caching.

```javascript
// Sample appends custom input and removes a 'state' input that was set programmatically.
view.on("onInputsCache.RBLe", function (event, inputsCache, application) {
    inputsCache.iUrl = document.URL;
    delete inputsCache.iPopulateResults;
});
```

<hr/>

#### onResultsProcessing

**`onResultsProcessing(event: Event, calculationResults: TabDef[], calculationOptions: KatAppOptions, application: KatApp )`**

This event is triggered during `calculate` _after a successful calculation_ from the RBLe Service and _before framework result processing_.  Use this handler to do something before framework result processing happens (i.e. clear/destroy table/chart so only displays if results are present in current calculation).

```javascript
view.on( "onResultsProcessing.RBLe", function( event, calculationResults, calculationOptions, application ) {
    application.select(".conversionTable").empty(); // In case not returned from the CalcEngine, remove the table
})
```

<hr/>

#### onConfigureUICalculation

**`onConfigureUICalculation(event: Event, calculationResults: TabDef[], calculationOptions: KatAppOptions, application: KatApp )`**

This event is triggered during `calculate` _after a successful calculation and result processing_ and _only_ for a calculation where the `iConfigureUI` input is `1`.  Use this handler to finish setting up Kaml View UI that are dependent upon the first calculation results being processed (i.e. creation of sliders, list controls, etc.)

```javascript
view.on( "onConfigureUICalculation.RBLe", function( event, calculationResults, calculationOptions, application ) {
    // Add a 'set' noUiSlider handler display a 'recalc needed' message whenever a slider changes.  
    // Needs to be in ConfigureUI calculation because the sliders aren't built until after the first
    // calculation results are processed.
    $(".recalcInputs .slider-control", application.element).each(function () {
        var slider = this.noUiSlider;
        slider.on('set', function() {
            $(".recalcNeeded", application.element).addClass("active");
        });
    });
})
```

<hr/>

#### onCalculation

**`onCalculation(event: Event, calculationResults: TabDef[], calculationOptions: KatAppOptions, application: KatApp )`**

This event is triggered during `calculate` _after a successful calculation and result processing_.  Use this handler to process any additional requirements that may be dependent on a calculation finishing.

```javascript
view.on( "onCalculation.RBLe", function( event, calculationResults, calculationOptions, application ) {
    // Every time a calculation finishes, it may have shown or hidden some 'scroll UI' components...refresh them
    easyScrollDots({
        'fixedNav': false,
        'fixedNavId': '',
        'fixedNavUpward': false
    });
})
```

<hr/>

#### onCalculationErrors

**`onCalculationErrors(event: Event, key: string, message: string, exception: Error, calculationOptions: KatAppOptions, application: KatApp )`**

This event is triggered during `calculate` if an exception happens.  During the `calculate` workflow, if an exception happens inside 'data updating' a [`onActionFailed`](#onActionFailed) event will be triggered instead of `onCalculationErrors`.  Use this handler to clean up an UI components that may need processing when calculation results are not available.

The `key` parameter can be `GetData`, `RegisterData`, `SubmitCalculation`, or `ProcessResults` to identify which stage of the `calculate` workflow failed.

<hr/>

#### jwt-data Updates

During `calculate`, if the results returned contain `jwt-data` table, updates are sent to the server via `apiAction`. When this occurs, the standard [KatApp Action Lifecycle Events](#KatApp-Action-Lifecycle-Events) will be triggered with the `endpoint` being set to `calculations/jwtupdate`.

A common use for these handlers during calculation could be to display a status notification that data was updated.

```javascript
view.on("onActionResult.RBLe", function (event, endpoint, _result, application) {
	if (endpoint == "rble/jwtupdate") {
		application.select(".saveSuccess").show(500).delay(7000).hide(500);
	}
});
```

When `jwt-data` data updates fail, the `onActionFailed` event would be triggered.  A common use for this handler is to display a status notification that data updates failed.

Note: Even if data updating fails, 'normal calculation processing' will still be deemed successful.

```javascript
view.on("onActionFailed.RBLe", function (event, endpoint, _result, application) {
	if (endpoint == "rble/jwtupdate") {
		application.select(".saveError").show(500).delay(3000).hide(500);
	}
});
```

<hr/>

#### onCalculateEnd

**`onCalculateEnd(event: Event, application: KatApp )`**

This event is triggered at the end of the `calculate` method after a calculation succeeds, fails, or is cancelled.  Use this event to perform any actions that need to occur after the calculation is completely finished.

By default, the KatApp framework does the following:

1. Hides the configured Ajax UI Blocker
2. Removes the `needsRBLeConfig` class from any elements (showing UI components that are hidden during initialization)
3. Enables all Kaml View inputs


### KatApp Action Lifecycle Events

KatApp Action Lifecycle Events are events that occur during the processing of a [`apiAction`](#apiAction) method call.

<hr/>

#### onActionStart

**`onActionStart(event: Event, endpoint: string, submitData: JSON, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)`**

This event is triggered immediately before submitting the `submitData` to the API endpoint.  This handler could be used to modify the `submitData` before submission if required.  If the handler returns `false` or calls `e.preventDefault()`, then the endpoint submission is immediately cancelled.

<hr/>

#### onActionResult

**`onActionResult(event: Event, endpoint: string, resultData: JSON | undefined, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)`**

This event is triggered upon successful submission and response from the API endpoint.  If the action is a 'file download', `resultData` will be `undefined`, otherwise it will be a JSON payload with properties specific to the `endpoint`.

<hr/>

#### onActionFailed

**`onActionFailed(event: Event, endpoint: string, exception: JSON, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)`**

This event is triggered when submission to an API endpoint fails.  The `exception` object will have a `Validations` property that can be examined for more details about the cause of the exception.

<hr/>

#### onActionComplete

**`onActionComplete(event: Event, endpoint: string, application: KatAppPlugInInterface, currentOptions: KatAppOptions, actionLink: JQuery<HTMLElement>)`**

This event is triggered after the `apiAction` has processed and will trigger on both success and failure.  Use this handler to process any UI actions that are required.

<hr/>


### KatApp Upload Lifecycle Events

KatApp Upload Lifecycle Events are events that occur during the process of uploading a file, normally via [input-fileupload](#input-fileupload) template input.

<hr/>

#### onUploadStart

**`onUploadStart(event: Event, endpoint: string, fileUpload: JQuery<HTMLElement>, formData: FormData, application: KatApp)`**

This event is triggered immediately before submitting the `formData` to the API endpoint.  This handler could be used to modify the `formData` before submission if required.

<hr/>

#### onUploaded

**`onUploaded(event: Event, endpoint: string, fileUpload: JQuery<HTMLElement>, application: KatApp)`**

This event is triggered upon successful submission and response from the API endpoint.

<hr/>

#### onUploadFailed

**`onUploadFailed(event: Event, endpoint: string, fileUpload: JQuery<HTMLElement>, exception: JSON, application: KatApp)`**

This event is triggered when upload submission to an API endpoint fails.  The `exception` object will have a `Validations` property that can be examined for more details about the cause of the exception.

<hr/>

#### onUploadComplete

**`onUploadComplete(event: Event, endpoint: string, fileUpload: JQuery<HTMLElement>, application: KatApp)`**

This event is triggered after the file upload has finished processing and will trigger on both success and failure.  Use this handler to process any UI actions that are required.

<hr/>

### KatApp Modal Application Lifecycle Events

KatApp Modal Application Lifecycle Events are events that occur during processing of a modal application launched via [rbl-modal](#rbl-modal-Attribute-Details) links.  

Almost always, the 'confirm' event is going to call an endpoint via an [apiAction](#apiAction) method call then close the modal and the 'cancel' button will simply dismiss the modal dialog.  

Based on how the host and child applications are architected determines which events you will use.

1. If the host application will execute the code when confirm or cancel is selected, use `onModalAppConfirmed` and/or `onModalAppCancelled`,
1. If the child application will execute the code when confirm or cancel is selected, use `onConfirm` and/or `onCancel`

At any stage during the lifecycle of the modal application, if the modal application needs to indicate to the host, that an unexpected exception has occured and that the Bootstrap modal should be disabled, use `application.triggerEvent( "onUnexpectedError", ex );` within the modal application.  By default, the KatApp framework automatically triggers this event if a RBLe calculation fails during the ConfigureUI calculation.  It then catches this event and displays a validation summary and disables the UI.

```javascript
// Default handler code provided by KatApp framework
modalApp.element
    .on("onCalculationErrors.RBLe", function (_e, key, _message, ex) {
        if (key == "SubmitCalculation.ConfigureUI") {
            modalApp.triggerEvent("onUnexpectedError", ex)
        }
    })
    .on("onUnexpectedError.RBLe", function(_event, ex) {
        // Code to diplay validation summary and disables the UI
    });
```

<hr/>

#### KatApp Modal Application Lifecycle

During the creation of the modal KatApp, the following life cycle occurs.

1. ModalApp.[onInitializing](#onInitializing) - See [advanced modal functionality](#advanced-katapp-modal-sample).
1. HostApp.[onModalAppInitialized](#onModalAppInitialized)
1. ModalApp.[Rest of KatApp Life Cycle Events](#KatApp-Lifecycle-Events)
1. ModalApp.[onConfirm](#onConfirm)/[onCancel](#onCancel) - when [standard modal functionality](#Standard-KatApp-Modal-Sample) is used and cancel or continue is clicked.
1. HostApp.[onModalAppConfirm](#onModalAppConfirm)/[onModalAppCancel](#onModalAppCancel) - See [advanced modal functionality](#advanced-katapp-modal-sample).
1. HostApp.[onModalAppConfirmed](#onModalAppConfirmed)/[onModalAppCancelled](#onModalAppCancelled) - triggered when modal should be dismissed.

<hr/>

#### onConfirm

**`onConfirm(hostApplication: KatApp, modalLink: JQuery<HTMLElement>, dismiss: (message?: string)=> void, cancel: ()=> void)=> boolean | string | undefined`**

This event is triggered when the 'continue' button is clicked in the modal.  The `hostApplication` is the main application and `modalLink` is the link that was clicked to trigger the creation of the application.  Either can be referred to if additional information is needed by the hosted application to determine logic.

**Within the event handler, `dismiss()` or `cancel()` must be called.** To prevent the modal dialog from closing, call `cancel()` delegate from the event handler. To dismiss the dialog, call the `dismiss()` delegate optionally passing a `string` message value to allow for the hosting application to display or act upon it the message inside a [onModalAppConfirmed](#onModalAppConfirmed) event handler.

By default, any `string` message passed in the `dimiss` delegate is not processed by the framework.

**You must use `application.updateOptions( { onConfirm: function() { } } );` syntax versus `view.on("onConfirm.RBLe", function() { } );` syntax when assigning a handler.**  This allows the KatApp framework to automatically dismiss the dialog if no handler is provided.  If the jQuery `on()` syntax is used, the framework is unable to determine whether or not an event has been assigned and would not be able to automatically dismiss when no special functionality is needed (more so in the `onCancel` handler).

The `this` reference inside of this handler will be the button clicked.
<hr/>

#### onCancel

**`onCancel(hostApplication: KatApp, modalLink: JQuery<HTMLElement>, dismiss: (message?: string)=> void, cancel: ()=> void)=> boolean | string | undefined`**

This event is triggered when the 'cancel' button is clicked in the modal.  The `hostApplication` is the main application and `modalLink` is the link that was clicked to trigger the creation of the application.  Either can be referred to if additional information is needed by the hosted application to determine logic.

**Within the event handler, `dismiss()` or `cancel()` must be called.** To prevent the modal dialog from closing, call `cancel()` delegate from the event handler. To dismiss the dialog, call the `dismiss()` delegate optionally passing a `string` message value to allow for the hosting application to display or act upon it the message inside a [onModalAppCancelled](#onModalAppCancelled) event handler.

By default, any `string` message passed in the `dimiss` delegate is not processed by the framework.  

**You must use `application.updateOptions( { onCancel: function() { } } );` syntax versus `view.on("onCancel.RBLe", function() { } );` syntax when assigning a handler.**  This allows the KatApp framework to automatically dismiss the dialog if no handler is provided.  If the jQuery `on()` syntax is used, the framework is unable to determine whether or not an event has been assigned and would not be able to automatically dismiss when no special functionality is needed.

The `this` reference inside of this handler will be the button clicked, or the modal itself if `esc` was pressed.

<hr/>

#### onModalAppInitialized

**`onModalAppInitialized(event: Event, applicationId: string, hostApplication: KatApp, modalApplication: KatApp, modalLink: JQuery<HTMLElement>)`**

This event is triggered after a modal application has been initialized.  Allows for host application to assign events to the modal application if needed.  

<hr/>

#### onModalAppConfirmed

**`onModalAppConfirmed(event: Event, applicationId: string, hostApplication: KatApp, modalApplication: KatApp, modalLink: JQuery<HTMLElement>, dismiss: ()=> void, message: string | undefined)`**

This event is triggered after a modal application has been successfully confirmed and dismissed.  If the modal application returned a `message`, it can be displayed in some form (alert, modal).  Other actions can be performed as well (i.e. calculations, navigations, etc.) by the hosting application as needed.

By default, if `rbl-action-calculate="true"` is set, the host application will execute an `application.calculate()` after dismissing the dialog.

**Within the event handler, `dismiss()` must be called to dismiss the dialog.**

**If a KatApp Kaml file needs to handles this event, ensure that you first remove the default handler via `.off('onModalAppConfirmed.RBLe')`.**

<hr/>

#### onModalAppCancelled

**`onModalAppCancelled(event: Event, applicationId: string, hostApplication: KatApp, modalApplication: KatApp, modalLink: JQuery<HTMLElement>, dismiss: ()=> void, message: string | undefined)`**

This event is triggered after a modal application has been cancelled and dismissed.  If the modal application returned a `message`, it can be displayed in some form (alert, modal).  Other actions can be performed as well (i.e. calculations, navigations, etc.) by the hosting application as needed.

**During the event handler, `dismiss()` must be called to dismiss the dialog.**

**If a KatApp Kaml file needs to handles this event, ensure that you first remove the default handler via `.off('onModalAppConfirmed.RBLe')`.**

<hr/>

#### onModalAppConfirm

**`onModalAppConfirm(event: Event, message?: string)`**

This event can be triggered by the modal application to indicate to the host application that the dialog should be dismissed as 'confirmed'.  **KatApp Kaml files will never handle this event, only the KatApp framework should handle this event.**

See [Advanced KatApp Modal Sample](#Advanced-KatApp-Modal-Sample) for an example.

<hr/>

#### onModalAppCancel

**`onModalAppCancel(event: Event, message?: string)`**

This event can be triggered by the modal application to indicate to the host application that the dialog should be dismissed as 'cancelled'.  **KatApp Kaml files will never handle this event, only the KatApp framework should handle this event.**

See [Advanced KatApp Modal Sample](#Advanced-KatApp-Modal-Sample) for an example.

<hr/>

#### Standard KatApp Modal Sample

Below is the markup and script needed when using `rbl-modal` functionality and using the standard functionality of the KatApp modal framework.

**Host Application Markup**

```html
Click <a rbl-modal="Verify.Mobile" 
        rbl-label-title="Verify Mobile Telephone" 
        rbl-action-calculate="true" 
        rbl-input-selector=".main input" 
        rbl-action-continue="common/mobile-verification"
        data-input-action="verify">here</a> to verify your mobile phone.
```

1. rbl-label-title - sets title
1. rbl-action-calculate - host application will calculate if modal is confirmed
1. rbl-input-selector - only inputs within the element with class 'main' will be processed
1. rbl-action-continue - the endpoint api to call when continue is clicked.
1. data-input-action - create an input named iAction='verify' to pass into the modal application's CalcEngine

See [rbl-modal Attribute Details](#rbl-modal-Attribute-Details) for more information on attributes available on `rbl-modal` elements.

**Modal Application Script**
```javascript
var view = $("{thisView}");
var application = view.KatApp();

var canDismiss = true; // Sample variable that might be set to false during life time of modal app
view
    // Optional, only needed if you want to cancel submission for some reason
    .on("onActionStart.RBLe", function (e, endPoint, resultData, application, _currentOptions, actionLink) {
        if ( !canDismiss ) {
            actionLink.prop("disabled", false);
            return false;
        }
    })
    .on("onActionResult.RBLe", function (e, endPoint, resultData, application, _currentOptions, actionLink) {
        var message = "Success: Mobile Phone number verified for text messages. Access Communications to update your message settings.";
        hostApplication.triggerEvent("onModalAppConfirm", message);
        // Optional dialog if you want to show a confirm
        hostApplication.createModalDialog(
            {
                confirmation: message,
                labels: {
                    continue: "OK", // Optional, change the continue button text
                    title: "Verification Successful"
                }
            }
        );
    });
```

**Host Application Script**

This script is only needed if you need to process a message returned from `onConfirm` event (remember to always remove default `onModalAppConfirmed.RBLe` and/or `onModalAppCancelled.RBLe` event handlers if you are going to replace them.)

```javascript
var view = $("{thisView}");
var application = view.KatApp();

view
    .off("onModalAppConfirmed.RBLe") // *always* remove default handler
    .on("onModalAppConfirmed.RBLe", function(applicationId, hostApplication, modalApplication, modalLink, dismiss, message) {
        dismiss();
        if (applicationId == "Verify.Mobile") {
            hostApplication.createModalDialog( message );
            hostApplication.calculate();
        }
    });
```

#### Advanced KatApp Modal Sample

Below is the markup and script needed when using `rbl-modal` functionality and using the advanced functionality of the KatApp modal framework. 

The additional functionality that occurs is:

1. Detecting if you are inside modal dialog (via `hostApplication` property) 
1. Replacing the standard buttons with custom buttons.  These custom buttons will use the `rbl-action-link` attribute to eliminate the need for manual `application.apiAction` method calls.
1. Triggering `onModalAppCancel` and `onModalAppConfirm`

**Host Application Markup**

```html
<a rbl-action-calculate="true" 
    rbl-label-title="Device Verification" 
    rbl-modal="Common.TextValidate">Enable SMS messages</a>
```

1. rbl-label-title - sets title
1. rbl-action-calculate - host application will calculate if modal is confirmed

See [rbl-modal Attribute Details](#rbl-modal-Attribute-Details) for more information on attributes available on `rbl-modal` elements.

**Modal Application Script**
```javascript
var view = $("{thisView}");
var application = view.KatApp();
var modalAppOptions = application.options.modalAppOptions;
var hostApplication = modalAppOptions != undefined
    ? modalAppOptions.hostApplication // If defined, you know you are contained inside a modal dialog
    : undefined;

application.updateOptions(
    {
        handlers: {
            cancelAction: function (e) {
                e.preventDefault();
                hostApplication.triggerEvent("onModalAppCancel");
            },
            closeAction: function (e) {
                e.preventDefault();
                $(this).prop("disabled", true);
                hostApplication.triggerEvent("onModalAppConfirm", "Success: Mobile Phone number verified for text messages. Access Communications to update your message settings." );
            }
        }
    }
);

view
    // Create custom buttons for our dialog
    .on("onInitializing.RBLe", function () {
        if (modalAppOptions != undefined) { // We knew we are in modal application
            
            // Remove default cancel/continue
            application.select(".modal-footer").children().remove();

            // Add all custom buttons needed for all screens and a method (using step* classes) to
            // be able to show and hide as needed
            application.select(".modal-footer")
                .append($(
                    '<button class="btn btn-outline-primary button-close step1 step2 step3" rbl-on="click:cancelAction">Close</button>\
                    <button class="btn btn-primary px-4 step1" rbl-action-link="common/mobile-verification" data-input-action="generate">Send Code</button>\
                    <button class="btn btn-primary px-4 button-resend step2" style="display: none;" rbl-action-link="common/mobile-verification" data-input-action="generate">Resend Code</button>\
                    <button class="btn btn-primary button-verify px-4 step2" style="display: none;" rbl-action-link="common/mobile-verification" data-input-action="validate">Verify</button>')
            );
        }
    })
    .on("onActionResult.RBLe", function (e, endPoint, resultData, _application, _currentOptions, actionLink) {
        switch (endPoint) {
            case "common/mobile-verification":
                var footer = application.select(".modal-footer")

                // actionLink is one of the <button/> elements we created in onInitializing
                if (actionLink.data("input-action") == "generate") {
                    // Manage UI (inside the modal-body)

                    // Show and hide buttons appropriately
                    $("button", footer).not(".step2") .hide();
                    $("button.step2", footer).show();
                }
                else if (actionLink.data("input-action") == "validate") {
                    // Manage UI (inside the modal-body)

                    // Show and hide buttons appropriately
                    $("button", footer).not(".step3").hide();
                    $("button.step3", footer).show();
                }
                break;
        }
    })
    .on("onActionFailed.RBLe", function (e, endPoint) {
        switch (endPoint) {
            case "common/mobile-verification":
                if ( errorResponse.Validations == undefined || ( errorResponse.Validations.length == 1 && errorResponse.Validations[ 0 ].ID == "System" ) ) {
                    // Unexpected, tell application to 'disable' modal dialog and 
                    application.triggerEvent("onUnexpectedError", e);
                }
                break;
        }
    });
```

### Template Event Handlers

[Templates](#Templates) are a powerful tool in Kat Apps.  However, when you create a new template Kaml file, if you need event handlers to run, registering those handlers is different than normal.  Because the template is loaded one time regardless of how many KatApps are configured to use it.  To function properly, an event handler for each _KatApp_ that uses a template would need to be registered.  To accomplish this, you use the global `$.fn.KatApp.templateOn` method call because within the template script, there would be no concept of a _Kaml View_ since the template could be used by any application/view.

**`$.fn.KatApp.templateOn = function( events: string, fn: FunctionDelegate )`**

The syntax is exactly the same as normal event handling except for the `global variable` reference.

```javascript
// Sample event handler registration in **Kaml View**...
view.on( "onInitialized.RBLe", function( event, application ) {
    // custom code to run in view when initialized
});

// Sample event handler registration in **Kaml Template File**...
$.fn.KatApp.templateOn("onInitialized.RBLe", function (event, application) {
    // custom code here to run for this template when it is injected inside an application that uses this template
});
```

## Global Methods

For almost all code written revolving around KatApps, it will be based on a KatApp 'application' object as described throughout this document.  However, there are times when there is code _related_ to KatApp applications but occurs outside of a running KatApp.  Below is the list of methods that are available and when they are useful.

#### static setNavigationInputs

**`.setNavigationInputs( inputs: {}, cachingKey: string | undefined )`**

The static version of `setNavigationInputs` is almost identical to the application [setNavigationInputs](#setNavigationInputs) method.  Default inputs can be programmatically set for one time use in the next rendering of a KatApp if needed.  The difference is that the static version does not accept an `inputsSelector` parameter since it is not running inside the context of an application.  After this method is called, these inputs would be used when the next KatApp is rendered.  The primary use for this function is to set inputs immediately before navigation to a KatApp.  If `cachingKey` is undefined or not passed in, the inputs apply globally to any/all KatApps on the next navigation only.

```html
<!-- Set the iCurrentAge default before navigating to HPF KatApp -->
<a href="#" onclick="KatApp.setNavigationInputs( { iCurrentAge: 64 } );NavigateToKatApp( 'Benefits.HPF' );">Navigate to HPF</a>
```
<hr/>