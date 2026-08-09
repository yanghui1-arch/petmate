[CmdletBinding()]
param(
    [ValidateSet('Auto', 'All', 'Cuda', 'Vulkan', 'Cpu')]
    [string]$Backend = 'Auto'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localAiRoot = Join-Path $repoRoot 'resources\local-ai'
$runtimeRoot = Join-Path $localAiRoot 'runtime'
$llamaRoot = Join-Path $runtimeRoot 'llama'
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('petmate-local-ai-' + [Guid]::NewGuid().ToString('N'))

function Write-Step([string]$Message) {
    Write-Host "[Petmate Local AI] $Message" -ForegroundColor Cyan
}

function New-RequiredDirectory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Get-DetectedBackend {
    if ($Backend -ne 'Auto') {
        return $Backend.ToLowerInvariant()
    }

    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        try {
            & nvidia-smi -L *> $null
            if ($LASTEXITCODE -eq 0) {
                return 'cuda'
            }
        } catch {
            # Continue to Vulkan/CPU detection.
        }
    }

    $gpuNames = (Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ','
    if ($gpuNames -match 'AMD|Radeon|Intel|Arc') {
        return 'vulkan'
    }
    return 'cpu'
}

function Get-ReleaseAsset($Release, [string]$Pattern) {
    $asset = $Release.assets | Where-Object { $_.name -match $Pattern } | Select-Object -First 1
    if (-not $asset) {
        throw "llama.cpp release $($Release.tag_name) does not contain an asset matching $Pattern"
    }
    return $asset
}

function Install-LlamaArchive($Asset, [string]$TargetName, [bool]$ContainsServer) {
    $targetRoot = Join-Path $llamaRoot $TargetName
    if ($ContainsServer -and (Test-Path -LiteralPath (Join-Path $targetRoot 'llama-server.exe'))) {
        Write-Step "llama.cpp $TargetName runtime is already installed"
        return
    }

    $archive = Join-Path $temporaryRoot $Asset.name
    $extractRoot = Join-Path $temporaryRoot ([IO.Path]::GetFileNameWithoutExtension($Asset.name))

    Write-Step "Downloading llama.cpp asset $($Asset.name)"
    Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $archive -Headers @{
        'User-Agent' = 'Petmate-local-ai-setup'
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force

    New-RequiredDirectory $targetRoot

    if ($ContainsServer) {
        $server = Get-ChildItem -LiteralPath $extractRoot -Recurse -Filter 'llama-server.exe' |
            Select-Object -First 1
        if (-not $server) {
            throw "llama-server.exe was not found in $($Asset.name)"
        }
        Copy-Item -Path (Join-Path $server.Directory.FullName '*') -Destination $targetRoot -Recurse -Force
    } else {
        Get-ChildItem -LiteralPath $extractRoot -Recurse -Filter '*.dll' | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $targetRoot -Force
        }
    }
}

try {
    New-RequiredDirectory $temporaryRoot
    New-RequiredDirectory $llamaRoot

    $selectedBackend = Get-DetectedBackend
    Write-Step "Selected LLM backend: $selectedBackend"

    $release = Invoke-RestMethod `
        -Uri 'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest' `
        -Headers @{ 'User-Agent' = 'Petmate-local-ai-setup' }

    $cpuAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-cpu-x64\.zip$'
    Install-LlamaArchive $cpuAsset 'cpu' $true

    if ($selectedBackend -in @('vulkan', 'all')) {
        $vulkanAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-vulkan-x64\.zip$'
        Install-LlamaArchive $vulkanAsset 'vulkan' $true
    }
    if ($selectedBackend -in @('cuda', 'all')) {
        $cudaAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-cuda-12\.4-x64\.zip$'
        $cudaRuntimeAsset = Get-ReleaseAsset $release '^cudart-llama-bin-win-cuda-12\.4-x64\.zip$'
        Install-LlamaArchive $cudaAsset 'cuda' $true
        Install-LlamaArchive $cudaRuntimeAsset 'cuda' $false
    }

    $installedLlamaRelease = $release.tag_name
    $versionProcessInfo = [Diagnostics.ProcessStartInfo]::new()
    $versionProcessInfo.FileName = Join-Path $llamaRoot 'cpu\llama-server.exe'
    $versionProcessInfo.Arguments = '--version'
    $versionProcessInfo.UseShellExecute = $false
    $versionProcessInfo.CreateNoWindow = $true
    $versionProcessInfo.RedirectStandardOutput = $true
    $versionProcessInfo.RedirectStandardError = $true
    $versionProcess = [Diagnostics.Process]::Start($versionProcessInfo)
    $llamaVersionOutput = @(
        $versionProcess.StandardOutput.ReadToEnd()
        $versionProcess.StandardError.ReadToEnd()
    ) -join ' '
    $versionProcess.WaitForExit()
    if ($llamaVersionOutput -match 'version:\s*(\d+)') {
        $installedLlamaRelease = "b$($Matches[1])"
    }

    $manifest = @{
        installedAt = (Get-Date).ToUniversalTime().ToString('o')
        llamaCppRelease = $installedLlamaRelease
        backend = $selectedBackend
    } | ConvertTo-Json
    Set-Content -LiteralPath (Join-Path $localAiRoot 'installation.json') -Value $manifest -Encoding utf8

    Write-Host ''
    Write-Host 'Local AI setup complete.' -ForegroundColor Green
    Write-Host "Runtime: $runtimeRoot"
} finally {
    $resolvedTemporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
    $systemTemporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (
        (Test-Path -LiteralPath $resolvedTemporaryRoot) -and
        $resolvedTemporaryRoot.StartsWith($systemTemporaryRoot, [StringComparison]::OrdinalIgnoreCase) -and
        ([IO.Path]::GetFileName($resolvedTemporaryRoot) -like 'petmate-local-ai-*')
    ) {
        Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
    }
}
