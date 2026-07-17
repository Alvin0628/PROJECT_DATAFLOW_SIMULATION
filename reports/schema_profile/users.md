# users.csv

## Dataset Summary

- Rows : 100000
- Columns : 15
- Memory : 66.49 MB

## Column Profiling

|Column|CSV Type|Semantic Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---|---:|---:|---:|---:|---:|---:|
|id|int64|Identifier|INTEGER|0|0.0|100000|0|1|100000|
|first_name|object|Text|VARCHAR(255)|0|0.0|690|99310|None|None|
|last_name|object|Text|VARCHAR(255)|0|0.0|1000|99000|None|None|
|email|object|Email|VARCHAR(255)|0|0.0|84011|15989|None|None|
|age|int64|Age|SMALLINT|0|0.0|59|99941|12|70|
|gender|object|Text|VARCHAR(255)|0|0.0|2|99998|None|None|
|state|object|Text|VARCHAR(255)|0|0.0|229|99771|None|None|
|street_address|object|Text|VARCHAR(255)|0|0.0|99997|3|None|None|
|postal_code|object|Postal Code|VARCHAR(20)|0|0.0|15694|84306|None|None|
|city|object|Text|VARCHAR(255)|958|0.96|7883|92116|None|None|
|country|object|Text|VARCHAR(255)|0|0.0|16|99984|None|None|
|latitude|float64|Coordinate|DOUBLE PRECISION|0|0.0|16404|83596|-43.00753639|64.86519412|
|longitude|float64|Coordinate|DOUBLE PRECISION|0|0.0|16360|83640|-158.1649311|153.5602377|
|traffic_source|object|Text|VARCHAR(255)|0|0.0|5|99995|None|None|
|created_at|object|Text|VARCHAR(255)|0|0.0|97754|2246|None|None|