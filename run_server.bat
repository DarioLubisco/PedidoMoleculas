@echo off
cd /d C:\source\PedidoMoleculasDev
call .venv\Scripts\activate
uvicorn main:app --port 8001
