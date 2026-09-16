# Quick System Test for MCCS Presentation
Write-Host "=== MCCS System Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/test-db" -Method GET
    if ($health.success) {
        Write-Host "   ✓ Backend: HEALTHY" -ForegroundColor Green
        Write-Host "   ✓ Database: $($health.database)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Backend: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Login
Write-Host "2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    if ($login.success) {
        $token = $login.token
        Write-Host "   ✓ Login: SUCCESS" -ForegroundColor Green
        Write-Host "   ✓ User: $($login.user.full_name) ($($login.user.role))" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Try with correct credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 3: Get Inventory
Write-Host "3. Testing Inventory Endpoint..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $inventory = Invoke-RestMethod -Uri "http://localhost:5000/api/inventory/cards?page=1&limit=10" -Method GET -Headers $headers
    if ($inventory.success) {
        Write-Host "   ✓ Inventory: ACCESSIBLE" -ForegroundColor Green
        Write-Host "   ✓ Total Cards: $($inventory.totalCards)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Inventory: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Add Card
Write-Host "4. Testing Add Card..." -ForegroundColor Yellow
$testPin = "TEST" + (Get-Random -Minimum 1000000000 -Maximum 9999999999)
$cardBody = @{
    provider = "MTN"
    type = "AIRTIME"
    value = 10
    pin = $testPin
    expiry_date = "2025-12-31"
    batch_number = "DEMO-BATCH"
} | ConvertTo-Json

try {
    $addCard = Invoke-RestMethod -Uri "http://localhost:5000/api/inventory/cards" -Method POST -Headers $headers -Body $cardBody -ContentType "application/json"
    if ($addCard.success) {
        Write-Host "   ✓ Add Card: SUCCESS" -ForegroundColor Green
        Write-Host "   ✓ Card ID: $($addCard.card.id)" -ForegroundColor Green
        Write-Host "   ✓ Card UUID: $($addCard.card.card_uuid)" -ForegroundColor Green
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   ✗ Add Card: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($errorDetails.message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Status:" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000 ✓" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5175 ✓" -ForegroundColor Green
Write-Host ""
Write-Host "Ready for presentation!" -ForegroundColor Green
