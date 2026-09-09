# Grab Design

Extension Chrome Manifest V3 qui permet de survoler un élément, de cliquer dessus, puis de copier un fragment HTML réutilisable dans le presse-papiers.

## Installer en mode développement

1. Ouvrir `chrome://extensions` dans Chrome.
2. Activer le **Mode développeur**.
3. Cliquer sur **Charger l’extension non empaquetée** et sélectionner ce dossier.
4. Ouvrir une page `http://` ou `https://`, cliquer sur l’icône **Grab Design**, puis sur **Choisir un élément**.
5. Survoler un élément et cliquer : le contenu du presse-papiers est un fragment HTML avec les styles importants placés directement sur les balises. Le coller dans votre projet, un éditeur ou un fichier `.html`.

## Ce qui est exporté

- Le DOM de l’élément sélectionné et de ses descendants.
- Les styles calculés utiles à la mise en page et au rendu de chaque calque, directement dans l’attribut `style` de chaque balise. Les sorties restent compactes et faciles à transmettre à un outil de génération de code.
- Les pseudo-éléments `::before` et `::after` visibles, dans une petite balise `style` uniquement lorsque cela est nécessaire.
- Les valeurs actuelles des champs de formulaire, et le contenu d’un canvas lorsque le navigateur autorise sa lecture.
- Les URL d’images et de polices existantes sont conservées ; la page exportée utilise l’URL d’origine comme base.

## Limites importantes

Un site ne peut pas être récupéré de façon *parfaitement identique* sous forme de code source. Le navigateur expose le rendu calculé, mais pas forcément les fichiers CSS d’origine (souvent bloqués par CORS), les composants du framework, les données, ni les scripts internes. L’export est donc un **instantané statique très fidèle** du rendu au moment du clic ; il n’embarque délibérément pas le JavaScript du site tiers, ni ses appels API, ni ses secrets.

Pour les interfaces avec animations, états au survol, applications connectées ou contenu dynamique, il faut reconstruire les interactions dans le projet cible après avoir collé l’instantané.
