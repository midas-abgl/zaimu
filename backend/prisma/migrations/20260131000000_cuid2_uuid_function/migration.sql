-- Legacy models use UUID columns with a cuid2() database default.
-- Keep the historical contract working for fresh databases and existing installations.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION cuid2()
RETURNS UUID
LANGUAGE SQL
VOLATILE
AS $$
    SELECT gen_random_uuid();
$$;
