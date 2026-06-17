# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.15.1 create --template minimal --types ts --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## API publica de metadatos

- `GET /api/obras`: devuelve el catalogo completo de metadatos de obras.
- `GET /api/obras/{id-o-slug}`: devuelve los metadatos de una obra por identificador interno o slug publico.

Estos endpoints exponen solo campos de catalogo serializados por lista blanca: `title` como titulo crudo de base, `displayTitle` como titulo transformado con el mismo proceso de la web, variantes, genero, procedencia, estado, fecha de adicion, `resultado1` como frase publica de resultado, atribuciones y enlaces de recursos. No devuelven textos integros ni resumenes automaticos.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
