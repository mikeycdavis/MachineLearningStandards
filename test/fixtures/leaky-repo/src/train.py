"""Training entry point.

Note: this docstring mentions train_test_split and X_test deliberately. Neither should be
read as a code signal — the structure view blanks string contents for exactly this reason.
"""
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

df = pd.read_csv("data/train.csv")
y = df.pop("target")

scaler = StandardScaler()
X = scaler.fit_transform(df)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = LogisticRegression()
model.fit(X_test, y_test)
