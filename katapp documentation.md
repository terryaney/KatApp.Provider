# KatApp documentation:

## Introduction
A KATApp is a dynamic html application delivered to a host platform such as Life@Work.  Conceptually, its like a CMS, but instead of static content, it provides for dynamic content containing potentially complex business logic and controls and data and results.

## Definitions

Term | Definition
---|---
KatApp | Dynamic webpage content driven by AJAX, using Kaml Views and RBLe Service
KatApp Plugin | Jquery plugin to enable KATApps
KatApp element | HTML element that is target for the KATApp.  Example: `<div id="katapp"></div>`
Host Platform | Web Application hosting the KatApp, i.e. Life@Work / Phoneix
Kaml View | KatApp Markup Language file dynamically used by KatApp.
Kaml View CMS | System for updating Kaml View.
RBLe Service | Rapid Business Logic calcuation service.  Contains all business logic.  Driven by CalcEngine
RBLe Results | Results from RBLe Service
Kaml Template Files | KatApp Markup Language file containing templates, css, and javascript for generating common markup/controls used in KatApps
CalcEngine | Specialized Excel speadsheet that drives business logic

### Required Javscript files:
- bootstrap.js
- jquery.js
- highcharts.js
- KatApp.js

## Initializing and Configuring a KatApp

To run a KatApp, minimally a Kaml View file needs to be provided.  Additional properties like CalcEngine or Templates can be provided as well.  These options can be provided via attributes on the element representing the KatApp or via a configuration object passed on the `.KatApp( {options} )` method.

When specifying a view or template to use, it is always in the format of `folder:kaml-file`.  If `folder` is omitted, this the folder of `GLOBAL` will be used.  The only files typically found in the `GLOBAL` folder are template files (i.e. `Standard_Templates` and `Input_TemplatesBS4`).

### Configuring via KatApp Attributes

```html
<!-- Specify a View only (Simplest/typical implementation) -->
<div id="katapp-wealth" class="katapp"
    rbl-view="LAW:WealthDashboard">
</div>

<!-- Specify a View and CalcEngine -->
<div id="katapp-wealth" class="katapp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE">
</div>

<!-- Specify a View, CalcEngine, and Templates -->
<div id="katapp-wealth" class="katapp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE"
    rbl-view-templates="Standard_Templates,LAW:Law_Templates">
</div>
```
```javascript
// Javascript - In all cases above, initalize the KatApp with following
$("#katapp-wealth").KatApp();
```

### Configuring via Javascript Configuration Object

```html
<!-- In all case, simply have div representing KatApp with configuration provided in Javascript -->
<div id="katapp-wealth" class="katapp"></div>
```
```javascript
// Specify a View only
$("#katapp-wealth").KatApp({
    view: "LAW:WealthDashboard"
});

// Specify a View and CalcEngine
$("#katapp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    calcEngines: [
        { name: "LAW_Wealth_CE" }
    ]
});

// Specify a View, CalcEngine, and Templates
$("#katapp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { name: "LAW_Wealth_CE" }
    ]
});
```

### Initialize multiple KatApps
Since the KatApp's are triggered via a JQuery plugin using the selector, it is possible to initialize multiple KatApp's with one Javascript call.  To accomplish this, a single, common `class` could be used.

```html
<!-- three KatApp's on the same page -->
<div id="katapp-wealth" class="katapp" rbl-view="LAW:WealthDashboard"></div>
<div id="katapp-health" class="katapp" rbl-view="LAW:HealthDashboard"></div>
<div id="katapp-feature" class="katapp" rbl-view="LAW:FeatureView"></div>
```
```javascript
// Single javascript call to initialize
$("katapp").KatApp();
```

### Configuring CalcEngines and Input/Result Tabs

As seen above, CalcEngines can be provided via KatApp element attributes or via Javascript options.  Along with the CalcEngine to use, an input tab and result tabs can be configured.

```html
<!-- Specify CalcEngine Tabs, note that rbl-result-tab is comma delimitted list of tabs -->
<div id="katapp-wealth" class="katapp"
    rbl-view="LAW:WealthDashboard"
    rbl-calcengine="LAW_Wealth_CE"
    rbl-input-tab="RBLInput"
    rbl-result-tab="RBLResult"
    rbl-view-templates="Standard_Templates,LAW:Law_Templates">
</div>
```
```javascript
// Specify CalcEngine Tabs, note that resultTabs is an array of tabs
$("#katapp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { name: "LAW_Wealth_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult" ] }
    ]
});
```

