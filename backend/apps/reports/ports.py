from typing import Protocol


class AIProvider(Protocol):
    """Port for the AI provider.

    Implementing adapters must accept a prompt and return the generated text.
    """

    def generate_text(self, prompt: str) -> str:
        """Generate text based on the given prompt."""
        ...
