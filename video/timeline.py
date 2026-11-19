"""Evankelioimisvideon käsikirjoitus, ajoitus ja visuaalinen kulku.

Kaikki ajat ovat sekunteja videon alusta. Muokkaa tekstejä ja aikoja täällä,
ja aja sitten render.py uudelleen (ks. README.md).

Raamatunjakeet: Kirkkoraamattu 1933/38 (tekijänoikeusvapaa).
"""

DURATION = 105.0
FPS = 30

# ---------------------------------------------------------------------------
# Tekstit
#
# t0      = hetki, jolloin ensimmäinen sana alkaa tulla näkyviin
# t1      = hetki, jolloin koko teksti on häipynyt pois
# y       = tekstilohkon keskikohta suhteessa kuvan korkeuteen (0 = ylä, 1 = ala)
# stagger = viive sanojen välillä (s), oletus 0.075
# lines   = (teksti, tyyli, viive t0:sta sekunteina)
#
# Tyylit on määritelty render.py:n STYLES-sanakirjassa.
# ---------------------------------------------------------------------------
TEXTS = [
    # 1. Kaipaus
    dict(t0=0.8, t1=4.3, lines=[
        ("Jokainen meistä kaipaa jotain.", "statement", 0.0),
    ]),
    dict(t0=4.6, t1=8.6, stagger=0.7, lines=[
        ("Rauhaa. Merkitystä. Rakkautta.", "statement", 0.0),
    ]),

    # 2. Luotu rakkaudesta
    dict(t0=9.0, t1=12.4, lines=[
        ("Se kaipaus ei ole sattumaa.", "statement", 0.0),
    ]),
    dict(t0=12.6, t1=17.0, lines=[
        ("Jumala loi sinut.", "statement", 0.0),
        ("Ja hän rakastaa sinua.", "statement", 1.3),
    ]),

    # 3. Jokin on rikki
    dict(t0=17.6, t1=20.8, lines=[
        ("Mutta jokin on rikki.", "statement", 0.0),
    ]),
    dict(t0=21.0, t1=25.4, lines=[
        ("Me kaikki olemme valinneet oman tiemme", "statement", 0.0),
        ("Jumalan sijaan.", "statement", 0.9),
    ]),
    dict(t0=25.7, t1=31.6, lines=[
        ("Kaikki ovat syntiä tehneet ja ovat Jumalan kirkkautta vailla.", "verse", 0.0),
        ("ROOM. 3:23", "ref", 1.6),
    ]),

    # 4. Jeesus ja risti
    dict(t0=32.2, t1=35.6, lines=[
        ("Siksi Jumala tuli itse luoksemme.", "statement", 0.0),
    ]),
    dict(t0=35.9, t1=39.8, lines=[
        ("JEESUS", "emph", 0.0),
    ]),
    dict(t0=40.4, t1=44.3, y=0.70, lines=[
        ("Hän kuoli ristillä", "statement", 0.0),
        ("sinun puolestasi.", "statement", 0.9),
    ]),
    dict(t0=44.6, t1=51.6, y=0.70, lines=[
        ("Mutta Jumala osoittaa rakkautensa meitä kohtaan siinä, että Kristus "
         "kuoli meidän edestämme, kun me vielä olimme syntisiä.", "verse", 0.0),
        ("ROOM. 5:8", "ref", 2.2),
    ]),

    # 5. Ylösnousemus
    dict(t0=52.6, t1=56.2, y=0.40, lines=[
        ("Mutta hauta jäi tyhjäksi.", "statement", 0.0),
    ]),
    dict(t0=56.4, t1=61.4, y=0.40, lines=[
        ("Hän nousi kuolleista.", "statement", 0.0),
        ("Kuolema ei saanut viimeistä sanaa.", "statement", 1.2),
    ]),

    # 6. Lahja
    dict(t0=62.0, t1=65.2, lines=[
        ("Pelastus on lahja.", "statement", 0.0),
    ]),
    dict(t0=65.5, t1=74.8, lines=[
        ("Sillä niin on Jumala maailmaa rakastanut, että hän antoi ainokaisen "
         "Poikansa, ettei yksikään, joka häneen uskoo, hukkuisi, vaan hänellä "
         "olisi iankaikkinen elämä.", "verse", 0.0),
        ("JOH. 3:16", "ref", 2.6),
    ]),

    # 7. Kutsu
    dict(t0=75.4, t1=79.4, lines=[
        ("Voit kääntyä hänen puoleensa", "statement", 0.0),
        ("juuri nyt.", "statement", 0.8),
    ]),
    dict(t0=79.8, t1=88.6, lines=[
        ("VOIT RUKOILLA VAIKKA NÄIN", "label", 0.0),
        ("Jeesus, kiitos että rakastat minua.", "prayer", 0.6),
        ("Anna anteeksi syntini.", "prayer", 2.7),
        ("Tule elämääni ja johda minua.", "prayer", 4.5),
    ]),
    dict(t0=89.0, t1=95.6, lines=[
        ("Tulkaa minun tyköni, kaikki työtätekevät ja raskautetut, "
         "niin minä annan teille levon.", "verse", 0.0),
        ("MATT. 11:28", "ref", 1.8),
    ]),

    # 8. Loppu
    dict(t0=96.2, t1=104.6, lines=[
        ("Jumala rakastaa sinua.", "end", 0.0),
        ("Lue Raamattua  ·  Rukoile  ·  Etsi seurakunta läheltäsi", "sub", 2.0),
    ]),
]

