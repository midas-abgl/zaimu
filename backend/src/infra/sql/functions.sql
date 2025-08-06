-- Automatic updatedAt trigger

CREATE OR REPLACE FUNCTION updated_at() RETURNS TRIGGER AS $$
    BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
$$ LANGUAGE PLPGSQL;

-- CUID2 generation

CREATE EXTENSION IF NOT EXISTS pgcrypto;


CREATE SEQUENCE IF NOT EXISTS public.cuid2_counter;


CREATE OR REPLACE FUNCTION cuid2(id_length integer DEFAULT 24) RETURNS varchar(32) AS $$
DECLARE
    -- Constants
    MIN_LENGTH     CONSTANT integer := 4;
    MAX_LENGTH     CONSTANT integer := 32;
    ALPHABET       CONSTANT text := '0123456789abcdefghijklmnopqrstuvwxyz';

    -- CUID2 Components
    v_timestamp    text;
    v_counter      text;
    v_random_str   text;
    v_fingerprint  text;

    -- Hashing & Encoding
    v_hash_input   text;
    v_hash         bytea;
    v_output_id    text;

    -- Helper for Base36 conversion
    v_hex_hash     text;
    v_high_bigint bigint;
    v_low_bigint  bigint;
    v_high         numeric;
    v_low          numeric;
    v_num          numeric;
    v_base36_val   text := '';
    v_char         text;
    v_pos          integer;
BEGIN
    -- 1. Validate length parameter
    IF id_length < MIN_LENGTH OR id_length > MAX_LENGTH THEN
        RAISE EXCEPTION 'cuid2() length must be between % and %.', MIN_LENGTH, MAX_LENGTH;
    END IF;

    -- 2. Get core components
    -- Timestamp in milliseconds
    v_timestamp   := floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text;

    -- Monotonic counter
    v_counter     := nextval('public.cuid2_counter')::text;

    -- Strong cryptographic randomness
    v_random_str  := encode(gen_random_bytes(32), 'hex');

    -- A "fingerprint" of the environment. In this case, we use more randomness for simplicity and security in a database context.
    v_fingerprint := encode(gen_random_bytes(32), 'hex');

    -- 3. Create the hash
    -- The spec uses SHA3-512, but pgcrypto provides SHA-512, which is secure and sufficient for entropy mixing in this context.
    v_hash_input  := v_timestamp || v_counter || v_random_str || v_fingerprint;
    v_hash        := digest(v_hash_input, 'sha512');

    -- 4. Create the Base36-encoded hash string from the first 128 bits of the hash
    -- This block correctly converts the hash to a positive numeric value by
    -- handling the signed nature of PostgreSQL's bigint type.
    DECLARE
        v_high_bigint bigint;
        v_low_bigint  bigint;
        v_high        numeric;
        v_low         numeric;
    BEGIN
        v_hex_hash := encode(substring(v_hash from 1 for 16), 'hex');

        -- Convert high 64 bits, correcting for signedness
        v_high_bigint := ('x' || substring(v_hex_hash, 1, 16))::bit(64)::bigint;
        v_high := v_high_bigint::numeric;
        IF v_high < 0 THEN
            v_high := v_high + power(2::numeric, 64);
        END IF;

        -- Convert low 64 bits, correcting for signedness
        v_low_bigint := ('x' || substring(v_hex_hash, 17, 16))::bit(64)::bigint;
        v_low := v_low_bigint::numeric;
        IF v_low < 0 THEN
            v_low := v_low + power(2::numeric, 64);
        END IF;

        v_num := v_high * power(2::numeric, 64) + v_low;
    END;

    -- Base36 encoding loop
    WHILE v_num > 0 LOOP
        v_pos := (v_num % 36) + 1;
        v_char := substr(ALPHABET, v_pos, 1);
        v_base36_val := v_char || v_base36_val;
        v_num := floor(v_num / 36);
    END LOOP;

    -- 5. Prepend a random letter and trim to final length
    v_output_id := substr(ALPHABET, floor(random() * 26 + 11)::integer, 1) || v_base36_val;

    RETURN substr(v_output_id, 1, id_length);
END;
$$ VOLATILE LANGUAGE PLPGSQL;