### Using Kaml View's `<rbl-config>` for Configuration

There is a third and final way to configure CalcEngine information.  This is the most common use case as it keeps the KatApp markup and Javascript in the hosting client the simplest and is easist to implement.  Inside each Kaml View file is a required `<rbl-config>` element.  The first element in any Kaml View file should be the `<rbl-config>` element.

```html
<rbl-config calcengine="LAW_Wealth_CE"
    input-tab="RBLInput"
    result-tabs="RBLResult"
    templates="Standard_Templates,LAW:Law_Templates"></rbl-config>
```

### Multiple CalcEngines

KatApp's are capable of leveraging multiple CalcEngine inside a single Kaml View file.  You can pass these in using two of the described mechanisms above.  Multiple CalcEngines can be configured only by a Javascript configuration object or via the `<rbl-config>` element.

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
$("#katapp-wealth").KatApp({
    view: "LAW:WealthDashboard",
    viewTemplates: "Standard_Templates,LAW:Law_Templates",
    calcEngines: [
        { key: "default", name: "LAW_Wealth_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult" ] },
        { key: "shared", name: "LAW_Shared_CE", inputTab: "RBLInput", resultTabs: [ "RBLResult", "RBLHelpers" ] }
    ]
});
```
### Configuration Precedence

As noted, there are three ways to configure KatApps with each method have a specific precedence that can override the same settings set via different methods.  The configuration precedence is as follows.

1. Javascript configuration object
2. KatApp element attributes
3. `<rbl-config>` attributes


## Kaml View Specifications

Kaml View files are essentially HTML markup files with the addition of KatApp functionality.  This additional functionality is called the _K_at_A_pp _M_arkup _L_anguage. These files are managed in Kaml View CMS and provide all the functionality of the rendered KatApp.  Features included are template processing and CalcEngine integration via attribute decorations.

Every view must have a `<rbl-config>` element as the first element of the file.
```html
<rbl-config calcengine="LAW_Wealth_CE" templates="Standard_Templates,LAW:Law_Templates"></rbl-config>
```

### RBLe Attributes used in Kaml View
When building Kaml Views, dynamic content and visiblity is managed via the following attributes placed on any valid Html element.

Attribute | Description
---|---
rbl-ce | If multiple CalcEngines are used, can provide a `key` to a CE to indicate which CalcEngine to pull value from.
rbl-tab | If multiple tabs are returned from a CalcEngine, can provide a name which tab to pull value from.
rbl-value | Inserts a value from RBLe Service
rbl-source<br/>rbl&#x2011;source&#x2011;table | Indicates row(s) from an RBLe result table used to process a template.  Pairs with rbl-tid<br/>&nbsp;
rbl-tid | Indicates what RBL template to apply to the given source rows.  Results from template and data replace element content.
rbl-display | Reference to boolean RBLe result data that toggles display style (uses `jQuery.show()` and `jQuery.hide()` ).

<br/>

### RBLe Selector Paths
There are two ways to use `rbl-value` attribute.  You can provide simply an 'id' that will look inside the `ejs-output` table.  Or you can provide a 'selector path'.  Both mechanisms can be used in conjunction with `rbl-ce` and `rbl-tab`.

```html
<!-- Get 'value' column from 'ejs-output' table where 'id' is 'ret-age' -->
<span rbl-value="ret-age"></span>

<!-- Get 'value' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<span rbl-value="benefit-savings.ret-age"></span>

<!-- Get 'year' column from 'benefit-savings' table where 'id' is 'ret-age' -->
<span rbl-value="benefit-savings.ret-age.year"></span>

<!-- 
    Using 'RBLRetire' tab from the 'default' CalcEngine
    Get 'value' column from 'ejs-output' table where 'id' is 'ret-age'    
-->
<span rbl-tab="RBLRetire" rbl-value="ret-age"></span>

<!-- 
    Using the first/default tab from the 'Shared' CalcEngine (key=Shared)
    Get 'value' column from 'ejs-output' table where 'id' is 'ret-age'    
