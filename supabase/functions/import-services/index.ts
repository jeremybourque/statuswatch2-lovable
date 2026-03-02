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

    // 3. Ask AI to classify and extract services
    console.log('Analyzing content with AI, length:', markdown.length);
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert at analyzing web pages. You will receive the markdown content of a web page. Your task is to:
1. Classify it as one of: "status_page" (a service status/uptime page), "system_diagram" (architecture/infrastructure diagram or documentation), or "unknown" (anything else).
2. If it's a status_page or system_diagram, extract the services/components with their name, a brief description, and category/group.
3. Do NOT prepend the category/group name to the service name.
4. Minimize the number of categories/groups. Only create separate categories when services are truly distinct in purpose. When in doubt, group services together under a broader category rather than splitting them into many small ones.${existingContext}

Call the extract_services function with your findings.`,
          },
          {
            role: 'user',
            content: `Analyze this web page content and extract services if applicable:\n\n${markdown.slice(0, 30000)}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_services',
              description: 'Extract classified resource type and services from web page content.',
              parameters: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['status_page', 'system_diagram', 'unknown'],
                    description: 'The type of resource identified',
                  },
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
                    description: 'List of services extracted. Empty array if type is unknown.',
                  },
                },
                required: ['type', 'services'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_services' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits in Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'AI analysis failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      return new Response(JSON.stringify({ success: false, error: 'AI could not analyze the content' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Strip category/group name prefix from service names
    if (result.services?.length) {
      for (const svc of result.services) {
        if (svc.category && svc.name) {
          // Check common patterns: "Category - Name", "Category: Name", "Category / Name"
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

    console.log('AI result:', result.type, 'services:', result.services?.length);

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
