import requests
import json
import sys

# Constants
BASE_URL = "http://127.0.0.1:8000"
TENANT_ID = "default_tenant"
QUESTION = "What are the latest features of iPhone 16? Please search online."

def test_streaming(web_search=True):
    print(f"Testing Streaming/Search (WebSearch={web_search})...")
    url = f"{BASE_URL}/chat/public/stream"
    payload = {
        "question": QUESTION,
        "tenant_id": TENANT_ID,
        "web_search": web_search,
        "user_identifier": "test_user"
    }
    
    try:
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code != 200:
                print(f"Error: {response.status_code} - {response.text}")
                return

            full_content = ""
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith("data: "):
                        try:
                            data = json.loads(decoded[6:])
                            if data.get("is_final"):
                                print("\n[STREAM COMPLETE]")
                                print(f"Suggestions: {data.get('suggestions')}")
                            else:
                                content = data.get("content", "")
                                full_content += content
                                print(content, end="", flush=True)
                        except Exception as e:
                            print(f"\n[Error parsing line]: {e}")
            
            print(f"\n\nFull Response received: {len(full_content)} chars.")
            print("-" * 40)
            print(full_content)
            print("-" * 40)

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_streaming(web_search=True)
