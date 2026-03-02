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

    // Firecrawl key checked later only if needed for status page path

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

    let extractedServices: any[];

    if (isImage) {
      // ── System diagram path: fetch image directly (ported from StatusWatch) ──
      console.log('Fetching diagram image directly:', formattedUrl);
      const imgRes = await fetch(formattedUrl);
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ success: false, error: `Failed to fetch image (${imgRes.status})` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const contentType = imgRes.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return new Response(JSON.stringify({ success: false, error: `URL did not return an image (got ${contentType})` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let mimeType = contentType.split(';')[0].trim();
      const arrayBuf = await imgRes.arrayBuffer();

      const userContent: any[] = [
        { type: 'text', text: `Analyze this system diagram and extract all services and components. The image URL is: ${formattedUrl}` },
      ];

      if (mimeType === 'image/svg+xml') {
        // SVGs are XML — send as text so Gemini can parse the markup directly
        const svgText = new TextDecoder().decode(arrayBuf);
        userContent.push({ type: 'text', text: `Here is the SVG diagram markup to analyze:\n\n${svgText}` });
      } else {
        const bytes = new Uint8Array(arrayBuf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64Data = btoa(binary);
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Data}` },
        });
      }

      const systemPrompt = `You are an expert at analyzing system architecture and infrastructure diagrams. Given an image of a system diagram, network topology, or infrastructure architecture, extract ALL services, components, and systems visible in the diagram.

Be thorough - extract every distinct service, database, queue, cache, load balancer, CDN, etc. that appears in the diagram.
Group related services when there's a clear hierarchy.
For each service, provide a brief description (one short sentence).
Do NOT prepend the category/group name to the service name.
Minimize the number of categories/groups. Only create separate categories when services are truly distinct in purpose. Do NOT artificially flatten everything into a single group — use your judgment to find a natural, minimal grouping.${existingContext}

You MUST use the extract_services tool to return your analysis.`;

      console.log('Analyzing diagram with AI...');
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'extract_services',
              description: 'Extract services and components from the system diagram',
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
                  },
                },
                required: ['services'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'extract_services' } },
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error('AI diagram error:', aiRes.status, errText);
        if (aiRes.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (aiRes.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits in Settings.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (aiRes.status === 400) {
          return new Response(JSON.stringify({ success: false, error: 'The image could not be processed. Try a different format (PNG, JPEG, WebP).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: false, error: 'AI analysis failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error('No tool call in diagram response:', JSON.stringify(aiData));
        return new Response(JSON.stringify({ success: false, error: 'AI could not extract services from the diagram' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const parsed = JSON.parse(toolCall.function.arguments);
      extractedServices = parsed.services || [];

    } else {
      // ── Status page path: scrape via Firecrawl then extract ──
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!firecrawlKey) {
        return new Response(JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('Scraping status page:', formattedUrl);
      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: true }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) {
        console.error('Firecrawl error:', scrapeData);
        return new Response(JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape URL' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
      if (!markdown) {
        return new Response(JSON.stringify({ success: false, error: 'No content found at URL' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const contentSlice = markdown.slice(0, 30000);
      console.log('Extracting services from status page, content length:', contentSlice.length);

      const extractRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting services from status pages. This is a status/uptime page. Extract every service, component, or endpoint listed along with its operational group.

Your task:
1. Extract ALL services/components thoroughly — do not skip or omit any.
2. For each service, provide a brief description (one short sentence).
3. Do NOT prepend the category/group name to the service name.
4. Minimize the number of categories/groups. Only create separate categories when services are truly distinct in purpose. Do NOT artificially flatten everything into a single group — use your judgment to find a natural, minimal grouping.${existingContext}

Call the extract_services function with your findings.`,
            },
            { role: 'user', content: `Extract all services from this status page:\n\n${contentSlice}` },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'extract_services',
              description: 'Extract services from the status page.',
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
                  },
                },
                required: ['services'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'extract_services' } },
        }),
      });

      if (!extractRes.ok) {
        const errText = await extractRes.text();
        console.error('AI extract error:', extractRes.status, errText);
        if (extractRes.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (extractRes.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits in Settings.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: false, error: 'AI extraction failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const extractData = await extractRes.json();
      const extractCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
      if (!extractCall?.function?.arguments) {
        console.error('No tool call in extract response:', JSON.stringify(extractData));
        return new Response(JSON.stringify({ success: false, error: 'AI could not extract services' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const parsed = JSON.parse(extractCall.function.arguments);
      extractedServices = parsed.services || [];
    }

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

    const result = { type: resourceType, services: extractedServices };
    console.log('Result:', result.type, 'services:', result.services.length);

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
