# PowerShell script для створення простих іконок
# Використовує .NET Graphics API

Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$Size,
        [string]$OutputPath
    )

    # Створення bitmap
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Градієнтний фон
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $color1 = [System.Drawing.Color]::FromArgb(102, 126, 234)  # #667eea
    $color2 = [System.Drawing.Color]::FromArgb(118, 75, 162)   # #764ba2
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45)

    # Малювання фону з округленими кутами (наближено через еліпси)
    $graphics.FillRectangle($brush, $rect)

    # Білий колір для годинника
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(2, $Size / 20))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Центр та радіус годинника
    $centerX = $Size / 2
    $centerY = $Size / 2
    $radius = $Size * 0.35

    # Малювання кола годинника
    $clockRect = New-Object System.Drawing.RectangleF(
        ($centerX - $radius),
        ($centerY - $radius),
        ($radius * 2),
        ($radius * 2)
    )
    $graphics.DrawEllipse($pen, $clockRect)

    # Годинна стрілка (під кутом 60°)
    $hourLen = $radius * 0.5
    $hourAngle = [Math]::PI / 3 - [Math]::PI / 2
    $hourX = $centerX + $hourLen * [Math]::Cos($hourAngle)
    $hourY = $centerY + $hourLen * [Math]::Sin($hourAngle)
    $hourPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(2, $Size / 25))
    $hourPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hourPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($hourPen, $centerX, $centerY, $hourX, $hourY)

    # Хвилинна стрілка (вертикально вгору)
    $minLen = $radius * 0.7
    $minX = $centerX
    $minY = $centerY - $minLen
    $minPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1, $Size / 30))
    $minPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $minPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($minPen, $centerX, $centerY, $minX, $minY)

    # Центральна точка
    $dotRadius = [Math]::Max(2, $Size / 25)
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($dotBrush, $centerX - $dotRadius, $centerY - $dotRadius, $dotRadius * 2, $dotRadius * 2)

    # Збереження
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Очищення
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $hourPen.Dispose()
    $minPen.Dispose()
    $dotBrush.Dispose()

    Write-Host "✓ Створено: $OutputPath ($Size x $Size)" -ForegroundColor Green
}

# Отримання шляху до папки icons
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🎨 Генерація іконок для розширення Chrome..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Створення іконок різних розмірів
Create-Icon -Size 16 -OutputPath (Join-Path $scriptPath "icon16.png")
Create-Icon -Size 48 -OutputPath (Join-Path $scriptPath "icon48.png")
Create-Icon -Size 128 -OutputPath (Join-Path $scriptPath "icon128.png")

Write-Host "`n✅ Всі іконки успішно створено!" -ForegroundColor Green
Write-Host "📁 Розташування: $scriptPath" -ForegroundColor Yellow
Write-Host "`n💡 Тепер можна встановити розширення в Chrome!" -ForegroundColor Cyan
