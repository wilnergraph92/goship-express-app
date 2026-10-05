#!/usr/bin/env python3
"""Vérifie les longueurs imposées par Google Play aux textes de boutique/play/fiche.md :
nom ≤ 30, description courte ≤ 80, description complète ≤ 4 000, notes de version ≤ 500.
Google compte les caractères (pas les octets). Sort en erreur si un texte dépasse."""
import re
import sys
from pathlib import Path

LIMITES = [('nom', 30), ('courte', 80), ('compl', 4000), ('notes', 500)]
fiche = Path(__file__).resolve().parent.parent / 'play' / 'fiche.md'
texte = fiche.read_text(encoding='utf-8')
erreurs = 0
langue = '?'
# Chaque bloc ``` suit un titre ### ; l'ordre des titres d'une langue est toujours le même
for m in re.finditer(r'^## ([^\n]+)$|^### ([^\n]+)\n```\n(.*?)\n```', texte, re.S | re.M):
    if m.group(1):
        langue = m.group(1)
        rang = 0
        continue
    cle, limite = LIMITES[rang]
    rang += 1
    n = len(m.group(3))
    etat = 'OK ' if n <= limite else 'TROP'
    erreurs += n > limite
    print(f'{etat} {langue[:22]:22} {m.group(2)[:32]:32} {n:5} / {limite}')
sys.exit(1 if erreurs else 0)
