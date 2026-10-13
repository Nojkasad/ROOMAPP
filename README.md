# Namų ruošos darbų sekimo sistema su QR kodais

Kursinio darbo projektas. Projektavimo dokumentas: [1-etapo-projektavimo-dokumentas.md](1-etapo-projektavimo-dokumentas.md).

> Paleidimo instrukcijos, reikalingi įrankiai ir demonstravimo žingsniai bus pridėti II etape.

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
