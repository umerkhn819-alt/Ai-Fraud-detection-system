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
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.3,
            api_key=settings.OPENAI_API_KEY,
        )
        prompt = ChatPromptTemplate.from_template(
            """
You are a fraud analyst AI assistant. Explain this fraud prediction result
in clear, simple language that a non-technical bank customer can understand.

Transaction Details:
- Fraud Probability: {probability}%
- Verdict: {verdict}
- Severity: {severity}
- Top risk factors: {features}
- Transaction Amount: ${amount}

Provide:
1. A simple 2-sentence summary of the verdict
2. The main reasons this was flagged (or not flagged)
3. A recommended action for the user

Keep it under 150 words. Be professional but friendly.
"""
        )
        chain = prompt | llm | StrOutputParser()

        txn = prediction.transaction
        amount_str = f"{txn.amount:.2f}" if txn else "N/A"

        return await chain.ainvoke(
            {
                "probability": round(prediction.fraud_probability * 100, 1),
                "verdict": "FRAUD DETECTED" if prediction.is_fraud else "LEGITIMATE",
                "severity": str(prediction.severity.value) if prediction.severity else "N/A",
                "features": prediction.features_used or "standard risk factors",
                "amount": amount_str,
            }
        )
    except Exception as e:
        return f"AI explanation unavailable: {e!s}"
