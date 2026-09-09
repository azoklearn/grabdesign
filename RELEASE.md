# Lancement public — Grab Design

## 1. Préparer la release Chrome Web Store

1. Dans `site/config.js`, remplacer l’email de support et le lien temporaire du Chrome Web Store.
2. Charger l’extension dans `chrome://extensions` et vérifier la capture sur plusieurs sites.
3. Créer les captures de la fiche Store : popup, élément survolé, résultat collé dans un éditeur.
4. Créer le ZIP depuis la racine du dépôt avec `npm run package` (voir `package.json`). Le ZIP doit contenir `manifest.json` à sa racine.
5. Dans le [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole), créer l’item, uploader le ZIP, puis renseigner `store-listing.md`, les captures, le prix et la distribution.
6. Compléter Privacy Practices exactement selon `store-listing.md` et fournir l’URL publique de `site/privacy.html`.
7. Soumettre à review ; activer la publication différée si vous souhaitez choisir précisément le moment du lancement.

## 2. Mettre la landing page en ligne

Le dossier `site/` est statique : il peut être déployé sur Cloudflare Pages, Vercel, Netlify ou GitHub Pages. Après réception de l’URL Chrome Web Store, la renseigner dans `site/config.js`, puis redéployer.

## 3. À valider avant toute publication

- Nom légal de l’éditeur et email de support.
- Prix final, TVA et politique de remboursement.
- Pays ciblés.
- Captures réelles de l’extension et URL finale de la politique de confidentialité.
- Validation de la fiche Chrome Web Store et soumission par le compte développeur propriétaire.
