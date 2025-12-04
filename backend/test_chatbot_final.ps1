$baseUrl = "http://localhost:3001/api/chatbot/ask"

function Ask-Question ($question, $type = "general", $desc) {
    Write-Host "`n=== TEST: $desc ===" -ForegroundColor Yellow
    Write-Host "Question: '$question'" -ForegroundColor Cyan
    
    $body = @{
        question = $question
        type     = $type
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers @{"Content-Type" = "application/json" } -Body $body
        Write-Host "Answer:" -ForegroundColor Green
        Write-Host $response.data.answer -ForegroundColor White
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

# 1. Test Expert Knowledge (Gemini + Search)
Ask-Question "What are the symptoms of pulpitis?" "general" "Expert Knowledge (Gemini)"

# 2. Test Fallback (Knowledge Base)
# We simulate this by asking a question we know is in the KB, and if Gemini fails (or we can force it), it works.
# Since we can't easily force Gemini failure here, we rely on the fact that if Gemini works, great. 
# If Gemini fails, the KB should pick it up.
Ask-Question "How often should I brush and floss?" "general" "Common Question (KB/Gemini)"

# 3. Test Refusal (Non-dental)
Ask-Question "Who won the World Series in 2023?" "general" "Non-Dental Refusal"

# 4. Test Emergency Logic
Ask-Question "I have severe swelling and fever and my tooth hurts" "general" "Emergency Logic"
