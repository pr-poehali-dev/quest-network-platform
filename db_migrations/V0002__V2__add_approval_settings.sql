ALTER TABLE t_p38581678_quest_network_platfo.users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id);

ALTER TABLE t_p38581678_quest_network_platfo.sites
  ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.settings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  auto_approve_participants BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);
