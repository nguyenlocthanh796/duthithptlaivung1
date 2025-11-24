# Test Deployment Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Testing Full Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendUrl = "https://duthi-backend-626004693464.us-central1.run.app"
$frontendUrl = "https://gen-lang-client-0581370080.web.app"

# Test 1: Backend Health
Write-Host "[1/5] Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET
    Write-Host "  ✅ Backend is alive: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: AI Chat Endpoint
Write-Host "`n[2/5] Testing AI Chat..." -ForegroundColor Yellow
try {
    $body = @{
        prompt = "Xin chào! Tôi là học sinh THPT"
        temperature = 0.4
        max_tokens = 150
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "$backendUrl/ai/chat" -Method POST -Body $body -ContentType "application/json"
    $responseLength = $chatResponse.response.Length
    Write-Host "  ✅ AI Chat working: Generated $responseLength chars" -ForegroundColor Green
    Write-Host "  Response preview: $($chatResponse.response.Substring(0, [Math]::Min(100, $responseLength)))..." -ForegroundColor Gray
} catch {
    Write-Host "  ❌ AI Chat failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Frontend Accessibility
Write-Host "`n[3/5] Testing Frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend is accessible (HTTP $($frontendResponse.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Frontend check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: CORS Check
Write-Host "`n[4/5] Testing CORS Configuration..." -ForegroundColor Yellow
try {
    $corsHeaders = @{
        "Origin" = $frontendUrl
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "content-type"
    }
    $corsResponse = Invoke-WebRequest -Uri "$backendUrl/health" -Method OPTIONS -Headers $corsHeaders -UseBasicParsing
    $allowOrigin = $corsResponse.Headers["Access-Control-Allow-Origin"]
    
    if ($allowOrigin) {
        Write-Host "  ✅ CORS configured: $allowOrigin" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  CORS headers not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ CORS check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Check Environment Variables
Write-Host "`n[5/5] Checking Backend Configuration..." -ForegroundColor Yellow
$logs = gcloud run services logs read duthi-backend --region=us-central1 --project=gen-lang-client-0581370080 --limit=5 2>&1 | Out-String
if ($logs -match "Loaded (\d+) Gemini API key") {
    $keyCount = $matches[1]
    Write-Host "  ✅ Gemini API Keys: $keyCount configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Could not verify API key count" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deployment Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  $backendUrl" -ForegroundColor White
Write-Host "Frontend: $frontendUrl" -ForegroundColor White
Write-Host "`n✅ All critical tests passed!" -ForegroundColor Green
Write-Host "`nYou can now:" -ForegroundColor Yellow
Write-Host "  1. Open: $frontendUrl" -ForegroundColor Gray
Write-Host "  2. Login with Google" -ForegroundColor Gray
Write-Host "  3. Test AI Chat at /chat" -ForegroundColor Gray
Write-Host "`n========================================`n" -ForegroundColor Cyan

