# KatApp Documentation Contents
- [Overview](#Overview)
    - [Definitions](#Definitions)
    - [Required Javscript Files](#Required-Javscript-Files)
- [Initializing and Configuring a KatApp](#Initializing-and-Configuring-a-KatApp)
    - [Configuring via KatApp Attributes](#Configuring-via-KatApp-Attributes)
    - [Configuring via Javascript Configuration Object](#Configuring-via-Javascript-Configuration-Object)
    - [Initialize multiple KatApps](#Initialize-Multiple-KatApps)
    - [Configuring CalcEngines and Input/Result Tabs](#Configuring-CalcEngines-and-Input/Result-Tabs)
    - [Using Kaml View's `<rbl-config>` for Configuration](#Using-Kaml-View's-<rbl-config>-for-Configuration)
    - [Multiple CalcEngines and Result Tabs](#Multiple-CalcEngines-and-Result-Tabs)
    - [Configuration Precedence](#Configuration-Precedence)
- [Kaml View Specifications](#Kaml-View-Specifications)
    - [RBLe Attributes used in Kaml View](#RBLe-Attributes-used-in-Kaml-View)
    - [RBLe Selector Paths](#RBLe-Selector-Paths)
    - [rbl-display Attribute Details](#rbl-display-Attribute-Details)
    - [Legacy _Push_ Processing](#Legacy-_Push_-Processing)
        - [ejs-output Table](#**ejs-output**)
        - [ejs-visibility Table](#**ejs-visibility**)
    - [Required _Push_ Processing](#Required-_Push_-Processing)
        - [ejs-defaults Table](#**ejs-defaults**)
        - [ejs-listcontrol Table](#**ejs-listcontrol**)
            - [ejs-listcontrol data source Tables](#**ejs-listcontrol-data-source**)
        - [ejs-sliders Table](#**ejs-sliders**)
        - [ejs-disabled Table](#**ejs-disabled**)
        - [skip-RBLe Table](#**skip-RBLe**)
        - [errors And warnings Tables](#**errors/warnings**)
        - [ejs-markup Table](#**ejs-markup**)
- [Templates](#Templates)
    - [Template Attributes](#Template-Attributes)
    - [Inline Templates](#Inline-Templates)
    - [Automatically Processed Templates](#Automatically-Processed-Templates)
        - [ResultBuilder Framework Tables](#ResultBuilder-Framework-Tables)
        - [ResultBuilder Framework Charts](#ResultBuilder-Framework-Charts)
    - [Building Common Controls](#Building-Common-Controls)
- [ResultBuilder Framework](#ResultBuilder-Framework)
    - [Table Template Processing](#Table-Template-Processing)
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
# Overview
A KatApp is a dynamic html application delivered to a host platform such as Life@Work.  Conceptually, its like a CMS, but instead of static content, it provides for dynamic content containing potentially complex business logic and controls and data and results.

## Definitions

Term | Definition
---|---
KatApp | Dynamic webpage content driven by AJAX, using Kaml Views and RBLe Service
RBLe Service | Rapid Business Logic calcuation service.  Contains all business logic.  Driven by a CalcEngine
CalcEngine | Specialized Excel speadsheet that drives business logic
RBLe Results | Results from RBLe Service
KatApp Plugin | Jquery plugin to enable KatApp's
KatApp element | HTML element that is target for the KatApp.  Example: `<div id="KatApp"></div>`
Host Platform | Web Application hosting the KatApp, i.e. Life@Work / Phoneix
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
<rbl-config calcengine="LAW_Wealth_CE"
    input-tab="RBLInput"
    result-tabs="RBLResult"
    templates="Standard_Templates,LAW:Law_Templates"></rbl-config>
```

## Multiple CalcEngines and Result Tabs

KatApp's are capable of leveraging multiple CalcEngine inside a single Kaml View file.  You can pass these in using two of the described mechanisms above.  Multiple CalcEngines can be configured only by a Javascript configuration object or via the `<rbl-config>` element.

When multiple CalcEngines or result tabs are used, additional information is required to pick the appropriate results.  See [RBLe Selector Paths](#RBLe-Selector-Paths) for more information describing `rbl-ce` and `rbl-tab`.  

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

As noted, there are three ways to configure KatApp's with each method have a specific precedence that can override the same settings set via different methods.  The configuration precedence is as follows.

1. Javascript configuration object
2. KatApp element attributes
3. `<rbl-config>` attributes

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
rbl-ce | If multiple CalcEngines are used, can provide a `key` to a CE to indicate which CalcEngine to pull value from.
rbl-tab | If multiple tabs are returned from a CalcEngine, can provide a name which tab to pull value from.
rbl-value | Inserts a value from RBLe Service
rbl-source<br/>rbl&#x2011;source&#x2011;table | Indicates row(s) from an RBLe result table used to process a template.  Pairs with rbl-tid<br/>&nbsp;
rbl-tid | Indicates what RBL template to apply to the given source rows.  Results from template and data replace element content.
rbl-display | Reference to boolean RBLe result data that toggles display style (uses `jQuery.show()` and `jQuery.hide()` ).

<br/>

## RBLe Selector Paths
There are two ways to use `rbl-value` attribute.  You can provide simply an 'id' that will look inside the `ejs-output` table.  Or you can provide a 'selector path'.  Both mechanisms can be used in conjunction with `rbl-ce` and `rbl-tab`.

Selector&nbsp;Path | Description
---|---
id | Look in `rbl-value` (legacy `ejs-output`) table for row where row id is `id` and return the value column.
table.id | Look in `table` table for row where row id is `id` and return the value column.
table.id.column | Look in `table` table for row where row id is `id` and return the `column` column.

```html
<!-- Table: rbl-value/ejs-output, ID: ret-age, Column: value -->
<span rbl-value="ret-age"></span>

<!-- Table: benefit-savings, ID: ret-age, Column: value -->
<span rbl-value="benefit-savings.ret-age"></span>

<!-- Table: benefit-savings, ID: ret-age, Column: year -->
<span rbl-value="benefit-savings.ret-age.year"></span>

<!-- 
CalcEngine:default, Tab: RBLRetire
Table: rbl-value/ejs-output, ID: ret-age, Column: value
-->
<span rbl-tab="RBLRetire" rbl-value="ret-age"></span>

<!-- 
CalcEngine: 'Shared' (key=Shared), Tab: first/default
Table: rbl-value/ejs-output, ID: ret-age, Column: value
-->
<span rbl-ce="Shared" rbl-value="ret-age"></span>

<!-- 
CalcEngine: 'Shared' (key=Shared), Tab: RBLRetire
Table: rbl-value/ejs-output, ID: ret-age, Column: value
-->
<span rbl-ce="Shared" rbl-tab="RBLRetire" rbl-value="ret-age"></span>
```

## rbl-display Attribute Details
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

## Legacy  _Push_ Processing

KatApps are an upgrade to original RBLe Service processing in that Kaml Views are able to _pull_ information from the CalcEngine and able to pull it from specific locations using 'selector paths'.  After a calculation is finished, all elements using `rbl-value`, `rbl-source`, `rbl-tid`, or `rbl-display` binding attributes are automatically updated/processed.  

The original RBLe Service processing was a _push_ pattern.  So instead of elements being bound to specific values, all CalcEngine results were processed and searched for any elements with special class names that matched `id` elements in the results and if a match was found, the CalcEngine value was pushed to the element.

Kaml Views still supports legacy _push_ processing for values and visibility, but using the binding attributes is the preferred mechanism as it expresses clear intent of which elements are bound to the CalcEngine and where the data should be pulled from.

### **ejs-output** 

Legacy functionality replaced by `rbl-value` processing.  Set the content for any element based on CSS classes.

Column | Description
---|---
id | The CSS class of one or more elements in your Kaml View (i.e. `introText`). 
value | The content to set.  (Supports text or HTML)

<br/>

### **ejs-visibility**

Legacy functionality replaced by `rbl-display` processing.  Set the visiblity for any element based on CSS classes.

Column | Description
---|---
id | The CSS class of one or more elements in your Kaml View (i.e. `introText`). 
value | Whether or not to hide the element.  If `value` is `0`, the element will be hidden.

<br/>

## Required  _Push_ Processing

Even though it is preferrable to have _pull_ over _push_ for content and visibility, there are still some tables that either require push processing or are much better suited for a _push_ pattern.  In these cases, the source tables in the CalcEngines are usually very focused; only turned on during the initial configuration calculation and/or have a very limited number of rows.  By paying attention to the processing scope of these tables (only returning information when needed and minimizing the rows), you can ensure that Kaml Views remain performant.

### **ejs-defaults**
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

### **ejs-listcontrol** 
Find and populate 'list' controls (dropdown, radio button list, or checkbox list) that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
table | The name of the data source table that provides the list items for the control specified by id. 

<br/>

#### **ejs-listcontrol data source** 
Typically, `ejs-listcontrol` and its data tables are only returned during a configuration calculation to initialize the user interface.  However, if the list control items are dynamic based on employee data or other inputs, the typical pattern is to return all list items possible for all situations during the configuration calculation, and then use the `visible` column to show and hide which items to show.  During subsequent calculations, when items are simply changing visibility, for performance enhancements, the only rows returned in the data source table should be the rows that have dynamic visiblity.

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

### **ejs-sliders** 
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
1. The default selector path of `ejs-defaults.{id}.value`.
2. The `default` column in the `ejs-slider` row.
3. The current value of the hidden slider html input (if set directly via markup).
4. The `min` column in the `ejs-slider` row.

<sup>2</sup> The slider value is displayed in the element that has a CSS class of `sv{id}`.  
<sup>3</sup> See [API documentation](https://refreshless.com/nouislider/pips/) for documentation on using `pips-*` values.

<br/>

### **ejs-disabled**
Find and enable or disable inputs that have a CSS class matching the `id` column.

Column | Description
---|---
id | The name of the input in your Kaml View (i.e. iMaritalStatus). 
value | Whether or not to enable or disable the input.  If `value` is `1`, the input will be disabled, otherwise enabled.

<br/>

### **skip-RBLe**
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

### **ejs-markup**
This table is an evolution of the legacy `ejs-outputs` table in the fact that is allows you to inject content into a Kaml View.  It also has ability to manage CSS class state for elements.

Column | Description
---|---
selector | Any valid jQuery selector to use to find element(s).
html | The html to inject.  If `html` starts with `&` it is appended to existing html of the matched element, otherwise the element's content is replaced with html.<br/><br/>Additionally, `html` can be in the form of `<div rbl-tid="templateId" data-value1="templatevalue1"></div>` (See [Templates](#Templates) for more detail).  If it is a template, it will be 'templated' before injecting into the html.
addclass<sup>1</sup> | A `space` delimitted list of CSS class names to add to the matched element.
removeclass<sup>1</sup> | A `space` delimitted list of CSS clsas names to remove from the matched element.

<sup>1</sup> `addclass` and `removeclass` are processed after all html content creation is finished so that selectors can be apply to the dynamically created html.

# Templates

Templates are a powerful tool in KatApp Views.  Templates are a small markup snippet that are combined with a data object to render content.

The data object can come from static `data-*` attributes or from an RBLe Service result row.  When using RBLe Service result rows, the `rbl-source` attribute is required and the selector path is defined as follows.

Selector&nbsp;Path | Description
---|---
table | The name of the table to use as the data source.  The defined template with be applied to each row and injected into the Kaml View.
table.id | Will only process the row from `table` where the row id  equals `id`.
table.column.value | Will only process rows from `table` where the value of `column` equals `value`.

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

## Template Attributes

There is additional control that can be applied when processing Kaml templates.

Attribute | Description
---|---
rbl&#x2011;preserve | Normal processing of a template starts off with all child content of the target being removed.  Setting the content to the templated content.  If you want some content to be preserved, add the `rbl-preserve` _CSS class_ to any child elements that should not be replaced.
rbl&#x2011;preprend | When templated content is inserted into the Kaml View, by default it is inserted at the end of the element content.  If you are preserving items and you want it inserted at the beginning of the element content, set `rbl-prepend` attribute to `true`.

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
Normally, templates are created via a `<rbl-template tid="template-name">...</div>` element and used via a `<div rbl-tid="template-name"></div>` element.  You can also use inline templates by using the `rbl-tid="inline"` attribute on the child element.  The `rbl-tid="inline"` _must_ be the first element inside the `rbl-source="table"` element.

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
**Note**: All elements with a `rbl-tid` attribute are automatically hidden from the UI.

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

# ResultBuilder Framework

## Table Template Processing

All tables rendered by ResultBuilder Framework use the generic rules described below.  Simply put, only columns starting with `text` or `value` are rendered.  The ResultBuilder Framework generates the table based on the columns present in the `rbl-tablename` table from the CalcEngine.

Table&nbsp;Column | Description
---|---
id | An arbitrary 'id' value for each row.  Used in selector paths and also used to detect 'header' rows.
on | Whether or not this row gets exported. 
code | Same rules as id column for rendering 'header' rows.
class | Optional CSS class to apply to the table row (`tr` element).
span | Optional column to use to define column spanning within the row.textX | Render content with `text {table}-{column}` CSS class. `text` by default causes left alignment.
valueX | Render content with `value {table}-{column}` CSS class. `value` by default causes right alignment.
width<br/>r-width | If you want explicit control of column widths via absolute or percentage, values can be provided here.  `r-width` is used when the table has a CSS class of `table-responsive` applied.
xs-width<br/>sm-width<br/>md-width<br/>lg-width | If you want explicit control of column widths via bootstrap column sizes, values can be provided here.  **Note:** If any bootstrap viewport width is provided, the `width` column is ignored.

<br/>

### colgroup Processing

The first row returned by the `rbl-source` table is used to build the `colgroup` element inside the `table` element.  For each `text*` and `value*` column it generates a `col` element as`<col class="{table}-{column}">`.  Additional width processing is desribed in the [Columns Widths](#Columns-Widths) section.

### Header Rows

The `id` and `code` columns are used to detect header rows.  Row ids do _not_ have to be unique.  However, the only time they possibly shouldn't be unique is when they are identifying header rows.  Otherwise, you cannot guarantee selecting the proper row if used in a selector path.  If the `id`/``code` column is `h`, starts with `hdr` or starts with `header`, then the cell element will be a `th` (header), otherwise it will be a `td` (row).

All 'header' rows processed before the _first_ non-header row is processed will be placed inside the `thead` element, after which, all remaining rows (data and header) will be placed inside the `tbody` element.

### Automatic Column Spanning

For header rows, if only one column has a value, it automatically spans all columns.

### Manual Column Spanning

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

### Column Widths

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

## Highcharts Template Processing

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
config-visible | 1 | 1 | 1 | 0
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
---|---|---|---|---|---
config-name | Shortfall | 401(k) Plan | Non Qualified Savings Plan | HSA | Personal Savings | Retirement Income  Needed
config-color | #FFFFFF | #006BD6 | #DDDDDD | #6F743A | #FD9F13 | #D92231
config-type | areaspline | column | column | column | column | spline
config-fillOpacity | 0 |||||			
config-showInLegend | 0 | 1 | 1 | 1 | 1 | 1

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

Value | API Value Type | Description
---|---|---
`blank` or `null` | `undefined` | If no value or value of `null` (case insensitive) is returned, `undefined` will be assigned to the property value.
numeric | numeric | If the value returned can be parsed into a number, a numeric value will be assigned to the property value.
`true` or `false` | boolean |  If a value of `true` or `false` (case insensitive) is returned, a `boolean` value will be assigned to the property value.
`json:{ name: value }` | object | If a value starting with `json:` is returned, the json text will be parsed and the resulting object will be assigned to the property value.
`eval [1,2]` | any | If a value starting with `eval ` is returned, the text following the `eval` prefix is _parsed and evaluated_ as Javascript and the resulting value (can be any type) is assigned to the property value.  In the example shown here, an integer array of `[1,2]` would be assigned to the property.  Assigning properties of type array are most common use of this syntax.
`function () { return String.localeFormat("{0:c0}", this.y); }` | function: any | For API properties that can be assigned a function, if a value starting with `function ` is returned, it will be parsed as a valid function and assigned to the property.

<br/>

### Language Support

The 'culture' of the table can be set via the CalcEngine.  If the results have a `variable` row with `id` of 'culture', then the language preference will be set to the `value` column of this row.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  By default, `en-US` is used.

# Advanced Configuration

KatApps have advanced features that can be configured that manage input handling (via attributes), CalcEngines (via Precalc Pipelines) and hooking into the calculation lifecycle events.

## RBLe Service Attributes / Classes

By decorating elements with specific CSS class names<sup>1</sup>, RBLe Service functionality can be controlled.

Class | Purpose
---|---
rbl&#x2011;nocalc<br/>skipRBLe<sup>2</sup> | By default, changing any `<input>` value in the view will sumbit a calc to the RBLe service.  Use this class to supress submitting a calc.  Note this input will still be included in calcuations, but that changing it does not initate a calc.
rbl&#x2011;exclude<br/>notRBLe<sup>2</sup> | By default, all inputs in the view are sent to RBLe calculation.  Use this class to exclude an input from the calc.  This will also prevent this input from initating a calc on change.
rbl&#x2011;preserve | Use this class in child elements beneath `[rbl-source]` so that when the element is cleared on each calculation, an element with class 'rbl-preserve' will not be deleted.
 
\
<sup>1</sup> Future versions of KatApp's may move these classes to attributes.  
<sup>2</sup> Legacy class name.  Prefer using the current class name when possible.  

## Precalc Pipelines
Precalc CalcEngines simply allow a CalcEngine developer to put some shared logic inside a helper CalcEngine that can be reused.  Results from each CalcEngine specified will flow through a pipeline into the next CalcEngine.  Precalc CalcEngines are ran in the order they are specified ending with the calculation of the Primary CalcEngine.

The format used to specify precalc CalcEngines is a comma delimitted list of CalcEngines, i.e. `CalcEngine1,CalcEngineN`.  By default, if only a CalcEngine name is provided, the input and the result tab with the *same* name as the tabs<sup>1</sup> configured on the primary CalcEngine will be used.  To use different tabs, each CalcEngine 'entity' becomes `CalcEngine|InputTab|ResultTab`.  

By specifying precalc CalcEngine(s), the flow in RBLe Service is as follows.

1. Load all inputs and data into precalc CalcEngine and run calculation.
2. Any tables returned by the configured result tab<sup>1</sup> are then passed to the next CalcEngine in the pipeline as a *data* `<history-table>` on the input tab.

<sup>1</sup> For precalc CalcEngines, only one result tab is supported.

### Sample 1: Two precalc CalcEngines
Configure two CalcEngines to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE and LAW_Wealth_Helper2_CE both use the same tabs configured on LAW_Wealth_CE.

```html
<div id="KatApp-wealth" 
    class="KatApp" 
    rbl-view="LAW:WealthDashboard" 
    rbl-calcengine="LAW_Wealth_CE"
    rbl-precalcs="LAW_Wealth_Helper1_CE,LAW_Wealth_Helper2_CE"></div>
```

### Sample 2: Custom CalcEngine Tabs
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
element | DOM Element | The Document Object Model (DOM) element that represents the KatApp.  All input and result processing are scoped to this DOM Element.  CSS style should be scoped as well.
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
inputSelector | string | A jQuery selector that specifies which inputs inside the view are considers RBLe Calculation Service inputs.  By default, _all_ inputs are selected via a selector of `input, textarea, select`.
viewTemplates | string | A `comma` delimitted list of Kaml Template Files to use in the form of `Folder:Template,Folder:Template,...`.
ajaxLoaderSelector | string | A jQuery selector that indicates an item to show at the start of calculations and hide upon completion.  By default, `.ajaxloader` is used.
calcEngines | [CalcEngine](#CalcEngine-Object)[] | An array of CalcEngine objects specifying which CalcEngine(s) should drive the current Kaml View.
manualInputs | [OptionInputs](#OptionInputs-Object) | Provide inputs that should _always_ be passed in on a calculation but aren't available in the UI, they can be assigned here.
defaultInputs | [OptionInputs](#OptionInputs-Object) | Provide default inputs to use when the KatApp is initialized or updated via [method calls](#KatApp-Methods) .  `defaultInputs` are only applied one time.
registerDataWithService | boolean | Whether or not data will be registered with the RBLe Service.  Default value is `true`.  If true, usually the `registeredToken` is passed in, but it can be created via an event handler triggered during the calculation lifecycle.  If false, the `data` property is usually passed in, but it can be created via an event handler triggered during the calculation lifecycle.
registeredToken | string | If the participant data was registered by hosting site, it will provide the `registeredToken` to the KatApp so that it can pass that to the RBLe Service during calculation ajax calls.
data | [KatAppData](#KatAppData-Object) | Participant data to pass to RBLe Service for calculations.
shareDataWithOtherApplications | boolean | If multiple KatApps on are on page, one data source can be shared across all KatApps by setting this to `true`.
sessionUrl | url | When `registerDataWithService` is `true`, this url will be called for calculation ajax calls.  Default value is `https://btr.lifeatworkportal.com/services/evolution/Calculation.ashx`.
functionUrl | url | This url is used for all resource requests and also, if `registerDataWithService` is `false`, all calculation ajax calls.  Default value is `https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx`.
rbleUpdatesUrl | url | Base end-point url that is used for data updates, file uploads, server calculations, DocGen generation, etc.
currentPage | string | String identifier for the current page.  This value is passed to CalcEngines in the `iCurrentPage` input.
requestIP | string | IP Address of client browser.  Used during calculation job logging.
environment | string | The environment the current Kaml View is running in.  This value is passed to CalcEngines in the `iEnvironment` input.
currentUICulture | string | The current culture the Kaml View is being rendered under.  This value is passed to CalcEngines in the `iCurrentUICulture` input.
relativePathTemplates | [RelativePathTemplates](#RelativePathTemplates-Object) | Configure views and relative paths when Kaml View files are located in the hosting site instead of the Kaml View CMS

<br/>

### DebugOptions Object

Property | Type | Description
---|---|---
traceVerbosity | TraceVerbosity | Set the minimum allowed trace level to be displayed.  Values are : `None`, `Quiet`, `Minimal`, `Normal`, `Detailed`, or `Diagnostic`.
debugResourcesDomain | string | Set the base domain/url to use if `allowLocalServer` is `true` when attempting to find local resource files.  Default value is `http://localhost:8887/DataLocker/`.
saveFirstCalculationLocation | string | Signals to the RBLe Service that the first calculation should save a debug CalcEngine to this location.  By default, the `save` querystring will set this.
refreshCalcEngine | boolean | If `true`, it signals to the RBLe Service to check for new CalcEngines from the CalcEngine CMS immediately instead of waiting for cache to expire.  By default, the `expireCE=1` querystring will set this to true.
useTestCalcEngine | boolean | Whether or not the RBLe Service should use the test version of a CalcEngine (if it is present).  By default, the `test=1` querystring will set this to true.
useTestView | boolean | Whether or not the Kaml View CMS should use the test version of a Kaml View (if it is present).  By default, the `testView=1` querystring will set this to true.  If `relativePathTemplates` is configured in the [KatAppOptions Object](#KatAppOptions-Object), this setting is ignored.
useTestPlugin | boolean | Whether or not the Kaml View CMS should use the test version of the KatAppProvider.js file (if it is present).  By default, the `testPlugin=1` querystring will set this to true.
allowLocalServer | boolean | Whether or not resource files (provider, views, and templates) should attempt to be loaded from the `debugResourcesDomain`.  By default, the `allowLocal=1` querystring sets this to true.
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
        Client: "Conduent",
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
    "@calcEngine": "Conduent_CalcEngine_SE.xlsm",
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

## KatApp Methods

Once you have a reference to a KatApp Object, the following methods are available.

**`.destroy()`**

Removes the KatApp implementation from the targetted DOM element.  All event handlers registered by the KatApp and DOM attributes added by the KatApp are removed.

```javascript
$(".katapp").KatApp("destroy");
application.destroy();
```

**`.rebuild( options?: KatAppOptions )`**

Merge the optional [KatAppOptions](#KatAppOptions-Object) `options` parameter with existing KatApp options, then completely destroy and re-initialize the KatApp (possibly using new view/templates) given the newly merged options.

When `.KatApp(options)` is called, if the selector returns items that already had KatApp created on it, the plugin will call this method.

```javascript
$(".katapp").KatApp("rebuild", customOptions);
application.rebuild( customOptions);

// or, if no new options needed...
$(".katapp").KatApp("rebuild");
application.rebuild();
```

**`.updateOptions( options: KatAppOptions )`**

Merge the [KatAppOptions](#KatAppOptions-Object) `options` parameter with existing KatApp options.  This will not load new view or templates, but the CalcEngine or any other options could be updated.

If `.KatApp("ensure", options)` is called, items that did _not_ have a KatApp already created will go through normal creation and initialization process.  However, items that already had a KatApp created, will simply delegate to this method.

`updateOptions` _will_ apply `options.defaultInputs`, if present, immediately one time.

```javascript
$(".katapp").KatApp("updateOptions", updatedOptions);
application.updateOptions(updatedOptions);
```

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

**`.getInputs(): CalculationInputs`**

Returns a [CalculationInputs Object](#CalculationInputs-Object) representing all the inputs and input tables of the KatApp.

```javascript
var inputs = $(".katapp").KatApp("getInputs");
var inputs = application.getInputs();
```

**`setInputs( inputs: OptionInputs, calculate?: boolean )`**

Applys all input values of the [OptionInputs](#OptionInputs-Object) `inputs` parameter to the KatApp.  If `calculate` is true, a calculation will be triggered after all inputs have been set.  By default, `calculate` is `true`.

```javascript
$(".katapp").KatApp("setInputs", newInputs);
application.setInputs(newInputs);

// or, to disable a calculation after applying values...
$(".katapp").KatApp("setInputs", newInputs, false);
application.setInputs(newInputs, false);
```

**`setInput( id: string, value: number | string | undefined, calculate?: boolean )`**

Set the value of the input identified by `id` with the `value` parameter.  If `calculate` is true, a calculation will be triggered after all inputs have been set.  **By default, `calculate` is `false`.**

```javascript
$(".katapp").KatApp("setInput", "iRetireAge", 65);
application.setInput("iRetireAge", 65);

// or, to trigger a calculation after setting value...
$(".katapp").KatApp("setInput", "iRetireAge", 65, true);
application.setInput("iRetireAge", 65, true);
```

**`getResultTable( tableName: string, tabDef?: string, calcEngine?: string): Array<JSON>`**

Get an array of `tableName` json objects representing each row returned in the calculation results.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

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

**`getResultRow( table: string, key: string, columnToSearch?: string, tabDef?: string, calcEngine?: string ): JSON`**

Get a json object representing a row from the `tableName` in the calculation results.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If `columnToSearch` is `undefined` or not provided, the row with its id column matching `key` will be returned.  Otherwise, the row with its `columnToSearch` column matching `key` will be returned.

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

**`getResultValue( table: string, key: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined`**

Return the `column` value from the `table` row with the id column matching `key`.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If the value returned from the calculation result is `undefined`, the `defaultValue` (if provided) will be returned.

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

**`getResultValueByColumn( table: string, keyColumn: string, key: string, column: string, defaultValue?: string, tabDef?: string, calcEngine?: string ): string | undefined`**

Return the `column` value from the `table` row with the `keyColumn` column matching `key`.  `tabDef` and `calcEngine` can be provided if there are multiple result tabs or CalcEngines in the Kaml View.  If not provided, the `tableName` from the _first_ result tab and _first_ CalcEngine will be returned.

If the value returned from the calculation result is `undefined`, the `defaultValue` (if provided) will be returned.

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

**`apiAction( commandName: string, customOptions?: KatAppActionOptions, actionLink?: JQuery<HTMLElement> )`**

KatApps have the ability to call web api endpoints to perform actions that need server side processing (saving data, generating document packages, saving calculations, etc.).  

`customOptions` can be provided and have the following properties.

Property | Type | Description
---|---|---
isDownload | boolean | Optional. Set this property to `true` if the action results in the downloading of a file.
customParameters | JSON | Optional.  Any parameter values to be passed back to the server endpoint that are required for processing (i.e. plan id and document id for election required document upload).
customInputs | JSON | Optional.  Any input values that need to be passed back to the server endpoint and inserted into the input package sent to the RBLe Service calculation.

<br/>

```javascript
// download link that generates a server side DocGen package for download
$(".downloadForms", view).on('click', function (e) {
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

*I'm here, document how to set up an action-link in markup and how it flows

rbl-action-link="commandName" 
    - rbl-action-confirm-selector
    - rbl-action-download="true"
    - data-param-* (doc-id, plan-id)
    - data-input-* (don't think this is used, check for docgen link and see if anything set there)


serverCalculation( customInputs: {} | undefined, actionLink?: JQuery<HTMLElement> ) |
pushNotification(name: string, information: {} | undefined) | If multiple KatApps are on one page, a KatApp can broadcast notifications to other KatApps
saveCalcEngine( location: string ) | // $("selector").KatApp("saveCalcEngine", "terry.aney"); - save *next successful* calc for all selector items to terry.aney
refreshCalcEngine() | // $("selector").KatApp("refreshCalcEngine"); - refresh calc engine on *next successful* calc for all selector items
traceCalcEngine() | // $("selector").KatApp("traceCalcEngine"); - return calc engine tracing from *next successful* calc for all selector items
redraw( readViewOptions: boolean | undefined ) | // Redraw/re-render the view without triggering a calculation (speeds up view development time)
ensure( options?: KatAppOptions ) | 

trace( message: string, verbosity?: TraceVerbosity ) | TraceVerbosity.Normal


options/methods on KatApp
- See registerControlFunction method. - not right name, but there is similar 'template function callback' or something

## KatApp Events
get all events, don't forget about other events like file upload: onUploadStart, search for trigger()

onActionStart, onActionResult, onActionFailed, onActionComplete (always)


put sample code on how to hook up events in KamlViews - explain that events are usually there, but can be in config settings too

## Calculation Lifecycle

# To Document

Delegates available on the options...document them
    // If custom submit code is needed, can provide implementation here
    submitCalculation?: SubmitCalculationDelegate;
    // If client provides for a way to get registration data, can provide implementation here
    getData?: GetDataDelegate;
    // If custom register data code is needed, can provide implementation here
    registerData?: RegisterDataDelegate;



- framework inputs? `iConfigureUI`, `iDataBind`, and `iInputTrigger`, iCurrentPage (document valid values for environment)
					AdminAuthID = t.GetInputAddress( "iAWSAdminAuthID" ).Address,
					CurrentPage = t.GetInputAddress( "iCurrentPage" ).Address,
					CurrentUICulture = t.GetInputAddress( "iCurrentUICulture" ).Address,
					AllowTokens = t.GetInputAddress( "iAllowTokens" ).Address,
					DenyTokens = t.GetInputAddress( "iDenyTokens" ).Address,
					Environment = t.GetInputAddress( "iEnvironment" ).Address,
					DebugInputs = t.GetInputAddress( "iDebugInputNames" ).Address,
					FirstProfile = t.GetInputAddress( "iFirstProfile" ).Address,
					IsTestCE = t.GetInputAddress( "iIsTestSE" ).Address,
					TraceEnabled = t.GetInputAddress( "iTraceEnabled" ).Address,
					JobToken = t.GetInputAddress( "iJobToken" ).Address
input table management

In Views section:
    mention scoping
    explain thisClass - put a link inside KatApp Properties pointing to this documentation where it talks about DOM element, add link too to template css scoping
    explain {id}/thisview - Put link to KatApp Events so that there is example on how to use

default options (any other methods off of static KatApp? (trace,ping,defaultOptions))

Templates 
    scoping CSS - .katapp-css
    Talk about how templates can override each other
    Talk about the 'template type' property so can have diff template name but still 'processed as base'

CODE TODO - get rid of ejs-output, ejs-visiblity table and use rbl-value , rbl-display

## NEW Design Principles
- All `<inputs>` and result processing is isolated to the KatApp instance/view.
- `<inputs>` should use `[name]` attrib, not id (in case different views have same input). <--valid? Will we get burned on radio? Not required to be in a form.
