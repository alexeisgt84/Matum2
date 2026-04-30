# build-apk.ps1 (Adaptado para Matum2)
# Automatizacion: Build (Vite) + Sync (Capacitor) + Gradlew (Android) + Firma (apksigner)

$BuildToolsPath = "C:\Users\Alexeis\AppData\Local\Android\Sdk\build-tools\36.0.0"
$ZipalignTool = Join-Path $BuildToolsPath "zipalign.exe"
$ApksignerTool = Join-Path $BuildToolsPath "apksigner.bat"

Write-Host "--- Iniciando proceso integral de construccion y firma para Matum2 ---" -ForegroundColor Cyan

# Cargar variables de entorno si existe .env
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^(.+?)=(.+)$") {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
}

# Configuracion por defecto para la firma
if (-not $KEYSTORE_PATH) { $KEYSTORE_PATH = "global-signing-key.jks" }
if (-not $KEY_ALIAS) { $KEY_ALIAS = "global-alias" }
if (-not $KEY_PASSWORD) { $KEY_PASSWORD = "gobot2026" }

# 1. Compilar el frontend (React + TS)
Write-Host "[1/4] Compilando frontend (Vite)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Fallo npm build"; exit $LASTEXITCODE }

# 2. Sincronizar con Capacitor
Write-Host "[2/4] Sincronizando activos con Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Fallo cap sync"; exit $LASTEXITCODE }

# 2.5 Generar activos nativos (Iconos/Splash)
Write-Host "[2.5/4] Generando iconos y splash screens nativos..." -ForegroundColor Yellow
npx @capacitor/assets generate --android
if ($LASTEXITCODE -ne 0) { Write-Host "Advertencia: Fallo la generacion automatica de iconos (posiblemente falta carpeta assets). Continuando..." -ForegroundColor Gray }

# 3. Construir APK con Gradle
Write-Host "[3/4] Generando APK con Gradle..." -ForegroundColor Yellow
Push-Location android
.\gradlew assembleRelease
Pop-Location
if ($LASTEXITCODE -ne 0) { Write-Error "Fallo gradle build"; exit $LASTEXITCODE }

$UnsignedAPK = "android/app/build/outputs/apk/release/app-release-unsigned.apk"
$AlignedAPK = "android/app/build/outputs/apk/release/app-release-aligned.apk"
$SignedAPK = "Matum-signed.apk"

# 4. Alinear y Firmar
Write-Host "[4/4] Alineando y Firmando APK..." -ForegroundColor Yellow

# Limpiar temporales si existen
if (Test-Path $AlignedAPK) { Remove-Item $AlignedAPK }

# Alineado
if (Test-Path $ZipalignTool) {
    & $ZipalignTool -v 4 $UnsignedAPK $AlignedAPK
    if ($LASTEXITCODE -ne 0) { Write-Error "Fallo zipalign"; exit $LASTEXITCODE }
} else {
    Write-Warning "No se encontro zipalign.exe en $ZipalignTool. Saltando alineacion."
    Copy-Item $UnsignedAPK $AlignedAPK
}

# Firma
if (Test-Path $ApksignerTool) {
    & $ApksignerTool sign --ks $KEYSTORE_PATH --ks-pass "pass:$KEY_PASSWORD" --ks-key-alias $KEY_ALIAS --out $SignedAPK $AlignedAPK
    if ($LASTEXITCODE -ne 0) { Write-Error "Fallo apksigner"; exit $LASTEXITCODE }
} else {
    Write-Error "No se encontro apksigner.bat en $ApksignerTool. No se pudo firmar el APK."
    exit 1
}

# Limpiar APK alineado temporal
if (Test-Path $AlignedAPK) { Remove-Item $AlignedAPK }

Write-Host "EXITO! Tu app Matum2 actualizada y firmada esta lista como: $SignedAPK" -ForegroundColor Green
