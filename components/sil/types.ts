export interface SilResponse {
  blocks: SilBlock[];
  metadata?: {
    queryType?: string;
    executionTimeMs?: number;
    dataPoints?: number;
  };
  /** Até quando vão os dados da resposta (vem do n8n, "Montar Blocos") */
  fonte?: {
    dadosAte?: string;
    atualizadoEm?: string | null;
    defasada?: boolean;
  };
}

export type SilBlock =
  | TextBlock
  | ChartBlock
  | TableBlock
  | InsightBlock
  | ActionBlock;

export interface TextBlock {
  type: "text";
  content: string;
}

export interface ChartBlock {
  type: "chart";
  chartType: "bar" | "pie" | "line" | "horizontal-bar";
  title: string;
  data: ChartData;
  config?: ChartConfig;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    values: number[];
    color?: string;
  }[];
}

export interface ChartConfig {
  currency?: boolean;
  percentage?: boolean;
  showLegend?: boolean;
  height?: number;
  referenceLine?: {
    value: number;
    label: string;
    color?: string;
  };
}

export interface TableBlock {
  type: "table";
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  highlights?: {
    rowIndex: number;
    colIndex: number;
    style: "success" | "warning" | "danger";
  }[];
}

export interface InsightBlock {
  type: "insight";
  severity: "info" | "success" | "warning" | "danger";
  icon?: string;
  content: string;
}

export interface ActionBlock {
  type: "action";
  title: string;
  items: string[];
}
