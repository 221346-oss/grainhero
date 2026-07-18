REVOKE ALL ON FUNCTION analytics.refresh_dim_calendar()       FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_dimensions()          FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_fact_orders()         FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_fact_shipments()      FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_fact_finance_daily()  FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_fact_insurance()      FROM public;
REVOKE ALL ON FUNCTION analytics.refresh_fact_telemetry_daily() FROM public;

GRANT EXECUTE ON FUNCTION analytics.refresh_dim_calendar()       TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_dimensions()          TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_fact_orders()         TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_fact_shipments()      TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_fact_finance_daily()  TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_fact_insurance()      TO service_role;
GRANT EXECUTE ON FUNCTION analytics.refresh_fact_telemetry_daily() TO service_role;