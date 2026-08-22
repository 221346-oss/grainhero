/**
 * The SuperAdmin overview's building blocks now live in the shared app layer so
 * every platform page can use the same vocabulary. Kept as a re-export so the
 * dashboard's existing imports keep working.
 */
export { Panel, SectionLabel, PanelHeader, DeltaChip, Rail, fmtPKR, compact } from "@/components/app/surface";
