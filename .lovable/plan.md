

## Plan: Import Services from URL

### Overview
Add an "Import Services" button to the service setup step that opens a dialog. The user provides a URL, we scrape it via Firecrawl, then use Lovable AI to analyze the content and extract services if it's a status page or system diagram.

### Architecture

```text
User clicks "Import" → Dialog with URL input
  → Edge function "import-services" called
    → Firecrawl scrapes the URL (markdown)
    → Lovable AI analyzes the content:
       - Status page? → Extract service names + categories
       - System diagram? → Extract components as services
       - Other? → Return "unrecognized" error
  → Frontend receives services list → merges into current state
```

### Tasks

1. **Connect Firecrawl connector** — needed to scrape the URL content

2. **Create edge function `import-services`**
   - Accepts `{ url: string }`
   - Scrapes the URL via Firecrawl API (`markdown` format)
   - Sends the markdown to Lovable AI with a prompt that asks it to:
     - Classify the resource as `status_page`, `system_diagram`, or `unknown`
     - If status page or system diagram, extract services with name, description, and category
     - Return structured output via tool calling
   - Returns `{ type, services: [{name, description, category}] }` or `{ type: "unknown", error }`

3. **Create `ImportServicesDialog` component**
   - Dialog with URL input and "Import" button
   - Loading state while scraping + analyzing
   - On success: shows preview of discovered services with checkboxes to select which to import
   - On "unknown" type: shows message that the resource type is not recognized
   - On confirm: merges selected services into existing services state, creating new categories in `extraCategories` as needed

4. **Add "Import" button to `ServiceSetupStep`**
   - Place alongside the existing "Add Category" and "Add Service" buttons
   - Opens the import dialog

### Technical Details

- **Edge function** uses `FIRECRAWL_API_KEY` for scraping and `LOVABLE_API_KEY` for AI analysis
- AI prompt instructs structured output via tool calling with a schema like:
  ```json
  {
    "type": "status_page" | "system_diagram" | "unknown",
    "services": [{ "name": "...", "description": "...", "category": "..." }]
  }
  ```
- Default model: `google/gemini-3-flash-preview`
- The dialog component will be at `src/components/create-status-page/ImportServicesDialog.tsx`
- Config.toml updated with `[functions.import-services]` and `verify_jwt = false`