-->
<span rbl-ce="Shared" rbl-value="ret-age"></span>

<!-- 
    Using 'RBLRetire' tab from the 'Shared' CalcEngine
    Get 'value' column from 'ejs-output' table where 'id' is 'ret-age'    
-->
<span rbl-ce="Shared" rbl-tab="RBLRetire" rbl-value="ret-age"></span>
```
### rbl-display Attribute Details
The `rbl-display` value has all the same 'selector' capabilities described in the _`rbl-value` Attribute Details_.  Once a `value` is selected from a specified table (`ejs-visibility` by default), a boolean 'falsey' logic is applied against the value.  An element will be hidden if the value is `0`, `false` or an empty string.

**Simple Expressions** - In addition to simply returning a visibility value from the CalcEngine, the `rbl-display` attribute can contain a simple equality expression.

```html
<!-- Show or hide based on 'value' column from 'ejs-visibility' table where 'id' is 'show-wealth' -->
<div rbl-display="show-wealth">Wealth Information</div>

<!-- Show if 'value' column from 'ejs-visibility' table where 'id' is 'show-wealth' = 1, otherwise hide -->
<div rbl-display="wealth-level=1">Wealth Information</div>

<!-- 
    Using the first/default tab from the 'Shared' CalcEngine (key=Shared)
    Show if 'enabled' column from 'wealth-summary' table where 'id' is 'benefit-start' = 1, otherwise hide 
-->
<div rbl-ce="Shared" rbl-display="wealth-summary.benefit-start.enabled=1">Wealth Information</div>
```

### Legacy CalcEngine Table Processing

KatApps is an upgrade to original RBLe Service processing in that Kaml Views are able to _pull_ information from the CalcEngine and able to pull it from specific locations using 'selector paths'.  After a calculation is finished, all elements using `rbl-value`, `rbl-source`, `rbl-tid`, or `rbl-display` binding attributes are automatically updated/processed.  

The original RBLe Service processing was a _push_ pattern.  So instead of elements being bound to specific values, all CalcEngine results were processed and searched for any elements with special class names that matched `id` elements in the results and if a match was found, the CalcEngine value was pushed to the element.

Kaml Views still supports legacy _push_ processing for values and visibility, but using the binding attributes is the preferred mechanism as it expresses clear intent of which elements are bound to the CalcEngine and where the data should be pulled from.

Table | Purpose
---|---
ejs&#x2011;output | Simplified functionality of `rbl-value` processing.  For each row in the table, use the `value` column to set the content for any element with a CSS class that matches the `id` column.
ejs&#x2011;visibility | Simplified functionality of the `rbl-display` processing.  For each row in the table, hide any element with a CSS class that matches the `id` column if the `value` column equals `0`.

<br/>

### CalcEngine Table _Push_ Processing

Even though it is preferrable to have _pull_ over _push_ for content and visibility, there are still some tables that either require push processing or are much better suited for a _push_ pattern.  In these cases, the source tables in the CalcEngines are usually very focused; only turned on during the initial configuration calculation and/or have a very limited number of rows.  By paying attention to the processing scope of these tables (only returning information when needed and minimizing the rows), you can ensure that Kaml Views remain performant.

**ejs-defaults** - Set input values for any input on Kaml View.

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

\
**ejs-listcontrol** - Find and populate 'list' controls (dropdown, radio button list, or checkbox list) that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
table | The name of the data source table that provides the list items for the control specified by id. 

\
**ejs-listcontrol data source** - Typically, `ejs-listcontrol` and its data tables are only returned during a configuration calculation to initialize the user interface.  However, if the list control items are dynamic based on employee data or other inputs, the typical pattern is to return all list items possible for all situations during the configuration calculation, and then use the `visible` column to show and hide which items to show.  During subsequent calculations, when items are simply changing visibility, for performance enhancements, the only rows returned in the data source table should be the rows that have dynamic visiblity.

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
<sup>2</sup> For a bootstrap enabled dropdown inputs, additional properties can be applied to create an enhanced UI experience.  See https://developer.snapappointments.com/bootstrap-select/examples/ for documentation on `class`, `html`, and `subtext`.

\
**ejs-sliders** - Find and configure slider inputs that have a CSS class matching the `id` column.

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
1. The default selector path of `ejs-defaults.{id}.value`.
2. The `default` column in the `ejs-slider` row.
3. The current value of the hidden slider html input (if set directly via markup).
4. The `min` column in the `ejs-slider` row.

<sup>2</sup> The slider value is displayed in the element that has a CSS class of `sv{id}`.  
<sup>3</sup> See https://refreshless.com/nouislider/pips/ for documentation on using `pips-*` values.

\
**ejs-disabled** - Find and enable or disable inputs that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
value | Whether or not to enable or disable the input.  If `value` is `1`, the input will be disabled, otherwise enabled.

\
**skip-RBLe** - Find and prevent inputs in Kaml View from triggering a calculation upon change.  This table is legacy support that is equivalent to `rbl-nocalc` and can only be used to _prevent an input from triggering a calculation_.  You can not use it to turn calculations back on for an input.  This table allows for the business logic of knowing which inputs trigger a calculation and which do not to be left inside the CalcEngine.  Using this table has the same effect as applying attributes manually in the Kaml View.

Column | Description
---|---
id<br/>key&nbsp;(legacy) | The name of the input in your Kaml View (i.e. iMaritalStatus) to disable triggering a calculation. 

\
**errors/warnings** - Errors and warnings are returned from CalcEngine when invalid inputs are sent to the CalcEngine.

Column | Description
---|---
id | The name of the input with a validation error.  `id` is optional.  If provided, the input will be highlighted in the UI to indicate an error.
text | The error message to display in the validation summary.  If `id` is provided, the highlighted input will have an error icon that displays a popup of the error message.

TODO - ejs-markup, [rbl-tid='result-table'], [rbl-tid="chart-highcharts"], [rbl-template-type="katapp-highcharts"]


## Templates

Templates are a powerful tool in KATApps.  Templates are a small markup snippet that are combined with data object to render content.

The data object can from static data-* attributes or from an RBLe result row.

TODO: Templates/inputs can be injected via ejs-output/ejs-markup
TODO: Nested inline templates

**Example**

```xml
<!-- template markup, template id = [tid] -->
<rbl-template tid="name-item">
    <p>Name: {first} {last}</p>
    <p>Position: {title}</p>
