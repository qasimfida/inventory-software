export const inventoryReport = `
 SELECT x.variant_id::text||':'||x.warehouse_id||':'||q.metric AS key,
 v.sku||' · '||wh.name||' · '||q.metric AS label,q.value::text AS value,u.code AS unit
 FROM (SELECT s.variant_id,s.warehouse_id,sum(s.on_hand) on_hand,sum(s.reserved) reserved,
 sum(s.damaged) damaged,sum(s.in_transit) in_transit FROM stock_balances s
 JOIN wh ON wh.business_id=s.business_id AND wh.id=s.warehouse_id GROUP BY s.variant_id,s.warehouse_id) x
 JOIN wh ON wh.id=x.warehouse_id JOIN catalog_variants v ON v.business_id=$1 AND v.id=x.variant_id
 JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id
 CROSS JOIN LATERAL (VALUES ('on hand',x.on_hand),('reserved',x.reserved),('damaged',x.damaged),
 ('in transit',x.in_transit),('available',x.on_hand-x.reserved-x.damaged)) q(metric,value)
 WHERE ($8::boolean=false OR x.on_hand-x.reserved-x.damaged<=$9::numeric)`;
export const movementReport = `
 SELECT x.variant_id::text||':'||x.warehouse_id||':'||q.metric AS key,
 v.sku||' · '||wh.name||' · '||q.metric AS label,q.value::text AS value,u.code AS unit
 FROM (SELECT m.variant_id,m.warehouse_id,
 COALESCE(sum(m.quantity_delta) FILTER(WHERE m.created_at<(SELECT start FROM bounds)),0) opening,
 COALESCE(sum(m.quantity_delta) FILTER(WHERE m.created_at>=(SELECT start FROM bounds)),0) change,
 sum(m.quantity_delta) closing FROM stock_movements m JOIN wh ON wh.business_id=m.business_id AND wh.id=m.warehouse_id
 WHERE m.created_at<(SELECT finish FROM bounds) GROUP BY m.variant_id,m.warehouse_id) x
 JOIN wh ON wh.id=x.warehouse_id JOIN catalog_variants v ON v.business_id=$1 AND v.id=x.variant_id
 JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id
 CROSS JOIN LATERAL (VALUES ('opening on hand',x.opening),('period movement',x.change),('closing on hand',x.closing)) q(metric,value)`;
