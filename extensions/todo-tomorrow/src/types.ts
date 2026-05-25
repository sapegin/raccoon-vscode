export interface KeywordConfig {
  keywords: string[];
  color: string;
  backgroundColor: string;
  // TODO: There are more supported styles
  // TODO: Add lineColor?
}

export interface ExtensionProperties {
  patterns: KeywordConfig[];
}