</rbl-template>
```
``` javascript
//data object (can be from data-* or from RBLe result row)
{
    first: "James",
    last: "Madison",
    title: "4th US President"
}
```

```xml
<!-- markup with template + [rbl-source] -->
<div rbl-tid="name-item" rbl-source="profile.madison">
<!-- or, markup with template + static data-* -->
<div rbl-tid="name-item" data-first="James" data-last="Madison" data-title="4th US President">
<!-- markup result -->
<div>
    <p>Name: James Madison</p>
    <p>Position: Former US President</p>
</div>
```
## Using templates to process RBLe results rows
Most common use of templates with RBLe results is for repetitive result items like `<li>`.

```xml
<rbl-template tid="li-foundingfathers">
    <li>{first} {last},  {title}</li>
</rbl-template>
```
```xml
<!-- markup -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
</ul>
<!-- markup results -->
<ul rbl-tid="li-foundingfathers" rbl-source="foundingfathers">
    <li>James Madison, Former US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
</ul>
```
## Inline templates:
Templates above were defined by the `[tid]` attribute in the `<rbl-template>` element:

`<rbl-template tid="name-item">`

You can also use inline templates by using the `[rbl-tid]` attribute in the child element.  

```xml
<!-- markup in inline template; noted with child element attrib [rbl-tid] -->
<ul rbl-source="foundingfathers">
    <li rbl-tid="">{first} {last},  {title}</li>
</ul>
<!-- markup results -->
<ul rbl-source="foundingfathers">
    <li>James Madison, Former US President</li>
    <li>Alexander Hamilton, Former US Treasury Secretary</li>
</ul>
```

```
if no tid, should be 'run once' and delete (support this??)
unless there's a 'preserve' for nested template
```
## Advanced Configuration

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

### Sample 1: Two precalc CalcEngines
Configure two CalcEngines to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE and LAW_Wealth_Helper2_CE both use the same tabs configured on LAW_Wealth_CE.
#### Markup:
```html
<div id="katapp-wealth" 
    class="katapp" 
    rbl-view="LAW:WealthDashboard" 
    rbl-calcengine="LAW_Wealth_CE"
    rbl-precalcs="LAW_Wealth_Helper1_CE,LAW_Wealth_Helper2_CE"></div>
