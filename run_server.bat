@echo off
cd /d C:\source\PedidoMoleculas
call .venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000
