param([string]$FontPath = "$env:LOCALAPPDATA/Microsoft/Windows/Fonts/DouyinSansBold.otf")
Add-Type -AssemblyName PresentationCore
$font = [System.Windows.Media.GlyphTypeface]::new([Uri]$FontPath)
$numberFont = [System.Windows.Media.GlyphTypeface]::new([Uri]"$env:LOCALAPPDATA/Microsoft/Windows/Fonts/ByteSans-Bold.ttf")
$titles = @('数据中心','互动管理','收入变现','创作推荐','活动管理','快捷导航','热门课程','7月活动总览','创所未见 · AI分身','创所未见 · AI工坊','输入邀请码，抢先解锁全新抖音创作生态','看看大家的兴趣卡','AI 聊天','评论区','群聊','答案之书','单词学习','中国色鉴赏','恋爱回复挑战','猜猜小狗品种','AI分身','随变','世界书','AI工坊','造世界')
$result = [ordered]@{}
$culture = [Globalization.CultureInfo]::InvariantCulture
foreach($title in $titles){
  $x = 0.0
  $paths = [Collections.Generic.List[string]]::new()
  foreach($char in $title.ToCharArray()){
    $glyphFont = if($char -match '[0-9]'){$numberFont}else{$font}
    $glyph = $glyphFont.CharacterToGlyphMap[[int]$char]
    if($null -eq $glyph){throw "Missing glyph: $char"}
    $d = $glyphFont.GetGlyphOutline($glyph,100,100).ToString($culture) -replace '^F[01]\s*',''
    $d = [regex]::Replace($d,'-?\d+\.\d+',{param($m) ([double]::Parse($m.Value,[Globalization.CultureInfo]::InvariantCulture)).ToString('0.##',[Globalization.CultureInfo]::InvariantCulture)})
    if($d){$paths.Add('<path transform="translate('+ $x.ToString('0.###',$culture) +' 0)" d="'+$d+'"/>')}
    $x += $glyphFont.AdvanceWidths[$glyph]*100
  }
  $width=$x.ToString('0.###',$culture)
  $top=(-100*$font.Baseline).ToString('0.###',$culture)
  $height=(100*$font.Height).ToString('0.###',$culture)
  $result[$title]='<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 '+$top+' '+$width+' '+$height+'" style="width:'+($x/100).ToString('0.####',$culture)+'em;height:'+$font.Height.ToString('0.####',$culture)+'em;display:inline-block;vertical-align:'+(-($font.Height-$font.Baseline)).ToString('0.####',$culture)+'em;overflow:visible;flex:none" fill="currentColor">'+($paths -join '')+'</svg>'
}
$output='// Generated outline titles. No font file is shipped. Regenerate with scripts/build-title-outlines.ps1.'+"`n"+'export const titleOutlines = '+($result | ConvertTo-Json -Compress -Depth 3)+';'+"`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot '../public/title-outlines.js'),$output,[Text.UTF8Encoding]::new($false))