```

### Sample 2: Custom CalcEngine Tabs
Configure two CalcEngines with different tabs to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE specifies custom tabs, while LAW_Wealth_Helper2_CE uses same tabs configured on LAW_Wealth_CE.
#### Markup:
```html
<div id="katapp-wealth" 
    class="katapp" 
    rbl-view="LAW:WealthDashboard" 
    rbl-calcengine="LAW_Wealth_CE"
    rbl-precalcs="LAW_Wealth_Helper1_CE|RBLInput|RBLHelperResults,LAW_Wealth_Helper2_CE"></div>
```

# To Document
mixing config precedence
footnote syntax
options
methods on katapp
TODO - get rid of ejs-output, ejs-visiblity table and use rbl-value , rbl-display


## NEW Using templates to build common controls
Templates are also used to build controls in an Kaml View that may have repetitive or complex markup.  This is accomplished by passing static data to the template that is used to create markup.  This use of templates generally does not use RBLe results, but rather static data.

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
```xml
<!-- sliders -->
<div rbl-tid="slider-control" data-inputname="iRetireAge">
<div rbl-tid="slider-control" data-inputname="iInvestmentReturn">
<div rbl-tid="slider-control" data-inputname="iBonusPercentage">
```
This is more accurate than repeating the complex markup for every slider needed and replacing all instances of 'iRetireAge'. 
## NEW Design Principles
- See documentation above
- Support multiple KATApps in a page
- JQuery plugin
- Very close backward compatiblity so that existing DSTs and possibly ESS sites can be very simply convered (I'm doing BW FSA calculator as a test)
- Browser client initiates RBLe registration via AJAX and gets registration token back.  This allows plugin to manage and recover from errors and timeout.  This doesn't mean browser has all data - 'client initiates' can mean the browser tells server code to register.  But then the RBLe return would be passed through to the browser client.
- All `<inputs>` and result processing is isolated to the katapp instance/view.
- `<inputs>` should use `[name]` attrib, not id (in case different views have same input). <--valid? Will we get burned on radio? Not required to be in a form.
- Discuss a mechanism to 'get' data via webservice as opposed to getting via a registration?
- Easy javascript/console mechanisms for debugCE, expireCE, TestCE, TestView, TestPlugin
- Template expansion: A view should be able to create custom templates. Including ablity to 'register' any post-calc javascript.  See registerControlFunction method.
- A view must have a calcengine configured via `<rbl-config calcengine="Conduent_Sample_SE"/>`.  Need a default for the 'generic view'
- Initializing KatApp - see documentation above, plus:
    - If no view configured in tag, must specify view and/or calcengine in javascript.  
    - javascript config will take precedence over attributes
    - if only calcengine specified, 'generic' view will be used that relies on CE table ejs-output and/or ejs-markup
- Tom's plugin flow:
```javascript
//rough outline of flow.
//RBLEvents.onCalcStart and onCalcStop manage loaders and disabling inputs
$(".katapp").RBL().appInitialize(
    $.appLoadView(
        RBLEvents.onCalcStart(); //might be 'implied' with visible loaders
        //ajax load view (custom processing and control functions registered)
        //ajax load templates (control functions registered)
        //build templates with data-*
        $.appConfigureUI(
            //just sets iConfigureUI=1 option and calls appCalculate
            $.appCalculate(
                RBLEvents.onCalcStart()
                //initiates RBLe registration if needed
                //submits to RBLe service
                //handles errors with attempt to reregister and a 'retry' of once to avoid loop if error persists
                $.appProcessResults(
                    //process content/results
                    //missing output for tables and charts
                    //needs *-control templates.  (have some dummy controls)
                    $.callControlFunctions(
                        //runs all control functions for any view that calcs
                        //needs flow work
                        if (iConfigureUI) {
                            configFunctions[]
                            RBLEvents.onConfigureUI //wires up events
                            .data().customConfigureUI //$({viewid}).registerFn() trick
                        } 
                        calcFunctions[
                            //sliders & other controls
                            //carousels
                            //charts?
                            //tables?  discuss how to support existing tables.
                        ]
                    )
                    RBLEvents.customProcessing(
                        //limited to view
                        .data().customProcessing //$({viewid}).registerFn() trick
                    )
                    RBLEvents.onCalcStop();
                )
            );
        );
    );
);
//Errorhandlers all call RBLEvents.onCalcStop
```
- Entry points:
    - Standard init will be to load a view
    - Should also be able to launch a katapp where the view is not dynamic, but rather is just the existing markup (think of converting a DST and just using current markup...tho maybe better as a dynamic view anyway)  
    - In the case of using existing markup, you will just specify the calcengine.  Here's how current BW_HSA is launched using my flow above:
```javascript
    $("#katapp").RBL().appOptions( rbleOptions ); //basically configure calcengine
    $("#katapp").RBL().appConfigureUI( rbleOptions );
