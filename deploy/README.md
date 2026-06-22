# Deploy de datos

Los scripts son Bash y deben ejecutarse desde la raÃ­z del proyecto.

En Windows, el flujo recomendado es ejecutarlos desde Ubuntu/WSL, no desde Git Bash.
Eso evita problemas de rutas entre Windows y Linux y es lo mÃ¡s parecido al entorno
de macOS/Linux.

Desde PowerShell no uses `bash ...` a secas: en Windows puede resolver al lanzador
de WSL o a Git Bash segÃºn la mÃ¡quina. Usa el wrapper `deploy-windows.ps1` o abre
una terminal Ubuntu/WSL y ejecuta los scripts Bash desde ahÃ­.

## Requisitos

### Windows

Comprobar el estado de Windows, WSL, Git Bash y herramientas:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/deploy-windows.ps1 doctor
```

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

Si Turso no estÃ¡ autenticado:

```bash
turso auth login --headless
```

Cuando Turso devuelva un comando `turso config set token "..."`, pegarlo y ejecutarlo
dentro de Ubuntu. Verificar despuÃ©s:

```bash
turso auth whoami
```

DespuÃ©s, todo el deploy se ejecuta desde Ubuntu:

```bash
bash deploy/scripts/check-deploy-env.sh
bash deploy/scripts/deploy-all.sh
```

Si se quiere usar Git Bash como fallback, los scripts intentan detectar herramientas
en rutas habituales de Windows y en `deploy/tools/bin/`, pero no es el flujo preferido.

Esa carpeta estÃ¡ ignorada por Git.

Si Ubuntu no existe todavÃ­a:

```powershell
wsl --install -d Ubuntu
```

DespuÃ©s de instalarla, abrir `Ubuntu` una vez para crear el usuario Linux.

TambiÃ©n se puede lanzar el flujo desde PowerShell, dejando que el wrapper use WSL
si la distro existe y Git Bash como fallback:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/deploy-windows.ps1 check
powershell -ExecutionPolicy Bypass -File deploy/scripts/deploy-windows.ps1 dry-run
powershell -ExecutionPolicy Bypass -File deploy/scripts/deploy-windows.ps1 deploy
```

Si el nombre de la distro no es `Ubuntu`, ponerlo en `TURSO_WSL_DISTRO` dentro de
`deploy/.env.deploy` o pasarlo con `-Distro`.

### macOS

Instalar:

```bash
brew install node@24 awscli jq sqlite
```

```bash
brew install tursodatabase/tap/turso
```

Si Homebrew no deja `node` en el `PATH` tras instalar `node@24`, seguir las
instrucciones que muestra `brew` al final de la instalaciÃƒÂ³n.

Autenticar Turso:

```bash
turso auth login --headless
turso auth whoami
```

## Entrada esperada

Configurar `deploy/.env.deploy` desde `deploy/.env.deploy.example`.

Poner ahÃ­ `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` del token
read&write de R2. No subir `deploy/.env.deploy` al repositorio.

Poner tambien el Deploy Hook de Vercel para que, despues de reemplazar Turso,
la web se redeploye y recargue la base actualizada:

```bash
DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/..."
REQUIRE_DEPLOY_HOOK="true"
```

El hook se crea en Vercel desde el proyecto de produccion: `Settings` -> `Git` ->
`Deploy Hooks`. Crear un hook para la rama `main` y copiar la URL.

Si se quiere hacer el redeploy de Vercel manualmente, ejecutar:

```bash
REQUIRE_DEPLOY_HOOK=false bash deploy/scripts/deploy-all.sh
```

Sin `DEPLOY_HOOK_URL`, y salvo que `REQUIRE_DEPLOY_HOOK=false`, el deploy falla
al principio para evitar terminar con R2/Turso actualizados pero Vercel sirviendo
datos antiguos.

Copiar:

- Resumenes a `deploy/input/public-assets/resumenes/`
- TXT a `deploy/input/private-assets/texts/`
- SQLite a `deploy/input/turso/etso.sqlite`
- Facsimiles de primera y ultima pagina a `static/facsimiles/`

Los facsimiles deben entrar siempre por el repo como assets estaticos. La web
los sirve como `/facsimiles/...`; si Turso tiene rutas `facsimiles/...` pero no
existe el JPG correspondiente en `static/facsimiles/`, la ficha de obra no puede
mostrar la primera y la ultima pagina.

El Ã­ndice de bÃºsqueda se genera automÃ¡ticamente desde los TXT en:
`deploy/input/public-assets/search/`.

El indice de busqueda de resumenes se genera automaticamente desde:

- SQLite: `deploy/input/turso/etso.sqlite`
- JSON de resumenes: `deploy/input/public-assets/resumenes/`
- salida: `deploy/input/public-assets/resumenes/search-index.json`

Por defecto el builder usa 8 GB de heap de Node. Se puede ajustar con
`SEARCH_INDEX_NODE_MAX_OLD_SPACE_SIZE` en `deploy/.env.deploy`.

## Comandos

```bash
# Probar entorno
bash deploy/scripts/check-deploy-env.sh

# Probar R2 sin ejecutar cambios. Esto no sincroniza Turso.
bash deploy/scripts/build-search-index.sh
DRY_RUN=true bash deploy/scripts/sync-r2.sh

# Probar el flujo completo sin sincronizar Turso ni subir cambios reales a R2
DRY_RUN=true bash deploy/scripts/deploy-all.sh

# Desplegar todo en un Ãºnico paso
bash deploy/scripts/deploy-all.sh

# Emergencia: forzar el reemplazo completo de Turso en vez del parche incremental
TURSO_SYNC_MODE=replace bash deploy/scripts/deploy-all.sh

# Borrar entrada temporal
rm -rf deploy/input/
```
