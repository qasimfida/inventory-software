// Bound parameters always include the authenticated membership's location scope.
export const dashboardWarehouses = `WITH wh AS (
 SELECT id FROM warehouses WHERE business_id=$1
 AND ($2::uuid IS NULL OR store_id=$2) AND ($3::uuid[] IS NULL OR id=ANY($3::uuid[]))
)`;
export const dashboardSales = `${dashboardWarehouses}, scoped AS (
 SELECT s.* FROM sales s JOIN wh ON wh.id=s.warehouse_id WHERE s.business_id=$1
 AND s.currency=$4 AND s.created_at >= $7::date::timestamp AT TIME ZONE 'UTC'
 AND s.created_at < ($6::date+1)::timestamp AT TIME ZONE 'UTC'
), period AS (SELECT * FROM scoped WHERE created_at >= $5::date::timestamp AT TIME ZONE 'UTC'),
today AS (SELECT * FROM scoped WHERE created_at >= $6::date::timestamp AT TIME ZONE 'UTC'),
daily AS (SELECT (created_at AT TIME ZONE 'UTC')::date AS sale_date,sum(total_minor) total FROM period GROUP BY 1),
trend AS (SELECT to_char(sale_date,'YYYY-MM-DD') date,COALESCE(total,0)::text AS "totalMinor"
 FROM generate_series($5::date::timestamp,$6::date::timestamp,interval '1 day') AS dates(sale_date)
 LEFT JOIN daily USING(sale_date) ORDER BY sale_date),
recent AS (SELECT s.id,to_char(s.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",s.state,s.total_minor::text AS "totalMinor",
 COALESCE(l.name,'Sale') name,COALESCE(l.sku,'') sku,
 (SELECT count(*)::text FROM sale_lines WHERE business_id=$1 AND sale_id=s.id) lines
 FROM period s LEFT JOIN LATERAL (SELECT name,sku FROM sale_lines WHERE business_id=$1 AND sale_id=s.id ORDER BY id LIMIT 1) l ON true
 ORDER BY s.created_at DESC,s.id DESC LIMIT 6),
top AS (SELECT l.variant_id id,max(l.name) name,max(l.sku) sku,sum(l.total_minor)::text AS "totalMinor"
 FROM sale_lines l JOIN period s ON s.id=l.sale_id WHERE l.business_id=$1
 GROUP BY l.variant_id ORDER BY sum(l.total_minor) DESC,l.variant_id LIMIT 5)
SELECT json_build_object(
 'todayMinor',(SELECT COALESCE(sum(total_minor),0)::text FROM today),
 'yesterdayMinor',(SELECT COALESCE(sum(total_minor),0)::text FROM scoped WHERE (created_at AT TIME ZONE 'UTC')::date=$6::date-1),
 'todayOrders',(SELECT count(*)::text FROM today),
 'averageBasketMinor',(SELECT COALESCE(round(avg(total_minor)),0)::text FROM today),
 'periodMinor',(SELECT COALESCE(sum(total_minor),0)::text FROM period),
 'previousMinor',(SELECT COALESCE(sum(total_minor),0)::text FROM scoped WHERE created_at < $5::date::timestamp AT TIME ZONE 'UTC'),
 'periodOrders',(SELECT count(*)::text FROM period),
 'trend',COALESCE((SELECT json_agg(trend) FROM trend),'[]'::json),
 'recent',COALESCE((SELECT json_agg(recent) FROM recent),'[]'::json),
 'topProducts',COALESCE((SELECT json_agg(top) FROM top),'[]'::json)
) AS data`;

export const dashboardInventory = `${dashboardWarehouses}, quantities AS (
 SELECT s.variant_id,sum(s.on_hand-s.reserved-s.damaged) available FROM stock_balances s
 JOIN wh ON wh.id=s.warehouse_id WHERE s.business_id=$1 GROUP BY s.variant_id
), stock AS (
 SELECT v.id,v.name,v.sku,u.code unit,COALESCE(q.available,0) available,
 CASE WHEN COALESCE(q.available,0)<=0 THEN 'out-of-stock' WHEN q.available<=$4::numeric THEN 'low-stock' ELSE 'in-stock' END status
 FROM catalog_variants v JOIN catalog_products p ON p.id=v.product_id AND p.business_id=$1
 JOIN catalog_units u ON u.id=v.base_unit_id AND u.business_id=$1
 LEFT JOIN quantities q ON q.variant_id=v.id
 WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND p.track_inventory
), preview AS (SELECT id,name,sku,unit,available::text,status FROM stock ORDER BY available,sku,id LIMIT 6)
SELECT json_build_object(
 'lowStock',count(*) FILTER(WHERE status='low-stock'),
 'outOfStock',count(*) FILTER(WHERE status='out-of-stock'),
 'threshold',$4::text,'items',COALESCE((SELECT json_agg(preview) FROM preview),'[]'::json)
) AS data FROM stock`;
