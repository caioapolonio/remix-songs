# Migração: Supabase → PostgreSQL self-hosted na VPS

> Documento didático da migração do `remix-songs` de Supabase + Vercel para
> uma stack self-hosted (Postgres + Next.js + Caddy via Docker) numa VPS
> Hostinger. Iniciada em 2026-05-21.
>
> Esse arquivo é a **explicação conceitual** da migração. O plano operacional
> (passos exatos) está em `/home/caio/.claude/plans/vamos-migrar-do-supabase-delegated-hickey.md`
> mas não é versionado no repo.

---

## Índice

1. [O que estamos fazendo](#o-que-estamos-fazendo)
2. [Por que sair do Supabase + Vercel?](#por-que-sair-do-supabase--vercel)
3. [Por que VPS em vez de Railway/Render/Fly?](#por-que-vps-em-vez-de-railwayrenderfly)
4. [A nova stack — o que cada peça faz](#a-nova-stack--o-que-cada-peça-faz)
5. [Como o deploy funciona (visão geral)](#como-o-deploy-funciona-visão-geral)
6. [Trade-offs assumidos](#trade-offs-assumidos)
7. [Plano de rollback](#plano-de-rollback)
8. [Glossário rápido](#glossário-rápido)
9. [Para aprofundar](#para-aprofundar)

---

## O que estamos fazendo

**Antes:**
- Frontend Next.js no **Vercel** (deploy via Git, SSL automático, edge functions)
- Banco + Auth no **Supabase** (Postgres managed + Supabase Auth + Supabase SMTP)
- Stripe para pagamentos

**Depois:**
- Frontend Next.js rodando em **container Docker** na VPS Hostinger
- Postgres rodando em **container Docker** na mesma VPS
- **Caddy** como reverse proxy + TLS automático
- **better-auth** + **Drizzle ORM** substituindo Supabase
- **Resend** para envio de email (verification + reset)
- Stripe continua igual

O que NÃO muda:
- A lógica do player de áudio (WaveSurfer + Tone.js)
- O modelo de subscription (`free`/`active`/`canceled`/`past_due`)
- A integração com Stripe (só o webhook muda de URL)

---

## Por que sair do Supabase + Vercel?

Honestamente: **Supabase + Vercel é uma stack ótima.** Não estamos fugindo
de um problema técnico. Estamos saindo porque:

1. **Consolidação:** a VPS Hostinger já está paga e tem espaço sobrando
   (hoje só roda o `stream-recorder`, um daemon Python leve sem banco).
   Hospedar mais um projeto não custa nada a mais.

2. **Aprendizado:** primeira vez fazendo self-hosting de verdade. Saber
   como Linux + Docker + Postgres + Caddy + DNS se conectam é
   conhecimento valioso por toda a carreira.

3. **Reduzir lock-in:** Supabase tem APIs proprietárias (`@supabase/ssr`,
   RLS policies). better-auth + Drizzle são portáveis — funcionam em
   qualquer Postgres.

4. **Curiosidade:** entender o que ferramentas como Railway/Render fazem
   por baixo.

---

## Por que VPS em vez de Railway/Render/Fly?

Pergunta legítima. Se uma VPS na mão dá tanto trabalho, por que essas
plataformas existem?

### A comparação honesta

| Aspecto              | PaaS (Railway, Render, Fly)         | VPS na mão (este projeto)            |
| -------------------- | ----------------------------------- | ------------------------------------ |
| Deploy               | `git push` e pronto                 | SSH + `docker compose up`            |
| SSL/TLS              | automático, transparente            | Caddy gerencia, mas você configura   |
| Backups DB           | automáticos, point-in-time recovery | você escreve o cron `pg_dump`        |
| Escala horizontal    | automático                          | manual (ou nada)                     |
| Uptime / oncall      | SRE deles cuida                     | **você é o oncall**                  |
| Custo previsível     | escala com uso (pode pular)         | fixo (R$25-50/mês)                   |
| Vendor lock-in       | alto                                | nenhum                               |
| Aprendizado de infra | pouco                               | **muito**                            |

### Quando PaaS faz mais sentido

- **SaaS comercial com clientes pagantes esperando SLA.** Você não pode
  ser o oncall às 3am — precisa de plataforma com time de plantão.
- **Workloads imprevisíveis.** Tráfego que sobe 100× no Black Friday
  precisa de auto-scaling.
- **Time pequeno onde devops é caro.** 2h economizadas em deploy/semana
  pagam Railway facilmente.
- **Compliance / certificações** (SOC 2, ISO) que a plataforma já tem.

### Quando VPS faz sentido (nosso caso)

- **Projeto pessoal / hobby**, mesmo com alguns users pagantes (alguns
  R$/mês em Stripe).
- Você **já tem a VPS paga** e parada.
- **Tráfego baixo** e previsível.
- Você **quer aprender infra de verdade**.
- Tem **outro projeto na mesma máquina** aproveitando recursos.
- **Sem SLA** prometido aos usuários.

### Os 4 riscos que precisam ser mitigados (não opcionais)

Se você vai usar VPS, **essas 4 coisas não são "depois eu vejo":**

1. **Backup automatizado E testado.** Não basta ter cron rodando — tem
   que rodar restore num ambiente de teste pelo menos 1× para confirmar
   que o dump é válido. Backup nunca restaurado **não é backup**.

2. **Monitoring de uptime.** Algo como [healthcheck.io](https://healthchecks.io)
   (grátis) que faz ping no `/api/healthz` a cada 5 min e te alerta no
   email/Telegram se cair. Sem isso, o app pode estar offline horas e
   você só descobre quando um user reclama.

3. **Plano de rollback documentado.** Como voltar pro Supabase nas
   primeiras 48h se algo der errado pós-cutover. Está [neste doc](#plano-de-rollback).

4. **Atualizações de segurança do SO.** Fedora 43 recebe patches de
   segurança diários — você precisa rodar `sudo dnf upgrade` regularmente
   (ou habilitar updates automáticos). Senão sua VPS fica vulnerável.

**Conclusão:** vamos seguir com VPS, mas tratando esses 4 pontos como
parte do plano. Eles entram explicitamente nas Fases 9 e 10 da migração.

---

## A nova stack — o que cada peça faz

### Docker e Docker Compose

**O problema que resolve:** "funciona na minha máquina mas não no servidor."

**O que é:** Docker empacota uma aplicação (código + dependências + runtime)
numa **imagem** isolada. Quando você roda essa imagem, vira um **container**
— um processo isolado do resto do sistema operacional. Funciona igual em
qualquer lugar onde Docker rode.

**Docker Compose** é uma camada em cima do Docker para descrever múltiplos
containers + suas conexões num único arquivo YAML.

**Como usamos:**
- `docker-compose.dev.yml` → só Postgres (dev local)
- `docker-compose.prod.yml` → Postgres + Next.js + Caddy (produção)

**Conceitos importantes:**
- **Imagem** = "molde" (read-only, build-time)
- **Container** = instância rodando da imagem (read-write, runtime)
- **Volume** = pasta persistida fora do container (não morre quando o
  container reinicia). É onde mora o `postgres_data`.
- **Rede** = conexão entre containers. Por padrão Compose cria uma rede
  privada onde os serviços se enxergam pelo nome (`postgres`, `next`).
- **Porta exposta** = porta do container mapeada pra porta do host. Por
  segurança, **só Caddy expõe portas** (80/443). Postgres e Next ficam
  acessíveis apenas pela rede interna do Compose.

### Postgres em container

**O problema que resolve:** ter um banco SQL relacional confiável.

Postgres é o melhor banco SQL open-source. Como container, fica trivial
subir uma versão idêntica em dev e prod — só muda o `DATABASE_URL`.

**Dado é persistido em volume nomeado** (`postgres_data`). Se o container
for recriado, os dados continuam. Se o volume for apagado, vai tudo
embora — por isso o backup importa.

### Drizzle ORM

**O problema que resolve:** escrever SQL com type safety + migrations
versionadas.

**O que é:** ORM TypeScript-first. Você define o schema em código:

```ts
// lib/db/schema.ts
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  ...
});
```

E faz queries com a sintaxe SQL-like, tipada:

```ts
const users = await db.select().from(user).where(eq(user.email, "x@y.com"));
```

**Migrations:** `bunx drizzle-kit generate` compara o schema atual com o
último snapshot e gera um SQL com as diferenças (`CREATE TABLE`, `ALTER`,
etc.). Você roda esse SQL com `bunx drizzle-kit migrate`. Histórico vive
em `lib/db/migrations/`.

**Por que não Prisma?** Drizzle é mais leve (sem Rust engine), sintaxe
mais próxima de SQL (curva de aprendizado mais transferível), e integra
direto com better-auth.

### better-auth

**O problema que resolve:** substituir Supabase Auth.

**O que é:** biblioteca de autenticação moderna para Next.js. Faz:
- Email/password com hash seguro
- Verificação de email por link
- Reset de senha
- Sessions baseadas em cookie (sem JWT no client)
- OAuth (Google, GitHub, etc.) se você quiser depois
- 2FA, magic links, passkeys se você quiser depois

**Como funciona aqui:** ele se conecta no nosso Postgres via Drizzle adapter
e gerencia 4 tabelas:
- `user` — quem é a pessoa
- `account` — credenciais (senha hash, ou tokens OAuth)
- `session` — sessões ativas (com cookie token)
- `verification` — tokens temporários para verificar email e resetar senha

**Substituto do trigger `on_auth_user_created`:** No Supabase, um trigger
SQL criava uma row em `profiles` quando um user signava. Aqui usamos um
**hook do better-auth** (`databaseHooks.user.create.after`) que faz a mesma
coisa em código TypeScript. Vantagem: versionado no Git, fácil de testar.

### Resend

**O problema que resolve:** enviar email (verification + password reset).

**O que é:** API moderna de email transacional. Free tier: 3.000 emails/mês,
suficiente pra qualquer projeto pequeno.

**Por que não SMTP genérico?** Porque enviar email funcionando é difícil:
SPF, DKIM, DMARC, reputação de IP, anti-spam. Resend resolve tudo —
você só configura 3 records DNS no Cloudflare e pode mandar email
de `@remix-songs.com` que cai na inbox.

### Caddy

**O problema que resolve:** servir HTTPS + roteamento para o Next.js.

**O que é:** reverse proxy escrito em Go que automaticamente obtém e
renova certificados TLS via Let's Encrypt. Configuração mínima:

```
remix-songs.com {
  reverse_proxy next:3000
}
```

E pronto. Caddy:
1. Escuta nas portas 80 e 443
2. Quando alguém acessa `https://remix-songs.com`, ele já tem cert válido
3. Encaminha a request pro container `next` na porta 3000

**Por que não nginx?** Nginx é mais popular, mas pra TLS automático você
precisa de Certbot + cron + configuração extra. Caddy faz tudo built-in
com 3 linhas de config.

### Cloudflare (DNS)

**O que é:** quem responde "qual é o IP de `remix-songs.com`?"

Hoje aponta pro Vercel. Vamos repointar pra VPS via um **A record**
(domínio → IP IPv4). Cloudflare também pode atuar como proxy/CDN
(modo "laranja"), mas no cutover deixamos em "cinza" (DNS-only) para
o Caddy emitir cert TLS sem interferência.

### Stripe (não muda)

Continua igual. Único ajuste: criar um **novo webhook endpoint** no
dashboard Stripe apontando para `https://remix-songs.com/api/webhooks/stripe`
e copiar o novo `STRIPE_WEBHOOK_SECRET`. O webhook antigo (Vercel) fica
desativado depois do cutover.

---

## Como o deploy funciona (visão geral)

### Em dev (você fazendo código local)

```
┌─────────────────────┐         ┌──────────────────────┐
│  Next.js (bun dev)  │ ←─────→ │  Postgres (Docker)   │
│  localhost:3000     │  5433   │  localhost:5433      │
└─────────────────────┘         └──────────────────────┘
       ↓ envia email
┌─────────────────────┐
│   Resend API        │
└─────────────────────┘
```

Você roda `bun dev` direto na máquina, Postgres roda em container.
Drizzle migrations aplicadas via `bunx drizzle-kit migrate`.

### Em produção (na VPS)

```
                  Internet
                     ↓
              porta 80/443
                     ↓
        ┌─────────────────────┐
        │       Caddy         │  ← certificados TLS
        │   (reverse proxy)   │
        └─────────────────────┘
                     ↓
              rede interna (Docker)
                     ↓
        ┌─────────────────────┐         ┌───────────────────┐
        │      Next.js        │ ←─────→ │     Postgres      │
        │     :3000           │  :5432  │     :5432         │
        └─────────────────────┘         └───────────────────┘
              ↓ webhook        ↓ envia email
        ┌─────────────┐    ┌─────────────┐
        │   Stripe    │    │   Resend    │
        └─────────────┘    └─────────────┘
```

### Como faço deploy de uma nova versão?

Esse é o ponto onde uma VPS difere de um PaaS: **não tem `git push` mágico.**
O fluxo é:

1. Você faz commit + push pro GitHub
2. SSH na VPS: `ssh user@vps-ip`
3. `cd /opt/remix-songs && git pull`
4. `docker compose -f docker-compose.prod.yml build next`
5. `docker compose -f docker-compose.prod.yml up -d next`

Daria pra automatizar isso com GitHub Actions + SSH (deploy on push). Mas
isso é Fase futura — começamos manual pra entender o que acontece.

---

## Trade-offs assumidos

Lista honesta do que estamos abrindo mão ao não usar PaaS:

| Convenência perdida          | Como compensamos                          |
| ---------------------------- | ----------------------------------------- |
| `git push` deploya automático | Manual via SSH (por enquanto)            |
| Backups automáticos do DB    | Cron `pg_dump` + sync Google Drive (Fase 9) |
| Restore point-in-time        | Só temos snapshots diários (perda de até 24h em pior caso) |
| Auto-scaling                 | Não temos. Tráfego além de ~50 req/s = problema |
| Multi-AZ / failover          | Não temos. VPS é uma máquina só          |
| Edge functions / CDN global  | Não temos. Latência maior para usuários longe do Brasil |
| Time de SRE de plantão       | **Você é o oncall**                       |
| Logs centralizados           | `docker compose logs` (manual)            |
| Métricas built-in            | Adicionar depois (Grafana + Prometheus opcional) |

Se você decidir que algum desses custos é alto demais, é sempre possível
voltar pra Railway/Render/Fly — o código com better-auth + Drizzle é
portátil.

---

## Plano de rollback

Cenário: depois do cutover, algo dá errado e o app está degradado ou
fora do ar. O que fazer.

### Decisão: rollback ou corrigir no lugar?

- **Bug no código novo, sem perda de dados:** corrige no lugar (push fix,
  rebuild container).
- **Postgres da VPS corrompido / dados perdidos / VPS caída por dias:**
  rollback pro Supabase.
- **Bug crítico de auth (users não conseguem logar):** rollback se a
  correção demorar > 30 min.

### Como rollback funciona (primeiras 48h)

Durante as primeiras 48h pós-cutover, **mantemos Supabase e Vercel intactos.**
A volta é:

1. **Cloudflare DNS:** voltar o A record de `remix-songs.com` pro IP do
   Vercel (era esse antes — anotar antes de mudar).
2. **Stripe:** reativar o webhook endpoint antigo (Vercel) e desativar
   o novo (VPS).
3. **Sincronizar dados:** se houve writes no Postgres da VPS durante o
   período, exportar via `pg_dump` e importar no Supabase. Mais
   complicado se forem muitos writes — por isso queremos detectar
   problemas rápido.
4. **Comunicar usuários** se houve impacto perceptível.

### Após 48-72h sem problemas

- Desligar webhook Stripe antigo definitivamente
- Pausar/deletar projeto Vercel
- Considerar desligar projeto Supabase (mas manter dump completo arquivado por meses)

---

## Glossário rápido

- **Container** — processo isolado rodando uma imagem Docker. Tem seu
  próprio sistema de arquivos, rede e processos, mas compartilha o
  kernel do host.
- **Imagem** — pacote read-only com código + deps + runtime. "Molde" do
  container.
- **Volume** — pasta persistente que sobrevive recreação de container.
  Onde mora dado de banco.
- **Reverse proxy** — servidor que recebe requests externas e encaminha
  pra outros servidores internos. Permite múltiplos apps atrás de um
  único IP/porta + centraliza TLS.
- **TLS / SSL / HTTPS** — criptografia da conexão entre browser e
  servidor. Requer um **certificado** assinado por uma CA (autoridade
  certificadora). Let's Encrypt assina de graça.
- **Let's Encrypt** — CA gratuita. Certificados válidos por 90 dias,
  renovação automática.
- **DNS A record** — mapeamento "nome → IP". Ex.: `remix-songs.com → 1.2.3.4`.
- **TTL (DNS)** — tempo que um resolver pode cachear a resposta DNS.
  TTL baixo (5 min) facilita mudanças; TTL alto (24h) reduz queries mas
  atrasa cutover.
- **SPF / DKIM / DMARC** — registros DNS que provam ao Gmail/Outlook que
  você está autorizado a enviar email do seu domínio. Sem eles, email
  vai pra spam.
- **Migration (DB)** — arquivo SQL versionado que altera o schema do
  banco. Roda em ordem, uma vez cada.
- **ORM** — Object-Relational Mapping. Traduz objetos do código para
  linhas no banco. Drizzle, Prisma, TypeORM.
- **systemd** — gerenciador de serviços do Linux. Faz daemons iniciarem
  no boot, reiniciarem se crashearem, e centraliza logs. O `stream-recorder`
  usa.
- **Cron** — agendador de tarefas do Linux. `0 3 * * *` = "todo dia às 3am".
- **firewalld** — firewall do Fedora. Controla portas abertas.
- **SSH key** — par de chaves pública/privada para login sem senha.
  Mais seguro que senha; nunca compartilhe a privada.

---

## Para aprofundar

Material recomendado para entender melhor cada peça:

- **Docker:** [docker.com/get-started](https://www.docker.com/101-tutorial/)
- **Docker Compose:** [docs.docker.com/compose](https://docs.docker.com/compose/)
- **Postgres:** [postgresql.org/docs/current/tutorial.html](https://www.postgresql.org/docs/current/tutorial.html)
- **Drizzle:** [orm.drizzle.team](https://orm.drizzle.team/docs/overview)
- **better-auth:** [better-auth.com/docs](https://www.better-auth.com/docs)
- **Caddy:** [caddyserver.com/docs/quick-starts/reverse-proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy)
- **Resend:** [resend.com/docs](https://resend.com/docs)
- **Self-hosting filosofia:** [SRE Book — Google](https://sre.google/books/) (capítulos sobre toil, monitoring, postmortems)

---

## Status atual da migração

(Atualizar conforme as fases são completadas.)

- [x] Fase 0 — Documentação (este arquivo)
- [x] Fase 1 — Ambiente local (Docker dev + deps)
- [x] Fase 2 — Schema Drizzle + migration inicial
- [ ] Fase 3 — better-auth + Resend
- [x] Fase 4 — Refatorar call-sites do Supabase
- [x] Fase 5 — Script de import dos dados de produção (4 users migrados, login com senha real validado)
- [x] Fase 6 — Dockerfile + docker-compose.prod + Caddyfile (validado local: build, migrate, Caddy→Next→Postgres, signup)
- [ ] Fase 7 — Provisionar a VPS
- [ ] Fase 8 — Cutover DNS + Stripe
- [ ] Fase 9 — Backup pg_dump + sync Google Drive + teste de restore
- [ ] Fase 10 — Monitoring (`/api/healthz` + healthcheck.io) + rollback docs + SSH hardening
