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

-- Stage 5: "online" status for the race scheduler. is_online is the
-- explicit go-online/go-offline toggle; last_activity is refreshed on
-- go-online and on every GET /api/show/status poll while online, so a
-- browser tab left open (or closed without going offline) naturally
-- falls out of getOnlineUsers()'s staleness window.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

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

-- Stage 5 replaced the Stage 1 matches/user_xp shape (car_a_id/car_b_id +
-- user_a_id/user_b_id + stat_compared + a pending/completed round window)
-- with the simpler shape the race engine spec calls for: a match is just
-- two cars, a winning car (or NULL for a draw), and when it happened; the
-- owning user is derived by joining cars when needed (see raceEngine.js).
-- Both tables had zero rows when this migration was written, so a clean
-- drop + recreate is safe and avoids fragile column-rename gymnastics.
DROP TABLE IF EXISTS matches;
CREATE TABLE matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car1_id         UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    car2_id         UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    winner_id       UUID REFERENCES cars(id), -- winning car's id; NULL = draw
    "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT different_cars CHECK (car1_id <> car2_id)
);

-- Stage 6: user_xp becomes one row per (user, season) rather than one row
-- per user, so historical seasons stay queryable without archiving —
-- resetSeason() just advances game_state.current_season; nothing is
-- deleted, and a user's first score in the new season simply inserts a
-- fresh row. Table was empty (see comment above the Stage 5 block), so
-- another clean drop + recreate rather than an ALTER.
DROP TABLE IF EXISTS user_xp;
CREATE TABLE user_xp (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_number   INTEGER NOT NULL DEFAULT 1,
    total_xp        INTEGER NOT NULL DEFAULT 0,
    wins            INTEGER NOT NULL DEFAULT 0,
    losses          INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, season_number)
);

-- Singleton row tracking which season is "current". The id/CHECK pair is
-- the standard Postgres pattern for enforcing at most one row.
CREATE TABLE IF NOT EXISTS game_state (
    id              BOOLEAN PRIMARY KEY DEFAULT true,
    current_season  INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT single_row CHECK (id)
);
INSERT INTO game_state (id, current_season)
VALUES (true, 1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS badges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    icon_url        TEXT, -- placeholder emoji for now; a real asset URL later
    criteria        TEXT NOT NULL -- human-readable rule, checked in badgeService.js
);

CREATE TABLE IF NOT EXISTS user_badges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_id)
);

INSERT INTO badges (slug, name, description, icon_url, criteria) VALUES
    ('first_blood', 'First Blood', 'Win your first race', '🩸', 'wins >= 1'),
    ('century_club', 'Century Club', 'Win 100 races', '💯', 'wins >= 100'),
    ('thousand_xp', 'Thousand XP', 'Reach 1000 total XP', '⭐', 'total_xp >= 1000'),
    ('undefeated', 'Undefeated', 'Win 10 races in a row with no losses', '🏆', 'current win streak >= 10'),
    ('speedster', 'Speedster', 'Own a car with 0-60 under 4 seconds', '⚡', 'any car.zero_to_sixty < 4'),
    ('power', 'Power', 'Own a car with over 400 BHP', '🔥', 'any car.bhp > 400'),
    ('modded_beast', 'Modded Beast', 'Install 5 or more mods on a single car', '🔧', 'any car mod count >= 5')
ON CONFLICT (slug) DO NOTHING;

-- Stage 7: social features.
CREATE TABLE IF NOT EXISTS followers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS clans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    leader_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    member_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clan_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id         UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    role            VARCHAR(20) NOT NULL DEFAULT 'member', -- 'leader' | 'member'
    UNIQUE (clan_id, user_id),
    UNIQUE (user_id) -- a user belongs to at most one clan at a time
);

CREATE TABLE IF NOT EXISTS car_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id          UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_mods_car_id ON mods(car_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clans_member_count ON clans(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_clans_name ON clans(lower(name));
CREATE INDEX IF NOT EXISTS idx_car_comments_car_id ON car_comments(car_id);
CREATE INDEX IF NOT EXISTS idx_matches_car1 ON matches(car1_id);
CREATE INDEX IF NOT EXISTS idx_matches_car2 ON matches(car2_id);
CREATE INDEX IF NOT EXISTS idx_matches_timestamp ON matches("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_season_xp ON user_xp(season_number, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(lower(username));
