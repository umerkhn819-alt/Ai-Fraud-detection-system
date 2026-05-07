"""CLI: train PyTorch classifier and save state dict."""
from __future__ import annotations

import argparse
import os

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


class FraudDetector(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.network(x).squeeze()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="../data/processed")
    p.add_argument("--models-dir", default="../models/saved")
    p.add_argument("--epochs", type=int, default=20)
    args = p.parse_args()

    X_train = torch.FloatTensor(np.load(os.path.join(args.data_dir, "X_train.npy")))
    X_test = torch.FloatTensor(np.load(os.path.join(args.data_dir, "X_test.npy")))
    y_train = torch.FloatTensor(np.load(os.path.join(args.data_dir, "y_train.npy")))
    y_test = torch.FloatTensor(np.load(os.path.join(args.data_dir, "y_test.npy")))

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FraudDetector(X_train.shape[1]).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=0.001)
    crit = nn.BCELoss()
    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=512, shuffle=True)

    for epoch in range(args.epochs):
        model.train()
        total = 0.0
        for Xb, yb in train_loader:
            Xb, yb = Xb.to(device), yb.to(device)
            opt.zero_grad()
            crit(model(Xb), yb).backward()
            opt.step()
            total += crit(model(Xb), yb).item()
        print(f"epoch {epoch+1} loss={total/len(train_loader):.4f}")

    out = os.path.join(args.models_dir, "pytorch_model.pth")
    torch.save(model.state_dict(), out)
    print("Saved", out)


if __name__ == "__main__":
    main()
