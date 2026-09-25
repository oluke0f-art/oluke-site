# OLUKE — site por pastas

## Como adicionar um produto

1. Abra `catalog/`.
2. Entre na categoria desejada, por exemplo `catalog/Gadgets/`.
3. Crie uma pasta para o produto, por exemplo:
   `catalog/Gadgets/Fone-Bluetooth/`
4. Dentro dela, crie `produto.json`:
```json
{
  "nome": "Fone Bluetooth",
  "valor": 129.9,
  "link": "https://exemplo.com/produto",
  "categoria": "Gadgets",
  "destaque": true,
  "ativo": true
}
```
5. Coloque as fotos e vídeos na mesma pasta:
```text
1.jpg
2.png
3.webp
4.avif
5.mp4
6.webm
```
6. Rode `npm run build`.
7. Atualize/recarregue o site.

### Ordem das mídias

A ordem é definida **pelo nome do arquivo**, com ordenação natural:
`1.jpg`, `2.jpg`, `3.mp4`, `10.webp`.

Você pode misturar fotos e vídeos. A primeira foto encontrada vira a capa do card. Se houver mais de uma mídia, o site mostra o botão para abrir a galeria.

### Formatos aceitos

**Fotos:** JPG/JPEG, PNG, GIF, WEBP, AVIF, BMP, SVG, JFIF, TIFF e HEIC/HEIF (a exibição de HEIC/HEIF depende do navegador).

**Vídeos:** MP4, WEBM, MOV, M4V, OGV, AVI e MKV (a reprodução depende do navegador; MP4/H.264 costuma ter a melhor compatibilidade).

### Por que agora funciona

O produto de exemplo já está em uma pasta normal e `ativo: true`. O `build.js` não depende de uma lista manual de produtos: ele varre as pastas e cria `data/catalog.json`.

> Importante: depois de adicionar/alterar produto ou mídia, rode `npm run build`. O navegador não lê automaticamente as novas pastas até que o catálogo seja reconstruído.

## Criar categoria

Crie uma nova pasta dentro de `catalog/`:
`catalog/Eletronicos/`

Depois coloque as pastas dos produtos dentro dela e rode `npm run build`.

## Excluir produto

Apague a pasta do produto e rode `npm run build`.

## Desativar sem apagar

No `produto.json`:
```json
"ativo": false
```
Depois rode `npm run build`.

## Testar no computador

Na pasta do projeto:
```bash
npm run build
npm run serve
```
Abra `http://localhost:8080`.

Não abra `index.html` com duplo clique, porque o site carrega `site.json` e `data/catalog.json` via `fetch()`.

## Estrutura

```text
catalog/
  Gadgets/
    produto-exemplo/
      produto.json
      1.jpg
      2.webp
      3.mp4
  Jogos/
```

O site é estático. Não existe painel de edição no site; você edita os arquivos/pastas e reconstrói o catálogo.


## Foto da categoria

Cada pasta de categoria pode ter sua própria capa, assim como os produtos.

Exemplo:

```text
catalog/
└── Celulares/
    ├── categoria.json
    ├── capa.jpg
    ├── iphone-15/
    │   └── produto.json
    └── galaxy-s24/
        └── produto.json
```

No `categoria.json` você pode definir o nome e escolher exatamente qual foto será usada no card:

```json
{
  "nome": "Celulares",
  "imagem": "capa.jpg",
  "ativo": true
}
```

Se o campo `imagem` não for informado, o build usa a primeira imagem encontrada diretamente na pasta da categoria. A imagem da categoria deve ficar **na pasta da categoria**, e não dentro da pasta de um produto.

Depois de adicionar ou trocar a foto, rode novamente:

```bash
npm run build
```

## Redes sociais no botão “Inscrever-se”

O botão **Inscrever-se** do canto superior abre um cartão com sua foto e suas redes. As redes são configuradas em `site.json`, no campo `socials`.

Exemplo:

```json
"socialName": "OLUKE",
"socialPhoto": "assets/oluke.jpg",
"socials": [
  {
    "rede": "YouTube",
    "usuario": "@seuusuario",
    "url": "https://youtube.com/@seuusuario",
    "icone": "youtube"
  },
  {
    "rede": "Instagram",
    "usuario": "@seuusuario",
    "url": "https://instagram.com/seuusuario",
    "icone": "instagram"
  },
  {
    "rede": "TikTok",
    "usuario": "@seuusuario",
    "url": "https://tiktok.com/@seuusuario",
    "icone": "tiktok"
  }
]
```

Troque `@seuusuario` e os links pelos seus. Ao clicar no nome de usuário, a rede social abre em uma nova aba. O botão inferior **Inscrever-se no canal** também abre o mesmo cartão.


## Ajustar o tamanho dos cards (todas as telas)

Tudo fica no fim do `style.css`, no bloco **"OLUKE — CATÁLOGO (v7)"**. Não existe mais um layout "de celular" separado: a grade e os tamanhos se ajustam sozinhos a qualquer largura de tela.

- `--card-min` (180px): largura mínima de um card. Menor = mais colunas, maior = cards maiores.
- `--espaco` e `--sombra`: distância entre cards e tamanho da sombra. Já crescem de forma contínua com a tela (`clamp()`), só mude se quiser outro valor.
- A grade **sempre tem pelo menos 2 colunas** (mesmo em celular de 280px) e cresce sozinha: celular = 2, dobrável/tablet = 3 a 4, notebook = 6, tela grande (1920px) = 8.
- Limite de colunas no desktop: `.catalog-section .wrap { max-width: 1800px }`.
- Os textos do card (título, preço, botão) encolhem conforme a **largura do próprio card** (`@container`), então funcionam igual em qualquer número de colunas.
- Em celular deitado (tela baixa) o cabeçalho deixa de ser fixo para não ocupar meia tela.
