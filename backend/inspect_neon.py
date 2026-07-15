import os
import sys
from sqlalchemy import create_engine, inspect
from app.database.models import Base

# Neon DB URL from render.env
DB_URL = "postgresql://neondb_owner:npg_Tbuw2lNKVdz8@ep-hidden-sea-aoqbwfa9.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DB_URL)
inspector = inspect(engine)

# Get all tables from DB
db_tables = inspector.get_table_names()

# Get all tables from SQLAlchemy Models
model_tables = Base.metadata.tables

sql_statements = []

for table_name, table in model_tables.items():
    if table_name not in db_tables:
        print(f"Table {table_name} missing entirely!")
        continue
    
    db_columns = {col['name']: col for col in inspector.get_columns(table_name)}
    
    for column in table.columns:
        if column.name not in db_columns:
            # Map SQLAlchemy types to Postgres types (rough mapping)
            col_type = str(column.type)
            if "VARCHAR" in col_type or "String" in col_type:
                sql_type = "VARCHAR"
            elif "INTEGER" in col_type or "Integer" in col_type:
                sql_type = "INTEGER"
            elif "FLOAT" in col_type:
                sql_type = "DOUBLE PRECISION"
            elif "DATETIME" in col_type or "TIMESTAMP" in col_type:
                sql_type = "TIMESTAMP WITH TIME ZONE"
            elif "BOOLEAN" in col_type:
                sql_type = "BOOLEAN"
            else:
                sql_type = col_type

            sql_statements.append(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column.name} {sql_type};")
            print(f"Missing column found: {table_name}.{column.name}")

# Also check for extra columns in DB that aren't in models
for table_name in db_tables:
    if table_name in model_tables:
        db_cols = [col['name'] for col in inspector.get_columns(table_name)]
        model_cols = [col.name for col in model_tables[table_name].columns]
        extra_cols = set(db_cols) - set(model_cols)
        if extra_cols:
            print(f"Extra columns in DB for table {table_name}: {extra_cols}")

print("\n--- GENERATED SQL ---")
for sql in sql_statements:
    print(sql)
print("---------------------")

with open("neon_sync.sql", "w") as f:
    f.write("\n".join(sql_statements))
