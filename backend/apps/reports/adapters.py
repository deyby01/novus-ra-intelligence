from django.conf import settings
from google import genai

from .ports import AIProvider


class GeminiAdapter(AIProvider):
    """Adapter for Google's Gemini AI using the official SDK."""

    def __init__(self, api_key: str | None = None, model_name: str = "gemini-2.5-flash") -> None:
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self.model_name = model_name

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.client = genai.Client(api_key=self.api_key)

    def generate_text(self, prompt: str) -> str:
        """Generate text using the Gemini model."""
        response = self.client.models.generate_content(model=self.model_name, contents=prompt)
        return response.text


class FakeAIProvider(AIProvider):
    """Fake adapter for testing. Returns a predictable string without network calls."""

    def __init__(self, canned_response: str = "Fake AI response") -> None:
        self.canned_response = canned_response

    def generate_text(self, prompt: str) -> str:
        """Return the fake response appended to the prompt."""
        return f"{self.canned_response} for: {prompt}"
