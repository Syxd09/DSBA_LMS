# PowerShell script to fix all route files with broken imports
$routesPath = "src/routes"
$files = Get-ChildItem "$routesPath/*.routes.ts"

$fixedCount = 0

foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file.FullName)
    $originalContent = $content
    
    # Fix 1: Replace \\nimport with actual newline
    $content = $content -replace "middleware';\\\\nimport", "middleware';`r`nimport"
    
    # Fix 2: Move misplaced imports to top (after first import block)
    if ($content -match "(?s)(import.*?;)\r?\n\r?\nconst router.*?\r?\n\r?\nrouter\.use.*?\r?\n\r?\n(import.*)") {
        # Extract the misplaced imports
        $matches = [regex]::Matches($content, "(?<=router\.use.*?\r?\n\r?\n)(import[^\r\n]+;?\r?\n)+")
        if ($matches.Count -gt 0) {
            $misplacedImports = $matches[0].Value
            # Remove from wrong location
            $content = $content -replace "(?<=router\.use.*?\r?\n\r?\n)(import[^\r\n]+;?\r?\n)+", ""
            # Add after initial imports (before const router)
            $content = $content -replace "(import[^\r\n]+;?\r?\n)+(\r?\nconst router)", "`$1$misplacedImports`$2"
        }
    }
    
    if ($content -ne $originalContent) {
        [IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "✅ Fixed: $($file.Name)"
        $fixedCount++
    }
}

Write-Host "`n✨ Total files fixed: $fixedCount"
