# End-to-end Stellar testnet verification for Pamodzi Finance
$ErrorActionPreference = "Stop"
$Base = "http://localhost:8080"
$Horizon = "https://horizon-testnet.stellar.org"
$Ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$Psql = "c:\Users\Admin\Desktop\NATASHA\pgsql-extract\pgsql\bin\psql.exe"
$env:PGPASSWORD = "postgres"

function Invoke-Api {
    param([string]$Method, [string]$Path, [object]$Body, [string]$Token)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $params = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
    try {
        $r = Invoke-RestMethod @params
        return @{ ok = $true; data = $r; status = 200 }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $msg = $_.ErrorDetails.Message
        if (-not $msg) { $msg = $_.Exception.Message }
        try { $msg = ($msg | ConvertFrom-Json).error } catch {}
        return @{ ok = $false; error = $msg; status = $status }
    }
}

function Get-HorizonBalance {
    param([string]$PublicKey)
    if (-not $PublicKey) { return "N/A" }
    try {
        $a = Invoke-RestMethod -Uri "$Horizon/accounts/$PublicKey" -Headers @{ "User-Agent" = "pamodzi-e2e" }
        $native = ($a.balances | Where-Object { $_.asset_type -eq "native" }).balance
        return if ($native) { $native } else { "0.0000000" }
    } catch {
        return "0.0000000 (unfunded)"
    }
}

function Get-WalletSnapshot {
    param([string]$Label, [string]$Token, [string]$PublicKey)
    $api = Invoke-Api -Method GET -Path "/api/wallet" -Token $Token
    $horizon = Get-HorizonBalance -PublicKey $PublicKey
    return @{
        user = $Label
        api_balance = if ($api.ok) { $api.data.balance } else { "error" }
        horizon_balance = $horizon
        public_key = $PublicKey
        explorer = "https://stellar.expert/explorer/testnet/account/$PublicKey"
    }
}

