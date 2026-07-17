# order_items.csv

## Dataset Summary

- Rows : 181759
- Columns : 11
- Memory : 55.8 MB

## Column Profiling

|Column|CSV Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---:|---:|---:|---:|---:|---:|
|id|int64|INTEGER|0|0.0|181759|0|1|181759|
|order_id|int64|INTEGER|0|0.0|125226|56533|1|125226|
|user_id|int64|INTEGER|0|0.0|80044|101715|1|100000|
|product_id|int64|INTEGER|0|0.0|29046|152713|1|29120|
|inventory_item_id|int64|INTEGER|0|0.0|181759|0|3|490705|
|status|object|VARCHAR(255)|0|0.0|5|181754|None|None|
|created_at|object|VARCHAR(255)|0|0.0|181526|233|None|None|
|shipped_at|object|VARCHAR(255)|63478|34.92|79123|102635|None|None|
|delivered_at|object|VARCHAR(255)|117918|64.88|43187|138571|None|None|
|returned_at|object|VARCHAR(255)|163527|89.97|12478|169280|None|None|
|sale_price|float64|NUMERIC(10,2)|0|0.0|4190|177569|0.0199999995529651|999.0|