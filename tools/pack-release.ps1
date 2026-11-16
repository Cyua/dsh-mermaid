# Build the shareable artifacts for internal distribution.
#
# The tarball (`cyua-dsh-mermaid-<version>.tgz`) is the primary artifact: DSH can
# install it directly — no unzip — with `install_bundle target=<path to .tgz>`
# (the "压缩包 / Tarball" install subject in the Web UI). The zip is a fallback for
# people who prefer a folder: it contains the same package files plus a Chinese
# install note and is installed by pointing `install_bundle` at the extracted
# directory.
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
  New-Item -ItemType Directory -Force $releaseDir | Out-Null

  # --ignore-scripts keeps the `prepare` build output out of the JSON output;
  # the release build has already been produced above.
  $packJson = npm pack --json --ignore-scripts | ConvertFrom-Json
  $tarball = $packJson[0].filename
  if (-not (Test-Path $tarball)) { throw "npm pack did not produce $tarball" }
  $tarballOut = Join-Path $releaseDir $tarball
  Move-Item $tarball $tarballOut -Force

  # Folder layout for the fallback zip.
  New-Item -ItemType Directory -Force $stage | Out-Null
  tar -xzf $tarballOut -C $stage --strip-components=1
  if ($LASTEXITCODE -ne 0) { throw 'tar extraction failed' }
  $note = Get-Content (Join-Path $root 'tools/install-note.txt') -Raw
  $note = $note.Replace('__NAME__', $name).Replace('__VERSION__', $version)
  Set-Content -Path (Join-Path $stage '安装说明.txt') -Value $note -Encoding UTF8
  Compress-Archive -Path $stage -DestinationPath $zip -Force

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
  Write-Host "zip:     $zip"
  Write-Host "  size:   $([math]::Round((Get-Item $zip).Length / 1MB, 2)) MiB"
  Write-Host "  sha256: $(Get-Sha256 $zip)"
} finally {
  Pop-Location
}
