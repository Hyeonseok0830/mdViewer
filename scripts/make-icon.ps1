# Microsoft Store 및 NSIS 인스톨러용 아이콘 생성 스크립트
# PowerShell에서 실행: .\scripts\make-icon.ps1
# 필요 조건: ImageMagick (https://imagemagick.org/script/download.php#windows)

param(
    [string]$Source = "assets\icon.svg"
)

$outDir = "assets"

if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Error "ImageMagick이 설치되지 않았습니다. https://imagemagick.org 에서 설치하세요."
    exit 1
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)

Write-Host "PNG 생성 중..."
foreach ($size in $sizes) {
    magick "$Source" -resize "${size}x${size}" "$outDir\icon_${size}.png"
}

Write-Host "ICO 생성 중..."
$pngs = ($sizes | ForEach-Object { "$outDir\icon_$_.png" }) -join " "
Invoke-Expression "magick $pngs $outDir\icon.ico"

Write-Host "Microsoft Store용 PNG 생성 중..."
@(
    @{ size = 44;  name = "StoreLogo.png" },
    @{ size = 50;  name = "Square50x50Logo.png" },
    @{ size = 150; name = "Square150x150Logo.png" },
    @{ size = 310; name = "Square310x310Logo.png" }
) | ForEach-Object {
    magick "$Source" -resize "$($_.size)x$($_.size)" "$outDir\$($_.name)"
}

magick "$Source" -resize "310x150!" "$outDir\Wide310x150Logo.png"

# 임시 PNG 삭제
$sizes | ForEach-Object { Remove-Item "$outDir\icon_$_.png" -ErrorAction SilentlyContinue }

Write-Host "완료! assets 폴더에 icon.ico 및 Store 이미지가 생성되었습니다."
