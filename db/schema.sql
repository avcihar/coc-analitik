-- =============================================================================
-- Clash of Clans Analytics Platform — PostgreSQL DDL Schema
-- Version: 1.0.0
-- Engine: PostgreSQL >= 15
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- fuzzy text search on names
CREATE EXTENSION IF NOT EXISTS "btree_gin";        -- composite GIN indexes

-- ---------------------------------------------------------------------------
-- Custom ENUM Types
-- ---------------------------------------------------------------------------
CREATE TYPE battle_type_enum AS ENUM (
    'multiplayer',
    'clan_war',
    'cwl',
    'raid_weekend',
    'friendly',
    'builder_base'
);

CREATE TYPE hero_name_enum AS ENUM (
    'Barbarian King',
    'Archer Queen',
    'Grand Warden',
    'Royal Champion',
    'Minion Prince'
);

CREATE TYPE leaderboard_scope_enum AS ENUM (
    'global',
    'local',
    'clan',
    'cwl_group'
);

CREATE TYPE calculation_strategy_enum AS ENUM (
    'elo',
    'trophy_weighted',
    'war_stars',
    'destruction_avg',
    'composite'
);

-- =============================================================================
-- TABLE: players
-- The canonical identity and live state of a tracked player.
-- =============================================================================
CREATE TABLE IF NOT EXISTS players (
    -- Identity
    player_tag          VARCHAR(12)     NOT NULL,   -- e.g. ABC123XY (without #)
    name                VARCHAR(64)     NOT NULL,

    -- Progression
    town_hall           SMALLINT        NOT NULL CHECK (town_hall BETWEEN 1 AND 18),
    builder_hall        SMALLINT                 CHECK (builder_hall BETWEEN 1 AND 10),
    exp_level           SMALLINT        NOT NULL DEFAULT 1,

    -- Live trophies
    trophies            INT             NOT NULL DEFAULT 0,
    best_trophies       INT             NOT NULL DEFAULT 0,
    builder_trophies    INT                      DEFAULT 0,

    -- War / clan relationship
    clan_tag            VARCHAR(12),
    clan_role           VARCHAR(16),    -- member | elder | coLeader | leader
    war_stars           INT             NOT NULL DEFAULT 0,

    -- Timestamps
    last_scouted_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Soft delete
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_players PRIMARY KEY (player_tag)
);

-- Indexes
CREATE INDEX idx_players_clan_tag       ON players (clan_tag) WHERE clan_tag IS NOT NULL;
CREATE INDEX idx_players_town_hall      ON players (town_hall);
CREATE INDEX idx_players_trophies       ON players (trophies DESC);
CREATE INDEX idx_players_last_scouted   ON players (last_scouted_at DESC);
CREATE INDEX idx_players_name_trgm      ON players USING GIN (name gin_trgm_ops);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE players IS
    'Canonical player profile; synced from the CoC API on each scout cycle.';
COMMENT ON COLUMN players.player_tag IS
    'CoC player tag without the leading #, stored uppercase. Used as PK across all tables.';

-- =============================================================================
-- TABLE: hero_equipment_snapshots
-- Time-series record of hero equipment states per player.
-- Partitioned quarterly for efficient range scans and purging at scale.
-- =============================================================================
CREATE TABLE IF NOT EXISTS hero_equipment_snapshots (
    snapshot_id         BIGINT          GENERATED ALWAYS AS IDENTITY,
    player_tag          VARCHAR(12)     NOT NULL,

    -- Hero & equipment
    hero_name           hero_name_enum  NOT NULL,
    equipment_name      VARCHAR(64)     NOT NULL,
    equipment_tag       VARCHAR(32),                -- future: official API tag
    level               SMALLINT        NOT NULL CHECK (level >= 1),
    max_level           SMALLINT,
    is_equipped         BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Extended attributes (rarity, type, etc.) without schema migrations
    metadata            JSONB           NOT NULL DEFAULT '{}',

    -- When this snapshot was captured
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_hero_equipment_snapshots PRIMARY KEY (snapshot_id, recorded_at),
    CONSTRAINT fk_hes_player
        FOREIGN KEY (player_tag) REFERENCES players(player_tag)
        ON DELETE CASCADE ON UPDATE CASCADE
) PARTITION BY RANGE (recorded_at);

-- Quarterly partitions
CREATE TABLE hero_equipment_snapshots_2025_q1
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE hero_equipment_snapshots_2025_q2
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

CREATE TABLE hero_equipment_snapshots_2025_q3
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE hero_equipment_snapshots_2025_q4
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

CREATE TABLE hero_equipment_snapshots_2026_q1
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE hero_equipment_snapshots_2026_q2
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE hero_equipment_snapshots_2026_q3
    PARTITION OF hero_equipment_snapshots
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Default catch-all partition
CREATE TABLE hero_equipment_snapshots_future
    PARTITION OF hero_equipment_snapshots
    DEFAULT;

-- Partition-propagated indexes
CREATE INDEX idx_hes_player_tag     ON hero_equipment_snapshots (player_tag, recorded_at DESC);
CREATE INDEX idx_hes_hero           ON hero_equipment_snapshots (hero_name, equipment_name);
CREATE INDEX idx_hes_is_equipped    ON hero_equipment_snapshots (player_tag, is_equipped)
    WHERE is_equipped = TRUE;
CREATE INDEX idx_hes_metadata       ON hero_equipment_snapshots USING GIN (metadata);

COMMENT ON TABLE hero_equipment_snapshots IS
    'Append-only snapshot of hero equipment per player. Partitioned quarterly for efficient purging and range scans.';

-- =============================================================================
-- TABLE: battle_logs
-- Immutable record of each tracked battle/raid outcome.
-- =============================================================================
CREATE TABLE IF NOT EXISTS battle_logs (
    -- Surrogate key (deterministic UUID from battle context is preferred over serial)
    battle_id               UUID            NOT NULL DEFAULT gen_random_uuid(),

    -- Core relationship
    player_tag              VARCHAR(12)     NOT NULL,

    -- Classification
    battle_type             battle_type_enum NOT NULL,

    -- Outcome metrics
    stars                   SMALLINT        NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
    destruction_percentage  NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                                CHECK (destruction_percentage BETWEEN 0.00 AND 100.00),

    -- Army / attack
    army_share_code         VARCHAR(64),                   -- sharable link code
    parsed_army_json        JSONB           NOT NULL DEFAULT '{}',
    -- Expected JSONB shape:
    -- {
    --   "troops":     [{"id": 1, "name": "Barbarian", "count": 10, "level": 5}],
    --   "spells":     [{"id": 23, "name": "Lightning Spell", "count": 3, "level": 8}],
    --   "sieges":     [{"id": 51, "name": "Wall Wrecker", "count": 1, "level": 2}],
    --   "hero_equip": [{"hero": "Barbarian King", "equipment": "Giant Gauntlet", "level": 18}]
    -- }

    -- Opposing base snapshot (optional)
    defender_tag            VARCHAR(12),
    defender_town_hall      SMALLINT        CHECK (defender_town_hall BETWEEN 1 AND 18),

    -- Clan war context (nullable for non-war battles)
    clan_war_id             UUID,
    war_map_position        SMALLINT,       -- attacker's position in the war map
    attack_order            SMALLINT,       -- 1st or 2nd attack

    -- Raw API payload for reprocessing without re-fetching
    raw_payload             JSONB,

    -- Timestamps
    battle_timestamp        TIMESTAMPTZ     NOT NULL,
    ingested_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_battle_logs PRIMARY KEY (battle_id),
    CONSTRAINT fk_bl_player
        FOREIGN KEY (player_tag) REFERENCES players(player_tag)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Prevent duplicate ingestion of the same event
    CONSTRAINT uq_battle_logs_dedup
        UNIQUE (player_tag, battle_timestamp, battle_type, defender_tag)
);

-- Indexes
CREATE INDEX idx_bl_player_tag          ON battle_logs (player_tag, battle_timestamp DESC);
CREATE INDEX idx_bl_battle_type         ON battle_logs (battle_type);
CREATE INDEX idx_bl_battle_timestamp    ON battle_logs (battle_timestamp DESC);
CREATE INDEX idx_bl_clan_war_id         ON battle_logs (clan_war_id) WHERE clan_war_id IS NOT NULL;
CREATE INDEX idx_bl_stars               ON battle_logs (player_tag, stars);
CREATE INDEX idx_bl_parsed_army         ON battle_logs USING GIN (parsed_army_json);
CREATE INDEX idx_bl_army_share_code     ON battle_logs (army_share_code)
    WHERE army_share_code IS NOT NULL;

-- Partial index for CWL battles only (frequent analytical access pattern)
CREATE INDEX idx_bl_cwl_only
    ON battle_logs (player_tag, battle_timestamp DESC, stars, destruction_percentage)
    WHERE battle_type = 'cwl';

COMMENT ON TABLE battle_logs IS
    'Immutable append-only battle records. parsed_army_json is the canonical parsed army; raw_payload retains the original API response for reprocessing.';
COMMENT ON COLUMN battle_logs.army_share_code IS
    'CoC in-game army share link code — used to reconstruct army compositions offline.';

-- =============================================================================
-- TABLE: leaderboard_meta_cache
-- Materialised aggregation results with invalidation metadata.
-- NOT a replacement for Redis — used for durable cross-session cache and audit.
-- =============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_meta_cache (
    cache_id                UUID            NOT NULL DEFAULT gen_random_uuid(),

    -- Cache key dimensions
    scope                   leaderboard_scope_enum  NOT NULL,
    scope_value             VARCHAR(64)     NOT NULL,  -- e.g. clan_tag, 'global', country ISO
    calculation_strategy    calculation_strategy_enum NOT NULL,

    -- Stored result
    aggregation_result      JSONB           NOT NULL,
    -- Expected shape:
    -- {
    --   "rankings": [{"rank": 1, "player_tag": "ABC123", "score": 9842.5}],
    --   "generated_from": "2026-09-08T16:00:00Z",
    --   "sample_size": 1500
    -- }

    -- Validity window
    calculated_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ     NOT NULL
        GENERATED ALWAYS AS (calculated_at + INTERVAL '1 hour') STORED,
    is_stale                BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Provenance
    triggered_by            VARCHAR(64),    -- 'cron' | 'api_request' | 'webhook'
    computation_ms          INT,            -- how long the calculation took in ms

    CONSTRAINT pk_leaderboard_meta_cache PRIMARY KEY (cache_id),
    CONSTRAINT uq_lmc_scope_strategy
        UNIQUE (scope, scope_value, calculation_strategy)  -- one active row per key
);

-- Indexes
CREATE INDEX idx_lmc_scope              ON leaderboard_meta_cache (scope, scope_value);
CREATE INDEX idx_lmc_calculated_at      ON leaderboard_meta_cache (calculated_at DESC);
CREATE INDEX idx_lmc_stale              ON leaderboard_meta_cache (is_stale) WHERE is_stale = FALSE;
CREATE INDEX idx_lmc_aggregation        ON leaderboard_meta_cache USING GIN (aggregation_result);
CREATE INDEX idx_lmc_expires_at         ON leaderboard_meta_cache (expires_at)
    WHERE is_stale = FALSE;

COMMENT ON TABLE leaderboard_meta_cache IS
    'Durable leaderboard aggregation cache. One active row per (scope, scope_value, strategy) triplet. Redis is the hot-path; this table provides durability and audit trail.';

-- =============================================================================
-- Utility: Purge expired / stale cache rows
-- Schedule: SELECT cron.schedule('0 * * * *', $$SELECT purge_expired_leaderboard_cache()$$);
-- =============================================================================
CREATE OR REPLACE FUNCTION purge_expired_leaderboard_cache()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM leaderboard_meta_cache
        WHERE expires_at < NOW() OR is_stale = TRUE
        RETURNING cache_id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$;
