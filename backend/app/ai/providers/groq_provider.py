import logging
import httpx
import base64
import json
from app.ai.providers.base_provider import AnalysisProvider
from app.utils.exceptions import AnalysisServiceError
from app.ai.prompts.schemas import ANALYSIS_RESPONSE_SCHEMA

logger = logging.getLogger(__name__)

class GroqProvider(AnalysisProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model_name = model
        
    async def analyze_room(self, image_bytes: bytes, mime_type: str, style_hint: str) -> dict:
        from app.ai.prompt_builder import get_analysis_prompt
        prompt = get_analysis_prompt(style_hint)
        
        b64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": prompt + "\n\nRespond with ONLY a valid JSON object."
                        },
                        {
                            "type": "image_url", 
                            "image_url": {"url": f"data:{mime_type};base64,{b64_image}"}
                        }
                    ]
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code != 200:
                    raise ValueError(f"Groq API returned {resp.status_code}: {resp.text}")
                    
                data = resp.json()
                result_text = data['choices'][0]['message']['content']
                return json.loads(result_text)
                
        except Exception as e:
            logger.error(f"Groq analysis failed: {e}")
            raise AnalysisServiceError(f"Groq analysis failed: {str(e)}", 500)
