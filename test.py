import pandas as pd
import pyodbc
from dotenv import load_dotenv
import os

load_dotenv()
conn_str = f"DRIVER={{{os.getenv('DRIVER')}}};SERVER={os.getenv('DB_SERVER')};DATABASE={os.getenv('DB_DATABASE')};UID={os.getenv('DB_USERNAME')};PWD={os.getenv('DB_PASSWORD')};"
conn = pyodbc.connect(conn_str)

df = pd.read_sql("SELECT COUNT(*) as C FROM dbo.SAINSTA WHERE CatPadre > 0", conn)
print("CatPadre > 0 count:", df.iloc[0,0])

df2 = pd.read_sql("SELECT COUNT(*) as C FROM dbo.SAINSTA WHERE InsPadre > 0", conn)
print("InsPadre > 0 count:", df2.iloc[0,0])

df3 = pd.read_sql("SELECT COUNT(*) as C FROM dbo.SAINSTA WHERE Nivel > 0", conn)
print("Nivel > 0 count:", df3.iloc[0,0])

df4 = pd.read_sql("SELECT TOP 10 CodInst, Descrip, CatPadre, InsPadre, Nivel FROM dbo.SAINSTA", conn)
print(df4)
