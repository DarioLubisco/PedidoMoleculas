import os
import io
import logging
from typing import Optional, List
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import dotenv_values
import pandas as pd

from processor import DataProcessor

# Setup basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load environment configuration
env_config = dotenv_values(".env")

# Required keys validation
required_keys = [
    'DB_SERVER', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'DRIVER',
    'QUERY_FILE_PATH', 'TIMEOUT', 'SHEET_NAME'
]
missing_keys = [key for key in required_keys if key not in env_config]
if missing_keys:
    logging.error(f"Missing required environment variables: {', '.join(missing_keys)}")

processor = DataProcessor(env_config)

app = FastAPI(title="Pedido Moleculas API")

# Mount static folder for frontend (make sure this folder exists)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/api/categories")
async def get_categories():
    try:
        categories = processor.fetch_categories()
        return {"categories": categories}
    except Exception as e:
        logging.error(f"Error fetching categories: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate_report(
    pedido_days: str = Form(...),
    num_rows: int = Form(...),
    categories: Optional[str] = Form(None),
    subtraction_files: Optional[List[UploadFile]] = File(None)
):
    try:
        # Validate inputs
        if num_rows <= 0:
            raise HTTPException(status_code=400, detail="Number of rows must be a positive integer.")
        if pedido_days not in ['9', '14', '21', '30', '45', '60', '75', '90', '120']:
            raise HTTPException(status_code=400, detail="Invalid Pedido days value.")

        # Process optional subtraction files
        subtraction_dfs = []
        if subtraction_files:
            for file in subtraction_files:
                if file.filename:
                    try:
                        content = await file.read()
                        df = pd.read_excel(io.BytesIO(content))
                        subtraction_dfs.append(df)
                    except Exception as e:
                        raise HTTPException(status_code=400, detail=f"Invalid Excel file '{file.filename}': {str(e)}")

        # Fetch data
        df = processor.fetch_data()

        # Parse categories list
        parsed_categories = None
        if categories:
            # Assuming categories arrive as a comma-separated string: "Categoria 1,Categoria 2"
            parsed_categories = [cat.strip() for cat in categories.split(",") if cat.strip()]

        # Generate output file in memory
        output_bytes, filename = processor.generate_excel_report_bytes(
            df, pedido_days, num_rows, subtraction_dfs, parsed_categories
        )

        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(output_bytes, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        logging.error(f"Error generating report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
