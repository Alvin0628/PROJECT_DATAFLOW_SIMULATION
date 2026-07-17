# products.csv

## Dataset Summary

- Rows : 29120
- Columns : 9
- Memory : 10.62 MB

## Column Profiling

|Column|CSV Type|Semantic Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---|---:|---:|---:|---:|---:|---:|
|id|int64|Identifier|INTEGER|0|0.0|29120|0|1|29120|
|cost|float64|Currency|NUMERIC(10,2)|0|0.0|26375|2745|0.0082999997779726|557.1510021798313|
|category|object|Text|VARCHAR(255)|0|0.0|26|29094|None|None|
|name|object|Text|VARCHAR(255)|2|0.01|27309|1810|None|None|
|brand|object|Text|VARCHAR(255)|24|0.08|2756|26363|None|None|
|retail_price|float64|Currency|NUMERIC(10,2)|0|0.0|4194|24926|0.0199999995529651|999.0|
|department|object|Text|VARCHAR(255)|0|0.0|2|29118|None|None|
|sku|object|SKU|VARCHAR(100)|0|0.0|29120|0|None|None|
|distribution_center_id|int64|Identifier|INTEGER|0|0.0|10|29110|1|10|