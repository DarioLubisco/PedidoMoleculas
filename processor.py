import os
import io
import logging
from datetime import datetime
import pandas as pd
import pyodbc

class DataProcessor:
    def __init__(self, config):
        self.config = config
        self.connection_string = (
            f"DRIVER={{{config['DRIVER']}}};"
            f"SERVER={config['DB_SERVER']};"
            f"DATABASE={config['DB_DATABASE']};"
            f"UID={config['DB_USERNAME']};"
            f"PWD={config['DB_PASSWORD']};"
            f"TrustServerCertificate=yes;"
        )

    def _load_query(self):
        try:
            with open(self.config['QUERY_FILE_PATH'], 'r', encoding='utf-8-sig') as f:
                return f.read().strip()
        except FileNotFoundError:
            logging.error(f"Query file not found at: {self.config.get('QUERY_FILE_PATH')}")
            raise

    def fetch_data(self):
        try:
            query = self._load_query()
            logging.info("Connecting to the database...")
            with pyodbc.connect(self.connection_string, timeout=int(self.config['TIMEOUT'])) as conn:
                logging.info("Connection successful. Executing query...")
                df = pd.read_sql(query, conn)
                logging.info(f"Query executed successfully. Fetched {len(df)} rows.")
                return df
        except Exception as e:
            logging.error(f"Database execution failed: {e}")
            raise

    def fetch_categories(self):
        try:
            query = "SELECT CodInst, Descrip FROM dbo.SAINSTA ORDER BY Descrip"
            logging.info("Fetching categories from database...")
            with pyodbc.connect(self.connection_string, timeout=int(self.config['TIMEOUT'])) as conn:
                df = pd.read_sql(query, conn)
                logging.info(f"Fetched {len(df)} categories.")
                # Convert to dict format suitable for JSON response: [{'id': '01', 'name': 'VITAMINAS'}, ...]
                df.columns = ['id', 'name']
                return df.to_dict(orient='records')
        except Exception as e:
            logging.error(f"Failed to fetch categories: {e}")
            raise

    def generate_excel_report_bytes(self, df, pedido_days: str, num_rows: int, subtraction_dfs: list = None, categories: list = None):
        if df.empty:
            raise ValueError("No data fetched from the database.")

        pedido_column = f'Pedido{pedido_days}'
        if pedido_column not in df.columns:
            raise ValueError(f"Column '{pedido_column}' does not exist in the query results.")

        # Filter by selected categories if provided
        # The master query already includes the category description as 'Instancia'
        if categories is not None and len(categories) > 0:
            if 'Instancia' in df.columns:
                df = df[df['Instancia'].isin(categories)]
            else:
                logging.warning("Category filtering requested but 'Instancia' column is missing from the query results.")
                
        df_filtered = df[df[pedido_column] >= 0].copy()
        df_final = df_filtered[['CodProd', pedido_column]].copy()
        df_final.rename(columns={'CodProd': 'BARRA', pedido_column: 'CANTIDAD'}, inplace=True)
        df_final = df_final.head(num_rows)

        if subtraction_dfs:
            # Validate and format each dataframe in the list
            valid_dfs = []
            for i, sub_df in enumerate(subtraction_dfs):
                if sub_df.empty:
                    continue
                if 'BARRA' not in sub_df.columns or 'CANTIDAD' not in sub_df.columns:
                    raise ValueError(f"Subtraction file {i+1} must contain 'BARRA' and 'CANTIDAD' columns.")
                sub_df['BARRA'] = sub_df['BARRA'].astype(str)
                valid_dfs.append(sub_df)
            
            if valid_dfs:
                # Concatenate all subtraction dataframes and sum by BARRA
                combined_sub_df = pd.concat(valid_dfs, ignore_index=True)
                aggregated_sub_df = combined_sub_df.groupby('BARRA', as_index=False)['CANTIDAD'].sum()
                
                df_merged = pd.merge(df_final, aggregated_sub_df, on='BARRA', how='left', suffixes=('', '_subtract'))
                df_merged['CANTIDAD_subtract'] = df_merged['CANTIDAD_subtract'].fillna(0)
                df_merged['CANTIDAD'] = df_merged['CANTIDAD'] - df_merged['CANTIDAD_subtract']
                df_final = df_merged[df_merged['CANTIDAD'] > 0][['BARRA', 'CANTIDAD']].copy()

        df_final['CANTIDAD'] = df_final['CANTIDAD'].astype(int)
        df_final['BARRA'] = df_final['BARRA'].astype(str)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final.to_excel(writer, sheet_name=self.config.get('SHEET_NAME', 'Precios'), index=False)
        output.seek(0)
        
        current_date = datetime.now().strftime('%Y%m%d')
        filename = f"Pedido_{current_date}_{pedido_days}Dias_{num_rows}Items.xlsx"
        
        return output, filename
