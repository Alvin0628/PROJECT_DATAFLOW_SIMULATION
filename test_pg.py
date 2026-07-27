import psycopg

print("Connecting...")

try:
    conn = psycopg.connect(
        host="127.0.0.1",
        port=5433,
        dbname="Looker_ECommerce",
        user="postgres_warehouse",
        password="WH721HDA",
        sslmode="disable",
    )

    print("CONNECTED")

    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(cur.fetchone())

    conn.close()

except Exception as e:
    print(repr(e))
