import sqlite3

try:
    conn = sqlite3.connect('database.sqlite')
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print(f"Tables: {tables}")
    
    # Just in case the table name is different
    for t in tables:
        if 'qmqa' in t[0].lower():
            c.execute(f"PRAGMA table_info({t[0]});")
            print(f"Schema for {t[0]}: {c.fetchall()}")
except Exception as e:
    print(e)
finally:
    if 'conn' in locals():
        conn.close()
