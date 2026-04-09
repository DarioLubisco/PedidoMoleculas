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
            # Muestra categorías y su Padre según InsPadre.
            query = """
                SELECT CodInst, Descrip, InsPadre 
                FROM dbo.SAINSTA 
                ORDER BY Descrip
            """
            logging.info("Fetching hierarchical categories from database...")
            with pyodbc.connect(self.connection_string, timeout=int(self.config['TIMEOUT'])) as conn:
                df = pd.read_sql(query, conn)
                
            logging.info(f"Fetched {len(df)} categories.")
            
            # Limpieza básica
            df = df.dropna(subset=['Descrip']).copy()
            # Eliminar vacias
            df = df[df['Descrip'].str.strip() != '']
            
            categories = []
            for _, row in df.iterrows():
                categories.append({
                    "id": str(row['CodInst']),
                    "name": str(row['Descrip']).strip(),
                    "parentId": str(int(row['InsPadre'])) if pd.notna(row['InsPadre']) else "0"
                })
            
            return categories
        except Exception as e:
            logging.error(f"Failed to fetch categories: {e}")
            raise

    def generate_excel_report_bytes(self, df, pedido_days: str, num_rows: int, subtraction_dfs: list = None, categories: list = None, umbral: float = 0.0, force_include_codes: list = None):
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
                
        discarded_list = []
        if 'RotacionMensual' in df.columns and umbral > 0:
            below_umbral_mask = df['RotacionMensual'] < umbral
            
            # If we have forced includes, they shouldn't be discarded
            if force_include_codes:
                not_forced_mask = ~df['CodProd'].astype(str).isin(force_include_codes)
                discard_mask = below_umbral_mask & not_forced_mask
            else:
                discard_mask = below_umbral_mask
                
            df_discarded = df[discard_mask].copy()
            for _, row in df_discarded.iterrows():
                discarded_list.append({
                    "Codigo": str(row.get('CodProd', '')).strip(),
                    "Descripcion": str(row.get('Descrip', '')).strip(),
                    "RotacionMensual": round(float(row.get('RotacionMensual', 0)), 2),
                    "Existencia": round(float(row.get('Existen', 0)), 2)
                })
            
            # Keep only items meeting or exceeding the threshold (or forced)
            df = df[~discard_mask]

        df_filtered = df[df[pedido_column] >= 0].copy()
        df_final = df_filtered[['CodProd', pedido_column]].copy()
        df_final.rename(columns={'CodProd': 'BARRA', pedido_column: 'CANTIDAD'}, inplace=True)
        
        # Override forced includes unconditionally: they must exist in the final set even if their base Pedido calculation drops them
        if force_include_codes:
            # First, update quantities for those that made it into df_final
            mask_in_final = df_final['BARRA'].astype(str).isin(force_include_codes)
            df_final.loc[mask_in_final, 'CANTIDAD'] = 1
            
            # Identify missing forced codes that might have been dropped because of (Pedido < 0) filter
            missing_codes = set(force_include_codes) - set(df_final['BARRA'].astype(str))
            if missing_codes:
                missing_df = pd.DataFrame([{"BARRA": code, "CANTIDAD": 1} for code in missing_codes])
                df_final = pd.concat([df_final, missing_df], ignore_index=True)
        
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

        # Enforce minimum quantity of 1 for any product that passed the threshold
        df_final.loc[df_final['CANTIDAD'] < 1, 'CANTIDAD'] = 1
        
        # If any forces exist, make absolutely sure they stay at 1 even after subtraction
        if force_include_codes:
            forced_mask_final = df_final['BARRA'].astype(str).isin(force_include_codes)
            df_final.loc[forced_mask_final, 'CANTIDAD'] = 1

            # And restore any that were completely dropped by subtraction (CANTIDAD <= 0 during subtract phase)
            dropped_forces = set(force_include_codes) - set(df_final['BARRA'].astype(str))
            if dropped_forces:
                df_final = pd.concat([df_final, pd.DataFrame([{"BARRA": c, "CANTIDAD": 1} for c in dropped_forces])], ignore_index=True)

        df_final['CANTIDAD'] = df_final['CANTIDAD'].astype(int)
        df_final['BARRA'] = df_final['BARRA'].astype(str)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final.to_excel(writer, sheet_name=self.config.get('SHEET_NAME', 'Precios'), index=False)
        output.seek(0)
        
        current_date = datetime.now().strftime('%Y%m%d')
        filename = f"Pedido_{current_date}_{pedido_days}Dias_{num_rows}Items.xlsx"
        
        return output, filename, discarded_list
