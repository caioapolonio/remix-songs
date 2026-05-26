/**
 * Importa usuários, profiles e presets do Supabase de produção para o
 * Postgres local (better-auth + Drizzle).
 *
 * Não expõe dados sensíveis: conecta direto nos dois bancos via driver
 * `postgres` e copia row a row. As senhas são migradas como HASH bcrypt
 * (nunca em texto) — o better-auth, configurado com bcryptjs, aceita os
 * hashes `$2a$` do Supabase diretamente.
 *
 * Uso:
 *   SUPABASE_DB_URL="postgresql://postgres:...@...supabase.com:5432/postgres" \
 *   DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5434/remix" \
 *   bun run scripts/import-supabase-dump.ts
 *
 * Idempotente: rodar de novo não duplica (ON CONFLICT DO NOTHING).
 */
import postgres from "postgres";
import { randomUUID } from "crypto";

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_DB_URL) {
  console.error("✗ SUPABASE_DB_URL não setada (connection string do Supabase).");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL não setada (Postgres local).");
  process.exit(1);
}

const source = postgres(SUPABASE_DB_URL, { prepare: false });
const dest = postgres(DATABASE_URL, { prepare: false });

type SourceUser = {
  id: string;
  email: string;
  encrypted_password: string | null;
  email_confirmed_at: Date | null;
  created_at: Date | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
};

type SourcePreset = {
  id: string;
  user_id: string;
  name: string;
  speed: number | null;
  reverb: number | null;
  bass_boost: number | null;
  volume: number | null;
  created_at: Date | null;
};

async function main() {
  console.log("→ Lendo usuários do Supabase...");
  const users = await source<SourceUser[]>`
    SELECT u.id::text, u.email, u.encrypted_password, u.email_confirmed_at, u.created_at,
           p.subscription_status, p.stripe_customer_id, p.subscription_id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    ORDER BY u.created_at
  `;
  console.log(`  ${users.length} usuário(s) encontrado(s).`);

  console.log("→ Lendo presets do Supabase...");
  const presetRows = await source<SourcePreset[]>`
    SELECT id::text, user_id::text, name, speed, reverb, bass_boost, volume, created_at
    FROM public.presets
    ORDER BY created_at
  `;
  console.log(`  ${presetRows.length} preset(s) encontrado(s).`);

  let usersImported = 0;
  let accountsImported = 0;
  let profilesImported = 0;

  for (const u of users) {
    const name = u.email.split("@")[0] ?? "";
    const emailVerified = u.email_confirmed_at !== null;
    const createdAt = u.created_at ?? new Date();

    const [insertedUser] = await dest`
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES (${u.id}, ${name}, ${u.email}, ${emailVerified}, ${createdAt}, ${createdAt})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (insertedUser) usersImported++;

    // account com a credencial (hash bcrypt). Só cria se houver senha.
    if (u.encrypted_password) {
      const [insertedAccount] = await dest`
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${u.id}, 'credential', ${u.id}, ${u.encrypted_password}, ${createdAt}, ${createdAt})
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      if (insertedAccount) accountsImported++;
    }

    const [insertedProfile] = await dest`
      INSERT INTO profiles (id, subscription_status, stripe_customer_id, subscription_id, updated_at)
      VALUES (
        ${u.id},
        ${u.subscription_status ?? "free"},
        ${u.stripe_customer_id ?? null},
        ${u.subscription_id ?? null},
        ${createdAt}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (insertedProfile) profilesImported++;
  }

  let presetsImported = 0;
  for (const p of presetRows) {
    const [inserted] = await dest`
      INSERT INTO presets (id, user_id, name, speed, reverb, bass_boost, volume, created_at)
      VALUES (
        ${p.id}, ${p.user_id}, ${p.name},
        ${p.speed ?? 1}, ${p.reverb ?? 0}, ${p.bass_boost ?? 0}, ${p.volume ?? 1},
        ${p.created_at ?? new Date()}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    if (inserted) presetsImported++;
  }

  console.log("\n✓ Import concluído:");
  console.log(`  users:    ${usersImported} inseridos (${users.length} no source)`);
  console.log(`  accounts: ${accountsImported} inseridos`);
  console.log(`  profiles: ${profilesImported} inseridos`);
  console.log(`  presets:  ${presetsImported} inseridos (${presetRows.length} no source)`);

  await source.end();
  await dest.end();
}

main().catch(async (err) => {
  console.error("✗ Erro no import:", err);
  await source.end({ timeout: 1 }).catch(() => {});
  await dest.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});
