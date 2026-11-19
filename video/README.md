# Evankelioimisvideo

Noin 1 min 45 s mittainen suomenkielinen animaatiovideo, joka kertoo evankeliumin
ytimen ihmiselle, jolle aihe on uusi: kaipaus → Jumala loi sinut → synti erottaa →
Jeesus ja risti → ylösnousemus → pelastus on lahja → kutsu ja rukous.

| Tiedosto | Käyttö |
|---|---|
| `evankeliumi_16x9.mp4` | 1920×1080, nettisivut, YouTube, esitykset |
| `evankeliumi_9x16.mp4` | 1080×1920, Instagram/TikTok/YouTube Shorts, puhelimet |
| `evankeliumi_poster.jpg` | esikatselukuva (esim. `<video poster>`) |

Raamatunjakeet ovat Kirkkoraamatusta 1933/38 (tekijänoikeusvapaa). Taustamusiikki on
syntetisoitu itse (`music.py`), joten videota saa käyttää ja jakaa vapaasti.

## Upotus nettisivulle

```html
<video controls playsinline preload="metadata" poster="video/evankeliumi_poster.jpg"
       style="width:100%;max-width:960px;aspect-ratio:16/9">
  <source src="video/evankeliumi_16x9.mp4" type="video/mp4">
</video>
```

## Muokkaaminen

Kaikki tekstit, ajoitukset, värit ja soinnut ovat tiedostossa `timeline.py`.
Tekstityylit (fontit, koot) ovat `render.py`:n `STYLES`-sanakirjassa.

Tarvitaan Python 3, `numpy`, `Pillow` ja `ffmpeg` (libx264).

```sh
cd video
python3 music.py music.wav                                    # musiikki (~10 s)
python3 render.py --format 16x9 --stills 10,37.5,49 --stills-dir esikatselu   # yksittäiskuvat
python3 render.py --format 16x9 --audio music.wav --out evankeliumi_16x9.mp4  # ~7 min / 4 ydintä
python3 render.py --format 9x16 --audio music.wav --out evankeliumi_9x16.mp4
```

Jos lisäät loppuun esim. seurakunnan nimen tai nettiosoitteen, lisää rivi viimeiseen
`TEXTS`-kohtaan tyylillä `"sub"`.