function Get-TreasurySnapshot {
    param([string]$GroupId)
    $row = & $Psql -U postgres -h localhost -d pamodzi -t -A -F "|" -c `
        "SELECT treasury_public_key FROM savings_groups WHERE id = '$GroupId'"
    $pk = $row.Trim()
    if (-not $pk) { return @{ treasury_public_key = $null; horizon_balance = "N/A" } }
    return @{
        treasury_public_key = $pk
        horizon_balance = Get-HorizonBalance -PublicKey $pk
        explorer = "https://stellar.expert/explorer/testnet/account/$pk"
    }
}

function Get-DbState {
    param([string]$GroupId, [string]$UserId = $null)
    $contrib = & $Psql -U postgres -h localhost -d pamodzi -c `
        "SELECT u.email, c.cycle, c.amount, c.status, c.blockchain_hash, c.transaction_source
         FROM contributions c JOIN users u ON u.id = c.user_id
         WHERE c.group_id = '$GroupId' ORDER BY c.created_at"
    $payouts = & $Psql -U postgres -h localhost -d pamodzi -c `
        "SELECT p.cycle, u.email, p.amount, p.status, p.blockchain_hash, p.transaction_source
         FROM payouts p JOIN users u ON u.id = p.recipient_id
         WHERE p.group_id = '$GroupId' ORDER BY p.created_at"
    $group = & $Psql -U postgres -h localhost -d pamodzi -c `
        "SELECT current_cycle, status FROM savings_groups WHERE id = '$GroupId'"
    $txs = & $Psql -U postgres -h localhost -d pamodzi -c `
        "SELECT tx_type, amount, status, blockchain_hash, transaction_source, memo
         FROM transactions WHERE group_id = '$GroupId' ORDER BY created_at"
    return @{ contributions = $contrib; payouts = $payouts; group = $group; transactions = $txs }
}

function Get-Notifications {
    param([string]$Token)
    $r = Invoke-Api -Method GET -Path "/api/notifications" -Token $Token
    if ($r.ok) { return $r.data } else { return @() }
}

$Report = [ordered]@{ steps = @(); summary = @{} }

Write-Host "=== E2E Stellar Testnet Verification ===" -ForegroundColor Cyan

# --- Register Alice, Bob, Carol ---
$users = @{}
foreach ($name in @("Alice", "Bob", "Carol")) {
    $email = "$($name.ToLower())+e2e$Ts@test.pamodzi.local"
    $reg = Invoke-Api -Method POST -Path "/api/auth/register" -Body @{
        full_name = $name
        email = $email
        password = "TestPass123!"
    }
    if (-not $reg.ok) {
        Write-Host "Register $name failed: $($reg.error)" -ForegroundColor Red
        exit 1
    }
    $wallet = Invoke-Api -Method GET -Path "/api/wallet" -Token $reg.data.token
    $users[$name] = @{
        id = $reg.data.user.id
        email = $email
        token = $reg.data.token
        public_key = $wallet.data.public_key
    }
    Write-Host "Registered $name ($email)" -ForegroundColor Green
    Start-Sleep -Seconds 5
}

$Report.steps += @{
    step = 0
    action = "Register Alice, Bob, Carol"
    wallets = @(
        (Get-WalletSnapshot -Label "Alice" -Token $users.Alice.token -PublicKey $users.Alice.public_key)
        (Get-WalletSnapshot -Label "Bob" -Token $users.Bob.token -PublicKey $users.Bob.public_key)
        (Get-WalletSnapshot -Label "Carol" -Token $users.Carol.token -PublicKey $users.Carol.public_key)
    )
}

# --- Alice creates group ---
$beforeAlice = Get-WalletSnapshot -Label "Alice" -Token $users.Alice.token -PublicKey $users.Alice.public_key
$create = Invoke-Api -Method POST -Path "/api/groups" -Token $users.Alice.token -Body @{
    name = "E2E Family Savings $Ts"
    description = "E2E verification group"
    contribution_amount = "5.00"
    frequency = "monthly"
}
if (-not $create.ok) { Write-Host "Create group failed: $($create.error)"; exit 1 }
$groupId = $create.data.id
$inviteCode = $create.data.invite_code
Start-Sleep -Seconds 3
$treasury = Get-TreasurySnapshot -GroupId $groupId
$afterAlice = Get-WalletSnapshot -Label "Alice" -Token $users.Alice.token -PublicKey $users.Alice.public_key

$Report.steps += @{
    step = 1
    action = "Alice creates group (5 XLM monthly)"
    group_id = $groupId
    invite_code = $inviteCode
    contribution_amount = $create.data.contribution_amount
    alice_before = $beforeAlice
    alice_after = $afterAlice
    treasury = $treasury
    db = Get-DbState -GroupId $groupId
}

Write-Host "Group created: $groupId invite=$inviteCode" -ForegroundColor Green

# --- Bob and Carol join ---
foreach ($name in @("Bob", "Carol")) {
    $join = Invoke-Api -Method POST -Path "/api/groups/join" -Token $users[$name].token -Body @{
        invite_code = $inviteCode
    }
    if (-not $join.ok) { Write-Host "$name join failed: $($join.error)"; exit 1 }
    Write-Host "$name joined" -ForegroundColor Green
}

$Report.steps += @{
    step = 2
    action = "Bob and Carol join"
    db = Get-DbState -GroupId $groupId
    bob_notifications = Get-Notifications -Token $users.Bob.token
    carol_notifications = Get-Notifications -Token $users.Carol.token
}

# --- Contributions ---
$contribOrder = @("Alice", "Bob", "Carol")
$contribResults = @()

foreach ($name in $contribOrder) {
    $before = Get-WalletSnapshot -Label $name -Token $users[$name].token -PublicKey $users[$name].public_key
    $treasuryBefore = Get-TreasurySnapshot -GroupId $groupId

    $contrib = Invoke-Api -Method POST -Path "/api/groups/$groupId/contribute" -Token $users[$name].token -Body @{
        amount = "5.00"
    }

    Start-Sleep -Seconds 4
    $after = Get-WalletSnapshot -Label $name -Token $users[$name].token -PublicKey $users[$name].public_key
    $treasuryAfter = Get-TreasurySnapshot -GroupId $groupId

    $hash = $null
    $explorer = $null
    if ($contrib.ok -and $contrib.data.contribution.blockchain_hash) {
        $hash = $contrib.data.contribution.blockchain_hash
        $explorer = "https://stellar.expert/explorer/testnet/tx/$hash"
    }

    $contribResults += @{
        member = $name
        success = $contrib.ok
        error = if (-not $contrib.ok) { $contrib.error } else { $null }
        payout_triggered = if ($contrib.ok) { $contrib.data.payout_triggered } else { $false }
        all_paid = if ($contrib.ok) { $contrib.data.all_paid } else { $false }
        blockchain_hash = $hash
        explorer_url = $explorer
        transaction_source = if ($contrib.ok) { $contrib.data.contribution.transaction_source } else { $null }
        wallet_before = $before
        wallet_after = $after
        treasury_before = $treasuryBefore
        treasury_after = $treasuryAfter
        db = Get-DbState -GroupId $groupId
        notifications = Get-Notifications -Token $users[$name].token
    }

    if ($contrib.ok) {
        Write-Host "$name contributed - hash=$hash payout=$($contrib.data.payout_triggered)" -ForegroundColor Green
    } else {
        Write-Host "$name contribution FAILED: $($contrib.error)" -ForegroundColor Red
    }
}

$Report.steps += @{
    step = "3-5"
    action = "Alice, Bob, Carol contribute 5 XLM each"
    contributions = $contribResults
}

# --- Duplicate contribution test (Alice cycle 2 or same cycle if failed) ---
$dup = Invoke-Api -Method POST -Path "/api/groups/$groupId/contribute" -Token $users.Alice.token -Body @{
    amount = "5.00"
}
$Report.steps += @{
    step = "duplicate_test"
    action = "Alice attempts duplicate contribution"
    rejected = (-not $dup.ok)
    status = $dup.status
    error = $dup.error
}

# --- Wrong amount test ---
$wrong = Invoke-Api -Method POST -Path "/api/groups/$groupId/contribute" -Token $users.Bob.token -Body @{
    amount = "3.00"
}
$Report.steps += @{
    step = "wrong_amount_test"
    action = "Bob attempts 3.00 XLM (should reject)"
    rejected = (-not $wrong.ok)
    error = $wrong.error
}

# --- Final group state ---
$groupDetail = Invoke-Api -Method GET -Path "/api/groups/$groupId" -Token $users.Alice.token
$payouts = Invoke-Api -Method GET -Path "/api/groups/$groupId/payouts" -Token $users.Alice.token

$fakeHashes = & $Psql -U postgres -h localhost -d pamodzi -t -A -c `
    "SELECT COUNT(*) FROM contributions WHERE group_id='$groupId' AND (blockchain_hash LIKE 'contrib-%' OR blockchain_hash LIKE 'payout-%')
     UNION ALL SELECT COUNT(*) FROM payouts WHERE group_id='$groupId' AND (blockchain_hash LIKE 'contrib-%' OR blockchain_hash LIKE 'payout-%')"

$Report.summary = @{
    group_id = $groupId
    final_cycle = if ($groupDetail.ok) { $groupDetail.data.group.current_cycle } else { $null }
    final_status = if ($groupDetail.ok) { $groupDetail.data.group.status } else { $null }
    paid_count = if ($groupDetail.ok) { $groupDetail.data.paid_count } else { $null }
    payouts = if ($payouts.ok) { $payouts.data } else { @() }
    final_treasury = Get-TreasurySnapshot -GroupId $groupId
    final_wallets = @(
        (Get-WalletSnapshot -Label "Alice" -Token $users.Alice.token -PublicKey $users.Alice.public_key)
        (Get-WalletSnapshot -Label "Bob" -Token $users.Bob.token -PublicKey $users.Bob.public_key)
        (Get-WalletSnapshot -Label "Carol" -Token $users.Carol.token -PublicKey $users.Carol.public_key)
    )
    fake_hash_count = $fakeHashes
    db_final = Get-DbState -GroupId $groupId
}

$outPath = "c:\Users\Admin\Desktop\NATASHA\scripts\e2e-report-$Ts.json"
$Report | ConvertTo-Json -Depth 20 | Out-File -FilePath $outPath -Encoding utf8
Write-Host "`nReport saved: $outPath" -ForegroundColor Cyan
$Report | ConvertTo-Json -Depth 10
