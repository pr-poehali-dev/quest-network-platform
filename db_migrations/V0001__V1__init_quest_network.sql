CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'participant',
  email VARCHAR(100),
  vk VARCHAR(100),
  max_messenger VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.sites (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(200),
  network_key VARCHAR(50) UNIQUE NOT NULL,
  api_endpoint VARCHAR(300),
  style_preset VARCHAR(50) DEFAULT 'mystic-dark',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.paths (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES t_p38581678_quest_network_platfo.sites(id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '⚜️',
  is_locked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.levels (
  id SERIAL PRIMARY KEY,
  path_id INTEGER REFERENCES t_p38581678_quest_network_platfo.paths(id),
  level_number INTEGER NOT NULL,
  title VARCHAR(100),
  riddle TEXT,
  riddle_type VARCHAR(20) DEFAULT 'text',
  media_url VARCHAR(500),
  answer VARCHAR(300) NOT NULL,
  hint TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.participant_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  path_id INTEGER REFERENCES t_p38581678_quest_network_platfo.paths(id),
  level_id INTEGER REFERENCES t_p38581678_quest_network_platfo.levels(id),
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.invitations (
  id SERIAL PRIMARY KEY,
  created_by INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  invite_code VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20),
  channel VARCHAR(20) DEFAULT 'link',
  path_id INTEGER REFERENCES t_p38581678_quest_network_platfo.paths(id),
  used_by INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  used_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p38581678_quest_network_platfo.messages (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  to_user_id INTEGER REFERENCES t_p38581678_quest_network_platfo.users(id),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
