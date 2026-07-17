# events.csv

## Dataset Summary

- Rows : 2431963
- Columns : 13
- Memory : 1517.93 MB

## Column Profiling

|Column|CSV Type|Semantic Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|
|---|---|---|---|---:|---:|---:|---:|---:|---:|
|id|int64|Identifier|INTEGER|0|0.0|2431963|0|1|2431963|
|user_id|float64|Identifier|INTEGER|1125671|46.29|80044|2351918|1.0|100000.0|
|sequence_number|int64|Integer|INTEGER|0|0.0|13|2431950|1|13|
|session_id|object|Identifier|INTEGER|0|0.0|681759|1750204|None|None|
|created_at|object|Text|VARCHAR(255)|0|0.0|2143390|288573|None|None|
|ip_address|object|Text|VARCHAR(255)|0|0.0|681683|1750280|None|None|
|city|object|Text|VARCHAR(255)|23080|0.95|8775|2423187|None|None|
|state|object|Text|VARCHAR(255)|0|0.0|231|2431732|None|None|
|postal_code|object|Postal Code|VARCHAR(20)|0|0.0|17324|2414639|None|None|
|browser|object|Text|VARCHAR(255)|0|0.0|5|2431958|None|None|
|traffic_source|object|Text|VARCHAR(255)|0|0.0|5|2431958|None|None|
|uri|object|Text|VARCHAR(255)|0|0.0|35530|2396433|None|None|
|event_type|object|Text|VARCHAR(255)|0|0.0|6|2431957|None|None|