$baseUrl = "http://localhost:3001/api/chatbot/ask"

function Ask-Question ($question) {
    Write-Host "`n----------------------------------------" -ForegroundColor Gray
    Write-Host "Q: $question" -ForegroundColor Cyan
    
    $body = @{
        question = $question
        type     = "general"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers @{"Content-Type" = "application/json" } -Body $body
        Write-Host "A: $($response.data.answer)" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== TESTING GENERAL DENTISTRY KNOWLEDGE (KB FALLBACK) ===" -ForegroundColor Yellow

# 1. Exact Match: Brushing Frequency
Ask-Question "How often should I brush and floss?"

# 2. Fuzzy Match: Toothbrush Type (User asks "best toothbrush" instead of "What type of toothbrush...")
Ask-Question "What is the best toothbrush to use?"

# 3. Exact Match: Dental Visits
Ask-Question "How often should I visit the dentist?"

# 4. Fuzzy Match: Toothpaste (User asks "recommended toothpaste")
Ask-Question "recommended toothpaste"

# 5. Exact Match: Flossing Importance
Ask-Question "Do I really need to floss?"

# 6. Exact Match: X-Ray Safety
Ask-Question "Are dental X-rays safe?"

Write-Host "`n----------------------------------------" -ForegroundColor Gray
