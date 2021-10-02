begin;
ALTER TABLE IF EXISTS server_log ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL default '{}';
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS weapon;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS damage;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS attacker_position;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS victim_position;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS assister_position;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS item;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS extra;
ALTER TABLE IF EXISTS server_log DROP COLUMN IF EXISTS player_class;
commit;
