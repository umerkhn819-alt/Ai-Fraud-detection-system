from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.models import Transaction


def graph_data(db: Session, *, limit: int = 1000):
    txs = db.query(Transaction).order_by(Transaction.id.desc()).limit(limit).all()

    nodes = {}
    edges = defaultdict(int)

    def add_node(node_id: str, kind: str, label: str):
        if node_id not in nodes:
            nodes[node_id] = {"id": node_id, "kind": kind, "label": label}

    for tx in txs:
        tnode = f"tx:{tx.id}"
        add_node(tnode, "transaction", tx.transaction_ref)

        # Always add synthetic anchors so CSV-only rows still form a graph.
        if tx.amount is not None:
            if tx.amount < 100:
                band = "0-100"
            elif tx.amount < 500:
                band = "100-500"
            elif tx.amount < 2000:
                band = "500-2k"
            else:
                band = "2k+"
            bid = f"amount_band:{band}"
            add_node(bid, "amount_band", f"Amount {band}")
            edges[(tnode, bid)] += 1

        if tx.time_seconds is not None:
            hour = int((float(tx.time_seconds) // 3600) % 24)
            hid = f"time_bucket:{hour:02d}"
            add_node(hid, "time_bucket", f"Hour {hour:02d}")
            edges[(tnode, hid)] += 1

        attrs = [
            ("card", tx.card_last4),
            ("device", tx.device_type),
            ("ip", tx.ip_address),
            ("merchant", tx.merchant_name),
            ("city", tx.location_city),
        ]
        for kind, value in attrs:
            if not value:
                continue
            aid = f"{kind}:{value}"
            add_node(aid, kind, str(value))
            edges[(tnode, aid)] += 1

    return {
        "nodes": list(nodes.values()),
        "edges": [{"source": s, "target": t, "weight": w} for (s, t), w in edges.items()],
    }
