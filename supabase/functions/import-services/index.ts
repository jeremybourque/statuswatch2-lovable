const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, existingServices } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Scrape URL via Firecrawl
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: true }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape URL' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    if (!markdown) {
      return new Response(JSON.stringify({ success: false, error: 'No content found at URL' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Build existing services context
    let existingContext = '';
    if (existingServices && typeof existingServices === 'object' && Object.keys(existingServices).length > 0) {
      const lines: string[] = [];
      for (const [cat, names] of Object.entries(existingServices)) {
        if (Array.isArray(names) && names.length > 0) {
          lines.push(`  ${cat}: ${(names as string[]).join(', ')}`);
        }
      }
      if (lines.length > 0) {
        existingContext = `\n\nThe user already has these services configured:\n${lines.join('\n')}\nDo NOT include services that duplicate or are equivalent to these existing ones. Only return new services not already covered.`;
      }
    }

    // 3. Pass 1: Classify the resource
    const contentSlice = markdown.slice(0, 30000);
    console.log('Pass 1: Classifying content, length:', contentSlice.length);

    const classifyRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing web pages. You will receive the markdown content of a web page. Classify it as one of:
- "status_page": a service status or uptime page that lists services and their operational status
- "system_diagram": any page that describes system architecture, infrastructure, or components. Apply a LOOSE standard here — if the content describes interconnected services, components, layers, or anything resembling a box-and-line diagram (even as text, a list, or documentation), classify it as system_diagram. Err on the side of classifying as system_diagram rather than unknown.
- "unknown": ONLY use this if the page is clearly unrelated to services or systems (e.g. a pure blog post, marketing page, or unrelated content)

Call the classify_resource function with your finding.`,
          },
          { role: 'user', content: `Classify this web page:\n\n${contentSlice}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_resource',
              description: 'Classify the type of web page resource.',
              parameters: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['status_page', 'system_diagram', 'unknown'],
                    description: 'The type of resource identified',
                  },
                },
                required: ['type'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'classify_resource' } },
      }),
    });

    if (!classifyRes.ok) {
      if (classifyRes.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (classifyRes.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits in Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await classifyRes.text();
      console.error('AI classify error:', classifyRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'AI classification failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const classifyData = await classifyRes.json();
    const classifyCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];
    if (!classifyCall?.function?.arguments) {
      console.error('No tool call in classify response:', JSON.stringify(classifyData));
      return new Response(JSON.stringify({ success: false, error: 'AI could not classify the content' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type: resourceType } = JSON.parse(classifyCall.function.arguments);
    console.log('Pass 1 result:', resourceType);

    if (resourceType === 'unknown') {
      return new Response(JSON.stringify({ success: true, type: 'unknown', services: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Pass 2: Extract services based on classification
    const extractionContext = resourceType === 'status_page'
      ? 'This is a status/uptime page. Extract every service, component, or endpoint listed along with its operational group.'
      : 'This is a system architecture or infrastructure diagram/document. Extract every component, service, or system mentioned.';

    console.log('Pass 2: Extracting services for', resourceType);

    const extractRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting services from web pages. ${extractionContext}

Your task:
1. Extract ALL services/components thoroughly — do not skip or omit any. Include every distinct service, endpoint, or component mentioned.
2. For each service, provide a brief description (one short sentence). Prefer concise descriptions over lengthy ones.
3. Do NOT prepend the category/group name to the service name.
4. Minimize the number of categories/groups. Only create separate categories when services are truly distinct in purpose (e.g. "API" vs "Website" vs "Infrastructure"). Do NOT artificially flatten everything into a single group — use your judgment to find a natural, minimal grouping.${existingContext}

Call the extract_services function with your findings.`,
          },
          { role: 'user', content: `Extract all services from this ${resourceType === 'status_page' ? 'status page' : 'system diagram'}:\n\n${contentSlice}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_services',
              description: 'Extract services from the web page content.',
              parameters: {
                type: 'object',
                properties: {
                  services: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Service or component name' },
                        description: { type: 'string', description: 'Brief description of the service' },
                        category: { type: 'string', description: 'Category or group the service belongs to' },
                      },
                      required: ['name', 'description', 'category'],
                      additionalProperties: false,
                    },
                    description: 'List of services extracted.',
                  },
                },
                required: ['services'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_services' } },
      }),
    });

    if (!extractRes.ok) {
      if (extractRes.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (extractRes.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits in Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await extractRes.text();
      console.error('AI extract error:', extractRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'AI extraction failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extractData = await extractRes.json();
    const extractCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
    if (!extractCall?.function?.arguments) {
      console.error('No tool call in extract response:', JSON.stringify(extractData));
      return new Response(JSON.stringify({ success: false, error: 'AI could not extract services' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { services: extractedServices } = JSON.parse(extractCall.function.arguments);

    // Strip category/group name prefix from service names
    if (extractedServices?.length) {
      for (const svc of extractedServices) {
        if (svc.category && svc.name) {
          const prefixes = [
            `${svc.category} - `, `${svc.category}: `, `${svc.category} / `,
            `${svc.category} – `, `${svc.category} — `,
          ];
          for (const prefix of prefixes) {
            if (svc.name.toLowerCase().startsWith(prefix.toLowerCase())) {
              svc.name = svc.name.slice(prefix.length).trim();
              break;
            }
          }
        }
      }
    }

    const result = { type: resourceType, services: extractedServices || [] };
    console.log('Pass 2 result:', result.type, 'services:', result.services.length);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('import-services error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
