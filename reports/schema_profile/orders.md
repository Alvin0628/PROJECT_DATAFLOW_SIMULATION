# orders.csv

## Dataset Summary

- Rows : 125226
- Columns : 9
- Memory : 41.54 MB

## Column Profiling

|Column|CSV Type|Semantic Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---|---:|---:|---:|---:|---:|---:|
|order_id|int64|Identifier|INTEGER|0|0.0|125226|0|1|125226|
|user_id|int64|Identifier|INTEGER|0|0.0|80044|45182|1|100000|
|status|object|Text|VARCHAR(255)|0|0.0|5|125221|None|None|
|gender|object|Text|VARCHAR(255)|0|0.0|2|125224|None|None|
|created_at|object|Text|VARCHAR(255)|0|0.0|117373|7853|None|None|
|returned_at|object|Text|VARCHAR(255)|112696|89.99|12478|112747|None|None|
|shipped_at|object|Text|VARCHAR(255)|43765|34.95|79123|46102|None|None|
|delivered_at|object|Text|VARCHAR(255)|81342|64.96|43187|82038|None|None|
|num_of_item|int64|Integer|INTEGER|0|0.0|4|125222|1|4|