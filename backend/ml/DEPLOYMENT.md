# ML Model Service Deployment Guide (Optional)

## Overview

The ML model service is a FastAPI application that provides food expiry/spoilage predictions. It's optional but recommended for the AI features.

## Local Development

```bash
# Install Python requirements
pip install -r backend/ml/requirements.txt

# Run the service
python -m uvicorn backend.ml.model_service:app --host 0.0.0.0 --port 8000

# Test the API
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [1, 2, 3, 4]}'
```

## Deployment on Render

### Option 1: Deploy as Separate Service (Recommended)

1. **Create new Render Web Service**:
   - Go to Render dashboard → New → Web Service
   - Connect your GitHub repository
   - Select the `share-a-meal` repository

2. **Configure the service**:
   - **Name**: `sharemeal-ml-api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/ml/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.ml.model_service:app --host 0.0.0.0 --port 10000`
   - **Instance Type**: Free

3. **Set Environment Variables**:
   ```
   MODEL_LOCAL_PATH=/tmp/food_status_model.pkl
   PYTHONUNBUFFERED=1
   ```

4. **Deploy and note the URL**:
   - Example: `https://sharemeal-ml-api.onrender.com`

5. **Update Backend in Main Render Service**:
   - Add to backend environment variables:
     ```
     ML_SERVICE_URL=https://sharemeal-ml-api.onrender.com
     ```

### Option 2: Embedded in Backend (Simple)

If you want to keep everything in one service:

1. Add Python and node requirements to backend:
   ```bash
   # Install in backend build
   pip install -r backend/ml/requirements.txt
   npm install
   ```

2. Start both services in `package.json`:
   ```json
   "start": "npm run migrate-prod && concurrently \"python -m uvicorn backend.ml.model_service:app --host 0.0.0.0 --port 8000\" \"node src/app.js\""
   ```

3. Set `ML_SERVICE_URL=http://localhost:8000` in environment

## Model File Management

### Automatic Download

The `ML_SERVICE_URL` will automatically download the model file if `MODEL_URL` is set:

1. Store your trained model online (e.g., AWS S3, GitHub Releases)
2. Set in Render environment:
   ```
   MODEL_URL=https://your-bucket.s3.amazonaws.com/food_status_model.pkl
   ```
3. The service will download on startup

### Manual Model Deployment

1. Train your model locally:
   ```python
   import pickle
   from sklearn.ensemble import RandomForestClassifier
   
   # Your training code here...
   
   with open('food_status_model.pkl', 'wb') as f:
       pickle.dump(model, f)
   ```

2. Include in repository or upload to cloud storage

3. Reference in `MODEL_LOCAL_PATH` or `MODEL_URL`

## Testing Deployment

```bash
# Test the ML API
curl https://sharemeal-ml-api.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [1.0, 2.0, 3.0, 4.0]}'

# Expected response:
# {"predictions": [0.0]}  (0=Fresh, 1=Moderate, 2=Spoiled)
```

## Troubleshooting

### Service won't start
- Check logs: Render dashboard → Logs
- Verify Python dependencies in `requirements.txt`
- Ensure model file exists or `MODEL_URL` is valid

### Model file not found
```
RuntimeError: Model file not found at /tmp/food_status_model.pkl
```
- Set `MODEL_URL` environment variable
- Or manually upload `food_status_model.pkl` to persistent storage

### Timeout calling ML service
- Backend can't reach ML service at `ML_SERVICE_URL`
- Verify domain is accessible: `curl https://sharemeal-ml-api.onrender.com/`
- Check backend logs for connection errors

### Memory issues
- ML models can be large. Watch Render's memory metrics
- Consider using a smaller model or upgrading instance type

## Costs

- **Free Tier**: Works fine for development (small model)
- **Paid Tier**: $7/month per service (larger models or high traffic)

## Next Steps

1. Train an actual model for food classification
2. Upload model to cloud storage
3. Set `MODEL_URL` in Render
4. Test predictions from mobile app
