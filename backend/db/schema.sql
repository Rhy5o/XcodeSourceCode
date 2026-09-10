-- Car racing social app schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(30) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    reg_plate       VARCHAR(10) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cars (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reg_plate       VARCHAR(10) NOT NULL,
    make            VARCHAR(50) NOT NULL,
    model           VARCHAR(50) NOT NULL,
    year             SMALLINT,
    bhp             INTEGER NOT NULL DEFAULT 0,
    top_speed_mph   INTEGER NOT NULL DEFAULT 0,
    zero_to_sixty   NUMERIC(4,2) NOT NULL DEFAULT 0,
    weight_kg       INTEGER NOT NULL DEFAULT 0,
    handling_score  SMALLINT NOT NULL DEFAULT 50 CHECK (handling_score BETWEEN 0 AND 100),
    image_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Populated by dvlaService.lookupByRegPlate() when a car is registered via
-- POST /api/cars/register (added after the initial cars table).
ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_size VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30);

-- Grip is its own base stat so race_tires mods (Stage 4) have something to
-- boost independently of handling_score (lowered_suspension's stat).
ALTER TABLE cars ADD COLUMN IF NOT EXISTS grip_score SMALLINT NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS mods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id          UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    mod_type        VARCHAR(30) NOT NULL,
    description     TEXT,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage 4 replaced the old free-form (name, category, bhp_delta,
-- weight_delta_kg, image_url) mod shape with a fixed catalog of mod_types
-- whose stat bonuses are computed on the fly (see modService.js) rather
-- than stored — so a deleted mod's effect simply disappears from the
-- recalculated total instead of requiring a reverse mutation.
ALTER TABLE mods ADD COLUMN IF NOT EXISTS mod_type VARCHAR(30);
ALTER TABLE mods ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE mods DROP COLUMN IF EXISTS name;
ALTER TABLE mods DROP COLUMN IF EXISTS category;
ALTER TABLE mods DROP COLUMN IF EXISTS bhp_delta;
ALTER TABLE mods DROP COLUMN IF EXISTS weight_delta_kg;
ALTER TABLE mods DROP COLUMN IF EXISTS image_url;
ALTER TABLE mods ALTER COLUMN mod_type SET NOT NULL;

CREATE TABLE IF NOT EXISTS matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_a_id        UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    car_b_id        UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    user_a_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_compared   VARCHAR(30) NOT NULL, -- bhp | top_speed_mph | zero_to_sixty | weight_kg | handling_score
    winner_car_id   UUID REFERENCES cars(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | completed
    round_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    round_ends_at   TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    CONSTRAINT different_cars CHECK (car_a_id <> car_b_id)
);

CREATE TABLE IF NOT EXISTS user_xp (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp              INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 1,
    wins            INTEGER NOT NULL DEFAULT 0,
    losses          INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_mods_car_id ON mods(car_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_user_xp_xp ON user_xp(xp DESC);
