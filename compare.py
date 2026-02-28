import pandas as pd
import traceback

old_file = r'C:\OneDrive\Farmacia Americana\Compras\Pedidos\Pedido_20251111_21Dias_200Items_Filtrado.xlsx'
new_file = r'C:\OneDrive\Farmacia Americana\Compras\Pedidos\Pedido_20260228_30Dias_200Items.xlsx'

try:
    print('--- OLD FILE ---')
    df_old = pd.read_excel(old_file)
    print("Columns:", df_old.columns.tolist())
    print("\nData Types:")
    print(df_old.dtypes)
    print("\nFirst 2 Rows:")
    print(df_old.head(2))
    print("\nShape:", df_old.shape)
except Exception as e:
    print(f"Error reading old file: {e}")

print('\n=================================\n')

try:
    print('--- NEW FILE ---')
    df_new = pd.read_excel(new_file)
    print("Columns:", df_new.columns.tolist())
    print("\nData Types:")
    print(df_new.dtypes)
    print("\nFirst 2 Rows:")
    print(df_new.head(2))
    print("\nShape:", df_new.shape)
except Exception as e:
    print(f"Error reading new file: {e}")
