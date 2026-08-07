# Leadgyűjtő

Magyar nyelvű, egyszemélyes leadgyűjtő webalkalmazás Google Places API (New), Supabase PostgreSQL/Auth/RLS, Next.js App Router és külön háttérworker alapon.

Az alkalmazás nem CRM: nincs leadstátusz, utánkövetés, üzenetküldés vagy csapatkezelés. A cél vállalkozások gyűjtése, e-mail-címek keresése a vállalkozások saját nyilvános weboldalain, központi szerkeszthető adatbázis, listák/mappák, import és export.

## Stack

- Node.js 22 vagy újabb
- pnpm
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL és Row Level Security
- Google Places API (New), szerveroldali Field Maskkal
- Külön Node worker hosszabb keresésekhez és crawler feladatokhoz
- TanStack Table
- Zod validáció
- CSV és valódi XLSX export/import

## Helyi indítás

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Külön terminálban:

```bash
pnpm worker
```

Minőségellenőrzés:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Supabase beállítás

1. Hozz létre egy Supabase projektet.
2. Futtasd a `supabase/migrations/202608060001_initial_schema.sql` migrációt.
3. Supabase Auth alatt engedélyezd az e-mail/jelszó belépést.
4. Kapcsold ki a nyilvános regisztrációt.
5. Hozd létre kézzel az egyetlen felhasználót.
6. A `.env.local` fájlban állítsd be:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_USER_EMAIL`

Az RLS minden felhasználói táblán aktív. A service-role kulcs csak szerveroldalon és a workerben használható.

## Google Cloud és Places API

1. Hozz létre Google Cloud projektet.
2. Engedélyezd a Places API (New) szolgáltatást.
3. Hozz létre API-kulcsot.
4. Korlátozd a kulcsot a szükséges API-ra, és éles környezetben a futtatási környezethez illő módon.
5. Állítsd be a `.env.local` fájlban:
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_MONTHLY_REQUEST_LIMIT`, alapértelmezés: `900`

A kód a Text Search és Place Details hívásokhoz költségtakarékos Field Maskot használ. Minden Google-hívás előtt az adatbázisban atomi kvótafoglalás történik, ezért párhuzamos workerek sem léphetik túl az alkalmazásszintű havi limitet.

## Környezeti változók

Lásd: `.env.example`.

Titkok nem jelennek meg a Beállítások oldalon. A Google API-kulcs, Supabase service-role kulcs és jelszavak nem kerülhetnek kliensoldali JavaScriptbe, naplóba vagy Gitbe.

## Web és worker

A webes felület kezeli:

- belépés;
- új keresés indítása;
- vállalkozások táblázata;
- vállalkozás-adatlap;
- mappák/listák/mentett nézetek;
- keresési előzmények;
- API-használat;
- import;
- export;
- lomtár.

A worker kezeli:

- keresési tervfeladatok bontása;
- Google Places Text Search futtatása;
- Place ID alapú deduplikáció;
- weboldal szerinti és földrajzi szűrés;
- e-mail-crawler;
- Google-adatok frissítése;
- retry és technikai állapotok.

## Render telepítés

A `render.yaml` egyetlen Render Web Service-t indít `leadgyujto` néven. A szolgáltatás a `pnpm start:render` paranccsal közös életciklusban futtatja a Next.js webalkalmazást és a workert.

Ez az első teszttelepítéshez `free` csomagra van állítva. Free Web Service esetén Render inaktivitás után elaltatja a szolgáltatást; ilyenkor a worker is megáll, és csak akkor indul újra, amikor a web service felébred. Folyamatos háttérfeldolgozáshoz később fizetős web service-re kell váltani, vagy külön workert kell fenntartani.

A supervisor folyamat mindkét gyerekfolyamatot figyeli. Ha akár a Next.js webalkalmazás, akár a worker végzetesen leáll, a másik folyamatot is leállítja, majd a Render service kilép, hogy a platform újraindíthassa.

Lépések:

1. Töltsd fel a repositoryt GitHubra.
2. Renderben válaszd a Blueprint deployt.
3. Add meg az összes környezeti változót.
4. Deploy után állítsd be az `APP_PUBLIC_BASE_URL` és `NEXT_PUBLIC_APP_URL` éles URL-t.

Ne telepíts élesbe, amíg a Supabase migráció és az Auth felhasználó nincs kész.

## Import és export

Import:

- CSV és XLSX;
- fejléc felismerés;
- oszlop-hozzárendelési javaslat;
- előnézet;
- sorvalidáció.

Export:

- teljes vagy szűrt adatbázis;
- kijelölt sorok;
- kiválasztott oszlopok;
- UTF-8 BOM-os CSV;
- valódi XLSX munkafüzet.

A Google-ből származó, lejárt cache-idejű mezőket az export nem írja ki vakon. A Place ID tartósan tárolható azonosítóként megmarad.

## Crawler biztonság

A weboldal-feldolgozó:

- csak HTTP/HTTPS URL-t fogad;
- tiltja a localhost, privát, link-local és belső hálózati IP-címeket;
- DNS-feloldás után is ellenőriz;
- átirányítás után újraellenőriz;
- válaszméret-, idő- és átirányítási korlátot használ;
- legfeljebb 10 HTML oldalt néz vállalkozásonként;
- nem próbál belépési falat, CAPTCHA-t vagy védelmet megkerülni.

## Tipikus hibák

- `Bejelentkezés szükséges`: nincs Supabase session, lépj be.
- `Ez az e-mail-cím nincs engedélyezve`: az e-mail nem egyezik az `ALLOWED_USER_EMAIL` értékkel.
- `Elérted a beállított havi Google Places API-korlátot`: emeld a `GOOGLE_MONTHLY_REQUEST_LIMIT` értékét, vagy várd meg a következő hónapot.
- `A főoldal nem HTML-tartalom`: a weboldal nem feldolgozható HTML-ként.
- `DNS-hiba`: a crawler nem tudta biztonságosan feloldani a domaint.

## Adatbázismentés

Supabase-ben használj rendszeres projekt backupot vagy `pg_dump` alapú mentést. Éles használat előtt állíts be visszaállítási próbát is.
