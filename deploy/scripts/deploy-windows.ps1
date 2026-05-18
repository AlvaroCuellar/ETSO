param(
  [ValidateSet('doctor', 'setup', 'check', 'dry-run', 'deploy')]
  [string]$Command = 'doctor',
  [string]$Distro = '',
  [switch]$UseGitBash
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $PSCommandPath
$RootDir = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$EnvFile = Join-Path $RootDir 'deploy\.env.deploy'

function Get-DeployEnvValue {
  param([string]$Name)

  if (-not (Test-Path -LiteralPath $EnvFile)) {
    return $null
  }

  $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*(?<value>.*)\s*$'
  foreach ($line in Get-Content -LiteralPath $EnvFile -Encoding UTF8) {
    if ($line -match '^\s*#') {
      continue
    }
    if ($line -match $pattern) {
      return $matches.value.Trim().Trim('"').Trim("'")
    }
  }

  return $null
}

function ConvertTo-WslPath {
  param([string]$WindowsPath)

  $fullPath = (Resolve-Path -LiteralPath $WindowsPath).Path
  if ($fullPath -notmatch '^([A-Za-z]):\\(.*)$') {
    throw "No puedo convertir la ruta a WSL: $fullPath"
  }

  $drive = $matches[1].ToLowerInvariant()
  $rest = $matches[2] -replace '\\', '/'
  return "/mnt/$drive/$rest"
}

function Get-GitBashPath {
  $candidates = @(
    'C:\Program Files\Git\bin\bash.exe',
    'C:\Program Files\Git\usr\bin\bash.exe',
    'C:\Program Files (x86)\Git\bin\bash.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Test-WslDistro {
  param([string]$Name)

  if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
    return $false
  }

  & wsl.exe -d $Name -- true *> $null
  return $LASTEXITCODE -eq 0
}

function Invoke-DeployBash {
  param(
    [string]$Script,
    [bool]$DryRun = $false,
    [bool]$SetupOnly = $false
  )

  Push-Location $RootDir
  try {
    $wantedDistro = $Distro
    if ([string]::IsNullOrWhiteSpace($wantedDistro)) {
      $wantedDistro = Get-DeployEnvValue 'TURSO_WSL_DISTRO'
    }
    if ([string]::IsNullOrWhiteSpace($wantedDistro)) {
      $wantedDistro = 'Ubuntu'
    }

    if (-not $UseGitBash -and (Test-WslDistro $wantedDistro)) {
      $wslRoot = ConvertTo-WslPath $RootDir
      $args = @('-d', $wantedDistro, '--cd', $wslRoot, '--', 'env')
      if ($DryRun) {
        $args += 'DRY_RUN=true'
      }
      $args += @('bash', $Script)
      & wsl.exe @args
      exit $LASTEXITCODE
    }

    if ($SetupOnly) {
      throw "No hay una distro WSL registrada para ejecutar setup. Prueba: wsl --install -d $wantedDistro"
    }

    $gitBash = Get-GitBashPath
    if (-not $gitBash) {
      throw "No encuentro WSL operativo ni Git Bash."
    }

    $previousDryRun = [Environment]::GetEnvironmentVariable('DRY_RUN', 'Process')
    if ($DryRun) {
      [Environment]::SetEnvironmentVariable('DRY_RUN', 'true', 'Process')
    }
    try {
      & $gitBash $Script
      exit $LASTEXITCODE
    } finally {
      [Environment]::SetEnvironmentVariable('DRY_RUN', $previousDryRun, 'Process')
    }
  } finally {
    Pop-Location
  }
}

function Test-LfLineEndings {
  param(
    [string]$Path,
    [string]$Filter = '*'
  )

  $bad = @()
  foreach ($file in Get-ChildItem -LiteralPath $Path -File -Filter $Filter) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    for ($i = 1; $i -lt $bytes.Length; $i++) {
      if ($bytes[$i - 1] -eq 13 -and $bytes[$i] -eq 10) {
        $bad += $file.FullName.Replace("$RootDir\", '')
        break
      }
    }
  }
  return $bad
}

function Invoke-Doctor {
  $wantedDistro = $Distro
  if ([string]::IsNullOrWhiteSpace($wantedDistro)) {
    $wantedDistro = Get-DeployEnvValue 'TURSO_WSL_DISTRO'
  }
  if ([string]::IsNullOrWhiteSpace($wantedDistro)) {
    $wantedDistro = 'Ubuntu'
  }

  Write-Host "Root: $RootDir"
  Write-Host "Distro WSL configurada: $wantedDistro"

  $badLineEndings = @(Test-LfLineEndings (Join-Path $RootDir 'deploy\scripts') '*.sh')
  if (Test-Path -LiteralPath $EnvFile) {
    $badLineEndings += @(Test-LfLineEndings (Split-Path -Parent $EnvFile) |
      Where-Object { $_ -eq 'deploy\.env.deploy' }
    )
  }
  if ($badLineEndings.Count -eq 0) {
    Write-Host "Line endings Bash/env: OK (LF)"
  } else {
    Write-Host "Line endings Bash/env: CRLF en $($badLineEndings -join ', ')"
  }

  $gitAutoCrlf = & git config --get core.autocrlf 2>$null
  if ($LASTEXITCODE -eq 0 -and $gitAutoCrlf) {
    Write-Host "Git core.autocrlf: $gitAutoCrlf"
  }

  if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
    Write-Host "WSL: instalado"
    $wslDistros = & wsl.exe --list --all --quiet 2>$null
    if ($LASTEXITCODE -eq 0 -and $wslDistros) {
      Write-Host "WSL distros: $($wslDistros -join ', ')"
    } else {
      Write-Host "WSL distros: ninguna registrada"
    }
    if (Test-WslDistro $wantedDistro) {
      Write-Host "WSL ${wantedDistro}: OK"
      $wslRoot = ConvertTo-WslPath $RootDir
      foreach ($tool in @('node', 'aws', 'jq', 'sqlite3', 'turso')) {
        $toolPath = & wsl.exe -d $wantedDistro --cd $wslRoot -- bash -lc "command -v $tool" 2>$null
        if ($LASTEXITCODE -eq 0 -and $toolPath) {
          Write-Host "${tool}: $toolPath"
        } else {
          Write-Host "${tool}: MISSING"
        }
      }
    } else {
      Write-Host "WSL ${wantedDistro}: no registrada o no arranca"
    }
  } else {
    Write-Host "WSL: no instalado"
  }

  $gitBash = Get-GitBashPath
  if ($gitBash) {
    Write-Host "Git Bash: $gitBash"
    foreach ($tool in @('node', 'aws', 'jq', 'sqlite3', 'turso')) {
      $toolPath = & $gitBash -lc "command -v $tool" 2>$null
      if ($LASTEXITCODE -eq 0 -and $toolPath) {
        Write-Host "${tool}: $toolPath"
      } else {
        Write-Host "${tool}: MISSING"
      }
    }
  } else {
    Write-Host "Git Bash: no encontrado"
  }
}

switch ($Command) {
  'doctor' { Invoke-Doctor }
  'setup' { Invoke-DeployBash -Script 'deploy/scripts/setup-ubuntu.sh' -SetupOnly $true }
  'check' { Invoke-DeployBash -Script 'deploy/scripts/check-deploy-env.sh' }
  'dry-run' { Invoke-DeployBash -Script 'deploy/scripts/deploy-all.sh' -DryRun $true }
  'deploy' { Invoke-DeployBash -Script 'deploy/scripts/deploy-all.sh' }
}
