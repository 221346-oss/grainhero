
REVOKE EXECUTE ON FUNCTION analytics.refresh_orders(), analytics.refresh_shipments(), analytics.refresh_finance(), analytics.refresh_insurance(), analytics.refresh_telemetry(), analytics.refresh_all() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics.refresh_orders(), analytics.refresh_shipments(), analytics.refresh_finance(), analytics.refresh_insurance(), analytics.refresh_telemetry(), analytics.refresh_all() TO service_role;
