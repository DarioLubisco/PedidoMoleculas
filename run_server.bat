@echo off
:: Ubicación: C:\source\PedidoMoleculas\run_server.bat
cd /d C:\source\PedidoMoleculas
call .venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000