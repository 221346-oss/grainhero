UPDATE public.metric_registry
SET sql_template = 'SELECT name AS label, ROUND(COALESCE(current_occupancy_kg,0)::numeric / NULLIF(capacity_kg,0)::numeric * 100, 1) AS value FROM public.silos WHERE admin_id = ($1->>''caller_tenant_id'')::uuid ORDER BY name'
WHERE key = 'silo_fill_pct';