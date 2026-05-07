"""Emit Jupyter notebooks as JSON (run once: python emit_notebooks.py from ml/notebooks)."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

META = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "pygments_lexer": "ipython3"},
}


def nb(cells):
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": META,
        "cells": cells,
    }


def md(s):
    return {"cell_type": "markdown", "metadata": {}, "source": s.splitlines(keepends=True)}


def code(s):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": s.splitlines(keepends=True)}


def write(name, doc):
    path = HERE / name
    path.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    print("Wrote", path)


write(
    "01_eda.ipynb",
    nb(
        [
            md("# 01 — Exploratory Data Analysis\n\n**Dataset:** Kaggle [Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)\n\nPlace `creditcard.csv` in `ml/data/raw/` before running."),
            code(
                "import pandas as pd\n"
                "import matplotlib.pyplot as plt\n"
                "import seaborn as sns\n"
                "\n"
                "df = pd.read_csv('../data/raw/creditcard.csv')\n"
                "print(df.shape)\n"
                "print(df.info())\n"
                "print(df.describe())\n"
                "print(df['Class'].value_counts())"
            ),
            code(
                "sns.countplot(x='Class', data=df)\n"
                "plt.title('Fraud vs Normal Transactions')\n"
                "plt.show()"
            ),
            code(
                "fig, axes = plt.subplots(1, 2, figsize=(14, 4))\n"
                "df[df.Class==0]['Amount'].hist(ax=axes[0], bins=50)\n"
                "axes[0].set_title('Normal Transaction Amounts')\n"
                "df[df.Class==1]['Amount'].hist(ax=axes[1], bins=50, color='red')\n"
                "axes[1].set_title('Fraud Transaction Amounts')\n"
                "plt.show()"
            ),
            code(
                "plt.figure(figsize=(16, 10))\n"
                "sns.heatmap(df.corr(), cmap='coolwarm', center=0)\n"
                "plt.title('Feature Correlation Heatmap')\n"
                "plt.show()"
            ),
            md(
                "## Observations (fill in after run)\n"
                "- Severe class imbalance (~0.17% fraud)\n"
                "- Fraud amounts often smaller (probing)\n"
                "- Several `V*` features correlate with `Class`"
            ),
        ]
    ),
)

write(
    "02_preprocessing.ipynb",
    nb(
        [
            md("# 02 — Preprocessing + SMOTE\n\nTrain/test split **before** SMOTE; apply SMOTE **only** on training data."),
            code(
                "import numpy as np\n"
                "import pandas as pd\n"
                "import joblib\n"
                "from sklearn.model_selection import train_test_split\n"
                "from sklearn.preprocessing import StandardScaler\n"
                "from imblearn.over_sampling import SMOTE\n"
                "\n"
                "df = pd.read_csv('../data/raw/creditcard.csv')\n"
                "X = df.drop('Class', axis=1)\n"
                "y = df['Class']\n"
                "scaler = StandardScaler()\n"
                "X = X.copy()\n"
                "X[['Amount', 'Time']] = scaler.fit_transform(X[['Amount', 'Time']])\n"
                "X_train, X_test, y_train, y_test = train_test_split(\n"
                "    X, y, test_size=0.2, random_state=42, stratify=y\n"
                ")\n"
                "smote = SMOTE(random_state=42)\n"
                "X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)\n"
                "print('Before SMOTE:', y_train.value_counts().to_dict())\n"
                "print('After SMOTE: ', y_train_sm.value_counts().to_dict())"
            ),
            code(
                "import os\n"
                "os.makedirs('../models/saved', exist_ok=True)\n"
                "os.makedirs('../data/processed', exist_ok=True)\n"
                "joblib.dump(scaler, '../models/saved/scaler.joblib')\n"
                "np.save('../data/processed/X_train.npy', X_train_sm)\n"
                "np.save('../data/processed/X_test.npy', X_test)\n"
                "np.save('../data/processed/y_train.npy', y_train_sm)\n"
                "np.save('../data/processed/y_test.npy', y_test)\n"
                "print('Preprocessing complete.')"
            ),
        ]
    ),
)

write(
    "03_sklearn_model.ipynb",
    nb(
        [
            md("# 03 — Scikit-learn + XGBoost\n\nLoads numpy arrays from `02_preprocessing`."),
            code(
                "import numpy as np\n"
                "import joblib\n"
                "import matplotlib.pyplot as plt\n"
                "import seaborn as sns\n"
                "import pandas as pd\n"
                "import xgboost as xgb\n"
                "from sklearn.linear_model import LogisticRegression\n"
                "from sklearn.ensemble import RandomForestClassifier\n"
                "from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score\n"
                "\n"
                "X_train = np.load('../data/processed/X_train.npy')\n"
                "X_test  = np.load('../data/processed/X_test.npy')\n"
                "y_train = np.load('../data/processed/y_train.npy')\n"
                "y_test  = np.load('../data/processed/y_test.npy')"
            ),
            code(
                "lr = LogisticRegression(max_iter=1000)\n"
                "lr.fit(X_train, y_train)\n"
                "print('=== Logistic Regression ===')\n"
                "print(classification_report(y_test, lr.predict(X_test)))"
            ),
            code(
                "rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)\n"
                "rf.fit(X_train, y_train)\n"
                "rf_prob = rf.predict_proba(X_test)[:, 1]\n"
                "print('=== Random Forest ===')\n"
                "print(classification_report(y_test, rf.predict(X_test)))\n"
                "print('ROC-AUC:', roc_auc_score(y_test, rf_prob))"
            ),
            code(
                "xgb_model = xgb.XGBClassifier(\n"
                "    n_estimators=200, max_depth=6, learning_rate=0.1,\n"
                "    scale_pos_weight=577, random_state=42,\n"
                ")\n"
                "xgb_model.fit(X_train, y_train)\n"
                "xgb_pred = xgb_model.predict(X_test)\n"
                "xgb_prob = xgb_model.predict_proba(X_test)[:, 1]\n"
                "print('=== XGBoost ===')\n"
                "print(classification_report(y_test, xgb_pred))\n"
                "print('ROC-AUC:', roc_auc_score(y_test, xgb_prob))"
            ),
            code(
                "cm = confusion_matrix(y_test, xgb_pred)\n"
                "sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')\n"
                "plt.title('XGBoost Confusion Matrix')\n"
                "plt.ylabel('Actual')\n"
                "plt.xlabel('Predicted')\n"
                "plt.show()"
            ),
            code(
                "cols = [f'V{i}' for i in range(1, 29)] + ['Amount', 'Time']\n"
                "feat_imp = pd.Series(xgb_model.feature_importances_, index=cols[: X_train.shape[1]]).sort_values(ascending=False)[:15]\n"
                "feat_imp.plot(kind='bar', title='Top 15 Feature Importances')\n"
                "plt.show()"
            ),
            code(
                "joblib.dump(xgb_model, '../models/saved/fraud_model.joblib')\n"
                "print('Saved ../models/saved/fraud_model.joblib')"
            ),
        ]
    ),
)

write(
    "04_pytorch_model.ipynb",
    nb(
        [
            md("# 04 — PyTorch fraud classifier"),
            code(
                "import numpy as np\n"
                "import torch\n"
                "import torch.nn as nn\n"
                "from torch.utils.data import DataLoader, TensorDataset\n"
                "\n"
                "X_train = torch.FloatTensor(np.load('../data/processed/X_train.npy'))\n"
                "X_test  = torch.FloatTensor(np.load('../data/processed/X_test.npy'))\n"
                "y_train = torch.FloatTensor(np.load('../data/processed/y_train.npy'))\n"
                "y_test  = torch.FloatTensor(np.load('../data/processed/y_test.npy'))"
            ),
            code(
                "class FraudDetector(nn.Module):\n"
                "    def __init__(self, input_dim):\n"
                "        super().__init__()\n"
                "        self.network = nn.Sequential(\n"
                "            nn.Linear(input_dim, 128),\n"
                "            nn.BatchNorm1d(128),\n"
                "            nn.ReLU(),\n"
                "            nn.Dropout(0.3),\n"
                "            nn.Linear(128, 64),\n"
                "            nn.BatchNorm1d(64),\n"
                "            nn.ReLU(),\n"
                "            nn.Dropout(0.3),\n"
                "            nn.Linear(64, 32),\n"
                "            nn.ReLU(),\n"
                "            nn.Linear(32, 1),\n"
                "            nn.Sigmoid(),\n"
                "        )\n"
                "\n"
                "    def forward(self, x):\n"
                "        return self.network(x).squeeze()"
            ),
            code(
                "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n"
                "model = FraudDetector(X_train.shape[1]).to(device)\n"
                "opt = torch.optim.Adam(model.parameters(), lr=0.001)\n"
                "crit = nn.BCELoss()\n"
                "sched = torch.optim.lr_scheduler.StepLR(opt, step_size=5, gamma=0.5)\n"
                "train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=512, shuffle=True)\n"
                "test_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=512)\n"
                "EPOCHS = 20\n"
                "for epoch in range(EPOCHS):\n"
                "    model.train()\n"
                "    total = 0.0\n"
                "    for Xb, yb in train_loader:\n"
                "        Xb, yb = Xb.to(device), yb.to(device)\n"
                "        opt.zero_grad()\n"
                "        loss = crit(model(Xb), yb)\n"
                "        loss.backward()\n"
                "        opt.step()\n"
                "        total += loss.item()\n"
                "    sched.step()\n"
                "    model.eval()\n"
                "    correct = 0\n"
                "    with torch.no_grad():\n"
                "        for Xb, yb in test_loader:\n"
                "            Xb, yb = Xb.to(device), yb.to(device)\n"
                "            pred = (model(Xb) > 0.5).float()\n"
                "            correct += (pred == yb).sum().item()\n"
                "    print(f'Epoch {epoch+1:02d}/{EPOCHS} loss={total/len(train_loader):.4f} acc={correct/len(y_test):.4f}')\n"
                "torch.save(model.state_dict(), '../models/saved/pytorch_model.pth')\n"
                "print('Saved pytorch_model.pth')"
            ),
        ]
    ),
)

write(
    "05_evaluation.ipynb",
    nb(
        [
            md("# 05 — Model comparison\n\nCompare sklearn / XGBoost (and optional PyTorch probs) on the held-out set."),
            code(
                "import numpy as np\n"
                "import joblib\n"
                "from sklearn.metrics import classification_report, roc_auc_score, RocCurveDisplay, PrecisionRecallDisplay\n"
                "import matplotlib.pyplot as plt\n"
                "\n"
                "X_test = np.load('../data/processed/X_test.npy')\n"
                "y_test = np.load('../data/processed/y_test.npy')\n"
                "model = joblib.load('../models/saved/fraud_model.joblib')\n"
                "proba = model.predict_proba(X_test)[:, 1]\n"
                "pred = (proba >= 0.5).astype(int)\n"
                "print(classification_report(y_test, pred))\n"
                "print('ROC-AUC:', roc_auc_score(y_test, proba))"
            ),
            code(
                "fig, ax = plt.subplots(1, 2, figsize=(12, 4))\n"
                "RocCurveDisplay.from_predictions(y_test, proba, ax=ax[0])\n"
                "PrecisionRecallDisplay.from_predictions(y_test, proba, ax=ax[1])\n"
                "plt.tight_layout()\n"
                "plt.show()"
            ),
        ]
    ),
)

print("Done.")
