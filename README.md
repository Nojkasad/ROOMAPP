# Namų ruošos darbų sekimo sistema su QR kodais

Kursinio darbo projektas. Projektavimo dokumentas: [1-etapo-projektavimo-dokumentas.md](1-etapo-projektavimo-dokumentas.md).

## Paleidimas (kūrimo aplinka)

**Reikia:** Node.js ≥ 22.18 (rekomenduojama 22 LTS arba 24), Docker Desktop.

Duomenų bazė („Docker“ konteineryje) pasiekiama per prievadą **5433**, kad nesikirstų su kompiuteryje įdiegtu PostgreSQL (5432).

```bash
docker compose up -d
```

```bash
npm install
```

Nukopijuoti `server/.env.example` į `server/.env` (numatytos reikšmės tinka vietinei aplinkai).

Sukurti duomenų bazės lenteles (pritaikomos migracijos iš `server/prisma/migrations`):

```bash
npm run db:migrate
```

Įkelti demonstracinius duomenis (galima kartoti — perrašomi tik demo duomenys):

```bash
npm run db:seed
```

| Demo duomenys | Reikšmė |
|---|---|
| Naudotojai | `tomas` (savininkas), `ieva` (narė), slaptažodis `demo1234` |
| Namų ūkis | „Demo namai“, pakvietimo kodas `DEMO2026` |
| Stotelės | `/s/demo-skalbykle` (Įkrauta → Skalbia → Iškrauta), `/s/demo-indaplove` (Nešvarūs → Plauna → Švarūs → Iškrauti) |

Kiti duomenų bazės veiksmai: `npm run db:studio` (lentelių peržiūra naršyklėje), `npm run db:reset` (ištrina viską, iš naujo pritaiko migracijas ir įkelia demo duomenis).

Paleisti dviejuose terminaluose:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Atidaryti <http://localhost:5173> — turi būti matyti „API: ok“. API sveikatos patikra: <http://localhost:3000/api/health>.

> Pilnos paleidimo, testavimo ir demonstravimo instrukcijos bus papildytos II etapo pabaigoje.

## Darbo eiga (šakos)

```
feature/...  →  dev  →  main
 (užduotis)   (testavimas)  (stabili versija)
```

| Šaka | Paskirtis |
|---|---|
| `main` | Tik stabilios, veikiančios versijos. Ši šaka pateikiama atsiskaitymui. |
| `dev` | Baigtos funkcijos sujungiamos ir testuojamos kartu. |
| `feature/<pavadinimas>` | Viena užduotis, pvz., `feature/state-engine`. Kuriama iš `dev`, po sujungimo ištrinama. |

**Nauja užduotis:**

```bash
git checkout dev
git pull
git checkout -b feature/state-engine
# ... darbas, commit ...
git push -u origin feature/state-engine
```

Tada „GitHub“ sukuriamas pull request į `dev`. Automatiniai testai (`.github/workflows/ci.yml`) paleidžiami kiekvienam pull request; sujungiama tik jiems praėjus.

**Išleidimas:** kai `dev` stabili (pvz., prieš atsiskaitymą), sukuriamas pull request `dev → main`, o sujungus pažymima versija:

```bash
git checkout main
git pull
git tag v0.2-etapas2
git push origin v0.2-etapas2
```