# ---------------------------------------------------------------------------
# Visuaalinen kulku: avainkehykset (aika, arvo), pehmeä siirtymä välissä.
# Värit 0-255 RGB. Paikat ja koot suhteessa kuvaan.
# ---------------------------------------------------------------------------
TRACKS = {
    # koko kuvan häivytys mustasta ja mustaan
    "fade": [(0.0, 0.0), (1.6, 1.0), (103.6, 1.0), (105.0, 0.0)],

    # taustan liukuväri ylhäältä alas
    "bg_top": [(0, (5, 7, 14)), (8.6, (5, 7, 14)), (12, (10, 9, 18)), (17, (10, 9, 18)),
               (19, (4, 6, 12)), (31, (4, 6, 12)), (36, (8, 8, 16)), (52, (10, 10, 20)),
               (55, (20, 24, 52)), (61, (22, 24, 50)), (66, (16, 16, 32)),
               (75, (12, 11, 22)), (93, (12, 11, 22)), (96, (14, 12, 24))],
    "bg_bot": [(0, (10, 12, 24)), (8.6, (10, 12, 24)), (12, (30, 20, 26)), (17, (30, 20, 26)),
               (19, (9, 11, 20)), (31, (9, 11, 20)), (36, (22, 17, 22)), (52, (28, 20, 26)),
               (55, (110, 60, 46)), (61, (92, 54, 46)), (66, (50, 34, 38)),
               (75, (38, 26, 30)), (93, (38, 26, 30)), (96, (44, 30, 32))],

    # keskellä hehkuva valo
    "glow_i": [(0, 0.0), (8.6, 0.0), (11.5, 0.5), (16.5, 0.64), (18.0, 0.32), (24, 0.12),
               (31, 0.0), (33, 0.0), (36.2, 0.45), (41, 0.5), (52, 0.5), (55, 0.3),
               (62, 0.35), (75, 0.28), (93, 0.25), (97, 0.55)],
    "glow_r": [(0, 0.05), (8.6, 0.08), (11.5, 0.32), (16.5, 0.42), (18.0, 0.28), (24, 0.18),
               (31, 0.12), (33, 0.12), (36.2, 0.30), (52, 0.30), (55, 0.5), (62, 0.45),
               (93, 0.40), (97, 0.45)],
    "glow_y": [(0, 0.5), (38.8, 0.5), (41.0, 0.36), (52, 0.36), (58, 0.5), (93, 0.5), (97, 0.48)],
    "flicker": [(0, 0.0), (17.0, 0.0), (18.0, 1.0), (30.0, 1.0), (31.5, 0.0)],

    # valon säde ylhäältä (pystysuora) ja vaakasuora: yhdessä risti
    "beam_v": [(0, 0.0), (32.0, 0.0), (35.0, 1.0)],
    "beam_h": [(0, 0.0), (39.4, 0.0), (41.6, 1.0)],
    "beam_i": [(0, 0.0), (32.0, 0.0), (32.4, 0.85), (51.8, 0.85), (54.2, 0.0)],

    # ylösnousemuksen aamunkoitto alhaalta
    "sun_i": [(0, 0.0), (52.0, 0.0), (56.0, 0.82), (61.0, 0.6), (66.0, 0.0)],
    "sun_y": [(0, 1.35), (52.0, 1.35), (56.0, 1.12), (61.0, 1.07), (66.0, 1.15)],

    # valopartikkelit
    "part_i": [(0, 0.0), (1.5, 0.35), (8.6, 0.35), (12, 0.6), (17, 0.6), (19, 0.25),
               (31, 0.2), (36, 0.45), (52, 0.5), (54, 1.0), (61, 0.9), (66, 0.55),
               (93, 0.5), (97, 0.7)],
    # nousunopeus (kuvan korkeuksina sekunnissa; negatiivinen = putoaa)
    "part_rise": [(0, 0.006), (17, 0.006), (18.5, -0.010), (31, -0.010), (33, 0.004),
                  (52, 0.004), (53.5, 0.055), (60, 0.035), (64, 0.010)],
    # 0 = kylmä sinertävä, 1 = lämmin kultainen
    "warmth": [(0, 0.2), (8.6, 0.2), (12, 0.8), (17, 0.8), (18.5, 0.1), (31, 0.1),
               (34, 0.7), (52, 0.8), (54, 1.0), (62, 0.9)],
}

