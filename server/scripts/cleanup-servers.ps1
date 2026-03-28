# Cleanup old node/tsx processes to ensure the updated server with DB migrations starts fresh
Get-Process | Where-Object { $_.ProcessName -match "node|tsx" } | Stop-Process -Force
echo "✅ All old node/tsx processes killed. Please restart your server with 'npm run dev' now."
