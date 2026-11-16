# Build the shareable tarball for internal distribution.
#
# DSH installs a .tgz directly — no unzip — with
# `install_bundle target=<path to .tgz>` (the "压缩包 / Tarball" install subject in
# the Web UI), and the profile keeps its own copy afterwards.
#
# Usage: npm run release:tgz   (or powershell -File tools/pack-release.ps1)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  $name = ($pkg.name -split '/')[-1]
  $version = $pkg.version
  $releaseDir = Join-Path $root 'release'

  Write-Host "building $name@$version"
  npm run build | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'build failed' }

  New-Item -ItemType Directory -Force $releaseDir | Out-Null

  # --ignore-scripts keeps the `prepare` build output out of the JSON output;
  # the release build has already been produced above.
  $packJson = npm pack --json --ignore-scripts | ConvertFrom-Json
  $tarball = $packJson[0].filename
  if (-not (Test-Path $tarball)) { throw "npm pack did not produce $tarball" }
  $tarballOut = Join-Path $releaseDir $tarball
  Move-Item $tarball $tarballOut -Force

  function Get-Sha256([string]$path) {
    try {
      $sha = [System.Security.Cryptography.SHA256]::Create()
      $stream = [System.IO.File]::OpenRead($path)
      try { $bytes = $sha.ComputeHash($stream) } finally { $stream.Close() }
      return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
    } catch {
      return '(unavailable)'
    }
  }

  Write-Host ''
  Write-Host "tarball: $tarballOut"
  Write-Host "  size:   $([math]::Round((Get-Item $tarballOut).Length / 1MB, 2)) MiB"
  Write-Host "  sha256: $(Get-Sha256 $tarballOut)"
} finally {
  Pop-Location
}
