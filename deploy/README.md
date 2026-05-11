# Deploy de datos

Los scripts son Bash y deben ejecutarse desde la raíz del proyecto.

En Windows, el flujo recomendado es ejecutarlos desde Ubuntu/WSL, no desde Git Bash.
Eso evita problemas de rutas entre Windows y Linux y es lo más parecido al entorno
de macOS/Linux.

## Requisitos

### Windows

Abrir Ubuntu:

```powershell
wsl -d Ubuntu
```

Ir al proyecto desde Ubuntu:

```bash
cd /mnt/c/Users/david/Documents/Projects/etso
```

Instalar dependencias de deploy en Ubuntu:

```bash
bash deploy/scripts/setup-ubuntu.sh
source ~/.bashrc
```

El setup instala:

- Node.js
- AWS CLI
- jq
- sqlite3
- Turso CLI en WSL

Si Turso no está autenticado:

```bash
turso auth login --headless
```

Cuando Turso devuelva un comando `turso config set token "..."`, pegarlo y ejecutarlo
dentro de Ubuntu. Verificar después:

```bash
turso auth whoami
```

Después, todo el deploy se ejecuta desde Ubuntu:

```bash
bash deploy/scripts/check-deploy-env.sh
bash deploy/scripts/deploy-all.sh
```

Si se quiere usar Git Bash como fallback, los scripts intentan detectar herramientas
en rutas habituales de Windows y en `deploy/tools/bin/`, pero no es el flujo preferido.

Esa carpeta está ignorada por Git.

Si Ubuntu no existe todavía:

```powershell
wsl --install Ubuntu
```

### macOS

Instalar:

```bash
brew install awscli jq sqlite
```

```bash
brew install tursodatabase/tap/turso
```

## Entrada esperada

Configurar `deploy/.env.deploy` desde `deploy/.env.deploy.example`.

Poner ahí `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` del token
read&write de R2. No subir `deploy/.env.deploy` al repositorio.

Copiar:

- Resúmenes a `deploy/input/public-assets/resumenes/`
- TXT a `deploy/input/private-assets/texts/`
- SQLite a `deploy/input/turso/etso.sqlite`

El índice de búsqueda se genera automáticamente desde los TXT en:
`deploy/input/public-assets/search/`.

Por defecto el builder usa 8 GB de heap de Node. Se puede ajustar con
`SEARCH_INDEX_NODE_MAX_OLD_SPACE_SIZE` en `deploy/.env.deploy`.

## Comandos

# Probar entorno
bash deploy/scripts/check-deploy-env.sh

# Probar R2 sin ejecutar cambios. Esto no reemplaza Turso.
bash deploy/scripts/build-search-index.sh
DRY_RUN=true bash deploy/scripts/sync-r2.sh

# Probar el flujo completo sin reemplazar Turso ni subir cambios reales a R2
DRY_RUN=true bash deploy/scripts/deploy-all.sh

# Desplegar todo en un único paso
bash deploy/scripts/deploy-all.sh

# Borrar entrada temporal
rm -rf deploy/input/
