[CmdletBinding()]
param(
    [ValidateSet('Auto', 'Cuda', 'Vulkan', 'Cpu')]
    [string]$Backend = 'Auto'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localAiRoot = Join-Path $repoRoot 'resources\local-ai'
$runtimeRoot = Join-Path $localAiRoot 'runtime'
$llamaRoot = Join-Path $runtimeRoot 'llama'
$ttsEnvironment = Join-Path $runtimeRoot 'tts-env'
$modelsRoot = Join-Path $localAiRoot 'models'
$llmModelRoot = Join-Path $modelsRoot 'llm'
$ttsModelRoot = Join-Path $modelsRoot 'tts\Qwen3-TTS-12Hz-0.6B-Base'
$voicesRoot = Join-Path $localAiRoot 'voices'
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('petmate-local-ai-' + [Guid]::NewGuid().ToString('N'))
$substituteDrive = $null

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

function Get-ModelScopeFiles([string]$Model, [string]$Root = '') {
    $encodedRoot = [Uri]::EscapeDataString($Root)
    $uri = "https://www.modelscope.cn/api/v1/models/$Model/repo/files?Revision=master&Root=$encodedRoot"
    $response = Invoke-RestMethod -Uri $uri -Headers @{
        'User-Agent' = 'Petmate-local-ai-setup'
    }
    if (-not $response.Success) {
        throw "Failed to list ModelScope repository $Model at $Root"
    }

    foreach ($file in $response.Data.Files) {
        if ($file.Type -eq 'tree') {
            Get-ModelScopeFiles -Model $Model -Root $file.Path
        } elseif ($file.Type -eq 'blob') {
            $file
        }
    }
}

function Download-ModelScopeFile(
    [string]$Model,
    [string]$RepositoryPath,
    [string]$TargetPath,
    [long]$ExpectedSize,
    [string]$ExpectedSha256
) {
    if (Test-Path -LiteralPath $TargetPath) {
        $existing = Get-Item -LiteralPath $TargetPath
        if ($existing.Length -eq $ExpectedSize) {
            Write-Step "Already downloaded: $RepositoryPath"
            return
        }
    }

    $parent = Split-Path -Parent $TargetPath
    New-RequiredDirectory $parent
    $partialPath = "$TargetPath.incomplete"
    $urlPath = ($RepositoryPath -split '/') |
        ForEach-Object { [Uri]::EscapeDataString($_) }
    $url = "https://modelscope.cn/models/$Model/resolve/master/$($urlPath -join '/')"

    Write-Step "Downloading $Model/$RepositoryPath"
    & curl.exe `
        --location `
        --fail `
        --retry 5 `
        --retry-delay 2 `
        --retry-all-errors `
        --connect-timeout 30 `
        --continue-at - `
        --output $partialPath `
        $url
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to download $Model/$RepositoryPath"
    }

    $downloaded = Get-Item -LiteralPath $partialPath
    if ($downloaded.Length -ne $ExpectedSize) {
        throw "Size mismatch for ${RepositoryPath}: expected $ExpectedSize, got $($downloaded.Length)"
    }
    $actualSha256 = (Get-FileHash -LiteralPath $partialPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ExpectedSha256 -and $actualSha256 -ne $ExpectedSha256.ToLowerInvariant()) {
        throw "SHA-256 mismatch for $RepositoryPath"
    }
    Move-Item -LiteralPath $partialPath -Destination $TargetPath -Force
}

try {
    New-RequiredDirectory $temporaryRoot
    New-RequiredDirectory $llamaRoot
    New-RequiredDirectory $llmModelRoot
    New-RequiredDirectory $ttsModelRoot
    New-RequiredDirectory $voicesRoot

    $selectedBackend = Get-DetectedBackend
    Write-Step "Selected LLM backend: $selectedBackend"

    $release = Invoke-RestMethod `
        -Uri 'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest' `
        -Headers @{ 'User-Agent' = 'Petmate-local-ai-setup' }

    $cpuAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-cpu-x64\.zip$'
    Install-LlamaArchive $cpuAsset 'cpu' $true

    if ($selectedBackend -eq 'vulkan') {
        $vulkanAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-vulkan-x64\.zip$'
        Install-LlamaArchive $vulkanAsset 'vulkan' $true
    } elseif ($selectedBackend -eq 'cuda') {
        $cudaAsset = Get-ReleaseAsset $release '^llama-.*-bin-win-cuda-12\.4-x64\.zip$'
        $cudaRuntimeAsset = Get-ReleaseAsset $release '^cudart-llama-bin-win-cuda-12\.4-x64\.zip$'
        Install-LlamaArchive $cudaAsset 'cuda' $true
        Install-LlamaArchive $cudaRuntimeAsset 'cuda' $false
    }

    # PyTorch wheels contain deeply nested license paths. A temporary drive mapping
    # keeps pip below the legacy Windows MAX_PATH limit while writing to the same
    # resources/local-ai directory.
    $shortLocalAiRoot = $localAiRoot
    foreach ($driveLetter in @('P', 'Q', 'R', 'S', 'T')) {
        if (-not (Test-Path -LiteralPath "${driveLetter}:\")) {
            & subst "${driveLetter}:" $localAiRoot
            if ($LASTEXITCODE -eq 0) {
                $substituteDrive = "${driveLetter}:"
                $shortLocalAiRoot = "${driveLetter}:\"
                break
            }
        }
    }
    if (-not $substituteDrive) {
        throw 'No free drive letter was available for the short local AI installation path'
    }

    $shortTtsEnvironment = Join-Path $shortLocalAiRoot 'runtime\tts-env'
    $portablePython = Join-Path $shortTtsEnvironment 'python.exe'
    $legacyVenvPython = Join-Path $shortTtsEnvironment 'Scripts\python.exe'
    if ((Test-Path -LiteralPath $legacyVenvPython) -and -not (Test-Path -LiteralPath $portablePython)) {
        $resolvedEnvironment = [IO.Path]::GetFullPath($ttsEnvironment)
        $resolvedRuntimeRoot = [IO.Path]::GetFullPath($runtimeRoot)
        if (-not $resolvedEnvironment.StartsWith(
            $resolvedRuntimeRoot + [IO.Path]::DirectorySeparatorChar,
            [StringComparison]::OrdinalIgnoreCase
        )) {
            throw 'Refusing to replace a Python environment outside the local AI runtime'
        }
        Write-Step 'Replacing the machine-bound Python venv with a portable runtime'
        Remove-Item -LiteralPath $shortTtsEnvironment -Recurse -Force
    }

    if (-not (Test-Path -LiteralPath $portablePython)) {
        Write-Step 'Downloading a portable Python 3.12 runtime for Qwen3-TTS'
        $pythonRelease = Invoke-RestMethod `
            -Uri 'https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest' `
            -Headers @{ 'User-Agent' = 'Petmate-local-ai-setup' }
        $pythonAsset = Get-ReleaseAsset `
            $pythonRelease `
            '^cpython-3\.12\..*-x86_64-pc-windows-msvc-install_only\.tar\.gz$'
        $pythonArchive = Join-Path $temporaryRoot $pythonAsset.name
        Invoke-WebRequest `
            -Uri $pythonAsset.browser_download_url `
            -OutFile $pythonArchive `
            -Headers @{ 'User-Agent' = 'Petmate-local-ai-setup' }
        New-RequiredDirectory $shortTtsEnvironment
        & tar.exe -xf $pythonArchive --strip-components=1 -C $shortTtsEnvironment
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $portablePython)) {
            throw 'Failed to extract the portable Qwen3-TTS Python runtime'
        }
    }

    $qwenTtsReady = $false
    try {
        $backendCheck = if ($selectedBackend -eq 'cuda') {
            "import importlib.util, torch; assert all(importlib.util.find_spec(name) for name in ('qwen_tts', 'torch', 'soundfile')); assert torch.version.cuda is not None"
        } else {
            "import importlib.util; assert all(importlib.util.find_spec(name) for name in ('qwen_tts', 'torch', 'soundfile'))"
        }
        & $portablePython -c $backendCheck
        $qwenTtsReady = $LASTEXITCODE -eq 0
    } catch {
        $qwenTtsReady = $false
    }

    if (-not $qwenTtsReady) {
        Write-Step 'Installing qwen-tts 0.1.1 and its local inference dependencies'
        & $portablePython -m pip install --upgrade pip
        if ($selectedBackend -eq 'cuda') {
            & $portablePython -m pip install 'torch==2.11.0' 'torchaudio==2.11.0' --index-url 'https://download.pytorch.org/whl/cu128'
        } else {
            & $portablePython -m pip install 'torch==2.11.0' 'torchaudio==2.11.0' --index-url 'https://download.pytorch.org/whl/cpu'
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install the $selectedBackend PyTorch runtime"
        }
        & $portablePython -m pip install `
            'qwen-tts==0.1.1' `
            'huggingface_hub[cli]==0.36.2' `
            'torch==2.11.0' `
            'torchaudio==2.11.0'
        if ($LASTEXITCODE -ne 0) {
            throw 'Failed to install qwen-tts'
        }
    }

    $llmModelPath = Join-Path $llmModelRoot 'Qwen3.5-2B-Q4_K_M.gguf'
    Download-ModelScopeFile `
        -Model 'unsloth/Qwen3.5-2B-GGUF' `
        -RepositoryPath 'Qwen3.5-2B-Q4_K_M.gguf' `
        -TargetPath $llmModelPath `
        -ExpectedSize 1280835840 `
        -ExpectedSha256 'aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223'

    Write-Step 'Preparing Qwen3-TTS-12Hz-0.6B-Base files (about 2.5 GB)'
    $ttsFiles = Get-ModelScopeFiles -Model 'Qwen/Qwen3-TTS-12Hz-0.6B-Base'
    foreach ($file in $ttsFiles) {
        $targetPath = Join-Path $ttsModelRoot ($file.Path -replace '/', '\')
        Download-ModelScopeFile `
            -Model 'Qwen/Qwen3-TTS-12Hz-0.6B-Base' `
            -RepositoryPath $file.Path `
            -TargetPath $targetPath `
            -ExpectedSize $file.Size `
            -ExpectedSha256 $file.Sha256
    }

    $referenceAudio = Join-Path $voicesRoot 'default.wav'
    if (-not (Test-Path -LiteralPath $referenceAudio)) {
        Write-Step 'Downloading the official Qwen3-TTS reference voice for the first-run demo'
        Invoke-WebRequest `
            -Uri 'https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen3-TTS-Repo/clone.wav' `
            -OutFile $referenceAudio
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
        llm = 'unsloth/Qwen3.5-2B-GGUF:Q4_K_M'
        tts = 'Qwen/Qwen3-TTS-12Hz-0.6B-Base'
    } | ConvertTo-Json
    Set-Content -LiteralPath (Join-Path $localAiRoot 'installation.json') -Value $manifest -Encoding utf8

    Write-Host ''
    Write-Host 'Local AI setup complete.' -ForegroundColor Green
    Write-Host "Runtime: $runtimeRoot"
    Write-Host "Models:  $modelsRoot"
} finally {
    if ($substituteDrive) {
        & subst $substituteDrive /D
    }
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
