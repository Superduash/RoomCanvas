$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

$gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.2/PortableGit-2.55.0.2-64-bit.7z.exe"
$destDir = "C:\Users\arvit\PortableGit"
$tempExe = "$env:TEMP\PortableGit.exe"

Write-Host "Creating target directory: $destDir..."
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Write-Host "Downloading Portable Git from $gitUrl..."
Invoke-WebRequest -Uri $gitUrl -OutFile $tempExe

Write-Host "Extracting Portable Git..."
Start-Process -FilePath $tempExe -ArgumentList "-y", "-o`"$destDir`"" -Wait -NoNewWindow

Write-Host "Cleaning up temp installer..."
Remove-Item -Path $tempExe -Force

Write-Host "Updating PATH environment variable..."
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$destDir\cmd*") {
    [Environment]::SetEnvironmentVariable("PATH", $currentPath + ";$destDir\cmd", "User")
    Write-Host "Added $destDir\cmd to User PATH."
} else {
    Write-Host "Path already exists in User PATH."
}

# Update current process PATH
$env:PATH += ";$destDir\cmd"

Write-Host "Verifying Git Installation..."
& git --version

Write-Host "Git installation completed successfully!"
