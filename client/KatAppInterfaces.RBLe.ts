// RBLe Service Callback handler and input/result classes
interface CalculationInputs
{
    iConfigureUI?: number;
    iDataBind?: number;
    iInputTrigger?: string;
}
interface CalculationInputTableRow {
    index: string;
}
interface CalculationInputTable
{
    Name: string;
    Rows: CalculationInputTableRow[];
}
interface ContentsRow {
    section: string;
    type: string;
    item: string;
    class?: string;
}
interface ResultTableColumnConfiguration { 
    name: string;
    cssClass?: string;
    isTextColumn: boolean;
    xsColumns?: number;
    smColumns?: number;
    mdColumns?: number;
    lgColumns?: number;
    width?: number;
    widthPct?: string;         
}
interface ResultTableConfiguration {
    totalRows: number;
    columnConfiguration: { 
        [ key: string ]: ResultTableColumnConfiguration;
    };
    columnConfigurationQuery: Array<ResultTableColumnConfiguration>;
}
interface ResultTableRow extends JSON {
    "@id"?: string;
    "@code"?: string;
}
interface ResultTableColumn {
    "@class"?: string;
    "@width"?: string;
    "@r-width"?: string;
    "@xs-width"?: string;
    "@sm-width"?: string;
    "@md-width"?: string;
    "@lg-width"?: string;
}
interface RBLeRowWithId {
    "@id": string;
}
interface RBLeDefaultRow extends RBLeRowWithId {
    value?: string;
}
interface HtmlContentRow {
    "@id"?: string;
    content?: string;
    html?: string;
    value?: string;
    selector?: string;
    addclass?: string;
    removeclass?: string;
}
interface ValidationRow {
    "@id"?: string;
    text: string;
}
interface ListControlRow {
    "@id": string;
    table: string;
    rebuild?: string;
}
interface ListRow {
    key: string;
    text: string;
    class?: string;
    subtext?: string;
    help?: string;
    html?: string;
    visible?: string;
    disabled?: string;
    "start-group"?: string;
}
interface SliderConfigurationRow {
    "@id": string;
    min: string;
    max: string;
    default?: string;
    step?: string;
    format?: string;
    decimals?: string;
    "pips-mode"?: string;
    "pips-values"?: string;
    "pips-density"?: string;
}
interface RBLeServiceResults {
    payload?: string; //if from l@w wrapper, escaped string returned

    // Exception is only present if RBLe service threw exception and
    // it was able to catch it and package up exception details
    Exception?: {
        Message: string;
        StackTrace?: string;
    };

    Diagnostics?: JSON; // Should define interface for nested items
    
    // Only present after successful 'get resource' call
    Resources?: {
        Resource: string;
        Content: string;
        DateLastModified: Date;
    }[];

    // RBL is only present after successful calculation
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };

    // RegisteredToken is only present after successful registration
    registeredToken?: string;
}
interface RBLeServiceCallback {
    ( data: RBLeServiceResults ): void;
}
interface ResultRowLookupsInterface { 
    [ key: string ]: {
        LastRowSearched: number;
        Mapping: { 
            [ key: string ]: number; 
        };
    }; 
}