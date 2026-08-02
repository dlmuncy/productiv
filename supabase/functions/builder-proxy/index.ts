import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_ENDPOINTS: Record<string, { baseUrl: string; authHeader: (token: string) => Record<string, string> }> = {
  github: {
    baseUrl: "https://api.github.com",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
  },
  slack: {
    baseUrl: "https://slack.com/api",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
  },
  notion: {
    baseUrl: "https://api.notion.com/v1",
    authHeader: (token) => ({ Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" }),
  },
  linear: {
    baseUrl: "https://api.linear.app/graphql",
    authHeader: (token) => ({ Authorization: token }),
  },
  jira: {
    baseUrl: "https://api.atlassian.com",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { app, path, method, body } = await req.json();

    if (!app || !API_ENDPOINTS[app]) {
      return new Response(
        JSON.stringify({ error: `Unsupported app: ${app}. Supported: ${Object.keys(API_ENDPOINTS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = API_ENDPOINTS[app];
    const url = `${config.baseUrl}${path ?? ""}`;

    // In production, the token would be fetched from the builder_connections table
    // and decrypted server-side. For this demo, the client passes the encrypted token.
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "No API token provided. Connect the app in Integrations first." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decodedToken = atob(token);

    const response = await fetch(url, {
      method: method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...config.authHeader(decodedToken),
      },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `${app} API error`, status: response.status, detail: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
