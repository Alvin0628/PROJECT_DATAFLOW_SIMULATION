# inventory_items.csv

## Dataset Summary

- Rows : 490705
- Columns : 12
- Memory : 239.51 MB

## Column Profiling

|Column|CSV Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---:|---:|---:|---:|---:|---:|
|id|int64|INTEGER|0|0.0|490705|0|1|490705|
|product_id|int64|INTEGER|0|0.0|29046|461659|1|29120|
|created_at|object|VARCHAR(255)|0|0.0|463339|27366|None|None|
|sold_at|object|VARCHAR(255)|308946|62.96|181526|309178|None|None|
|cost|float64|NUMERIC(10,2)|0|0.0|26314|464391|0.0082999997779726|557.1510021798313|
|product_category|object|VARCHAR(255)|0|0.0|26|490679|None|None|
|product_name|object|VARCHAR(255)|29|0.01|27236|463468|None|None|
|product_brand|object|VARCHAR(255)|401|0.08|2752|487952|None|None|
|product_retail_price|float64|NUMERIC(10,2)|0|0.0|4190|486515|0.0199999995529651|999.0|
|product_department|object|VARCHAR(255)|0|0.0|2|490703|None|None|
|product_sku|object|VARCHAR(255)|0|0.0|29046|461659|None|None|
|product_distribution_center_id|int64|INTEGER|0|0.0|10|490695|1|10|