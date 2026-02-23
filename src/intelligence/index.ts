/**
 * Intelligence Module
 * AI-powered news collection and analysis
 */

// Collector
export { NewsCollector, newsCollector } from "./collector.js";
export type { RawArticle, FetchResult, RSSItem } from "./collector.js";

// Analyzer
export { AIAnalyzer, aiAnalyzer } from "./analyzer.js";
export type { ArticleAnalysis, Insight, AnalyzedArticle, Trend } from "./analyzer.js";