# ---------------------------------------------------------------------------
# Musiikki: soinnut (alkuaika, sointu). Ks. music.py.
# ---------------------------------------------------------------------------
CHORDS = [
    (0.0, "Bm"), (4.3, "G"),                                   # kaipaus
    (8.6, "D"), (12.6, "A"),                                   # luotu
    (17.0, "Bm"), (21.0, "Em"), (25.7, "G"), (28.6, "F#m"),    # rikki
    (31.6, "G"), (35.8, "D"), (40.0, "Em"), (44.4, "Bm"),      # Jeesus
    (48.2, "G"), (50.4, "Asus"),
    (52.4, "D"), (56.3, "A/C#"), (59.0, "Bm"),                 # ylösnousemus
    (61.6, "G"), (65.4, "D"), (70.0, "A"),                     # lahja
    (75.2, "Bm"), (79.6, "G"), (84.2, "D"), (88.8, "A"),       # kutsu
    (95.6, "G"), (99.0, "Asus"), (101.0, "D"),                 # loppu
]

MUSIC = {
    # yleinen voimakkuus
    "level": [(0, 0.65), (8.6, 0.8), (17, 0.62), (31, 0.62), (36, 0.8), (50, 0.85),
              (52.4, 1.0), (61, 0.95), (66, 0.82), (75, 0.72), (93, 0.72), (96, 0.88),
              (102.5, 0.88), (105.5, 0.0)],
    # sävyn kirkkaus (yläsävelten määrä)
    "bright": [(0, 0.2), (8.6, 0.5), (17, 0.1), (31, 0.15), (36, 0.5), (52.4, 1.0),
               (61, 0.8), (66, 0.55), (96, 0.7)],
    # arpeggio-soittimen voimakkuus
    "arp": [(0, 0.0), (8.6, 0.0), (9.5, 0.45), (16.5, 0.45), (17.5, 0.0), (35.8, 0.0),
            (36.5, 0.5), (50, 0.5), (52.4, 0.9), (61, 0.85), (66, 0.6), (75, 0.45),
            (93, 0.45), (96, 0.6), (101, 0.6), (102, 0.0)],
    # korkea "kimallus"
    "shimmer": [(0, 0.0), (51.5, 0.0), (53, 1.0), (61, 0.8), (64, 0.0), (95.6, 0.0),
                (98, 0.7), (103, 0.7)],
}
