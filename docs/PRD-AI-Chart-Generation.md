# AI Chart Generation — PRD

**Status:** Draft
**Owner:** Chris (PM, Visualizations)
**Last updated:** May 18, 2026

---

## Supported Chart Types (KPI / visualization)

| Chart | Use when | Properties | Anti-patterns |
|---|---|---|---|
| badge_singlevalue | Single scalar KPI / headline number | *paste properties here* | |
| badge_vert_bar | Comparing categories (short labels, ≤8 items) | *paste properties here* | |
| badge_horiz_bar | Comparing categories (long labels, top-N, or >8 items) | *paste properties here* | |
| badge_vert_stackedbar | Two dimensions with one measure (dimension split) | *paste properties here* | |
| badge_trendline | One series over time (requires calendar column) | *paste properties here* | |
| badge_two_trendline | Two series over time (requires calendar column) | *paste properties here* | |
| badge_pie | Part-to-whole, ≤5 slices | *paste properties here* | |
| badge_donut | Part-to-whole, ≤5 slices, center available for a summary (forbids VALUE aggregation) | *paste properties here* | |
| badge_basic_table | Detail / multi-metric table | *paste properties here* | |

---

## Supported Slicer / Selector Types (filter controls)

| Selector | Use when | Properties | Anti-patterns |
|---|---|---|---|
| badge_date_selector | Date range filter (requires calendar column) | *paste properties here* | |
| badge_range_selector | Numeric range filter (uses MIN/MAX mappings) | *paste properties here* | |
| badge_radio_selector | Single-select, 2–5 categorical options | *paste properties here* | |
| badge_checkbox_selector | Multi-select, 2–10 categorical options | *paste properties here* | |
| badge_dropdown_selector | Multi-select, >10 options or space-constrained | *paste properties here* | |
| badge_slicer | Prominent primary filter, pill UI, ~5–20 options | *paste properties here* | |
