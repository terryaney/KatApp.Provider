interface CalculationInputs {
    iConfigureUI?: number;
    iDataBind?: number;
    iInputTrigger?: string;
}
interface CalculationInputTableRow {
    index: string;
}
interface CalculationInputTable {
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
        [key: string]: ResultTableColumnConfiguration;
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
}
interface ListRow {
    key: string;
    text: string;
    class?: string;
    subtext?: string;
    html?: string;
    visible?: string;
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
    payload?: string;
    Exception?: {
        Message: string;
        StackTrace?: string;
    };
    Diagnostics?: JSON;
    Resources?: {
        Resource: string;
        Content: string;
        DateLastModified: Date;
    }[];
    RBL?: {
        Profile: {
            Data: {
                TabDef: JSON;
            };
        };
    };
    registeredToken?: string;
}
interface RBLeServiceCallback {
    (data: RBLeServiceResults): void;
}
interface ResultRowLookupsInterface {
    [key: string]: {
        LastRowSearched: number;
        Mapping: {
            [key: string]: number;
        };
    };
}
