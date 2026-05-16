"""OpenAI-powered plain-language explanations via LangChain."""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.models import FraudPrediction


async def generate_explanation(prediction: "FraudPrediction") -> str:
    if not settings.OPENAI_API_KEY:
        return (
            "AI explanation is disabled: set OPENAI_API_KEY in backend/.env. "
            f"Summary — fraud probability {prediction.fraud_probability * 100:.1f}%, "
            f"verdict {'FRAUD' if prediction.is_fraud else 'LEGITIMATE'}, "
            f"severity {prediction.severity or 'n/a'}."
        )

    try:
        import httpx
        
        txn = prediction.transaction
        amount_str = f"{txn.amount:.2f}" if txn else "N/A"
        
        prompt = f"""
You are a fraud analyst AI assistant. Explain this fraud prediction result
in clear, simple language that a non-technical bank customer can understand.

Transaction Details:
- Fraud Probability: {prediction.fraud_probability * 100:.1f}%
- Verdict: {"FRAUD DETECTED" if prediction.is_fraud else "LEGITIMATE"}
- Severity: {prediction.severity.value if prediction.severity else "N/A"}
- Top risk factors: {prediction.features_used or "standard risk factors"}
- Transaction Amount: ${amount_str}

Provide:
1. A simple 2-sentence summary of the verdict
2. The main reasons this was flagged (or not flagged)
3. A recommended action for the user

Keep it under 150 words. Be professional but friendly.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1500
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.OPENAI_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=15.0)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"AI Explanation failed: {e}")
        sev = prediction.severity.value if prediction.severity else "unknown"
        verdict = "fraudulent" if prediction.is_fraud else "legitimate"
        return (
            f"Fallback explanation: this transaction is classified as {verdict} "
            f"with probability {prediction.fraud_probability * 100:.1f}% and severity {sev}. "
            "Review top features and any triggered rules for final analyst action."
        )
