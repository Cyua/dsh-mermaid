# Build a self-contained zip for internal sharing.
#
# The zip contains exactly what `npm pack` publishes (package root + manifest +
# dist/client.js + locale + icon + docs) plus a Chinese install note. Recipients
# extract it and run `plugin_manager install_bundle` with the extracted folder.
#
# Usage: npm run release:zip   (or powershell -File tools/pack-release.ps1)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  $name = ($pkg.name -split '/')[-1]
  $version = $pkg.version
  $releaseDir = Join-Path $root 'release'
  $stage = Join-Path $releaseDir "$name-$version"
  $zip = Join-Path $releaseDir "$name-$version.zip"

  Write-Host "building $name@$version"
  npm run build | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'build failed' }

  if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
  if (Test-Path $zip) { Remove-Item $zip -Force }
  New-Item -ItemType Directory -Force $stage | Out-Null

  # --ignore-scripts keeps the `prepare` build output out of the JSON output;
  # the release build has already been produced above.
  $packJson = npm pack --json --ignore-scripts | ConvertFrom-Json
  $tarball = $packJson[0].filename
  if (-not (Test-Path $tarball)) { throw "npm pack did not produce $tarball" }
  tar -xzf $tarball -C $stage --strip-components=1
  if ($LASTEXITCODE -ne 0) { throw 'tar extraction failed' }
  Remove-Item $tarball -Force

  $note = Get-Content (Join-Path $root 'tools/install-note.txt') -Raw
  $note = $note.Replace('__NAME__', $name).Replace('__VERSION__', $version)
  Set-Content -Path (Join-Path $stage '安装说明.txt') -Value $note -Encoding UTF8

  Compress-Archive -Path $stage -DestinationPath $zip -Force
  $hash = '(unavailable)'
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($zip)
    try {
      $bytes = $sha.ComputeHash($stream)
    } finally {
      $stream.Close()
    }
    $hash = (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
  } catch {
    Write-Warning "could not hash the zip: $($_.Exception.Message)"
  }
  $size = [math]::Round((Get-Item $zip).Length / 1MB, 2)
  Write-Host ''
  Write-Host "zip:    $zip"
  Write-Host "size:   $size MiB"
  Write-Host "sha256: $hash"
} finally {
  Pop-Location
}
