import fs from 'fs';

const script = `
Add-Type -AssemblyName System.Drawing
$l = [System.Drawing.Image]::FromFile('C:\\\\Users\\\\HP\\\\OneDrive\\\\Desktop\\\\MockTestSeries\\\\Client\\\\public\\\\logo.png')
$b = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($b)
$g.Clear([System.Drawing.Color]::Transparent)
$scale = 750 / $l.Width
$dw = 750
$dh = [int]($l.Height * $scale)
$x = [int]((1024 - $dw) / 2)
$y = [int]((1024 - $dh) / 2)
$g.DrawImage($l, $x, $y, $dw, $dh)
$b.Save('C:\\\\Users\\\\HP\\\\OneDrive\\\\Desktop\\\\MockTestSeries\\\\Client\\\\assets\\\\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$b.Dispose()
$l.Dispose()
Write-Host "Success"
`;

// Ensure scratch dir exists
if (!fs.existsSync('C:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/scratch')) {
  fs.mkdirSync('C:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/scratch', { recursive: true });
}

fs.writeFileSync('C:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/scratch/resize.ps1', script);
console.log('Script written');
