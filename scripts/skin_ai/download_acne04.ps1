# ACNE04: free for academic research only. Original terms: https://github.com/xpwu95/LDL
# No credentials, executable dataset code, or model training are involved.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$datasetRoot = Join-Path $PSScriptRoot '../../skin-ai-data/acne04'
[void](New-Item -ItemType Directory -Path $datasetRoot -Force)
$revision = 'e375d8dac98b8562c5ab462d5f00ac011e8a47db'
$files = @(
    @{ name = 'train-00000-of-00003.parquet'; sha256 = 'ff3f9e736ef4b61169312491eabfac0acbeb10c5ffbba696e13428a19f29fd36' },
    @{ name = 'train-00001-of-00003.parquet'; sha256 = 'b64b0ae7c1e46281d0e6baca9ed87a5dd84b7b9d4b76b29ee6c66c4992f762e2' },
    @{ name = 'train-00002-of-00003.parquet'; sha256 = '3881e45464804176cd6894329c5e6a17f42565c19fa568de02635d95af291e8d' }
)
foreach ($entry in $files) {
    $destination = Join-Path $datasetRoot $entry.name
    if (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) {
            throw "Existing file has unexpected checksum: $($entry.name)"
        }
        Write-Output "Verified existing $($entry.name)"
        continue
    }
    $partial = "$destination.partial"
    $downloadUrl = "https://huggingface.co/datasets/Layered-Labs/ACNE04/resolve/$revision/data/$($entry.name)?download=true"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $partial -TimeoutSec 600 -MaximumRetryCount 2
    if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) {
        throw "Checksum mismatch: $($entry.name)"
    }
    Move-Item -LiteralPath $partial -Destination $destination
    Write-Output "Downloaded and verified $($entry.name)"
}
@{
    dataset = 'Layered-Labs/ACNE04'
    revision = $revision
    license = 'academic/research use only; contact original author for other uses'
    source = 'https://github.com/xpwu95/LDL'
    files = $files
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $datasetRoot 'provenance.json') -Encoding utf8
