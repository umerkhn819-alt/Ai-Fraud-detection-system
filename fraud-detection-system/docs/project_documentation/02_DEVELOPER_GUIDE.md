# Developer Guide: Exploring the Backend

This guide is designed to help you "look under the hood" of the project and interact with the database, the ML models, and the APIs directly as a developer.

---

## 1. How to See the Database Right Now

Your application uses **PostgreSQL** to store everything from transactions to user accounts. Because PostgreSQL runs in the background, you need a "Database Client" to actually look at the tables visually.

### Your Database Credentials (from `.env`):
* **Host:** `localhost`
* **Port:** `5432`
* **Username:** `fraud_user`
* **Password:** `fraud1234`
* **Database Name:** `fraud_detection`

### Recommended Ways to View It:

**Method A: Using Cursor / VSCode (Fastest since you're already in the editor)**
1. Open the Extensions tab in your editor.
2. Search for and install an extension called **SQLTools** (and the `SQLTools PostgreSQL/Cockroach Driver`).
3. Click the new SQLTools icon in your sidebar, click "Add New Connection", select PostgreSQL, and enter the credentials above.
4. Once connected, you can click on your tables (`transactions`, `fraud_predictions`, `users`) and instantly view the raw data grids.

**Method B: Using a GUI App (Like a pro Data Engineer)**
1. Download and install **DBeaver Community Edition** or **pgAdmin4** (both are free).
2. Open the app, create a new PostgreSQL connection, and plug in the credentials.
3. This gives you a beautiful, dedicated interface to run complex SQL queries and visualize the relationships between your tables.

---

## 2. Exploring the Machine Learning Models

Your trained models are not black boxes; they are simply serialized (saved) Python objects located in the `ml/models/saved/` folder.

If you want to poke around and see what the model actually looks like, you can create a simple `test_model.py` script at the root of your project:

```python
import joblib

# Load the saved Scikit-Learn / XGBoost model
model = joblib.load("ml/models/saved/fraud_model.joblib")

print("Model Type:", type(model))
print("\nModel Parameters:")
print(model.get_params())
```
Run it in your terminal: `python test_model.py`. This will print out exactly how the model was configured (learning rate, depth, estimators, etc.).

---

## 3. Testing the Backend API (Without the Frontend)

You don't need the React dashboard to test your backend logic. FastAPI automatically generates an interactive testing interface for you.

1. Ensure the backend is running (`uvicorn main:app --reload --port 8000`).
2. Open your browser and go to: **[http://localhost:8000/docs](http://localhost:8000/docs)**
3. You will see every single API endpoint (e.g., `POST /api/v1/predict/bulk`, `GET /api/v1/dashboard/fraud-over-time`).
4. You can click the "Try it out" button on any of them, enter dummy data, and click "Execute" to see the raw JSON response your backend sends back. This is how backend engineers verify their code is working before the frontend is even built!
