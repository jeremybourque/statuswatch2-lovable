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

    // 1. Determine resource type by URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
    const urlPath = new URL(formattedUrl).pathname.toLowerCase();
    const isImage = imageExts.some(ext => urlPath.endsWith(ext));
    const resourceType = isImage ? 'system_diagram' : 'status_page';
    console.log('Resource type:', resourceType, 'URL:', formattedUrl);

    // 2. Scrape URL via Firecrawl
    const scrapeFormats = isImage ? ['markdown', 'screenshot'] : ['markdown'];
    console.log('Scraping URL:', formattedUrl, 'formats:', scrapeFormats);
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: formattedUrl, formats: scrapeFormats, onlyMainContent: true }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape URL' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const screenshot = scrapeData.data?.screenshot || scrapeData.screenshot || '';

    if (!markdown && !screenshot) {
      return new Response(JSON.stringify({ success: false, error: 'No content found at URL' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build existing services context
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

    // 4. Extract services
    const contentSlice = markdown.slice(0, 30000);
    const extractionContext = resourceType === 'status_page'
      ? 'This is a status/uptime page. Extract every service, component, or endpoint listed along with its operational group.'
      : 'This is a system architecture or infrastructure diagram. Extract every component, service, or system visible in the diagram.';

    console.log('Extracting services for', resourceType);

    // Build messages — for system diagrams, include image if available
    const userContent: any[] = [];
    if (isImage && screenshot) {
      // Firecrawl may return a URL instead of base64 — fetch and convert if needed
      let base64Data = screenshot;
      if (screenshot.startsWith('http://') || screenshot.startsWith('https://')) {
        console.log('Fetching screenshot image from URL...');
        const imgRes = await fetch(screenshot);
        if (!imgRes.ok) {
          console.error('Failed to fetch screenshot image:', imgRes.status);
          return new Response(JSON.stringify({ success: false, error: 'Failed to fetch diagram image' }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const imgBuf = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(imgBuf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        base64Data = btoa(binary);
      } else if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1] || base64Data;
      }

      const mimeType = screenshot.includes('.png') ? 'image/png' : screenshot.includes('.jpg') || screenshot.includes('.jpeg') ? 'image/jpeg' : 'image/png';
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64Data}` },
      });
      userContent.push({ type: 'text', text: 'Extract all services/components from this system diagram.' });
    } else {
      userContent.push({ type: 'text', text: `Extract all services from this ${resourceType === 'status_page' ? 'status page' : 'system diagram'}:\n\n${contentSlice}` });
    }

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
            content: `You are an expert at extracting services from web pages and diagrams. ${extractionContext}

Your task:
1. Extract ALL services/components thoroughly — do not skip or omit any. Include every distinct service, endpoint, or component mentioned.
2. For each service, provide a brief description (one short sentence). Prefer concise descriptions over lengthy ones.
3. Do NOT prepend the category/group name to the service name.
4. Minimize the number of categories/groups. Only create separate categories when services are truly distinct in purpose (e.g. "API" vs "Website" vs "Infrastructure"). Do NOT artificially flatten everything into a single group — use your judgment to find a natural, minimal grouping.${existingContext}

Call the extract_services function with your findings.`,
          },
          { role: 'user', content: userContent },
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
