import { Database } from "bun:sqlite";
import { nowSecs } from "./util.ts";

export interface PlatformInput {
  name: string;
  handle: string;
  url: string;
  followers: number;
}

export interface MonthlyViewsInput {
  platform: string;
  views: number;
}

export interface CollabInput {
  name: string;
  image: string;
  url: string;
}

export interface CollabRecord extends CollabInput {
  id: number;
}

export interface TwitchLocationInput {
  country: string;
  percent: number;
}

export interface TwitchLocationRecord extends TwitchLocationInput {
  id: number;
}

export interface AudienceGenderInput {
  gender: string;
  percent: number;
  color: string | null;
}

export interface AudienceGenderRecord extends AudienceGenderInput {
  id: number;
}

export interface AudienceAgeGenderInput {
  age_range: string;
  gender: string;
  percent: number;
}

export interface AudienceAgeGenderRecord extends AudienceAgeGenderInput {
  id: number;
}

export function openDatabase(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA busy_timeout = 5000;");
  initDb(db);
  return db;
}

export function initDb(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platforms (
      name TEXT PRIMARY KEY,
      handle TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      followers INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collabs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS twitch_locations (
      id INTEGER PRIMARY KEY,
      country TEXT NOT NULL,
      percent REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audience_genders (
      id INTEGER PRIMARY KEY,
      gender TEXT NOT NULL,
      percent REAL NOT NULL DEFAULT 0,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audience_age_genders (
      id INTEGER PRIMARY KEY,
      age_range TEXT NOT NULL,
      gender TEXT NOT NULL,
      percent REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monthly_views (
      platform TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);

  migrate(db);
  removeRetiredContent(db);
  seed(db);
}

function columnExists(db: Database, table: string, column: string): boolean {
  const rows = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}

function migrate(db: Database): void {
  if (columnExists(db, "platforms", "avg_reach")) {
    db.exec("ALTER TABLE platforms DROP COLUMN avg_reach");
  }
  if (!columnExists(db, "platforms", "sort_order")) {
    db.exec("ALTER TABLE platforms ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    db.exec(
      "UPDATE platforms SET sort_order = (SELECT COUNT(*) FROM platforms p WHERE p.name < platforms.name)",
    );
  }
}

function removeRetiredContent(db: Database): void {
  db.exec(
    "DELETE FROM content WHERE key IN ('demographics_age', 'demographics_gender', 'demographics_location', 'twitch_avg_reach')",
  );
}

function seed(db: Database): void {
  const now = nowSecs();

  const contentDefaults: ReadonlyArray<[string, string]> = [
    ["brand_name", "RythonDev"],
    ["tagline", "Game developer & live streamer"],
    ["about", "I build games and stream the process on Twitch."],
    ["email", "hello@rython.dev"],
    ["profile_image_url", "/images/pfp_new_medium.webp"],
    ["profile_image_light_url", ""],
    [
      "services",
      "Sponsored content\nProduct reviews\nLivestream integrations\nSocial media campaigns\nBrand partnerships\nEvent appearances",
    ],
    ["stream_schedule", ""],
  ];

  const insertContent = db.query(
    "INSERT OR IGNORE INTO content (key, value, updated_at) VALUES (?1, ?2, ?3)",
  );
  for (const [key, value] of contentDefaults) {
    insertContent.run(key, value, now);
  }

  const platformDefaults: ReadonlyArray<[string, string, string, number]> = [
    ["youtube", "@rythondev", "https://youtube.com/@rythondev", 0],
    ["tiktok", "@rythondev", "https://tiktok.com/@rythondev", 0],
    ["instagram", "@rythondev", "https://instagram.com/rythondev", 0],
  ];

  const insertPlatform = db.query(
    "INSERT OR IGNORE INTO platforms (name, handle, url, followers, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  );
  for (const [index, [name, handle, url, followers]] of platformDefaults.entries()) {
    insertPlatform.run(name, handle, url, followers, index, now);
  }

  const monthlyViewsDefaults = ["twitch", "instagram", "tiktok", "youtube"] as const;
  const insertMonthlyViews = db.query(
    "INSERT OR IGNORE INTO monthly_views (platform, views, sort_order, updated_at) VALUES (?1, 0, ?2, ?3)",
  );
  for (const [index, platform] of monthlyViewsDefaults.entries()) {
    insertMonthlyViews.run(platform, index, now);
  }

  const countRow = db.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM collabs").get();
  if ((countRow?.count ?? 0) === 0) {
    const collabDefaults: ReadonlyArray<[string, string, string]> = [
      ["ProtonPass", "/images/collaborations/proton-pass.webp", "https://proton.me/pass"],
      ["ProtonVPN", "/images/collaborations/proton-vpn.webp", "https://protonvpn.com/"],
      ["Brick", "/images/collaborations/brick.webp", "https://getbrick.com/"],
      ["Focumon", "/images/collaborations/focumon.webp", "https://www.focumon.com/landing"],
    ];

    const insertCollab = db.query(
      "INSERT INTO collabs (name, image, url, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
    );
    for (const [index, [name, image, url]] of collabDefaults.entries()) {
      insertCollab.run(name, image, url, index, now);
    }
  }
}

export function getContent(db: Database): Record<string, string> {
  const rows = db
    .query<{ key: string; value: string }, []>("SELECT key, value FROM content ORDER BY key")
    .all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function upsertContent(db: Database, entries: ReadonlyArray<[string, string]>): void {
  const now = nowSecs();
  const stmt = db.query(
    `INSERT INTO content (key, value, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const run = db.transaction((items: ReadonlyArray<[string, string]>) => {
    for (const [key, value] of items) {
      stmt.run(key, value, now);
    }
  });
  run(entries);
}

export function getPlatforms(db: Database): PlatformInput[] {
  return db
    .query<PlatformInput, []>(
      "SELECT name, handle, url, followers FROM platforms ORDER BY sort_order, name",
    )
    .all();
}

export function upsertPlatforms(db: Database, platforms: ReadonlyArray<PlatformInput>): void {
  const now = nowSecs();
  const stmt = db.query(
    `INSERT INTO platforms (name, handle, url, followers, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(name) DO UPDATE SET
       handle = excluded.handle,
       url = excluded.url,
       followers = excluded.followers,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  );
  const run = db.transaction((items: ReadonlyArray<PlatformInput>) => {
    for (const [index, platform] of items.entries()) {
      stmt.run(
        platform.name,
        platform.handle,
        platform.url,
        Math.trunc(platform.followers),
        index,
        now,
      );
    }
  });
  run(platforms);
}

export function getMonthlyViews(db: Database): MonthlyViewsInput[] {
  return db
    .query<MonthlyViewsInput, []>(
      "SELECT platform, views FROM monthly_views ORDER BY sort_order, platform",
    )
    .all();
}

export function upsertMonthlyViews(db: Database, entries: ReadonlyArray<MonthlyViewsInput>): void {
  const now = nowSecs();
  const stmt = db.query(
    `INSERT INTO monthly_views (platform, views, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(platform) DO UPDATE SET
       views = excluded.views,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  );
  const run = db.transaction((items: ReadonlyArray<MonthlyViewsInput>) => {
    for (const [index, entry] of items.entries()) {
      stmt.run(entry.platform, Math.trunc(entry.views), index, now);
    }
  });
  run(entries);
}

export function getCollabs(db: Database): CollabRecord[] {
  return db
    .query<CollabRecord, []>("SELECT id, name, image, url FROM collabs ORDER BY sort_order, id")
    .all();
}

export function replaceCollabs(db: Database, collabs: ReadonlyArray<CollabInput>): void {
  const now = nowSecs();
  const deleteStmt = db.query("DELETE FROM collabs");
  const insertStmt = db.query(
    "INSERT INTO collabs (name, image, url, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  );
  const run = db.transaction((items: ReadonlyArray<CollabInput>) => {
    deleteStmt.run();
    for (const [index, collab] of items.entries()) {
      insertStmt.run(collab.name, collab.image, collab.url, index, now);
    }
  });
  run(collabs);
}

export function getTwitchLocations(db: Database): TwitchLocationRecord[] {
  return db
    .query<TwitchLocationRecord, []>(
      "SELECT id, country, percent FROM twitch_locations ORDER BY sort_order, id",
    )
    .all();
}

export function replaceTwitchLocations(
  db: Database,
  locations: ReadonlyArray<TwitchLocationInput>,
): void {
  const now = nowSecs();
  const deleteStmt = db.query("DELETE FROM twitch_locations");
  const insertStmt = db.query(
    "INSERT INTO twitch_locations (country, percent, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4)",
  );
  const run = db.transaction((items: ReadonlyArray<TwitchLocationInput>) => {
    deleteStmt.run();
    for (const [index, location] of items.entries()) {
      insertStmt.run(location.country, location.percent, index, now);
    }
  });
  run(locations);
}

export function getAudienceGenders(db: Database): AudienceGenderRecord[] {
  const rows = db
    .query<AudienceGenderRecord, []>(
      "SELECT id, gender, percent, color FROM audience_genders ORDER BY sort_order, id",
    )
    .all();
  return rows.map((row) => ({
    ...row,
    color: row.color ?? null,
  }));
}

export function replaceAudienceGenders(
  db: Database,
  genders: ReadonlyArray<AudienceGenderInput>,
): void {
  const now = nowSecs();
  const deleteStmt = db.query("DELETE FROM audience_genders");
  const insertStmt = db.query(
    "INSERT INTO audience_genders (gender, percent, color, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  );
  const run = db.transaction((items: ReadonlyArray<AudienceGenderInput>) => {
    deleteStmt.run();
    for (const [index, entry] of items.entries()) {
      insertStmt.run(entry.gender, entry.percent, entry.color, index, now);
    }
  });
  run(genders);
}

export function getAudienceAgeGenders(db: Database): AudienceAgeGenderRecord[] {
  return db
    .query<AudienceAgeGenderRecord, []>(
      "SELECT id, age_range, gender, percent FROM audience_age_genders ORDER BY sort_order, id",
    )
    .all();
}

export function replaceAudienceAgeGenders(
  db: Database,
  rows: ReadonlyArray<AudienceAgeGenderInput>,
): void {
  const now = nowSecs();
  const deleteStmt = db.query("DELETE FROM audience_age_genders");
  const insertStmt = db.query(
    "INSERT INTO audience_age_genders (age_range, gender, percent, sort_order, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  );
  const run = db.transaction((items: ReadonlyArray<AudienceAgeGenderInput>) => {
    deleteStmt.run();
    for (const [index, row] of items.entries()) {
      insertStmt.run(row.age_range, row.gender, row.percent, index, now);
    }
  });
  run(rows);
}
