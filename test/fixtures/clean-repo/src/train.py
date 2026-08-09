import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

SEED = 20260809

df = pd.read_csv("data/train.csv")
y = df.pop("target")

X_train, X_test, y_train, y_test = train_test_split(df, y, test_size=0.2, random_state=SEED)

pipeline = Pipeline([("scale", StandardScaler()), ("model", LogisticRegression(random_state=SEED))])
pipeline.fit(X_train, y_train)
score = pipeline.score(X_test, y_test)
