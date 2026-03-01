-- ============================================
-- PlexParty - Complete Supabase Database Schema
-- ============================================
-- Run this in the Supabase SQL Editor to set up
-- all tables, indices, RLS policies, triggers
-- and functions.
--
-- NOTE: This schema uses Supabase Auth for
-- user management. The `profiles` table extends
-- the built-in auth.users table.
-- ============================================

-- ============================================
-- 1. profiles (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read any profile"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. media (cache of Jellyfin movies/series)
-- ============================================
CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(255) PRIMARY KEY,
  jellyfin_id VARCHAR(255) UNIQUE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('movie', 'series')),
  poster_url VARCHAR(500),
  backdrop_url VARCHAR(500),
  synopsis TEXT,
  rating FLOAT DEFAULT 0,
  year INTEGER,
  duration INTEGER,  -- in seconds
  genres TEXT[],
  "cast" TEXT[],
  subtitles TEXT[],
  audio TEXT[],
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);
CREATE INDEX IF NOT EXISTS idx_media_jellyfin_id ON media(jellyfin_id);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read media"
  ON media FOR SELECT
  USING (true);

-- Only service role can insert/update media (backend)
CREATE POLICY "Service role can insert media"
  ON media FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update media"
  ON media FOR UPDATE
  USING (true);

-- ============================================
-- 3. rooms (watch party rooms)
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  media_id VARCHAR(255) NOT NULL,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT '',
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Only host can update room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Only host can delete room"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================
-- 4. room_participants
-- ============================================
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants"
  ON room_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON room_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. room_messages (chat in rooms)
-- ============================================
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);

ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone in room can read messages"
  ON room_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can insert messages"
  ON room_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. watch_history
-- ============================================
CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_id VARCHAR(255) NOT NULL,
  "current_time" INTEGER DEFAULT 0,  -- seconds
  duration INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched_at ON watch_history(last_watched_at);

ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own history"
  ON watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history"
  ON watch_history FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. friends
-- ============================================
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own friends"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their friendships"
  ON friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can update friendship status"
  ON friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- 8. notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('room_invite', 'friend_request', 'friend_joined', 'user_joined')),
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Inserts handled by backend service role
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Generate a random 6-character room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate room code on insert if not provided
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_room_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER rooms_auto_code
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_code();

-- Update room expires_at when participants join/leave
CREATE OR REPLACE FUNCTION update_room_expires()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- When a participant leaves, check if room is empty
    IF NOT EXISTS (
      SELECT 1 FROM room_participants WHERE room_id = OLD.room_id AND id != OLD.id
    ) THEN
      UPDATE rooms
      SET expires_at = NOW() + INTERVAL '10 minutes'
      WHERE id = OLD.room_id;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- When a participant joins, clear expiration
    UPDATE rooms
    SET expires_at = NULL
    WHERE id = NEW.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER room_participant_expires
  AFTER INSERT OR DELETE ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_expires();

-- Notify room host when a user joins
CREATE OR REPLACE FUNCTION notify_user_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_host_id UUID;
  v_user_name TEXT;
  v_media_id VARCHAR(255);
BEGIN
  SELECT host_id, media_id INTO v_host_id, v_media_id
  FROM rooms WHERE id = NEW.room_id;

  -- Don't notify the host about themselves joining
  IF v_host_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_user_name
  FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, data)
  VALUES (
    v_host_id,
    'user_joined',
    jsonb_build_object(
      'roomId', NEW.room_id,
      'userId', NEW.user_id,
      'userName', COALESCE(v_user_name, 'Unknown'),
      'mediaId', v_media_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER notify_user_joined_trigger
  AFTER INSERT ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_joined();

-- Delete empty expired rooms (run via pg_cron or scheduled job)
CREATE OR REPLACE FUNCTION delete_empty_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM rooms r
  WHERE r.expires_at IS NOT NULL
    AND r.expires_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM room_participants rp WHERE rp.room_id = r.id
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every 5 minutes (requires pg_cron extension)
-- Uncomment the following if pg_cron is available in your Supabase plan:
-- SELECT cron.schedule(
--   'delete-empty-rooms',
--   '*/5 * * * *',
--   'SELECT delete_empty_rooms()'
-- );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for tables that need it.
-- Run these in the Supabase dashboard or SQL editor:

ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- SAMPLE DATA (optional, for development)
-- ============================================
-- INSERT INTO media (id, jellyfin_id, title, type, poster_url, synopsis, rating, year, duration)
-- VALUES
--   ('movie-1', 'jellyfin-123', 'Jurassic Park', 'movie', '', 'Dinosaurios...', 8.5, 1993, 7200),
--   ('movie-2', 'jellyfin-124', 'The Matrix', 'movie', '', 'Realidad...', 8.7, 1999, 8280),
--   ('series-1', 'jellyfin-200', 'Breaking Bad', 'series', '', 'Quimica...', 9.5, 2008, 3000);
