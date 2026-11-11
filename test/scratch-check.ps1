Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/.user_uploaded/media_1794221945040_c8d92769.png')
Write-Host "Dimensions: $($bmp.Width) x $($bmp.Height)"
$colors = @{}
for ($x=0; $x -lt $bmp.Width; $x+=1) {
    for ($y=0; $y -lt $bmp.Height; $y+=1) {
        $p = $bmp.GetPixel($x, $y)
        $hex = ('#{0:X2}{1:X2}{2:X2}' -f $p.R, $p.G, $p.B)
        $colors[$hex] = ($colors[$hex] + 1)
    }
}
$bmp.Dispose()
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 25 | Format-Table

