from fastapi import APIRouter, Response, Request
import os

router = APIRouter(prefix="/widget", tags=["widget"])

@router.get("/{tenant_id}_inline.js")
async def get_widget_inline_js(tenant_id: str, request: Request):
    """
    Serve a dynamic JavaScript file for embedding the chat widget INLINE (as a page section).
    Usage: 
        <div id="ai-chat-inline-container" style="height: 600px; width: 100%;"></div>
        <script src="API_URL/widget/TENANT_ID_inline.js"></script>
    """
    
    # HARDCODED FOR LOC A LDEV - SHOULD BE CONFIGURABLE
    frontend_url = "http://localhost:3000" 
    
    js_content = f"""
(function() {{
    var tenantId = "{tenant_id}";
    var chatUrl = "{frontend_url}/chat/" + tenantId + "?mode=iframe";
    var containerId = "ai-chat-inline-container";
    
    var container = document.getElementById(containerId);
    if (!container) {{
        console.error("AI Chat Widget: Container element with ID '" + containerId + "' not found.");
        return;
    }}
    
    // Create Iframe
    var iframe = document.createElement('iframe');
    iframe.src = chatUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.style.backgroundColor = '#1a1c20';
    
    container.appendChild(iframe);
}})();
    """
    
    return Response(content=js_content, media_type="application/javascript")


@router.get("/{tenant_id}.js")
async def get_widget_js(tenant_id: str, request: Request):
    """
    Serve a dynamic JavaScript file for embedding the chat widget.
    Usage: <script src="API_URL/widget/TENANT_ID.js"></script>
    """
    
    # Determine the base URL for the chat interface
    # Assuming the chat interface is served from the same domain/port as the API for now,
    # OR if separated, we might need an environment variable.
    # Frontend is Next.js (port 3000), Backend is FastAPI (port 8000).
    # The widget needs to point to the FRONTEND URL for the iframe src.
    
    # HARDCODED FOR LOC A LDEV - SHOULD BE CONFIGURABLE
    frontend_url = "http://localhost:3000" 
    
    js_content = f"""
(function() {{
    var tenantId = "{tenant_id}";
    var chatUrl = "{frontend_url}/chat/" + tenantId + "?mode=iframe";
    
    // Create container
    var container = document.createElement('div');
    container.id = 'ai-chat-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    container.style.gap = '10px';
    
    // Create Iframe (Hidden by default)
    var iframe = document.createElement('iframe');
    iframe.src = chatUrl;
    iframe.style.width = '350px';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    iframe.style.display = 'none';
    iframe.style.backgroundColor = '#1a1c20';
    
    // Create Toggle Button
    var button = document.createElement('div');
    button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    button.style.width = '56px';
    button.style.height = '56px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = '#00C0E8'; // Brand Color
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.justifyContent = 'center';
    button.style.alignItems = 'center';
    button.style.boxShadow = '0 4px 12px rgba(0, 192, 232, 0.4)';
    button.style.transition = 'transform 0.2s';
    
    button.onclick = function() {{
        if (iframe.style.display === 'none') {{
            iframe.style.display = 'block';
            button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        }} else {{
            iframe.style.display = 'none';
            button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        }}
    }};
    
    container.appendChild(iframe);
    container.appendChild(button);
    document.body.appendChild(container);
}})();
    """
    
    return Response(content=js_content, media_type="application/javascript")