```


## Ignore rest - unorganized notes.

 (1) Building a page before any RBL results and feeding results from data- (i.e. like sliders)
        Template ID (tid) "slidercontrol":
            <rbl-template tid="slidercontrol">
                <div id="slider-{inputname}">add'l markup</div>
            </rbl-template>

        View markup: <div rbl-tid="slidercontrol" data-inputname="iReturn"></div>
 
 (2) Building from RBLe results
        Template ID (tid) "li-item":
            <rbl-template tid="li-item">
                <li>{text} ({tip})</li>
            </rbl-template>

        rbl-source: get a collection or collection item for the template.
            Collection: rbl-source="considerations"
             -Will create markup based on template for each item (row) in table
             -Example: <ul rbl-tid="li-item" rbl-source="considerations"></ul>

            Collection Item: rbl-source="benefit-savings.fsa"
             -Will create markup based on template just for the given 'fsa' item:
             -Example: <div rbl-tid="pill-display" rbl-source="benefit-savings.fsa"></div>
 (3) One time page build by creating
        <ol rbl-source="elections.alert-visible.1">
            <li>{title} - {alert-text}</li>
        </ol>


(3) ejs-markup allows for creating as much content, in any form into a target selection
    selector = jquery selector applied to view markup
    addClass, removeClass, html correspond to jquery methods.  
    starting the html with an "&" means append (versus replace)


State Tables: dependents
<div class="skipRBLe" rbl-input-table="dependents">
-must have skipRBLe, then input table built up by RBLe.js

RBLInput
<dependents>
dependents
RBLResult
dependents

RBLInitializeInputTableDefaults( .selector, resultTableName)

iConfigureUI = 1
RBLInitializeInputTableDefaults( [data-table=dependents], dependents)
//copy RBLResult.dependents to <div> as follows
[what is data-column?]

RBLUpdateInputTable( "tablename", "index", [ {inputs} ])
// if index not found, create new
// { ["@delete": "1"] }

rbl-preserve

RBLInitializeInputTableDefaults( .selector, resultTableName)

"SaveCE":"tomaney",

wouldprefer more like this

'''
<div class="skipRBLe" rbl-input-table="dependents" rbl-source="dependents">

        <div class="RBLe-input-table skipRBLe" data-table="dependents">
            <div data-category="Election" data-index="2020AE-01">
                <input data-column="benefit-type" type="text" value="01" />
                <input data-column="plan-code" type="text" value="02" />
                <input data-column="option-code" type="text" value="03" />
                <input data-column="coverage-ssns" type="text" value="111|333" />
            </div>
            <div data-category="Election" data-index="2020AE-02">
                <input data-column="benefit-type" type="text" value="02" />
                <input data-column="plan-code" type="text" value="02" />
                <input data-column="option-code" type="text" value="01" />
                <input data-column="coverage-ssns" type="text" value="111|" />
            </div>
        </div>





        <div class="RBLe-input-table skipRBLe" data-table="CurrentElections">
            <div data-category="Election" data-index="2020AE-01">
                <input data-column="benefit-type" type="text" value="01" />
                <input data-column="plan-code" type="text" value="02" />
                <input data-column="option-code" type="text" value="03" />
                <input data-column="coverage-ssns" type="text" value="111|333" />
            </div>
            <div data-category="Election" data-index="2020AE-02">
                <input data-column="benefit-type" type="text" value="02" />
                <input data-column="plan-code" type="text" value="02" />
                <input data-column="option-code" type="text" value="01" />
                <input data-column="coverage-ssns" type="text" value="111|" />
            </div>
        </div>
'''